import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT id, name, status, project_type, support_task_style FROM projects");
    console.log("=== CURRENT PROJECTS IN DATABASE ===");
    if (res.rows.length === 0) {
      console.log("No projects found.");
    } else {
      res.rows.forEach(row => {
        console.log(JSON.stringify(row, null, 2));
      });
    }
  } catch (err) {
    console.error("Error querying projects:", err);
  } finally {
    await pool.end();
  }
}

run();
