const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const resStatuses = await client.query('SELECT status, COUNT(*) FROM projects GROUP BY status');
  console.log('--- Unique Statuses ---');
  console.table(resStatuses.rows);

  const resTypes = await client.query('SELECT project_type, COUNT(*) FROM projects GROUP BY project_type');
  console.log('--- Unique Project Types ---');
  console.table(resTypes.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
