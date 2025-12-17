import { db } from "../server/db";
import { dictionaryEntries, synonyms } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface SynsetGroup {
  synsetId: string;
  arabicLemmas: string[];
}

// Harakatlarni olib tashlash
function stripDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, "").trim();
}

function parseCSV(filePath: string): SynsetGroup[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").slice(1);
  const groups: SynsetGroup[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(",");
    const synsetId = parts[0];
    const arabicLemmasField = parts[4] || "";
    
    if (!arabicLemmasField || arabicLemmasField.trim() === "") continue;
    
    const arabicLemmas = arabicLemmasField
      .split(/[,،\s]+/)
      .map(w => stripDiacritics(w))
      .filter(w => w.length > 0 && /[\u0600-\u06FF]/.test(w));
    
    if (arabicLemmas.length >= 1) {
      groups.push({ synsetId, arabicLemmas });
    }
  }
  
  return groups;
}

async function importSynonyms() {
  console.log("Arabic WordNet sinonimlarni import qilish (harakatsiz qidirish)...\n");
  
  // Avval barcha entry larni olish
  console.log("Lug'at so'zlarini yuklash...");
  const allEntries = await db.select({ id: dictionaryEntries.id, arabic: dictionaryEntries.arabic })
    .from(dictionaryEntries);
  
  // Harakatsiz xarita yaratish
  const entryMap = new Map<string, number[]>();
  for (const entry of allEntries) {
    const stripped = stripDiacritics(entry.arabic);
    if (!entryMap.has(stripped)) {
      entryMap.set(stripped, []);
    }
    entryMap.get(stripped)!.push(entry.id);
  }
  console.log(`${allEntries.length} ta so'z yuklandi, ${entryMap.size} ta noyob harakatsiz shakl\n`);
  
  const dataDir = path.join(process.cwd(), "arabic_wordnet_data");
  const csvFiles = [
    "1. Nouns - resulting dataset.csv",
    "3. Verbs - resulting dataset.csv",
    "5. Adjectives - resulting dataset.csv",
    "7. Adverbs - resulting dataset.csv",
  ];
  
  let totalGroups = 0;
  let totalSynonymsAdded = 0;
  let totalMatches = 0;
  const addedPairs = new Set<string>();
  
  for (const csvFile of csvFiles) {
    const filePath = path.join(dataDir, csvFile);
    if (!fs.existsSync(filePath)) continue;
    
    console.log(`O'qilmoqda: ${csvFile}`);
    const groups = parseCSV(filePath);
    totalGroups += groups.length;
    
    for (const group of groups) {
      // Barcha mos ID larni topish
      const matchedIds: number[] = [];
      for (const lemma of group.arabicLemmas) {
        const ids = entryMap.get(lemma);
        if (ids) {
          matchedIds.push(...ids);
        }
      }
      
      // Noyob ID lar
      const uniqueIds = [...new Set(matchedIds)];
      
      if (uniqueIds.length >= 2) {
        totalMatches++;
        
        for (let i = 0; i < uniqueIds.length; i++) {
          for (let j = i + 1; j < uniqueIds.length; j++) {
            const pairKey = `${Math.min(uniqueIds[i], uniqueIds[j])}-${Math.max(uniqueIds[i], uniqueIds[j])}`;
            if (!addedPairs.has(pairKey)) {
              addedPairs.add(pairKey);
              try {
                await db.insert(synonyms)
                  .values({ entryId: uniqueIds[i], synonymEntryId: uniqueIds[j] })
                  .onConflictDoNothing();
                totalSynonymsAdded++;
              } catch (e) {}
            }
          }
        }
      }
    }
    console.log(`  ${groups.length} ta guruh, hozircha ${totalMatches} ta mos`);
  }
  
  console.log("\n=== Natija ===");
  console.log(`Jami synset guruhlari: ${totalGroups}`);
  console.log(`Bazada topilgan guruhlar: ${totalMatches}`);
  console.log(`Yangi sinonim bog'lanishlar: ${totalSynonymsAdded}`);
}

importSynonyms()
  .then(() => {
    console.log("\nImport tugadi!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Xatolik:", error);
    process.exit(1);
  });
