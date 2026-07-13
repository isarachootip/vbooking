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
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks'"
  );
  console.log('Columns in tasks:');
  res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  client.release();
  await pool.end();
}

main().catch(console.error);
