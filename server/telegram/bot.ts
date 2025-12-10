import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { storage } from '../storage';
import type { DictionaryEntry } from '@shared/schema';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: Telegraf | null = null;

function formatEntry(entry: DictionaryEntry): string {
  const lines: string[] = [];
  
  lines.push(`📖 *${escapeMarkdown(entry.arabic)}*`);
  
  if (entry.transliteration) {
    lines.push(`🔤 _${escapeMarkdown(entry.transliteration)}_`);
  }
  
  if (entry.wordType) {
    lines.push(`📝 ${escapeMarkdown(entry.wordType)}`);
  }
  
  if (entry.uzbek) {
    lines.push(`\n🇺🇿 *Tarjima:*\n${escapeMarkdown(entry.uzbek)}`);
  }
  
  if (entry.meaningsJson) {
    try {
      const meanings = JSON.parse(entry.meaningsJson);
      if (Array.isArray(meanings) && meanings.length > 0) {
        lines.push(`\n📚 *Ma'nolar:*`);
        meanings.slice(0, 5).forEach((m: any, i: number) => {
          if (m.meaning) {
            lines.push(`${i + 1}. ${escapeMarkdown(m.meaning)}`);
            if (m.examples && m.examples.length > 0) {
              const ex = m.examples[0];
              if (ex.arabic && ex.uzbek) {
                lines.push(`   _${escapeMarkdown(ex.arabic)}_`);
                lines.push(`   → ${escapeMarkdown(ex.uzbek)}`);
              }
            }
          }
        });
      }
    } catch (e) {}
  }
  
  lines.push(`\n📕 _${escapeMarkdown(entry.dictionarySource)} lug'ati_`);
  
  return lines.join('\n');
}

function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function formatShortEntry(entry: DictionaryEntry, index: number): string {
  const uzbekShort = entry.uzbek ? entry.uzbek.substring(0, 100) : 'Tarjima mavjud emas';
  return `${index + 1}. *${escapeMarkdown(entry.arabic)}* — ${escapeMarkdown(uzbekShort)}${entry.uzbek && entry.uzbek.length > 100 ? '...' : ''}`;
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
      const welcomeMessage = `
🌙 *Assalomu alaykum!*

*QOMUS\\.UZ* \\- Arabcha\\-O'zbekcha lug'at botiga xush kelibsiz\\!

📚 *Mavjud lug'atlar:*
• G'oniy \\(الغني\\) \\- 29,682 so'z
• Roid \\(الرائد\\) \\- 46,931 so'z  
• Muasir \\- 32,292 so'z

🔍 *Qanday foydalanish:*
So'z yozing va men sizga tarjimasini topib beraman\\!

_Misol: كتب yoki kitob_

/help \\- Yordam olish
`;
      await ctx.replyWithMarkdownV2(welcomeMessage);
    });

    bot.command('help', async (ctx) => {
      const helpMessage = `
📖 *Yordam*

🔍 *Qidiruv:*
Istalgan arabcha yoki o'zbekcha so'zni yozing

📝 *Misollar:*
• كتاب \\- arabcha so'z
• kitob \\- o'zbekcha so'z
• كتب \\- ildiz so'z

💡 *Maslahatlar:*
• Harakatlar bilan ham, harakatsiz ham qidirsa bo'ladi
• Qisqa so'zlar aniqroq natija beradi

🌐 *Veb\\-sayt:* qomus\\.uz
`;
      await ctx.replyWithMarkdownV2(helpMessage);
    });

    bot.command('stats', async (ctx) => {
      try {
        const sources = await storage.getDictionarySources();
        let total = 0;
        let statsText = "📊 *Lug'at statistikasi:*\\n\\n";
        
        for (const source of sources) {
          statsText += `📕 ${escapeMarkdown(source.source)}: ${source.count.toLocaleString()} so\\'z\\n`;
          total += source.count;
        }
        
        statsText += `\\n📚 *Jami:* ${total.toLocaleString()} so\\'z`;
        
        await ctx.replyWithMarkdownV2(statsText);
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

        if (entries.length === 1) {
          await ctx.replyWithMarkdownV2(formatEntry(entries[0]));
        } else {
          let response = `🔍 *"${escapeMarkdown(query)}" bo'yicha ${entries.length} ta natija:*\n\n`;
          
          entries.slice(0, 10).forEach((entry, i) => {
            response += formatShortEntry(entry, i) + '\n\n';
          });
          
          if (entries.length > 10) {
            response += `\n_\\.\\.\\. va yana ${entries.length - 10} ta natija_\n`;
            response += `\n🌐 To'liq ro'yxat uchun: qomus\\.uz`;
          }
          
          await ctx.replyWithMarkdownV2(response);
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
