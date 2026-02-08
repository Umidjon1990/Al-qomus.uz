import OpenAI from "openai";

// Foydalanuvchining o'z API kalitini ishlatish (agar mavjud bo'lsa)
// Aks holda Replit integratsiyasidan foydalanish
const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OpenAI API key is not set. Please provide OPENAI_API_KEY.");
}

// Agar foydalanuvchi o'z kalitini ishlatsa, to'g'ridan-to'g'ri OpenAI ga ulanish
const useUserKey = !!process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: useUserKey ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

console.log(`[AI] Using ${useUserKey ? "user's OPENAI_API_KEY" : "Replit AI integration"}`);

type WordType = 'verb' | 'noun' | 'adjective' | 'particle' | 'unknown';

interface WordMetadata {
  type: WordType;
  isPlural: boolean;
  isMasdar: boolean;
  hasPastForm: boolean;
  hasPresentForm: boolean;
  hasExamples: boolean;
}

function extractWordMetadata(arabicDefinition: string): WordMetadata {
  const def = arabicDefinition || '';
  
  const isMasdar = /^[^:]+:.*مصدر/.test(def);
  
  const verbIndicators = [
    /يَ\w+\s*،/,
    /فعل\s+(ماضٍ|ماض|مضارع|أمر)/,
    /ماضٍ|ماض/,
    /مضارع/,
    /فهو\s+\w+/,
    /والمفعول/,
  ];
  
  const nounIndicators = [
    /جمع/,
    /مفرد/,
    /اسم\b/,
    /مؤنث|مذكر/,
  ];
  
  const adjectiveIndicators = [
    /صفة مشبَّهة/,
    /صفة\b/,
    /نعت/,
    /أفعل التفضيل/,
    /اسم تفضيل/,
  ];
  
  let type: WordType = 'unknown';
  
  if (isMasdar) {
    type = 'noun';
  } else {
    const isVerb = verbIndicators.some(pattern => pattern.test(def));
    const isNoun = nounIndicators.some(pattern => pattern.test(def));
    const isAdjective = adjectiveIndicators.some(pattern => pattern.test(def));
    
    if (isAdjective) type = 'adjective';
    else if (isVerb && !isNoun) type = 'verb';
    else if (isNoun) type = 'noun';
    else if (def.includes('حرف')) type = 'particle';
  }
  
  return {
    type,
    isPlural: /جمع/.test(def),
    isMasdar,
    hasPastForm: /ماضٍ|ماض|فعل/.test(def),
    hasPresentForm: /يَ\w+|مضارع/.test(def),
    hasExamples: /:-/.test(def),
  };
}

