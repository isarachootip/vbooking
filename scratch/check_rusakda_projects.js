import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';
const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = 'rusakda@central.co.th'");
    const userId = userRes.rows[0].id;

    // Check project of the timesheet entry
    const projRes = await pool.query("SELECT * FROM projects WHERE id = 'p_1781146732314'");
    console.log("Timesheet Project:", JSON.stringify(projRes.rows[0], null, 2));

    // Check all timesheets of this user
    const tsRes = await pool.query("SELECT * FROM timesheets WHERE user_id = $1", [userId]);
    console.log("\nAll Timesheets:");
    console.log(JSON.stringify(tsRes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
