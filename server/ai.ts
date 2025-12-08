import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function translateArabicToUzbek(
  arabicWord: string,
  arabicDefinition?: string
): Promise<string> {
  try {
    const systemPrompt = `Sen professional arabcha-o'zbekcha lug'at tarjimoni.

QATIY QOIDALAR:
1. FAQAT LOTIN harflarida yoz: a b d e f g h i j k l m n o p q r s t u v x y z va o' g' sh ch ng
2. TAQIQLANGAN: Kirill harflari (А Б В Г Д...), Arab harflari (ا ب ت...), "Uzbek Translation:" yoki boshqa prefiks
3. Qisqa lug'at uslubida yoz - faqat so'zning ma'nosini ber
4. Izoh, qavs, raqam, tire QOSHMA

NAMUNA JAVOBLAR:
kitob
maktab
olim, bilimdon
suv
ota

XATO JAVOBLAR (BUNDAY YOZMA):
❌ Uzbek Translation: kitob
❌ Китоб
❌ كتاب - kitob
❌ Kitob: bu o'qish uchun...`;

    const userPrompt = arabicDefinition
      ? `Arabcha so'z: ${arabicWord}
Arabcha ta'rif: ${arabicDefinition}

Faqat o'zbekcha tarjimani yoz:`
      : `Arabcha so'z: ${arabicWord}

Faqat o'zbekcha tarjimani yoz:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      temperature: 0.2,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("AI tarjima xatolik berdi");
  }
}

export async function batchTranslate(
  entries: Array<{ id: number; arabic: string; arabicDefinition?: string }>
): Promise<Array<{ id: number; translation: string }>> {
  const results: Array<{ id: number; translation: string }> = [];

  // Process in batches of 5 to avoid rate limits
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

    // Small delay between batches
    if (i + batchSize < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}
