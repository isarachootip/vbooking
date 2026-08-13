require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tables = ['users', 'projects', 'tasks', 'timesheets', 'task_templates', 'sprints', 'releases', 'permission_schemes', 'project_workflows', 'cost_rates', 'system_settings', 'branches', 'service_price_book'];

Promise.all(tables.map(t => 
  pool.query(`SELECT 1 FROM ${t} LIMIT 1`)
    .then(() => console.log(t, 'exists'))
    .catch(e => console.error(t, 'missing:', e.message))
)).then(() => pool.end());
