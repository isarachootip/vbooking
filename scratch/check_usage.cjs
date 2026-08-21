require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const users = await pool.query(`SELECT id, name, email, global_role FROM users ORDER BY id`);
    const tasks = await pool.query(`SELECT id, assignee_id, title FROM tasks`);
    const timesheets = await pool.query(`SELECT id, user_id FROM timesheets`);
    const projects = await pool.query(`SELECT id, name, members FROM projects`);
    
    console.log('--- User Usage Across the System ---');
    for (const u of users.rows) {
      const uTasks = tasks.rows.filter(t => t.assignee_id === u.id);
      const uTs = timesheets.rows.filter(ts => ts.user_id === u.id);
      let inProjects = 0;
      projects.rows.forEach(p => {
        if (p.members && Array.isArray(p.members)) {
          if (p.members.some(m => (typeof m === 'string' ? m === u.id : m?.id === u.id))) inProjects++;
        }
      });
      if (uTasks.length > 0 || uTs.length > 0 || inProjects > 0 || u.global_role === 'QC' || u.global_role?.toLowerCase() === 'admin' || u.id === 'u_1785465682806' || u.id === 'u4') {
        console.log(`[${u.global_role}] ${u.id} (${u.name}): Tasks=${uTasks.length}, Timesheets=${uTs.length}, Projects=${inProjects}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
