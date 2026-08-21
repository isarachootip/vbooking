const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateFormattedProjectId(jobType, branch) {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  let typeCode = 'GEN';
  if (jobType === 'Installer (งานติดตั้ง)' || jobType === 'Installation') typeCode = 'INS';
  else if (jobType === 'Renovate (งานรีโนเวท)' || jobType === 'Renovation') typeCode = 'REN';
  else if (jobType === 'Build-in (งานบิวท์อิน)') typeCode = 'BUI';
  else if (jobType === 'New house (สร้างบ้านใหม่)') typeCode = 'NEW';
  else if (jobType === 'Maintenance (งานซ่อมบำรุง MA)') typeCode = 'MNT';

  const prefix = `P${typeCode}${year}${month}`;
  
  const result = await pool.query(
    `SELECT id FROM projects WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}-%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].id;
    const parts = lastId.split('-');
    if (parts.length > 1) {
      seq = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}-${seq.toString().padStart(3, '0')}`;
}

async function testConvert() {
  try {
    const leadResult = await pool.query('SELECT * FROM leads WHERE status != \'Converted\' LIMIT 1');
    if (leadResult.rows.length === 0) {
      console.log('No unconverted leads found');
      return;
    }
    const lead = leadResult.rows[0];
    console.log('Testing convert for lead:', lead.id);

    const projectId = await generateFormattedProjectId(lead.job_type || 'General', '');
    console.log('Generated Project ID:', projectId);

    const now = new Date().toISOString();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endDateStr = end.toISOString();
    const membersJson = JSON.stringify([]);

    console.log('Inserting project...');
    const projResult = await pool.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, members, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        projectId, 
        `[${lead.job_type}] ${lead.customer_name}`, 
        `Auto-generated from lead ${lead.id}\nNotes: ${lead.notes || ''}`, 
        'Planning', 
        now, 
        endDateStr, 
        membersJson, 
        lead.customer_address
      ]
    );
    console.log('Project inserted:', projResult.rows[0].id);

    console.log('Inserting workflows...');
    await pool.query(
        `INSERT INTO project_workflows (project_id, statuses, transitions) VALUES ($1, $2, $3)`,
        [projectId, JSON.stringify(["To Do", "In Progress", "Review", "Done"]), JSON.stringify([])]
    );

    console.log('Fetching templates...');
    const templateResult = await pool.query(
        'SELECT * FROM task_templates WHERE project_template_name = $1 ORDER BY start_percent ASC',
        [lead.job_type]
    );
    let tpls = templateResult.rows;
    if (tpls.length === 0) {
        const genResult = await pool.query(
            'SELECT * FROM task_templates WHERE project_template_name = $1 ORDER BY start_percent ASC',
            ['General']
        );
        tpls = genResult.rows;
    }

    console.log('Inserting tasks...');
    for (let i = 0; i < tpls.length; i++) {
        const tpl = tpls[i];
        const taskId = `t_${Date.now()}_${i}`;
        await pool.query(
            `INSERT INTO tasks (id, project_id, title, description, status, priority, estimated_hours, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [taskId, projectId, tpl.title, tpl.description, 'To Do', tpl.priority, tpl.estimated_hours, now]
        );
    }

    console.log('All inserts successful!');
  } catch (err) {
    console.error('Error in conversion:', err);
  } finally {
    pool.end();
  }
}

testConvert();
