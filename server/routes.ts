import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDictionaryEntrySchema, updateDictionaryEntrySchema } from "@shared/schema";
import { translateArabicToUzbek, batchTranslate, batchProcessRoidEntries, batchProcessGhoniyEntries } from "./ai";
import * as XLSX from 'xlsx';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get statistics (MUST be before /:id route)
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

  // Get dictionary sources with counts
  app.get("/api/dictionary/sources", async (req, res) => {
    try {
      const sources = await storage.getDictionarySources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      res.status(500).json({ error: "Lug'atlar ro'yxatini olishda xatolik" });
    }
  });

  // Get all dictionary entries (with optional search and source filter)
  app.get("/api/dictionary", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const sourcesParam = req.query.sources as string | undefined;
      const sources = sourcesParam ? sourcesParam.split(',') : undefined;
      
      // Debug logging
      console.log(`[Search] query="${search}", sources=${JSON.stringify(sources)}`);
      
      const entries = await storage.getDictionaryEntries(search, sources);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching dictionary entries:", error);
      res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
    }
  });

  // Get related words by root
  app.get("/api/dictionary/related/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Noto'g'ri ID" });
      }
      const entry = await storage.getDictionaryEntry(id);
      if (!entry) {
        return res.status(404).json({ error: "So'z topilmadi" });
      }
      const relatedWords = await storage.getRelatedWords(entry.arabic, id);
      res.json(relatedWords);
    } catch (error) {
      console.error("Error fetching related words:", error);
      res.status(500).json({ error: "O'xshash so'zlarni olishda xatolik" });
    }
  });

  // Get single dictionary entry
  app.get("/api/dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Noto'g'ri ID" });
      }
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
      const { entries, dictionarySource = "Muasir" } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "Ma'lumotlar yuborilmadi" });
      }

      // Map user's template columns: word, complement, root, meaning
      const validatedEntries = entries.map(entry => {
        return insertDictionaryEntrySchema.parse({
          arabic: entry.word || entry.arabic || "",
          arabicDefinition: entry.meaning || entry.arabicDefinition || "",
          uzbek: entry.uzbek || "",
          transliteration: entry.transliteration || "",
          type: entry.complement || entry.type || "aniqlanmagan",
          root: entry.root || "",
          examplesJson: entry.examplesJson || null,
          dictionarySource: dictionarySource,
        });
      });

      const created = await storage.batchCreateDictionaryEntries(validatedEntries);
      res.status(201).json({ 
        count: created.length,
        entries: created,
        dictionarySource: dictionarySource
      });
    } catch (error) {
      console.error("Error importing entries:", error);
      res.status(400).json({ error: "Import xatolik berdi" });
    }
  });

  // AI Translation - Batch (MUST be before /:id route)
  app.post("/api/dictionary/batch-translate", async (req, res) => {
    try {
      console.log("Starting batch translation...");
      const untranslated = await storage.getUntranslatedEntries();
      
      if (untranslated.length === 0) {
        return res.json({ 
          message: "Tarjima qilinmagan so'zlar yo'q",
          count: 0 
        });
      }

      // Allow up to 1000 entries per batch
      const BATCH_LIMIT = req.body.limit || 1000;
      const limitedEntries = untranslated.slice(0, Math.min(BATCH_LIMIT, 1000));
      console.log(`Processing ${limitedEntries.length} of ${untranslated.length} entries`);

      // Prepare entries for translation
      const entriesToTranslate = limitedEntries.map(entry => ({
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
        count: translations.length,
        remaining: untranslated.length - translations.length
      });
    } catch (error) {
      console.error("Error in batch translation:", error);
      res.status(500).json({ error: "Batch tarjima xatolik berdi" });
    }
  });

  // Continuous batch translation - runs multiple batches
  app.post("/api/dictionary/continuous-translate", async (req, res) => {
    try {
      const maxBatches = req.body.maxBatches || 50;
      const batchSize = req.body.batchSize || 50;
      let totalTranslated = 0;
      let batchCount = 0;
      
      console.log(`Starting continuous translation: max ${maxBatches} batches of ${batchSize} words`);
      
      for (let i = 0; i < maxBatches; i++) {
        const untranslated = await storage.getUntranslatedEntries();
        
        if (untranslated.length === 0) {
          console.log("All words translated!");
          break;
        }
        
        const limitedEntries = untranslated.slice(0, batchSize);
        const entriesToTranslate = limitedEntries.map(entry => ({
          id: entry.id,
          arabic: entry.arabic,
          arabicDefinition: entry.arabicDefinition || undefined,
        }));
        
        const translations = await batchTranslate(entriesToTranslate);
        
        const updatePromises = translations.map(({ id, translation }) => 
          storage.updateEntryTranslation(id, translation)
        );
        await Promise.all(updatePromises);
        
        const successCount = translations.filter(t => t.translation && t.translation.length > 0).length;
        totalTranslated += successCount;
        batchCount++;
        
        console.log(`Batch ${batchCount}/${maxBatches}: ${successCount} translated, ${untranslated.length - batchSize} remaining`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const remaining = await storage.getUntranslatedEntries();
      
      res.json({
        message: "Uzluksiz tarjima yakunlandi",
        batchesCompleted: batchCount,
        totalTranslated,
        remaining: remaining.length
      });
    } catch (error) {
      console.error("Error in continuous translation:", error);
      res.status(500).json({ error: "Uzluksiz tarjima xatolik berdi" });
    }
  });

  // AI Translation - Single entry
  app.post("/api/dictionary/:id/translate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Noto'g'ri ID" });
      }
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

  // Test: Process Roid entries with vocalization and translation
  app.post("/api/dictionary/process-roid-test", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Get Roid entries that don't have uzbek translation yet
      const allEntries = await storage.getRoidEntriesForProcessing(limit);
      
      if (allEntries.length === 0) {
        return res.json({
          message: "Qayta ishlash uchun Roid so'zlari topilmadi",
          processed: 0,
        });
      }
      
      console.log(`Processing ${allEntries.length} Roid entries...`);
      
      const { results, summary } = await batchProcessRoidEntries(
        allEntries.map(e => ({
          id: e.id,
          arabic: e.arabic,
          arabicDefinition: e.arabicDefinition || undefined,
        })),
        (current, total, result) => {
          console.log(`[${current}/${total}] ${result.success ? '✓' : '✗'} ${result.arabicVocalized} → ${result.uzbekTranslation}`);
        }
      );
      
      // Save results to database
      let savedCount = 0;
      for (const result of results) {
        if (result.success) {
          await storage.updateRoidProcessedEntry(
            result.id,
            result.arabicVocalized,
            result.arabicDefinitionVocalized,
            result.uzbekTranslation
          );
          savedCount++;
        }
      }
      
      res.json({
        message: "Roid so'zlari qayta ishlandi",
        summary: {
          ...summary,
          saved: savedCount,
          totalTimeFormatted: `${(summary.totalTime / 1000).toFixed(1)} soniya`,
          estimatedCostFormatted: `$${summary.estimatedCost.toFixed(4)}`,
        },
        sampleResults: results.slice(0, 10).map(r => ({
          id: r.id,
          arabic: r.arabicVocalized,
          uzbek: r.uzbekTranslation,
          success: r.success,
        })),
      });
    } catch (error) {
      console.error("Error processing Roid entries:", error);
      res.status(500).json({ error: "Roid so'zlarini qayta ishlashda xatolik" });
    }
  });

  // Process Ghoniy entries with structured meanings extraction
  app.post("/api/dictionary/process-ghoniy", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get Ghoniy entries that don't have uzbek translation yet
      const allEntries = await storage.getGhoniyEntriesForProcessing(limit);
      
      if (allEntries.length === 0) {
        return res.json({
          message: "Tarjima qilish uchun G'oniy so'zlari topilmadi",
          processed: 0,
        });
      }
      
      console.log(`Processing ${allEntries.length} Ghoniy entries...`);
      
      const { results, summary } = await batchProcessGhoniyEntries(
        allEntries.map(e => ({
          id: e.id,
          arabic: e.arabic,
          arabicDefinition: e.arabicDefinition || undefined,
          type: e.type || undefined,
        })),
        (current, total, result) => {
          console.log(`[${current}/${total}] ${result.success ? '✓' : '✗'} ${result.uzbekSummary} (${result.meanings.length} ma'no)`);
        }
      );
      
      // Save results to database
      let savedCount = 0;
      for (const result of results) {
        if (result.success && result.meanings.length > 0) {
          await storage.updateGhoniyProcessedEntry(
            result.id,
            result.uzbekSummary,
            JSON.stringify(result.meanings),
            result.wordType
          );
          savedCount++;
        }
      }
      
      res.json({
        message: "G'oniy so'zlari tarjima qilindi",
        summary: {
          ...summary,
          saved: savedCount,
          totalTimeFormatted: `${(summary.totalTime / 1000).toFixed(1)} soniya`,
          estimatedCostFormatted: `$${summary.estimatedCost.toFixed(4)}`,
        },
        sampleResults: results.slice(0, 10).map(r => ({
          id: r.id,
          wordType: r.wordType,
          uzbekSummary: r.uzbekSummary,
          meanings: r.meanings,
          success: r.success,
          error: r.error,
        })),
      });
    } catch (error) {
      console.error("Error processing Ghoniy entries:", error);
      res.status(500).json({ error: "G'oniy so'zlarini tarjima qilishda xatolik" });
    }
  });

  return httpServer;
}
