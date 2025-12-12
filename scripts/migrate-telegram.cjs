const { Client } = require('pg');
const fs = require('fs');

const RAILWAY_URL = "postgresql://postgres:UFXrYRfGXlFMzhGSTLVSApykypqpzvnS@yamanote.proxy.rlwy.net:53007/railway";

async function migrate() {
  const client = new Client({ connectionString: RAILWAY_URL });
  await client.connect();
  console.log('Connected to Railway');

  const lines = fs.readFileSync('/tmp/users_export.txt', 'utf-8').split('\n').filter(l => l.trim());
  console.log(`Migrating ${lines.length} users...`);

  let count = 0;
  for (const line of lines) {
    const parts = line.split('|');
    const [telegram_id, username, first_name, last_name, language_code, is_blocked, created_at, last_interaction_at] = parts;
    
    try {
      await client.query(`
        INSERT INTO telegram_users (telegram_id, username, first_name, last_name, language_code, is_blocked, created_at, last_interaction_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (telegram_id) DO NOTHING
      `, [
        telegram_id,
        username || null,
        first_name || null,
        last_name || null,
        language_code || null,
        is_blocked || 'false',
        created_at,
        last_interaction_at
      ]);
      count++;
    } catch (err) {
      console.error(`Error inserting ${telegram_id}:`, err.message);
    }
  }

  console.log(`Migrated ${count} users`);
  
  // Verify
  const result = await client.query('SELECT COUNT(*) as count FROM telegram_users');
  console.log(`Total users in Railway: ${result.rows[0].count}`);

  await client.end();
}

migrate().catch(console.error);
