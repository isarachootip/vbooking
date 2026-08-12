const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:EsQShpeaGvSr21I5ieQGJRmCELp78GSlQn6hQHAIjbTnY4c1aWw56JleGierEk2t@187.77.147.16:5432/buildflowdb' });
async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT COUNT(*) FROM task_templates');
    console.log('Task Templates Count:', res.rows[0].count);
    const res2 = await client.query('SELECT * FROM task_templates LIMIT 5');
    console.log(res2.rows.map(r => r.title));
  } catch(e) {
    console.error('DB Error:', e.message);
  } finally {
    await client.end();
  }
}
test();
