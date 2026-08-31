import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { openai } from "./ai";
import { pool } from "./db";

const PRIMARY_MODEL = process.env.TRANSLATION_PRIMARY_MODEL || "gpt-4o-mini";
const REVIEW_MODEL = process.env.TRANSLATION_REVIEW_MODEL || PRIMARY_MODEL;
const configuredMaxJobEntries = Number(process.env.TRANSLATION_MAX_JOB_ENTRIES || 50_000);
const MAX_JOB_ENTRIES = Number.isFinite(configuredMaxJobEntries) && configuredMaxJobEntries > 0
  ? Math.floor(configuredMaxJobEntries)
  : 50_000;
const configuredRunLimit = Number(process.env.TRANSLATION_RUN_LIMIT || 250);
const RUN_LIMIT = Number.isFinite(configuredRunLimit) && configuredRunLimit > 0
  ? Math.floor(configuredRunLimit)
  : 250;

const senseTranslationSchema = z.object({
  sourceIndex: z.number().int().positive(),
  uzbekMeaning: z.string().min(2).max(600),
  arabicExample: z.string().max(1_500).default(""),
  uzbekExample: z.string().max(1_500).default(""),
  confidence: z.number().min(0).max(1).optional(),
});

const translationSchema = z.object({
  wordType: z.enum([
    "fe'l",
    "ot",
    "sifat",
    "ravish",
    "olmosh",
    "yuklama",
    "bog'lovchi",
    "ko'makchi",
    "undov",
    "ibora",
    "aniqlanmagan",
  ]),
  uzbekSummary: z.string().min(2).max(1_200),
  senses: z.array(senseTranslationSchema).min(1),
});

const reviewSchema = translationSchema.extend({
  decision: z.enum(["approve", "revise", "manual_review"]),
  issues: z.array(z.string().max(500)).max(30).default([]),
});

type TranslationResult = z.infer<typeof translationSchema>;
type ReviewResult = z.infer<typeof reviewSchema>;

type SourceSense = {
  sourceIndex: number;
  sourceText: string;
  arabicExample: string;
  arabicGloss: string;
};

type SourceStructure = {
  grammarLabel: string;
  morphology: string;
  senses: SourceSense[];
  issues: string[];
};

type SourceEntry = {
  id: number;
  arabic: string;
  arabic_vocalized: string | null;
  arabic_definition: string | null;
  arabic_definition_vocalized: string | null;
  type: string | null;
  root: string | null;
  dictionary_source: string;
};

type JobOptions = {
  source: string;
  limit?: number;
  startAfterId?: number;
  onlyPending?: boolean;
  autoApply?: boolean;
};

const runningJobs = new Set<number>();

