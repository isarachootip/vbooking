import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sendEmail } from './mailService.js';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads

// Serve React build static assets (no-cache so browsers always load latest build)
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));
// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Prevent API responses from being cached by the browser
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});


// Database Connection
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool(
  connectionString 
    ? { 
        connectionString, 
        ssl: (connectionString.includes('neon') || connectionString.includes('sslmode=require') || process.env.DB_SSL === 'true') 
          ? { rejectUnauthorized: false } 
          : false 
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'timesheet',
      }
);

const dbHost = connectionString 
  ? (connectionString.match(/@([^/:]+)/) ? connectionString.match(/@([^/:]+)/)[1] : 'DATABASE_URL (parsed)')
  : (process.env.DB_HOST || 'localhost');
console.log(`Connecting to PostgreSQL database host: ${dbHost}`);

// Auth Middleware to protect backend API routes
const requireAuth = async (req, res, next) => {
  const publicPaths = [
    '/auth/login', 
    '/auth/line', 
    '/auth/line/callback', 
    '/db-status',
    '/webhooks/github',
    '/webhooks/gitlab'
  ];
  
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) {
    return next();
  }

  const userId = req.headers['x-user-id'] || req.query['userId'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user session' });
    }
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.use('/api', requireAuth);

// Initialize DB schema & seed if empty
const initDB = async () => {
  try {
    const client = await pool.connect();

    // Create Migrations Table (for one-time migrations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        avatar TEXT,
        global_role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        gender VARCHAR(50),
        birthday VARCHAR(50),
        skills TEXT[] DEFAULT '{}'
      );
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wfh_days TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_files JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS line_id VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phones TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS job_types TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS service_zones TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS work_slots TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS criminal_record VARCHAR(100) DEFAULT 'ไม่มี';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_term_days INTEGER DEFAULT 30;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS technician_level VARCHAR(50) DEFAULT 'Standard';
    `);

    // Create Permission Schemes Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permission_schemes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS master_branches (
          id VARCHAR(50) PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(150) NOT NULL,
          province VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Active',
          created_at VARCHAR(50),
          updated_at VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS master_zones (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          created_at VARCHAR(50)
      );
    `);

    // Create Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50),
        budget NUMERIC,
        members JSONB DEFAULT '[]'::jsonb
      );
    `);
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS permission_scheme_id VARCHAR(50);
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'dev';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS support_task_style VARCHAR(50) DEFAULT 'categories';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoiced_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS collected_value NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_expense NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_expense NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS extra_details JSONB DEFAULT '{}'::jsonb;
    `);

    // Create Project Workflows Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_workflows (
        project_id VARCHAR(50) PRIMARY KEY,
        statuses JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
        transitions JSONB DEFAULT '[]'::jsonb
      );
    `);

    // Create Sprints Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        status VARCHAR(50) NOT NULL,
        start_date VARCHAR(50),
        end_date VARCHAR(50)
      );
    `);

    // Create Releases Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        status VARCHAR(50) NOT NULL,
        release_date VARCHAR(50)
      );
    `);

    // Create Tasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        assignee_id VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        estimated_hours NUMERIC NOT NULL DEFAULT 0,
        created_at VARCHAR(50) NOT NULL,
        parent_id VARCHAR(50)
      );
    `);
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date VARCHAR(50);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id VARCHAR(50);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS release_id VARCHAR(50);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS issue_type VARCHAR(50) DEFAULT 'Task';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at VARCHAR(50);
    `);
    await client.query(`
      UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;
    `);

    // Create Master Project Types Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_project_types (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        default_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
        created_at VARCHAR(50)
      );
    `);

    // Create Milestone Templates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestone_templates (
        id VARCHAR(50) PRIMARY KEY,
        master_type_id VARCHAR(50) REFERENCES master_project_types(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        sequence_order INTEGER DEFAULT 0
      );
    `);

    // Create Task Templates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
        start_percent NUMERIC NOT NULL DEFAULT 0,
        end_percent NUMERIC NOT NULL DEFAULT 100,
        estimated_hours NUMERIC NOT NULL DEFAULT 0,
        project_template_name VARCHAR(100) DEFAULT 'General'
      );
      ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS project_template_name VARCHAR(100) DEFAULT 'General';
      ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS milestone_template_id VARCHAR(50) REFERENCES milestone_templates(id) ON DELETE SET NULL;
      ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS required_proof VARCHAR(50);
    `);

    // Create Project Messages Table (for internal chat)
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_messages (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
    `);

    // Create Chat Notifications Table (for mentions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_notifications (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        message_id VARCHAR(50) NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
        sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create Timesheets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        project_id VARCHAR(50) NOT NULL,
        task_id VARCHAR(50),
        date VARCHAR(50) NOT NULL,
        hours NUMERIC NOT NULL,
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        description TEXT,
        status VARCHAR(50) NOT NULL,
        approved_by VARCHAR(50),
        approved_at VARCHAR(50)
      );
    `);
    await client.query(`
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS start_time VARCHAR(10);
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS end_time VARCHAR(10);
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS work_results TEXT;
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS planned_hours NUMERIC;
      ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS updated_at VARCHAR(50);
    `);
    await client.query(`
      UPDATE timesheets SET updated_at = COALESCE(approved_at, date) WHERE updated_at IS NULL;
    `);

    // Create Task Commits Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_commits (
        id VARCHAR(50) PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL,
        commit_hash VARCHAR(50) NOT NULL,
        message TEXT,
        author VARCHAR(100),
        timestamp VARCHAR(50)
      );
    `);

    // Create Project Baselines Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_baselines (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_baseline_per_project 
      ON project_baselines (project_id) 
      WHERE is_active = TRUE;
    `);

    // Create Task Snapshots Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_snapshots (
        id VARCHAR(50) PRIMARY KEY,
        baseline_id VARCHAR(50) NOT NULL,
        task_id VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        estimated_hours NUMERIC NOT NULL DEFAULT 0,
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        story_points INTEGER DEFAULT 0,
        assignee_id VARCHAR(50),
        parent_id VARCHAR(50),
        sprint_id VARCHAR(50),
        release_id VARCHAR(50)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_snapshots_baseline ON task_snapshots(baseline_id);
      CREATE INDEX IF NOT EXISTS idx_task_snapshots_task ON task_snapshots(task_id);
    `);

    // Create Cost Rates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_rates (
        id VARCHAR(50) PRIMARY KEY,
        role_name VARCHAR(150) UNIQUE NOT NULL,
        rate_per_day NUMERIC DEFAULT 0,
        rate_per_hour NUMERIC DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'THB'
      );
    `);

    // Create Service Price Book Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_price_book (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(100),
        service_name VARCHAR(255) NOT NULL,
        unit_type VARCHAR(50) NOT NULL,
        material_cost NUMERIC DEFAULT 0,
        labor_cost NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create System Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL
      );
    `);

    // Create Leads Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50),
        customer_address TEXT,
        customer_latitude NUMERIC,
        customer_longitude NUMERIC,
        map_url TEXT,
        job_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'New',
        notes TEXT,
        created_at VARCHAR(50) NOT NULL,
        updated_at VARCHAR(50) NOT NULL,
        project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL
      );
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_latitude NUMERIC;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_longitude NUMERIC;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS map_url TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_date VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_assignee VARCHAR(150);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_first_name VARCHAR(100);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_last_name VARCHAR(100);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_contact_id VARCHAR(50);

      UPDATE leads SET 
        customer_first_name = CASE 
          WHEN POSITION(' ' IN customer_name) > 0 THEN SUBSTRING(customer_name FROM 1 FOR POSITION(' ' IN customer_name) - 1)
          ELSE customer_name 
        END,
        customer_last_name = CASE 
          WHEN POSITION(' ' IN customer_name) > 0 THEN SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1)
          ELSE '' 
        END
      WHERE customer_first_name IS NULL OR customer_first_name = '';

      CREATE TABLE IF NOT EXISTS lead_followups (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        appointment_date VARCHAR(50),
        appointment_time VARCHAR(50),
        assignee_name VARCHAR(150),
        notes TEXT,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(150)
      );

      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        province VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        full_name VARCHAR(255),
        address TEXT,
        latitude NUMERIC(10,8),
        longitude NUMERIC(11,8),
        open_time VARCHAR(50) DEFAULT '07:00',
        close_time VARCHAR(50) DEFAULT '21:00',
        phone VARCHAR(50) DEFAULT '1308',
        store_group VARCHAR(100) DEFAULT 'TWD',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default cost rates if table is empty
    const costRatesCount = await client.query('SELECT COUNT(*) FROM cost_rates');
    if (parseInt(costRatesCount.rows[0].count) === 0) {
      console.log('Seeding default cost rates...');
      const defaultRates = [
        { id: 'cr_1', role_name: 'Business Solution Analyst', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_2', role_name: 'Tech Lead / Architecture', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_3', role_name: 'Backend Developer', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_4', role_name: 'Frontend Developer', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_5', role_name: 'Integration Engineer', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_6', role_name: 'Quality Assurance', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_7', role_name: 'Scrum Master / Project', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_8', role_name: 'DevOps / Release Mgmt', rate_per_day: 6500, rate_per_hour: 812.5 },
        { id: 'cr_9', role_name: 'Application Support', rate_per_day: 6500, rate_per_hour: 812.5 },
      ];
      for (const r of defaultRates) {
        await client.query(
          `INSERT INTO cost_rates (id, role_name, rate_per_day, rate_per_hour, currency) VALUES ($1, $2, $3, $4, $5)`,
          [r.id, r.role_name, r.rate_per_day, r.rate_per_hour, 'THB']
        );
      }
    }

    // Seed permission schemes if empty (independent of user count)
    const schemeCount = await client.query('SELECT COUNT(*) FROM permission_schemes');
    if (parseInt(schemeCount.rows[0].count) === 0) {
      console.log('Seeding default permission scheme...');
      const defaultScheme = {
        id: 'scheme_default',
        name: 'Default Permission Scheme',
        description: 'Standard permissions for project members, managers, and admins.',
        permissions: JSON.stringify({
          browse_project: ["Admin", "Manager", "PM", "Team Lead", "Member"],
          create_task: ["Admin", "PM", "Team Lead", "Member"],
          edit_task: ["Admin", "PM", "Team Lead", "Assignee"],
          assign_task: ["Admin", "Manager", "PM", "Team Lead"],
          delete_task: ["Admin", "PM", "Team Lead"],
          transition_task: ["Admin", "PM", "Team Lead", "Assignee", "Member"],
          manage_sprints: ["Admin", "PM", "Team Lead"],
          manage_releases: ["Admin", "PM", "Team Lead"],
          manage_members: ["Admin", "PM", "Team Lead"]
        })
      };
      await client.query(
        'INSERT INTO permission_schemes (id, name, description, permissions) VALUES ($1, $2, $3, $4)',
        [defaultScheme.id, defaultScheme.name, defaultScheme.description, defaultScheme.permissions]
      );
      
      // Update existing projects to link to default scheme if null
      await client.query("UPDATE projects SET permission_scheme_id = 'scheme_default' WHERE permission_scheme_id IS NULL");
    }

    // Seed project workflows if empty (independent of user count)
    const workflowCount = await client.query('SELECT COUNT(*) FROM project_workflows');
    if (parseInt(workflowCount.rows[0].count) === 0) {
      console.log('Seeding default project workflows...');
      const projectsRes = await client.query('SELECT id FROM projects');
      for (const p of projectsRes.rows) {
        const defaultWorkflow = {
          projectId: p.id,
          statuses: JSON.stringify(["To Do", "In Progress", "Review", "Done"]),
          transitions: JSON.stringify([
            { from: "To Do", to: "In Progress", conditions: [] },
            { from: "In Progress", to: "Review", conditions: [] },
            { from: "In Progress", to: "To Do", conditions: [] },
            { from: "Review", to: "Done", conditions: [] },
            { from: "Review", to: "In Progress", conditions: [] },
            { from: "Done", to: "In Progress", conditions: [{ type: "pm_or_admin_only" }] }
          ])
        };
        await client.query(
          'INSERT INTO project_workflows (project_id, statuses, transitions) VALUES ($1, $2, $3) ON CONFLICT (project_id) DO NOTHING',
          [defaultWorkflow.projectId, defaultWorkflow.statuses, defaultWorkflow.transitions]
        );
      }
    }

    // Check if seeding is needed
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      
      // Seed users
      const mockUsers = [
        { id: 'u1', name: 'John Doe', email: 'john.doe@company.com', avatar: 'https://i.pravatar.cc/150?u=u1', globalRole: 'Manager', department: 'Engineering' },
        { id: 'u2', name: 'Jane Smith', email: 'jane.smith@company.com', avatar: 'https://i.pravatar.cc/150?u=u2', globalRole: 'Employee', department: 'Engineering' },
        { id: 'u3', name: 'Mike Johnson', email: 'mike.j@company.com', avatar: 'https://i.pravatar.cc/150?u=u3', globalRole: 'Employee', department: 'Design' },
        { id: 'u4', name: 'isarachootip', email: 'isarachootip@gmail.com', avatar: 'https://i.pravatar.cc/150?u=u4', globalRole: 'Admin', department: 'Management' }
      ];
      const defaultPwHash = crypto.createHash('sha256').update('password123').digest('hex');
      for (const u of mockUsers) {
        await client.query(
          'INSERT INTO users (id, name, email, avatar, global_role, department, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [u.id, u.name, u.email, u.avatar, u.globalRole, u.department, defaultPwHash]
        );
      }

      // Seed permission schemes
      const defaultScheme = {
        id: 'scheme_default',
        name: 'Default Permission Scheme',
        description: 'Standard permissions for project members, managers, and admins.',
        permissions: JSON.stringify({
          browse_project: ["Admin", "Manager", "PM", "Team Lead", "Member"],
          create_task: ["Admin", "PM", "Team Lead", "Member"],
          edit_task: ["Admin", "PM", "Team Lead", "Assignee"],
          assign_task: ["Admin", "Manager", "PM", "Team Lead"],
          delete_task: ["Admin", "PM", "Team Lead"],
          transition_task: ["Admin", "PM", "Team Lead", "Assignee", "Member"],
          manage_sprints: ["Admin", "PM", "Team Lead"],
          manage_releases: ["Admin", "PM", "Team Lead"],
          manage_members: ["Admin", "PM", "Team Lead"]
        })
      };
      await client.query(
        'INSERT INTO permission_schemes (id, name, description, permissions) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [defaultScheme.id, defaultScheme.name, defaultScheme.description, defaultScheme.permissions]
      );

      // Seed projects
      const mockProjects = [
        {
          id: 'p1',
          name: 'โครงการติดตั้งระบบไฟและน้ำ บ้านคุณสมศักดิ์',
          description: 'งานเดินสายไฟระบบฝังผนัง ติดตั้งระบบประปาห้องน้ำ และประกอบโคมไฟภายในบ้านเดี่ยว 2 ชั้น',
          status: 'Active',
          startDate: '2026-06-01',
          endDate: '2026-08-30',
          budget: 50000,
          members: JSON.stringify([
            { userId: 'u1', role: 'PM' },
            { userId: 'u2', role: 'ช่างไฟ' },
            { userId: 'u3', role: 'ช่างประปา' }
          ]),
          permissionSchemeId: 'scheme_default'
        },
        {
          id: 'p2',
          name: 'โครงการรีโนเวทห้องครัว ทาวน์โฮมสุขุมวิท',
          description: 'งานรื้อเคาน์เตอร์ครัวเก่า ปูกระเบื้องผนังใหม่ ติดตั้งตู้บิวท์อิน เครื่องดูดควัน และอ่างล้างจาน',
          status: 'Planning',
          startDate: '2026-07-15',
          endDate: '2026-10-30',
          budget: 120000,
          members: JSON.stringify([
            { userId: 'u1', role: 'PM' },
            { userId: 'u2', role: 'ช่างปูกระเบื้อง' },
            { userId: 'u3', role: 'ช่างติดตั้งเฟอร์นิเจอร์' }
          ]),
          permissionSchemeId: 'scheme_default'
        }
      ];
      for (const p of mockProjects) {
        await client.query(
          'INSERT INTO projects (id, name, description, status, start_date, end_date, budget, members, permission_scheme_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [p.id, p.name, p.description, p.status, p.startDate, p.endDate, p.budget, p.members, p.permissionSchemeId]
        );

        // Seed project workflows
        const defaultWorkflow = {
          projectId: p.id,
          statuses: JSON.stringify(["To Do", "In Progress", "Review", "Done"]),
          transitions: JSON.stringify([
            { from: "To Do", to: "In Progress", conditions: [] },
            { from: "In Progress", to: "Review", conditions: [] },
            { from: "In Progress", to: "To Do", conditions: [] },
            { from: "Review", to: "Done", conditions: [] },
            { from: "Review", to: "In Progress", conditions: [] },
            { from: "Done", to: "In Progress", conditions: [{ type: "pm_or_admin_only" }] }
          ])
        };
        await client.query(
          'INSERT INTO project_workflows (project_id, statuses, transitions) VALUES ($1, $2, $3)',
          [defaultWorkflow.projectId, defaultWorkflow.statuses, defaultWorkflow.transitions]
        );
      }

      // Seed tasks
      const mockTasks = [
        { id: 't1', projectId: 'p1', assigneeId: 'u3', title: 'Design UI Mockups', description: 'Create high-fidelity mockups for the dashboard.', status: 'Done', priority: 'High', estimatedHours: 16, createdAt: '2026-06-02T10:00:00Z' },
        { id: 't2', projectId: 'p1', assigneeId: 'u2', title: 'Setup React + Vite Foundation', description: 'Initialize the frontend project and set up routing.', status: 'Done', priority: 'Urgent', estimatedHours: 8, createdAt: '2026-06-03T09:00:00Z' },
        { id: 't3', projectId: 'p1', assigneeId: 'u2', title: 'Implement Task Board', description: 'Create the Kanban board for task management.', status: 'In Progress', priority: 'High', estimatedHours: 24, createdAt: '2026-06-05T11:00:00Z' },
        { id: 't4', projectId: 'p1', assigneeId: 'u1', title: 'Review System Architecture', description: 'Review and approve the system architecture document.', status: 'Review', priority: 'Medium', estimatedHours: 4, createdAt: '2026-06-06T14:00:00Z' }
      ];
      for (const t of mockTasks) {
        await client.query(
          'INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [t.id, t.projectId, t.assigneeId, t.title, t.description, t.status, t.priority, t.estimatedHours, t.createdAt]
        );
      }

      // Seed timesheets
      const mockTimesheets = [
        { id: 'ts1', userId: 'u2', projectId: 'p1', taskId: 't2', date: '2026-06-03', hours: 8, description: 'Completed setup and initial routing', status: 'Approved', approvedBy: 'u1', approvedAt: '2026-06-04T09:00:00Z' },
        { id: 'ts2', userId: 'u3', projectId: 'p1', taskId: 't1', date: '2026-06-04', hours: 6, description: 'Worked on dashboard mockups', status: 'Approved', approvedBy: 'u1', approvedAt: '2026-06-05T09:00:00Z' },
        { id: 'ts3', userId: 'u2', projectId: 'p1', taskId: 't3', date: '2026-06-08', hours: 7, description: 'Implemented the base layout for Kanban board', status: 'Pending' },
        { id: 'ts4', userId: 'u2', projectId: 'p1', taskId: 't3', date: '2026-06-09', hours: 5, description: 'Added drag and drop functionality', status: 'Pending' }
      ];
      for (const ts of mockTimesheets) {
        await client.query(
          'INSERT INTO timesheets (id, user_id, project_id, task_id, date, hours, description, status, approved_by, approved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [ts.id, ts.userId, ts.projectId, ts.taskId, ts.date, ts.hours, ts.description, ts.status, ts.approvedBy, ts.approvedAt]
        );
      }
      console.log('Seeding finished successfully.');
    }

    // Seed Master Project Types if empty
    const masterTypeCount = await client.query('SELECT COUNT(*) FROM master_project_types');
    if (parseInt(masterTypeCount.rows[0].count) === 0) {
      console.log('Seeding Master Project Types...');
      const defaultMasterTypes = [
        { id: 'mpt_1', name: 'Quick Service', description: 'งานบริการด่วนและแก้ไขซ่อมแซมเร่งด่วน', default_columns: '["To Do", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_2', name: 'Installation', description: 'งานติดตั้งอุปกรณ์และประกอบระบบ', default_columns: '["To Do", "Buy-Survey", "Survey", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_3', name: 'Renovate', description: 'งานปรับปรุงบ้านและตกแต่งครบวงจร', default_columns: '["To Do", "Buy-Survey", "Survey", "Design", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_4', name: 'New Home', description: 'งานก่อสร้างบ้านใหม่ตั้งแต่ต้นจนจบ', default_columns: '["To Do", "Buy-Survey", "Survey", "Design", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_5', name: 'Maintenance', description: 'งานดูแลรักษาและซ่อมบำรุงตามสัญญา MA', default_columns: '["To Do", "Buy-Survey", "Survey", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' }
      ];
      for (const mt of defaultMasterTypes) {
        await client.query(
          'INSERT INTO master_project_types (id, name, description, default_columns, created_at) VALUES ($1, $2, $3, $4, $5)',
          [mt.id, mt.name, mt.description, mt.default_columns, new Date().toISOString()]
        );
      }
      console.log('Seeded Master Project Types.');
    }

    // Seed task templates if empty
    const templateCount = await client.query('SELECT COUNT(*) FROM task_templates');
    if (parseInt(templateCount.rows[0].count) === 0) {
      console.log('Seeding default task templates...');
      const defaultTemplates = [
        { id: 'tpl_1', title: 'Kick off Meeting', description: 'Align project stakeholders, clarify roles, objectives, and communication guidelines.', priority: 'High', start_percent: 0, end_percent: 2, estimated_hours: 4 },
        { id: 'tpl_2', title: 'SOW & Contract Sign off', description: 'Review, negotiate, and execute formal Statement of Work and contract agreements.', priority: 'High', start_percent: 2, end_percent: 6, estimated_hours: 8 },
        { id: 'tpl_3', title: 'Get Requirements & User Stories', description: 'Conduct requirement gathering sessions, detail user stories and acceptances.', priority: 'Medium', start_percent: 6, end_percent: 20, estimated_hours: 16 },
        { id: 'tpl_4', title: 'UX/UI Design & Prototyping', description: 'Design wireframes, mockups, design systems, and clickable prototypes.', priority: 'Medium', start_percent: 20, end_percent: 35, estimated_hours: 24 },
        { id: 'tpl_5', title: 'Setup Cloud Infrastructure & Environments', description: 'Provision servers, networks, PostgreSQL database clusters, SSL certificates, staging environment.', priority: 'Medium', start_percent: 25, end_percent: 32, estimated_hours: 12 },
        { id: 'tpl_6', title: 'API Contract & Backend Architecture Setup', description: 'Structure code repository, setup Express/Database config, write boilerplate APIs.', priority: 'High', start_percent: 32, end_percent: 40, estimated_hours: 16 },
        { id: 'tpl_7', title: 'Core Backend & Frontend Development', description: 'Code the core logic, business logic controllers, database integration, UI state management.', priority: 'High', start_percent: 40, end_percent: 75, estimated_hours: 40 },
        { id: 'tpl_8', title: 'Data Migration & Seeding', description: 'Develop ETL scripts, clean production dataset, perform dry-run imports.', priority: 'Medium', start_percent: 70, end_percent: 75, estimated_hours: 16 },
        { id: 'tpl_9', title: 'SIT (System Integration Testing)', description: 'Conduct end-to-end integration tests, trace network logs, and resolve edge cases.', priority: 'High', start_percent: 75, end_percent: 85, estimated_hours: 16 },
        { id: 'tpl_10', title: 'UAT (User Acceptance Testing)', description: 'User-facing validation testing, gather customer feedback, patch blocking bugs.', priority: 'Urgent', start_percent: 85, end_percent: 95, estimated_hours: 24 },
        { id: 'tpl_11', title: 'Production Release & Handover', description: 'Deploy build artifacts to production, verify functionality, transfer credentials and documentation.', priority: 'Urgent', start_percent: 95, end_percent: 100, estimated_hours: 8 }
      ];
      for (const tpl of defaultTemplates) {
        await client.query(
          'INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [tpl.id, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours]
        );
      }
      console.log('Seeded default task templates.');
    }

    // Seed Kitchen Renovation templates if not present
    const kitchenTemplateCount = await client.query("SELECT COUNT(*) FROM task_templates WHERE project_template_name = 'Kitchen Renovation' OR project_template_name = 'รีโนเวทห้องครัว'");
    if (parseInt(kitchenTemplateCount.rows[0].count) === 0) {
      console.log('Seeding Kitchen Renovation task templates...');
      const kitchenTemplates = [
        { id: 'tpl_k1', title: 'สำรวจหน้างานและวัดพื้นที่จริง (Kitchen Survey)', description: 'สำรวจโครงสร้างเดิม วัดขนาดพื้นที่ ผนัง ตำแหน่งท่อน้ำ ท่อระบายน้ำ และปลั๊กไฟเดิม', priority: 'High', start_percent: 0, end_percent: 5, estimated_hours: 8, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k2', title: 'ออกแบบแปลนและ 3D Perspective (Kitchen 3D Design)', description: 'วางแปลนจัดสรรพื้นที่ (Work Triangle: ตู้เย็น อ่างล้างจาน เตา) ออกแบบภาพ 3D และเลือกวัสดุ', priority: 'High', start_percent: 5, end_percent: 20, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k3', title: 'รื้อถอนเคาน์เตอร์และระบบเดิม (Demolition)', description: 'รื้อถอนตู้บิวท์อิน เคาน์เตอร์ปูน กระเบื้องผนังเดิม และขนย้ายเศษวัสดุไปทิ้ง', priority: 'High', start_percent: 20, end_percent: 35, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k4', title: 'เดินระบบไฟฟ้าและประปาใหม่ (Electrical & Plumbing)', description: 'เดินท่อน้ำดี ท่อน้ำทิ้ง ท่อแก๊ส/เครื่องดูดควัน และเดินสายไฟปลั๊กไฟสำหรับเครื่องใช้ไฟฟ้า', priority: 'High', start_percent: 35, end_percent: 50, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k5', title: 'หล่อเคาน์เตอร์ปูนและงานปูกระเบื้อง (Masonry & Tiling)', description: 'ก่อโครงสร้างเคาน์เตอร์ปูน ฉาบเรียบ ปูกระเบื้องพื้นและกระเบื้องผนังกันเปื้อน (Backsplash)', priority: 'High', start_percent: 50, end_percent: 70, estimated_hours: 24, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k6', title: 'ติดตั้งท็อปเคาน์เตอร์และตู้บิวท์อิน (Countertop & Cabinets)', description: 'ติดตั้งท็อปหินสังเคราะห์/หินแกรนิต ติดตั้งตู้แขวน บิวท์อินตู้ใต้เคาน์เตอร์ และหน้าบาน', priority: 'High', start_percent: 70, end_percent: 85, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k7', title: 'ติดตั้งซิงค์ อุปกรณ์ไฟฟ้า และฟิตติ้ง (Sink & Appliances)', description: 'ติดตั้งอ่างล้างจาน ก๊อกน้ำ เตาไฟฟ้า เครื่องดูดควัน โคมไฟ และอุปกรณ์ฟิตติ้ง', priority: 'Medium', start_percent: 85, end_percent: 95, estimated_hours: 12, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k8', title: 'ทำความสะอาด ตรวจรับงานและส่งมอบ (Final Cleaning & Handover)', description: 'เก็บงานทาสี ทำความสะอาดคราบปูนคราบกาว ตรวจสอบระบบน้ำ/ไฟ และส่งมอบงานให้ลูกค้า', priority: 'Urgent', start_percent: 95, end_percent: 100, estimated_hours: 8, project_template_name: 'Kitchen Renovation' }
      ];
      for (const tpl of kitchenTemplates) {
        await client.query(
          'INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [tpl.id, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours, tpl.project_template_name]
        );
      }
      console.log('Seeded Kitchen Renovation task templates.');
    }

    // Seed Quick Service templates if not present
    const quickTemplateCount = await client.query("SELECT COUNT(*) FROM task_templates WHERE project_template_name = 'Quick Service'");
    if (parseInt(quickTemplateCount.rows[0].count) === 0) {
      console.log('Seeding Quick Service task templates...');
      const quickTemplates = [
        { id: 'tpl_q1', title: 'สำรวจและประเมินงานหน้างาน (Survey)', description: 'ตรวจสอบปัญหาหน้างานและประเมินแนวทางแก้ไข', priority: 'High', start_percent: 0, end_percent: 20, estimated_hours: 1, project_template_name: 'Quick Service' },
        { id: 'tpl_q2', title: 'ดำเนินการแก้ไข/ซ่อมแซม (Execution)', description: 'ดำเนินการแก้ไขปัญหาตามที่ประเมินไว้', priority: 'Urgent', start_percent: 20, end_percent: 80, estimated_hours: 3, project_template_name: 'Quick Service' },
        { id: 'tpl_q3', title: 'ตรวจสอบและส่งมอบงาน (QA & Handover)', description: 'ตรวจสอบความเรียบร้อยและส่งมอบงานให้ลูกค้า', priority: 'High', start_percent: 80, end_percent: 100, estimated_hours: 1, project_template_name: 'Quick Service' }
      ];
      for (const tpl of quickTemplates) {
        await client.query(
          'INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [tpl.id, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours, tpl.project_template_name]
        );
      }
      console.log('Seeded Quick Service task templates.');
    }

    // Seed Installation templates if not present
    const installTemplateCount = await client.query("SELECT COUNT(*) FROM task_templates WHERE project_template_name = 'Installation'");
    if (parseInt(installTemplateCount.rows[0].count) === 0) {
      console.log('Seeding Installation task templates...');
      const installTemplates = [
        { id: 'tpl_i1', title: 'เตรียมอุปกรณ์และเข้าพื้นที่ (Preparation)', description: 'เบิกอุปกรณ์จากสโตร์และเดินทางเข้าพื้นที่หน้างาน', priority: 'Medium', start_percent: 0, end_percent: 10, estimated_hours: 2, project_template_name: 'Installation' },
        { id: 'tpl_i2', title: 'ดำเนินการติดตั้ง (Installation)', description: 'ติดตั้งอุปกรณ์ตามแบบและมาตรฐาน', priority: 'High', start_percent: 10, end_percent: 70, estimated_hours: 6, project_template_name: 'Installation' },
        { id: 'tpl_i3', title: 'ทดสอบระบบ (Testing & QA)', description: 'ทดสอบการทำงานของระบบหลังติดตั้งเสร็จ', priority: 'Urgent', start_percent: 70, end_percent: 90, estimated_hours: 2, project_template_name: 'Installation' },
        { id: 'tpl_i4', title: 'ส่งมอบงานและแนะนำการใช้งาน (Handover)', description: 'ส่งมอบงานให้ลูกค้าและอธิบายวิธีการใช้งาน', priority: 'Medium', start_percent: 90, end_percent: 100, estimated_hours: 1, project_template_name: 'Installation' }
      ];
      for (const tpl of installTemplates) {
        await client.query(
          'INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [tpl.id, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours, tpl.project_template_name]
        );
      }
      console.log('Seeded Installation task templates.');
    }

    // Ensure all existing users have a password hash
    const defaultPwHash = crypto.createHash('sha256').update('password123').digest('hex');
    await client.query('UPDATE users SET password_hash = $1 WHERE password_hash IS NULL', [defaultPwHash]);

    // Ensure admin user (isarachootip) exists in production
    const adminEmail = 'isarachootip@gmail.com';
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminExists.rows.length === 0) {
      const adminPwHash = crypto.createHash('sha256').update('password123').digest('hex');
      await client.query(
        `INSERT INTO users (id, name, email, avatar, global_role, department, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, email = EXCLUDED.email, global_role = EXCLUDED.global_role,
           department = EXCLUDED.department, password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
        ['u_admin', 'isarachootip', adminEmail, 'https://i.pravatar.cc/150?u=u_admin', 'Admin', 'Management', adminPwHash]
      );
      console.log('✅ Admin user (isarachootip) created.');
    } else {
      // Ensure existing user has Admin role
      await client.query('UPDATE users SET global_role = $1 WHERE email = $2', ['Admin', adminEmail]);
    }

    // ONE-TIME: Set password for all users except isarachootip to 'test123'
    const migrationId = 'set_non_admin_pw_test123';
    const migrationDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migrationId]);
    if (migrationDone.rows.length === 0) {
      const nonAdminPwHash = crypto.createHash('sha256').update('test123').digest('hex');
      await client.query('UPDATE users SET password_hash = $1 WHERE email != $2', [nonAdminPwHash, adminEmail]);
      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migrationId]);
      console.log('✅ One-time migration: set all non-admin passwords to test123.');
    }

    // ONE-TIME: Add Manager to assign_task in default permission scheme
    const migAssign = 'add_manager_to_assign_task';
    const migAssignDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migAssign]);
    if (migAssignDone.rows.length === 0) {
      await client.query(`
        UPDATE permission_schemes 
        SET permissions = jsonb_set(permissions, '{assign_task}', '["Admin", "Manager", "PM"]'::jsonb)
        WHERE permissions->'assign_task' IS NOT NULL
      `);
      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migAssign]);
      console.log('✅ One-time migration: added Manager to assign_task permission.');
    }

    // ONE-TIME: Add Team Lead to default permission scheme
    const migTeamLead = 'add_team_lead_to_default_permission_scheme_v2';
    const migTeamLeadDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migTeamLead]);
    if (migTeamLeadDone.rows.length === 0) {
      await client.query(`
        UPDATE permission_schemes 
        SET permissions = '{
          "browse_project": ["Admin", "Manager", "PM", "Team Lead", "Member"],
          "create_task": ["Admin", "PM", "Team Lead", "Member"],
          "edit_task": ["Admin", "PM", "Team Lead", "Assignee"],
          "assign_task": ["Admin", "Manager", "PM", "Team Lead"],
          "delete_task": ["Admin", "PM", "Team Lead"],
          "transition_task": ["Admin", "PM", "Team Lead", "Assignee", "Member"],
          "manage_sprints": ["Admin", "PM", "Team Lead"],
          "manage_releases": ["Admin", "PM", "Team Lead"],
          "manage_members": ["Admin", "PM", "Team Lead"]
        }'::jsonb
        WHERE id = 'scheme_default'
      `);
      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migTeamLead]);
      console.log('✅ One-time migration: updated default scheme to include Team Lead role.');
    }

    // ONE-TIME: Normalize double spaces in usernames and messages
    const migNormalizeSpaces = 'normalize_user_and_message_spaces_v1';
    const migNormalizeSpacesDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migNormalizeSpaces]);
    if (migNormalizeSpacesDone.rows.length === 0) {
      await client.query("UPDATE users SET name = regexp_replace(name, '\\s+', ' ', 'g')");
      await client.query("UPDATE project_messages SET text = regexp_replace(text, 'Isara  chootip', 'Isara chootip', 'g')");
      await client.query("UPDATE project_messages SET text = regexp_replace(text, 'Isara[\\s]{2,8}chootip', 'Isara chootip', 'g')");
      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migNormalizeSpaces]);
      console.log('✅ One-time migration: normalized spaces in usernames and messages.');
    }

    // Auto-create initial plan baseline for existing projects with tasks
    const projectsWithTasksRes = await client.query(`
      SELECT DISTINCT p.id, p.name FROM projects p 
      JOIN tasks t ON t.project_id = p.id
      WHERE NOT EXISTS (SELECT 1 FROM project_baselines WHERE project_id = p.id)
    `);
    for (const p of projectsWithTasksRes.rows) {
      console.log(`Auto-generating initial baseline for existing project: ${p.name}`);
      const baselineId = 'b_' + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();
      
      await client.query(
        `INSERT INTO project_baselines (id, project_id, name, description, created_at, is_active)
         VALUES ($1, $2, 'Initial Plan', 'Automatically captured initial workspace plan.', $3, TRUE)`,
        [baselineId, p.id, createdAt]
      );
      
      const tasksRes = await client.query(
        `SELECT id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id 
         FROM tasks WHERE project_id = $1`,
        [p.id]
      );
      for (const t of tasksRes.rows) {
        const snapId = 'snap_' + Math.random().toString(36).substr(2, 9);
        await client.query(
          `INSERT INTO task_snapshots (id, baseline_id, task_id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [snapId, baselineId, t.id, t.title, t.description || '', t.status, t.priority, t.estimated_hours || 0, t.start_date, t.end_date, t.story_points || 0, t.assignee_id, t.parent_id, t.sprint_id, t.release_id]
        );
      }
    }

    client.release();
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
};

// Start initialization with retry logic
let dbReady = false;
async function startWithRetry(attempt = 1) {
  try {
    await initDB();
    dbReady = true;
    console.log('✅ Database connected and initialized successfully.');
  } catch (err) {
    console.error(`⚠️  DB init attempt ${attempt} failed: ${err.message}`);
    console.log(`🔄 Retrying in 5 seconds...`);
    setTimeout(() => startWithRetry(attempt + 1), 5000);
  }
}
startWithRetry();

// --- API Endpoints ---

// LINE OAuth Authentication
app.get('/api/auth/line', (req, res) => {
  const origin = req.query.origin || `${req.protocol}://${req.get('host')}`;
  const channelId = process.env.LINE_CHANNEL_ID;
  const callbackUrl = process.env.LINE_CALLBACK_URL;
  
  if (!channelId || !callbackUrl) {
    console.error('LINE configuration is missing in environment variables');
    return res.status(500).send('LINE configuration missing in server environment');
  }

  // Preserve the client origin in the state parameter
  const state = `state_${Math.random().toString(36).substring(2, 10)}__origin_${encodeURIComponent(origin)}`;
  const redirectUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=profile%20openid%20email`;
  res.redirect(redirectUrl);
});

app.get('/api/auth/line/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // Extract client origin from state
  let clientOrigin = `${req.protocol}://${req.get('host')}`;
  if (state && state.includes('__origin_')) {
    try {
      const parts = state.split('__origin_');
      if (parts[1]) {
        clientOrigin = decodeURIComponent(parts[1]);
      }
    } catch (e) {
      console.error('Failed to parse origin from state:', e);
    }
  }

  if (error) {
    return res.redirect(`${clientOrigin}/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${clientOrigin}/?error=no_code_provided`);
  }
  
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const callbackUrl = process.env.LINE_CALLBACK_URL;
  
  try {
    // 1. Exchange authorization code for token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Failed to exchange token');
    }
    
    const idToken = tokenData.id_token;
    if (!idToken) {
      throw new Error('No ID Token returned from LINE');
    }
    
    // Decode JWT payload
    const payloadPart = idToken.split('.')[1];
    const payloadDecoded = Buffer.from(payloadPart, 'base64').toString('utf8');
    const payload = JSON.parse(payloadDecoded);
    
    const lineUserId = payload.sub; // LINE User ID (UUID)
    const lineName = payload.name;
    const linePicture = payload.picture;
    const lineEmail = payload.email; // may be undefined if not authorized
    
    if (!lineUserId) {
      throw new Error('No user ID found in LINE token');
    }
    
    // 2. Query database for user by line_user_id
    let userRes = await pool.query('SELECT * FROM users WHERE line_user_id = $1', [lineUserId]);
    let user = userRes.rows[0];
    
    // 3. Fallback: If new LINE login, check by corporate email
    if (!user && lineEmail) {
      userRes = await pool.query('SELECT * FROM users WHERE email = $1', [lineEmail]);
      user = userRes.rows[0];
      if (user) {
        // Automatically bind the LINE ID to pre-created profile
        await pool.query(
          'UPDATE users SET line_user_id = $1, avatar = COALESCE(avatar, $2) WHERE id = $3',
          [lineUserId, linePicture || `https://i.pravatar.cc/150?u=${user.id}`, user.id]
        );
        user.line_user_id = lineUserId;
        if (!user.avatar) user.avatar = linePicture;
      }
    }
    
    if (!user) {
      // User not pre-registered in database
      return res.redirect(`${clientOrigin}/?error=unauthorized&email=${encodeURIComponent(lineEmail || '')}`);
    }
    
    // Map DB columns to camelCase JS object
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      globalRole: user.global_role,
      department: user.department,
      gender: user.gender,
      birthday: user.birthday,
      skills: user.skills
    };
    
    // Redirect back to frontend success route
    res.redirect(`${clientOrigin}/login-success?user=${encodeURIComponent(JSON.stringify(userData))}`);
    
  } catch (err) {
    console.error('LINE Callback Error:', err.message);
    res.redirect(`${clientOrigin}/?error=${encodeURIComponent(err.message)}`);
  }
});

