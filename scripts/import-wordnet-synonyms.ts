import { db } from "../server/db";
import { dictionaryEntries, synonyms } from "../shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface SynsetGroup {
  synsetId: string;
  arabicLemmas: string[];
}

function parseCSV(filePath: string): SynsetGroup[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").slice(1); // Skip header
  const groups: SynsetGroup[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // CSV parsing - handle quoted fields
    const parts = line.split(",");
    const synsetId = parts[0];
    const arabicLemmasField = parts[4] || ""; // Arabic lemmas column
    
    if (!arabicLemmasField || arabicLemmasField.trim() === "") continue;
    
    // Split Arabic lemmas by comma or space
    const arabicLemmas = arabicLemmasField
      .split(/[,،\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0 && /[\u0600-\u06FF]/.test(w)); // Only Arabic words
    
    if (arabicLemmas.length >= 2) {
      groups.push({ synsetId, arabicLemmas });
    }
  }
  
  return groups;
}

async function importSynonyms() {
  console.log("Arabic WordNet sinonimlarni import qilish...\n");
  
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
  
  for (const csvFile of csvFiles) {
    const filePath = path.join(dataDir, csvFile);
    if (!fs.existsSync(filePath)) {
      console.log(`Fayl topilmadi: ${csvFile}`);
      continue;
    }
    
    console.log(`O'qilmoqda: ${csvFile}`);
    const groups = parseCSV(filePath);
    totalGroups += groups.length;
    console.log(`  ${groups.length} ta sinonim guruhi topildi`);
    
    for (const group of groups) {
      // Bazadan mos so'zlarni qidirish
      const matchedEntries = await db.select({ id: dictionaryEntries.id, arabic: dictionaryEntries.arabic })
        .from(dictionaryEntries)
        .where(
          sql`${dictionaryEntries.arabic} IN (${sql.join(group.arabicLemmas.map(w => sql`${w}`), sql`, `)})`
        )
        .limit(20);
      
      if (matchedEntries.length >= 2) {
        totalMatches++;
        
        // Har bir juftlik uchun sinonim qo'shish
        for (let i = 0; i < matchedEntries.length; i++) {
          for (let j = i + 1; j < matchedEntries.length; j++) {
            try {
              await db.insert(synonyms)
                .values({ entryId: matchedEntries[i].id, synonymEntryId: matchedEntries[j].id })
                .onConflictDoNothing();
              totalSynonymsAdded++;
            } catch (e) {
              // Duplicate - skip
            }
          }
        }
      }
    }
  }
  
  console.log("\n=== Natija ===");
  console.log(`Jami synset guruhlari: ${totalGroups}`);
  console.log(`Bazada topilgan guruhlar: ${totalMatches}`);
  console.log(`Qo'shilgan sinonim bog'lanishlar: ${totalSynonymsAdded}`);
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
