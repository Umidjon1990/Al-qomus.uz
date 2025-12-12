const { Client } = require('pg');
const fs = require('fs');

const RAILWAY_URL = "postgresql://postgres:UFXrYRfGXlFMzhGSTLVSApykypqpzvnS@yamanote.proxy.rlwy.net:53007/railway";

async function migrate() {
  const client = new Client({ connectionString: RAILWAY_URL });
  await client.connect();
  console.log('Connected to Railway');

  const lines = fs.readFileSync('/tmp/messages_export.txt', 'utf-8').split('\n').filter(l => l.trim());
  console.log(`Migrating ${lines.length} messages...`);

  let count = 0;
  for (const line of lines) {
    const parts = line.split('|');
    const [id, telegram_id, message, status, admin_response, responded_at, created_at] = parts;
    
    try {
      await client.query(`
        INSERT INTO contact_messages (id, telegram_id, message, status, admin_response, responded_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        parseInt(id),
        telegram_id,
        message,
        status || 'new',
        admin_response || null,
        responded_at || null,
        created_at
      ]);
      count++;
    } catch (err) {
      console.error(`Error inserting message ${id}:`, err.message);
    }
  }

  console.log(`Migrated ${count} messages`);
  
  // Reset sequence
  await client.query("SELECT setval('contact_messages_id_seq', (SELECT MAX(id) FROM contact_messages))");
  
  const result = await client.query('SELECT COUNT(*) as count FROM contact_messages');
  console.log(`Total messages in Railway: ${result.rows[0].count}`);

  await client.end();
}

migrate().catch(console.error);
