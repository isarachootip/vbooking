// Script to fetch project cds_stk data and create demo sprints
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  
  // Find project cds_stk
  const projects = await client.query("SELECT id, name, start_date, end_date FROM projects WHERE name ILIKE '%cds%' OR name ILIKE '%stk%'");
  console.log('=== Projects matching cds_stk ===');
  console.log(JSON.stringify(projects.rows, null, 2));
  
  if (projects.rows.length > 0) {
    const projectId = projects.rows[0].id;
    
    // Get tasks for this project
    const tasks = await client.query(
      "SELECT id, title, status, priority, sprint_id, assignee_id, estimated_hours, start_date, end_date FROM tasks WHERE project_id = $1 ORDER BY priority DESC, title",
      [projectId]
    );
    console.log(`\n=== Tasks for project ${projectId} (${tasks.rows.length} total) ===`);
    console.log(JSON.stringify(tasks.rows, null, 2));
    
    // Check existing sprints
    const sprints = await client.query(
      "SELECT id, name, status, start_date, end_date FROM sprints WHERE project_id = $1",
      [projectId]
    );
    console.log(`\n=== Existing Sprints (${sprints.rows.length}) ===`);
    console.log(JSON.stringify(sprints.rows, null, 2));
  }
  
  client.release();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
