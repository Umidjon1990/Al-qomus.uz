import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { storage } from '../storage';
import type { DictionaryEntry } from '@shared/schema';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: Telegraf | null = null;

function formatEntry(entry: DictionaryEntry): string {
  const lines: string[] = [];
  
  lines.push(`📖 ${entry.arabic}`);
  
  if (entry.transliteration) {
    lines.push(`🔤 ${entry.transliteration}`);
  }
  
  if (entry.wordType) {
    lines.push(`📝 ${entry.wordType}`);
  }
  
  if (entry.uzbek) {
    lines.push(`\n🇺🇿 Tarjima:\n${entry.uzbek}`);
  }
  
  if (entry.meaningsJson) {
    try {
      const meanings = JSON.parse(entry.meaningsJson);
      if (Array.isArray(meanings) && meanings.length > 0) {
        lines.push(`\n📚 Ma'nolar:`);
        meanings.slice(0, 5).forEach((m: any, i: number) => {
          const meaning = m.uzbekMeaning || m.meaning || '';
          if (meaning) {
            lines.push(`${i + 1}. ${meaning}`);
          }
        });
      }
    } catch (e) {}
  }
  
  lines.push(`\n📕 ${entry.dictionarySource} lug'ati`);
  
  return lines.join('\n');
}

function formatShortEntry(entry: DictionaryEntry, index: number): string {
  const uzbekShort = entry.uzbek ? entry.uzbek.substring(0, 80) : 'Tarjima mavjud emas';
  return `${index + 1}. ${entry.arabic} — ${uzbekShort}${entry.uzbek && entry.uzbek.length > 80 ? '...' : ''}`;
}

function formatFullEntry(entry: DictionaryEntry, num: number): string {
  const lines: string[] = [];
  
  lines.push(`${num}. ${entry.arabic}`);
  
  if (entry.transliteration) {
    lines.push(`   🔤 ${entry.transliteration}`);
  }
  
  if (entry.wordType) {
    lines.push(`   📝 ${entry.wordType}`);
  }
  
  if (entry.uzbek) {
    lines.push(`   🇺🇿 ${entry.uzbek}`);
  }
  
  // Ma'nolar (meaningsJson dan)
  if (entry.meaningsJson) {
    try {
      const meanings = JSON.parse(entry.meaningsJson);
      if (Array.isArray(meanings) && meanings.length > 0) {
        meanings.slice(0, 3).forEach((m: any, i: number) => {
          const meaning = m.uzbekMeaning || m.meaning || '';
          if (meaning) {
            lines.push(`   ${i + 1}) ${meaning}`);
          }
        });
      }
    } catch (e) {}
  }
  
  return lines.join('\n');
}

