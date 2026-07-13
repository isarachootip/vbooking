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
    "SELECT id, title, project_id FROM tasks WHERE id = 't_bxta2gey6'"
  );
  console.log('Task t_bxta2gey6 details:');
  console.log(res.rows);
  client.release();
  await pool.end();
}

main().catch(console.error);
