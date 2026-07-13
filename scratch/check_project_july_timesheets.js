import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(
    "SELECT id, task_id, hours, date FROM timesheets WHERE project_id = 'p_1781770254250' AND date LIKE '2026-07%'"
  );
  console.log('Timesheets for p_1781770254250 in July 2026:');
  console.log(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
