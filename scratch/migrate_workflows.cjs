const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vbooking'
});

async function migrate() {
  try {
    const quickCols = JSON.stringify(['To Do', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);
    const installerMaCols = JSON.stringify(['To Do', 'Buy-Survey', 'Survey', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);
    const renovateCols = JSON.stringify(['To Do', 'Buy-Survey', 'Survey', 'Design', 'ชำระเงิน', 'Assign ช่าง', 'Check-in', 'Check-out', 'QC', 'Aftersale', 'Close']);

    // 1. Update master_project_types
    await pool.query("UPDATE master_project_types SET default_columns = $1 WHERE id = 'mpt_1' OR LOWER(name) LIKE '%quick%'", [quickCols]);
    await pool.query("UPDATE master_project_types SET default_columns = $1 WHERE id = 'mpt_2' OR id = 'mpt_5' OR LOWER(name) LIKE '%install%' OR LOWER(name) LIKE '%mainten%'", [installerMaCols]);
    await pool.query("UPDATE master_project_types SET default_columns = $1 WHERE id = 'mpt_3' OR id = 'mpt_4' OR LOWER(name) LIKE '%renovate%' OR LOWER(name) LIKE '%build%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%house%'", [renovateCols]);

    // 2. Update system_settings if exists
    const ssCheck = await pool.query("SELECT * FROM system_settings WHERE setting_key = 'master_project_types'");
    if (ssCheck.rows.length > 0) {
      try {
        let types = JSON.parse(ssCheck.rows[0].setting_value);
        types = types.map(t => {
          if (t.id === 'quick_service') return { ...t, default_columns: JSON.parse(quickCols) };
          if (t.id === 'installer' || t.id === 'maintenance') return { ...t, default_columns: JSON.parse(installerMaCols) };
          return { ...t, default_columns: JSON.parse(renovateCols) };
        });
        await pool.query("UPDATE system_settings SET setting_value = $1 WHERE setting_key = 'master_project_types'", [JSON.stringify(types)]);
      } catch (e) {
        console.error('Error updating system_settings:', e);
      }
    }

    // 3. Update existing projects
    const projs = await pool.query('SELECT id, project_type, custom_columns FROM projects');
    for (const p of projs.rows) {
      const t = (p.project_type || '').toLowerCase().trim();
      let newCols = renovateCols;
      if (t === 'quick' || t === 'quick_service' || t === 'quick service' || t.startsWith('quick') || p.id.startsWith('PQ')) {
        newCols = quickCols;
      } else if (t === 'install' || t === 'installer' || t === 'installer service' || t === 'installation' || t === 'ma' || t === 'maintenance' || t === 'ma service' || p.id.startsWith('PI') || p.id.startsWith('PM')) {
        newCols = installerMaCols;
      }
      await pool.query('UPDATE projects SET custom_columns = $1 WHERE id = $2', [newCols, p.id]);
    }

    console.log('Migration completed successfully.');
    const checkMaster = await pool.query('SELECT id, name, default_columns FROM master_project_types');
    console.log('Updated master_project_types:', checkMaster.rows);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
