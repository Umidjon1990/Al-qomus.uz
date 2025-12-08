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
