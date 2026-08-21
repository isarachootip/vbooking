require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const targetIds = ['u1', 'u2', 'u3', 'u_1785465682806', 'u_1002', 'u_1003', 'u_1004'];
    
    // Check tasks
    const tasks = await pool.query(`SELECT id, title, assignee_id, project_id FROM tasks WHERE assignee_id = ANY($1)`, [targetIds]);
    console.log('Tasks assigned to these users:', tasks.rows);

    // Check timesheets
    const timesheets = await pool.query(`SELECT id, user_id, date, hours FROM timesheets WHERE user_id = ANY($1)`, [targetIds]);
    console.log('Timesheets for these users:', timesheets.rows);

    // Check projects.members
    const projects = await pool.query(`SELECT id, name, members FROM projects`);
    const affectedProjects = [];
    projects.rows.forEach(p => {
      if (p.members && Array.isArray(p.members)) {
        const hasMember = p.members.some(m => {
          const mId = typeof m === 'string' ? m : m?.id || m?.userId;
          return targetIds.includes(mId);
        });
        if (hasMember) affectedProjects.push(p);
      }
    });
    console.log('Projects with these users in members:', affectedProjects.map(p => ({ id: p.id, name: p.name })));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
