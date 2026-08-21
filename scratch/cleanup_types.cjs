const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function cleanupTypes() {
  const quickCols = JSON.stringify(['To Do', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);
  const installerMaCols = JSON.stringify(['To Do', 'Buy-Survey', 'Survey', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);
  const renovateCols = JSON.stringify(['To Do', 'Buy-Survey', 'Survey', 'Design', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);

  await pool.query("UPDATE projects SET project_type = 'Quick service', custom_columns = $1 WHERE id IN ('P140826-001', 'P140826-004', 'PGEN2608-001', 'POHQ0130820260001')", [quickCols]);
  await pool.query("UPDATE projects SET project_type = 'Installer Service', custom_columns = $1 WHERE id IN ('P140826-002')", [installerMaCols]);
  await pool.query("UPDATE projects SET project_type = 'MA Service', custom_columns = $1 WHERE id IN ('P130826-001', 'P130826-002', 'P130826-003', 'P130826-004')", [installerMaCols]);
  await pool.query("UPDATE projects SET project_type = 'Renovate Service', custom_columns = $1 WHERE id IN ('P140826-003')", [renovateCols]);

  console.log('Project types cleanup completed.');
  const r = await pool.query('SELECT id, name, project_type, custom_columns FROM projects');
  console.log('Current projects in DB:');
  r.rows.forEach(p => console.log(' -', p.id, '|', p.name, '|', p.project_type, '|', p.custom_columns?.length, 'cols'));
  await pool.end();
}

cleanupTypes().catch(e => {
  console.error(e);
  pool.end();
});
