import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { storage } from '../storage';
import type { DictionaryEntry } from '@shared/schema';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';

let bot: Telegraf | null = null;

// Foydalanuvchi holati - murojaat kutish uchun
const userStates: Map<string, { state: string; timeout?: NodeJS.Timeout }> = new Map();

// Admin ekanligini tekshirish
function isAdmin(telegramId: string): boolean {
  return telegramId === ADMIN_TELEGRAM_ID;
}

// Adminga yangi xabar haqida bildirishnoma yuborish
async function notifyAdminNewMessage(message: string, fromUser: { firstName?: string; username?: string }) {
  if (!bot || !ADMIN_TELEGRAM_ID) return;
  
  try {
    const userName = fromUser.firstName || 'Noma\'lum';
    const userHandle = fromUser.username ? `(@${fromUser.username})` : '';
    
    await bot.telegram.sendMessage(
      ADMIN_TELEGRAM_ID,
      `🔔 Yangi murojaat!\n\n👤 ${userName} ${userHandle}\n\n💬 ${message}\n\n📥 /xabarlar - barcha murojaatlarni ko'rish`
    );
  } catch (error) {
    console.error('[Telegram] Admin bildirishnomasida xato:', error);
  }
}

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
  
  if (entry.meaningsJson) {
    try {
      const meanings = JSON.parse(entry.meaningsJson);
      if (Array.isArray(meanings) && meanings.length > 0) {
        lines.push(`   📚 Ma'nolar:`);
        meanings.slice(0, 4).forEach((m: any, i: number) => {
          const meaning = m.uzbekMeaning || m.meaning || '';
          if (meaning) {
            lines.push(`   ${i + 1}) ${meaning}`);
            if (m.arabicExample && m.uzbekExample) {
              lines.push(`      📖 ${m.arabicExample.substring(0, 100)}${m.arabicExample.length > 100 ? '...' : ''}`);
              lines.push(`      ➡️ ${m.uzbekExample.substring(0, 100)}${m.uzbekExample.length > 100 ? '...' : ''}`);
            }
          }
        });
      }
    } catch (e) {}
  }
  
  if (!entry.meaningsJson && entry.arabicDefinition) {
    const defShort = entry.arabicDefinition.substring(0, 200);
    lines.push(`   📜 ${defShort}${entry.arabicDefinition.length > 200 ? '...' : ''}`);
  }
  
  return lines.join('\n');
}

// Asosiy tugmalar
function getMainKeyboard() {
  return Markup.keyboard([
    ['🔍 Qidiruv', '✉️ Biz bilan aloqa'],
    ['📊 Statistika', 'ℹ️ Yordam']
  ]).resize();
}

