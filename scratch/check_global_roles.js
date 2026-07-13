import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';
const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    const rolesRes = await pool.query("SELECT DISTINCT global_role FROM users");
    console.log("Global Roles:", rolesRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
