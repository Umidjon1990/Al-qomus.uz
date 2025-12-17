import { db } from "../server/db";
import { dictionaryEntries, wordnetSynsets, wordnetLemmas } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

function stripDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, "").trim();
}

interface CSVRow {
  synsetId: string;
  englishLemmas: string;
  englishGloss: string;
  englishExamples: string;
  arabicLemmas: string;
  arabicGloss: string;
  arabicExamples: string;
}

function parseCSVRow(line: string): CSVRow | null {
  if (!line.trim()) return null;
  
  // CSV ni to'g'ri parse qilish (quoted fields uchun)
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length < 7) return null;
  
  return {
    synsetId: parts[0] || "",
    englishLemmas: parts[1] || "",
    englishGloss: parts[2] || "",
    englishExamples: parts[3] || "",
    arabicLemmas: parts[4] || "",
    arabicGloss: parts[5] || "",
    arabicExamples: parts[6] || "",
  };
}

async function importWordNet() {
  console.log("Arabic WordNet to'liq import...\n");
  
  // Lug'at so'zlarini yuklash
  console.log("Lug'at so'zlarini yuklash...");
  const allEntries = await db.select({ id: dictionaryEntries.id, arabic: dictionaryEntries.arabic })
    .from(dictionaryEntries);
  
  const entryMap = new Map<string, number>();
  for (const entry of allEntries) {
    const stripped = stripDiacritics(entry.arabic);
    if (!entryMap.has(stripped)) {
      entryMap.set(stripped, entry.id);
    }
  }
  console.log(`${allEntries.length} ta so'z yuklandi\n`);
  
  const dataDir = path.join(process.cwd(), "arabic_wordnet_data");
  const csvFiles = [
    { file: "1. Nouns - resulting dataset.csv", pos: "noun" },
    { file: "3. Verbs - resulting dataset.csv", pos: "verb" },
    { file: "5. Adjectives - resulting dataset.csv", pos: "adjective" },
    { file: "7. Adverbs - resulting dataset.csv", pos: "adverb" },
  ];
  
  let totalSynsets = 0;
  let totalLemmas = 0;
  let matchedLemmas = 0;
  
  for (const { file, pos } of csvFiles) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Fayl topilmadi: ${file}`);
      continue;
    }
    
    console.log(`O'qilmoqda: ${file}`);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").slice(1); // Skip header
    
    let fileCount = 0;
    
    for (const line of lines) {
      const row = parseCSVRow(line);
      if (!row || !row.synsetId || !row.arabicLemmas) continue;
      
      try {
        // Synset qo'shish
        await db.insert(wordnetSynsets)
          .values({
            synsetId: row.synsetId,
            partOfSpeech: pos,
            arabicGloss: row.arabicGloss || null,
            arabicExamples: row.arabicExamples || null,
            englishLemmas: row.englishLemmas || null,
            englishGloss: row.englishGloss || null,
          })
          .onConflictDoNothing();
        
        totalSynsets++;
        fileCount++;
        
        // Lemma larni ajratish va qo'shish
        const arabicWords = row.arabicLemmas
          .split(/[,،\s]+/)
          .map(w => w.trim())
          .filter(w => w.length > 0 && /[\u0600-\u06FF]/.test(w));
        
        for (const word of arabicWords) {
          const normalized = stripDiacritics(word);
          const entryId = entryMap.get(normalized) || null;
          
          await db.insert(wordnetLemmas)
            .values({
              synsetId: row.synsetId,
              arabicWord: word,
              arabicWordNormalized: normalized,
              dictionaryEntryId: entryId,
            })
            .onConflictDoNothing();
          
          totalLemmas++;
          if (entryId) matchedLemmas++;
        }
      } catch (e) {
        // Skip duplicates
      }
    }
    
    console.log(`  ${fileCount} ta synset qo'shildi`);
  }
  
  console.log("\n=== Natija ===");
  console.log(`Jami synsetlar: ${totalSynsets}`);
  console.log(`Jami lemmalar: ${totalLemmas}`);
  console.log(`Lug'atga bog'langan: ${matchedLemmas}`);
}

importWordNet()
  .then(() => {
    console.log("\nImport tugadi!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Xatolik:", error);
    process.exit(1);
  });
