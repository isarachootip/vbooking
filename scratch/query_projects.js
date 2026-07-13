import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT id, title, created_at FROM tasks WHERE project_id = 'p_1782893887401'");
    console.log("=== TASKS FOR CDS_STK WITH CREATED_AT ===");
    for (const row of res.rows) {
      console.log(JSON.stringify(row));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
