import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDictionaryEntrySchema, updateDictionaryEntrySchema } from "@shared/schema";
import { translateArabicToUzbek, batchTranslate } from "./ai";
import * as XLSX from 'xlsx';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all dictionary entries (with optional search)
  app.get("/api/dictionary", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const entries = await storage.getDictionaryEntries(search);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching dictionary entries:", error);
      res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
    }
  });

  // Get single dictionary entry
  app.get("/api/dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getDictionaryEntry(id);
      if (!entry) {
        return res.status(404).json({ error: "So'z topilmadi" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error fetching dictionary entry:", error);
      res.status(500).json({ error: "Ma'lumotni olishda xatolik" });
    }
  });

  // Create dictionary entry
  app.post("/api/dictionary", async (req, res) => {
    try {
      const validatedData = insertDictionaryEntrySchema.parse(req.body);
      const entry = await storage.createDictionaryEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating dictionary entry:", error);
      res.status(400).json({ error: "Ma'lumotni saqlashda xatolik" });
    }
  });

  // Update dictionary entry
  app.patch("/api/dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateDictionaryEntrySchema.parse(req.body);
      const entry = await storage.updateDictionaryEntry(id, validatedData);
      if (!entry) {
        return res.status(404).json({ error: "So'z topilmadi" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating dictionary entry:", error);
      res.status(400).json({ error: "Ma'lumotni yangilashda xatolik" });
    }
  });

  // Delete dictionary entry
  app.delete("/api/dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDictionaryEntry(id);
      if (!success) {
        return res.status(404).json({ error: "So'z topilmadi" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dictionary entry:", error);
      res.status(500).json({ error: "Ma'lumotni o'chirishda xatolik" });
    }
  });

  // Batch import from Excel
  app.post("/api/dictionary/import", async (req, res) => {
    try {
      const { entries } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "Ma'lumotlar yuborilmadi" });
      }

      const validatedEntries = entries.map(entry => {
        return insertDictionaryEntrySchema.parse({
          arabic: entry.word || entry.arabic,
          arabicDefinition: entry.meaning || entry.arabicDefinition,
          uzbek: entry.uzbek || "",
          transliteration: entry.transliteration || "",
          type: entry.type || "aniqlanmagan",
          root: entry.root || "",
          examplesJson: entry.examplesJson || null,
        });
      });

      const created = await storage.batchCreateDictionaryEntries(validatedEntries);
      res.status(201).json({ 
        count: created.length,
        entries: created 
      });
    } catch (error) {
      console.error("Error importing entries:", error);
      res.status(400).json({ error: "Import xatolik berdi" });
    }
  });

  // AI Translation - Single entry
  app.post("/api/dictionary/:id/translate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getDictionaryEntry(id);
      
      if (!entry) {
        return res.status(404).json({ error: "So'z topilmadi" });
      }

      if (entry.uzbek && entry.uzbek.length > 0) {
        return res.status(400).json({ error: "So'z allaqachon tarjima qilingan" });
      }

      const translation = await translateArabicToUzbek(entry.arabic, entry.arabicDefinition || undefined);
      const updated = await storage.updateEntryTranslation(id, translation);

      res.json(updated);
    } catch (error) {
      console.error("Error translating entry:", error);
      res.status(500).json({ error: "Tarjima xatolik berdi" });
    }
  });

  // AI Translation - Batch (all untranslated)
  app.post("/api/dictionary/batch-translate", async (req, res) => {
    try {
      const untranslated = await storage.getUntranslatedEntries();
      
      if (untranslated.length === 0) {
        return res.json({ 
          message: "Tarjima qilinmagan so'zlar yo'q",
          count: 0 
        });
      }

      // Prepare entries for translation
      const entriesToTranslate = untranslated.map(entry => ({
        id: entry.id,
        arabic: entry.arabic,
        arabicDefinition: entry.arabicDefinition || undefined,
      }));

      // Translate in batches
      const translations = await batchTranslate(entriesToTranslate);

      // Update database
      const updatePromises = translations.map(({ id, translation }) => 
        storage.updateEntryTranslation(id, translation)
      );

      await Promise.all(updatePromises);

      res.json({ 
        message: "Tarjima muvaffaqiyatli yakunlandi",
        count: translations.length 
      });
    } catch (error) {
      console.error("Error in batch translation:", error);
      res.status(500).json({ error: "Batch tarjima xatolik berdi" });
    }
  });

  // Get statistics
  app.get("/api/dictionary/stats", async (req, res) => {
    try {
      const allEntries = await storage.getDictionaryEntries();
      const untranslated = await storage.getUntranslatedEntries();
      
      res.json({
        total: allEntries.length,
        translated: allEntries.length - untranslated.length,
        pending: untranslated.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Statistika xatolik berdi" });
    }
  });

  return httpServer;
}
