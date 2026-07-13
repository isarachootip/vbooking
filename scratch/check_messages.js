import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    console.log('Querying latest messages...');
    const res = await pool.query('SELECT * FROM project_messages ORDER BY created_at DESC LIMIT 15');
    console.log('Latest 15 rows:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await pool.end();
  }
}

check();
