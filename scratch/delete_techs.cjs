require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure auto_sync_remote_technicians is set to 'false' so server won't re-pull them
    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('auto_sync_remote_technicians', 'false')
      ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = 'false'
    `);
    console.log('✅ Disabled auto_sync_remote_technicians in system_settings.');

    // 2. Delete technician accounts except QC, Admin, and the 4 chosen sample technicians
    const preservedTechIds = ['tech-001', 'tech-002', 'tech-003', 'tech-004'];
    const delRes = await client.query(`
      DELETE FROM users 
      WHERE (id LIKE 'tech-%' OR global_role = 'Vendor' OR id = 'u_1005')
        AND global_role != 'QC' 
        AND global_role != 'Admin' 
        AND global_role != 'admin'
        AND NOT (id = ANY($1))
    `, [preservedTechIds]);
    console.log(`✅ Deleted ${delRes.rowCount} technician users (Preserved 4 sample techs: ${preservedTechIds.join(', ')}).`);

    await client.query('COMMIT');

    const remainingRes = await client.query(`
      SELECT id, name, email, global_role, department 
      FROM users 
      ORDER BY global_role, name
    `);

    console.log(`\n--- Remaining Users (${remainingRes.rows.length}) ---`);
    remainingRes.rows.forEach((u, i) => {
      console.log(`${i + 1}. [${u.global_role}] ${u.name} (${u.email}) - ${u.department || 'N/A'}`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during deletion:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
