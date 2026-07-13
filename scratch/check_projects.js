import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  
  // List all projects
  const projects = await client.query("SELECT id, name FROM projects");
  console.log('=== All Projects ===');
  projects.rows.forEach(p => console.log(`  ${p.id} | ${p.name}`));

  // Check tasks count per project
  const taskCounts = await client.query(
    "SELECT project_id, COUNT(*) as cnt FROM tasks GROUP BY project_id"
  );
  console.log('\n=== Task Counts by Project ===');
  taskCounts.rows.forEach(r => console.log(`  ${r.project_id} | ${r.cnt} tasks`));

  // Search for cds tasks anywhere
  const cdsTasks = await client.query(
    "SELECT id, title, project_id FROM tasks WHERE id LIKE '%cds%' OR title LIKE '%cds%' LIMIT 10"
  );
  console.log(`\n=== CDS Tasks found: ${cdsTasks.rows.length} ===`);
  cdsTasks.rows.forEach(t => console.log(`  ${t.id} | ${t.title} | proj: ${t.project_id}`));

  client.release();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
