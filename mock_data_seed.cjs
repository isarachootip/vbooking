require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || connectionString.includes('vercel-storage') ? { rejectUnauthorized: false } : false
});

const runSeed = async () => {
  try {
    console.log('Connecting to database...');
    
    // 1. Users
    const users = [
      { id: 'u_1001', name: 'Somchai (PM)', email: 'somchai.pm@example.com', role: 'admin' },
      { id: 'u_1002', name: 'Nadech (Dev)', email: 'nadech.dev@example.com', role: 'member' },
      { id: 'u_1003', name: 'Yaya (Tester)', email: 'yaya.test@example.com', role: 'member' },
      { id: 'u_1004', name: 'Tony (Client)', email: 'tony.client@example.com', role: 'client' },
    ];
    
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, global_role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [u.id, u.name, u.email, u.role]
      );
    }
    console.log('Users seeded.');

    // 2. Projects
    const projects = [
      { 
        id: 'p_2001', name: 'Smart Hotel Renovation', status: 'Active', 
        budget: 500000, type: 'construction',
        start_date: '2026-08-01', end_date: '2026-12-31'
      },
      { 
        id: 'p_2002', name: 'CRM NextGen Implementation', status: 'Active', 
        budget: 150000, type: 'dev',
        start_date: '2026-08-10', end_date: '2026-09-30'
      }
    ];

    for (const p of projects) {
      await pool.query(
        `INSERT INTO projects (id, name, status, start_date, end_date, budget, project_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [p.id, p.name, p.status, p.start_date, p.end_date, p.budget, p.type]
      );
    }
    console.log('Projects seeded.');

    // 3. Tasks
    const tasks = [
      // Project 1 Tasks
      { id: 't_3001', pid: 'p_2001', assignee: 'u_1001', title: 'Site Inspection & Measurement', status: 'Done', prio: 'High', est: 8 },
      { id: 't_3002', pid: 'p_2001', assignee: 'u_1002', title: 'Demolish old walls in Lobby', status: 'In Progress', prio: 'Urgent', est: 16 },
      { id: 't_3003', pid: 'p_2001', assignee: null, title: 'Install new smart lighting system', status: 'To Do', prio: 'Medium', est: 24 },
      
      // Project 2 Tasks
      { id: 't_3004', pid: 'p_2002', assignee: 'u_1001', title: 'Gather Requirements from Sales Team', status: 'Done', prio: 'High', est: 12 },
      { id: 't_3005', pid: 'p_2002', assignee: 'u_1002', title: 'Develop API for Customer Data', status: 'In Progress', prio: 'High', est: 40 },
      { id: 't_3006', pid: 'p_2002', assignee: 'u_1003', title: 'Write Automated Tests for API', status: 'To Do', prio: 'Medium', est: 16 },
    ];

    for (const t of tasks) {
      await pool.query(
        `INSERT INTO tasks (id, project_id, assignee_id, title, status, priority, estimated_hours, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.pid, t.assignee, t.title, t.status, t.prio, t.est, new Date().toISOString()]
      );
    }
    console.log('Tasks seeded.');

    // 4. Leads
    const leads = [
      { id: 'l_4001', name: 'Grand Plaza Condo', job_type: 'Renovate', status: 'New', phone: '0812345678' },
      { id: 'l_4002', name: 'TechStartup Co.', job_type: 'Quick', status: 'Contacted', phone: '0898765432' },
      { id: 'l_4003', name: 'Vibe Cafe (Silom)', job_type: 'Maintaince', status: 'Qualified', phone: '023334444' },
      { id: 'l_4004', name: 'Mr. John Smith', job_type: 'New-home', status: 'New', phone: '0811112222' },
      { id: 'l_4005', name: 'Siam Paragon Shop', job_type: 'Built-in', status: 'Proposal', phone: '0822223333' },
      { id: 'l_4006', name: 'Central World Kiosk', job_type: 'Installer', status: 'Contacted', phone: '0833334444' }
    ];

    for (const l of leads) {
      await pool.query(
        `INSERT INTO leads (id, customer_name, job_type, status, customer_phone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET job_type = EXCLUDED.job_type, customer_name = EXCLUDED.customer_name`,
        [l.id, l.name, l.job_type, l.status, l.phone, new Date().toISOString(), new Date().toISOString()]
      );
    }
    console.log('Leads seeded.');

    console.log('✅ Mock data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

runSeed();