function clean(text: unknown): string {
  return String(text || "")
    .replace(/^\s*[|.\-вЂ“вЂ”]+\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitExampleAndGloss(sourceText: string): Pick<SourceSense, "arabicExample" | "arabicGloss"> {
  const colonIndex = sourceText.indexOf(":");
  if (colonIndex < 0) return { arabicExample: "", arabicGloss: clean(sourceText) };
  return {
    arabicExample: clean(sourceText.slice(0, colonIndex)),
    arabicGloss: clean(sourceText.slice(colonIndex + 1)),
  };
}

export function structureArabicDefinition(definition: string | null | undefined): SourceStructure {
  let body = String(definition || "").trim();
  const grammarMatch = body.match(/^\s*\(([^)]+)\)\s*\.?\s*\|?/);
  const grammarLabel = grammarMatch?.[1]?.trim() || "";
  if (grammarMatch) body = body.slice(grammarMatch[0].length).trim();

  const markerRegex = /(^|\||\.\s+)\s*(\d+)\s*[-вЂ“вЂ”.]\s*/g;
  const markers: Array<{ number: number; markerStart: number; contentStart: number }> = [];
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = markerRegex.exec(body)) !== null) {
    markers.push({
      number: Number(markerMatch[2]),
      markerStart: markerMatch.index,
      contentStart: markerMatch.index + markerMatch[0].length,
    });
  }
  const issues: string[] = [];
  let morphology = "";
  let senses: SourceSense[] = [];

  if (markers.length) {
    morphology = clean(body.slice(0, markers[0].markerStart));
    senses = markers.map((marker, index) => {
      const end = markers[index + 1]?.markerStart ?? body.length;
      const sourceText = clean(body.slice(marker.contentStart, end));
      return {
        sourceIndex: marker.number,
        sourceText,
        ...splitExampleAndGloss(sourceText),
      };
    });

    const actual = markers.map((marker) => marker.number);
    const expected = actual.map((_, index) => index + 1);
    if (actual.join(",") !== expected.join(",")) issues.push(`numbering:${actual.join(",")}`);
  } else {
    const parts = body.split("|").map(clean).filter(Boolean);
    const sourceText = parts.length > 1 ? parts.at(-1)! : clean(body);
    morphology = parts.length > 1 ? parts.slice(0, -1).join(" | ") : "";
    if (sourceText) {
      senses = [{ sourceIndex: 1, sourceText, ...splitExampleAndGloss(sourceText) }];
    }
  }

  if (!senses.length) issues.push("no_sense_detected");
  if (senses.some((sense) => !sense.sourceText)) issues.push("empty_sense");
  if (/\|\s*\d+\s*[-вЂ“вЂ”]\s*-\s*:/.test(definition || "")) issues.push("malformed_source_segment");
  const normalizedSourceSenses = senses.map((sense) => clean(sense.sourceText));
  if (new Set(normalizedSourceSenses).size !== normalizedSourceSenses.length) issues.push("duplicate_source_sense");
  const openParentheses = (String(definition || "").match(/\(/g) || []).length;
  const closeParentheses = (String(definition || "").match(/\)/g) || []).length;
  if (openParentheses !== closeParentheses) issues.push("unbalanced_parentheses");
  if (/:\s*:|ШЊ\s*ШЊ/.test(definition || "")) issues.push("repeated_punctuation");

  return { grammarLabel, morphology, senses, issues };
}

function sourceHash(entry: SourceEntry, structure: SourceStructure): string {
  return createHash("sha256")
    .update(JSON.stringify({
      arabic: entry.arabic,
      arabicVocalized: entry.arabic_vocalized,
      definition: entry.arabic_definition,
      definitionVocalized: entry.arabic_definition_vocalized,
      type: entry.type,
      root: entry.root,
      source: entry.dictionary_source,
      structure,
    }))
    .digest("hex");
}

function jsonForPrompt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function primaryPrompt(entry: SourceEntry, structure: SourceStructure): string {
  return `Siz arab leksikografiyasi va adabiy o'zbek tili bo'yicha katta muharrirsiz.

Vazifa: arabcha lug'at maqolasining HAR BIR manba ma'nosini alohida, aniq va tabiiy o'zbek lotin yozuvida tarjima qiling.

Qat'iy qoidalar:
1. Hech bir ma'noni tashlab ketmang, birlashtirmang yoki yangi ma'no qo'shmang.
2. Fe'l ma'nosini odatda -moq shaklida, ot/sifatni o'z so'z turida bering.
3. Diniy, tarixiy, majoziy va terminologik ma'noni umumiy so'z bilan yo'qotmang.
4. Arabcha misol manbada bo'lmasa, misol to'qimang. Bor misolni aynan ko'chiring va o'zbekchaga to'liq tarjima qiling.
5. O'zbek maydonlarida arab yoki kirill harfi ishlatmang.
6. Izohni lug'at uslubida ixcham, ammo to'liq yozing.
7. Javob faqat JSON bo'lsin.

JSON shakli:
{
  "wordType": "fe'l|ot|sifat|ravish|olmosh|yuklama|bog'lovchi|ko'makchi|undov|ibora|aniqlanmagan",
  "uzbekSummary": "barcha asosiy ma'nolarning ixcham jamlanmasi",
  "senses": [
    {
      "sourceIndex": 1,
      "uzbekMeaning": "aniq lug'aviy ma'no",
      "arabicExample": "faqat manbadagi arabcha misol yoki bo'sh satr",
      "uzbekExample": "arabcha misolning to'liq tarjimasi yoki bo'sh satr"
    }
  ]
}

SO'Z:
${jsonForPrompt({
    id: entry.id,
    arabic: entry.arabic,
    arabicVocalized: entry.arabic_vocalized,
    root: entry.root,
    type: entry.type,
    grammarLabel: structure.grammarLabel,
    morphology: structure.morphology,
    sourceSenses: structure.senses,
  })}`;
}

