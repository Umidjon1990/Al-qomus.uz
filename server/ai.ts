import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  
  const cyrillicPattern = /[\u0400-\u04FF]/;
  if (cyrillicPattern.test(translation)) {
    return { valid: false, issue: 'cyrillic' };
  }
  
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabicPattern.test(translation)) {
    return { valid: false, issue: 'arabic' };
  }
  
  const validUzbekPattern = /^[a-zA-Z0-9\s\-,.'"\(\)\[\]\/;:!?']+$/;
  const cleanedTranslation = translation.replace(/o'|g'|O'|G'/g, 'X');
  if (!validUzbekPattern.test(cleanedTranslation)) {
    const invalidChars = cleanedTranslation.match(/[^a-zA-Z0-9\s\-,.'"\(\)\[\]\/;:!?']/g);
    if (invalidChars && invalidChars.length > 0) {
      return { valid: false, issue: `invalid_chars: ${Array.from(new Set(invalidChars)).join('')}` };
    }
  }
  
  if (translation.toLowerCase().includes('uzbek translation') || 
      translation.toLowerCase().includes('tarjima:')) {
    return { valid: false, issue: 'prefix' };
  }
  
  return { valid: true };
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
Talaba NOTO'G'RI ma'no yodlab olmasligi uchun, FAQAT kontekstga mos tarjima ber!

📚 SO'Z TURLARINI ANIQLASH:
Ta'rif boshidagi qavslardan so'z turini aniqla:
- (مصدر ...) → MASDAR (fe'ldan yasalgan ot) → o'zbekcha: -ish, -uv, -lik
- (اسم فاعل) → ISMU FOIL (fe'l boshlovchisi) → o'zbekcha: -uvchi, -chi
- (اسم مفعول) → ISMU MAFʼUL (fe'l qabul qiluvchi) → o'zbekcha: -lgan, -ilgan
- (صفة) → SIFAT → o'zbekcha sifat shaklida
- (اسم) → OT → o'zbekcha ot shaklida
- (فعل) → FE'L → o'zbekcha: -moq

📖 TARJIMA QOIDALARI:

1. GRAMMATIK MOSLIK MUHIM!
   - Masdar → ot shaklida tarjima qil (yozish, o'qish, YOzmoq EMAS!)
   - Ismu foil → -uvchi/-chi (yozuvchi, o'quvchi)
   - Fe'l → -moq (yozmoq, o'qimoq)

2. MA'NOLARNI MISOLLARDAN OL!
   - Har bir ":-" belgisidan keyingi jumla - bu MISOL
   - Misoldan kontekstga mos MA'NONI aniqla
   - Har bir ma'noni ALOHIDA raqamla

3. KO'P MA'NOLI SO'ZLAR:
   - Har bir ma'noni alohida raqam bilan ber
   - Har bir ma'no uchun arabcha misol va uning tarjimasini ber

4. SIFAT FILTRI - TAQIQLANGAN:
   - ❌ Kirill harflari
   - ❌ Arabcha harflar tarjimada
   - ❌ Prefiks ("Tarjima:", "Ma'no:" kabi)
   - ❌ Tushuntirish va izohlar
   - ✅ FAQAT lotin harflari: a-z, o', g', sh, ch

5. ISLOMIY ATAMALAR:
   Alloh, Muhammad (s.a.v), Qur'on, namoz, ro'za, haj, zakot - o'zbek islomiy uslubida

📝 JAVOB FORMATI (FAQAT JSON):
{
  "word_type": "masdar/ismu_foil/ismu_mafʼul/sifat/ot/feʼl",
  "uzbek_summary": "asosiy qisqa tarjima",
  "meanings": [
    {
      "index": 1,
      "uzbek_meaning": "birinchi ma'no",
      "arabic_example": "arabcha misol jumla",
      "uzbek_example": "o'zbekcha tarjima",
      "confidence": 0.95
    }
  ]
}

⚠️ MUHIM ESLATMALAR:
- Har bir ma'no ALOHIDA indeksga ega
- arabic_example va uzbek_example - bu TA'RIFDAGI misollar
- confidence - bu tarjima ishonchlilik darajasi (0.0 - 1.0)
- uzbek_summary - bu BARCHA ma'nolarning qisqacha yig'indisi`;

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
  entry: { id: number; arabic: string; arabicDefinition?: string; type?: string }
): Promise<GhoniyTranslationResult> {
  const startTime = Date.now();
  let tokensUsed = 0;
  
  try {
    const parsed = parseGhoniyDefinition(entry.arabicDefinition || '');
    
    const userPrompt = `ARABCHA SO'Z: ${entry.arabic}
ILDIZ: ${entry.type || 'nomaʼlum'}
SO'Z TURI (ta'rifdan): ${parsed.wordType || 'aniqlanmagan'}
ARABCHA TA'RIF: ${entry.arabicDefinition || ''}

Yuqoridagi ma'lumotlarni tahlil qilib:
1. So'z turini aniqla (masdar, ismu foil, fe'l, ot, sifat)
2. Har bir ma'noni alohida raqamla
3. Har bir ma'no uchun misol va tarjimasini ber
4. Grammatik jihatdan to'g'ri tarjima qil

JSON formatida javob ber:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: GHONIY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    tokensUsed = completion.usage?.total_tokens || 1000;
    
    const parsed_response = JSON.parse(content);
    
    // Validate and extract meanings
    const meanings: GhoniyMeaning[] = [];
    if (Array.isArray(parsed_response.meanings)) {
      for (const m of parsed_response.meanings) {
        // Validate Uzbek meaning - must be Latin only
        const uzbekMeaning = m.uzbek_meaning || m.uzbekMeaning || '';
        const validation = validateTranslationQuality(uzbekMeaning);
        
        if (validation.valid && uzbekMeaning.trim()) {
          meanings.push({
            index: m.index || meanings.length + 1,
            uzbekMeaning: uzbekMeaning.trim(),
            arabicExample: m.arabic_example || m.arabicExample || '',
            uzbekExample: m.uzbek_example || m.uzbekExample || '',
            confidence: typeof m.confidence === 'number' ? m.confidence : 0.8,
          });
        }
      }
    }
    
    // Validate summary
    let uzbekSummary = parsed_response.uzbek_summary || parsed_response.uzbekSummary || '';
    const summaryValidation = validateTranslationQuality(uzbekSummary);
    if (!summaryValidation.valid) {
      // Try to create summary from meanings
      uzbekSummary = meanings.map(m => m.uzbekMeaning).join(', ');
    }
    
    // If no valid meanings, try simple translation
    if (meanings.length === 0 && uzbekSummary) {
      meanings.push({
        index: 1,
        uzbekMeaning: uzbekSummary,
        confidence: 0.7,
      });
    }
    
    return {
      id: entry.id,
      wordType: parsed_response.word_type || parsed_response.wordType || parsed.wordType || '',
      uzbekSummary: uzbekSummary.trim(),
      meanings,
      processingTime: Date.now() - startTime,
      tokensUsed,
      success: meanings.length > 0,
      error: meanings.length === 0 ? 'No valid meanings extracted' : undefined,
    };
  } catch (error: any) {
    console.error(`Error translating Ghoniy entry ${entry.id}:`, error);
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
