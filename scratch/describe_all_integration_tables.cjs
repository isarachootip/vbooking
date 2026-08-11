const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  
  const tables = ['technicians', 'zones', 'skills'];
  
  for (const table of tables) {
    try {
      const res = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1;", 
        [table]
      );
      if (res.rows.length === 0) {
        console.log(`Table ${table} does not exist or has no columns.`);
      } else {
        console.log(`Columns in ${table}:`, res.rows.map(r => `${r.column_name} (${r.data_type})`));
      }
    } catch (err) {
      console.log(`Error checking table ${table}:`, err.message);
    }
  }
  
  // Also list all tables just to see if there is any other integration table
  const allTablesRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
  );
  console.log('All tables:', allTablesRes.rows.map(r => r.table_name));

  await client.end();
}

main().catch(console.error);