function reviewPrompt(entry: SourceEntry, structure: SourceStructure, primary: TranslationResult): string {
  return `Siz mustaqil ikkinchi arabcha-o'zbekcha lug'at muharririsiz. Birinchi tarjimani manbaga qarab qayta tekshiring; uning xulosasiga ko'r-ko'rona ergashmang.

Har bir sourceIndex bo'yicha:
- arabcha manba ma'nosi to'liq saqlanganini;
- so'z turi va uslub to'g'riligini;
- diniy, tarixiy, majoziy yoki termin ma'nosi buzilmaganini;
- misol to'qilmaganini va tarjimasi to'liq ekanini tekshiring.

Xato bo'lsa to'g'rilangan yakuniy variantni bering. Manbaning o'zi buzilgan yoki ma'no ishonchli aniqlanmasa decision="manual_review" qiling. Har bir ma'noga 0 dan 1 gacha confidence qo'ying. Javob faqat JSON bo'lsin.

JSON shakli:
{
  "decision": "approve|revise|manual_review",
  "issues": ["aniq topilgan muammo"],
  "wordType": "fe'l|ot|sifat|ravish|olmosh|yuklama|bog'lovchi|ko'makchi|undov|ibora|aniqlanmagan",
  "uzbekSummary": "yakuniy jamlanma",
  "senses": [{
    "sourceIndex": 1,
    "uzbekMeaning": "yakuniy ma'no",
    "arabicExample": "manbadagi misol yoki bo'sh satr",
    "uzbekExample": "to'liq tarjima yoki bo'sh satr",
    "confidence": 0.95
  }]
}

MANBA:
${jsonForPrompt({
    id: entry.id,
    arabic: entry.arabic,
    arabicVocalized: entry.arabic_vocalized,
    root: entry.root,
    type: entry.type,
    grammarLabel: structure.grammarLabel,
    morphology: structure.morphology,
    sourceSenses: structure.senses,
    sourceIssues: structure.issues,
  })}

BIRINCHI TARJIMA:
${jsonForPrompt(primary)}`;
}

async function requestJson(model: string, prompt: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Faqat tekshiriladigan JSON qaytaring. Manbada yo'q ma'lumotni to'qimang." },
          { role: "user", content: prompt },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("AI returned an empty response");
      return JSON.parse(content);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
    }
  }
  throw lastError;
}

