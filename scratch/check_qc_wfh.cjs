require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query('SELECT id, name, global_role, wfh_days FROM users WHERE global_role = $1', ['QC']);
    console.log('QC Users and WFH days:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
