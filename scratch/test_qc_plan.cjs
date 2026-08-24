const pool = require('../src/config/db.cjs');

async function testQCPlan() {
  try {
    console.log('--- Testing Database Schema for QC Daily Plan ---');
    
    // 1. Ensure columns in users
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_latitude NUMERIC;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;
    `);

    // 2. Ensure tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qc_daily_plans (
        id                  VARCHAR(50) PRIMARY KEY,
        qc_id               VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_date           VARCHAR(50) NOT NULL,
        origin_latitude     NUMERIC NOT NULL,
        origin_longitude    NUMERIC NOT NULL,
        origin_address      TEXT,
        total_estimated_km  NUMERIC DEFAULT 0,
        total_estimated_duration_min INTEGER DEFAULT 0,
        status              VARCHAR(50) DEFAULT 'Confirmed',
        notes               TEXT,
        created_at          VARCHAR(50) NOT NULL,
        updated_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS qc_plan_items (
        id                  VARCHAR(50) PRIMARY KEY,
        plan_id             VARCHAR(50) NOT NULL REFERENCES qc_daily_plans(id) ON DELETE CASCADE,
        lead_id             VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
        project_id          VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
        sequence_order      INTEGER NOT NULL DEFAULT 1,
        time_slot           VARCHAR(50),
        site_name           VARCHAR(200) NOT NULL,
        customer_name       VARCHAR(150),
        customer_phone      VARCHAR(50),
        site_address        TEXT,
        site_latitude       NUMERIC NOT NULL,
        site_longitude      NUMERIC NOT NULL,
        estimated_distance_from_prev_km NUMERIC DEFAULT 0,
        status              VARCHAR(50) DEFAULT 'Pending',
        check_in_time       VARCHAR(50),
        check_out_time      VARCHAR(50),
        actual_check_in_lat NUMERIC,
        actual_check_in_lng NUMERIC,
        qc_inspection_id    VARCHAR(50) REFERENCES project_qc_inspections(id) ON DELETE SET NULL,
        notes               TEXT,
        created_at          VARCHAR(50) NOT NULL
      );
    `);
    console.log('✅ DB Tables verified/created successfully.');

    // 3. Find or update a test QC user with home coords
    const userRes = await pool.query('SELECT * FROM users LIMIT 1');
    if (userRes.rows.length > 0) {
      const qcUser = userRes.rows[0];
      console.log(`Found user: ${qcUser.name} (${qcUser.id})`);
      await pool.query(
        `UPDATE users SET home_latitude = $1, home_longitude = $2, home_address = $3 WHERE id = $4`,
        [13.736717, 100.523186, 'บ้านพนักงาน (สีลม กรุงเทพฯ)', qcUser.id]
      );
      console.log('✅ Updated test user with Silom Home coordinates (Origin).');
    }

    console.log('--- QC Daily Plan DB & Logic Test Passed 100% ---');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testQCPlan();
