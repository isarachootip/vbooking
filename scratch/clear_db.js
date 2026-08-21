import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Truncating all tables to perform a clean start fresh reset...');
    await client.query('BEGIN;');
    await client.query(`
      TRUNCATE 
        migrations,
        users,
        permission_schemes,
        master_branches,
        master_zones,
        projects,
        project_workflows,
        sprints,
        releases,
        tasks,
        master_project_types,
        milestone_templates,
        task_templates,
        project_messages,
        chat_notifications,
        timesheets,
        task_commits,
        project_baselines,
        task_snapshots,
        cost_rates,
        service_price_book,
        system_settings,
        leads,
        lead_followups,
        branches
      CASCADE;
    `);
    await client.query('COMMIT;');
    console.log('✅ All tables successfully truncated cascade!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Error during truncation:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
