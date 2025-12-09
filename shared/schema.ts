import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Dictionary Entries Table
export const dictionaryEntries = pgTable("dictionary_entries", {
  id: serial("id").primaryKey(),
  arabic: text("arabic").notNull(),
  arabicVocalized: text("arabic_vocalized"), // Harakatli arabcha so'z
  arabicDefinition: text("arabic_definition"),
  arabicDefinitionVocalized: text("arabic_definition_vocalized"), // Harakatli arabcha ta'rif
  uzbek: text("uzbek"),
  transliteration: text("transliteration"),
  type: text("type").notNull().default("aniqlanmagan"),
  root: text("root"),
  examplesJson: text("examples_json"), // Store JSON string of examples
  dictionarySource: text("dictionary_source").notNull().default("Muasir"), // Lug'at nomi: Muasir, Roid, va boshqalar
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDictionaryEntrySchema = createInsertSchema(dictionaryEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDictionaryEntrySchema = createInsertSchema(dictionaryEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type DictionaryEntry = typeof dictionaryEntries.$inferSelect;
export type InsertDictionaryEntry = z.infer<typeof insertDictionaryEntrySchema>;
export type UpdateDictionaryEntry = z.infer<typeof updateDictionaryEntrySchema>;
