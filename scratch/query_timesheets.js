import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT t.id, t.user_id, u.name as user_name, t.date, t.hours, t.description, t.status, t.updated_at
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE u.name LIKE '%Isara%'
      ORDER BY t.updated_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
