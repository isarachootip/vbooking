require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`
      SELECT id, name, email, global_role, department, skills 
      FROM users 
      ORDER BY global_role, id
    `);

    console.log('--- USERS WITH global_role = QC ---');
    const qcUsers = res.rows.filter(u => u.global_role?.toUpperCase() === 'QC');
    qcUsers.forEach(u => console.log(`${u.id} | ${u.name} | ${u.global_role} | ${u.department}`));

    console.log('\n--- USERS WITH global_role = Admin ---');
    const adminUsers = res.rows.filter(u => u.global_role?.toUpperCase() === 'ADMIN');
    adminUsers.forEach(u => console.log(`${u.id} | ${u.name} | ${u.global_role} | ${u.department}`));

    console.log('\n--- ALL OTHER USERS (Not QC, Not Admin) ---');
    const otherUsers = res.rows.filter(u => u.global_role?.toUpperCase() !== 'QC' && u.global_role?.toUpperCase() !== 'ADMIN');
    console.log('Count of other users:', otherUsers.length);
    otherUsers.forEach(u => console.log(`${u.id} | ${u.name} | ${u.global_role} | ${u.department}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
