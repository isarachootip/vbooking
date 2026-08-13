require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_price_book (
        id VARCHAR(50) PRIMARY KEY,
        service_name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50),
        labor_cost NUMERIC DEFAULT 0,
        material_cost NUMERIC DEFAULT 0,
        default_margin_percent NUMERIC DEFAULT 0,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );
    `);
    console.log('Created service_price_book table');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
};
createTable();
