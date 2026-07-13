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
  
  const result = await client.query(
    `SELECT s.name, s.status, s.start_date, s.end_date, COUNT(t.id) as task_count 
     FROM sprints s LEFT JOIN tasks t ON t.sprint_id = s.id 
     WHERE s.project_id = $1 
     GROUP BY s.id, s.name, s.status, s.start_date, s.end_date 
     ORDER BY s.start_date`,
    [projectId]
  );
  
  console.log('=== Sprint Summary for cds_stk ===');
  for (const r of result.rows) {
    console.log(`  ${r.name} | ${r.status} | ${r.start_date} → ${r.end_date} | ${r.task_count} tasks`);
  }

  client.release();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
