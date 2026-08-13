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
      { id: 'u_1001', name: 'Somchai (PM)', email: 'somchai.pm@example.com', role: 'admin', skills: [] },
      { id: 'u_1002', name: 'Nadech (Dev)', email: 'nadech.dev@example.com', role: 'member', skills: [] },
      { id: 'u_1003', name: 'Yaya (QC Tech)', email: 'yaya.test@example.com', role: 'member', skills: ['QC', 'Wiring'] },
      { id: 'u_1004', name: 'Tony (Client)', email: 'tony.client@example.com', role: 'client', skills: [] },
      { id: 'u_1005', name: 'Mario (Senior Tech)', email: 'mario.tech@example.com', role: 'member', skills: ['QC', 'Plumbing'] },
    ];
    
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, global_role, skills) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, skills = EXCLUDED.skills`,
        [u.id, u.name, u.email, u.role, u.skills]
      );
    }
    console.log('Users seeded.');

    // 2. Projects (Wipe and recreate with Smart Project IDs)
    await pool.query('DELETE FROM tasks'); // Delete tasks first due to FK
    await pool.query('DELETE FROM projects');
    
    // Generate date string DDMMYYYY
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const dateStr = `${dd}${mm}${yyyy}`;

    const projects = [
      { 
        id: `PQBNA${dateStr}0001`, name: 'ซ่อมท่อน้ำแตก ด่วน', status: 'In Progress', 
        budget: 5000, type: 'Quick service', address: 'Bangna',
        start_date: '2026-08-10', end_date: '2026-08-15'
      },
      { 
        id: `PIHQ0${dateStr}0002`, name: 'ติดตั้งแอร์ 5 ตัว อาคาร A', status: 'To Do', 
        budget: 15000, type: 'Installer Service', address: 'HQ0',
        start_date: '2026-08-14', end_date: '2026-08-20'
      },
      { 
        id: `PRRM9${dateStr}0003`, name: 'Renovate ออฟฟิศชั้น 2', status: 'Active', 
        budget: 500000, type: 'Renovate Service', address: 'Rama 9',
        start_date: '2026-08-01', end_date: '2026-12-31'
      },
      { 
        id: `PBBNA${dateStr}0004`, name: 'บิ้วอินตู้เสื้อผ้าและครัว', status: 'Done', 
        budget: 120000, type: 'Build-In', address: 'Bangna',
        start_date: '2026-07-01', end_date: '2026-07-15'
      },
      { 
        id: `PNLTP${dateStr}0005`, name: 'สร้างบ้าน 2 ชั้น โครงการ Z', status: 'Planning', 
        budget: 4500000, type: 'New House', address: 'Lat Phrao',
        start_date: '2026-09-01', end_date: '2027-03-31'
      },
      { 
        id: `PMRM9${dateStr}0006`, name: 'MA ดูแลระบบไฟรายปี', status: 'Active', 
        budget: 50000, type: 'MA Service', address: 'Rama 9',
        start_date: '2026-01-01', end_date: '2026-12-31'
      }
    ];

    for (const p of projects) {
      await pool.query(
        `INSERT INTO projects (id, name, status, start_date, end_date, budget, project_type, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.status, p.start_date, p.end_date, p.budget, p.type, p.address]
      );
    }
    console.log('Projects seeded with Smart IDs.');

    // 3. Tasks
    const tasks = [
      // Quick Service Tasks
      { id: 't_3001', pid: projects[0].id, assignee: 'u_1001', title: 'ตรวจเช็คท่อน้ำ', status: 'Done', prio: 'High', est: 2 },
      { id: 't_3002', pid: projects[0].id, assignee: 'u_1002', title: 'เปลี่ยนท่อและอุดรอยรั่ว', status: 'In Progress', prio: 'Urgent', est: 4 },
      
      // Renovate Tasks
      { id: 't_3004', pid: projects[2].id, assignee: 'u_1001', title: 'รื้อถอนกำแพงเดิม', status: 'Done', prio: 'High', est: 12 },
      { id: 't_3005', pid: projects[2].id, assignee: 'u_1002', title: 'ติดตั้งฝ้าเพดาน', status: 'In Progress', prio: 'High', est: 40 },
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
