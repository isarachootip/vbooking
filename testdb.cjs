const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:EsQShpeaGvSr21I5ieQGJRmCELp78GSlQn6hQHAIjbTnY4c1aWw56JleGierEk2t@187.77.147.16:5432/buildflowdb',
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  try {
    await client.connect();
    console.log('=== FULL SYSTEM AUDIT ===\n');

    // 1. Table Counts
    const tables = [
      'users', 'projects', 'tasks', 'timesheets', 'leads', 'lead_followups', 
      'lead_site_visit_results', 'lead_designs', 'quotations', 'quotation_items', 'lead_payments',
      'customers', 'customer_sites', 'branches', 'service_price_book', 
      'qc_daily_plans', 'qc_plan_items', 'project_qc_inspections', 'project_handovers',
      'ma_contracts', 'ma_rounds', 'ma_checklist_templates',
      'task_templates', 'master_project_types', 'project_workflows', 'permission_schemes'
    ];
    
    console.log('1. Database Tables & Records:');
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT count(*) FROM ${t}`);
        console.log(`   ✓ ${t}: ${res.rows[0].count} records`);
      } catch(e) {
        console.log(`   ✗ ${t}: ${e.message}`);
      }
    }

    // 2. Leads Status Distribution
    console.log('\n2. Leads Status Distribution:');
    const leadStats = await client.query(`
      SELECT status, count(*) as count 
      FROM leads 
      GROUP BY status 
      ORDER BY count DESC
    `);
    leadStats.rows.forEach(r => console.log(`   • ${r.status || 'NULL'}: ${r.count} leads`));

    // 3. Projects Status Distribution
    console.log('\n3. Projects Status Distribution:');
    const projStats = await client.query(`
      SELECT status, count(*) as count 
      FROM projects 
      GROUP BY status 
      ORDER BY count DESC
    `);
    projStats.rows.forEach(r => console.log(`   • ${r.status || 'NULL'}: ${r.count} projects`));

    // 4. Tasks & Timesheets Health
    console.log('\n4. Tasks & Timesheets:');
    const taskStats = await client.query(`
      SELECT status, count(*) as count 
      FROM tasks 
      GROUP BY status 
      ORDER BY count DESC
    `);
    taskStats.rows.forEach(r => console.log(`   • Task Status [${r.status || 'NULL'}]: ${r.count}`));

    const tsStats = await client.query(`
      SELECT status, count(*) as count 
      FROM timesheets 
      GROUP BY status 
      ORDER BY count DESC
    `);
    tsStats.rows.forEach(r => console.log(`   • Timesheet Status [${r.status || 'NULL'}]: ${r.count}`));

    // 5. Check Users Role Distribution
    console.log('\n5. Users & Roles:');
    const userRoles = await client.query(`
      SELECT global_role, department, count(*) as count 
      FROM users 
      GROUP BY global_role, department 
      ORDER BY global_role, count DESC
    `);
    userRoles.rows.forEach(r => console.log(`   • Role: ${r.global_role} | Dept: ${r.department || '-'} (${r.count} users)`));

    console.log('\n=== AUDIT COMPLETED SUCCESSFULLY ===');
  } catch(e) {
    console.error('Audit Error:', e.message);
  } finally {
    await client.end();
  }
}
audit();
