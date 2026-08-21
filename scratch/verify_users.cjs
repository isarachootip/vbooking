require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('Current user count in DB:', res.rows[0].count);

    const rolesRes = await pool.query('SELECT global_role, COUNT(*) as count FROM users GROUP BY global_role ORDER BY count DESC');
    console.log('Roles breakdown:', rolesRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
