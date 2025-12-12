import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { dictionaryEntries } from '../shared/schema';

const BATCH_SIZE = 500;

async function migrateData() {
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = process.env.RAILWAY_DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    console.error('DATABASE_URL va RAILWAY_DATABASE_URL kerak!');
    console.log('Ishlatish: RAILWAY_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-to-railway.ts');
    process.exit(1);
  }

  console.log('Replit database ga ulanmoqda...');
  const sourcePool = new pg.Pool({ connectionString: sourceUrl });
  const sourceDb = drizzle(sourcePool);

  console.log('Railway database ga ulanmoqda...');
  const targetPool = new pg.Pool({ 
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false }
  });
  const targetDb = drizzle(targetPool);

  try {
    console.log('Mavjud yozuvlarni sanash...');
    const countResult = await sourcePool.query('SELECT COUNT(*) FROM dictionary_entries');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`Jami ${totalCount} ta yozuv topildi`);

    console.log('Railway da jadval yaratmoqda...');
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS dictionary_entries (
        id SERIAL PRIMARY KEY,
        arabic TEXT NOT NULL,
        arabic_definition TEXT,
        uzbek TEXT,
        transliteration TEXT,
        type TEXT NOT NULL DEFAULT 'aniqlanmagan',
        root TEXT,
        examples_json TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        dictionary_source TEXT NOT NULL DEFAULT 'Muasir',
        arabic_vocalized TEXT,
        arabic_definition_vocalized TEXT,
        processing_status TEXT DEFAULT 'pending',
        meanings_json TEXT,
        word_type TEXT
      )
    `);

    let offset = 0;
    let inserted = 0;

    while (offset < totalCount) {
      const rows = await sourcePool.query(
        `SELECT * FROM dictionary_entries ORDER BY id LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );

      if (rows.rows.length === 0) break;

      for (const row of rows.rows) {
        try {
          await targetPool.query(`
            INSERT INTO dictionary_entries (
              id, arabic, arabic_definition, uzbek, transliteration, type, root,
              examples_json, created_at, updated_at, dictionary_source,
              arabic_vocalized, arabic_definition_vocalized, processing_status,
              meanings_json, word_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING
          `, [
            row.id, row.arabic, row.arabic_definition, row.uzbek, row.transliteration,
            row.type, row.root, row.examples_json, row.created_at, row.updated_at,
            row.dictionary_source, row.arabic_vocalized, row.arabic_definition_vocalized,
            row.processing_status, row.meanings_json, row.word_type
          ]);
          inserted++;
        } catch (err: any) {
          console.error(`Xato ID ${row.id}:`, err.message);
        }
      }

      offset += BATCH_SIZE;
      const percent = Math.round((offset / totalCount) * 100);
      console.log(`Progress: ${Math.min(offset, totalCount)}/${totalCount} (${percent}%)`);
    }

    await targetPool.query(`SELECT setval('dictionary_entries_id_seq', (SELECT MAX(id) FROM dictionary_entries))`);

    console.log(`\n✅ Muvaffaqiyatli! ${inserted} ta yozuv Railway ga ko'chirildi`);

  } catch (error) {
    console.error('Xato:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

migrateData();
