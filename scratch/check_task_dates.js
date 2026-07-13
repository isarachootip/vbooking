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
    "SELECT id, title, start_date, end_date, created_at, status FROM tasks WHERE start_date IS NOT NULL OR end_date IS NOT NULL LIMIT 10"
  );
  console.log('Tasks with start/end date:');
  console.log(res.rows);

  const totalWithDates = await client.query(
    "SELECT COUNT(*) as cnt FROM tasks WHERE start_date IS NOT NULL AND end_date IS NOT NULL"
  );
  console.log(`Total tasks with both start_date and end_date: ${totalWithDates.rows[0].cnt}`);

  const statusCount = await client.query(
    "SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status"
  );
  console.log('Tasks by status:');
  console.log(statusCount.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
