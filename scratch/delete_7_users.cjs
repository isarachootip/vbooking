require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetIds = ['u1', 'u2', 'u3', 'u_1785465682806', 'u_1002', 'u_1003', 'u_1004'];

    // 1. Backup to users_backup_deleted
    await client.query(`
      INSERT INTO users_backup_deleted 
      SELECT * FROM users 
      WHERE id = ANY($1)
      ON CONFLICT DO NOTHING;
    `, [targetIds]);
    console.log('✅ Backed up the 7 users into users_backup_deleted.');

    // 2. Set assignee_id to NULL for any tasks assigned to them
    const taskUpdateRes = await client.query(`
      UPDATE tasks 
      SET assignee_id = NULL 
      WHERE assignee_id = ANY($1)
    `, [targetIds]);
    console.log(`✅ Unlinked ${taskUpdateRes.rowCount} tasks assigned to deleted users.`);

    // 3. Clean project members
    const projRes = await client.query(`SELECT id, members FROM projects`);
    for (const p of projRes.rows) {
      if (p.members && Array.isArray(p.members)) {
        const filtered = p.members.filter(m => {
          const mId = typeof m === 'string' ? m : m?.id || m?.userId;
          return !targetIds.includes(mId);
        });
        if (filtered.length !== p.members.length) {
          await client.query(`UPDATE projects SET members = $1 WHERE id = $2`, [JSON.stringify(filtered), p.id]);
        }
      }
    }
    console.log('✅ Cleaned project members.');

    // 4. Delete the 7 users from users table
    const delRes = await client.query(`
      DELETE FROM users 
      WHERE id = ANY($1)
    `, [targetIds]);
    console.log(`✅ Deleted ${delRes.rowCount} users from users table.`);

    await client.query('COMMIT');

    // 5. Query remaining users
    const remainingRes = await client.query(`
      SELECT id, name, email, global_role, department 
      FROM users 
      ORDER BY global_role, name
    `);

    console.log(`\n=== REMAINING USERS IN DATABASE (Total: ${remainingRes.rows.length}) ===`);
    remainingRes.rows.forEach((u, i) => {
      console.log(`${i + 1}. [${u.global_role}] ${u.name} (${u.email}) - ${u.department || 'N/A'}`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during deletion:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