// Admin tugmalari
function getAdminKeyboard() {
  return Markup.keyboard([
    ['📥 Yangi xabarlar', '👥 Foydalanuvchilar'],
    ['📤 Broadcast', '✉️ Xabar yuborish'],
    ['📊 Statistika', '🔙 Asosiy menyu']
  ]).resize();
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

    // /start - foydalanuvchini saqlash va tugmalar ko'rsatish
    bot.command('start', async (ctx) => {
      try {
        // Foydalanuvchini saqlash
        const user = ctx.from;
        await storage.upsertTelegramUser({
          telegramId: user.id.toString(),
          username: user.username || null,
          firstName: user.first_name || null,
          lastName: user.last_name || null,
          languageCode: user.language_code || null,
        });
        console.log(`[Telegram] Yangi foydalanuvchi: ${user.id} - ${user.first_name}`);
      } catch (e) {
        console.error('[Telegram] Foydalanuvchini saqlashda xato:', e);
      }

      const welcomeMessage = `🌙 Assalomu alaykum, ${ctx.from.first_name}!

QOMUS.UZ - Arabcha-O'zbekcha lug'at botiga xush kelibsiz!

📚 Mavjud lug'atlar:
• G'oniy (الغني) - 29,682 so'z
• Roid (الرائد) - 46,931 so'z  
• Muasir - 32,292 so'z

🔍 So'z qidirish uchun shunchaki yozing!

Tugmalardan foydalaning:`;

      // Admin uchun admin tugmalarini ko'rsatish
      const userId = ctx.from.id.toString();
      if (isAdmin(userId)) {
        await ctx.reply(welcomeMessage, getAdminKeyboard());
      } else {
        await ctx.reply(welcomeMessage, getMainKeyboard());
      }
    });

    // /help yoki ℹ️ Yordam tugmasi
    bot.hears('ℹ️ Yordam', async (ctx) => {
      await ctx.reply(`📖 Yordam

🔍 Qidiruv:
Istalgan arabcha yoki o'zbekcha so'zni yozing

📝 Misollar:
• كتاب - arabcha so'z
• kitob - o'zbekcha so'z
• كتب - ildiz so'z

💡 Maslahatlar:
• Harakatlar bilan ham, harakatsiz ham qidirsa bo'ladi
• Qisqa so'zlar aniqroq natija beradi

✉️ Murojaat:
"Biz bilan aloqa" tugmasini bosing

🌐 Veb-sayt: qomus.uz`, getMainKeyboard());
    });

    bot.command('help', async (ctx) => {
      await ctx.reply(`📖 Yordam

🔍 Qidiruv:
Istalgan arabcha yoki o'zbekcha so'zni yozing

📝 Misollar:
• كتاب - arabcha so'z
• kitob - o'zbekcha so'z

✉️ Murojaat:
"Biz bilan aloqa" tugmasini bosing

🌐 Veb-sayt: qomus.uz`, getMainKeyboard());
    });

    // ===== ADMIN KOMANDALARI =====
    
    // /xabarlar - yangi murojaatlarni ko'rish (faqat admin uchun)
    bot.command('xabarlar', async (ctx) => {
      const userId = ctx.from.id.toString();
      
      if (!isAdmin(userId)) {
        return; // Admin bo'lmasa javob bermaslik
      }
      
      try {
        const messages = await storage.getContactMessages('new');
        
        if (messages.length === 0) {
          await ctx.reply('✅ Yangi murojaatlar yo\'q!');
          return;
        }
        
        let text = `📥 Yangi murojaatlar (${messages.length} ta):\n\n`;
        
        for (const msg of messages.slice(0, 10)) {
          const user = await storage.getTelegramUser(msg.telegramId);
          const userName = user?.firstName || 'Noma\'lum';
          const userHandle = user?.username ? `@${user.username}` : '';
          const date = new Date(msg.createdAt).toLocaleDateString('uz-UZ');
          
          text += `👤 ${userName} ${userHandle}\n`;
          text += `💬 ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}\n`;
          text += `📅 ${date} | ID: ${msg.id}\n\n`;
        }
        
        if (messages.length > 10) {
          text += `... va yana ${messages.length - 10} ta xabar\n`;
        }
        
        text += `\n💡 Javob berish: /javob [ID] [matn]`;
        
        await ctx.reply(text);
      } catch (error) {
        console.error('[Telegram] Xabarlarni olishda xato:', error);
        await ctx.reply('Xatolik yuz berdi');
      }
    });

    // /javob [id] [matn] - xabarga javob berish
    bot.command('javob', async (ctx) => {
      const userId = ctx.from.id.toString();
      
      if (!isAdmin(userId)) {
        return;
      }
      
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 2) {
        await ctx.reply('❌ Format: /javob [ID] [matn]\n\nMisol: /javob 5 Rahmat, tez orada javob beramiz!');
        return;
      }
      
      const messageId = parseInt(args[0]);
      const response = args.slice(1).join(' ');
      
      if (isNaN(messageId)) {
        await ctx.reply('❌ Noto\'g\'ri ID');
        return;
      }
      
      try {
        const message = await storage.getContactMessage(messageId);
        if (!message) {
          await ctx.reply('❌ Xabar topilmadi');
          return;
        }
        
        // Foydalanuvchiga javob yuborish
        await bot!.telegram.sendMessage(
          message.telegramId,
          `📩 QOMUS.UZ dan javob:\n\n${response}`
        );
        
        // Bazada yangilash
        await storage.respondToContactMessage(messageId, response);
        
        await ctx.reply(`✅ Javob yuborildi!`);
      } catch (error) {
        console.error('[Telegram] Javob yuborishda xato:', error);
        await ctx.reply('❌ Xatolik yuz berdi');
      }
    });

    // /broadcast [matn] - barcha foydalanuvchilarga xabar
    bot.command('broadcast', async (ctx) => {
      const userId = ctx.from.id.toString();
      
      if (!isAdmin(userId)) {
        return;
      }
      
      const content = ctx.message.text.replace('/broadcast ', '').trim();
      
      if (!content || content === '/broadcast') {
        await ctx.reply('❌ Format: /broadcast [matn]\n\nMisol: /broadcast Yangi funksiya qo\'shildi!');
        return;
      }
      
      try {
        const users = await storage.getActiveTelegramUsers();
        await ctx.reply(`📤 ${users.length} ta foydalanuvchiga yuborilmoqda...`);
        
        let sent = 0;
        let failed = 0;
        
        for (const user of users) {
          try {
            await bot!.telegram.sendMessage(user.telegramId, content);
            sent++;
            // Rate limiting
            if (sent % 25 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (e) {
            failed++;
          }
        }
        
        await ctx.reply(`✅ Broadcast tugadi!\n\n📤 Yuborildi: ${sent}\n❌ Xato: ${failed}`);
      } catch (error) {
        console.error('[Telegram] Broadcast xatosi:', error);
        await ctx.reply('❌ Xatolik yuz berdi');
      }
    });

    // /admin - admin statistikasi
    bot.command('admin', async (ctx) => {
      const userId = ctx.from.id.toString();
      
      if (!isAdmin(userId)) {
        return;
      }
      
      try {
        const newMessages = await storage.getContactMessages('new');
        const allMessages = await storage.getContactMessages();
        const users = await storage.getAllTelegramUsers();
        const activeUsers = users.filter(u => u.isBlocked !== 'true');
        
        await ctx.reply(`🔐 Admin Panel

📥 Murojaatlar:
• Yangi: ${newMessages.length}
• Jami: ${allMessages.length}

👥 Foydalanuvchilar:
• Faol: ${activeUsers.length}
• Jami: ${users.length}

📋 Komandalar:
/xabarlar - yangi murojaatlar
/javob [ID] [matn] - javob berish
/broadcast [matn] - hammaga xabar`);
      } catch (error) {
        await ctx.reply('Xatolik yuz berdi');
      }
    });

    // ===== ADMIN TUGMALAR =====

    // 🔐 Admin panel tugmasi
    bot.hears('🔐 Admin', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      await ctx.reply('🔐 Admin paneliga xush kelibsiz!', getAdminKeyboard());
    });

    // 📥 Yangi xabarlar tugmasi
    bot.hears('📥 Yangi xabarlar', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      try {
        const messages = await storage.getContactMessages('new');
        
        if (messages.length === 0) {
          await ctx.reply('✅ Yangi murojaatlar yo\'q!', getAdminKeyboard());
          return;
        }
        
        let text = `📥 Yangi murojaatlar (${messages.length} ta):\n\n`;
        
        for (const msg of messages.slice(0, 10)) {
          const user = await storage.getTelegramUser(msg.telegramId);
          const userName = user?.firstName || 'Noma\'lum';
          const userHandle = user?.username ? `@${user.username}` : '';
          const date = new Date(msg.createdAt).toLocaleDateString('uz-UZ');
          
          text += `👤 ${userName} ${userHandle}\n`;
          text += `💬 ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}\n`;
          text += `📅 ${date} | ID: ${msg.id}\n`;
          text += `➡️ Javob: /javob ${msg.id} [matn]\n\n`;
        }
        
        if (messages.length > 10) {
          text += `... va yana ${messages.length - 10} ta xabar`;
        }
        
        await ctx.reply(text, getAdminKeyboard());
      } catch (error) {
        await ctx.reply('Xatolik yuz berdi', getAdminKeyboard());
      }
    });

    // 👥 Foydalanuvchilar tugmasi
    bot.hears('👥 Foydalanuvchilar', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      try {
        const users = await storage.getAllTelegramUsers();
        const activeUsers = users.filter(u => u.isBlocked !== 'true');
        
        let text = `👥 Foydalanuvchilar (${users.length} ta):\n\n`;
        text += `✅ Faol: ${activeUsers.length}\n`;
        text += `🚫 Bloklangan: ${users.length - activeUsers.length}\n\n`;
        text += `Oxirgi 10 ta:\n\n`;
        
        for (const user of users.slice(0, 10)) {
          const name = user.firstName || 'Noma\'lum';
          const handle = user.username ? `@${user.username}` : '';
          text += `• ${name} ${handle}\n  ID: ${user.telegramId}\n`;
        }
        
        text += `\n💡 Xabar yuborish:\n/xabar [ID] [matn]`;
        
        await ctx.reply(text, getAdminKeyboard());
      } catch (error) {
        await ctx.reply('Xatolik yuz berdi', getAdminKeyboard());
      }
    });

    // 📤 Broadcast tugmasi
    bot.hears('📤 Broadcast', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      const users = await storage.getActiveTelegramUsers();
      
      // Holatni saqlash
      const existingState = userStates.get(userId);
      if (existingState?.timeout) {
        clearTimeout(existingState.timeout);
      }
      
      const timeout = setTimeout(() => {
        userStates.delete(userId);
      }, 5 * 60 * 1000);
      
      userStates.set(userId, { state: 'awaiting_broadcast', timeout });
      
      await ctx.reply(`📤 Broadcast yuborish

${users.length} ta faol foydalanuvchiga xabar yuboriladi.

Xabar matnini yozing:`, Markup.keyboard([['❌ Bekor qilish']]).resize());
    });

    // ✉️ Xabar yuborish tugmasi
    bot.hears('✉️ Xabar yuborish', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      await ctx.reply(`✉️ Foydalanuvchiga xabar yuborish

Format: /xabar [Telegram ID] [matn]

Misol:
/xabar 123456789 Assalomu alaykum!

💡 ID larni ko'rish uchun "👥 Foydalanuvchilar" tugmasini bosing.`, getAdminKeyboard());
    });

    // 🔙 Asosiy menyu tugmasi
    bot.hears('🔙 Asosiy menyu', async (ctx) => {
      await ctx.reply('Asosiy menyuga qaytdingiz', getMainKeyboard());
    });

    // /xabar [id] [matn] - foydalanuvchiga xabar yuborish
    bot.command('xabar', async (ctx) => {
      const userId = ctx.from.id.toString();
      if (!isAdmin(userId)) return;
      
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 2) {
        await ctx.reply('❌ Format: /xabar [Telegram ID] [matn]\n\nMisol: /xabar 123456789 Assalomu alaykum!', getAdminKeyboard());
        return;
      }
      
      const targetId = args[0];
      const message = args.slice(1).join(' ');
      
      try {
        const user = await storage.getTelegramUser(targetId);
        if (!user) {
          await ctx.reply('❌ Foydalanuvchi topilmadi', getAdminKeyboard());
          return;
        }
        
        await bot!.telegram.sendMessage(targetId, `📩 QOMUS.UZ dan xabar:\n\n${message}`);
        
        await ctx.reply(`✅ Xabar yuborildi!\n\n👤 ${user.firstName || 'Noma\'lum'} ${user.username ? '@' + user.username : ''}`, getAdminKeyboard());
      } catch (error) {
        console.error('[Telegram] Xabar yuborishda xato:', error);
        await ctx.reply('❌ Xabar yuborib bo\'lmadi (foydalanuvchi botni bloklagan bo\'lishi mumkin)', getAdminKeyboard());
      }
    });

    // ===== ADMIN KOMANDALARI TUGADI =====

    // 📊 Statistika tugmasi
    bot.hears('📊 Statistika', async (ctx) => {
      try {
        const sources = await storage.getDictionarySources();
        const users = await storage.getAllTelegramUsers();
        let total = 0;
        let statsText = "📊 Lug'at statistikasi:\n\n";
        
        for (const source of sources) {
          statsText += `📕 ${source.source}: ${source.count.toLocaleString()} so'z\n`;
          total += source.count;
        }
        
        statsText += `\n📚 Jami: ${total.toLocaleString()} so'z`;
        statsText += `\n👥 Bot foydalanuvchilari: ${users.length}`;
        
        await ctx.reply(statsText, getMainKeyboard());
      } catch (error) {
        await ctx.reply('Statistikani olishda xatolik yuz berdi', getMainKeyboard());
      }
    });

    bot.command('stats', async (ctx) => {
      try {
        const sources = await storage.getDictionarySources();
        const users = await storage.getAllTelegramUsers();
        let total = 0;
        let statsText = "📊 Lug'at statistikasi:\n\n";
        
        for (const source of sources) {
          statsText += `📕 ${source.source}: ${source.count.toLocaleString()} so'z\n`;
          total += source.count;
        }
        
        statsText += `\n📚 Jami: ${total.toLocaleString()} so'z`;
        statsText += `\n👥 Bot foydalanuvchilari: ${users.length}`;
        
        await ctx.reply(statsText, getMainKeyboard());
      } catch (error) {
        await ctx.reply('Statistikani olishda xatolik yuz berdi', getMainKeyboard());
      }
    });

    // 🔍 Qidiruv tugmasi
    bot.hears('🔍 Qidiruv', async (ctx) => {
      await ctx.reply('🔍 So\'z yozing va men sizga tarjimasini topib beraman!\n\nMisol: كتب yoki kitob', getMainKeyboard());
    });

    // ✉️ Biz bilan aloqa tugmasi
    bot.hears('✉️ Biz bilan aloqa', async (ctx) => {
      const userId = ctx.from.id.toString();
      
      // Holatni saqlash
      const existingState = userStates.get(userId);
      if (existingState?.timeout) {
        clearTimeout(existingState.timeout);
      }
      
      // 5 daqiqalik timeout
      const timeout = setTimeout(() => {
        userStates.delete(userId);
      }, 5 * 60 * 1000);
      
      userStates.set(userId, { state: 'awaiting_contact', timeout });
      
      await ctx.reply(`✉️ Biz bilan aloqa

Xabaringizni yozing va biz tez orada javob beramiz.

Bekor qilish uchun /cancel yozing.`, Markup.keyboard([['❌ Bekor qilish']]).resize());
    });

    // Bekor qilish
    bot.hears('❌ Bekor qilish', async (ctx) => {
      const userId = ctx.from.id.toString();
      const state = userStates.get(userId);
      if (state?.timeout) {
        clearTimeout(state.timeout);
      }
      userStates.delete(userId);
      await ctx.reply('Bekor qilindi.', getMainKeyboard());
    });

    bot.command('cancel', async (ctx) => {
      const userId = ctx.from.id.toString();
      const state = userStates.get(userId);
      if (state?.timeout) {
        clearTimeout(state.timeout);
      }
      userStates.delete(userId);
      await ctx.reply('Bekor qilindi.', getMainKeyboard());
    });

    // Matn xabarlarini qabul qilish
    bot.on(message('text'), async (ctx) => {
      const text = ctx.message.text.trim();
      const userId = ctx.from.id.toString();
      
      if (text.startsWith('/')) return;
      
      // Foydalanuvchi interaksiyasini yangilash
      try {
        await storage.updateTelegramUserInteraction(userId);
      } catch (e) {}
      
      // Murojaat kutish holatida
      const userState = userStates.get(userId);
      if (userState?.state === 'awaiting_contact') {
        try {
          await storage.createContactMessage({
            telegramId: userId,
            message: text,
          });
          
          // Holatni tozalash
          if (userState.timeout) {
            clearTimeout(userState.timeout);
          }
          userStates.delete(userId);
          
          // Adminga bildirishnoma yuborish
          await notifyAdminNewMessage(text, {
            firstName: ctx.from.first_name,
            username: ctx.from.username,
          });
          
          await ctx.reply(`✅ Xabaringiz qabul qilindi!

Tez orada javob beramiz. Rahmat!`, getMainKeyboard());
        } catch (e) {
          console.error('[Telegram] Murojaatni saqlashda xato:', e);
          await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', getMainKeyboard());
        }
        return;
      }
      
      // Admin broadcast kutish holatida
      if (userState?.state === 'awaiting_broadcast' && isAdmin(userId)) {
        try {
          const users = await storage.getActiveTelegramUsers();
          
          // Holatni tozalash
          if (userState.timeout) {
            clearTimeout(userState.timeout);
          }
          userStates.delete(userId);
          
          await ctx.reply(`📤 ${users.length} ta foydalanuvchiga yuborilmoqda...`);
          
          let sent = 0;
          let failed = 0;
          
          for (const user of users) {
            try {
              await bot!.telegram.sendMessage(user.telegramId, text);
              sent++;
              // Rate limiting
              if (sent % 25 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (e) {
              failed++;
            }
          }
          
          await ctx.reply(`✅ Broadcast tugadi!\n\n📤 Yuborildi: ${sent}\n❌ Xato: ${failed}`, getAdminKeyboard());
        } catch (e) {
          console.error('[Telegram] Broadcast xatosi:', e);
          await ctx.reply('Xatolik yuz berdi', getAdminKeyboard());
        }
        return;
      }
      
      // Qidiruv
      if (text.length < 2) {
        await ctx.reply('🔍 Kamida 2 ta belgi kiriting', getMainKeyboard());
        return;
      }

      try {
        await ctx.sendChatAction('typing');
        
        const entries = await storage.getDictionaryEntries(text);
        
        if (entries.length === 0) {
          await ctx.reply(`😔 "${text}" bo'yicha hech narsa topilmadi.\n\nBoshqa so'z bilan urinib ko'ring.`, getMainKeyboard());
          return;
        }

        const ghoniy = entries.filter(e => e.dictionarySource === 'Ghoniy');
        const roid = entries.filter(e => e.dictionarySource === 'Roid');
        const muasir = entries.filter(e => e.dictionarySource === 'Muasir');

        let header = `🔍 "${text}" bo'yicha ${entries.length} ta natija topildi:\n`;
        header += `📗 G'oniy: ${ghoniy.length} | 📘 Roid: ${roid.length} | 📙 Muasir: ${muasir.length}`;
        await ctx.reply(header);

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
        await ctx.reply('Qidiruvda xatolik yuz berdi. Qaytadan urinib ko\'ring.', getMainKeyboard());
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

// Admin uchun xabar yuborish funksiyasi
export async function sendMessageToUser(telegramId: string, message: string): Promise<boolean> {
  if (!bot) return false;
  
  try {
    await bot.telegram.sendMessage(telegramId, message);
    return true;
  } catch (error: any) {
    console.error(`[Telegram] Xabar yuborishda xato (${telegramId}):`, error.message);
    // Agar foydalanuvchi botni bloklagan bo'lsa
    if (error.code === 403) {
      await storage.markTelegramUserBlocked(telegramId);
    }
    return false;
  }
}

// Broadcast yuborish funksiyasi
export async function sendBroadcast(content: string): Promise<{ sent: number; failed: number }> {
  if (!bot) return { sent: 0, failed: 0 };
  
  const users = await storage.getActiveTelegramUsers();
  let sent = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegramId, content);
      sent++;
      // Rate limiting - 30 xabar/soniya
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error: any) {
      failed++;
      if (error.code === 403) {
        await storage.markTelegramUserBlocked(user.telegramId);
      }
    }
  }
  
  return { sent, failed };
}
