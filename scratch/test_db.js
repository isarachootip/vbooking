import pg from 'pg';

import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000 // 5 seconds timeout
});

console.log('Testing connection to 187.77.147.16:5432...');

pool.connect()
  .then(client => {
    console.log('Successfully connected to the database!');
    return client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\';')
      .then(res => {
        console.log('Existing tables:', res.rows.map(r => r.table_name));
        client.release();
        process.exit(0);
      });
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
