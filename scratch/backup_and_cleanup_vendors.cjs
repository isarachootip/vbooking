require('dotenv').config();
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runBackupAndClean() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create backup table
    console.log('1. Creating backup table users_vendor_backup...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users_vendor_backup AS 
      SELECT * FROM users WHERE global_role = 'Vendor' OR id LIKE 'tech-%';
    `);

    // Verify backup count
    const backupRes = await client.query('SELECT count(*) FROM users_vendor_backup');
    console.log(`✅ Backed up ${backupRes.rows[0].count} records into users_vendor_backup`);

    // 2. Delete vendor/tech users from users table
    console.log('2. Removing vendor/tech users from users table...');
    const deleteRes = await client.query("DELETE FROM users WHERE global_role = 'Vendor' OR id LIKE 'tech-%'");
    console.log(`✅ Removed ${deleteRes.rowCount} vendor records from users table`);

    await client.query('COMMIT');

    // 3. Inspect remaining users in users table
    const remainingUsers = await client.query('SELECT id, name, email, global_role, department, skills FROM users ORDER BY global_role, name');
    console.log('\n--- Remaining Users in "users" table ---');
    console.log(`Total: ${remainingUsers.rows.length} users`);
    console.log(JSON.stringify(remainingUsers.rows, null, 2));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during backup and cleanup:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runBackupAndClean();