function technicalQa(structure: SourceStructure, result: ReviewResult): { passed: boolean; issues: string[] } {
  const issues = [...structure.issues];
  const sourceIndices = structure.senses.map((sense) => sense.sourceIndex);
  const resultIndices = result.senses.map((sense) => sense.sourceIndex);
  if (sourceIndices.join(",") !== resultIndices.join(",")) issues.push("sense_count_or_order_mismatch");
  if (new Set(resultIndices).size !== resultIndices.length) issues.push("duplicate_sense_index");

  const arabicPattern = /[\u0600-\u06ff\u0750-\u077f]/;
  const cyrillicPattern = /[\u0400-\u04ff]/;

  for (const sense of result.senses) {
    const sourceSense = structure.senses.find((item) => item.sourceIndex === sense.sourceIndex);
    if (!sourceSense) {
      issues.push(`unknown_sense:${sense.sourceIndex}`);
      continue;
    }
    if (arabicPattern.test(sense.uzbekMeaning) || cyrillicPattern.test(sense.uzbekMeaning)) {
      issues.push(`non_latin_meaning:${sense.sourceIndex}`);
    }
    if (arabicPattern.test(sense.uzbekExample) || cyrillicPattern.test(sense.uzbekExample)) {
      issues.push(`non_latin_example:${sense.sourceIndex}`);
    }
    if (sense.arabicExample && !clean(sourceSense.sourceText).includes(clean(sense.arabicExample))) {
      issues.push(`invented_or_changed_example:${sense.sourceIndex}`);
    }
    if (sense.arabicExample && !sense.uzbekExample) issues.push(`missing_example_translation:${sense.sourceIndex}`);
    if (!sense.arabicExample && sense.uzbekExample) issues.push(`translation_without_example:${sense.sourceIndex}`);
    if ((sense.confidence ?? 0) < 0.82) issues.push(`low_confidence:${sense.sourceIndex}`);
  }

  if (result.decision === "manual_review") issues.push("reviewer_requested_manual_review");
  return { passed: issues.length === 0, issues: Array.from(new Set(issues)) };
}

