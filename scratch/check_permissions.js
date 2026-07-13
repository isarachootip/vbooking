import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';
const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    // Check permission schemes
    const schemeRes = await pool.query("SELECT * FROM permission_schemes");
    console.log("Permission Schemes:");
    console.log(JSON.stringify(schemeRes.rows, null, 2));

    // Check project permission_scheme_id
    const projRes = await pool.query("SELECT id, name, permission_scheme_id FROM projects WHERE id = 'p_1782382458568'");
    console.log("\nProject permission_scheme_id:");
    console.log(JSON.stringify(projRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
