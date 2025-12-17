import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
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
  meaningsJson: text("meanings_json"), // Strukturali ma'nolar: [{index, uzbekMeaning, arabicExample, uzbekExample}]
  wordType: text("word_type"), // So'z turi: masdar, ismu foil, fe'l, ot, sifat
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

// Telegram Users Table - bot foydalanuvchilari
export const telegramUsers = pgTable("telegram_users", {
  telegramId: text("telegram_id").primaryKey(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  isBlocked: text("is_blocked").default("false"),
  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({
  createdAt: true,
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;

// Contact Messages Table - murojaatlar
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  message: text("message").notNull(),
  status: text("status").default("new"), // new, in_progress, resolved
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// Broadcasts Table - e'lonlar
export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  status: text("status").default("pending"), // pending, sending, completed, failed
  totalUsers: text("total_users").default("0"),
  sentCount: text("sent_count").default("0"),
  failedCount: text("failed_count").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
});

export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

// Synonyms Table - sinonimlar (o'xshash ma'noli so'zlar)
export const synonyms = pgTable("synonyms", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(), // Asosiy so'z
  synonymEntryId: integer("synonym_entry_id").notNull(), // Sinonim so'z
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSynonymSchema = createInsertSchema(synonyms).omit({
  id: true,
  createdAt: true,
});

export type Synonym = typeof synonyms.$inferSelect;
export type InsertSynonym = z.infer<typeof insertSynonymSchema>;
