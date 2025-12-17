import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDictionaryEntrySchema, updateDictionaryEntrySchema } from "@shared/schema";
import { translateArabicToUzbek, batchTranslate, batchProcessRoidEntries, batchProcessGhoniyEntries } from "./ai";
import { sendMessageToUser, sendBroadcast } from "./telegram/bot";
import * as XLSX from 'xlsx';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint - Railway avtomatik restart qiladi agar ishlamasa
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin login - requires environment variables (no default credentials)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminUsername || !adminPassword) {
        res.status(500).json({ error: 'Admin sozlanmagan' });
        return;
      }
      
      if (username === adminUsername && password === adminPassword) {
        res.json({ success: true, role: 'admin' });
      } else {
        res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Server xatosi' });
    }
  });

  // Get statistics (MUST be before /:id route)
  app.get("/api/dictionary/stats", async (req, res) => {
    try {
      const sources = await storage.getDictionarySources();
      const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
      const untranslated = await storage.getUntranslatedEntries();
      
      res.json({
        total: totalCount,
        translated: totalCount - untranslated.length,
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

  // Export dictionary for offline use (chunked)
  app.get("/api/dictionary/export", async (req, res) => {
    try {
      const source = req.query.source as string || 'Ghoniy';
      const lastId = parseInt(req.query.lastId as string) || 0;
      const limit = 1000;
      
      const entries = await storage.getEntriesForExport(source, lastId, limit);
      const hasMore = entries.length === limit;
      const nextLastId = hasMore && entries.length > 0 ? entries[entries.length - 1].id : null;
      
      const sources = await storage.getDictionarySources();
      const totalCount = sources.find(s => s.source === source)?.count || 0;
      
      res.json({
        entries,
        nextLastId,
        hasMore,
        totalCount
      });
    } catch (error) {
      console.error("Error exporting dictionary:", error);
      res.status(500).json({ error: "Eksport xatolik berdi" });
    }
  });

  // Get recently translated entries
  app.get("/api/dictionary/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const entries = await storage.getRecentlyTranslated(limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching recent entries:", error);
      res.status(500).json({ error: "So'nggi tarjimalarni olishda xatolik" });
    }
  });

  // Get all dictionary entries (with optional search and source filter)
  app.get("/api/dictionary", async (req, res) => {
    try {
      const rawSearch = req.query.search as string | undefined;
      const search = rawSearch?.trim(); // Bo'sh joylarni olib tashlash
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

  // Get synonyms for a dictionary entry - sinonimlar olish
  app.get("/api/dictionary/:id/synonyms", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Noto'g'ri ID" });
      }
      const synonyms = await storage.getSynonyms(id);
      res.json(synonyms);
    } catch (error) {
      console.error("Error fetching synonyms:", error);
      res.status(500).json({ error: "Sinonimlarni olishda xatolik" });
    }
  });

  // Add synonym - sinonim qo'shish
  app.post("/api/dictionary/:id/synonyms", async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const { synonymEntryId } = req.body;
      
      if (isNaN(entryId) || !synonymEntryId) {
        return res.status(400).json({ error: "Noto'g'ri ma'lumot" });
      }
      
      if (entryId === synonymEntryId) {
        return res.status(400).json({ error: "So'z o'ziga sinonim bo'la olmaydi" });
      }
      
      const synonym = await storage.addSynonym(entryId, synonymEntryId);
      res.status(201).json(synonym);
    } catch (error) {
      console.error("Error adding synonym:", error);
      res.status(500).json({ error: "Sinonim qo'shishda xatolik" });
    }
  });

  // Remove synonym - sinonimni o'chirish
  app.delete("/api/dictionary/:id/synonyms/:synonymId", async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const synonymEntryId = parseInt(req.params.synonymId);
      
      if (isNaN(entryId) || isNaN(synonymEntryId)) {
        return res.status(400).json({ error: "Noto'g'ri ID" });
      }
      
      await storage.removeSynonym(entryId, synonymEntryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing synonym:", error);
      res.status(500).json({ error: "Sinonimni o'chirishda xatolik" });
    }
  });

  // WordNet API - sinonim guruhlari qidirish
  app.get("/api/wordnet/search", async (req, res) => {
    try {
      const search = req.query.q as string;
      const posParam = req.query.pos as string | undefined;
      const posFilter = posParam ? posParam.split(',') : undefined;
      
      if (!search || search.trim().length < 2) {
        return res.json([]);
      }
      const results = await storage.searchWordnetSynsets(search.trim(), posFilter);
      res.json(results);
    } catch (error) {
      console.error("Error searching wordnet:", error);
      res.status(500).json({ error: "Qidiruvda xatolik" });
    }
  });

  // WordNet stats
  app.get("/api/wordnet/stats", async (req, res) => {
    try {
      const stats = await storage.getWordnetStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching wordnet stats:", error);
      res.status(500).json({ error: "Statistika olishda xatolik" });
    }
  });

  // Get single synset
  app.get("/api/wordnet/synset/:id", async (req, res) => {
    try {
      const synsetId = req.params.id;
      const result = await storage.getWordnetSynset(synsetId);
      if (!result) {
        return res.status(404).json({ error: "Synset topilmadi" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching synset:", error);
      res.status(500).json({ error: "Synset olishda xatolik" });
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
      const source = req.body.source || 'Ghoniy'; // Default faqat Ghoniy
      let totalTranslated = 0;
      let batchCount = 0;
      
      console.log(`Starting continuous translation for ${source}: max ${maxBatches} batches of ${batchSize} words`);
      
      for (let i = 0; i < maxBatches; i++) {
        const untranslated = await storage.getUntranslatedEntries(source);
        
        if (untranslated.length === 0) {
          console.log(`All ${source} words translated!`);
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
        
        console.log(`[${source}] Batch ${batchCount}/${maxBatches}: ${successCount} translated, ${untranslated.length - batchSize} remaining`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const remaining = await storage.getUntranslatedEntries(source);
      
      res.json({
        message: `${source} uzluksiz tarjima yakunlandi`,
        source,
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

  // ============ TELEGRAM API ROUTES ============
  
  // Get all telegram users
  app.get("/api/telegram/users", async (req, res) => {
    try {
      const users = await storage.getAllTelegramUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching telegram users:", error);
      res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik" });
    }
  });

  // Get telegram stats
  app.get("/api/telegram/stats", async (req, res) => {
    try {
      const allUsers = await storage.getAllTelegramUsers();
      const activeUsers = await storage.getActiveTelegramUsers();
      const messages = await storage.getContactMessages();
      const newMessages = messages.filter(m => m.status === 'new');
      
      res.json({
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        blockedUsers: allUsers.length - activeUsers.length,
        totalMessages: messages.length,
        newMessages: newMessages.length,
      });
    } catch (error) {
      console.error("Error fetching telegram stats:", error);
      res.status(500).json({ error: "Statistikani olishda xatolik" });
    }
  });

  // Get contact messages
  app.get("/api/telegram/messages", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const messages = await storage.getContactMessages(status);
      
      // Foydalanuvchi ma'lumotlarini ham qo'shish
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const user = await storage.getTelegramUser(msg.telegramId);
          return {
            ...msg,
            user: user ? {
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
            } : null,
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Xabarlarni olishda xatolik" });
    }
  });

  // Respond to a contact message
  app.post("/api/telegram/messages/:id/reply", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { response } = req.body;
      
      if (!response) {
        return res.status(400).json({ error: "Javob matni kerak" });
      }
      
      const message = await storage.getContactMessage(id);
      if (!message) {
        return res.status(404).json({ error: "Xabar topilmadi" });
      }
      
      // Telegram orqali javob yuborish
      const sent = await sendMessageToUser(
        message.telegramId,
        `📩 QOMUS.UZ dan javob:\n\n${response}`
      );
      
      if (!sent) {
        return res.status(500).json({ error: "Xabarni yuborib bo'lmadi (foydalanuvchi botni bloklagan bo'lishi mumkin)" });
      }
      
      // Bazada yangilash
      const updated = await storage.respondToContactMessage(id, response);
      
      res.json(updated);
    } catch (error) {
      console.error("Error responding to message:", error);
      res.status(500).json({ error: "Javob yuborishda xatolik" });
    }
  });

  // Update message status
  app.patch("/api/telegram/messages/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['new', 'in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({ error: "Noto'g'ri status" });
      }
      
      await storage.updateContactMessageStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(500).json({ error: "Statusni yangilashda xatolik" });
    }
  });

  // Send individual message to a user
  app.post("/api/telegram/users/:telegramId/message", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Xabar matni kerak" });
      }
      
      const user = await storage.getTelegramUser(telegramId);
      if (!user) {
        return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      }
      
      // Telegram orqali xabar yuborish
      const sent = await sendMessageToUser(
        telegramId,
        `📩 QOMUS.UZ dan xabar:\n\n${message}`
      );
      
      if (!sent) {
        return res.status(500).json({ error: "Xabarni yuborib bo'lmadi (foydalanuvchi botni bloklagan bo'lishi mumkin)" });
      }
      
      res.json({ success: true, message: "Xabar yuborildi" });
    } catch (error) {
      console.error("Error sending message to user:", error);
      res.status(500).json({ error: "Xabar yuborishda xatolik" });
    }
  });

  // Send broadcast
  app.post("/api/telegram/broadcast", async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Xabar matni kerak" });
      }
      
      const users = await storage.getActiveTelegramUsers();
      
      // Broadcast yaratish
      const broadcast = await storage.createBroadcast({
        content,
        totalUsers: users.length.toString(),
      });
      
      // Asinxron yuborish (hozircha sinxron)
      const result = await sendBroadcast(content);
      
      // Natijani yangilash
      await storage.updateBroadcastProgress(broadcast.id, result.sent, result.failed);
      await storage.completeBroadcast(broadcast.id, 'completed');
      
      res.json({
        success: true,
        broadcast: {
          id: broadcast.id,
          content,
          totalUsers: users.length,
          sent: result.sent,
          failed: result.failed,
        },
      });
    } catch (error) {
      console.error("Error sending broadcast:", error);
      res.status(500).json({ error: "Broadcast yuborishda xatolik" });
    }
  });

  // Get broadcast history
  app.get("/api/telegram/broadcasts", async (req, res) => {
    try {
      const broadcasts = await storage.getBroadcasts();
      res.json(broadcasts);
    } catch (error) {
      console.error("Error fetching broadcasts:", error);
      res.status(500).json({ error: "Broadcastlarni olishda xatolik" });
    }
  });

  return httpServer;
}
