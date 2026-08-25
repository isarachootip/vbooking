require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ids = ['PRHQ0240820260001', 'PRHQ0220820260001', 'PQHQ0220820260001'];

async function run() {
  for (const id of ids) {
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM project_workflows WHERE project_id = $1', [id]);
    await pool.query("UPDATE leads SET status = 'Payment Received', project_id = NULL WHERE project_id = $1", [id]);
    const r = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    console.log('Deleted:', id, '| rows:', r.rowCount);
  }
  pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
