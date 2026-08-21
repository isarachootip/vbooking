require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`UPDATE users SET wfh_days = '{}' WHERE wfh_days = ARRAY['Fri']`);
    console.log(`Updated ${res.rowCount} users wfh_days to empty array.`);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
