import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/kanna_db';

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000
});

async function reseed() {
  console.log('Truncating tables in kanna_db to trigger fresh re-seed...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');
    // Disable triggers or cascade to clean tables
    await client.query('TRUNCATE users, projects, permission_schemes, project_workflows, task_templates, cost_rates CASCADE;');
    await client.query('COMMIT;');
    console.log('Tables truncated successfully!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Error truncating tables:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

reseed();
