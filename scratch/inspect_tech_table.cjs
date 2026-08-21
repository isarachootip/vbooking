require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectTechTable() {
  try {
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'technicians' ORDER BY ordinal_position;"
    );
    console.log('technicians table columns:', cols.rows);

    const sample = await pool.query("SELECT * FROM technicians LIMIT 2");
    console.log('sample technicians:', sample.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspectTechTable();
