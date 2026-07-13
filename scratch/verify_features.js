import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool(
  connectionString 
    ? { connectionString, ssl: connectionString.includes('neon') ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'timesheet',
      }
);

async function runVerification() {
  console.log('--- NexTime Jira-like Features Database Verification ---');
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Successfully connected to PostgreSQL.');

    // 1. Check tables existence
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('permission_schemes', 'project_workflows', 'projects', 'project_baselines', 'task_snapshots');
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Found tables:', tables);

    if (tables.includes('permission_schemes')) {
      console.log('✓ "permission_schemes" table exists.');
    } else {
      console.error('✗ "permission_schemes" table is MISSING.');
    }

    if (tables.includes('project_workflows')) {
      console.log('✓ "project_workflows" table exists.');
    } else {
      console.error('✗ "project_workflows" table is MISSING.');
    }

    if (tables.includes('project_baselines')) {
      console.log('✓ "project_baselines" table exists.');
    } else {
      console.error('✗ "project_baselines" table is MISSING.');
    }

    if (tables.includes('task_snapshots')) {
      console.log('✓ "task_snapshots" table exists.');
    } else {
      console.error('✗ "task_snapshots" table is MISSING.');
    }

    // 2. Check permission_scheme_id column in projects
    const columnsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'permission_scheme_id';
    `);
    if (columnsRes.rows.length > 0) {
      console.log('✓ "permission_scheme_id" column exists in "projects" table.');
    } else {
      console.error('✗ "permission_scheme_id" column is MISSING in "projects" table.');
    }

    // 3. Check seeded default permission scheme
    const schemeRes = await client.query('SELECT * FROM permission_schemes WHERE id = $1', ['scheme_default']);
    if (schemeRes.rows.length > 0) {
      console.log('✓ Seeded scheme "scheme_default" exists.');
      const scheme = schemeRes.rows[0];
      console.log(`  Name: ${scheme.name}`);
      console.log(`  Permissions: ${JSON.stringify(scheme.permissions)}`);
    } else {
      console.error('✗ Default permission scheme is MISSING.');
    }

    // 4. Check seeded project workflows
    const workflowRes = await client.query('SELECT * FROM project_workflows');
    console.log(`✓ Found ${workflowRes.rows.length} project workflow configurations.`);
    for (const wf of workflowRes.rows) {
      console.log(`  Project ID: ${wf.project_id}`);
      console.log(`    Statuses: ${JSON.stringify(wf.statuses)}`);
      console.log(`    Transitions: ${JSON.stringify(wf.transitions)}`);
    }

    console.log('\n✓ Database Schema verification completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Verification failed with error:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runVerification();
