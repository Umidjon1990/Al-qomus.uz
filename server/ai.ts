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
  
  const verbIndicators = [
    /يَ\w+/,
    /فعل/,
    /مصدر/,
    /ماضٍ|ماض/,
    /مضارع/,
    /أمر/,
    /فاعل/,
    /مفعول/,
  ];
  
  const nounIndicators = [
    /جمع/,
    /مفرد/,
    /اسم/,
    /مؤنث|مذكر/,
  ];
  
  const adjectiveIndicators = [
    /صفة/,
    /نعت/,
    /أفعل التفضيل/,
  ];
  
  let type: WordType = 'unknown';
  
  const isVerb = verbIndicators.some(pattern => pattern.test(def));
  const isNoun = nounIndicators.some(pattern => pattern.test(def));
  const isAdjective = adjectiveIndicators.some(pattern => pattern.test(def));
  
  if (isVerb && !isNoun) type = 'verb';
  else if (isNoun && !isVerb) type = 'noun';
  else if (isAdjective) type = 'adjective';
  else if (def.includes('حرف')) type = 'particle';
  
  return {
    type,
    isPlural: /جمع/.test(def),
    isMasdar: /مصدر/.test(def),
    hasPastForm: /ماضٍ|ماض|فعل/.test(def),
    hasPresentForm: /يَ\w+|مضارع/.test(def),
    hasExamples: /:-/.test(def),
  };
}

function buildProfessionalPrompt(metadata: WordMetadata): string {
  let grammarInstructions = '';
  
  if (metadata.type === 'verb') {
    grammarInstructions = `
SO'Z TURI: FE'L
- Fe'lni o'zbek tilida MASDAR shaklida yoz (-moq qo'shimchasi bilan)
- Masalan: yozmoq, o'qimoq, bormoq, kelmoq
- Agar bir nechta ma'no bo'lsa, vergul bilan ajrat
- Misollar: كَتَبَ → yozmoq | ذَهَبَ → ketmoq | جَلَسَ → o'tirmoq`;
  } else if (metadata.type === 'noun') {
    grammarInstructions = `
SO'Z TURI: OT
- Otni BIRLIK shaklida yoz (jam' emas)
- Agar ko'plik shakli berilgan bo'lsa ham, birlik shaklini yoz
- Misollar: كُتُب → kitob | رِجَال → erkak | بُيُوت → uy`;
  } else if (metadata.type === 'adjective') {
    grammarInstructions = `
SO'Z TURI: SIFAT
- Sifatni oddiy shaklda yoz
- Misollar: كَبِير → katta | صَغِير → kichik | جَمِيل → chiroyli`;
  } else {
    grammarInstructions = `
SO'Z TURI: ANIQLANMAGAN
- Arabcha ta'rifni diqqat bilan o'qib, so'z turini aniqla
- Fe'l bo'lsa: -moq shaklida (yozmoq, o'qimoq)
- Ot bo'lsa: birlik shaklida (kitob, qalam)
- Sifat bo'lsa: oddiy shaklda (katta, yaxshi)`;
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
    
    return result;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("AI tarjima xatolik berdi");
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
