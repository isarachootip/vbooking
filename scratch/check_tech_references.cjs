require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkReferences() {
  try {
    const vendorUsers = await pool.query("SELECT id, name, global_role FROM users WHERE global_role = 'Vendor' OR id LIKE 'tech-%'");
    console.log(`Total Vendor/Tech users: ${vendorUsers.rows.length}`);

    // Check leads
    const leadsSurveyor = await pool.query("SELECT count(*) FROM leads WHERE surveyor_id LIKE 'tech-%'");
    console.log(`Leads with tech as surveyor: ${leadsSurveyor.rows[0].count}`);

    // Check tasks
    const tasksAssignee = await pool.query("SELECT count(*) FROM tasks WHERE assignee_id LIKE 'tech-%'");
    console.log(`Tasks with tech as assignee: ${tasksAssignee.rows[0].count}`);

    // Check timesheets
    const timesheets = await pool.query("SELECT count(*) FROM timesheets WHERE user_id LIKE 'tech-%'");
    console.log(`Timesheets with tech as user: ${timesheets.rows[0].count}`);

    // Check backup tables if any exist
    const backupTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Existing public tables:', backupTables.rows.map(r => r.table_name));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkReferences();
