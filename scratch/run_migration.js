import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Running ALTER TABLE migrations on postgresql server...');
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoiced_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS collected_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_expense NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_expense NUMERIC DEFAULT 0;
    `);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
