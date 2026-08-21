require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // 1. Check if backup table exists, if not create it
    await client.query(`
      CREATE TABLE IF NOT EXISTS users_backup_deleted AS 
      SELECT * FROM users WHERE FALSE;
    `);

    // 2. Insert the records to delete into users_backup_deleted
    const toDeleteRes = await client.query(`
      SELECT id, name, email, global_role, department 
      FROM users 
      WHERE (id LIKE 'tech-%' OR global_role = 'Vendor' OR id = 'u_1005')
    `);
    console.log(`Found ${toDeleteRes.rows.length} technician users to delete:`);
    console.log(`Sample:`, toDeleteRes.rows.slice(0, 5));

    // Save to backup
    await client.query(`
      INSERT INTO users_backup_deleted 
      SELECT * FROM users 
      WHERE (id LIKE 'tech-%' OR global_role = 'Vendor' OR id = 'u_1005')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Backed up successfully.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