// Chatbot API Endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const keyRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'");
    const apiKey = keyRes.rows[0]?.setting_value;

    if (apiKey) {
      const systemPrompt = `คุณคือ AI Assistant ประจำระบบ NexTime (ระบบบริหารจัดการโปรเจกต์และทรัพยากรบุคคล)
หน้าที่ของคุณคือช่วยเหลือผู้ใช้งาน ตอบคำถามเกี่ยวกับการใช้งานระบบ โดยอ้างอิงจากคู่มือ (FAQ) ต่อไปนี้:
1. ฟีเจอร์หลัก: Agile Task Management, Gantt Chart, Timesheet, Man-Days Tracking, AI Assistant, RBAC
2. การคำนวณ Progress: ถ้าไม่มี Subtask ลากไป In Progress=50%, Review=90%, Done=100%. ถ้ามี Subtask คำนวณจากสัดส่วน Subtask ที่เสร็จ
3. วิธีลบข้อมูล: Timesheet ลบได้ที่หน้าประวัติ, Task ลบได้ที่ไอคอนบนการ์ด หรือหน้า Backlog
4. การย้าย Sprint: ไปที่หน้า Backlog กด Dropdown หลังชื่อ Task เพื่อเปลี่ยน Sprint
5. การเก็บข้อมูล: ข้อมูลแอปเก็บใน PostgreSQL บนเซิร์ฟเวอร์, ความจำ AI เก็บในโฟลเดอร์ .agents
6. Timesheet: Monthly Summary คือชั่วโมงรวมเดือนนี้ (เป้า 160h), Approval Status แสดงชั่วโมงที่อนุมัติแล้วเทียบกับรออนุมัติ (คนอนุมัติคือ Admin, Manager, PM)
7. Issue Type: Story(ฟีเจอร์ลูกค้า), Task(งานเทคนิค), Bug(แก้ข้อผิดพลาด)
8. SP (Story Points): ประเมินความยากง่ายตาม Fibonacci (1,2,3,5,8...) 1 SP คืองานง่ายสุด
9. Timeline & Releases: Timeline คือปฏิทิน Gantt Chart ลากปรับเวลาได้, Releases คือจัดกลุ่มฟีเจอร์อัปเดต
10. Project Roles: ในหน้า Team คือประวัติ(Resume) ว่าใครทำโปรเจกต์อะไรบ้าง ดึงอัตโนมัติ และจะลบอัตโนมัติถ้าถูกเอาชื่อออก
11. แผนงานไม่ขึ้นหลังสร้างโปรเจกต์: ให้รีเฟรชหน้าเว็บ (F5) หรือดูว่าไม่ได้ใส่ End Date ตอนสร้างโปรเจกต์หรือไม่ (ถ้าไม่มี ให้ไปสร้างเองที่เมนู Project Plan)
ตอบคำถามด้วยความสุภาพ เป็นกันเอง เสมือนเป็นเพื่อนร่วมงาน`;

      try {
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        const model = genAI.getGenerativeModel({ 
          model: "gemini-flash-latest",
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent(message);
        const responseText = result.response.text();

        return res.json({ reply: responseText });
      } catch (geminiErr) {
        console.error('Gemini SDK Error:', geminiErr);
        return res.json({ reply: `[Gemini API Error] ${geminiErr.message || 'Unknown SDK Error'}` });
      }



      }

    // Basic Rule-based mock response
    let reply = 'ขออภัยครับ ตอนนี้ผมเป็นเพียงบอททดสอบ ยังไม่สามารถตอบคำถามซับซ้อนได้ครับ (ตั้งค่า API Key เพื่อใช้งาน AI)';
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('สวัสดี') || msgLower.includes('hello') || msgLower.includes('หวัดดี')) {
      reply = 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบ NexTime มีอะไรให้ผมช่วยเหลือไหมครับ?';
    } else if (msgLower.includes('ราคา') || msgLower.includes('แพ็กเกจ') || msgLower.includes('จ่าย')) {
      reply = 'สำหรับข้อมูลราคาและแพ็กเกจการใช้งาน รบกวนติดต่อทีมฝ่ายขายได้เลยครับ ยินดีให้คำปรึกษาครับ';
    } else if (msgLower.includes('ปัญหา') || msgLower.includes('เข้าไม่ได้') || msgLower.includes('พัง')) {
      reply = 'หากพบปัญหาการใช้งาน สามารถแจ้งเรื่องให้ทีม Support ทราบได้เลยครับ เราจะรีบแก้ไขให้เร็วที่สุด';
    }

    // Simulate AI thinking delay
    setTimeout(() => {
      res.json({ reply });
    }, 1000);
  } catch (err) {
    console.error('Chat Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password Authentication Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    if (user.password_hash && user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.password_hash) {
      if (password === 'password123') {
        const defaultHash = crypto.createHash('sha256').update('password123').digest('hex');
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [defaultHash, user.id]);
      } else {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
      globalRole: user.global_role,
      department: user.department,
      gender: user.gender || '',
      birthday: user.birthday || '',
      skills: user.skills || []
    };

    res.json(userData);
  } catch (err) {
    console.error('Password login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ==========================================
// Project Baselines & Versioning API
// ==========================================

const generateId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 9);

// 1. Get all baselines for a project
app.get('/api/projects/:projectId/baselines', async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, project_id as "projectId", name, description, created_at as "createdAt", created_by as "createdBy", is_active as "isActive" 
       FROM project_baselines 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching project baselines:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Create a project plan baseline (Snapshot current tasks)
app.post('/api/projects/:projectId/baselines', async (req, res) => {
  const { projectId } = req.params;
  const { name, description } = req.body;
  const userId = req.headers['x-user-id'];
  const baselineId = generateId('b');
  const createdAt = new Date().toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO project_baselines (id, project_id, name, description, created_at, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [baselineId, projectId, name, description || '', createdAt, userId || null]
    );

    const tasksRes = await client.query(
      `SELECT id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id 
       FROM tasks WHERE project_id = $1`,
      [projectId]
    );

    for (const task of tasksRes.rows) {
      const snapshotId = generateId('snap');
      await client.query(
        `INSERT INTO task_snapshots (id, baseline_id, task_id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          snapshotId,
          baselineId,
          task.id,
          task.title,
          task.description || '',
          task.status,
          task.priority,
          task.estimated_hours || 0,
          task.start_date,
          task.end_date,
          task.story_points || 0,
          task.assignee_id,
          task.parent_id,
          task.sprint_id,
          task.release_id
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, baselineId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating plan baseline:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 3. Activate a project baseline (Workspace Swapping)
app.put('/api/projects/:projectId/baselines/:baselineId/activate', async (req, res) => {
  const { projectId, baselineId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const baselineCheck = await client.query(
      'SELECT id, name FROM project_baselines WHERE id = $1 AND project_id = $2',
      [baselineId, projectId]
    );
    if (baselineCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target baseline not found' });
    }

    const currentActiveRes = await client.query(
      'SELECT id FROM project_baselines WHERE project_id = $1 AND is_active = TRUE',
      [projectId]
    );
    
    if (currentActiveRes.rows.length > 0) {
      const activeId = currentActiveRes.rows[0].id;
      await client.query('DELETE FROM task_snapshots WHERE baseline_id = $1', [activeId]);
      
      const liveTasksRes = await client.query(
        `SELECT id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id 
         FROM tasks WHERE project_id = $1`,
        [projectId]
      );
      
      for (const t of liveTasksRes.rows) {
        await client.query(
          `INSERT INTO task_snapshots (id, baseline_id, task_id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [generateId('snap'), activeId, t.id, t.title, t.description || '', t.status, t.priority, t.estimated_hours || 0, t.start_date, t.end_date, t.story_points || 0, t.assignee_id, t.parent_id, t.sprint_id, t.release_id]
        );
      }
    }

    const snapshotsRes = await client.query(
      `SELECT task_id, title, description, status, priority, estimated_hours, start_date, end_date, story_points, assignee_id, parent_id, sprint_id, release_id 
       FROM task_snapshots WHERE baseline_id = $1`,
      [baselineId]
    );

    if (snapshotsRes.rows.length > 0) {
      const targetTaskIds = snapshotsRes.rows.map(s => s.task_id);
      
      await client.query(
        'DELETE FROM tasks WHERE project_id = $1 AND id NOT IN (SELECT unnest($2::varchar[]))',
        [projectId, targetTaskIds]
      );

      const createdAt = new Date().toISOString();
      for (const snap of snapshotsRes.rows) {
        await client.query(
          `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, story_points, parent_id, sprint_id, release_id, issue_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Task')
           ON CONFLICT (id) DO UPDATE SET
             assignee_id = EXCLUDED.assignee_id,
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             estimated_hours = EXCLUDED.estimated_hours,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             story_points = EXCLUDED.story_points,
             parent_id = EXCLUDED.parent_id,
             sprint_id = EXCLUDED.sprint_id,
             release_id = EXCLUDED.release_id`,
          [
            snap.task_id,
            projectId,
            snap.assignee_id,
            snap.title,
            snap.description || '',
            snap.status,
            snap.priority,
            snap.estimated_hours || 0,
            createdAt,
            snap.start_date,
            snap.end_date,
            snap.story_points || 0,
            snap.parent_id,
            snap.sprint_id,
            snap.release_id
          ]
        );
      }
    }

    await client.query('UPDATE project_baselines SET is_active = FALSE WHERE project_id = $1', [projectId]);
    await client.query('UPDATE project_baselines SET is_active = TRUE WHERE id = $1', [baselineId]);

    await client.query('COMMIT');
    res.json({ success: true, message: `Baseline "${baselineCheck.rows[0].name}" activated.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error activating baseline:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. Fetch comparison between two baselines (or baseline vs live)
app.get('/api/projects/:projectId/baselines/compare', async (req, res) => {
  const { projectId } = req.params;
  const { baseId, compareId } = req.query;

  if (!baseId || !compareId) {
    return res.status(400).json({ error: 'Missing baseId or compareId query parameters' });
  }

  try {
    const baseMetaRes = await pool.query('SELECT name FROM project_baselines WHERE id = $1', [baseId]);
    if (baseMetaRes.rows.length === 0) return res.status(404).json({ error: 'Base baseline not found' });
    
    let compareName = 'Current Live Plan';
    if (compareId !== 'live') {
      const compMetaRes = await pool.query('SELECT name FROM project_baselines WHERE id = $1', [compareId]);
      if (compMetaRes.rows.length === 0) return res.status(404).json({ error: 'Comparison baseline not found' });
      compareName = compMetaRes.rows[0].name;
    }

    const baseTasksRes = await pool.query(
      `SELECT task_id, title, status, start_date, end_date, estimated_hours, story_points 
       FROM task_snapshots WHERE baseline_id = $1`,
      [baseId]
    );

    let compareTasks = [];
    if (compareId === 'live') {
      const liveTasksRes = await pool.query(
        `SELECT id as task_id, title, status, start_date, end_date, estimated_hours, story_points 
         FROM tasks WHERE project_id = $1`,
        [projectId]
      );
      compareTasks = liveTasksRes.rows;
    } else {
      const compSnapRes = await pool.query(
        `SELECT task_id, title, status, start_date, end_date, estimated_hours, story_points 
         FROM task_snapshots WHERE baseline_id = $1`,
        [compareId]
      );
      compareTasks = compSnapRes.rows;
    }

    const baseMap = new Map(baseTasksRes.rows.map(t => [t.task_id, t]));
    const compareMap = new Map(compareTasks.map(t => [t.task_id, t]));
    
    const allTaskIds = new Set([...baseMap.keys(), ...compareMap.keys()]);
    const taskComparisons = [];
    
    let totalBaseHours = 0;
    let totalCompareHours = 0;
    let totalBasePoints = 0;
    let totalComparePoints = 0;
    let totalDaysDrift = 0;

    for (const taskId of allTaskIds) {
      const baseTask = baseMap.get(taskId);
      const compTask = compareMap.get(taskId);
      const title = baseTask?.title || compTask?.title;
      
      const bHours = parseFloat(baseTask?.estimated_hours || 0);
      const cHours = parseFloat(compTask?.estimated_hours || 0);
      const bPoints = parseInt(baseTask?.story_points || 0);
      const cPoints = parseInt(compTask?.story_points || 0);

      totalBaseHours += bHours;
      totalCompareHours += cHours;
      totalBasePoints += bPoints;
      totalComparePoints += cPoints;

      let startDelayDays = 0;
      let endDelayDays = 0;

      if (baseTask?.start_date && compTask?.start_date) {
        const diffMs = new Date(compTask.start_date).getTime() - new Date(baseTask.start_date).getTime();
        startDelayDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }
      if (baseTask?.end_date && compTask?.end_date) {
        const diffMs = new Date(compTask.end_date).getTime() - new Date(baseTask.end_date).getTime();
        endDelayDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        totalDaysDrift += endDelayDays;
      }

      taskComparisons.push({
        taskId,
        title,
        base: baseTask ? {
          startDate: baseTask.start_date,
          endDate: baseTask.end_date,
          estimatedHours: bHours,
          storyPoints: bPoints,
          status: baseTask.status
        } : null,
        compare: compTask ? {
          startDate: compTask.start_date,
          endDate: compTask.end_date,
          estimatedHours: cHours,
          storyPoints: cPoints,
          status: compTask.status
        } : null,
        variance: {
          startDelayDays,
          endDelayDays,
          hoursDrift: cHours - bHours,
          pointsDrift: cPoints - bPoints
        }
      });
    }

    const actualsRes = await pool.query(
      `SELECT SUM(hours) as total FROM timesheets WHERE project_id = $1 AND status = 'Approved'`,
      [projectId]
    );
    const actualHoursLogged = parseFloat(actualsRes.rows[0]?.total || 0);

    res.json({
      projectId,
      baseBaseline: { id: baseId, name: baseMetaRes.rows[0].name },
      compareBaseline: { id: compareId, name: compareName },
      varianceSummary: {
        daysDrift: totalDaysDrift,
        storyPointsDrift: totalComparePoints - totalBasePoints,
        estimatedHoursDrift: totalCompareHours - totalBaseHours,
        actualHoursLogged
      },
      tasks: taskComparisons
    });
  } catch (err) {
    console.error('Error comparing baselines:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check — visit /api/health in browser to see DB status
app.get('/api/health', async (req, res) => {
  const status = { server: 'ok', db: 'unknown', dbHost: '', time: new Date().toISOString() };
  const connStr = process.env.DATABASE_URL || '';
  const match = connStr.match(/@([^/:]+)/);
  status.dbHost = match ? match[1] : (process.env.DB_HOST || 'localhost');
  try {
    await pool.query('SELECT 1');
    status.db = 'connected';
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const taskCount = await pool.query('SELECT COUNT(*) FROM tasks');
    status.userCount = parseInt(userCount.rows[0].count);
    status.taskCount = parseInt(taskCount.rows[0].count);
    res.json(status);
  } catch (err) {
    status.db = 'error';
    status.error = err.message;
    status.dbReady = dbReady;
    res.status(503).json(status);
  }
});

// --- Remote Branches Cache (Fetched from VQ System) ---
const FALLBACK_BRANCHES = [
  { id: 'br-01', code: 'B01', name: 'สาขาพระราม 9', province: 'กรุงเทพมหานคร', status: 'Active' },
  { id: 'br-02', code: 'B02', name: 'สาขาเอกมัย-รามอินทรา', province: 'กรุงเทพมหานคร', status: 'Active' },
  { id: 'br-03', code: 'B03', name: 'สาขาราชพฤกษ์', province: 'นนทบุรี', status: 'Active' },
  { id: 'br-04', code: 'B04', name: 'สาขาบางนา', province: 'สมุทรปราการ', status: 'Active' },
  { id: 'br-st-60016', code: 'B16', name: 'สาขาภูเก็ต เฟสติวัล', province: 'ภูเก็ต', status: 'Active' }
];

let cachedBranches = [];

async function fetchRemoteBranches() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    const response = await fetch('https://vibepjm.online/api/branches', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.branches && Array.isArray(data.branches)) {
        cachedBranches = data.branches;
        
        // UPSERT into DB
        let count = 0;
        for (const branch of data.branches) {
          await pool.query(`
            INSERT INTO master_branches (id, code, name, province, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              name = EXCLUDED.name,
              province = EXCLUDED.province,
              status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at
          `, [
            branch.id,
            branch.code || '',
            branch.name,
            branch.province || '',
            branch.status || 'Active',
            new Date().toISOString()
          ]);
          count++;
        }
        console.log(`ℹ️ Cached and UPSERTED ${count} remote branches from vibepjm.online into master_branches`);
        return;
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch remote branches from vibepjm.online:', err.message);
  }
}

async function fetchRemoteTechnicians() {
  try {
    // Check if auto sync is disabled in system_settings
    const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'auto_sync_remote_technicians'");
    if (settingRes.rows.length > 0 && settingRes.rows[0].setting_value === 'false') {
      console.log('ℹ️ Auto-sync remote technicians is disabled in system_settings. Skipping.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://vibepjm.online/api/technicians', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.technicians && Array.isArray(data.technicians)) {
        console.log(`ℹ️ Fetched ${data.technicians.length} remote technicians from vibepjm.online. Upserting to DB (technicians table)...`);
        let count = 0;
        for (const tech of data.technicians) {
          const zones = [];
          if (tech.primaryZone) zones.push(tech.primaryZone);
          if (Array.isArray(tech.secondaryZones)) zones.push(...tech.secondaryZones);
          
          await pool.query(`
            INSERT INTO technicians (
              id, user_id, code, name, phone, avatar, tier, rating, status,
              primary_zone, secondary_zones, skills, extra_data, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              code = EXCLUDED.code,
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              avatar = EXCLUDED.avatar,
              tier = EXCLUDED.tier,
              rating = EXCLUDED.rating,
              status = EXCLUDED.status,
              primary_zone = EXCLUDED.primary_zone,
              secondary_zones = EXCLUDED.secondary_zones,
              skills = EXCLUDED.skills,
              extra_data = EXCLUDED.extra_data,
              updated_at = NOW()
          `, [
            tech.id,
            tech.userId || null,
            tech.code || tech.id,
            tech.name,
            tech.phone || null,
            tech.avatar || null,
            tech.tier || 'Standard',
            tech.rating ? parseFloat(tech.rating) : 5.0,
            tech.status || 'Active',
            tech.primaryZone || null,
            JSON.stringify(tech.secondaryZones || []),
            JSON.stringify(tech.skills || []),
            JSON.stringify(tech.extraData || {})
          ]);

          // UPSERT unique zones into master_zones
          for (const zone of zones) {
            if (!zone) continue;
            const zoneId = Buffer.from(zone).toString('base64').substring(0, 50);
            await pool.query(`
              INSERT INTO master_zones (id, name, created_at)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name
            `, [zoneId, zone, new Date().toISOString()]);
          }

          count++;
        }
        console.log(`✅ Upserted ${count} technicians from VQ into BuildFlow DB (technicians table).`);
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch remote technicians from vibepjm.online:', err.message);
  }
}

// Fetch on startup
setTimeout(fetchRemoteBranches, 2000);
setTimeout(fetchRemoteTechnicians, 3000);
// Periodically refresh cache every hour
setInterval(fetchRemoteBranches, 60 * 60 * 1000);
setInterval(fetchRemoteTechnicians, 60 * 60 * 1000);

// Initial load
app.get('/api/initial-data', async (req, res) => {
  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const projectsRes = await pool.query('SELECT * FROM projects');
    const tasksRes = await pool.query('SELECT * FROM tasks');
    const timesheetsRes = await pool.query('SELECT * FROM timesheets');
    const templatesRes = await pool.query('SELECT * FROM task_templates');
    const sprintsRes = await pool.query('SELECT * FROM sprints');
    const releasesRes = await pool.query('SELECT * FROM releases');
    const permissionSchemesRes = await pool.query('SELECT * FROM permission_schemes');
    const projectWorkflowsRes = await pool.query('SELECT * FROM project_workflows');
    const costRatesRes = await pool.query('SELECT * FROM cost_rates');
    const settingsRes = await pool.query('SELECT * FROM system_settings');
    const branchesRes = await pool.query('SELECT * FROM branches ORDER BY name ASC');
    const masterBranchesRes = await pool.query('SELECT * FROM master_branches ORDER BY name ASC');
    const masterZonesRes = await pool.query('SELECT * FROM master_zones ORDER BY name ASC');
    const priceBookRes = await pool.query('SELECT * FROM service_price_book ORDER BY category ASC, service_name ASC');
    const systemSettings = {};
    settingsRes.rows.forEach(row => {
      systemSettings[row.setting_key] = row.setting_value;
    });

    // Map DB column casing to JS camelCase
    const users = usersRes.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      globalRole: u.global_role,
      department: u.department,
      gender: u.gender,
      birthday: u.birthday,
      skills: u.skills,
      wfhDays: u.wfh_days || [],
      taxId: u.tax_id || '',
      idCardNumber: u.id_card_number || '',
      idCardFiles: u.id_card_files || [],
      companyName: u.company_name || '',
      lineId: u.line_id || '',
      phones: u.phones || [],
      jobTypes: u.job_types || [],
      serviceZones: u.service_zones || [],
      workSlots: u.work_slots || [],
      certificates: u.certificates || [],
      criminalRecord: u.criminal_record || 'ไม่มี',
      creditTermDays: u.credit_term_days != null ? parseInt(u.credit_term_days) : 30,
      technicianLevel: u.technician_level || 'Standard'
    }));

    const projects = projectsRes.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.start_date,
      endDate: p.end_date,
      budget: parseFloat(p.budget || '0'),
      members: p.members,
      customColumns: p.custom_columns,
      permissionSchemeId: p.permission_scheme_id,
      projectType: p.project_type || 'dev',
      supportTaskStyle: p.support_task_style || 'categories',
      address: p.address || '',
      projectValue: parseFloat(p.project_value || '0'),
      invoicedValue: parseFloat(p.invoiced_value || '0'),
      collectedValue: parseFloat(p.collected_value || '0'),
      plannedExpense: parseFloat(p.planned_expense || '0'),
      actualExpense: parseFloat(p.actual_expense || '0'),
      extraDetails: p.extra_details || {},
      leadId: p.lead_id,
      customerName: p.customer_name,
      customerPhone: p.customer_phone,
      convertedAt: p.converted_at
    }));

    const tasks = tasksRes.rows.map(t => ({
      id: t.id,
      projectId: t.project_id,
      assigneeId: t.assignee_id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimatedHours: parseFloat(t.estimated_hours || '0'),
      createdAt: t.created_at,
      parentId: t.parent_id,
      startDate: t.start_date,
      endDate: t.end_date,
      sprintId: t.sprint_id,
      releaseId: t.release_id,
      storyPoints: t.story_points || 0,
      issueType: t.issue_type || 'Task',
      updatedAt: t.updated_at || t.created_at
    }));

    const timesheets = timesheetsRes.rows.map(ts => ({
      id: ts.id,
      userId: ts.user_id,
      projectId: ts.project_id,
      taskId: ts.task_id,
      date: ts.date,
      hours: parseFloat(ts.hours || '0'),
      plannedHours: ts.planned_hours != null ? parseFloat(ts.planned_hours) : undefined,
      startTime: ts.start_time || undefined,
      endTime: ts.end_time || undefined,
      description: ts.description,
      status: ts.status,
      approvedBy: ts.approved_by,
      approvedAt: ts.approved_at,
      imageUrl: ts.image_url || undefined,
      workResults: ts.work_results || undefined,
      updatedAt: ts.updated_at || undefined
    }));

    const taskTemplates = templatesRes.rows.map(tpl => ({
      id: tpl.id,
      title: tpl.title,
      description: tpl.description,
      priority: tpl.priority,
      startPercent: parseFloat(tpl.start_percent || '0'),
      endPercent: parseFloat(tpl.end_percent || '100'),
      estimatedHours: parseFloat(tpl.estimated_hours || '0'),
      projectTemplateName: tpl.project_template_name || 'General'
    }));

    const sprints = sprintsRes.rows.map(s => ({
      id: s.id,
      projectId: s.project_id,
      name: s.name,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date
    }));

    const releases = releasesRes.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      status: r.status,
      releaseDate: r.release_date
    }));

    const permissionSchemes = permissionSchemesRes.rows.map(ps => ({
      id: ps.id,
      name: ps.name,
      description: ps.description,
      permissions: ps.permissions
    }));

    const projectWorkflows = projectWorkflowsRes.rows.map(pw => ({
      projectId: pw.project_id,
      statuses: pw.statuses,
      transitions: pw.transitions
    }));

    const costRates = costRatesRes.rows.map(cr => ({
      id: cr.id,
      roleName: cr.role_name,
      ratePerDay: parseFloat(cr.rate_per_day || '0'),
      ratePerHour: parseFloat(cr.rate_per_hour || '0'),
      currency: cr.currency || 'THB'
    }));

    let branches = branchesRes.rows.map(b => ({
      id: b.id,
      code: b.code,
      name: b.name,
      province: b.province,
      status: b.status,
      fullName: b.full_name,
      address: b.address,
      latitude: b.latitude ? parseFloat(b.latitude) : undefined,
      longitude: b.longitude ? parseFloat(b.longitude) : undefined,
      openTime: b.open_time,
      closeTime: b.close_time,
      phone: b.phone,
      storeGroup: b.store_group
    }));

    if (branches.length === 0) {
      branches = cachedBranches.length > 0 ? cachedBranches : FALLBACK_BRANCHES;
    }

    const masterBranches = masterBranchesRes.rows.map(b => ({
      id: b.id,
      code: b.code,
      name: b.name,
      province: b.province,
      status: b.status,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    const masterZones = masterZonesRes.rows.map(z => ({
      id: z.id,
      name: z.name,
      createdAt: z.created_at
    }));

    res.json({ 
      users, 
      projects, 
      tasks, 
      timesheets, 
      taskTemplates, 
      sprints, 
      releases, 
      permissionSchemes, 
      projectWorkflows, 
      costRates, 
      systemSettings,
      branches,
      masterBranches,
      masterZones,
      priceBook: priceBookRes.rows
    });
  } catch (err) {
    console.error('Error fetching initial data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Users REST API
app.get('/api/users/available-surveyors', async (req, res) => {
  const { date } = req.query;
  try {
    // 1. Get users with 'QC' skill
    const result = await pool.query("SELECT id, name, global_role FROM users WHERE 'QC' = ANY(skills)");
    const qcUsers = result.rows;

    if (!date) {
      return res.json(qcUsers);
    }

    // 2. Check availability
    const availableUsers = [];
    for (const u of qcUsers) {
      // Find any lead assigned to this surveyor within +/- 3 hours (10800 seconds)
      const busyRes = await pool.query(
        `SELECT id FROM leads 
         WHERE surveyor_id = $1 
         AND survey_date IS NOT NULL 
         AND ABS(EXTRACT(EPOCH FROM (CAST(survey_date AS TIMESTAMP) - CAST($2 AS TIMESTAMP)))) < 10800`, 
        [u.id, date]
      );
      if (busyRes.rows.length === 0) {
        availableUsers.push(u);
      }
    }
    res.json(availableUsers);
  } catch (err) {
    console.error('Error fetching available surveyors:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, avatar, global_role, department, gender, birthday, skills, wfh_days, tax_id, id_card_number, id_card_files, company_name, line_id, phones, job_types, service_zones, work_slots, certificates, criminal_record, credit_term_days, technician_level FROM users ORDER BY name ASC');
    const users = result.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      globalRole: u.global_role,
      department: u.department || 'General',
      gender: u.gender || '',
      birthday: u.birthday || '',
      skills: u.skills || [],
      wfhDays: u.wfh_days || [],
      taxId: u.tax_id || '',
      idCardNumber: u.id_card_number || '',
      idCardFiles: u.id_card_files || [],
      companyName: u.company_name || '',
      lineId: u.line_id || '',
      phones: u.phones || [],
      jobTypes: u.job_types || [],
      serviceZones: u.service_zones || [],
      workSlots: u.work_slots || [],
      certificates: u.certificates || [],
      criminalRecord: u.criminal_record || 'ไม่มี',
      creditTermDays: u.credit_term_days != null ? parseInt(u.credit_term_days) : 30,
      technicianLevel: u.technician_level || 'Standard'
    }));
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { 
    id, name, email, avatar, globalRole, department, gender, birthday, skills, password, wfhDays,
    taxId, idCardNumber, idCardFiles, companyName, lineId, phones, jobTypes, serviceZones, workSlots, certificates, criminalRecord, creditTermDays, technicianLevel
  } = req.body;
  
  const cleanName = (name || '').replace(/\s+/g, ' ').trim() || 'User';
  const cleanEmail = (email || '').trim().toLowerCase();
  const safeRole = globalRole || 'Employee';
  const safeDept = (department || '').trim() || 'General';
  const safeAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

  if (!cleanEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let pwHash = null;
  try {
    // Check if user already exists to preserve their password_hash, or set default ('password123' hashed)
    const existingUser = await pool.query('SELECT password_hash FROM users WHERE id = $1 OR LOWER(email) = $2', [id, cleanEmail]);
    if (password && password.trim() !== '') {
      pwHash = crypto.createHash('sha256').update(password).digest('hex');
    } else if (existingUser.rows.length > 0 && existingUser.rows[0].password_hash) {
      pwHash = existingUser.rows[0].password_hash;
    } else {
      pwHash = crypto.createHash('sha256').update('password123').digest('hex');
    }

    await pool.query(
      `INSERT INTO users (
         id, name, email, avatar, global_role, department, gender, birthday, skills, password_hash, wfh_days,
         tax_id, id_card_number, id_card_files, company_name, line_id, phones, job_types, service_zones, work_slots, certificates, criminal_record, credit_term_days, technician_level
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar = EXCLUDED.avatar,
         global_role = EXCLUDED.global_role,
         department = EXCLUDED.department,
         gender = EXCLUDED.gender,
         birthday = EXCLUDED.birthday,
         skills = EXCLUDED.skills,
         password_hash = EXCLUDED.password_hash,
         wfh_days = EXCLUDED.wfh_days,
         tax_id = EXCLUDED.tax_id,
         id_card_number = EXCLUDED.id_card_number,
         id_card_files = EXCLUDED.id_card_files,
         company_name = EXCLUDED.company_name,
         line_id = EXCLUDED.line_id,
         phones = EXCLUDED.phones,
         job_types = EXCLUDED.job_types,
         service_zones = EXCLUDED.service_zones,
         work_slots = EXCLUDED.work_slots,
         certificates = EXCLUDED.certificates,
         criminal_record = EXCLUDED.criminal_record,
         credit_term_days = EXCLUDED.credit_term_days,
         technician_level = EXCLUDED.technician_level`,
      [
        id, cleanName, cleanEmail, safeAvatar, safeRole, safeDept, gender || '', birthday || '', skills || [], pwHash, wfhDays || [],
        taxId || '', idCardNumber || '', JSON.stringify(idCardFiles || []), companyName || '', lineId || '',
        phones || [], jobTypes || [], serviceZones || [], workSlots || [], JSON.stringify(certificates || []),
        criminalRecord || 'ไม่มี', creditTermDays != null ? parseInt(creditTermDays) : 30, technicianLevel || 'Standard'
      ]
    );
    res.json({ success: true });
  } catch (err) {
    // Handle duplicate email (same email, different ID — e.g. LINE re-login or existing user updated)
    if (err.code === '23505' && (err.constraint === 'users_email_key' || (err.detail && err.detail.includes('email')))) {
      try {
        await pool.query(
          `UPDATE users SET
             name = $1, avatar = $2,
             global_role = $3, department = $4,
             gender = $5, birthday = $6, skills = $7,
             password_hash = COALESCE($8, password_hash), wfh_days = $9,
             tax_id = $10, id_card_number = $11, id_card_files = $12,
             company_name = $13, line_id = $14, phones = $15,
             job_types = $16, service_zones = $17, work_slots = $18,
             certificates = $19, criminal_record = $20, credit_term_days = $21,
             technician_level = $22
           WHERE LOWER(email) = $23`,
          [
            cleanName, safeAvatar, safeRole, safeDept, gender || '', birthday || '', skills || [], pwHash, wfhDays || [],
            taxId || '', idCardNumber || '', JSON.stringify(idCardFiles || []), companyName || '', lineId || '',
            phones || [], jobTypes || [], serviceZones || [], workSlots || [], JSON.stringify(certificates || []),
            criminalRecord || 'ไม่มี', creditTermDays != null ? parseInt(creditTermDays) : 30, technicianLevel || 'Standard', cleanEmail
          ]
        );
        res.json({ success: true, note: 'merged by email' });
      } catch (updateErr) {
        console.error('Error merging user by email:', updateErr.message);
        res.status(500).json({ error: updateErr.message });
      }
    } else {
      console.error('Error saving user:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
});


app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user password directly (Admin / Reset)
app.put('/api/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({ error: 'Password is required' });
  }
  try {
    const pwHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
    const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [pwHash, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating user password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Self-service change password (User verifies old password)
app.post('/api/users/change-password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'User ID, old password, and new password are required' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }
  try {
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentPwHash = userRes.rows[0].password_hash;
    const oldPwHash = crypto.createHash('sha256').update(oldPassword).digest('hex');

    if (currentPwHash && currentPwHash !== oldPwHash) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newPwHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPwHash, userId]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});


// Helper function: Generate Project ID in format P+Job+Store+Date+Running (e.g. PQBNA171020260001)
async function generateFormattedProjectId(jobType, branch) {
  // Job Type Mapping
  let jobPrefix = 'O'; // Other
  if (jobType) {
    const jt = jobType.toLowerCase();
    if (jt.includes('quick')) jobPrefix = 'Q';
    else if (jt.includes('install')) jobPrefix = 'I';
    else if (jt.includes('renovat')) jobPrefix = 'R';
    else if (jt.includes('build')) jobPrefix = 'B';
    else if (jt.includes('new')) jobPrefix = 'N';
    else if (jt.includes('ma service')) jobPrefix = 'M';
  }

  // Branch Mapping (Default to HQ0 if not found, BNA for Bangna)
  let branchPrefix = 'HQ0';
  if (branch) {
    const br = branch.toLowerCase();
    if (br.includes('บางนา') || br.includes('bangna')) branchPrefix = 'BNA';
    else if (br.includes('พระราม') || br.includes('rama')) branchPrefix = 'RM9';
    else if (br.includes('ลาดพร้าว') || br.includes('lat phrao')) branchPrefix = 'LTP';
    else branchPrefix = branch.substring(0, 3).toUpperCase();
  }

  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  const dateStr = `${dd}${mm}${yyyy}`;
  
  const prefix = `P${jobPrefix}${branchPrefix}${dateStr}`;

  const res = await pool.query(
    "SELECT id FROM projects WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  let running = 1;
  if (res.rows.length > 0) {
    const lastId = res.rows[0].id;
    const numPart = lastId.replace(prefix, ''); // Extract running part
    const lastNum = parseInt(numPart, 10);
    if (!isNaN(lastNum)) {
      running = lastNum + 1;
    }
  }

  const runningStr = String(running).padStart(4, '0'); // 4 digits as requested
  return `${prefix}${runningStr}`;
}
// --- Service Price Book API ---
const serviceRoutes = require('./src/routes/serviceRoutes.cjs');
const quotationRoutes = require('./src/routes/quotationRoutes.cjs');
const dashboardRoutes = require('./src/routes/dashboardRoutes.cjs');
app.use('/api/pricebook', serviceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Projects REST API
// --- Master Project Types API ---
app.get('/api/master-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM master_project_types ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/master-types', async (req, res) => {
  const { id, name, description, defaultColumns } = req.body;
  try {
    const newId = id || 'mpt_' + Date.now();
    const cols = defaultColumns ? JSON.stringify(defaultColumns) : '["To Do", "In Progress", "Review", "Done"]';
    await pool.query(
      'INSERT INTO master_project_types (id, name, description, default_columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newId, name, description, cols, new Date().toISOString()]
    );
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/master-types/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, defaultColumns } = req.body;
  try {
    const cols = defaultColumns ? JSON.stringify(defaultColumns) : null;
    await pool.query(
      'UPDATE master_project_types SET name = COALESCE($1, name), description = COALESCE($2, description), default_columns = COALESCE($3, default_columns) WHERE id = $4',
      [name, description, cols, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/master-types/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM master_project_types WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Milestone Templates API ---
app.get('/api/master-types/:masterTypeId/milestones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM milestone_templates WHERE master_type_id = $1 ORDER BY sequence_order ASC', [req.params.masterTypeId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/master-types/:masterTypeId/milestones', async (req, res) => {
  const { id, name, sequenceOrder } = req.body;
  const masterTypeId = req.params.masterTypeId;
  try {
    const newId = id || 'mst_' + Date.now();
    await pool.query(
      'INSERT INTO milestone_templates (id, master_type_id, name, sequence_order) VALUES ($1, $2, $3, $4)',
      [newId, masterTypeId, name, sequenceOrder || 0]
    );
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/milestones/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM milestone_templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.post('/api/projects', async (req, res) => {
  let { id, name, description, status, startDate, endDate, budget, members, customColumns, permissionSchemeId, projectType, supportTaskStyle, address, projectValue, invoicedValue, collectedValue, plannedExpense, actualExpense, projectTemplateName, extraDetails } = req.body;
  try {
    if (!id || id.startsWith('p_')) {
      id = await generateFormattedProjectId(projectType, '');
    }

    const checkExist = await pool.query('SELECT 1 FROM projects WHERE id = $1', [id]);
    const isNew = checkExist.rows.length === 0;
    
    let cols = customColumns;
    
    // Assign specific dynamic workflow stages based on project type if not explicitly provided
    if (isNew && (!customColumns || customColumns.length === 0)) {
      const type = (projectType || '').toLowerCase().trim();
      
      const commonStages = ["To Do"];
      const buySurveyStages = ["Buy-Survey", "Survey"];
      const designStages = ["Design"];
      const executionStages = ["ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];

      if (type === 'quick' || type === 'quick_service' || type === 'quick service' || type === 'pq' || type.startsWith('quick')) {
        cols = [...commonStages, ...executionStages];
      } else if (
        type === 'install' || 
        type === 'installer' || 
        type === 'installer service' || 
        type === 'installation' || 
        type === 'pi' || 
        type === 'ma' || 
        type === 'maintenance' || 
        type === 'ma service' || 
        type === 'support' ||
        type === 'pm'
      ) {
        cols = [...commonStages, ...buySurveyStages, ...executionStages];
      } else {
        cols = [...commonStages, ...buySurveyStages, ...designStages, ...executionStages];
      }
    }
    
    if (!cols || cols.length === 0) {
      cols = ["To Do", "Buy-Survey", "Survey", "Design", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];
    }

    await pool.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, budget, members, custom_columns, permission_scheme_id, project_type, support_task_style, address, project_value, invoiced_value, collected_value, planned_expense, actual_expense, extra_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         budget = EXCLUDED.budget,
         members = EXCLUDED.members,
         custom_columns = EXCLUDED.custom_columns,
         permission_scheme_id = EXCLUDED.permission_scheme_id,
         project_type = EXCLUDED.project_type,
         support_task_style = EXCLUDED.support_task_style,
         address = EXCLUDED.address,
         project_value = EXCLUDED.project_value,
         invoiced_value = EXCLUDED.invoiced_value,
         collected_value = EXCLUDED.collected_value,
         planned_expense = EXCLUDED.planned_expense,
         actual_expense = EXCLUDED.actual_expense,
         extra_details = EXCLUDED.extra_details`,
      [
        id, 
        name, 
        description, 
        status, 
        startDate, 
        endDate || null, 
        budget || null, 
        JSON.stringify(members), 
        JSON.stringify(cols), 
        permissionSchemeId || null, 
        projectType || 'dev', 
        supportTaskStyle || 'categories',
        address || null,
        projectValue || 0,
        invoicedValue || 0,
        collectedValue || 0,
        plannedExpense || 0,
        actualExpense || 0,
        JSON.stringify(extraDetails || {})
      ]
    );

    // Auto-generate main tasks for new projects
    if (isNew && startDate) {
      let customTemplates = [];
      if (projectTemplateName && projectTemplateName !== 'Default' && projectTemplateName !== 'None') {
        const customRes = await pool.query('SELECT * FROM task_templates WHERE project_template_name = $1', [projectTemplateName]);
        customTemplates = customRes.rows;
      }

      if (customTemplates.length > 0) {
        const startD = new Date(startDate);
        const endD = endDate ? new Date(endDate) : new Date(startD.getTime() + 30 * 24 * 60 * 60 * 1000);
        const totalMs = endD.getTime() - startD.getTime();
        
        for (const tpl of customTemplates) {
          const taskStartMs = startD.getTime() + (totalMs * parseFloat(tpl.start_percent) / 100);
          const taskEndMs = startD.getTime() + (totalMs * parseFloat(tpl.end_percent) / 100);
          
          const taskStartStr = new Date(taskStartMs).toISOString().split('T')[0];
          const taskEndStr = new Date(taskEndMs).toISOString().split('T')[0];
          
          const taskId = 't_' + Math.random().toString(36).substr(2, 9);
          await pool.query(
            `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 0, 'Task')`,
            [
              taskId,
              id,
              tpl.title,
              tpl.description || '',
              'To Do',
              tpl.priority || 'Medium',
              parseFloat(tpl.estimated_hours || '0'),
              new Date().toISOString(),
              taskStartStr,
              taskEndStr
            ]
          );
        }
        
        // Add QA Check-in / Check-out if columns have it
        if (cols.includes('QA Check-in')) {
          await pool.query(
            `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 0, 'QA')`,
            [
              't_' + Math.random().toString(36).substr(2, 9),
              id,
              '[QA] Check-in',
              'Check-in and upload site condition photos before starting work.',
              'QA Check-in',
              'Urgent',
              1,
              new Date().toISOString(),
              startDate,
              startDate
            ]
          );
        }

        if (cols.includes('QA Check-out')) {
          await pool.query(
            `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 0, 'QA')`,
            [
              't_' + Math.random().toString(36).substr(2, 9),
              id,
              '[QA] Check-out',
              'Check-out and upload finished site photos for handover.',
              'QA Check-out',
              'Urgent',
              1,
              new Date().toISOString(),
              endDate || startDate,
              endDate || startDate
            ]
          );
        }
      } else if (projectType === 'support') {
        if (supportTaskStyle === 'monthly') {
          const startD = new Date(startDate);
          // If no end date, default to 12 months from start date
          const endD = endDate ? new Date(endDate) : new Date(startD.getFullYear(), startD.getMonth() + 12, 1);
          
          let current = new Date(startD.getFullYear(), startD.getMonth(), 1);
          const final = new Date(endD.getFullYear(), endD.getMonth(), 1);
          
          while (current <= final) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const taskTitle = `[${year}-${month}] Support & Maintenance`;
            
            const tStart = (current.getFullYear() === startD.getFullYear() && current.getMonth() === startD.getMonth()) 
              ? startDate 
              : `${year}-${month}-01`;
              
            let lastDay = new Date(year, current.getMonth() + 1, 0).getDate();
            const tEnd = (current.getFullYear() === endD.getFullYear() && current.getMonth() === endD.getMonth() && endDate)
              ? endDate
              : `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
              
            const taskId = 't_' + Math.random().toString(36).substr(2, 9);
            await pool.query(
              `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, 0, $7, $8, $9, NULL, NULL, 0, 'Task')`,
              [
                taskId,
                id,
                taskTitle,
                `Support work for ${year}-${month}`,
                'To Do',
                'Medium',
                new Date().toISOString(),
                tStart,
                tEnd
              ]
            );
            
            current.setMonth(current.getMonth() + 1);
          }
        } else {
          // Category-based Support tasks
          const categories = [
            { title: 'User Support & Helpdesk', desc: 'Handling user queries, access issues, and general assistance.' },
            { title: 'System Maintenance & Operations', desc: 'Routine checks, database backup, server updates, and monitoring.' },
            { title: 'Bug Fixing & Enhancement Support', desc: 'Investigating errors, deploying patches, and resolving reported system issues.' }
          ];
          
          for (const cat of categories) {
            const taskId = 't_' + Math.random().toString(36).substr(2, 9);
            await pool.query(
              `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, 0, $7, $8, $9, NULL, NULL, 0, 'Task')`,
              [
                taskId,
                id,
                cat.title,
                cat.desc,
                'To Do',
                'Medium',
                new Date().toISOString(),
                startDate,
                endDate || null
              ]
            );
          }
        }
      } else if (projectType === 'construction' || projectType === 'renovate' || projectType === 'new_house') {
        // Auto-generate construction phases
        const phases = [
          { title: 'ซื้อสำรวจ', desc: 'ลูกค้าซื้อสิทธิ์สำรวจหน้างานและระบุขอบเขตความต้องการ', startPct: 0, endPct: 8, est: 4 },
          { title: 'QC (สำรวจ)', desc: 'ตรวจสอบข้อมูลหน้างาน ความเป็นไปได้ และรายละเอียดการสำรวจ', startPct: 8, endPct: 16, est: 8 },
          { title: 'ออกแบบ', desc: 'ออกแบบผังการจัดวาง เขียนแบบ 2D/3D และเลือกวัสดุ', startPct: 16, endPct: 32, est: 24 },
          { title: 'สร้างใบเสนอราคา', desc: 'จัดทำใบเสนอราคางวดงานส่งให้ลูกค้าพิจารณา', startPct: 32, endPct: 40, est: 4 },
          { title: 'ลูกค้ายืนยัน', desc: 'ลูกค้ายืนยันตกลงสั่งจ้างงานตามแบบและเงื่อนไข', startPct: 40, endPct: 48, est: 4 },
          { title: 'ชำระเงิน', desc: 'ชำระเงินมัดจำงวดแรกและยืนยันยอดเงินเข้าระบบ', startPct: 48, endPct: 56, est: 4 },
          { title: 'ดำเนินการโครงการ', desc: 'เข้าดำเนินงานติดตั้ง ตกแต่ง หรือการก่อสร้างหน้างานจริง', startPct: 56, endPct: 75, est: 80 },
          { title: 'ช่าง check-in/check out siteงาน', desc: 'ช่างลงบันทึกเวลาเข้า-ออก และรายงานผลการทำงานรายวัน', startPct: 75, endPct: 82, est: 16 },
          { title: 'Project complete', desc: 'งานก่อสร้างติดตั้งเสร็จสิ้นเบื้องต้นจากผู้รับเหมา', startPct: 82, endPct: 88, est: 8 },
          { title: 'QC (ส่งมอบ)', desc: 'ตรวจสอบความเรียบร้อยรอบสุดท้ายและแก้ไข Defect ก่อนส่งมอบ', startPct: 88, endPct: 94, est: 8 },
          { title: 'aftersales', desc: 'การดูแลประกันผลงานหลังการขายและการเก็บรายละเอียดเพิ่มเติม', startPct: 94, endPct: 98, est: 12 },
          { title: 'ปิดjob', desc: 'ส่งมอบงานอย่างเป็นทางการและรับชำระเงินงวดสุดท้าย', startPct: 98, endPct: 100, est: 4 }
        ];

        const startD = new Date(startDate);
        const endD = endDate ? new Date(endDate) : new Date(startD.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30 days
        const totalMs = endD.getTime() - startD.getTime();

        for (const phase of phases) {
          const taskStartMs = startD.getTime() + (totalMs * phase.startPct / 100);
          const taskEndMs = startD.getTime() + (totalMs * phase.endPct / 100);
          
          const taskStartStr = new Date(taskStartMs).toISOString().split('T')[0];
          const taskEndStr = new Date(taskEndMs).toISOString().split('T')[0];
          
          const taskId = 't_' + Math.random().toString(36).substr(2, 9);
          await pool.query(
            `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 0, 'Task')`,
            [
              taskId,
              id,
              phase.title,
              phase.desc,
              'To Do',
              'Medium',
              phase.est,
              new Date().toISOString(),
              taskStartStr,
              taskEndStr
            ]
          );
        }
      } else {
        // Normal template tasks for Dev Projects
        const defaultTemplatesRes = await pool.query("SELECT * FROM task_templates WHERE project_template_name = 'General' OR project_template_name = 'Default'");
        let defaultTemplates = defaultTemplatesRes.rows;
        if (defaultTemplates.length === 0) {
          const allTpl = await pool.query("SELECT * FROM task_templates");
          defaultTemplates = allTpl.rows;
        }

        if (endDate) {
          const startD = new Date(startDate);
          const endD = new Date(endDate);
          const totalMs = endD.getTime() - startD.getTime();
          
          for (const tpl of defaultTemplates) {
            const taskStartMs = startD.getTime() + (totalMs * parseFloat(tpl.start_percent) / 100);
            const taskEndMs = startD.getTime() + (totalMs * parseFloat(tpl.end_percent) / 100);
            
            const taskStartStr = new Date(taskStartMs).toISOString().split('T')[0];
            const taskEndStr = new Date(taskEndMs).toISOString().split('T')[0];
            
            const taskId = 't_' + Math.random().toString(36).substr(2, 9);
            await pool.query(
              `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, start_date, end_date, sprint_id, release_id, story_points, issue_type)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 0, 'Task')`,
              [
                taskId,
                id,
                tpl.title,
                tpl.description || '',
                'To Do',
                tpl.priority || 'Medium',
                parseFloat(tpl.estimated_hours || '0'),
                new Date().toISOString(),
                taskStartStr,
                taskEndStr
              ]
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving project:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Project (cascade)
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  try {
    // Permission check: only Admin or Manager can delete projects
    if (userId) {
      const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const role = userRes.rows[0].global_role;
        if (role !== 'Admin' && role !== 'Manager') {
          return res.status(403).json({ error: 'Only Admin or Manager can delete projects' });
        }
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete task_snapshots via project_baselines
      await client.query(
        `DELETE FROM task_snapshots WHERE baseline_id IN (SELECT id FROM project_baselines WHERE project_id = $1)`,
        [id]
      );
      // 2. Delete project_baselines
      await client.query('DELETE FROM project_baselines WHERE project_id = $1', [id]);
      // 3. Delete timesheets linked to this project
      await client.query('DELETE FROM timesheets WHERE project_id = $1', [id]);
      // 4. Delete tasks
      await client.query('DELETE FROM tasks WHERE project_id = $1', [id]);
      // 5. Delete sprints
      await client.query('DELETE FROM sprints WHERE project_id = $1', [id]);
      // 6. Delete releases
      await client.query('DELETE FROM releases WHERE project_id = $1', [id]);
      // 7. Delete project_workflows
      await client.query('DELETE FROM project_workflows WHERE project_id = $1', [id]);
      // 8. Delete the project itself
      await client.query('DELETE FROM projects WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Permission and Workflow Validation Helpers ---
async function checkPermission(userId, projectId, permissionKey, taskObject = null) {
  if (!userId) return true; // Bypass validation if header X-User-Id is missing (local scripts, fallback compatibility)
  try {
    // 1. Get user global role
    const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return false;
    const globalRole = userRes.rows[0].global_role;
    
    // Admin has superuser permissions
    if (globalRole === 'Admin') return true;

    // 2. Get project details and user's project role
    const projectRes = await pool.query('SELECT permission_scheme_id, members FROM projects WHERE id = $1', [projectId]);
    if (projectRes.rows.length === 0) return false;
    const project = projectRes.rows[0];
    
    let projectRole = null;
    const members = typeof project.members === 'string' ? JSON.parse(project.members) : project.members;
    if (Array.isArray(members)) {
      const member = members.find(m => m.userId === userId);
      if (member) {
        projectRole = member.role;
        if (projectRole === 'Team Lead' || projectRole === 'Leader') {
          projectRole = 'PM';
        }
      }
    }

    // If global role is Manager/Owner, they might act as Owner/PM by default
    if (globalRole === 'Manager' && !projectRole) {
      projectRole = 'PM'; // Managers default to PM on projects they manage
    }

    // 3. Load permission scheme
    const schemeId = project.permission_scheme_id || 'scheme_default';
    const schemeRes = await pool.query('SELECT permissions FROM permission_schemes WHERE id = $1', [schemeId]);
    if (schemeRes.rows.length === 0) return false;
    
    const permissions = schemeRes.rows[0].permissions;
    const allowedEntities = permissions[permissionKey];
    if (!Array.isArray(allowedEntities)) return false;

    // Check matches
    if (allowedEntities.includes(globalRole)) return true;
    if (projectRole && allowedEntities.includes(projectRole)) return true;
    if (allowedEntities.includes('Member') && projectRole) return true; // Any member role
    if (allowedEntities.includes('Assignee') && taskObject && taskObject.assignee_id === userId) return true;

    return false;
  } catch (err) {
    console.error('Error in checkPermission:', err);
    return false;
  }
}

async function validateTransition(userId, projectId, taskObject, newStatus) {
  if (!taskObject) return { allowed: true };
  if (taskObject.status === newStatus) return { allowed: true };

  try {
    // Load project workflow
    const wfRes = await pool.query('SELECT statuses, transitions FROM project_workflows WHERE project_id = $1', [projectId]);
    if (wfRes.rows.length === 0) return { allowed: true }; // No workflow -> allow all
    
    const workflow = wfRes.rows[0];
    const statuses = Array.isArray(workflow.statuses) ? workflow.statuses : JSON.parse(workflow.statuses || '[]');
    const transitions = Array.isArray(workflow.transitions) ? workflow.transitions : JSON.parse(workflow.transitions || '[]');

    // 1. Verify new status is a valid column
    if (!statuses.includes(newStatus)) {
      return { allowed: false, reason: `Status column "${newStatus}" does not exist in this project.` };
    }

    // 2. If no transitions are specified, default to allowing all transitions
    if (transitions.length === 0) {
      return { allowed: true };
    }

    // 3. Find transition rule
    const transition = transitions.find(t => (t.from === taskObject.status || t.from === '*') && t.to === newStatus);
    if (!transition) {
      return { allowed: false, reason: `Transition from "${taskObject.status}" to "${newStatus}" is not allowed by this project's workflow.` };
    }

    // 4. Validate conditions
    const conditions = transition.conditions || [];
    for (const cond of conditions) {
      if (cond.type === 'pm_or_admin_only') {
        const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
        const globalRole = userRes.rows[0]?.global_role;
        const projectRes = await pool.query('SELECT members FROM projects WHERE id = $1', [projectId]);
        const members = projectRes.rows[0]?.members || [];
        const memberRole = members.find(m => m.userId === userId)?.role;
        if (globalRole !== 'Admin' && memberRole !== 'PM' && memberRole !== 'Team Lead' && memberRole !== 'Leader' && globalRole !== 'Manager') {
          return { allowed: false, reason: `Only a Project Manager or Admin can perform this transition.` };
        }
      }
      if (cond.type === 'assignee_only') {
        if (taskObject.assignee_id !== userId) {
          return { allowed: false, reason: `Only the assignee of this task can perform this transition.` };
        }
      }
      if (cond.type === 'min_story_points') {
        if (!taskObject.story_points || taskObject.story_points <= 0) {
          return { allowed: false, reason: `This transition requires the task to have story points set.` };
        }
      }
      if (cond.type === 'has_description') {
        if (!taskObject.description || taskObject.description.trim() === '') {
          return { allowed: false, reason: `This transition requires the task to have a description.` };
        }
      }
      if (cond.type === 'has_estimated_hours') {
        if (!taskObject.estimated_hours || parseFloat(taskObject.estimated_hours) <= 0) {
          return { allowed: false, reason: `This transition requires the task to have estimated hours set.` };
        }
      }
    }

    return { allowed: true };
  } catch (err) {
    console.error('Error in validateTransition:', err);
    return { allowed: false, reason: `Server error validating transition: ${err.message}` };
  }
}

// Tasks REST API
app.post('/api/tasks', async (req, res) => {
  const { id, projectId, assigneeId, title, description, status, priority, estimatedHours, createdAt, parentId, startDate, endDate, sprintId, releaseId, storyPoints, issueType, afterImage } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    // Check if it is an update
    const oldTaskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    const oldTask = oldTaskRes.rows[0];

    // Phase 9 Constraint: Require afterImage when marking as Done
    if (status === 'Done') {
      const existingAfterImage = oldTask ? oldTask.after_image : null;
      if (!afterImage && !existingAfterImage) {
        return res.status(400).json({ error: 'Proof of Work (After Image) is required to close this task.' });
      }
    }

    if (userId) {
      if (oldTask) {
        // Edit Validation
        const hasEditPermission = await checkPermission(userId, projectId, 'edit_task', oldTask);
        if (!hasEditPermission) {
          return res.status(403).json({ error: 'Permission denied: You do not have permission to edit tasks in this project.' });
        }

        // Transition Validation if status changes
        if (oldTask.status !== status) {
          const hasTransPermission = await checkPermission(userId, projectId, 'transition_task', oldTask);
          if (!hasTransPermission) {
            return res.status(403).json({ error: 'Permission denied: You do not have permission to transition tasks in this project.' });
          }

          const transResult = await validateTransition(userId, projectId, oldTask, status);
          if (!transResult.allowed) {
            return res.status(400).json({ error: transResult.reason });
          }
        }
      } else {
        // Create Validation
        const hasCreatePermission = await checkPermission(userId, projectId, 'create_task');
        if (!hasCreatePermission) {
          return res.status(403).json({ error: 'Permission denied: You do not have permission to create tasks in this project.' });
        }
      }
    }

    const updatedAt = req.body.updatedAt || new Date().toISOString();

    await pool.query(
      `INSERT INTO tasks (id, project_id, assignee_id, title, description, status, priority, estimated_hours, created_at, parent_id, start_date, end_date, sprint_id, release_id, story_points, issue_type, updated_at, after_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         assignee_id = EXCLUDED.assignee_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         priority = EXCLUDED.priority,
         estimated_hours = EXCLUDED.estimated_hours,
         created_at = EXCLUDED.created_at,
         parent_id = EXCLUDED.parent_id,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         sprint_id = EXCLUDED.sprint_id,
         release_id = EXCLUDED.release_id,
         story_points = EXCLUDED.story_points,
         issue_type = EXCLUDED.issue_type,
         after_image = COALESCE(EXCLUDED.after_image, tasks.after_image),
         updated_at = EXCLUDED.updated_at`,
      [
        id, 
        projectId, 
        assigneeId, 
        title, 
        description, 
        status, 
        priority, 
        estimatedHours, 
        createdAt, 
        parentId || null, 
        startDate || null, 
        endDate || null,
        sprintId || null,
        releaseId || null,
        storyPoints || 0,
        issueType || 'Task',
        updatedAt
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving task:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    const task = taskRes.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (userId) {
      const hasPermission = await checkPermission(userId, task.project_id, 'delete_task', task);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to delete tasks in this project.' });
      }
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sprints REST API
app.post('/api/sprints', async (req, res) => {
  const { id, projectId, name, status, startDate, endDate } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    if (userId) {
      const hasPermission = await checkPermission(userId, projectId, 'manage_sprints');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to manage sprints in this project.' });
      }
    }

    await pool.query(
      `INSERT INTO sprints (id, project_id, name, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date`,
      [id, projectId, name, status, startDate || null, endDate || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving sprint:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sprints/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  try {
    const sprintRes = await pool.query('SELECT * FROM sprints WHERE id = $1', [id]);
    const sprint = sprintRes.rows[0];
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    if (userId) {
      const hasPermission = await checkPermission(userId, sprint.project_id, 'manage_sprints');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to manage sprints in this project.' });
      }
    }

    await pool.query('DELETE FROM sprints WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting sprint:', err);
    res.status(500).json({ error: err.message });
  }
});

// Releases REST API
app.post('/api/releases', async (req, res) => {
  const { id, projectId, name, status, releaseDate } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    if (userId) {
      const hasPermission = await checkPermission(userId, projectId, 'manage_releases');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to manage releases in this project.' });
      }
    }

    await pool.query(
      `INSERT INTO releases (id, project_id, name, status, release_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         release_date = EXCLUDED.release_date`,
      [id, projectId, name, status, releaseDate || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving release:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/releases/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  try {
    const releaseRes = await pool.query('SELECT * FROM releases WHERE id = $1', [id]);
    const release = releaseRes.rows[0];
    if (!release) return res.status(404).json({ error: 'Release not found' });

    if (userId) {
      const hasPermission = await checkPermission(userId, release.project_id, 'manage_releases');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to manage releases in this project.' });
      }
    }

    await pool.query('DELETE FROM releases WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting release:', err);
    res.status(500).json({ error: err.message });
  }
});

// Permission Schemes API
app.get('/api/permission-schemes', async (req, res) => {
  try {
    const schemesRes = await pool.query('SELECT * FROM permission_schemes');
    const schemes = schemesRes.rows.map(ps => ({
      id: ps.id,
      name: ps.name,
      description: ps.description,
      permissions: ps.permissions
    }));
    res.json(schemes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/permission-schemes', async (req, res) => {
  const { id, name, description, permissions } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    if (userId) {
      const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
      if (userRes.rows[0]?.global_role !== 'Admin') {
        return res.status(403).json({ error: 'Permission denied: Only global Admins can manage permission schemes.' });
      }
    }
    
    await pool.query(
      `INSERT INTO permission_schemes (id, name, description, permissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         permissions = EXCLUDED.permissions`,
      [id, name, description, JSON.stringify(permissions)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/permission-schemes/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  try {
    if (userId) {
      const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
      if (userRes.rows[0]?.global_role !== 'Admin') {
        return res.status(403).json({ error: 'Permission denied: Only global Admins can manage permission schemes.' });
      }
    }
    if (id === 'scheme_default') {
      return res.status(400).json({ error: 'Cannot delete the default permission scheme.' });
    }
    await pool.query('DELETE FROM permission_schemes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project Workflows API
app.get('/api/projects/:projectId/workflow', async (req, res) => {
  const { projectId } = req.params;
  try {
    const wfRes = await pool.query('SELECT * FROM project_workflows WHERE project_id = $1', [projectId]);
    if (wfRes.rows.length === 0) {
      return res.json({ projectId, statuses: ["To Do", "In Progress", "Review", "Done"], transitions: [] });
    }
    const pw = wfRes.rows[0];
    res.json({
      projectId: pw.project_id,
      statuses: pw.statuses,
      transitions: pw.transitions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/workflow', async (req, res) => {
  const { projectId } = req.params;
  const { statuses, transitions } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    if (userId) {
      const hasPermission = await checkPermission(userId, projectId, 'manage_members');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to manage workflows for this project.' });
      }
    }

    await pool.query(
      `INSERT INTO project_workflows (project_id, statuses, transitions)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id) DO UPDATE SET
         statuses = EXCLUDED.statuses,
         transitions = EXCLUDED.transitions`,
      [projectId, JSON.stringify(statuses), JSON.stringify(transitions)]
    );

    // Keep custom_columns in projects in sync
    await pool.query(
      'UPDATE projects SET custom_columns = $1 WHERE id = $2',
      [JSON.stringify(statuses), projectId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Task Commits API
app.get('/api/tasks/:taskId/commits', async (req, res) => {
  const { taskId } = req.params;
  try {
    const commitsRes = await pool.query('SELECT * FROM task_commits WHERE task_id = $1 ORDER BY timestamp DESC', [taskId]);
    const commits = commitsRes.rows.map(c => ({
      id: c.id,
      taskId: c.task_id,
      commitHash: c.commit_hash,
      message: c.message,
      author: c.author,
      timestamp: c.timestamp
    }));
    res.json(commits);
  } catch (err) {
    console.error('Error fetching commits:', err);
    res.status(500).json({ error: err.message });
  }
});
// Project Messages API (Chat)
app.get('/api/projects/:projectId/messages', async (req, res) => {
  const { projectId } = req.params;
  try {
    const messagesRes = await pool.query('SELECT * FROM project_messages WHERE project_id = $1 ORDER BY created_at ASC', [projectId]);
    const messages = messagesRes.rows.map(m => ({
      id: m.id,
      projectId: m.project_id,
      userId: m.user_id,
      text: m.text,
      timestamp: m.created_at,
      attachments: m.attachments || []
    }));
    res.json(messages);
  } catch (err) {
    console.error('Error fetching project messages:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/messages', async (req, res) => {
  const { projectId } = req.params;
  const { userId, text, attachments, mentionedUserIds } = req.body;
  
  if (!userId || !text) {
    return res.status(400).json({ error: 'Missing userId or text' });
  }

  const id = 'msg_' + crypto.randomUUID();
  const safeAttachments = attachments || [];
  
  try {
    await pool.query(
      'INSERT INTO project_messages (id, project_id, user_id, text, attachments) VALUES ($1, $2, $3, $4, $5)',
      [id, projectId, userId, text, JSON.stringify(safeAttachments)]
    );
    
    // Create notifications for mentioned users
    if (mentionedUserIds && Array.isArray(mentionedUserIds)) {
      for (const targetUserId of mentionedUserIds) {
        if (targetUserId === userId) continue; // Don't notify self
        
        const notifId = 'notif_' + crypto.randomUUID();
        await pool.query(
          'INSERT INTO chat_notifications (id, user_id, project_id, message_id, sender_id, text) VALUES ($1, $2, $3, $4, $5, $6)',
          [notifId, targetUserId, projectId, id, userId, text]
        );
      }
    }
    
    // Fetch and return the inserted message to ensure timestamp is correct
    const newMsgRes = await pool.query('SELECT * FROM project_messages WHERE id = $1', [id]);
    const m = newMsgRes.rows[0];
    
    res.status(201).json({
      id: m.id,
      projectId: m.project_id,
      userId: m.user_id,
      text: m.text,
      timestamp: m.created_at,
      attachments: m.attachments || []
    });
  } catch (err) {
    console.error('Error creating project message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Chat Notifications APIs
app.get('/api/users/:userId/chat-notifications', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT n.*, u.name as sender_name, u.avatar as sender_avatar, p.name as project_name
      FROM chat_notifications n
      JOIN users u ON n.sender_id = u.id
      JOIN projects p ON n.project_id = p.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `, [userId]);
    
    const notifications = result.rows.map(n => ({
      id: n.id,
      userId: n.user_id,
      projectId: n.project_id,
      messageId: n.message_id,
      senderId: n.sender_id,
      senderName: n.sender_name,
      senderAvatar: n.sender_avatar,
      projectName: n.project_name,
      text: n.text,
      isRead: n.is_read,
      createdAt: n.created_at
    }));
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching chat notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat-notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE chat_notifications SET is_read = TRUE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:userId/projects/:projectId/chat-notifications/read', async (req, res) => {
  const { userId, projectId } = req.params;
  try {
    await pool.query('UPDATE chat_notifications SET is_read = TRUE WHERE user_id = $1 AND project_id = $2', [userId, projectId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking project notifications as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// File Upload API
app.post('/api/upload', async (req, res) => {
  try {
    const { file, fileName, type } = req.body; // file is a base64 string
    if (!file || !fileName) {
      return res.status(400).json({ error: 'Missing file data' });
    }

    // Decode base64
    const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    // Create unique filename to avoid collision
    const ext = path.extname(fileName) || '';
    const nameWithoutExt = path.basename(fileName, ext);
    const uniqueFileName = `${nameWithoutExt}-${Date.now()}${ext}`;
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir);
    }

    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    // Return the base64 file data URL directly to persist it in the database.
    // This prevents uploaded files from disappearing when ephemeral containers (Nixpacks/Render/Railway) restart or rebuild.
    res.json({ url: file, name: fileName, type });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper for Processing Webhook Commits
async function processCommit(hash, message, author) {
  const taskRegex = /(?:\[|#)(t_?[a-zA-Z0-9]+)(?:\]|\b)/gi;
  let match;
  const taskIds = new Set();
  while ((match = taskRegex.exec(message)) !== null) {
    taskIds.add(match[1]);
  }

  for (const taskId of taskIds) {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    const task = taskRes.rows[0];
    if (task) {
      const lowerMsg = message.toLowerCase();
      let newStatus = task.status;
      
      const doneKeywords = ['fix', 'close', 'resolve', 'complete', 'done', 'แก้', 'ปิด'];
      const inProgressKeywords = ['work', 'progress', 'develop', 'start', 'ทำ', 'เริ่ม'];
      
      const projRes = await pool.query('SELECT custom_columns FROM projects WHERE id = $1', [task.project_id]);
      const columns = projRes.rows[0]?.custom_columns || ['To Do', 'In Progress', 'Review', 'Done'];
      
      if (doneKeywords.some(k => lowerMsg.includes(k))) {
        newStatus = columns[columns.length - 1];
      } else if (inProgressKeywords.some(k => lowerMsg.includes(k))) {
        newStatus = columns[1] || 'In Progress';
      }

      await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [newStatus, taskId]);

      const commitId = 'c_' + Math.random().toString(36).substr(2, 9);
      await pool.query(
        `INSERT INTO task_commits (id, task_id, commit_hash, message, author, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [commitId, taskId, hash.substring(0, 8), message, author, new Date().toISOString()]
      );
    }
  }
}

// GitHub Webhook API
app.post('/api/webhooks/github', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.commits) {
    return res.status(400).send('Invalid GitHub Webhook Payload');
  }

  try {
    for (const commit of payload.commits) {
      await processCommit(commit.id, commit.message, commit.author.name || commit.author.email);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error processing GitHub Webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// GitLab Webhook API
app.post('/api/webhooks/gitlab', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.commits) {
    return res.status(400).send('Invalid GitLab Webhook Payload');
  }

  try {
    for (const commit of payload.commits) {
      await processCommit(commit.id, commit.message, commit.author.name || commit.author.email);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error processing GitLab Webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// Timesheets REST API
app.post('/api/timesheets', async (req, res) => {
  const { id, userId, projectId, taskId, date, hours, plannedHours, startTime, endTime, description, status, approvedBy, approvedAt, imageUrl, workResults, checkInLat, checkInLng, beforeImage } = req.body;
  const updatedAt = new Date().toISOString();
  try {
    // Check existing status before update to detect transitions
    const existingTimesheet = await pool.query('SELECT status FROM timesheets WHERE id = $1', [id]);
    const oldStatus = existingTimesheet.rows[0]?.status;

    await pool.query(
      `INSERT INTO timesheets (id, user_id, project_id, task_id, date, hours, planned_hours, start_time, end_time, description, status, approved_by, approved_at, image_url, work_results, updated_at, check_in_lat, check_in_lng, before_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         project_id = EXCLUDED.project_id,
         task_id = EXCLUDED.task_id,
         date = EXCLUDED.date,
         hours = EXCLUDED.hours,
         planned_hours = EXCLUDED.planned_hours,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         approved_by = EXCLUDED.approved_by,
         approved_at = EXCLUDED.approved_at,
         image_url = EXCLUDED.image_url,
         work_results = EXCLUDED.work_results,
         check_in_lat = COALESCE(EXCLUDED.check_in_lat, timesheets.check_in_lat),
         check_in_lng = COALESCE(EXCLUDED.check_in_lng, timesheets.check_in_lng),
         before_image = COALESCE(EXCLUDED.before_image, timesheets.before_image),
         updated_at = EXCLUDED.updated_at`,
      [id, userId, projectId, taskId, date, hours, plannedHours ?? null, startTime || null, endTime || null, description, status, approvedBy, approvedAt, imageUrl || null, workResults || null, updatedAt, checkInLat || null, checkInLng || null, beforeImage || null]
    );

    // Send email notifications asynchronously (non-blocking)
    if (oldStatus !== status) {
      (async () => {
        try {
          // Fetch employee details
          const employeeRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
          const employee = employeeRes.rows[0];
          if (!employee) return;

          // Fetch project details
          const projectRes = await pool.query('SELECT name, members FROM projects WHERE id = $1', [projectId]);
          const project = projectRes.rows[0];
          if (!project) return;

          if (status === 'Pending') {
            // Find PM of this project
            const members = project.members || [];
            const pmMember = members.find(m => m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader');
            if (pmMember) {
              const pmRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [pmMember.userId]);
              const pm = pmRes.rows[0];
              if (pm && pm.email) {
                // Send email to PM
                const subject = `[NexTime] Timesheet Pending Approval: ${employee.name} - ${project.name}`;
                const html = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fdfdfd;">
                    <div style="text-align: center; border-bottom: 2px solid #06C755; padding-bottom: 15px; margin-bottom: 20px;">
                      <h2 style="color: #333; margin: 0;">NexTime Project Management</h2>
                      <span style="color: #666; font-size: 0.9em;">Timesheet Approval Request</span>
                    </div>
                    <p>Dear <strong>${pm.name}</strong>,</p>
                    <p>A new timesheet entry has been submitted for your approval by <strong>${employee.name}</strong>.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr style="background-color: #f2f2f2;">
                        <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 30%;">Project</th>
                        <td style="padding: 10px; border: 1px solid #ddd;">${project.name}</td>
                      </tr>
                      <tr>
                        <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Date</th>
                        <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
                      </tr>
                      <tr style="background-color: #f2f2f2;">
                        <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Hours</th>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>${hours} hours</strong></td>
                      </tr>
                      <tr>
                        <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Description</th>
                        <td style="padding: 10px; border: 1px solid #ddd;">${description || 'No description provided.'}</td>
                      </tr>
                    </table>
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                      <a href="https://vibeproject.online" style="background-color: #06C755; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Team Approvals</a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                    <p style="font-size: 0.8em; color: #999; text-align: center;">This is an automated email from NexTime. Please do not reply directly to this message.</p>
                  </div>
                `;
                await sendEmail({ to: pm.email, subject, html });
              }
            }
          } else if (status === 'Approved' || status === 'Rejected') {
            if (employee.email) {
              // Fetch PM name who approved/rejected
              let pmName = 'Project Manager';
              if (approvedBy) {
                const pmRes = await pool.query('SELECT name FROM users WHERE id = $1', [approvedBy]);
                if (pmRes.rows[0]) {
                  pmName = pmRes.rows[0].name;
                }
              }
              
              const isApproved = status === 'Approved';
              const statusColor = isApproved ? '#06C755' : '#ff4d4f';
              
              const subject = `[NexTime] Timesheet ${status}: ${project.name}`;
              const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fdfdfd;">
                  <div style="text-align: center; border-bottom: 2px solid ${statusColor}; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin: 0;">NexTime Project Management</h2>
                    <span style="color: ${statusColor}; font-size: 1.1em; font-weight: bold;">Timesheet Entry ${status}</span>
                  </div>
                  <p>Dear <strong>${employee.name}</strong>,</p>
                  <p>Your timesheet entry for project <strong>${project.name}</strong> has been <strong><span style="color: ${statusColor};">${status.toLowerCase()}</span></strong> by ${pmName}.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #f2f2f2;">
                      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 30%;">Project</th>
                      <td style="padding: 10px; border: 1px solid #ddd;">${project.name}</td>
                    </tr>
                    <tr>
                      <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Date</th>
                      <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                      <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Hours</th>
                      <td style="padding: 10px; border: 1px solid #ddd;"><strong>${hours} hours</strong></td>
                    </tr>
                    <tr>
                      <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Description</th>
                      <td style="padding: 10px; border: 1px solid #ddd;">${description || 'No description provided.'}</td>
                    </tr>
                  </table>
                  <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="https://vibeproject.online" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View My Timesheet</a>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                  <p style="font-size: 0.8em; color: #999; text-align: center;">This is an automated email from NexTime. Please do not reply directly to this message.</p>
                </div>
              `;
              await sendEmail({ to: employee.email, subject, html });
            }
          }
        } catch (mailErr) {
          console.error('⚠️ Failed to process notification emails:', mailErr.message);
        }
      })();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving timesheet:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timesheets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM timesheets WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting timesheet:', err);
    res.status(500).json({ error: err.message });
  }
});

// Task Templates REST API
app.post('/api/task-templates', async (req, res) => {
  const { id, title, description, priority, startPercent, endPercent, estimatedHours, projectTemplateName } = req.body;
  try {
    await pool.query(
      `INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         priority = EXCLUDED.priority,
         start_percent = EXCLUDED.start_percent,
         end_percent = EXCLUDED.end_percent,
         estimated_hours = EXCLUDED.estimated_hours,
         project_template_name = EXCLUDED.project_template_name`,
      [id, title, description, priority, startPercent, endPercent, estimatedHours, projectTemplateName || 'General']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving task template:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/task-templates/bulk', async (req, res) => {
  const { templates } = req.body;
  if (!Array.isArray(templates) || templates.length === 0) {
    return res.status(400).json({ error: 'templates array is required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const tpl of templates) {
      const tId = tpl.id || ('tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      await client.query(
        `INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           priority = EXCLUDED.priority,
           start_percent = EXCLUDED.start_percent,
           end_percent = EXCLUDED.end_percent,
           estimated_hours = EXCLUDED.estimated_hours,
           project_template_name = EXCLUDED.project_template_name`,
        [tId, tpl.title, tpl.description || '', tpl.priority || 'Medium', tpl.startPercent || 0, tpl.endPercent || 10, tpl.estimatedHours || 8, tpl.projectTemplateName || 'General']
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, count: templates.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error bulk saving task templates:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/task-templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM task_templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task template:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cost Rates REST API
app.post('/api/cost-rates', async (req, res) => {
  const { id, roleName, ratePerDay, ratePerHour, currency } = req.body;
  try {
    await pool.query(
      `INSERT INTO cost_rates (id, role_name, rate_per_day, rate_per_hour, currency)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         role_name = EXCLUDED.role_name,
         rate_per_day = EXCLUDED.rate_per_day,
         rate_per_hour = EXCLUDED.rate_per_hour,
         currency = EXCLUDED.currency`,
      [id, roleName, ratePerDay, ratePerHour, currency || 'THB']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving cost rate:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cost-rates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cost_rates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting cost rate:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- System Settings API ---
app.get('/api/system-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system-settings', async (req, res) => {
  const settings = req.body; // e.g. { openai_api_key: 'sk-...' }
  try {
    // We can iterate and upsert each key
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value
      `, [key, value]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving system settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// DB Connection Diagnostics API
app.get('/api/db-status', async (req, res) => {
  try {
    const host = connectionString 
      ? (connectionString.match(/@([^/:]+)/) ? connectionString.match(/@([^/:]+)/)[1] : 'DATABASE_URL')
      : (process.env.DB_HOST || 'localhost');
    
    const testRes = await pool.query('SELECT NOW()');
    res.json({
      connected: true,
      host: host,
      time: testRes.rows[0].now,
      usingConnectionString: !!connectionString
    });
  } catch (err) {
    res.json({
      connected: false,
      error: err.message
    });
  }
});

// ==========================================
// Clean / Reset Tasks Data API (Admin Only)
// Deletes: tasks, sprints, releases, timesheets, milestones, baselines, task_snapshots, task_commits
// Keeps: projects, users, settings, workflows, permission_schemes, cost_rates, task_templates
// ==========================================
app.post('/api/clean-tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is Admin
    const userRes = await pool.query('SELECT global_role FROM users WHERE id = $1', [userId]);
    if (!userRes.rows[0] || userRes.rows[0].global_role !== 'Admin') {
      return res.status(403).json({ error: 'Only Admin can perform this action' });
    }

    // Count existing records before deletion (for summary)
    const counts = {};
    const tables = ['tasks', 'sprints', 'releases', 'timesheets', 'project_baselines', 'task_snapshots', 'task_commits'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    }

    // Delete in correct order (respecting potential FK relationships)
    await pool.query('DELETE FROM task_snapshots');
    await pool.query('DELETE FROM project_baselines');
    await pool.query('DELETE FROM task_commits');
    await pool.query('DELETE FROM timesheets');
    await pool.query('DELETE FROM tasks');
    await pool.query('DELETE FROM sprints');
    await pool.query('DELETE FROM releases');

    console.log('🧹 Clean-tasks executed by user:', userId);
    console.log('   Deleted:', counts);

    res.json({
      success: true,
      message: 'All task-related data has been cleaned successfully',
      deleted: counts
    });
  } catch (err) {
    console.error('Error cleaning tasks:', err);
    res.status(500).json({ error: 'Failed to clean tasks', details: err.message });
  }
});
// ==========================================
// LEADS API
// ==========================================
const leadRoutes = require('./src/routes/leadRoutes.cjs');
app.use('/api/leads', leadRoutes);



// Convert lead to project
app.post('/api/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leadResult.rows[0];

    if (lead.project_id) {
        return res.status(400).json({ error: 'Lead is already converted to a project.'});
    }

    const projectId = await generateFormattedProjectId(lead.job_type, '');
    const now = new Date().toISOString();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endDateStr = end.toISOString();

    const membersJson = JSON.stringify(admin_id ? [{ id: admin_id, role: 'Manager' }] : []);

    const jobType = (lead.job_type || '').toLowerCase().trim();
    const commonStages = ["To Do"];
    const buySurveyStages = ["Buy-Survey", "Survey"];
    const designStages = ["Design"];
    const executionStages = ["ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];
    let cols;
    if (jobType === 'quick' || jobType === 'quick_service' || jobType === 'quick service' || jobType.startsWith('quick')) {
      cols = [...commonStages, ...executionStages];
    } else if (
      jobType === 'install' || 
      jobType === 'installer' || 
      jobType === 'installer service' || 
      jobType === 'installation' || 
      jobType === 'pi' || 
      jobType === 'ma' || 
      jobType === 'maintenance' || 
      jobType === 'ma service'
    ) {
      cols = [...commonStages, ...buySurveyStages, ...executionStages];
    } else {
      cols = [...commonStages, ...buySurveyStages, ...designStages, ...executionStages];
    }

    const projResult = await pool.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, members, address, project_type, custom_columns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        projectId, 
        `[${lead.job_type}] ${lead.customer_name}`, 
        `Auto-generated from lead ${lead.id}\nNotes: ${lead.notes || ''}`, 
        'To Do', 
        now, 
        endDateStr, 
        membersJson, 
        lead.customer_address,
        lead.job_type,
        JSON.stringify(cols)
      ]
    );

    await pool.query(
        `INSERT INTO project_workflows (project_id, statuses, transitions) VALUES ($1, $2, $3)`,
        [projectId, JSON.stringify(cols), JSON.stringify([])]
    );

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

    for (let i = 0; i < tpls.length; i++) {
        const tpl = tpls[i];
        const taskId = `t_${Date.now()}_${i}`;
        await pool.query(
            `INSERT INTO tasks (id, project_id, title, description, status, priority, estimated_hours, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [taskId, projectId, tpl.title, tpl.description, 'To Do', tpl.priority, tpl.estimated_hours, now]
        );
    }

    await pool.query(
        `UPDATE leads SET status = 'Converted', project_id = $1, updated_at = $2 WHERE id = $3`,
        [projectId, now, id]
    );

    res.json({ message: 'Lead converted successfully', project: projResult.rows[0] });

  } catch (err) {
    console.error('Error converting lead:', err);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});


app.get('/api/user-manual', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'user_manual.md');
    const content = await fs.promises.readFile(filePath, 'utf8');
    res.json({ success: true, content });
  } catch (err) {
    console.error('Error reading user manual:', err);
    res.status(500).json({ error: 'Failed to read user manual' });
  }
});

// ====================================================
// VQ SYSTEM INTEGRATION API ENDPOINTS (Approach 2 REST API)
// ====================================================

// API Key Validation Middleware
function validateIntegrationKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.INTEGRATION_API_KEY || 'bf_vq_sync_secret_2026';
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
  }
  next();
}

// Apply validation middleware to all integration routes
const integrationRouter = express.Router();
integrationRouter.use(validateIntegrationKey);

// --- ZONES CRUD ---

// 1. GET /api/integration/zones - List all zones
integrationRouter.get('/zones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zones ORDER BY code ASC');
    res.json({ success: true, zones: result.rows });
  } catch (err) {
    console.error('Error fetching integration zones:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. POST /api/integration/zones - Create / Upsert a zone
integrationRouter.post('/zones', async (req, res) => {
  const { id, code, name, description, coverage_zipcodes } = req.body;
  if (!id || !code || !name) {
    return res.status(400).json({ error: 'Missing required fields: id, code, name' });
  }
  try {
    const query = `
      INSERT INTO zones (id, code, name, description, coverage_zipcodes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        coverage_zipcodes = EXCLUDED.coverage_zipcodes,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [
      id, 
      code, 
      name, 
      description || null, 
      JSON.stringify(coverage_zipcodes || [])
    ]);
    res.json({ success: true, zone: result.rows[0] });
  } catch (err) {
    console.error('Error upserting integration zone:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. PUT /api/integration/zones/:id - Update an existing zone
integrationRouter.put('/zones/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, description, coverage_zipcodes } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Missing required fields: code, name' });
  }
  try {
    const query = `
      UPDATE zones
      SET code = $1, name = $2, description = $3, coverage_zipcodes = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [
      code, 
      name, 
      description || null, 
      JSON.stringify(coverage_zipcodes || []), 
      id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ success: true, zone: result.rows[0] });
  } catch (err) {
    console.error('Error updating integration zone:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. DELETE /api/integration/zones/:id - Delete a zone
integrationRouter.delete('/zones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ success: true, message: 'Zone deleted successfully', zone: result.rows[0] });
  } catch (err) {
    console.error('Error deleting integration zone:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- TECHNICIANS CRUD ---

// 1. GET /api/integration/technicians - List all technicians
integrationRouter.get('/technicians', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM technicians ORDER BY name ASC');
    res.json({ success: true, technicians: result.rows });
  } catch (err) {
    console.error('Error fetching integration technicians:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. POST /api/integration/technicians - Create / Upsert a technician
integrationRouter.post('/technicians', async (req, res) => {
  const { 
    id, user_id, code, name, phone, avatar, tier, rating, status, 
    primary_zone, secondary_zones, skills, extra_data 
  } = req.body;
  
  if (!id || !code || !name) {
    return res.status(400).json({ error: 'Missing required fields: id, code, name' });
  }
  
  try {
    const query = `
      INSERT INTO technicians (
        id, user_id, code, name, phone, avatar, tier, rating, status, 
        primary_zone, secondary_zones, skills, extra_data, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        avatar = EXCLUDED.avatar,
        tier = EXCLUDED.tier,
        rating = EXCLUDED.rating,
        status = EXCLUDED.status,
        primary_zone = EXCLUDED.primary_zone,
        secondary_zones = EXCLUDED.secondary_zones,
        skills = EXCLUDED.skills,
        extra_data = EXCLUDED.extra_data,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      user_id || null,
      code,
      name,
      phone || null,
      avatar || null,
      tier || 'Standard',
      rating ? parseFloat(rating) : 5.0,
      status || 'Active',
      primary_zone || null,
      JSON.stringify(secondary_zones || []),
      JSON.stringify(skills || []),
      JSON.stringify(extra_data || {})
    ]);
    res.json({ success: true, technician: result.rows[0] });
  } catch (err) {
    console.error('Error upserting integration technician:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. PUT /api/integration/technicians/:id - Update an existing technician
integrationRouter.put('/technicians/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    user_id, code, name, phone, avatar, tier, rating, status, 
    primary_zone, secondary_zones, skills, extra_data 
  } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ error: 'Missing required fields: code, name' });
  }
  
  try {
    const query = `
      UPDATE technicians
      SET 
        user_id = $1, code = $2, name = $3, phone = $4, avatar = $5, 
        tier = $6, rating = $7, status = $8, primary_zone = $9, 
        secondary_zones = $10, skills = $11, extra_data = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;
    const result = await pool.query(query, [
      user_id || null,
      code,
      name,
      phone || null,
      avatar || null,
      tier || 'Standard',
      rating ? parseFloat(rating) : 5.0,
      status || 'Active',
      primary_zone || null,
      JSON.stringify(secondary_zones || []),
      JSON.stringify(skills || []),
      JSON.stringify(extra_data || {}),
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json({ success: true, technician: result.rows[0] });
  } catch (err) {
    console.error('Error updating integration technician:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. DELETE /api/integration/technicians/:id - Delete a technician
integrationRouter.delete('/technicians/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM technicians WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json({ success: true, message: 'Technician deleted successfully', technician: result.rows[0] });
  } catch (err) {
    console.error('Error deleting integration technician:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- SKILLS AGGREGATION ---

// 1. GET /api/integration/skills - List all unique skills across all technicians
integrationRouter.get('/skills', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT jsonb_array_elements_text(skills) as skill 
      FROM technicians 
      WHERE skills IS NOT NULL AND jsonb_typeof(skills) = 'array' 
      ORDER BY skill;
    `;
    const result = await pool.query(query);
    const skills = result.rows.map(r => r.skill);
    res.json({ success: true, skills });
  } catch (err) {
    console.error('Error fetching integration skills:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- BRANCHES CRUD ---

// 1. GET /api/integration/branches - List all branches
integrationRouter.get('/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM branches ORDER BY name ASC');
    res.json({ success: true, branches: result.rows });
  } catch (err) {
    console.error('Error fetching integration branches:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. POST /api/integration/branches - Create / Upsert a branch
integrationRouter.post('/branches', async (req, res) => {
  const { 
    id, code, name, province, status, fullName, address, 
    latitude, longitude, openTime, closeTime, phone, storeGroup 
  } = req.body;

  if (!id || !code || !name) {
    return res.status(400).json({ error: 'Missing required fields: id, code, name' });
  }

  try {
    const query = `
      INSERT INTO branches (
        id, code, name, province, status, full_name, address, 
        latitude, longitude, open_time, close_time, phone, store_group, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        province = EXCLUDED.province,
        status = EXCLUDED.status,
        full_name = EXCLUDED.full_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        phone = EXCLUDED.phone,
        store_group = EXCLUDED.store_group,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      code,
      name,
      province || null,
      status || 'Active',
      fullName || null,
      address || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      openTime || '07:00',
      closeTime || '21:00',
      phone || '1308',
      storeGroup || 'TWD'
    ]);
    res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    console.error('Error upserting integration branch:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. PUT /api/integration/branches/:id - Update an existing branch
integrationRouter.put('/branches/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    code, name, province, status, fullName, address, 
    latitude, longitude, openTime, closeTime, phone, storeGroup 
  } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Missing required fields: code, name' });
  }

  try {
    const query = `
      UPDATE branches
      SET 
        code = $1, name = $2, province = $3, status = $4, full_name = $5, 
        address = $6, latitude = $7, longitude = $8, open_time = $9, 
        close_time = $10, phone = $11, store_group = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;
    const result = await pool.query(query, [
      code,
      name,
      province || null,
      status || 'Active',
      fullName || null,
      address || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      openTime || '07:00',
      closeTime || '21:00',
      phone || '1308',
      storeGroup || 'TWD',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    console.error('Error updating integration branch:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. DELETE /api/integration/branches/:id - Delete a branch
integrationRouter.delete('/branches/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM branches WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json({ success: true, message: 'Branch deleted successfully', branch: result.rows[0] });
  } catch (err) {
    console.error('Error deleting integration branch:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.use('/api/integration', integrationRouter);

// Using app.use instead of app.get('/(.*)', ...) to avoid path-to-regexp v6 incompatibility
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