export async function initTelegramBot(): Promise<Telegraf | null> {
  console.log('[Telegram] Bot ishga tushirilmoqda...');
  
  if (!BOT_TOKEN) {
    console.log('[Telegram] TELEGRAM_BOT_TOKEN topilmadi, bot ishga tushmaydi');
    return null;
  }

  console.log('[Telegram] Token topildi, ulanmoqda...');
  
  try {
    bot = new Telegraf(BOT_TOKEN);

    bot.command('start', async (ctx) => {
      const welcomeMessage = `🌙 Assalomu alaykum!

QOMUS.UZ - Arabcha-O'zbekcha lug'at botiga xush kelibsiz!

📚 Mavjud lug'atlar:
• G'oniy (الغني) - 29,682 so'z
• Roid (الرائد) - 46,931 so'z  
• Muasir - 32,292 so'z

🔍 Qanday foydalanish:
So'z yozing va men sizga tarjimasini topib beraman!

Misol: كتب yoki kitob

/help - Yordam olish`;
      await ctx.reply(welcomeMessage);
    });

    bot.command('help', async (ctx) => {
      const helpMessage = `📖 Yordam

🔍 Qidiruv:
Istalgan arabcha yoki o'zbekcha so'zni yozing

📝 Misollar:
• كتاب - arabcha so'z
• kitob - o'zbekcha so'z
• كتب - ildiz so'z

💡 Maslahatlar:
• Harakatlar bilan ham, harakatsiz ham qidirsa bo'ladi
• Qisqa so'zlar aniqroq natija beradi

🌐 Veb-sayt: qomus.uz`;
      await ctx.reply(helpMessage);
    });

    bot.command('stats', async (ctx) => {
      try {
        const sources = await storage.getDictionarySources();
        let total = 0;
        let statsText = "📊 Lug'at statistikasi:\n\n";
        
        for (const source of sources) {
          statsText += `📕 ${source.source}: ${source.count.toLocaleString()} so'z\n`;
          total += source.count;
        }
        
        statsText += `\n📚 Jami: ${total.toLocaleString()} so'z`;
        
        await ctx.reply(statsText);
      } catch (error) {
        await ctx.reply('Statistikani olishda xatolik yuz berdi');
      }
    });

    bot.on(message('text'), async (ctx) => {
      const query = ctx.message.text.trim();
      
      if (query.startsWith('/')) return;
      
      if (query.length < 2) {
        await ctx.reply('🔍 Kamida 2 ta belgi kiriting');
        return;
      }

      try {
        await ctx.sendChatAction('typing');
        
        const entries = await storage.getDictionaryEntries(query);
        
        if (entries.length === 0) {
          await ctx.reply(`😔 "${query}" bo'yicha hech narsa topilmadi.\n\nBoshqa so'z bilan urinib ko'ring.`);
          return;
        }

        // Lug'atlarga bo'lib guruhlaymiz
        const ghoniy = entries.filter(e => e.dictionarySource === 'Ghoniy');
        const roid = entries.filter(e => e.dictionarySource === 'Roid');
        const muasir = entries.filter(e => e.dictionarySource === 'Muasir');

        // Har bir lug'atdan alohida xabar yuboramiz
        let header = `🔍 "${query}" bo'yicha ${entries.length} ta natija topildi:\n`;
        header += `📗 G'oniy: ${ghoniy.length} | 📘 Roid: ${roid.length} | 📙 Muasir: ${muasir.length}`;
        await ctx.reply(header);

        // G'oniy lug'ati
        if (ghoniy.length > 0) {
          let msg = `\n📗 G'ONIY LUG'ATI (${ghoniy.length}):\n\n`;
          ghoniy.slice(0, 15).forEach((entry, i) => {
            msg += formatFullEntry(entry, i + 1) + '\n\n';
          });
          if (ghoniy.length > 15) {
            msg += `... va yana ${ghoniy.length - 15} ta natija`;
          }
          await ctx.reply(msg);
        }

        // Roid lug'ati
        if (roid.length > 0) {
          let msg = `\n📘 ROID LUG'ATI (${roid.length}):\n\n`;
          roid.slice(0, 15).forEach((entry, i) => {
            msg += formatFullEntry(entry, i + 1) + '\n\n';
          });
          if (roid.length > 15) {
            msg += `... va yana ${roid.length - 15} ta natija`;
          }
          await ctx.reply(msg);
        }

        // Muasir lug'ati
        if (muasir.length > 0) {
          let msg = `\n📙 MUASIR LUG'ATI (${muasir.length}):\n\n`;
          muasir.slice(0, 15).forEach((entry, i) => {
            msg += formatFullEntry(entry, i + 1) + '\n\n';
          });
          if (muasir.length > 15) {
            msg += `... va yana ${muasir.length - 15} ta natija`;
          }
          await ctx.reply(msg);
        }

      } catch (error) {
        console.error('[Telegram] Qidiruv xatosi:', error);
        await ctx.reply('Qidiruvda xatolik yuz berdi. Qaytadan urinib ko\'ring.');
      }
    });

    bot.catch((err, ctx) => {
      console.error('[Telegram] Bot xatosi:', err);
    });

    await bot.launch();
    console.log('[Telegram] Bot muvaffaqiyatli ishga tushdi (polling mode)');

    process.once('SIGINT', () => bot?.stop('SIGINT'));
    process.once('SIGTERM', () => bot?.stop('SIGTERM'));

    return bot;
  } catch (error) {
    console.error('[Telegram] Botni ishga tushirishda xatolik:', error);
    return null;
  }
}

export function getBot(): Telegraf | null {
  return bot;
}
