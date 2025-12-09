import { 
  type User, 
  type InsertUser,
  type DictionaryEntry,
  type InsertDictionaryEntry,
  type UpdateDictionaryEntry,
  users,
  dictionaryEntries
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Dictionary methods
  getDictionaryEntries(search?: string): Promise<DictionaryEntry[]>;
  getDictionaryEntry(id: number): Promise<DictionaryEntry | undefined>;
  getRelatedWords(arabicWord: string, excludeId?: number): Promise<DictionaryEntry[]>;
  createDictionaryEntry(entry: InsertDictionaryEntry): Promise<DictionaryEntry>;
  updateDictionaryEntry(id: number, entry: UpdateDictionaryEntry): Promise<DictionaryEntry | undefined>;
  deleteDictionaryEntry(id: number): Promise<boolean>;
  batchCreateDictionaryEntries(entries: InsertDictionaryEntry[]): Promise<DictionaryEntry[]>;
  getUntranslatedEntries(): Promise<DictionaryEntry[]>;
  updateEntryTranslation(id: number, uzbek: string): Promise<DictionaryEntry | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Dictionary methods
  async getDictionaryEntries(search?: string): Promise<DictionaryEntry[]> {
    if (search) {
      const normalizedSearch = this.stripArabicDiacritics(search);
      return await db.select().from(dictionaryEntries).where(
        or(
          sql`regexp_replace(${dictionaryEntries.arabic}, '[\u064B-\u0652\u0670\u0671]', '', 'g') ILIKE ${'%' + normalizedSearch + '%'}`,
          ilike(dictionaryEntries.uzbek, `%${search}%`),
          ilike(dictionaryEntries.transliteration, `%${search}%`)
        )
      ).orderBy(dictionaryEntries.createdAt);
    }
    return await db.select().from(dictionaryEntries).orderBy(dictionaryEntries.createdAt);
  }

  private stripArabicDiacritics(text: string): string {
    return text.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
  }

  async getDictionaryEntry(id: number): Promise<DictionaryEntry | undefined> {
    const result = await db.select().from(dictionaryEntries).where(eq(dictionaryEntries.id, id)).limit(1);
    return result[0];
  }

  async getRelatedWords(arabicWord: string, excludeId?: number): Promise<DictionaryEntry[]> {
    const rootLetters = this.extractArabicRoot(arabicWord);
    if (rootLetters.length < 2) return [];
    
    const pattern = rootLetters.join('');
    
    let query = db.select().from(dictionaryEntries).where(
      sql`regexp_replace(${dictionaryEntries.arabic}, '[\u064B-\u0652\u0670\u0671]', '', 'g') ~ ${pattern}`
    );
    
    const results = await query.limit(30);
    
    if (excludeId) {
      return results.filter(r => r.id !== excludeId).slice(0, 15);
    }
    return results.slice(0, 15);
  }

  private extractArabicRoot(word: string): string[] {
    const stripped = word.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
    
    const prefixPatterns = ['استكـ', 'است', 'ان', 'مست', 'مت', 'م', 'ت', 'ا'];
    const suffixPatterns = ['ات', 'ون', 'ين', 'ة', 'ان', 'ية'];
    
    let root = stripped;
    
    for (const prefix of prefixPatterns) {
      if (root.startsWith(prefix) && root.length > prefix.length + 2) {
        root = root.slice(prefix.length);
        break;
      }
    }
    
    for (const suffix of suffixPatterns) {
      if (root.endsWith(suffix) && root.length > suffix.length + 2) {
        root = root.slice(0, -suffix.length);
        break;
      }
    }
    
    const letters = root.split('');
    if (letters.length >= 3) {
      return letters.slice(0, 3);
    }
    return letters;
  }

  async createDictionaryEntry(entry: InsertDictionaryEntry): Promise<DictionaryEntry> {
    const result = await db.insert(dictionaryEntries).values(entry).returning();
    return result[0];
  }

  async updateDictionaryEntry(id: number, entry: UpdateDictionaryEntry): Promise<DictionaryEntry | undefined> {
    const result = await db.update(dictionaryEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(dictionaryEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteDictionaryEntry(id: number): Promise<boolean> {
    const result = await db.delete(dictionaryEntries).where(eq(dictionaryEntries.id, id)).returning();
    return result.length > 0;
  }

  async batchCreateDictionaryEntries(entries: InsertDictionaryEntry[]): Promise<DictionaryEntry[]> {
    if (entries.length === 0) return [];
    
    // Insert in batches of 100 to avoid stack overflow
    const BATCH_SIZE = 100;
    const allResults: DictionaryEntry[] = [];
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const result = await db.insert(dictionaryEntries).values(batch).returning();
      allResults.push(...result);
    }
    
    return allResults;
  }

  async getUntranslatedEntries(): Promise<DictionaryEntry[]> {
    return await db.select().from(dictionaryEntries).where(
      or(
        eq(dictionaryEntries.uzbek, ''),
        sql`${dictionaryEntries.uzbek} IS NULL`
      )
    ).orderBy(dictionaryEntries.createdAt);
  }

  async updateEntryTranslation(id: number, uzbek: string): Promise<DictionaryEntry | undefined> {
    const result = await db.update(dictionaryEntries)
      .set({ uzbek, updatedAt: new Date() })
      .where(eq(dictionaryEntries.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
