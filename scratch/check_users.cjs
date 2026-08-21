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
    
    // Group by global_role
    const byRole = {};
    res.rows.forEach(u => {
      byRole[u.global_role] = (byRole[u.global_role] || 0) + 1;
    });
    console.log('Total users:', res.rows.length);
    console.log('Users by global_role:', byRole);
    
    console.log('\n--- QC Users (global_role = QC or skills containing QC) ---');
    res.rows.filter(u => u.global_role === 'QC' || (u.global_role && u.global_role.toLowerCase() === 'qc')).forEach(u => {
      console.log(`[${u.global_role}] ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Dept: ${u.department}`);
    });

    console.log('\n--- Admin Users ---');
    res.rows.filter(u => u.global_role && u.global_role.toLowerCase().includes('admin')).forEach(u => {
      console.log(`[${u.global_role}] ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Dept: ${u.department}`);
    });

    console.log('\n--- Other Non-Vendor Users ---');
    res.rows.filter(u => u.global_role !== 'Vendor' && u.global_role !== 'QC' && !u.global_role?.toLowerCase().includes('admin')).forEach(u => {
      console.log(`[${u.global_role}] ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Dept: ${u.department}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
