require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const tsCount = await pool.query(`SELECT COUNT(*) FROM timesheets WHERE user_id LIKE 'tech-%'`);
    const tasksCount = await pool.query(`SELECT COUNT(*) FROM tasks WHERE assignee_id LIKE 'tech-%'`);
    const projMembers = await pool.query(`SELECT id, name, members FROM projects`);
    
    console.log('Timesheets with tech-%:', tsCount.rows[0].count);
    console.log('Tasks with tech-%:', tasksCount.rows[0].count);

    let projCount = 0;
    projMembers.rows.forEach(p => {
      if (p.members && Array.isArray(p.members)) {
        if (p.members.some(m => typeof m === 'string' && m.startsWith('tech-'))) {
          projCount++;
        }
      }
    });
    console.log('Projects with tech-% in members:', projCount);

    // Let's check leads, checkins, etc.
    try {
      const checkinCount = await pool.query(`SELECT COUNT(*) FROM site_check_ins WHERE user_id LIKE 'tech-%'`);
      console.log('Site check-ins with tech-%:', checkinCount.rows[0].count);
    } catch(e) {
      console.log('site_check_ins table query note:', e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
