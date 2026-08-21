require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    const res = await pool.query(
      "SELECT id, name, email, global_role, department, skills, phones, line_id, service_zones, technician_level FROM users WHERE id LIKE 'qc_%' ORDER BY id"
    );
    console.log('QC Users count:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));

    // Test surveyor endpoint query
    const surveyors = await pool.query("SELECT id, name, global_role, skills FROM users WHERE 'QC' = ANY(skills) AND id LIKE 'qc_%'");
    console.log('Surveyors matched:', surveyors.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

verify();
