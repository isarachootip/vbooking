require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool();
async function test() {
  try {
    const res = await pool.query(
      "INSERT INTO leads (id, customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *",
      ['lead_test_123', '?????? ????????', '??????', '????????', '0936396669', '?????????????', 13.842364, 100.667694, null, 'Installation', 'New', 'test notes', new Date().toISOString(), new Date().toISOString()]
    );
    console.log('Success:', res.rows[0].id);
  } catch(e) {
    console.error('DB Error:', e.message);
  } finally {
    pool.end();
  }
}
test();
