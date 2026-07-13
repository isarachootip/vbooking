import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  
  // Total timesheets
  const totalRes = await client.query("SELECT COUNT(*) as cnt FROM timesheets");
  console.log(`Total timesheets: ${totalRes.rows[0].cnt}`);

  // Timesheets with task_id
  const taskRes = await client.query("SELECT COUNT(*) as cnt FROM timesheets WHERE task_id IS NOT NULL AND task_id != ''");
  console.log(`Timesheets with task_id: ${taskRes.rows[0].cnt}`);

  // List some timesheets with task_id
  if (parseInt(taskRes.rows[0].cnt) > 0) {
    const listRes = await client.query("SELECT id, user_id, project_id, task_id, hours, date FROM timesheets WHERE task_id IS NOT NULL AND task_id != '' LIMIT 5");
    console.log('Sample timesheets with task_id:');
    console.log(listRes.rows);
  }

  // Let's check some tasks
  const tasksRes = await client.query("SELECT id, title, project_id FROM tasks LIMIT 5");
  console.log('Sample tasks:');
  console.log(tasksRes.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
