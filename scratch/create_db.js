import pg from 'pg';

import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 10000
});

async function run() {
  console.log('Connecting to PostgreSQL server...');
  try {
    await client.connect();
    console.log('Connected successfully. Checking if database "kanna_db" exists...');
    
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'kanna_db';");
    
    if (res.rowCount > 0) {
      console.log('Database "kanna_db" already exists. No action taken.');
    } else {
      console.log('Creating database "kanna_db"...');
      // CREATE DATABASE cannot run inside a transaction block, so we execute it directly
      await client.query('CREATE DATABASE kanna_db;');
      console.log('Database "kanna_db" created successfully!');
    }
  } catch (err) {
    console.error('Error during database creation:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
