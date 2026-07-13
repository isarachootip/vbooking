import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/kanna_db';

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000
});

async function verify() {
  console.log('Connecting to kanna_db to verify seeded data...');
  try {
    const usersRes = await pool.query('SELECT id, name, email, global_role FROM users;');
    console.log('Seeded Users:');
    usersRes.rows.forEach(u => {
      console.log(`- ${u.name} (${u.email}) [Role: ${u.global_role}]`);
    });

    const projectsRes = await pool.query('SELECT id, name, status, budget FROM projects;');
    console.log('\nSeeded Projects:');
    projectsRes.rows.forEach(p => {
      console.log(`- ${p.name} [Status: ${p.status}, Budget: ${p.budget}]`);
    });
  } catch (err) {
    console.error('Verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
