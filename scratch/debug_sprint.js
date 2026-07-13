import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  const projectId = 'p_1781636825766';

  // Check column name for sprint in tasks
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name LIKE '%sprint%'"
  );
  console.log('Sprint columns in tasks:', cols.rows);

  // Check current sprint_id values
  const sample = await client.query(
    "SELECT id, title, sprint_id FROM tasks WHERE project_id = $1 LIMIT 5",
    [projectId]
  );
  console.log('Sample tasks:', JSON.stringify(sample.rows, null, 2));

  // List current sprints
  const sprints = await client.query(
    "SELECT id, name FROM sprints WHERE project_id = $1 ORDER BY start_date",
    [projectId]
  );
  console.log('Current sprints:', JSON.stringify(sprints.rows, null, 2));

  // List all task IDs
  const allTasks = await client.query(
    "SELECT id, title FROM tasks WHERE project_id = $1 ORDER BY start_date",
    [projectId]
  );
  console.log(`\nAll tasks (${allTasks.rows.length}):`);
  allTasks.rows.forEach(t => console.log(`  ${t.id} | ${t.title}`));

  client.release();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
