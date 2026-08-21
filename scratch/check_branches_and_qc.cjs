require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const branches = await pool.query('SELECT id, code, name, province FROM branches ORDER BY code');
    console.log('Branches in DB (count:', branches.rows.length, '):');
    branches.rows.forEach(b => console.log(`[${b.code}] ${b.name} (${b.province})`));

    const userCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Columns in users table:', userCols.rows.map(c => c.column_name));

    const qcs = await pool.query('SELECT * FROM users WHERE global_role = $1', ['QC']);
    console.log('\nQC Users:', qcs.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
