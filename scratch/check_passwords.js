import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    const res = await pool.query('SELECT id, name, email, password_hash FROM users');
    console.log('--- Database Users & Passwords Verification ---');
    res.rows.forEach(row => {
      console.log(`User: ${row.name} (${row.email})`);
      console.log(`  Password Hash: ${row.password_hash || 'NULL ❌'}`);
    });
    await pool.end();
  } catch (err) {
    console.error('Error checking users:', err);
  }
}

check();