function validateTranslationQuality(translation: string): { valid: boolean; issue?: string } {
  if (!translation || translation.trim().length === 0) {
    return { valid: false, issue: 'empty' };
  }
  
  if (translation === '[taqiqlangan]') {
    return { valid: true };
  }
  
  // 1. Kirill harflarini tekshir
  const cyrillicPattern = /[\u0400-\u04FF]/;
  if (cyrillicPattern.test(translation)) {
    return { valid: false, issue: 'cyrillic' };
  }
  
  // 2. Arab harflarini tekshir
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabicPattern.test(translation)) {
    return { valid: false, issue: 'arabic' };
  }
  
  // 3. Boshqa tillar harflarini tekshir (xitoy, yapon, koreya, va h.k.)
  const otherScriptsPattern = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0370-\u03FF]/;
  if (otherScriptsPattern.test(translation)) {
    return { valid: false, issue: 'foreign_script' };
  }
  
  // 4. O'zbek lotin alifbosi uchun ruxsat etilgan belgilar
  const validUzbekPattern = /^[a-zA-Z0-9\s\-,.'"\(\)\[\]\/;:!?'']+$/;
  const cleanedTranslation = translation.replace(/o'|g'|O'|G'|sh|ch|ng|Sh|Ch|Ng|SH|CH|NG/g, 'X');
  if (!validUzbekPattern.test(cleanedTranslation)) {
    const invalidChars = cleanedTranslation.match(/[^a-zA-Z0-9\s\-,.'"\(\)\[\]\/;:!?'']/g);
    if (invalidChars && invalidChars.length > 0) {
      return { valid: false, issue: `invalid_chars: ${Array.from(new Set(invalidChars)).join('')}` };
    }
  }
  
  // 5. Prefiks va tushuntirishlarni tekshir
  const bannedPrefixes = [
    'uzbek translation', 'tarjima:', "ma'no:", 'meaning:', 'translation:',
    'answer:', 'javob:', 'result:', 'natija:'
  ];
  const lowerTranslation = translation.toLowerCase();
  for (const prefix of bannedPrefixes) {
    if (lowerTranslation.includes(prefix)) {
      return { valid: false, issue: 'prefix' };
    }
  }
  
  // 6. Juda qisqa tarjimalarni tekshir (1-2 harf)
  if (translation.trim().length < 2) {
    return { valid: false, issue: 'too_short' };
  }
  
  // 7. Juda uzun tarjimalarni tekshir (500+ belgi)
  if (translation.length > 500) {
    return { valid: false, issue: 'too_long' };
  }
  
  return { valid: true };
}

// Kuchli Ghoniy validatsiya funksiyasi
function validateGhoniyMeaning(meaning: string): { valid: boolean; issue?: string; cleaned?: string } {
  const baseValidation = validateTranslationQuality(meaning);
  if (!baseValidation.valid) {
    return baseValidation;
  }
  
  // O'zbek so'zlarining to'g'riligini tekshir
  const uzbekLetters = meaning.replace(/[^a-zA-Z']/g, '').toLowerCase();
  
  // Takrorlanuvchi harflar (imloviy xato)
  if (/(.)\1{3,}/.test(uzbekLetters)) {
    return { valid: false, issue: 'repeated_chars' };
  }
  
  // Unli harflar mavjudligini tekshir
  const vowels = uzbekLetters.match(/[aeiou]/g) || [];
  if (uzbekLetters.length > 5 && vowels.length === 0) {
    return { valid: false, issue: 'no_vowels' };
  }
  
  // Tozalangan versiyani qaytarish
  let cleaned = meaning.trim();
  cleaned = cleaned.replace(/\s+/g, ' '); // Ko'p bo'shliqlarni birlashtir
  cleaned = cleaned.replace(/^[-•*]\s*/, ''); // Boshi belgisini olib tashla
  
  return { valid: true, cleaned };
}

function buildProfessionalPrompt(metadata: WordMetadata): string {
  let grammarInstructions = '';
  
  if (metadata.type === 'verb') {
    grammarInstructions = `
SO'Z TURI: FE'L (harakat)
- Fe'lni o'zbek tilida FE'L MASDARI shaklida yoz (-moq qo'shimchasi bilan)
- Masalan: yozmoq, o'qimoq, bormoq, kelmoq
- Misollar: كَتَبَ → yozmoq | ذَهَبَ → ketmoq | جَلَسَ → o'tirmoq | أَكَلَ → yemoq`;
  } else if (metadata.type === 'noun') {
    if (metadata.isMasdar) {
      grammarInstructions = `
SO'Z TURI: MASDAR (fe'ldan yasalgan ot)
- Bu arabcha MASDAR - ya'ni fe'ldan yasalgan OT
- O'zbek tilida OT shaklida tarjima qil: -lik, -ish, -uv qo'shimchalari bilan
- MUHIM: -moq qo'shimchasi ISHLATMA! Bu fe'l emas, ot!
- Misollar: 
  كِتَابَة (kitoba) → yozuv, yozish (ot!)
  قِرَاءَة (qiroat) → o'qish (ot!)
  تَعْلِيم (ta'lim) → o'rgatish, ta'lim (ot!)
  بُخْل → xasislik (ot!)
  صَبْر → sabr, sabrlik (ot!)
  تَبْخِير → bug'latish (ot, -moq emas!)`;
    } else {
      grammarInstructions = `
SO'Z TURI: OT
- Otni BIRLIK shaklida yoz (jam' emas)
- Agar ko'plik shakli berilgan bo'lsa ham, birlik shaklini yoz
- Misollar: كُتُب → kitob | رِجَال → erkak | بُيُوت → uy | كِتَاب → kitob`;
    }
  } else if (metadata.type === 'adjective') {
    grammarInstructions = `
SO'Z TURI: SIFAT
- Sifatni oddiy shaklda yoz
- Misollar: كَبِير → katta | صَغِير → kichik | جَمِيل → chiroyli | بَخِيل → xasis`;
  } else {
    grammarInstructions = `
SO'Z TURI: ANIQLANMAGAN - TAHLIL QILING
- Arabcha ta'rifni diqqat bilan o'qib, so'z turini aniqla:

1. Agar "مصدر" (masdar) deb yozilgan bo'lsa → bu OT, -lik/-ish shaklida tarjima qil
   Masalan: بُخْل :مصدر → xasislik (ot!)
   
2. Agar "يَفعل" (hozirgi zamon) yoki "فعل ماض" bo'lsa → bu FE'L, -moq shaklida
   Masalan: كَتَبَ يَكتُبُ → yozmoq (fe'l)
   
3. Agar "جمع" (jam') yoki "اسم" bo'lsa → bu OT, birlik shaklida
   
4. Agar "صفة" bo'lsa → bu SIFAT, oddiy shaklda`;
  }

  return `Sen professional arabcha-o'zbekcha LUG'AT tarjimoni. Vazifang arabcha so'zlarni O'ZBEK TILIGA grammatik jihatdan TO'G'RI tarjima qilish.

${grammarInstructions}

PROFESSIONAL LUG'AT QOIDALARI:

1. GRAMMATIK MOSLIK:
   - Fe'llarni fe'l shaklida tarjima qil (-moq bilan)
   - Otlarni ot shaklida tarjima qil (birlikda)
   - Sifatlarni sifat shaklida tarjima qil
   
2. ARABCHA TA'RIFNI TAHLIL QIL:
   - "مصدر" - bu masdar, ya'ni fe'lning ot shakli → -moq bilan tarjima qil
   - "جمع" - bu ko'plik → BIRLIK shaklini yoz
   - "فعل ماض" - bu o'tgan zamon fe'li → -moq shaklida yoz
   - Misollar (:- belgisidan keyin) - kontekstni tushunish uchun ishlat
   
3. O'ZBEK LOTIN ALIFBOSI:
   - FAQAT lotin harflari: a b d e f g h i j k l m n o p q r s t u v x y z
   - Maxsus harflar: o' g' sh ch ng
   - TAQIQLANGAN: kirill, arab harflari, prefiks, izoh

4. ISLOMIY ATAMALAR:
   - Alloh, Ibrohim, Muso, Iso, Muhammad, Quron, namoz, ro'za, haj, zakot
   - Diniy atamalarni o'zbek islomiy uslubida saqlа

5. FORMAT:
   - Faqat tarjimani yoz, izohsiz
   - Bir nechta ma'no bo'lsa: vergul bilan ajrat
   - Qisqa va aniq

NAMUNALAR:
كَتَبَ (fe'l) → yozmoq
كِتَاب (ot) → kitob
كُتُب (jam') → kitob (birlikda!)
كَاتِب (ot) → yozuvchi
مَكْتُوب (sifat) → yozilgan
جَمِيل (sifat) → chiroyli
ذَهَبَ (fe'l) → ketmoq`;
}

export async function translateArabicToUzbek(
  arabicWord: string,
  arabicDefinition?: string
): Promise<string> {
  try {
    const metadata = extractWordMetadata(arabicDefinition || '');
    const systemPrompt = buildProfessionalPrompt(metadata);

    const userPrompt = arabicDefinition
      ? `ARABCHA SO'Z: ${arabicWord}
ARABCHA TA'RIF: ${arabicDefinition}

Yuqoridagi ta'rifni tahlil qilib, so'zning grammatik turini (fe'l/ot/sifat) aniqla va o'zbek tiliga MOS SHAKLDA tarjima qil.

O'ZBEKCHA TARJIMA:`
      : `ARABCHA SO'Z: ${arabicWord}

O'ZBEKCHA TARJIMA:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    let result = completion.choices[0]?.message?.content?.trim() || "";
    
    result = result
      .replace(/^(O'ZBEKCHA TARJIMA:|Tarjima:|Translation:)\s*/i, '')
      .replace(/^[-•]\s*/, '')
      .trim();
    
    const validation = validateTranslationQuality(result);
    if (!validation.valid) {
      console.log(`Quality issue for "${arabicWord}": ${validation.issue} - "${result}"`);
      if (validation.issue === 'empty') {
        return "";
      }
      result = result
        .replace(/[\u0400-\u04FF]/g, '')
        .replace(/[\u0600-\u06FF\u0750-\u077F]/g, '')
        .trim();
      
      if (!result) {
        return "";
      }
    }
    
    return result;
  } catch (error: any) {
    console.error("Translation error:", error);
    const errorCode = error?.code || error?.error?.code || '';
    const errorMessage = error?.message || '';
    if (errorCode === 'content_filter' || errorMessage.includes('content management policy') || errorMessage.includes('content_filter')) {
      return "[taqiqlangan]";
    }
    return "";
  }
}

export async function batchTranslate(
  entries: Array<{ id: number; arabic: string; arabicDefinition?: string }>
): Promise<Array<{ id: number; translation: string }>> {
  const results: Array<{ id: number; translation: string }> = [];

  const batchSize = 5;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const promises = batch.map(async (entry) => {
      try {
        const translation = await translateArabicToUzbek(
          entry.arabic,
          entry.arabicDefinition
        );
        return { id: entry.id, translation };
      } catch (error) {
        console.error(`Error translating entry ${entry.id}:`, error);
        return { id: entry.id, translation: "" };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    if (i + batchSize < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ==================== FE'L TASRIFI (VERB CONJUGATION) ====================

export interface ConjugationResult {
  verb: string;
  past: {
    he: { arabic: string; uzbek: string };
    she: { arabic: string; uzbek: string };
    they_m: { arabic: string; uzbek: string };
    i: { arabic: string; uzbek: string };
    we: { arabic: string; uzbek: string };
  };
  present: {
    he: { arabic: string; uzbek: string };
    she: { arabic: string; uzbek: string };
    they_m: { arabic: string; uzbek: string };
    i: { arabic: string; uzbek: string };
    we: { arabic: string; uzbek: string };
  };
  imperative: {
    you_m: { arabic: string; uzbek: string };
    you_f: { arabic: string; uzbek: string };
  };
  masdar: { arabic: string; uzbek: string };
  active_participle: { arabic: string; uzbek: string };
  passive_participle: { arabic: string; uzbek: string };
  verb_type: string;
}

const CONJUGATION_SYSTEM_PROMPT = `Sen arab tili grammatikasi (sarf) bo'yicha mutaxassis olimsan.

Berilgan arabcha fe'lning asosiy grammatik shakllarini chiqar.

QOIDALAR:
1. Faqat mashhur va to'g'ri shakllarni ber
2. Har bir shakl yonida qisqa o'zbekcha izoh bo'lsin
3. Harakatlar (tashkil) bilan yoz
4. Ortiqcha tushuntirish yozma
5. Javobni faqat JSON formatda ber
6. O'zbek tilida lotin alifbosida yoz (o', g', sh, ch, ng)

JSON format:
{
  "verb": "fe'l",
  "past": {
    "he": { "arabic": "فَعَلَ", "uzbek": "u qildi" },
    "she": { "arabic": "فَعَلَتْ", "uzbek": "u (ayol) qildi" },
    "they_m": { "arabic": "فَعَلُوا", "uzbek": "ular qildi" },
    "i": { "arabic": "فَعَلْتُ", "uzbek": "men qildim" },
    "we": { "arabic": "فَعَلْنَا", "uzbek": "biz qildik" }
  },
  "present": {
    "he": { "arabic": "يَفْعَلُ", "uzbek": "u qiladi" },
    "she": { "arabic": "تَفْعَلُ", "uzbek": "u (ayol) qiladi" },
    "they_m": { "arabic": "يَفْعَلُونَ", "uzbek": "ular qiladi" },
    "i": { "arabic": "أَفْعَلُ", "uzbek": "men qilaman" },
    "we": { "arabic": "نَفْعَلُ", "uzbek": "biz qilamiz" }
  },
  "imperative": {
    "you_m": { "arabic": "اِفْعَلْ", "uzbek": "qil (erkak)" },
    "you_f": { "arabic": "اِفْعَلِي", "uzbek": "qil (ayol)" }
  },
  "masdar": { "arabic": "فِعْلٌ", "uzbek": "qilish" },
  "active_participle": { "arabic": "فَاعِلٌ", "uzbek": "qiluvchi" },
  "passive_participle": { "arabic": "مَفْعُولٌ", "uzbek": "qilingan" },
  "verb_type": "sulosiy mujarrad (uchlik oddiy)"
}`;

export async function conjugateVerb(verb: string): Promise<ConjugationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CONJUGATION_SYSTEM_PROMPT },
        { role: "user", content: `Fe'l: ${verb}\n\nYuqoridagi formatda tasrif qil.` },
      ],
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return parsed as ConjugationResult;
  } catch (error: any) {
    console.error("Conjugation error:", error);
    throw new Error("Fe'l tasrifida xatolik yuz berdi");
  }
}

// ==================== HARAKAT (VOCALIZATION) FUNCTIONS ====================

interface VocalizationResult {
  wordVocalized: string;
  definitionVocalized: string;
}

export async function vocalizeArabicText(
  arabicWord: string,
  arabicDefinition?: string
): Promise<VocalizationResult> {
  try {
    const systemPrompt = `Sen professional arab tili mutaxassisisan. Vazifang arabcha matnlarga to'g'ri harakat (tashkil) qo'yish.

QOIDALAR:
1. Har bir harfga to'g'ri harakat qo'y: fatha (◌َ), kasra (◌ِ), damma (◌ُ), sukun (◌ْ), shadda (◌ّ), tanvin
2. Kontekstga qarab grammatik jihatdan to'g'ri harakat qo'y
3. Qur'on oyatlari va diniy atamalar uchun an'anaviy harakatni saqlа
4. Harflarni o'zgartirma, faqat harakat qo'sh
5. Tinish belgilarini saqlа

JAVOB FORMATI - FAQAT JSON:
{
  "word_vocalized": "harakatli so'z",
  "definition_vocalized": "harakatli ta'rif"
}`;

    const userPrompt = arabicDefinition
      ? `SO'Z: ${arabicWord}
TA'RIF: ${arabicDefinition}

Ikkalasiga ham harakat qo'y.`
      : `SO'Z: ${arabicWord}

Faqat so'zga harakat qo'y.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    return {
      wordVocalized: parsed.word_vocalized || arabicWord,
      definitionVocalized: parsed.definition_vocalized || arabicDefinition || '',
    };
  } catch (error) {
    console.error("Vocalization error:", error);
    return {
      wordVocalized: arabicWord,
      definitionVocalized: arabicDefinition || '',
    };
  }
}

interface FullProcessingResult {
  id: number;
  arabicVocalized: string;
  arabicDefinitionVocalized: string;
  uzbekTranslation: string;
  processingTime: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export async function processRoidEntry(
  entry: { id: number; arabic: string; arabicDefinition?: string }
): Promise<FullProcessingResult> {
  const startTime = Date.now();
  let tokensUsed = 0;
  
  try {
    // 1-bosqich: Harakat qo'yish
    const vocalizationResult = await vocalizeArabicText(entry.arabic, entry.arabicDefinition);
    tokensUsed += 500; // Taxminiy token soni
    
    // 2-bosqich: O'zbekchaga tarjima (harakatli matn asosida)
    const uzbekTranslation = await translateArabicToUzbek(
      vocalizationResult.wordVocalized,
      vocalizationResult.definitionVocalized
    );
    tokensUsed += 300;
    
    return {
      id: entry.id,
      arabicVocalized: vocalizationResult.wordVocalized,
      arabicDefinitionVocalized: vocalizationResult.definitionVocalized,
      uzbekTranslation,
      processingTime: Date.now() - startTime,
      tokensUsed,
      success: true,
    };
  } catch (error: any) {
    return {
      id: entry.id,
      arabicVocalized: entry.arabic,
      arabicDefinitionVocalized: entry.arabicDefinition || '',
      uzbekTranslation: '',
      processingTime: Date.now() - startTime,
      tokensUsed,
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}

export async function batchProcessRoidEntries(
  entries: Array<{ id: number; arabic: string; arabicDefinition?: string }>,
  onProgress?: (current: number, total: number, result: FullProcessingResult) => void
): Promise<{
  results: FullProcessingResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
    estimatedCost: number;
    totalTokens: number;
  };
}> {
  const results: FullProcessingResult[] = [];
  const startTime = Date.now();
  let totalTokens = 0;
  
  const batchSize = 3; // Bir vaqtda 3 ta so'z
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchPromises = batch.map(entry => processRoidEntry(entry));
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results.push(result);
      totalTokens += result.tokensUsed;
      
      if (onProgress) {
        onProgress(results.length, entries.length, result);
      }
    }
    
    // Rate limiting
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Narx hisoblash: gpt-4o ~ $5/1M input, $15/1M output tokens
  // O'rtacha 800 token har bir so'z uchun (input + output)
  const estimatedCost = (totalTokens / 1000000) * 10; // O'rtacha $10/1M
  
  return {
    results,
    summary: {
      total: entries.length,
      successful,
      failed,
      totalTime: Date.now() - startTime,
      estimatedCost,
      totalTokens,
    },
  };
}

// ==================== GHONIY DICTIONARY TRANSLATION ====================

interface GhoniyMeaning {
  index: number;
  uzbekMeaning: string;
  arabicExample?: string;
  uzbekExample?: string;
  confidence: number;
}

interface GhoniyTranslationResult {
  id: number;
  wordType: string;
  uzbekSummary: string;
  meanings: GhoniyMeaning[];
  processingTime: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

const GHONIY_SYSTEM_PROMPT = `Sen professional arabcha-o'zbekcha LUG'AT tarjimoni va tilshunossisan. G'oniy arabcha-arabcha izohli lug'atidan so'zlarni O'ZBEK TILIGA tarjima qilasan.

🎯 ASOSIY MAQSAD:
Arabcha ta'rifdan SO'ZNING HAQIQIY MA'NOSINI tushunib, O'ZBEK TILIDA to'g'ri va aniq tarjima qilish.
Talaba BARCHA MA'NOLARNI bilishi kerak! Har bir ma'noni MISOL KONTEKSTIDAN ol!

📚 SO'Z TURLARINI ANIQLASH:
Ta'rif boshidagi qavslardan so'z turini aniqla:
- (مصدر ...) → masdar → o'zbekcha: -ish, -uv, -lik (MASDAR OT SHAKLIDA!)
- (اسم فاعل) → ismu_foil → o'zbekcha: -uvchi, -chi
- (اسم مفعول) → ismu_mafʼul → o'zbekcha: -lgan, -ilgan
- (صفة) → sifat → o'zbekcha sifat shaklida
- (اسم) → ot → o'zbekcha ot shaklida
- (فعل) → feʼl → o'zbekcha: -moq

📖 TARJIMA QOIDALARI:

1. GRAMMATIK MOSLIK - JUDA MUHIM!
   ✅ TO'G'RI:
   - مصدر كَتَبَ → yozish (OT!) 
   - فعل كَتَبَ → yozmoq (FE'L!)
   - اسم فاعل كَاتِب → yozuvchi
   - صفة جَمِيل → chiroyli
   
   ❌ XATO:
   - مصدر uchun "yozmoq" (bu fe'l shakli!)
   - جَمْع uchun ko'plik (BIRLIK shaklida yoz!)

2. O'ZBEK IMLO QOIDALARI:
   ✅ TO'G'RI: o', g', sh, ch, ng
   ✅ Tinish belgilari: , . ; : - ( )
   ❌ TAQIQLANGAN: ъ, ь, kirill, arab harflari
   
3. MA'NOLARNI MISOLLARDAN OL - BU JUDA MUHIM!
   - Ta'rifdagi HAR BIR ":-" belgisidan keyin - bu MISOL
   - Har bir misolning KONTEKSTIDAN ma'noni aniqla
   - "|1-", "|2-" raqamlari - bu turli ma'nolar
   - BARCHA ma'nolarni raqamlab yoz!

4. SIFAT FILTRI - QAT'IY TAQIQLANGAN:
   ❌ Kirill harflari (а, б, в...)
   ❌ Arab harflari tarjimada
   ❌ Prefiks ("Tarjima:", "Ma'no:" kabi)
   ❌ Tushuntirish va izohlar
   ❌ Emoji va maxsus belgilar
   ✅ FAQAT: a-z, A-Z, o', g', sh, ch, ng, vergul, nuqta

5. ISLOMIY ATAMALAR (O'ZBEK USLUBIDA):
   الله → Alloh | محمد → Muhammad (s.a.v) | القرآن → Qur'on
   صلاة → namoz | صوم → ro'za | حج → haj | زكاة → zakot

📝 JAVOB FORMATI (FAQAT JSON):
{
  "word_type": "masdar/ismu_foil/ismu_mafʼul/sifat/ot/feʼl",
  "uzbek_summary": "1. birinchi ma'no; 2. ikkinchi ma'no; 3. uchinchi ma'no",
  "meanings": [
    {
      "index": 1,
      "uzbek_meaning": "birinchi ma'no (kontekstga mos)",
      "arabic_example": "arabcha misol jumla",
      "uzbek_example": "o'zbekcha tarjima",
      "confidence": 0.95
    },
    {
      "index": 2,
      "uzbek_meaning": "ikkinchi ma'no (boshqa kontekst)",
      "arabic_example": "boshqa arabcha misol",
      "uzbek_example": "boshqa o'zbekcha tarjima",
      "confidence": 0.90
    }
  ]
}

⚠️ MUHIM QOIDALAR:
- uzbek_summary: BARCHA ma'nolar RAQAMLANGAN bo'lishi kerak! Format: "1. ma'no1; 2. ma'no2; 3. ma'no3"
- Har bir ma'no MISOL kontekstidan olinishi kerak
- uzbek_meaning va uzbek_example FAQAT lotin harflarida!
- confidence - tarjima ishonchliligi (0.7-1.0)
- So'z turi noma'lum bo'lsa: "ot" deb yoz`;

function parseGhoniyDefinition(definition: string): {
  wordType: string;
  cleanDefinition: string;
  examples: Array<{ arabic: string }>;
} {
  if (!definition) {
    return { wordType: '', cleanDefinition: '', examples: [] };
  }
  
  // Extract word type from parentheses at the beginning
  let wordType = '';
  let cleanDefinition = definition;
  
  const typeMatch = definition.match(/^\s*\(([^)]+)\)\s*\.?\|?-?\s*/);
  if (typeMatch) {
    wordType = typeMatch[1].trim();
    cleanDefinition = definition.slice(typeMatch[0].length).trim();
  }
  
  // Extract examples (text after :- or : followed by Arabic text)
  const examples: Array<{ arabic: string }> = [];
  const exampleMatches = cleanDefinition.match(/[:-]\s*([^|]+)/g);
  if (exampleMatches) {
    for (const match of exampleMatches) {
      const example = match.replace(/^[:-]\s*/, '').trim();
      if (example && example.length > 3) {
        examples.push({ arabic: example });
      }
    }
  }
  
  return { wordType, cleanDefinition, examples };
}

export async function translateGhoniyEntry(
  entry: { id: number; arabic: string; arabicDefinition?: string; type?: string },
  retryCount: number = 0
): Promise<GhoniyTranslationResult> {
  const startTime = Date.now();
  let tokensUsed = 0;
  const MAX_RETRIES = 2;
  
  try {
    const parsed = parseGhoniyDefinition(entry.arabicDefinition || '');
    
    const userPrompt = `ARABCHA SO'Z: ${entry.arabic}
ILDIZ: ${entry.type || 'nomaʼlum'}
SO'Z TURI (ta'rifdan): ${parsed.wordType || 'aniqlanmagan'}
ARABCHA TA'RIF: ${entry.arabicDefinition || ''}

Yuqoridagi ma'lumotlarni tahlil qilib:
1. So'z turini aniqla (masdar, ismu_foil, feʼl, ot, sifat)
2. Har bir ma'noni alohida raqamla
3. Har bir ma'no uchun misol va tarjimasini ber
4. Grammatik jihatdan to'g'ri tarjima qil
5. FAQAT lotin harflarida yoz (o', g', sh, ch)

JSON formatida javob ber:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: GHONIY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: retryCount > 0 ? 0.1 : 0, // Qayta urinishda biroz temperature
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    tokensUsed = completion.usage?.total_tokens || 1000;
    
    // JSON ni parse qilish, xato bo'lsa tuzatishga urining
    let parsed_response: any;
    try {
      parsed_response = JSON.parse(content);
    } catch (parseError) {
      // JSON xato bo'lsa - qavslarni yopib ko'ring
      let fixedContent = content;
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      // Yopilmagan stringlarni tozalash
      fixedContent = fixedContent.replace(/,\s*"[^"]*$/g, '');
      
      // Qavslarni yopish
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixedContent += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) fixedContent += '}';
      
      try {
        parsed_response = JSON.parse(fixedContent);
      } catch {
        // Hali ham xato - oddiy regex bilan ma'nolarni olish
        const meaningMatches = content.match(/"uzbek_meaning"\s*:\s*"([^"]+)"/g) || [];
        const meanings = meaningMatches.map((m: string, idx: number) => ({
          index: idx + 1,
          uzbek_meaning: m.match(/"uzbek_meaning"\s*:\s*"([^"]+)"/)?.[1] || ''
        })).filter((m: any) => m.uzbek_meaning);
        
        parsed_response = { meanings, word_type: 'nomalum' };
      }
    }
    
    // Validate and extract meanings with enhanced validation
    const meanings: GhoniyMeaning[] = [];
    if (Array.isArray(parsed_response.meanings)) {
      for (const m of parsed_response.meanings) {
        const uzbekMeaning = m.uzbek_meaning || m.uzbekMeaning || '';
        const uzbekExample = m.uzbek_example || m.uzbekExample || '';
        
        // Kuchli validatsiya
        const meaningValidation = validateGhoniyMeaning(uzbekMeaning);
        const exampleValidation = uzbekExample ? validateGhoniyMeaning(uzbekExample) : { valid: true, cleaned: '' };
        
        if (meaningValidation.valid && uzbekMeaning.trim()) {
          meanings.push({
            index: m.index || meanings.length + 1,
            uzbekMeaning: meaningValidation.cleaned || uzbekMeaning.trim(),
            arabicExample: m.arabic_example || m.arabicExample || '',
            uzbekExample: exampleValidation.cleaned || uzbekExample,
            confidence: typeof m.confidence === 'number' ? m.confidence : 0.85,
          });
        }
      }
    }
    
    // Validate summary and ensure numbered format
    let uzbekSummary = parsed_response.uzbek_summary || parsed_response.uzbekSummary || '';
    const summaryValidation = validateGhoniyMeaning(uzbekSummary);
    
    // Har doim raqamlangan format yaratish
    const createNumberedSummary = (meaningsArr: GhoniyMeaning[]): string => {
      if (meaningsArr.length === 0) return '';
      if (meaningsArr.length === 1) return meaningsArr[0].uzbekMeaning;
      return meaningsArr.map((m, i) => `${i + 1}. ${m.uzbekMeaning}`).join('; ');
    };
    
    if (!summaryValidation.valid || !uzbekSummary.includes('1.')) {
      // Agar raqamsiz bo'lsa yoki validatsiya o'tmasa, ma'nolardan yaratish
      uzbekSummary = createNumberedSummary(meanings);
    } else {
      uzbekSummary = summaryValidation.cleaned || uzbekSummary.trim();
    }
    
    // If no valid meanings but have summary
    if (meanings.length === 0 && uzbekSummary) {
      // Summary dan ma'nolarni ajratib olish
      const summaryParts = uzbekSummary.split(/[;,]/).map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      if (summaryParts.length > 0) {
        summaryParts.forEach((part, idx) => {
          meanings.push({
            index: idx + 1,
            uzbekMeaning: part,
            confidence: 0.7,
          });
        });
      } else {
        meanings.push({
          index: 1,
          uzbekMeaning: uzbekSummary,
          confidence: 0.7,
        });
      }
    }
    
    // Agar ma'no topilmasa va qayta urinish imkoni bo'lsa
    if (meanings.length === 0 && retryCount < MAX_RETRIES) {
      console.log(`Retry ${retryCount + 1} for entry ${entry.id}: ${entry.arabic}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return translateGhoniyEntry(entry, retryCount + 1);
    }
    
    return {
      id: entry.id,
      wordType: parsed_response.word_type || parsed_response.wordType || parsed.wordType || 'ot',
      uzbekSummary: uzbekSummary.trim(),
      meanings,
      processingTime: Date.now() - startTime,
      tokensUsed,
      success: meanings.length > 0,
      error: meanings.length === 0 ? 'No valid meanings extracted' : undefined,
    };
  } catch (error: any) {
    console.error(`Error translating Ghoniy entry ${entry.id}:`, error);
    
    // Xato bo'lganda qayta urinish
    if (retryCount < MAX_RETRIES && !error?.message?.includes('content_filter')) {
      console.log(`Retry after error for entry ${entry.id}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return translateGhoniyEntry(entry, retryCount + 1);
    }
    
    return {
      id: entry.id,
      wordType: '',
      uzbekSummary: '',
      meanings: [],
      processingTime: Date.now() - startTime,
      tokensUsed,
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}

export async function batchProcessGhoniyEntries(
  entries: Array<{ id: number; arabic: string; arabicDefinition?: string; type?: string }>,
  onProgress?: (current: number, total: number, result: GhoniyTranslationResult) => void
): Promise<{
  results: GhoniyTranslationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
    estimatedCost: number;
    totalTokens: number;
  };
}> {
  const results: GhoniyTranslationResult[] = [];
  const startTime = Date.now();
  let totalTokens = 0;
  
  const batchSize = 5; // 5 ta so'z parallel
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchPromises = batch.map(entry => translateGhoniyEntry(entry));
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results.push(result);
      totalTokens += result.tokensUsed;
      
      if (onProgress) {
        onProgress(results.length, entries.length, result);
      }
    }
    
    // Rate limiting
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Cost estimation: gpt-4o ~ $2.5/1M input, $10/1M output
  const estimatedCost = (totalTokens / 1000000) * 6; // Average $6/1M
  
  return {
    results,
    summary: {
      total: entries.length,
      successful,
      failed,
      totalTime: Date.now() - startTime,
      estimatedCost,
      totalTokens,
    },
  };
}