export async function ensureTranslationPipelineSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS translation_jobs (
      id BIGSERIAL PRIMARY KEY,
      dictionary_source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      requested_limit INTEGER NOT NULL,
      start_after_id INTEGER NOT NULL DEFAULT 0,
      only_pending BOOLEAN NOT NULL DEFAULT FALSE,
      auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
      processed_count INTEGER NOT NULL DEFAULT 0,
      approved_count INTEGER NOT NULL DEFAULT 0,
      needs_review_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS translation_candidates (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
      entry_id INTEGER NOT NULL REFERENCES dictionary_entries(id) ON DELETE RESTRICT,
      source_snapshot JSONB NOT NULL,
      source_hash TEXT NOT NULL,
      source_structure JSONB NOT NULL,
      primary_translation JSONB,
      reviewer_translation JSONB,
      final_translation JSONB,
      qa_report JSONB,
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, entry_id)
    );

    CREATE INDEX IF NOT EXISTS translation_candidates_job_status_idx
      ON translation_candidates(job_id, status, entry_id);

    CREATE TABLE IF NOT EXISTS translation_revisions (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES translation_jobs(id) ON DELETE RESTRICT,
      candidate_id BIGINT NOT NULL REFERENCES translation_candidates(id) ON DELETE RESTRICT,
      entry_id INTEGER NOT NULL REFERENCES dictionary_entries(id) ON DELETE RESTRICT,
      before_data JSONB NOT NULL,
      after_data JSONB NOT NULL,
      source_hash TEXT NOT NULL,
      applied_by TEXT NOT NULL DEFAULT 'quality_pipeline',
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rolled_back_at TIMESTAMPTZ,
      rolled_back_by TEXT
    );

    CREATE INDEX IF NOT EXISTS translation_revisions_entry_idx
      ON translation_revisions(entry_id, applied_at DESC);
  `);
}

export async function createTranslationJob(options: JobOptions): Promise<{ id: number; candidateCount: number }> {
  await ensureTranslationPipelineSchema();
  const limit = Math.min(Math.max(options.limit || 100, 1), MAX_JOB_ENTRIES);
  const startAfterId = Math.max(options.startAfterId || 0, 0);
  const onlyPending = options.onlyPending === true;
  const autoApply = options.autoApply === true;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const jobResult = await client.query<{ id: string }>(`
      INSERT INTO translation_jobs
        (dictionary_source, requested_limit, start_after_id, only_pending, auto_apply)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [options.source, limit, startAfterId, onlyPending, autoApply]);
    const jobId = Number(jobResult.rows[0].id);

    const entriesResult = await client.query<SourceEntry>(`
      SELECT id, arabic, arabic_vocalized, arabic_definition,
             arabic_definition_vocalized, type, root, dictionary_source
      FROM dictionary_entries
      WHERE dictionary_source = $1
        AND id > $2
        AND ($3::boolean = FALSE OR meanings_json IS NULL OR meanings_json = '' OR meanings_json = '[]')
      ORDER BY id
      LIMIT $4
    `, [options.source, startAfterId, onlyPending, limit]);

    for (const entry of entriesResult.rows) {
      const structure = structureArabicDefinition(entry.arabic_definition);
      const snapshot = {
        id: entry.id,
        arabic: entry.arabic,
        arabicVocalized: entry.arabic_vocalized,
        arabicDefinition: entry.arabic_definition,
        arabicDefinitionVocalized: entry.arabic_definition_vocalized,
        type: entry.type,
        root: entry.root,
        dictionarySource: entry.dictionary_source,
      };
      await client.query(`
        INSERT INTO translation_candidates
          (job_id, entry_id, source_snapshot, source_hash, source_structure)
        VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
      `, [jobId, entry.id, JSON.stringify(snapshot), sourceHash(entry, structure), JSON.stringify(structure)]);
    }

    if (entriesResult.rows.length === 0) {
      await client.query("UPDATE translation_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1", [jobId]);
    }
    await client.query("COMMIT");
    return { id: jobId, candidateCount: entriesResult.rows.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function applyCandidate(client: PoolClient, candidateId: number): Promise<void> {
  const candidateResult = await client.query<{
    id: string;
    job_id: string;
    entry_id: number;
    source_hash: string;
    source_structure: SourceStructure;
    final_translation: ReviewResult;
    status: string;
  }>("SELECT * FROM translation_candidates WHERE id = $1 FOR UPDATE", [candidateId]);
  const candidate = candidateResult.rows[0];
  if (!candidate || candidate.status !== "approved") return;

  const entryResult = await client.query("SELECT * FROM dictionary_entries WHERE id = $1 FOR UPDATE", [candidate.entry_id]);
  const current = entryResult.rows[0];
  if (!current) throw new Error(`Entry ${candidate.entry_id} not found`);

  const currentEntry: SourceEntry = current;
  const currentHash = sourceHash(currentEntry, structureArabicDefinition(current.arabic_definition));
  if (currentHash !== candidate.source_hash) {
    await client.query(`
      UPDATE translation_candidates
      SET status = 'needs_review', error = 'source_changed_after_job_creation', updated_at = NOW()
      WHERE id = $1
    `, [candidateId]);
    return;
  }

  const final = candidate.final_translation;
  const meanings = final.senses.map((sense) => ({
    index: sense.sourceIndex,
    uzbekMeaning: clean(sense.uzbekMeaning),
    arabicExample: clean(sense.arabicExample),
    uzbekExample: clean(sense.uzbekExample),
  }));
  const afterData = {
    uzbek: clean(final.uzbekSummary),
    meaningsJson: JSON.stringify(meanings),
    wordType: final.wordType,
    processingStatus: "completed",
  };

  const revisionResult = await client.query<{ id: string }>(`
    INSERT INTO translation_revisions
      (job_id, candidate_id, entry_id, before_data, after_data, source_hash)
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
    RETURNING id
  `, [candidate.job_id, candidate.id, candidate.entry_id, JSON.stringify(current), JSON.stringify(afterData), candidate.source_hash]);

  await client.query(`
    UPDATE dictionary_entries
    SET uzbek = $2, meanings_json = $3, word_type = $4,
        processing_status = 'completed', updated_at = NOW()
    WHERE id = $1
  `, [candidate.entry_id, afterData.uzbek, afterData.meaningsJson, afterData.wordType]);
  await client.query(`
    UPDATE translation_candidates
    SET status = 'applied', error = NULL, updated_at = NOW()
    WHERE id = $1
  `, [candidateId]);
  void revisionResult;
}

async function processCandidate(jobId: number, candidateId: number, autoApply: boolean): Promise<void> {
  const candidateResult = await pool.query<{
    source_snapshot: {
      id: number;
      arabic: string;
      arabicVocalized: string | null;
      arabicDefinition: string | null;
      arabicDefinitionVocalized: string | null;
      type: string | null;
      root: string | null;
      dictionarySource: string;
    };
    source_structure: SourceStructure;
  }>("SELECT source_snapshot, source_structure FROM translation_candidates WHERE id = $1", [candidateId]);
  const row = candidateResult.rows[0];
  if (!row) return;
  const snapshot = row.source_snapshot;
  const entry: SourceEntry = {
    id: snapshot.id,
    arabic: snapshot.arabic,
    arabic_vocalized: snapshot.arabicVocalized,
    arabic_definition: snapshot.arabicDefinition,
    arabic_definition_vocalized: snapshot.arabicDefinitionVocalized,
    type: snapshot.type,
    root: snapshot.root,
    dictionary_source: snapshot.dictionarySource,
  };
  const structure = row.source_structure;

  if (!structure.senses.length) {
    await pool.query(`UPDATE translation_candidates SET status = 'needs_review', error = 'source_has_no_senses', updated_at = NOW() WHERE id = $1`, [candidateId]);
    await updateJobCounts(jobId);
    return;
  }

  try {
    const primary = translationSchema.parse(await requestJson(PRIMARY_MODEL, primaryPrompt(entry, structure)));
    await pool.query(`UPDATE translation_candidates SET primary_translation = $2::jsonb, updated_at = NOW() WHERE id = $1`, [candidateId, JSON.stringify(primary)]);

    const reviewed = reviewSchema.parse(await requestJson(REVIEW_MODEL, reviewPrompt(entry, structure, primary)));
    const qa = technicalQa(structure, reviewed);
    const status = qa.passed ? "approved" : "needs_review";
    await pool.query(`
      UPDATE translation_candidates
      SET reviewer_translation = $2::jsonb, final_translation = $2::jsonb,
          qa_report = $3::jsonb, status = $4, error = NULL, updated_at = NOW()
      WHERE id = $1
    `, [candidateId, JSON.stringify(reviewed), JSON.stringify(qa), status]);

    if (status === "approved" && autoApply) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await applyCandidate(client, candidateId);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query(`
      UPDATE translation_candidates
      SET status = 'failed', error = $2, updated_at = NOW()
      WHERE id = $1
    `, [candidateId, message.slice(0, 2_000)]);
  } finally {
    await updateJobCounts(jobId);
  }
}

async function updateJobCounts(jobId: number): Promise<void> {
  await pool.query(`
    UPDATE translation_jobs j
    SET processed_count = counts.processed,
        approved_count = counts.approved,
        needs_review_count = counts.needs_review,
        failed_count = counts.failed,
        updated_at = NOW()
    FROM (
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('queued', 'processing'))::int AS processed,
        COUNT(*) FILTER (WHERE status IN ('approved', 'applied'))::int AS approved,
        COUNT(*) FILTER (WHERE status = 'needs_review')::int AS needs_review,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM translation_candidates WHERE job_id = $1
    ) counts
    WHERE j.id = $1
  `, [jobId]);
}

export async function runTranslationJob(jobId: number): Promise<void> {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);
  try {
    const jobResult = await pool.query<{ auto_apply: boolean }>(`
      UPDATE translation_jobs
      SET status = 'running', started_at = COALESCE(started_at, NOW()), error = NULL, updated_at = NOW()
      WHERE id = $1 AND status IN ('queued', 'paused', 'failed', 'running')
      RETURNING auto_apply
    `, [jobId]);
    if (!jobResult.rows[0]) return;
    const autoApply = jobResult.rows[0].auto_apply;
    await pool.query(`
      UPDATE translation_candidates
      SET status = 'queued', error = 'recovered_after_interrupted_run', updated_at = NOW()
      WHERE job_id = $1 AND status = 'processing'
    `, [jobId]);
    let processedThisRun = 0;

    while (true) {
      if (processedThisRun >= RUN_LIMIT) {
        await pool.query(`UPDATE translation_jobs SET status = 'paused', updated_at = NOW() WHERE id = $1`, [jobId]);
        return;
      }
      const claimed = await pool.query<{ id: string }>(`
        UPDATE translation_candidates
        SET status = 'processing', error = NULL, updated_at = NOW()
        WHERE id = (
          SELECT id FROM translation_candidates
          WHERE job_id = $1 AND status = 'queued'
          ORDER BY entry_id
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id
      `, [jobId]);
      if (!claimed.rows[0]) break;
      await processCandidate(jobId, Number(claimed.rows[0].id), autoApply);
      processedThisRun += 1;
    }

    await pool.query(`
      UPDATE translation_jobs
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [jobId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query(`UPDATE translation_jobs SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1`, [jobId, message.slice(0, 2_000)]);
  } finally {
    runningJobs.delete(jobId);
  }
}

export async function applyApprovedCandidates(jobId: number): Promise<{ applied: number }> {
  const candidates = await pool.query<{ id: string }>(`
    SELECT id FROM translation_candidates WHERE job_id = $1 AND status = 'approved' ORDER BY entry_id
  `, [jobId]);
  let applied = 0;
  for (const row of candidates.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await applyCandidate(client, Number(row.id));
      await client.query("COMMIT");
      applied += 1;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return { applied };
}

export async function retryFailedCandidates(jobId: number): Promise<{ queued: number }> {
  const result = await pool.query(`
    UPDATE translation_candidates
    SET status = 'queued', error = NULL, updated_at = NOW()
    WHERE job_id = $1 AND status = 'failed'
  `, [jobId]);
  await pool.query(`UPDATE translation_jobs SET status = 'paused', error = NULL, completed_at = NULL, updated_at = NOW() WHERE id = $1`, [jobId]);
  return { queued: result.rowCount || 0 };
}

export async function rollbackTranslationRevision(revisionId: number, rolledBackBy: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const revisionResult = await client.query<{
      entry_id: number;
      before_data: Record<string, unknown>;
      rolled_back_at: Date | null;
    }>("SELECT entry_id, before_data, rolled_back_at FROM translation_revisions WHERE id = $1 FOR UPDATE", [revisionId]);
    const revision = revisionResult.rows[0];
    if (!revision) throw new Error("Revision not found");
    if (revision.rolled_back_at) throw new Error("Revision already rolled back");
    const before = revision.before_data;

    await client.query(`
      UPDATE dictionary_entries
      SET uzbek = $2, meanings_json = $3, word_type = $4,
          processing_status = $5, updated_at = NOW()
      WHERE id = $1
    `, [
      revision.entry_id,
      before.uzbek ?? null,
      before.meanings_json ?? null,
      before.word_type ?? null,
      before.processing_status ?? "pending",
    ]);
    await client.query(`
      UPDATE translation_revisions
      SET rolled_back_at = NOW(), rolled_back_by = $2
      WHERE id = $1
    `, [revisionId, rolledBackBy]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listTranslationJobs(): Promise<unknown[]> {
  await ensureTranslationPipelineSchema();
  const result = await pool.query("SELECT * FROM translation_jobs ORDER BY created_at DESC LIMIT 100");
  return result.rows;
}

export async function listTranslationCandidates(jobId: number, status?: string): Promise<unknown[]> {
  const result = status
    ? await pool.query(`SELECT * FROM translation_candidates WHERE job_id = $1 AND status = $2 ORDER BY entry_id LIMIT 500`, [jobId, status])
    : await pool.query(`SELECT * FROM translation_candidates WHERE job_id = $1 ORDER BY entry_id LIMIT 500`, [jobId]);
  return result.rows;
}

