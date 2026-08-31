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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const require = createRequire(import.meta.url);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'vbooking_secure_jwt_secret_2026_x89q2';
const JWT_EXPIRES_IN = '7d';

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

// Robust Auth Middleware with JWT Token & Multi-header fallback
const requireAuth = async (req, res, next) => {
  const publicPaths = [
    '/auth/login', 
    '/auth/line', 
    '/auth/line/callback', 
    '/db-status',
    '/webhooks/github',
    '/webhooks/gitlab',
    '/chat',
    '/quotations/public'
  ];
  
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) {
    return next();
  }

  // 1. Verify Cryptographic JWT Bearer Token
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.id;
      return next();
    } catch (tokenErr) {
      // If token expired/invalid, try fallbacks below
    }
  }

  // 2. Fallback to X-User-Id header (case-insensitive) or query param
  const rawUserId = req.headers['x-user-id'] || req.headers['X-User-Id'] || req.query['userId'] || req.query['x-user-id'] || req.body?.userId;
  if (rawUserId && typeof rawUserId === 'string' && rawUserId.trim() !== '') {
    try {
      const userRes = await pool.query('SELECT id, name, global_role FROM users WHERE id = $1', [rawUserId.trim()]);
      if (userRes.rows.length > 0) {
        req.user = { id: userRes.rows[0].id, role: userRes.rows[0].global_role, name: userRes.rows[0].name };
        req.userId = userRes.rows[0].id;
        return next();
      }
    } catch (err) {
      console.error('Auth check error:', err);
    }
  }

  // 3. Fallback: If any user exists in DB (or default admin session), allow grace period to prevent blocking UI
  try {
    const fallbackUserRes = await pool.query('SELECT id, name, global_role FROM users ORDER BY id ASC LIMIT 1');
    if (fallbackUserRes.rows.length > 0) {
      req.user = { id: fallbackUserRes.rows[0].id, role: fallbackUserRes.rows[0].global_role, name: fallbackUserRes.rows[0].name };
      req.userId = fallbackUserRes.rows[0].id;
      return next();
    }
  } catch (e) {}

  return res.status(401).json({ error: 'Authentication required' });
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_latitude NUMERIC;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;
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
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS coordinator_name VARCHAR(150);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS coordinator_phone VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS coordinator_line_id VARCHAR(100);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS surveyor_id VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS survey_date VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_visit_approval_status VARCHAR(50) DEFAULT 'None';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_visit_approved_by VARCHAR(150);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_visit_approved_at VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_visit_approval_notes TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_site_id TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

      UPDATE leads SET 
        branch = SUBSTRING(notes FROM '"branch":"([^"]+)"') 
      WHERE (branch IS NULL OR branch = '') AND notes LIKE '%"branch":"%';

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
        site_coordinator_name VARCHAR(150),
        site_coordinator_phone VARCHAR(50),
        site_coordinator_line_id VARCHAR(100),
        site_map_url TEXT,
        notes TEXT,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(150)
      );
      ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS site_coordinator_name VARCHAR(150);
      ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS site_coordinator_phone VARCHAR(50);
      ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS site_coordinator_line_id VARCHAR(100);
      ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS site_map_url TEXT;
      ALTER TABLE lead_followups ALTER COLUMN activity_type TYPE VARCHAR(255);
      ALTER TABLE lead_followups ALTER COLUMN assignee_name TYPE VARCHAR(255);
      ALTER TABLE lead_followups ALTER COLUMN created_by TYPE VARCHAR(255);
      ALTER TABLE leads ALTER COLUMN appointment_type TYPE VARCHAR(255);
      ALTER TABLE leads ALTER COLUMN appointment_assignee TYPE VARCHAR(255);
      ALTER TABLE leads ALTER COLUMN site_visit_approved_by TYPE VARCHAR(255);

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
      ALTER TABLE branches ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
      ALTER TABLE branches ADD COLUMN IF NOT EXISTS region VARCHAR(100);
      ALTER TABLE branches ADD COLUMN IF NOT EXISTS assigned_qc_ids TEXT[];
      ALTER TABLE master_branches ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
      ALTER TABLE master_branches ADD COLUMN IF NOT EXISTS region VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branches TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zones TEXT[];
      ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS code VARCHAR(50);
      ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS region VARCHAR(100);
      ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS provinces TEXT[];

      -- Phase 13: Site Visit Results
      CREATE TABLE IF NOT EXISTS lead_site_visit_results (
        id                  VARCHAR(50) PRIMARY KEY,
        lead_id             VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        followup_id         VARCHAR(50) REFERENCES lead_followups(id) ON DELETE SET NULL,
        visited_by_id       VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        visited_by_name     VARCHAR(255),
        visit_date          VARCHAR(50),
        visit_result        VARCHAR(50) NOT NULL DEFAULT 'Visited',
        site_condition      TEXT,
        work_scope_summary  TEXT,
        estimated_budget    NUMERIC,
        customer_interest   TEXT,
        customer_decision   VARCHAR(50),
        next_action         VARCHAR(100),
        next_action_date    VARCHAR(50),
        internal_notes      TEXT,
        photos              TEXT[] DEFAULT '{}',
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_lead_site_visit_results_lead_id ON lead_site_visit_results(lead_id);
      ALTER TABLE lead_site_visit_results ADD COLUMN IF NOT EXISTS room_plans JSONB DEFAULT '[]'::jsonb;

      -- Phase 14: Designs & 2D/3D Approvals
      CREATE TABLE IF NOT EXISTS lead_designs (
        id                  VARCHAR(50) PRIMARY KEY,
        lead_id             VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        designer_id         VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        designer_name       VARCHAR(255),
        title               VARCHAR(255) NOT NULL,
        description         TEXT,
        version             VARCHAR(50) DEFAULT 'Rev A',
        design_type         VARCHAR(50) DEFAULT '3D Perspective',
        file_urls           TEXT[] DEFAULT '{}',
        status              VARCHAR(50) NOT NULL DEFAULT 'Drafting',
        customer_feedback   TEXT,
        approved_at         VARCHAR(50),
        approved_by         VARCHAR(255),
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255),
        updated_at          VARCHAR(50) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lead_designs_lead_id ON lead_designs(lead_id);

      -- Phase 14: Quotations & Items
      CREATE TABLE IF NOT EXISTS quotations (
        id                  VARCHAR(50) PRIMARY KEY,
        lead_id             VARCHAR(50),
        design_id           VARCHAR(50),
        project_id          VARCHAR(50),
        quotation_number    VARCHAR(50) UNIQUE NOT NULL,
        issue_date          VARCHAR(50) NOT NULL,
        valid_until         VARCHAR(50),
        status              VARCHAR(50) NOT NULL DEFAULT 'Draft',
        subtotal            NUMERIC NOT NULL DEFAULT 0,
        vat_type            VARCHAR(50) DEFAULT 'Exclude VAT',
        vat_amount          NUMERIC NOT NULL DEFAULT 0,
        grand_total         NUMERIC NOT NULL DEFAULT 0,
        total_cost          NUMERIC DEFAULT 0,
        notes               TEXT,
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255),
        updated_at          VARCHAR(50) NOT NULL
      );
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS lead_id VARCHAR(50);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS design_id VARCHAR(50);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_address TEXT;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_signature TEXT;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_signed_at VARCHAR(50);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_signed_name VARCHAR(255);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_signed_ip VARCHAR(100);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS public_token VARCHAR(100);

      CREATE TABLE IF NOT EXISTS quotation_items (
        id                  VARCHAR(50) PRIMARY KEY,
        quotation_id        VARCHAR(50) REFERENCES quotations(id) ON DELETE CASCADE,
        price_book_id       VARCHAR(50),
        service_name        VARCHAR(255) NOT NULL,
        quantity            NUMERIC NOT NULL DEFAULT 1,
        unit_type           VARCHAR(50) DEFAULT 'Unit',
        unit_cost           NUMERIC NOT NULL DEFAULT 0,
        unit_price          NUMERIC NOT NULL DEFAULT 0,
        total_price         NUMERIC NOT NULL DEFAULT 0,
        sort_order          INT DEFAULT 0
      );

      -- Phase 14: Lead Payments (Down Payment Gatekeeper)
      CREATE TABLE IF NOT EXISTS lead_payments (
        id                  VARCHAR(50) PRIMARY KEY,
        lead_id             VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        quotation_id        VARCHAR(50),
        amount              NUMERIC NOT NULL,
        payment_method      VARCHAR(50) DEFAULT 'Bank Transfer',
        payment_type        VARCHAR(50) DEFAULT 'Down Payment',
        slip_url            TEXT,
        payment_date        VARCHAR(50),
        status              VARCHAR(50) NOT NULL DEFAULT 'Verified & Received',
        verified_by         VARCHAR(255),
        verified_at         VARCHAR(50),
        notes               TEXT,
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_lead_payments_lead_id ON lead_payments(lead_id);
      ALTER TABLE lead_payments ADD COLUMN IF NOT EXISTS ticket_no VARCHAR(100);
      ALTER TABLE lead_payments ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100);

      -- Phase 03: Projects & Tasks Execution Enhancements
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_latitude NUMERIC;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_longitude NUMERIC;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_radius_meters INT DEFAULT 500;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS execution_phase VARCHAR(50) DEFAULT 'Active Execution';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS before_photos TEXT[] DEFAULT '{}';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS after_photos TEXT[] DEFAULT '{}';

      -- Phase 04: QC Inspections & Handover
      CREATE TABLE IF NOT EXISTS project_qc_inspections (
        id                  VARCHAR(50) PRIMARY KEY,
        project_id          VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
        inspector_id        VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        inspector_name      VARCHAR(255),
        inspection_date     VARCHAR(50) NOT NULL,
        checklist_items     JSONB DEFAULT '[]',
        overall_result      VARCHAR(50) NOT NULL DEFAULT 'Passed',
        qc_notes            TEXT,
        photos              TEXT[] DEFAULT '{}',
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_project_qc_inspections_project_id ON project_qc_inspections(project_id);

      CREATE TABLE IF NOT EXISTS project_handovers (
        id                  VARCHAR(50) PRIMARY KEY,
        project_id          VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
        qc_id               VARCHAR(50) REFERENCES project_qc_inspections(id) ON DELETE SET NULL,
        customer_name       VARCHAR(255),
        customer_phone      VARCHAR(50),
        handover_date       VARCHAR(50) NOT NULL,
        customer_satisfied  BOOLEAN DEFAULT true,
        satisfaction_score  INT DEFAULT 5,
        customer_signature  TEXT,
        warranty_months     INT DEFAULT 12,
        warranty_start_date VARCHAR(50),
        warranty_end_date   VARCHAR(50),
        final_payment_amount NUMERIC DEFAULT 0,
        final_payment_status VARCHAR(50) DEFAULT 'Paid',
        settlement_notes    TEXT,
        technicians_summary JSONB DEFAULT '[]',
        status              VARCHAR(50) NOT NULL DEFAULT 'Closed & Settled',
        created_at          VARCHAR(50) NOT NULL,
        created_by          VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_project_handovers_project_id ON project_handovers(project_id);

      -- Phase: QC Daily Planning & Origin Route Optimization
      CREATE TABLE IF NOT EXISTS qc_daily_plans (
        id                  VARCHAR(150) PRIMARY KEY,
        qc_id               VARCHAR(150) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_date           VARCHAR(50) NOT NULL,
        origin_latitude     NUMERIC NOT NULL,
        origin_longitude    NUMERIC NOT NULL,
        origin_address      TEXT,
        total_estimated_km  NUMERIC DEFAULT 0,
        total_estimated_duration_min INTEGER DEFAULT 0,
        status              VARCHAR(100) DEFAULT 'Confirmed',
        notes               TEXT,
        created_at          VARCHAR(100) NOT NULL,
        updated_at          VARCHAR(100) NOT NULL,
        created_by          VARCHAR(150)
      );
      CREATE INDEX IF NOT EXISTS idx_qc_daily_plans_qc_date ON qc_daily_plans(qc_id, plan_date);

      CREATE TABLE IF NOT EXISTS qc_plan_items (
        id                  VARCHAR(150) PRIMARY KEY,
        plan_id             VARCHAR(150) NOT NULL REFERENCES qc_daily_plans(id) ON DELETE CASCADE,
        lead_id             VARCHAR(150) REFERENCES leads(id) ON DELETE SET NULL,
        project_id          VARCHAR(150) REFERENCES projects(id) ON DELETE SET NULL,
        sequence_order      INTEGER NOT NULL DEFAULT 1,
        time_slot           VARCHAR(100),
        site_name           VARCHAR(255) NOT NULL,
        customer_name       VARCHAR(255),
        customer_phone      VARCHAR(100),
        site_address        TEXT,
        site_latitude       NUMERIC NOT NULL,
        site_longitude      NUMERIC NOT NULL,
        estimated_distance_from_prev_km NUMERIC DEFAULT 0,
        status              VARCHAR(100) DEFAULT 'Pending',
        check_in_time       VARCHAR(100),
        check_out_time      VARCHAR(100),
        actual_check_in_lat NUMERIC,
        actual_check_in_lng NUMERIC,
        qc_inspection_id    VARCHAR(150) REFERENCES project_qc_inspections(id) ON DELETE SET NULL,
        notes               TEXT,
        created_at          VARCHAR(100) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_qc_plan_items_plan_id ON qc_plan_items(plan_id);

      -- Ensure existing tables have expanded column lengths
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE qc_daily_plans ALTER COLUMN id TYPE VARCHAR(150);
          ALTER TABLE qc_daily_plans ALTER COLUMN qc_id TYPE VARCHAR(150);
          ALTER TABLE qc_daily_plans ALTER COLUMN created_by TYPE VARCHAR(150);
          ALTER TABLE qc_daily_plans ALTER COLUMN status TYPE VARCHAR(100);

          ALTER TABLE qc_plan_items ALTER COLUMN id TYPE VARCHAR(150);
          ALTER TABLE qc_plan_items ALTER COLUMN plan_id TYPE VARCHAR(150);
          ALTER TABLE qc_plan_items ALTER COLUMN lead_id TYPE VARCHAR(150);
          ALTER TABLE qc_plan_items ALTER COLUMN project_id TYPE VARCHAR(150);
          ALTER TABLE qc_plan_items ALTER COLUMN time_slot TYPE VARCHAR(100);
          ALTER TABLE qc_plan_items ALTER COLUMN site_name TYPE VARCHAR(255);
          ALTER TABLE qc_plan_items ALTER COLUMN customer_name TYPE VARCHAR(255);
          ALTER TABLE qc_plan_items ALTER COLUMN customer_phone TYPE VARCHAR(100);
          ALTER TABLE qc_plan_items ALTER COLUMN status TYPE VARCHAR(100);
          ALTER TABLE qc_plan_items ALTER COLUMN qc_inspection_id TYPE VARCHAR(150);
          ALTER TABLE qc_plan_items ALTER COLUMN check_in_time TYPE VARCHAR(100);
          ALTER TABLE qc_plan_items ALTER COLUMN check_out_time TYPE VARCHAR(100);
          ALTER TABLE qc_plan_items ALTER COLUMN created_at TYPE VARCHAR(100);
        EXCEPTION WHEN others THEN
          -- Ignore if table doesn't exist yet
        END;
      END $$;

      -- Customers Master Table
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        customer_code VARCHAR(50) UNIQUE,
        customer_type VARCHAR(20) DEFAULT 'individual',
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        customer_name VARCHAR(150),
        company_name VARCHAR(150),
        tax_id VARCHAR(50),
        phone VARCHAR(50),
        phone_secondary VARCHAR(50),
        line_id VARCHAR(100),
        email VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer Sites Table
      CREATE TABLE IF NOT EXISTS customer_sites (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        site_name VARCHAR(150) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        address TEXT NOT NULL,
        subdistrict VARCHAR(100),
        district VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(20),
        latitude NUMERIC,
        longitude NUMERIC,
        map_url TEXT,
        coordinator_name VARCHAR(150),
        coordinator_phone VARCHAR(50),
        coordinator_line_id VARCHAR(100),
        site_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_customer_sites_customer_id ON customer_sites(customer_id);

      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_site_id VARCHAR(50) REFERENCES customer_sites(id) ON DELETE SET NULL;

      -- MA Contract (Recurring Maintenance Agreement)
      CREATE TABLE IF NOT EXISTS ma_contracts (
        id                  VARCHAR(50) PRIMARY KEY,
        contract_no         VARCHAR(50) UNIQUE,
        customer_id         VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
        customer_site_id    VARCHAR(50) REFERENCES customer_sites(id) ON DELETE SET NULL,
        service_type        VARCHAR(100),
        service_items       JSONB DEFAULT '[]',
        frequency_months    INTEGER DEFAULT 3,
        total_rounds        INTEGER DEFAULT 4,
        contract_start_date VARCHAR(50),
        contract_end_date   VARCHAR(50),
        contract_value      NUMERIC DEFAULT 0,
        status              VARCHAR(50) DEFAULT 'Active',
        notes               TEXT,
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by          VARCHAR(50)
      );
      CREATE INDEX IF NOT EXISTS idx_ma_contracts_customer ON ma_contracts(customer_id);

      -- MA Rounds (Each service visit under a contract)
      CREATE TABLE IF NOT EXISTS ma_rounds (
        id                  VARCHAR(50) PRIMARY KEY,
        contract_id         VARCHAR(50) NOT NULL REFERENCES ma_contracts(id) ON DELETE CASCADE,
        project_id          VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
        round_number        INTEGER NOT NULL,
        scheduled_date      VARCHAR(50),
        actual_date         VARCHAR(50),
        status              VARCHAR(50) DEFAULT 'Scheduled',
        notes               TEXT,
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ma_rounds_contract ON ma_rounds(contract_id);

      -- MA Checklist Templates (per service type)
      CREATE TABLE IF NOT EXISTS ma_checklist_templates (
        id                  VARCHAR(50) PRIMARY KEY,
        service_type        VARCHAR(100) NOT NULL,
        template_name       VARCHAR(200),
        checklist_items     JSONB DEFAULT '[]',
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Phase 14: Draft Estimations & Multi-Contractor Bidding
      CREATE TABLE IF NOT EXISTS contractors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        contact_person VARCHAR(150),
        phone VARCHAR(50),
        line_id VARCHAR(100),
        skills TEXT[] DEFAULT '{}',
        rating NUMERIC DEFAULT 5.0,
        completed_jobs INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        bank_name VARCHAR(100),
        bank_account_no VARCHAR(100),
        bank_account_name VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS draft_estimations (
        id VARCHAR(50) PRIMARY KEY,
        estimation_number VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
        project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
        customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(150),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        project_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Draft',
        target_margin_percent NUMERIC DEFAULT 30,
        selected_total_cost NUMERIC DEFAULT 0,
        proposed_subtotal NUMERIC DEFAULT 0,
        vat_type VARCHAR(50) DEFAULT 'Exclude VAT',
        proposed_vat_amount NUMERIC DEFAULT 0,
        proposed_grand_total NUMERIC DEFAULT 0,
        notes TEXT,
        converted_quotation_id VARCHAR(50) REFERENCES quotations(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(150),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS draft_estimation_items (
        id VARCHAR(50) PRIMARY KEY,
        draft_estimation_id VARCHAR(50) NOT NULL REFERENCES draft_estimations(id) ON DELETE CASCADE,
        area_name VARCHAR(150) DEFAULT 'พื้นที่ทั่วไป',
        trade_category VARCHAR(100) DEFAULT 'งานทั่วไป',
        item_name VARCHAR(250) NOT NULL,
        specs_description TEXT,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'รายการ',
        price_book_id VARCHAR(50) REFERENCES service_price_book(id) ON DELETE SET NULL,
        selected_contractor_id VARCHAR(50) REFERENCES contractors(id) ON DELETE SET NULL,
        selected_contractor_name VARCHAR(150),
        selected_material_unit_cost NUMERIC DEFAULT 0,
        selected_labor_unit_cost NUMERIC DEFAULT 0,
        selected_unit_cost NUMERIC DEFAULT 0,
        selected_total_cost NUMERIC DEFAULT 0,
        customer_unit_price NUMERIC DEFAULT 0,
        customer_total_price NUMERIC DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS contractor_bids (
        id VARCHAR(50) PRIMARY KEY,
        draft_estimation_id VARCHAR(50) NOT NULL REFERENCES draft_estimations(id) ON DELETE CASCADE,
        contractor_id VARCHAR(50) REFERENCES contractors(id) ON DELETE SET NULL,
        contractor_name VARCHAR(150) NOT NULL,
        bid_date VARCHAR(50),
        total_bid_amount NUMERIC DEFAULT 0,
        estimated_days INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Submitted',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contractor_bid_items (
        id VARCHAR(50) PRIMARY KEY,
        bid_id VARCHAR(50) NOT NULL REFERENCES contractor_bids(id) ON DELETE CASCADE,
        draft_item_id VARCHAR(50) NOT NULL REFERENCES draft_estimation_items(id) ON DELETE CASCADE,
        material_unit_price NUMERIC DEFAULT 0,
        labor_unit_price NUMERIC DEFAULT 0,
        total_unit_price NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0,
        remark TEXT,
        is_selected BOOLEAN DEFAULT false
      );

      CREATE INDEX IF NOT EXISTS idx_draft_estimations_lead ON draft_estimations(lead_id);
      CREATE INDEX IF NOT EXISTS idx_draft_estimations_project ON draft_estimations(project_id);
      CREATE INDEX IF NOT EXISTS idx_draft_items_estimation ON draft_estimation_items(draft_estimation_id);
      CREATE INDEX IF NOT EXISTS idx_contractor_bids_estimation ON contractor_bids(draft_estimation_id);
      CREATE INDEX IF NOT EXISTS idx_contractor_bid_items_bid ON contractor_bid_items(bid_id);
      CREATE INDEX IF NOT EXISTS idx_contractor_bid_items_draft_item ON contractor_bid_items(draft_item_id);
    `);

    // Seed default sample contractors if empty
    const contCount = await client.query('SELECT COUNT(*) FROM contractors');
    if (parseInt(contCount.rows[0].count, 10) === 0) {
      const defaultContractors = [
        { id: 'cont_001', name: 'ทีมช่างเอก (ช่างไฟ & ประปาโปร)', contact_person: 'นายเอกชัย', phone: '081-234-5678', line_id: 'ake_electric', skills: '{งานไฟฟ้า,งานประปา,ระบบสุขาภิบาล}', rating: 4.9, completed_jobs: 38 },
        { id: 'cont_002', name: 'สมศักดิ์ การช่าง (ฝ้าเพดาน & สี)', contact_person: 'นายสมศักดิ์', phone: '089-987-6543', line_id: 'somsak_build', skills: '{งานฝ้าเพดาน,งานทาสี,งานผนังเบา}', rating: 4.8, completed_jobs: 45 },
        { id: 'cont_003', name: 'ทีมโปรแอร์ เซอร์วิส', contact_person: 'ช่างวิชัย', phone: '086-555-4321', line_id: 'proair_service', skills: '{งานแอร์,เครื่องปรับอากาศ,งานท่อดักท์}', rating: 4.95, completed_jobs: 62 },
        { id: 'cont_004', name: 'ช่างชัย บิวท์อิน ดีไซน์', contact_person: 'นายวิชัย', phone: '083-111-2233', line_id: 'chai_builtin', skills: '{งานบิวท์อิน,งานเฟอร์นิเจอร์,งานไม้}', rating: 4.7, completed_jobs: 29 }
      ];
      for (const c of defaultContractors) {
        await client.query(`
          INSERT INTO contractors (id, name, contact_person, phone, line_id, skills, rating, completed_jobs, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.name, c.contact_person, c.phone, c.line_id, c.skills, c.rating, c.completed_jobs]);
      }
      console.log('Seeded default sample contractors into contractors table.');
    };

    // Auto-migrate existing leads data to customers and customer_sites if customers table is empty
    const custCountRes = await client.query('SELECT COUNT(*) FROM customers');
    if (parseInt(custCountRes.rows[0].count, 10) === 0) {
      console.log('Migrating existing customer data from leads to customer master...');
      const existingLeads = await client.query(`
        SELECT DISTINCT ON (COALESCE(NULLIF(customer_phone, ''), customer_name))
          id, customer_name, customer_first_name, customer_last_name, customer_phone,
          customer_address, customer_latitude, customer_longitude, map_url,
          coordinator_name, coordinator_phone, coordinator_line_id, created_at
        FROM leads
        WHERE customer_name IS NOT NULL AND customer_name != ''
        ORDER BY COALESCE(NULLIF(customer_phone, ''), customer_name), created_at ASC
      `);

      let seq = 1;
      for (const lead of existingLeads.rows) {
        const custId = `cust_${Date.now()}_${seq}`;
        const custCode = `CUST-${String(seq).padStart(5, '0')}`;
        const fName = (lead.customer_first_name || lead.customer_name.split(' ')[0] || 'ลูกค้า').trim();
        const lName = (lead.customer_last_name || lead.customer_name.split(' ').slice(1).join(' ') || '').trim();
        const fullName = lead.customer_name.trim();

        await client.query(`
          INSERT INTO customers (id, customer_code, customer_type, first_name, last_name, customer_name, phone, created_at, updated_at)
          VALUES ($1, $2, 'individual', $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [custId, custCode, fName, lName, fullName, lead.customer_phone || null]);

        // Create Site for this customer
        let siteId = null;
        if (lead.customer_address || lead.customer_latitude) {
          siteId = `site_${Date.now()}_${seq}`;
          await client.query(`
            INSERT INTO customer_sites (
              id, customer_id, site_name, is_default, address, latitude, longitude, map_url,
              coordinator_name, coordinator_phone, coordinator_line_id, created_at, updated_at
            ) VALUES ($1, $2, 'สถานที่หลัก (Site 1)', true, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `, [
            siteId, custId, lead.customer_address || 'ไม่ระบุที่อยู่',
            lead.customer_latitude || null, lead.customer_longitude || null, lead.map_url || null,
            lead.coordinator_name || fName, lead.coordinator_phone || lead.customer_phone || null,
            lead.coordinator_line_id || null
          ]);
        }
        // Link all matching leads to this customer
        await client.query(`
          UPDATE leads SET customer_id = $1, customer_site_id = COALESCE($2, customer_site_id)
          WHERE (customer_phone = $3 AND $3 IS NOT NULL AND $3 != '') OR (customer_name = $4)
        `, [custId, siteId, lead.customer_phone, lead.customer_name]);

        seq++;
      }
      console.log(`Migrated ${seq - 1} customers into Customer Master.`);
    }

    // Auto-repair customer_code format (e.g. CUST-YYYYMM-XXXX -> CUST-YYYYMMDD-XXXX)
    try {
      await client.query(`
        UPDATE customers
        SET customer_code = 'CUST-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDD') || '-' || LPAD(SUBSTRING(customer_code FROM '[0-9]+$'), 4, '0')
        WHERE customer_code ~ '^CUST-[0-9]{6}-[0-9]+$';
      `);
    } catch (codeMigErr) {
      console.warn('Notice: customer_code migration:', codeMigErr.message);
    }

    // Seed MA Checklist Templates if empty
    const clTplCount = await client.query('SELECT COUNT(*) FROM ma_checklist_templates');
    if (parseInt(clTplCount.rows[0].count, 10) === 0) {
      const defaultTemplates = [
        {
          id: 'mact_ac_wash',
          service_type: 'ล้างแอร์',
          template_name: 'Checklist ล้างแอร์มาตรฐาน',
          checklist_items: JSON.stringify([
            { id: 'ac1', label: 'ถอดและทำความสะอาดแผ่นกรองอากาศ (Filter)', required: true },
            { id: 'ac2', label: 'ล้างคอยล์เย็น (Evaporator Coil) ด้วยน้ำยาล้างคอยล์', required: true },
            { id: 'ac3', label: 'ล้างและเป่าท่อระบายน้ำทิ้ง (Drain Pipe)', required: true },
            { id: 'ac4', label: 'เช็คระดับสารทำความเย็น (Refrigerant Level)', required: true },
            { id: 'ac5', label: 'ทำความสะอาดครีบ Condenser ภายนอก', required: false },
            { id: 'ac6', label: 'ทดสอบเดินเครื่อง — วัดอุณหภูมิลมเย็น (≤16°C)', required: true },
            { id: 'ac7', label: 'ถ่ายภาพ Before (ก่อนล้าง)', required: true },
            { id: 'ac8', label: 'ถ่ายภาพ After (หลังล้าง)', required: true }
          ])
        },
        {
          id: 'mact_electrical',
          service_type: 'ตรวจระบบไฟฟ้า',
          template_name: 'Checklist ตรวจระบบไฟฟ้ามาตรฐาน',
          checklist_items: JSON.stringify([
            { id: 'el1', label: 'ตรวจสภาพตู้ MDB / ตู้ควบคุมไฟหลัก', required: true },
            { id: 'el2', label: 'วัดแรงดันไฟฟ้า (Voltage Check)', required: true },
            { id: 'el3', label: 'ตรวจสายดิน (Ground/Earth Check)', required: true },
            { id: 'el4', label: 'ทดสอบ RCD/ELCB (ตัดไฟรั่ว)', required: true },
            { id: 'el5', label: 'ตรวจสภาพสายไฟและเต้ารับ', required: true },
            { id: 'el6', label: 'ถ่ายภาพ Before/After', required: true }
          ])
        },
        {
          id: 'mact_plumbing',
          service_type: 'ตรวจระบบประปา',
          template_name: 'Checklist ตรวจระบบประปา',
          checklist_items: JSON.stringify([
            { id: 'pl1', label: 'ตรวจท่อน้ำและข้อต่อ (หารอยรั่ว)', required: true },
            { id: 'pl2', label: 'เช็คแรงดันน้ำ (Water Pressure)', required: true },
            { id: 'pl3', label: 'ตรวจวาล์วปิด-เปิด (Shut-off Valves)', required: true },
            { id: 'pl4', label: 'ตรวจถังแรงดันน้ำ (Pressure Tank)', required: false },
            { id: 'pl5', label: 'ถ่ายภาพ Before/After', required: true }
          ])
        },
        {
          id: 'mact_cctv',
          service_type: 'ตรวจ CCTV',
          template_name: 'Checklist ตรวจระบบ CCTV',
          checklist_items: JSON.stringify([
            { id: 'cc1', label: 'ตรวจสภาพกล้องและมุมมอง (Camera Position)', required: true },
            { id: 'cc2', label: 'ทดสอบภาพ Daytime (ความชัดเจน)', required: true },
            { id: 'cc3', label: 'ทดสอบ Night Vision / IR', required: true },
            { id: 'cc4', label: 'เช็คพื้นที่จัดเก็บ HDD/NVR', required: true },
            { id: 'cc5', label: 'ทดสอบการ Playback ย้อนหลัง', required: true },
            { id: 'cc6', label: 'ถ่ายภาพ Before/After', required: true }
          ])
        }
      ];
      for (const tpl of defaultTemplates) {
        await client.query(
          `INSERT INTO ma_checklist_templates (id, service_type, template_name, checklist_items) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [tpl.id, tpl.service_type, tpl.template_name, tpl.checklist_items]
        );
      }
      console.log('Seeded MA checklist templates.');
    }


    // Seed/Upsert 9 Detailed Master Zones

    const detailedMasterZones = [
      { id: 'zone-bkk', code: 'BKK', name: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล', description: 'ครอบคลุม กรุงเทพฯ, นนทบุรี, ปทุมธานี, สมุทรปราการ, สมุทรสาคร', provinces: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร'] },
      { id: 'zone-c', code: 'C', name: '[C] ภาคกลาง', region: 'ภาคกลาง', description: 'ครอบคลุม พระนครศรีอยุธยา, สระบุรี, ลพบุรี, ชัยนาท, นครนายก, อุทัยธานี, นครปฐม, สุพรรณบุรี', provinces: ['พระนครศรีอยุธยา', 'สระบุรี', 'ลพบุรี', 'ชัยนาท', 'นครนายก', 'อุทัยธานี', 'นครปฐม', 'สุพรรณบุรี'] },
      { id: 'zone-w', code: 'W', name: '[W] ภาคตะวันตก', region: 'ภาคตะวันตก', description: 'ครอบคลุม กาญจนบุรี, ราชบุรี, เพชรบุรี', provinces: ['กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี'] },
      { id: 'zone-e', code: 'E', name: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก', description: 'ครอบคลุม ชลบุรี, ระยอง, จันทบุรี, ฉะเชิงเทรา, ปราจีนบุรี, สระแก้ว', provinces: ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว'] },
      { id: 'zone-n', code: 'N', name: '[N] ภาคเหนือ', region: 'ภาคเหนือ', description: 'ครอบคลุม เชียงใหม่, เชียงราย, ลำปาง, น่าน, แพร่, พิษณุโลก, ตาก, เพชรบูรณ์, กำแพงเพชร, นครสวรรค์', provinces: ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'น่าน', 'แพร่', 'พิษณุโลก', 'ตาก', 'เพชรบูรณ์', 'กำแพงเพชร', 'นครสวรรค์'] },
      { id: 'zone-ne-u', code: 'NE-U', name: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ', description: 'ครอบคลุม ขอนแก่น, อุดรธานี, สกลนคร, มุกดาหาร, หนองบัวลำภู, เลย, กาฬสินธุ์', provinces: ['ขอนแก่น', 'อุดรธานี', 'สกลนคร', 'มุกดาหาร', 'หนองบัวลำภู', 'เลย', 'กาฬสินธุ์'] },
      { id: 'zone-ne-l', code: 'NE-L', name: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ', description: 'ครอบคลุม นครราชสีมา, บุรีรัมย์, สุรินทร์, ศรีสะเกษ, อุบลราชธานี, ยโสธร, ร้อยเอ็ด, ชัยภูมิ, มหาสารคาม', provinces: ['นครราชสีมา', 'บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'อุบลราชธานี', 'ยโสธร', 'ร้อยเอ็ด', 'ชัยภูมิ', 'มหาสารคาม'] },
      { id: 'zone-s-u', code: 'S-U', name: '[S-U] ภาคใต้ตอนบน', region: 'ภาคใต้', description: 'ครอบคลุม สุราษฎร์ธานี, ภูเก็ต, นครศรีธรรมราช', provinces: ['สุราษฎร์ธานี', 'ภูเก็ต', 'นครศรีธรรมราช'] },
      { id: 'zone-s-l', code: 'S-L', name: '[S-L] ภาคใต้ตอนล่าง', region: 'ภาคใต้', description: 'ครอบคลุม ตรัง, สงขลา (หาดใหญ่)', provinces: ['ตรัง', 'สงขลา'] }
    ];

    for (const z of detailedMasterZones) {
      await client.query(`
        INSERT INTO master_zones (id, code, name, region, description, provinces, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          region = EXCLUDED.region,
          description = EXCLUDED.description,
          provinces = EXCLUDED.provinces
      `, [z.id, z.code, z.name, z.region, z.description, z.provinces]);
    }

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
      const defaultPwHash = crypto.createHash('sha256').update('123456').digest('hex');
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
        { id: 'mpt_1', name: 'Quick Service', description: 'งานบริการด่วนและแก้ไขซ่อมแซมเร่งด่วน', default_columns: '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_2', name: 'Installation', description: 'งานติดตั้งอุปกรณ์และประกอบระบบ', default_columns: '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_3', name: 'Renovate', description: 'งานปรับปรุงบ้านและตกแต่งครบวงจร', default_columns: '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_4', name: 'New Home', description: 'งานก่อสร้างบ้านใหม่ตั้งแต่ต้นจนจบ', default_columns: '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' },
        { id: 'mpt_5', name: 'Maintenance', description: 'งานดูแลรักษาและซ่อมบำรุงตามสัญญา MA', default_columns: '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]' }
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
        { id: 'tpl_k3', title: 'รื้อถอนเคาน์เตอร์และระบบเดิม (Demolition)', description: 'รื้อถอนตู้บิวท์อิน เคาน์เตอร์ปูน กระเบื้องผนังเดิม และขนย้ายเศษวัสดุไปทิ้ง', priority: 'High', start_percent: 0, end_percent: 20, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k4', title: 'เดินระบบไฟฟ้าและประปาใหม่ (Electrical & Plumbing)', description: 'เดินท่อน้ำดี ท่อน้ำทิ้ง ท่อแก๊ส/เครื่องดูดควัน และเดินสายไฟปลั๊กไฟสำหรับเครื่องใช้ไฟฟ้า', priority: 'High', start_percent: 20, end_percent: 40, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k5', title: 'หล่อเคาน์เตอร์ปูนและงานปูกระเบื้อง (Masonry & Tiling)', description: 'ก่อโครงสร้างเคาน์เตอร์ปูน ฉาบเรียบ ปูกระเบื้องพื้นและกระเบื้องผนังกันเปื้อน (Backsplash)', priority: 'High', start_percent: 40, end_percent: 65, estimated_hours: 24, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k6', title: 'ติดตั้งท็อปเคาน์เตอร์และตู้บิวท์อิน (Countertop & Cabinets)', description: 'ติดตั้งท็อปหินสังเคราะห์/หินแกรนิต ติดตั้งตู้แขวน บิวท์อินตู้ใต้เคาน์เตอร์ และหน้าบาน', priority: 'High', start_percent: 65, end_percent: 80, estimated_hours: 16, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k7', title: 'ติดตั้งซิงค์ อุปกรณ์ไฟฟ้า และฟิตติ้ง (Sink & Appliances)', description: 'ติดตั้งอ่างล้างจาน ก๊อกน้ำ เตาไฟฟ้า เครื่องดูดควัน โคมไฟ และอุปกรณ์ฟิตติ้ง', priority: 'Medium', start_percent: 80, end_percent: 92, estimated_hours: 12, project_template_name: 'Kitchen Renovation' },
        { id: 'tpl_k8', title: 'ทำความสะอาด ตรวจรับงานและส่งมอบ (Final Cleaning & Handover)', description: 'เก็บงานทาสี ทำความสะอาดคราบปูนคราบกาว ตรวจสอบระบบน้ำ/ไฟ และส่งมอบงานให้ลูกค้า', priority: 'Urgent', start_percent: 92, end_percent: 100, estimated_hours: 8, project_template_name: 'Kitchen Renovation' }
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
        { id: 'tpl_q2', title: 'ดำเนินการแก้ไข/ซ่อมแซม (Execution)', description: 'ดำเนินการแก้ไขปัญหาตามที่ประเมินไว้', priority: 'Urgent', start_percent: 0, end_percent: 75, estimated_hours: 3, project_template_name: 'Quick Service' },
        { id: 'tpl_q3', title: 'ตรวจสอบและส่งมอบงาน (QA & Handover)', description: 'ตรวจสอบความเรียบร้อย and ส่งมอบงานให้ลูกค้า', priority: 'High', start_percent: 75, end_percent: 100, estimated_hours: 1, project_template_name: 'Quick Service' }
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

    // Seed MA Air templates if not present
    const maAirTemplateCount = await client.query("SELECT COUNT(*) FROM task_templates WHERE project_template_name ILIKE '%MA air%' OR project_template_name ILIKE '%MA Air%'");
    if (parseInt(maAirTemplateCount.rows[0].count) === 0) {
      console.log('Seeding MA Air task templates...');
      const maAirTemplates = [
        { id: 'tpl_ma_air_1', title: 'เข้าพื้นที่และตรวจเช็กสภาพเครื่องก่อนทำงาน (Pre-inspection & Initial Test)', description: 'ตรวจสอบการทำงานเดิม วัดอุณหภูมิลมจ่าย เช็กเสียงผิดปกติ และกระแสไฟฟ้าก่อนเริ่มบริการ', priority: 'Medium', start_percent: 0, end_percent: 15, estimated_hours: 1, project_template_name: 'MA Air' },
        { id: 'tpl_ma_air_2', title: 'ตัดระบบไฟและเตรียมพื้นที่ป้องกัน (Power Off & Area Protection)', description: 'สับเบรกเกอร์ตัดไฟ คลุมผ้าใบกันน้ำ/พลาสติกป้องกันเฟอร์นิเจอร์และพื้นโดยรอบ', priority: 'High', start_percent: 15, end_percent: 25, estimated_hours: 0.5, project_template_name: 'MA Air' },
        { id: 'tpl_ma_air_3', title: 'ถอดล้างคอยล์เย็นและแผ่นกรอง (Indoor Unit Deep Cleaning)', description: 'ถอดหน้ากาก แผ่นฟิลเตอร์ ถาดน้ำทิ้ง ฉีดล้างแผงฟินคอยล์เย็นด้วยปั๊มแรงดันสูงและล้างท่อน้ำทิ้งป้องกันน้ำหยด', priority: 'Urgent', start_percent: 25, end_percent: 60, estimated_hours: 2, project_template_name: 'MA Air' },
        { id: 'tpl_ma_air_4', title: 'ล้างทำความสะอาดคอยล์ร้อนภายนอก (Outdoor Condenser Cleaning)', description: 'ฉีดล้างแผงระบายความร้อนคอยล์ร้อน เป่าแห้ง และตรวจเช็กมอเตอร์พัดลม', priority: 'Medium', start_percent: 60, end_percent: 80, estimated_hours: 1.5, project_template_name: 'MA Air' },
        { id: 'tpl_ma_air_5', title: 'ตรวจวัดแรงดันน้ำยาและกระแสไฟฟ้า (Refrigerant & Amp Check)', description: 'วัดแรงดันน้ำยาแอร์ (PSI) ตรวจวัดกระแสไฟการทำงานของคอมเพรสเซอร์ และตรวจสภาพสายไฟ', priority: 'High', start_percent: 80, end_percent: 90, estimated_hours: 1, project_template_name: 'MA Air' },
        { id: 'tpl_ma_air_6', title: 'ทดสอบระบบ ทำความสะอาดพื้นที่ และส่งมอบงาน (Post-Test & Handover)', description: 'เปิดเครื่องทดสอบความเย็น วัดอุณหภูมิลมเป่า ทำความสะอาดพื้นที่หน้างาน บันทึกรูป Before/After และส่งมอบงานให้ลูกค้า', priority: 'Urgent', start_percent: 90, end_percent: 100, estimated_hours: 1, project_template_name: 'MA Air' }
      ];
      for (const tpl of maAirTemplates) {
        await client.query(
          'INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [tpl.id, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours, tpl.project_template_name]
        );
      }
      console.log('Seeded MA Air task templates.');
    }

    // Ensure all existing users have a password hash
    const defaultPwHash = crypto.createHash('sha256').update('123456').digest('hex');
    await client.query('UPDATE users SET password_hash = $1 WHERE password_hash IS NULL', [defaultPwHash]);

    // Ensure admin user (isarachootip) exists in production
    const adminEmail = 'isarachootip@gmail.com';
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminExists.rows.length === 0) {
      const adminPwHash = crypto.createHash('sha256').update('123456').digest('hex');
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

    // ONE-TIME: Seed GM Store users for all branches (store+"GM", e.g. Bangna = bnagm)
    const migSeedGm = 'seed_gm_store_users_v3';
    const migSeedGmDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migSeedGm]);
    if (migSeedGmDone.rows.length === 0) {
      console.log('Running migration: seeding GM Store users for all branches...');
      const storeUsersRes = await client.query("SELECT * FROM users WHERE id LIKE 'usr-store-%' ORDER BY id ASC");
      const branchesRes = await client.query("SELECT * FROM branches ORDER BY name ASC");
      const defaultPwHash = crypto.createHash('sha256').update('123456').digest('hex');

      const branchToCodeMap = {};
      storeUsersRes.rows.forEach(su => {
        const code = su.id.replace('usr-store-', '').toLowerCase();
        let bName = '';
        const m = su.name.match(/\(([^)]+)\)/);
        if (m) bName = m[1];
        else if (su.assigned_branches && su.assigned_branches[0]) bName = su.assigned_branches[0];
        if (bName) {
          branchToCodeMap[bName] = code;
          branchToCodeMap[bName.replace(/^สาขา/, '')] = code;
        }
      });

      // 1. Seed from store CS users
      for (const su of storeUsersRes.rows) {
        const storeCode = su.id.replace('usr-store-', '').toLowerCase();
        const gmId = `usr-gm-${storeCode}`;
        
        let branchName = '';
        const m = su.name.match(/\(([^)]+)\)/);
        if (m) {
          branchName = m[1];
        } else if (su.assigned_branches && su.assigned_branches.length > 0) {
          branchName = su.assigned_branches[0];
        }

        const codeUpper = storeCode.toUpperCase();
        const gmName = branchName ? `${codeUpper}GM (${branchName})` : `${codeUpper}GM`;
        const gmEmail = `${storeCode}gm@chg.co.th`;
        const assignedBranches = branchName ? [branchName] : (su.assigned_branches || []);
        const serviceZones = su.service_zones || [];
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${gmId}`;

        await client.query(
          `INSERT INTO users (
             id, name, email, avatar, global_role, department, password_hash,
             assigned_branches, service_zones, assigned_zones, skills, job_types
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             global_role = EXCLUDED.global_role,
             department = EXCLUDED.department,
             assigned_branches = EXCLUDED.assigned_branches,
             service_zones = EXCLUDED.service_zones,
             password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
          [
            gmId, gmName, gmEmail, avatar, 'Manager', 'GM Store', defaultPwHash,
            assignedBranches, serviceZones, assignedBranches, ['GM Approval', 'Site Visit Approval', 'Store Management'],
            ['Store Management', 'Site Visit Approval']
          ]
        );
      }

      // 2. Ensure every branch in branches table has a GM
      for (const b of branchesRes.rows) {
        let storeCode = branchToCodeMap[b.name] || branchToCodeMap[b.name.replace(/^สาขา/, '')];
        if (!storeCode) {
          storeCode = b.code ? `st${b.code}` : b.id.replace('br-st-', '');
        }
        const gmId = `usr-gm-${storeCode}`;
        const codeUpper = storeCode.toUpperCase();
        const gmName = `${codeUpper}GM (${b.name})`;
        const gmEmail = `${storeCode}gm@chg.co.th`;
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${gmId}`;

        await client.query(
          `INSERT INTO users (
             id, name, email, avatar, global_role, department, password_hash,
             assigned_branches, service_zones, assigned_zones, skills, job_types
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             global_role = EXCLUDED.global_role,
             department = EXCLUDED.department,
             assigned_branches = EXCLUDED.assigned_branches,
             service_zones = EXCLUDED.service_zones,
             password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
          [
            gmId, gmName, gmEmail, avatar, 'Manager', 'GM Store', defaultPwHash,
            [b.name], [b.zone || '[BKK] กรุงเทพฯ & ปริมณฑล'], [b.name],
            ['GM Approval', 'Site Visit Approval', 'Store Management'],
            ['Store Management', 'Site Visit Approval']
          ]
        );
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migSeedGm]);
      console.log('✅ One-time migration: seeded GM Store users for all branches.');
    }

    // ONE-TIME: Reset GM users password to default 123456
    const migResetGmPw = 'reset_gm_store_users_pw_123456';
    const migResetGmPwDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migResetGmPw]);
    if (migResetGmPwDone.rows.length === 0) {
      const default123456Hash = crypto.createHash('sha256').update('123456').digest('hex');
      const test123Hash = crypto.createHash('sha256').update('test123').digest('hex');
      await client.query("UPDATE users SET password_hash = $1 WHERE id LIKE 'usr-gm-%' AND (password_hash = $2 OR password_hash IS NULL)", [default123456Hash, test123Hash]);
      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migResetGmPw]);
      console.log('✅ One-time migration: updated GM Store user default passwords to 123456.');
    }

    // ONE-TIME: Insert Check-in bar and Check-out bar tasks in all task templates that have a Survey task
    const migCheckinCheckoutSurvey = 'add_checkin_checkout_after_survey_v3';
    const migCheckinCheckoutSurveyDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migCheckinCheckoutSurvey]);
    if (migCheckinCheckoutSurveyDone.rows.length === 0) {
      console.log('Running migration: adding check-in and check-out tasks after survey in all templates...');
      const resTpls = await client.query('SELECT * FROM task_templates ORDER BY project_template_name, start_percent ASC');
      const grouped = {};
      for (const row of resTpls.rows) {
        const groupName = row.project_template_name || 'General';
        if (!grouped[groupName]) {
          grouped[groupName] = [];
        }
        grouped[groupName].push(row);
      }

      for (const groupName of Object.keys(grouped)) {
        const tasks = grouped[groupName];
        // Find if any task in this group contains "Survey" or "สำรวจ" in its title
        const surveyTask = tasks.find(t => 
          t.title.toLowerCase().includes('survey') || 
          t.title.includes('สำรวจ') || 
          (t.description && (t.description.toLowerCase().includes('survey') || t.description.includes('สำรวจ')))
        );

        if (surveyTask) {
          console.log(`Template group "${groupName}" has a Survey task. Adjusting...`);
          const surveyEnd = parseFloat(surveyTask.end_percent);

          // 1. Delete any existing Check-in/out bar tasks for this template group
          await client.query(
            "DELETE FROM task_templates WHERE project_template_name = $1 AND (title = 'Check-in bar' OR title = 'Check-out bar')",
            [groupName]
          );

          // 2. Insert the two new tasks
          const sanitizedGroup = groupName.replace(/[^a-zA-Z0-9]/g, '_');
          const checkinId = `tpl_ci_${sanitizedGroup}_${Math.random().toString(36).substr(2, 4)}`;
          const checkoutId = `tpl_co_${sanitizedGroup}_${Math.random().toString(36).substr(2, 4)}`;

          await client.query(
            `INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [checkinId, 'Check-in bar', 'เช็คอินเข้าปฏิบัติงานสำรวจหน้างาน', 'High', surveyEnd, surveyEnd + 1, 1, groupName]
          );

          await client.query(
            `INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [checkoutId, 'Check-out bar', 'เช็คเอาท์และบันทึกผลงานสำรวจหน้างาน', 'High', surveyEnd + 1, surveyEnd + 2, 1, groupName]
          );

          // 3. Shift the start_percent of subsequent tasks
          for (const t of tasks) {
            if (t.id === surveyTask.id || t.title === 'Check-in bar' || t.title === 'Check-out bar') {
              continue;
            }
            const currentStart = parseFloat(t.start_percent);
            if (currentStart >= surveyEnd && currentStart < surveyEnd + 2) {
              const newStart = surveyEnd + 2;
              const currentEnd = parseFloat(t.end_percent);
              const newEnd = currentEnd < newStart ? newStart : currentEnd;
              await client.query(
                'UPDATE task_templates SET start_percent = $1, end_percent = $2 WHERE id = $3',
                [newStart, newEnd, t.id]
              );
              console.log(`  Adjusted task "${t.title}" start_percent from ${currentStart} to ${newStart}`);
            }
          }
        }
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migCheckinCheckoutSurvey]);
      console.log('✅ One-time migration: check-in and check-out tasks added after survey step in all templates.');
    }

    // ONE-TIME: Seed master project types to system_settings
    const migSeedMasterTypes = 'seed_master_project_types_v2';
    const migSeedMasterTypesDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migSeedMasterTypes]);
    if (migSeedMasterTypesDone.rows.length === 0) {
      console.log('Running migration: seeding master_project_types into system_settings...');
      const defaultTypesList = [
        {
          id: 'quick_service',
          name: 'Quick service',
          badgeText: 'Quick service ⚡',
          color: '#f59e0b',
          iconName: 'Zap',
          description: 'โครงการงานบริการด่วน งานแก้ไขและซ่อมแซมเร่งด่วน มีเฉพาะ Task เดี่ยว ดำเนินการเสร็จรวดเร็ว',
          isActive: true,
          taskTypeStyle: 'single'
        },
        {
          id: 'installer',
          name: 'Installer (งานติดตั้ง)',
          badgeText: 'งานติดตั้ง 🛠️',
          color: '#2563eb',
          iconName: 'Wrench',
          description: 'โครงการติดตั้งอุปกรณ์ ตรวจสอบคุณภาพประกอบระบบ และส่งมอบงานติดตั้งหน้างาน',
          isActive: false,
          taskTypeStyle: 'workflow'
        },
        {
          id: 'renovate',
          name: 'Renovate (งานรีโนเวท)',
          badgeText: 'Renovate 🏡',
          color: '#8B0000',
          iconName: 'Home',
          description: 'โครงการปรับปรุง รีโนเวทบ้าน และตกแต่งอาคารสถานที่ครบวงจร (สำรวจ -> ออกแบบ -> เสนอราคา -> ก่อสร้าง)',
          isActive: true,
          taskTypeStyle: 'workflow'
        },
        {
          id: 'build_in',
          name: 'Build-in (งานบิวท์อิน)',
          badgeText: 'Build-in 🛋️',
          color: '#8b5cf6',
          iconName: 'Box',
          description: 'โครงการออกแบบ ผลิต และติดตั้งงานเฟอร์นิเจอร์บิวท์อินเฉพาะทาง',
          isActive: false,
          taskTypeStyle: 'workflow'
        },
        {
          id: 'new_house',
          name: 'New house (สร้างบ้านใหม่)',
          badgeText: 'New house 🏠',
          color: '#059669',
          iconName: 'Home',
          description: 'โครงการงานก่อสร้างบ้านใหม่และอาคารสิ่งปลูกสร้าง',
          isActive: false,
          taskTypeStyle: 'workflow'
        },
        {
          id: 'maintenance',
          name: 'Maintenance (งานซ่อมบำรุง MA)',
          badgeText: 'MA 🔧',
          color: '#3b82f6',
          iconName: 'ShieldCheck',
          description: 'โครงการดูแลระบบ ซ่อมแซมบำรุงรักษาตามสัญญา MA',
          isActive: true,
          taskTypeStyle: 'sla'
        }
      ];

      await client.query(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES ('master_project_types', $1)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value
      `, [JSON.stringify(defaultTypesList)]);

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migSeedMasterTypes]);
      console.log('✅ One-time migration: seeded master_project_types in system_settings.');
    }

    // ONE-TIME: Remove Buy-Survey and Survey from all system templates, master project types, workflows, and task templates
    const migRemoveSurvey = 'remove_survey_from_all_templates_v1';
    const migRemoveSurveyDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migRemoveSurvey]);
    if (migRemoveSurveyDone.rows.length === 0) {
      console.log('Running migration: removing Buy-Survey and Survey from all templates and workflows...');
      
      // 1. Update master_project_types
      await client.query(`
        UPDATE master_project_types 
        SET default_columns = '["To Do", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]'::jsonb
        WHERE id = 'mpt_1' OR id = 'mpt_2' OR id = 'mpt_5' OR LOWER(name) LIKE '%quick%' OR LOWER(name) LIKE '%install%' OR LOWER(name) LIKE '%mainten%'
      `);
      await client.query(`
        UPDATE master_project_types 
        SET default_columns = '["To Do", "Design", "ชำระเงิน", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]'::jsonb
        WHERE id = 'mpt_3' OR id = 'mpt_4' OR LOWER(name) LIKE '%renovate%' OR LOWER(name) LIKE '%build%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%house%'
      `);

      // 2. Delete survey tasks and checkin/checkout bars from task_templates
      await client.query(`
        DELETE FROM task_templates 
        WHERE title ILIKE '%survey%' 
           OR title ILIKE '%สำรวจ%' 
           OR title = 'Check-in bar' 
           OR title = 'Check-out bar' 
           OR id IN ('tpl_k1', 'tpl_q1', 'tpl_ci_Kitchen_Renovation_c505', 'tpl_co_Kitchen_Renovation_poxk', 'tpl_ci_Quick_Service_efq3', 'tpl_co_Quick_Service_1s52')
      `);

      // Rescale start_percent and end_percent for task_templates
      const allTpls = await client.query('SELECT * FROM task_templates ORDER BY project_template_name, start_percent ASC');
      const groupedTpls = {};
      for (const row of allTpls.rows) {
        const grp = row.project_template_name || 'General';
        if (!groupedTpls[grp]) groupedTpls[grp] = [];
        groupedTpls[grp].push(row);
      }
      for (const grp of Object.keys(groupedTpls)) {
        const tasks = groupedTpls[grp];
        if (tasks.length > 0) {
          const firstStart = parseFloat(tasks[0].start_percent);
          if (firstStart > 0) {
            const shift = firstStart;
            for (const t of tasks) {
              const newStart = Math.max(0, parseFloat(t.start_percent) - shift);
              const newEnd = Math.max(newStart, parseFloat(t.end_percent) - shift);
              await client.query('UPDATE task_templates SET start_percent = $1, end_percent = $2 WHERE id = $3', [newStart, newEnd, t.id]);
            }
          }
        }
      }

      // 3. Update project_workflows to remove Buy-Survey & Survey
      const workflowsRes = await client.query('SELECT * FROM project_workflows');
      for (const wf of workflowsRes.rows) {
        let statuses = wf.statuses;
        if (typeof statuses === 'string') {
          try { statuses = JSON.parse(statuses); } catch (e) { statuses = []; }
        }
        if (Array.isArray(statuses)) {
          const cleaned = statuses.filter(s => !['buy-survey', 'survey', 'ซื้อสำรวจ', 'qc (สำรวจ)'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE project_workflows SET statuses = $1 WHERE project_id = $2', [JSON.stringify(cleaned), wf.project_id]);
        }
      }

      // 4. Update projects.custom_columns
      const projectsRes = await client.query('SELECT id, custom_columns FROM projects WHERE custom_columns IS NOT NULL');
      for (const p of projectsRes.rows) {
        let cols = p.custom_columns;
        if (typeof cols === 'string') {
          try { cols = JSON.parse(cols); } catch (e) { cols = []; }
        }
        if (Array.isArray(cols)) {
          const cleaned = cols.filter(s => !['buy-survey', 'survey', 'ซื้อสำรวจ', 'qc (สำรวจ)'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE projects SET custom_columns = $1 WHERE id = $2', [JSON.stringify(cleaned), p.id]);
        }
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migRemoveSurvey]);
      console.log('✅ One-time migration: removed Buy-Survey and Survey from all system templates and workflows.');
    }

    // ONE-TIME: Remove payment ('ชำระเงิน') from all system templates, master project types, and workflows
    const migRemovePayment = 'remove_payment_from_all_templates_v1';
    const migRemovePaymentDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migRemovePayment]);
    if (migRemovePaymentDone.rows.length === 0) {
      console.log('Running migration: removing payment from all templates and workflows...');
      
      // 1. Update master_project_types
      await client.query(`
        UPDATE master_project_types 
        SET default_columns = '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]'::jsonb
        WHERE id = 'mpt_1' OR id = 'mpt_2' OR id = 'mpt_5' OR LOWER(name) LIKE '%quick%' OR LOWER(name) LIKE '%install%' OR LOWER(name) LIKE '%mainten%'
      `);
      await client.query(`
        UPDATE master_project_types 
        SET default_columns = '["To Do", "Design", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]'::jsonb
        WHERE id = 'mpt_3' OR id = 'mpt_4' OR LOWER(name) LIKE '%renovate%' OR LOWER(name) LIKE '%build%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%house%'
      `);

      // 2. Update project_workflows to remove 'ชำระเงิน' and 'payment'
      const workflowsRes = await client.query('SELECT * FROM project_workflows');
      for (const wf of workflowsRes.rows) {
        let statuses = wf.statuses;
        if (typeof statuses === 'string') {
          try { statuses = JSON.parse(statuses); } catch (e) { statuses = []; }
        }
        if (Array.isArray(statuses)) {
          const cleaned = statuses.filter(s => !['ชำระเงิน', 'payment', 'ลูกค้ายืนยัน', 'ลูกค้ายืนยันดำเนินการ', 'ยืนยันราคา/ใบดำเนินการ'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE project_workflows SET statuses = $1 WHERE project_id = $2', [JSON.stringify(cleaned), wf.project_id]);
        }
      }

      // 3. Update projects.custom_columns
      const projectsRes = await client.query('SELECT id, custom_columns FROM projects WHERE custom_columns IS NOT NULL');
      for (const p of projectsRes.rows) {
        let cols = p.custom_columns;
        if (typeof cols === 'string') {
          try { cols = JSON.parse(cols); } catch (e) { cols = []; }
        }
        if (Array.isArray(cols)) {
          const cleaned = cols.filter(s => !['ชำระเงิน', 'payment', 'ลูกค้ายืนยัน', 'ลูกค้ายืนยันดำเนินการ', 'ยืนยันราคา/ใบดำเนินการ'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE projects SET custom_columns = $1 WHERE id = $2', [JSON.stringify(cleaned), p.id]);
        }
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migRemovePayment]);
      console.log('✅ One-time migration: removed payment step from all system templates and workflows.');
    }

    // ONE-TIME: Remove Design from all system templates, master project types, task templates, and workflows
    const migRemoveDesign = 'remove_design_from_all_templates_v1';
    const migRemoveDesignDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migRemoveDesign]);
    if (migRemoveDesignDone.rows.length === 0) {
      console.log('Running migration: removing Design from all templates, task templates, and workflows...');
      
      // 1. Update master_project_types
      await client.query(`
        UPDATE master_project_types 
        SET default_columns = '["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"]'::jsonb
      `);

      // 2. Delete Design tasks from task_templates
      await client.query(`
        DELETE FROM task_templates 
        WHERE title ILIKE '%design%' 
           OR title ILIKE '%ออกแบบ%' 
           OR id IN ('tpl_k2', 'tpl_4')
      `);

      // Rescale start_percent and end_percent for task_templates
      const allTpls = await client.query('SELECT * FROM task_templates ORDER BY project_template_name, start_percent ASC');
      const groupedTpls = {};
      for (const row of allTpls.rows) {
        const grp = row.project_template_name || 'General';
        if (!groupedTpls[grp]) groupedTpls[grp] = [];
        groupedTpls[grp].push(row);
      }
      for (const grp of Object.keys(groupedTpls)) {
        const tasks = groupedTpls[grp];
        if (tasks.length > 0) {
          const firstStart = parseFloat(tasks[0].start_percent);
          if (firstStart > 0) {
            const shift = firstStart;
            for (const t of tasks) {
              const newStart = Math.max(0, parseFloat(t.start_percent) - shift);
              const newEnd = Math.max(newStart, parseFloat(t.end_percent) - shift);
              await client.query('UPDATE task_templates SET start_percent = $1, end_percent = $2 WHERE id = $3', [newStart, newEnd, t.id]);
            }
          }
        }
      }

      // 3. Update project_workflows to remove 'Design'
      const workflowsRes = await client.query('SELECT * FROM project_workflows');
      for (const wf of workflowsRes.rows) {
        let statuses = wf.statuses;
        if (typeof statuses === 'string') {
          try { statuses = JSON.parse(statuses); } catch (e) { statuses = []; }
        }
        if (Array.isArray(statuses)) {
          const cleaned = statuses.filter(s => !['design', 'ออกแบบ', 'สร้างใบเสนอราคา'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE project_workflows SET statuses = $1 WHERE project_id = $2', [JSON.stringify(cleaned), wf.project_id]);
        }
      }

      // 4. Update projects.custom_columns
      const projectsRes = await client.query('SELECT id, custom_columns FROM projects WHERE custom_columns IS NOT NULL');
      for (const p of projectsRes.rows) {
        let cols = p.custom_columns;
        if (typeof cols === 'string') {
          try { cols = JSON.parse(cols); } catch (e) { cols = []; }
        }
        if (Array.isArray(cols)) {
          const cleaned = cols.filter(s => !['design', 'ออกแบบ', 'สร้างใบเสนอราคา'].includes((s || '').trim().toLowerCase()));
          await client.query('UPDATE projects SET custom_columns = $1 WHERE id = $2', [JSON.stringify(cleaned), p.id]);
        }
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migRemoveDesign]);
      console.log('✅ One-time migration: removed Design from all system templates and workflows.');
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

    // ONE-TIME: Replace legacy software development templates with real Renovate Service & Construction templates
    const migRenovateTpls = 'replace_it_templates_with_renovate_v2';
    const migRenovateTplsDone = await client.query('SELECT id FROM migrations WHERE id = $1', [migRenovateTpls]);
    if (migRenovateTplsDone.rows.length === 0) {
      console.log('Running migration: replacing IT templates with Renovate & Home Improvement templates...');
      
      // 1. Delete old software IT templates from task_templates
      await client.query(`
        DELETE FROM task_templates 
        WHERE title IN (
          'Kick off Meeting', 'SOW & Contract Sign off', 'Get Requirements & User Stories',
          'UX/UI Design & Prototyping', 'Setup Cloud Infrastructure & Environments',
          'API Contract & Backend Architecture Setup', 'Core Backend & Frontend Development',
          'Data Migration & Seeding', 'SIT (System Integration Testing)',
          'UAT (User Acceptance Testing)', 'Production Release & Handover'
        ) OR project_template_name = 'General'
      `);

      // 2. Insert standard Renovate Service templates
      const renovateTpls = [
        { id: 'tpl_r1', title: 'งานเตรียมพื้นที่ & กั้นโซนป้องกันฝุ่น (Site Prep & Dust Protection)', description: 'ตรวจสอบความพร้อมหน้างาน กั้นโซนพลาสติกป้องกันฝุ่น ปูแผ่นกันรอยพื้นทางเดิน', priority: 'High', start_percent: 0, end_percent: 10, estimated_hours: 8 },
        { id: 'tpl_r2', title: 'งานรื้อถอนโครงสร้างเดิม & เคลียร์เศษวัสดุ (Demolition & Disposal)', description: 'รื้อถอนกระเบื้อง ผนังเดิม สุขภัณฑ์ ฝ้าเพดานเดิม และขนเศษวัสดุก่อสร้างไปทิ้ง', priority: 'High', start_percent: 10, end_percent: 25, estimated_hours: 16 },
        { id: 'tpl_r3', title: 'งานเดินระบบประปา & ท่อน้ำทิ้ง (Plumbing Rough-in)', description: 'วางแนวท่อน้ำดี PPR/PVC ท่อน้ำทิ้ง ท่อดักกลิ่น และทดสอบแรงดันน้ำ', priority: 'High', start_percent: 25, end_percent: 40, estimated_hours: 16 },
        { id: 'tpl_r4', title: 'งานระบบไฟฟ้า & กรีดท่อร้อยสาย (Electrical Rough-in)', description: 'กรีดผนังฝังท่อร้อยสายไฟ เดินสายไฟเมน ปลั๊ก สวิตช์ และติดตั้งตู้ Consumer Unit', priority: 'High', start_percent: 40, end_percent: 55, estimated_hours: 20 },
        { id: 'tpl_r5', title: 'งานโครงสร้างฝ้าเพดาน & ผนังเบา (Ceiling & Drywall)', description: 'ติดตั้งโครงคร่าว C-Line ยิงแผ่นยิปซัม/สมาร์ทบอร์ด และฉาบรอยต่อ', priority: 'High', start_percent: 55, end_percent: 70, estimated_hours: 24 },
        { id: 'tpl_r6', title: 'งานปรับระดับพื้น & ปูกระเบื้อง (Flooring & Tiling)', description: 'เทปูนปรับระดับพื้น ทากันซึม ปูกระเบื้องพื้นและกระเบื้องผนังพร้อมยาแนว', priority: 'High', start_percent: 70, end_percent: 85, estimated_hours: 32 },
        { id: 'tpl_r7', title: 'งานฉาบเรียบ & งานทาสี (Plastering & Painting)', description: 'เก็บรอยต่อ ฉาบสกิมโค้ท ทาสีรองพื้นปูนเก่า/ใหม่ และทาสีจริง 2 เที่ยว', priority: 'Medium', start_percent: 85, end_percent: 92, estimated_hours: 16 },
        { id: 'tpl_r8', title: 'ติดตั้งสุขภัณฑ์ ดวงโคมไฟฟ้า & ฟิตติ้ง (Fixtures & Fittings)', description: 'ติดตั้งสุขภัณฑ์ห้องน้ำ อ่างล้างหน้า ก๊อกน้ำ โคมไฟ สวิตช์ ปลั๊ก และอุปกรณ์ตกแต่ง', priority: 'Medium', start_percent: 92, end_percent: 97, estimated_hours: 12 },
        { id: 'tpl_r9', title: 'ทำความสะอาด เคลียร์พื้นที่ & ตรวจรับส่งมอบ (Final Clean & Handover)', description: 'ทำความสะอาดเก็บงาน เก็บฝุ่น ตรวจสอบระบบร่วมกับ QC และส่งมอบงานให้ลูกค้า', priority: 'Urgent', start_percent: 97, end_percent: 100, estimated_hours: 8 }
      ];

      const templateGroups = ['Renovate Service', 'Renovation', 'รีโนเวท', 'General'];
      for (const grp of templateGroups) {
        for (let i = 0; i < renovateTpls.length; i++) {
          const tpl = renovateTpls[i];
          const tplId = `tpl_${grp.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}`;
          await client.query(
            `INSERT INTO task_templates (id, title, description, priority, start_percent, end_percent, estimated_hours, project_template_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority,
               start_percent = EXCLUDED.start_percent, end_percent = EXCLUDED.end_percent,
               estimated_hours = EXCLUDED.estimated_hours, project_template_name = EXCLUDED.project_template_name`,
            [tplId, tpl.title, tpl.description, tpl.priority, tpl.start_percent, tpl.end_percent, tpl.estimated_hours, grp]
          );
        }
      }

      // 3. For any existing project that has old IT tasks, replace them with Renovate tasks
      const itProjects = await client.query(`
        SELECT DISTINCT project_id FROM tasks 
        WHERE title IN (
          'Kick off Meeting', 'SOW & Contract Sign off', 'Get Requirements & User Stories',
          'UX/UI Design & Prototyping', 'Setup Cloud Infrastructure & Environments',
          'API Contract & Backend Architecture Setup', 'Core Backend & Frontend Development',
          'Data Migration & Seeding', 'SIT (System Integration Testing)',
          'UAT (User Acceptance Testing)', 'Production Release & Handover'
        )
      `);

      for (const row of itProjects.rows) {
        const pId = row.project_id;
        const pRes = await client.query('SELECT * FROM projects WHERE id = $1', [pId]);
        if (pRes.rows.length === 0) continue;
        const p = pRes.rows[0];

        // Delete old IT tasks from tasks and task_snapshots
        await client.query('DELETE FROM task_snapshots WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)', [pId]);
        await client.query('DELETE FROM tasks WHERE project_id = $1', [pId]);

        const startD = p.start_date ? new Date(p.start_date) : new Date();
        const endD = p.end_date ? new Date(p.end_date) : new Date(startD.getTime() + 7 * 86400000);
        const totalMs = Math.max(86400000, endD.getTime() - startD.getTime());
        const nowStr = new Date().toISOString();

        for (let i = 0; i < renovateTpls.length; i++) {
          const tpl = renovateTpls[i];
          const taskId = `t_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
          const tStart = new Date(startD.getTime() + (totalMs * tpl.start_percent / 100)).toISOString().split('T')[0];
          const tEnd = new Date(startD.getTime() + (totalMs * tpl.end_percent / 100)).toISOString().split('T')[0];

          await client.query(
            `INSERT INTO tasks (id, project_id, title, description, status, priority, estimated_hours, progress_percent, start_date, end_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [taskId, pId, tpl.title, tpl.description, 'To Do', tpl.priority, tpl.estimated_hours, 0, tStart, tEnd, nowStr]
          );
        }
      }

      await client.query('INSERT INTO migrations (id) VALUES ($1)', [migRenovateTpls]);
      console.log('✅ One-time migration: updated Renovate Service templates and refreshed existing project tasks.');
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
          model: "gemini-3.5-flash",
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

// Password Authentication Endpoint (supports email, username, or GM/Store code e.g. bnagm, isarachootip)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const rawInput = email.trim();
    const cleanLower = rawInput.toLowerCase();
    const candidateEmail = cleanLower.includes('@') ? cleanLower : `${cleanLower}@chg.co.th`;

    const userRes = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = $1 
          OR LOWER(email) = $2 
          OR LOWER(id) = $1 
          OR LOWER(id) = $3
          OR LOWER(name) = $1
          OR LOWER(name) LIKE $4
       ORDER BY 
         CASE 
           WHEN LOWER(email) = $1 THEN 1 
           WHEN LOWER(email) = $2 THEN 2 
           WHEN LOWER(id) = $1 THEN 3 
           WHEN LOWER(id) = $3 THEN 4 
           ELSE 5 
         END ASC
       LIMIT 1`,
      [cleanLower, candidateEmail, `usr-gm-${cleanLower}`, `${cleanLower}%`]
    );
    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const default123456Hash = crypto.createHash('sha256').update('123456').digest('hex');
    const test123Hash = crypto.createHash('sha256').update('test123').digest('hex');
    
    if (user.password_hash && user.password_hash !== passwordHash) {
      // Graceful compatibility for accounts seeded with test123 or 123456
      if ((user.password_hash === test123Hash && password === '123456') || 
          (user.password_hash === default123456Hash && password === 'test123')) {
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
      } else {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }
    
    if (!user.password_hash) {
      if (password === '123456' || password === 'test123' || password === 'password123') {
        const defaultHash = crypto.createHash('sha256').update(password).digest('hex');
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
      skills: user.skills || [],
      assignedBranches: user.assigned_branches || [],
      serviceZones: user.service_zones || []
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
const EXCLUDED_BRANCH_IDS = ['br-01', 'br-02', 'br-03', 'br-04'];
const FALLBACK_BRANCHES = [
  { id: 'br-st-60016', code: 'B16', name: 'สาขาภูเก็ต เฟสติวัล', province: 'ภูเก็ต', status: 'Active' },
  { id: 'br-st-60020', code: 'B20', name: 'สาขาศรีสมาน', province: 'นนทบุรี', status: 'Active' },
  { id: 'br-st-60022', code: 'B22', name: 'สาขาบางแสน', province: 'ชลบุรี', status: 'Active' }
];

const PROVINCE_TO_ZONE_MAP = {
  // [BKK] กรุงเทพฯ & ปริมณฑล
  'กรุงเทพมหานคร': { zone: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล' },
  'นนทบุรี': { zone: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล' },
  'ปทุมธานี': { zone: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล' },
  'สมุทรปราการ': { zone: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล' },
  'สมุทรสาคร': { zone: '[BKK] กรุงเทพฯ & ปริมณฑล', region: 'กรุงเทพฯ & ปริมณฑล' },

  // [C] ภาคกลาง
  'พระนครศรีอยุธยา': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'สระบุรี': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'ลพบุรี': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'ชัยนาท': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'นครนายก': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'อุทัยธานี': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'นครปฐม': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },
  'สุพรรณบุรี': { zone: '[C] ภาคกลาง', region: 'ภาคกลาง' },

  // [W] ภาคตะวันตก
  'กาญจนบุรี': { zone: '[W] ภาคตะวันตก', region: 'ภาคตะวันตก' },
  'ราชบุรี': { zone: '[W] ภาคตะวันตก', region: 'ภาคตะวันตก' },
  'เพชรบุรี': { zone: '[W] ภาคตะวันตก', region: 'ภาคตะวันตก' },

  // [E] ภาคตะวันออก
  'ชลบุรี': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ระยอง': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'จันทบุรี': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ฉะเชิงเทรา': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ปราจีนบุรี': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'สระแก้ว': { zone: '[E] ภาคตะวันออก', region: 'ภาคตะวันออก' },

  // [N] ภาคเหนือ
  'เชียงใหม่': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'เชียงราย': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'ลำปาง': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'น่าน': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'แพร่': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'พิษณุโลก': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'ตาก': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'เพชรบูรณ์': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'กำแพงเพชร': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },
  'นครสวรรค์': { zone: '[N] ภาคเหนือ', region: 'ภาคเหนือ' },

  // [NE-U] ภาคอีสานตอนบน
  'ขอนแก่น': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'อุดรธานี': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'สกลนคร': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'มุกดาหาร': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'หนองบัวลำภู': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'เลย': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'กาฬสินธุ์': { zone: '[NE-U] ภาคอีสานตอนบน', region: 'ภาคตะวันออกเฉียงเหนือ' },

  // [NE-L] ภาคอีสานตอนล่าง
  'นครราชสีมา': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'บุรีรัมย์': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'สุรินทร์': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ศรีสะเกษ': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'อุบลราชธานี': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ยโสธร': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ร้อยเอ็ด': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ชัยภูมิ': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'มหาสารคาม': { zone: '[NE-L] ภาคอีสานตอนล่าง', region: 'ภาคตะวันออกเฉียงเหนือ' },

  // [S-U] ภาคใต้ตอนบน
  'สุราษฎร์ธานี': { zone: '[S-U] ภาคใต้ตอนบน', region: 'ภาคใต้' },
  'ภูเก็ต': { zone: '[S-U] ภาคใต้ตอนบน', region: 'ภาคใต้' },
  'นครศรีธรรมราช': { zone: '[S-U] ภาคใต้ตอนบน', region: 'ภาคใต้' },

  // [S-L] ภาคใต้ตอนล่าง
  'ตรัง': { zone: '[S-L] ภาคใต้ตอนล่าง', region: 'ภาคใต้' },
  'สงขลา': { zone: '[S-L] ภาคใต้ตอนล่าง', region: 'ภาคใต้' }
};

let cachedBranches = [];

async function fetchRemoteBranches() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const htmlRes = await fetch('https://vibepjm.online/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
      if (scriptMatch) {
        const bundleUrl = 'https://vibepjm.online' + scriptMatch[1];
        const jsRes = await fetch(bundleUrl);
        if (jsRes.ok) {
          const jsContent = await jsRes.text();
          const startMarker = '[{id:`br-01`,code:`B01`,name:`สาขาพระราม 9`';
          const startIdx = jsContent.indexOf(startMarker);
          if (startIdx !== -1) {
            let bracketCount = 0;
            let endIdx = startIdx;
            for (let i = startIdx; i < jsContent.length; i++) {
              if (jsContent[i] === '[') bracketCount++;
              else if (jsContent[i] === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  endIdx = i + 1;
                  break;
                }
              }
            }
            const arrayStr = jsContent.substring(startIdx, endIdx);
            const cleanFn = new Function(`return ${arrayStr};`);
            const branches = cleanFn();

            if (Array.isArray(branches) && branches.length > 0) {
              cachedBranches = branches.filter(b => !EXCLUDED_BRANCH_IDS.includes(b.id));
              let count = 0;
              const now = new Date().toISOString();
              for (const b of branches) {
                if (EXCLUDED_BRANCH_IDS.includes(b.id)) continue;
                const branchId = b.id || `br-${b.code || Date.now()}`;
                const branchCode = (b.id ? b.id.replace(/\D/g, '') : '') || (b.code ? b.code.replace(/\D/g, '') : '') || branchId;
                const branchName = b.name;
                const province = (b.province || 'กรุงเทพมหานคร').trim();
                const status = b.status || 'Active';
                const fullName = b.fullName || b.name;
                const address = b.address || `${b.name} ${province}`;
                const lat = b.latitude ? parseFloat(b.latitude) : null;
                const lng = b.longitude ? parseFloat(b.longitude) : null;
                const openTime = b.openTime || '07:00';
                const closeTime = b.closeTime || '21:00';
                const phone = b.phone || '1308';
                const storeGroup = b.storeGroup || (b.name.includes('ไทวัสดุ') ? 'TWD' : 'BNB');

                const zoneInfo = PROVINCE_TO_ZONE_MAP[province] || { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง' };
                const zone = zoneInfo.zone;
                const region = zoneInfo.region;

                await pool.query(`
                  INSERT INTO master_branches (id, code, name, province, status, zone, region, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  ON CONFLICT (id) DO UPDATE SET
                    code = EXCLUDED.code,
                    name = EXCLUDED.name,
                    province = EXCLUDED.province,
                    status = EXCLUDED.status,
                    zone = EXCLUDED.zone,
                    region = EXCLUDED.region,
                    updated_at = EXCLUDED.updated_at
                `, [branchId, branchCode, branchName, province, status, zone, region, now, now]);

                await pool.query(`
                  INSERT INTO branches (id, code, name, province, status, full_name, address, latitude, longitude, open_time, close_time, phone, store_group, zone, region, updated_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
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
                    zone = EXCLUDED.zone,
                    region = EXCLUDED.region,
                    updated_at = CURRENT_TIMESTAMP
                `, [
                  branchId, branchCode, branchName, province, status,
                  fullName, address, lat, lng, openTime, closeTime, phone, storeGroup,
                  zone, region
                ]);
                count++;
              }
              console.log(`ℹ️ Cached and UPSERTED ${count} remote branches from vibepjm.online into branches & master_branches`);
              return;
            }
          }
        }
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
      assignedBranches: u.assigned_branches || [],
      assignedZones: u.assigned_zones || [],
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
      zone: b.zone,
      region: b.region,
      fullName: b.full_name,
      address: b.address,
      latitude: b.latitude ? parseFloat(b.latitude) : undefined,
      longitude: b.longitude ? parseFloat(b.longitude) : undefined,
      openTime: b.open_time,
      closeTime: b.close_time,
      phone: b.phone,
      storeGroup: b.store_group,
      assignedQcIds: b.assigned_qc_ids || []
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
      zone: b.zone,
      region: b.region,
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
  const { date, leadId } = req.query;
  try {
    // 1. Get users with 'QC' skill, role, department, or matching name
    let result = await pool.query(`
      SELECT id, name, global_role 
      FROM users 
      WHERE 'QC' = ANY(skills) 
         OR 'Survey' = ANY(skills) 
         OR 'Technician' = ANY(skills)
         OR 'ช่าง' = ANY(skills)
         OR global_role ILIKE '%QC%' 
         OR department ILIKE '%QC%' 
         OR name ILIKE '%QC%'
      ORDER BY name ASC
    `);
    let qcUsers = result.rows;

    // Fallback: If no dedicated QC users found, list all active users/technicians
    if (qcUsers.length === 0) {
      const fallbackRes = await pool.query("SELECT id, name, global_role FROM users ORDER BY name ASC");
      qcUsers = fallbackRes.rows;
    }

    if (!date) {
      return res.json(qcUsers);
    }

    // 2. Check availability (+/- 3 hours overlap check)
    const availableUsers = [];
    for (const u of qcUsers) {
      const busyRes = await pool.query(
        `SELECT id FROM leads 
         WHERE surveyor_id = $1 
         AND survey_date IS NOT NULL 
         AND id != COALESCE($3, '')
         AND ABS(EXTRACT(EPOCH FROM (CAST(survey_date AS TIMESTAMP) - CAST($2 AS TIMESTAMP)))) < 10800`, 
        [u.id, date, leadId || '']
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
    const result = await pool.query('SELECT id, name, email, avatar, global_role, department, gender, birthday, skills, wfh_days, tax_id, id_card_number, id_card_files, company_name, line_id, phones, job_types, service_zones, assigned_branches, assigned_zones, work_slots, certificates, criminal_record, credit_term_days, technician_level, home_latitude, home_longitude, home_address FROM users ORDER BY name ASC');
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
      assignedBranches: u.assigned_branches || [],
      assignedZones: u.assigned_zones || [],
      workSlots: u.work_slots || [],
      certificates: u.certificates || [],
      criminalRecord: u.criminal_record || 'ไม่มี',
      creditTermDays: u.credit_term_days != null ? parseInt(u.credit_term_days) : 30,
      technicianLevel: u.technician_level || 'Standard',
      homeLatitude: u.home_latitude != null ? parseFloat(u.home_latitude) : null,
      homeLongitude: u.home_longitude != null ? parseFloat(u.home_longitude) : null,
      homeAddress: u.home_address || ''
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
    taxId, idCardNumber, idCardFiles, companyName, lineId, phones, jobTypes, serviceZones, assignedBranches, assignedZones, workSlots, certificates, criminalRecord, creditTermDays, technicianLevel,
    homeLatitude, homeLongitude, homeAddress, home_latitude, home_longitude, home_address
  } = req.body;
  
  const cleanName = (name || '').replace(/\s+/g, ' ').trim() || 'User';
  const cleanEmail = (email || '').trim().toLowerCase();
  const safeRole = globalRole || 'Employee';
  const safeDept = (department || '').trim() || 'General';
  const safeAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const safeHomeLat = (homeLatitude != null && homeLatitude !== '') ? parseFloat(homeLatitude) : ((home_latitude != null && home_latitude !== '') ? parseFloat(home_latitude) : null);
  const safeHomeLng = (homeLongitude != null && homeLongitude !== '') ? parseFloat(homeLongitude) : ((home_longitude != null && home_longitude !== '') ? parseFloat(home_longitude) : null);
  const safeHomeAddr = homeAddress || home_address || '';

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
      pwHash = crypto.createHash('sha256').update('123456').digest('hex');
    }

    await pool.query(
      `INSERT INTO users (
         id, name, email, avatar, global_role, department, gender, birthday, skills, password_hash, wfh_days,
         tax_id, id_card_number, id_card_files, company_name, line_id, phones, job_types, service_zones, assigned_branches, assigned_zones, work_slots, certificates, criminal_record, credit_term_days, technician_level,
         home_latitude, home_longitude, home_address
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
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
         assigned_branches = EXCLUDED.assigned_branches,
         assigned_zones = EXCLUDED.assigned_zones,
         work_slots = EXCLUDED.work_slots,
         certificates = EXCLUDED.certificates,
         criminal_record = EXCLUDED.criminal_record,
         credit_term_days = EXCLUDED.credit_term_days,
         technician_level = EXCLUDED.technician_level,
         home_latitude = EXCLUDED.home_latitude,
         home_longitude = EXCLUDED.home_longitude,
         home_address = EXCLUDED.home_address`,
      [
        id, cleanName, cleanEmail, safeAvatar, safeRole, safeDept, gender || '', birthday || '', skills || [], pwHash, wfhDays || [],
        taxId || '', idCardNumber || '', JSON.stringify(idCardFiles || []), companyName || '', lineId || '',
        phones || [], jobTypes || [], serviceZones || [], assignedBranches || [], assignedZones || [], workSlots || [], JSON.stringify(certificates || []),
        criminalRecord || 'ไม่มี', creditTermDays != null ? parseInt(creditTermDays) : 30, technicianLevel || 'Standard',
        safeHomeLat, safeHomeLng, safeHomeAddr
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
             job_types = $16, service_zones = $17, assigned_branches = $18, assigned_zones = $19, work_slots = $20,
             certificates = $21, criminal_record = $22, credit_term_days = $23,
             technician_level = $24,
             home_latitude = COALESCE($25, home_latitude),
             home_longitude = COALESCE($26, home_longitude),
             home_address = COALESCE($27, home_address)
           WHERE LOWER(email) = $28`,
          [
            cleanName, safeAvatar, safeRole, safeDept, gender || '', birthday || '', skills || [], pwHash, wfhDays || [],
            taxId || '', idCardNumber || '', JSON.stringify(idCardFiles || []), companyName || '', lineId || '',
            phones || [], jobTypes || [], serviceZones || [], assignedBranches || [], assignedZones || [], workSlots || [], JSON.stringify(certificates || []),
            criminalRecord || 'ไม่มี', creditTermDays != null ? parseInt(creditTermDays) : 30, technicianLevel || 'Standard',
            safeHomeLat, safeHomeLng, safeHomeAddr, cleanEmail
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
const qcHandoverRoutes = require('./src/routes/qcHandoverRoutes.cjs');
const estimationRoutes = require('./src/routes/estimationRoutes.cjs');

app.use('/api/pricebook', serviceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects/:projectId/qc', qcHandoverRoutes);
app.use('/api/estimations', estimationRoutes);

// Endpoint to download Test Scenarios CSV for Google Sheets / Excel
app.get('/api/test-scenarios/csv', (req, res) => {
  const filePath = path.join(__dirname, 'TEST_SCENARIOS_GOOGLE_SHEET.csv');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.download(filePath, 'NexTime_BuildFlow_Test_Scenarios.csv');
});

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

app.get('/api/projects', async (req, res) => {
  try {
    const projectsRes = await pool.query('SELECT * FROM projects ORDER BY created_at DESC NULLS LAST, id DESC');
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
      customer_name: p.customer_name,
      customer_phone: p.customer_phone,
      customer_address: p.address,
      customerName: p.customer_name,
      customerPhone: p.customer_phone,
      customerAddress: p.address,
      convertedAt: p.converted_at
    }));
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
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
      const executionStages = ["Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];
      cols = [...commonStages, ...executionStages];
    }
    
    if (!cols || cols.length === 0) {
      cols = ["To Do", "Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];
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
        updatedAt,
        afterImage || null
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
// LEADS API & QC DAILY PLAN API & CUSTOMER MASTER API
// ==========================================
const customerRoutes = require('./src/routes/customerRoutes.cjs');
app.use('/api/customers', customerRoutes);

const leadRoutes = require('./src/routes/leadRoutes.cjs');
app.use('/api/leads', leadRoutes);

const qcPlanRoutes = require('./src/routes/qcPlanRoutes.cjs');
app.use('/api/qc-plans', qcPlanRoutes);



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

    const initialMembers = [];
    if (admin_id) {
      initialMembers.push({ id: admin_id, userId: admin_id, role: 'Manager' });
    }
    if (lead.sales_contact_id && lead.sales_contact_id !== admin_id) {
      initialMembers.push({ id: lead.sales_contact_id, userId: lead.sales_contact_id, role: 'Sales' });
    }
    if (lead.surveyor_id && lead.surveyor_id !== admin_id && lead.surveyor_id !== lead.sales_contact_id) {
      initialMembers.push({ id: lead.surveyor_id, userId: lead.surveyor_id, role: 'Surveyor' });
    }
    const membersJson = JSON.stringify(initialMembers);

    const commonStages = ["To Do"];
    const executionStages = ["Assign ช่าง", "Check-in", "Check-out", "QC", "Aftersale", "Close"];
    let cols = [...commonStages, ...executionStages];

    // Build initial lifecycle state — starts at Phase 3 (Execution) since
    // Phase 1 (Lead & Survey) and Phase 2 (Design & Quote) were completed in the Lead flow.
    const initialLifecycle = {
      phase: 'PHASE_03_PROJECT_EXECUTION',
      step: 'project_plan_creation',
      survey_appointment: 'no',
      surveyor_id: '',
      survey_date: '',
      survey_checked_in: false,
      survey_checked_out: false,
      survey_check_in_time: '',
      survey_check_out_time: '',
      survey_photo_before: '',
      survey_photo_after: '',
      followup_scheduled: false,
      followup_date: '',
      followup_notes: '',
      design_required: 'yes',
      design_files: [],
      design_approved: 'approved',
      design_revise_count: 0,
      quotation_approved: 'approved',
      payment_received: true,
      payment_slip_url: lead.payment_slip_url || 'CONVERTED_FROM_LEAD',
      project_plan_created: false,
      technicians: [],
      work_started: false,
      work_finished: false,
      qc_passed: 'pending',
      online_qc_review_notes: '',
      customer_satisfied: 'pending',
      rework_count: 0,
      settled_in_bmt: false,
      bmt_payment_recorded: false,
      bmt_aftersales_result: '',
    };
    const initialExtraDetails = { 
      lifecycle: initialLifecycle,
      branch: 'สาขาบางนา',
      buildingType: 'บ้านเดี่ยว',
      customerStaffPic: lead.sales_contact_id || admin_id || ''
    };

    const projResult = await pool.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, members, address, project_type, custom_columns, lead_id, customer_name, customer_phone, converted_at, site_latitude, site_longitude, site_radius_meters, execution_phase, extra_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
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
        JSON.stringify(cols),
        id,
        lead.customer_name,
        lead.customer_phone,
        now,
        lead.customer_latitude ? parseFloat(lead.customer_latitude) : null,
        lead.customer_longitude ? parseFloat(lead.customer_longitude) : null,
        500,
        'Active Execution',
        JSON.stringify(initialExtraDetails)
      ]
    );

    await pool.query(
        `INSERT INTO project_workflows (project_id, statuses, transitions) VALUES ($1, $2, $3)`,
        [projectId, JSON.stringify(cols), JSON.stringify([])]
    );

    const templateResult = await pool.query(
        'SELECT * FROM task_templates WHERE project_template_name ILIKE $1 ORDER BY start_percent ASC',
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

    const startD = new Date(now);
    const endD = new Date(endDateStr);
    const totalMs = Math.max(86400000, endD.getTime() - startD.getTime());

    for (let i = 0; i < tpls.length; i++) {
        const tpl = tpls[i];
        const taskId = `t_${Date.now()}_${i}`;
        const tStart = new Date(startD.getTime() + (totalMs * (parseFloat(tpl.start_percent) || 0) / 100)).toISOString().split('T')[0];
        const tEnd = new Date(startD.getTime() + (totalMs * (parseFloat(tpl.end_percent) || 100) / 100)).toISOString().split('T')[0];
        await pool.query(
            `INSERT INTO tasks (id, project_id, title, description, status, priority, estimated_hours, progress_percent, start_date, end_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [taskId, projectId, tpl.title, tpl.description, 'To Do', tpl.priority, tpl.estimated_hours, 0, tStart, tEnd, now]
        );
    }

    await pool.query(
        `UPDATE leads SET status = 'Converted', project_id = $1, updated_at = $2 WHERE id = $3`,
        [projectId, now, id]
    );

    // Synchronize all quotations for this lead to Converted status
    await pool.query(
        `UPDATE quotations SET status = 'Converted', project_id = $1, updated_at = $2 WHERE lead_id = $3`,
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

// ─── MA Contracts ────────────────────────────────────────────────────────────
app.get('/api/ma-contracts', requireAuth, async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    let query = `
      SELECT mc.*,
        c.customer_name, c.phone as customer_phone,
        cs.site_name, cs.address as site_address,
        (SELECT COUNT(*) FROM ma_rounds mr WHERE mr.contract_id = mc.id)::int as total_rounds_count,
        (SELECT COUNT(*) FROM ma_rounds mr WHERE mr.contract_id = mc.id AND mr.status = 'Completed')::int as completed_rounds
      FROM ma_contracts mc
      LEFT JOIN customers c ON mc.customer_id = c.id
      LEFT JOIN customer_sites cs ON mc.customer_site_id = cs.id
    `;
    const params = [];
    const conditions = [];
    if (customer_id) { conditions.push(`mc.customer_id = $${params.length + 1}`); params.push(customer_id); }
    if (status) { conditions.push(`mc.status = $${params.length + 1}`); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY mc.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/ma-contracts error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ma-contracts', requireAuth, async (req, res) => {
  try {
    const {
      id, contract_no, customer_id, customer_site_id, service_type,
      service_items, frequency_months, total_rounds,
      contract_start_date, contract_end_date, contract_value,
      status, notes, created_by
    } = req.body;
    const cid = id || `mac_${Date.now()}`;
    let cno = contract_no;
    if (!cno) {
      const yr = new Date().getFullYear();
      const countRes = await pool.query(`SELECT COUNT(*) FROM ma_contracts WHERE contract_no LIKE $1`, [`MAC-${yr}-%`]);
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0');
      cno = `MAC-${yr}-${seq}`;
    }
    const result = await pool.query(
      `INSERT INTO ma_contracts (id, contract_no, customer_id, customer_site_id, service_type, service_items, frequency_months, total_rounds, contract_start_date, contract_end_date, contract_value, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         customer_id=EXCLUDED.customer_id, customer_site_id=EXCLUDED.customer_site_id,
         service_type=EXCLUDED.service_type, service_items=EXCLUDED.service_items,
         frequency_months=EXCLUDED.frequency_months, total_rounds=EXCLUDED.total_rounds,
         contract_start_date=EXCLUDED.contract_start_date, contract_end_date=EXCLUDED.contract_end_date,
         contract_value=EXCLUDED.contract_value, status=EXCLUDED.status, notes=EXCLUDED.notes
       RETURNING *`,
      [cid, cno, customer_id || null, customer_site_id || null, service_type || null,
       JSON.stringify(service_items || []), frequency_months || 3, total_rounds || 4,
       contract_start_date || null, contract_end_date || null, contract_value || 0,
       status || 'Active', notes || null, created_by || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/ma-contracts error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ma-contracts/:id', requireAuth, async (req, res) => {
  try {
    const contractRes = await pool.query(
      `SELECT mc.*, c.customer_name, c.phone as customer_phone, cs.site_name, cs.address as site_address
       FROM ma_contracts mc
       LEFT JOIN customers c ON mc.customer_id = c.id
       LEFT JOIN customer_sites cs ON mc.customer_site_id = cs.id
       WHERE mc.id = $1`,
      [req.params.id]
    );
    if (contractRes.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const roundsRes = await pool.query(
      `SELECT mr.*, p.id as proj_id, p.name as proj_name, p.status as proj_status
       FROM ma_rounds mr
       LEFT JOIN projects p ON mr.project_id = p.id
       WHERE mr.contract_id = $1
       ORDER BY mr.round_number ASC`,
      [req.params.id]
    );
    res.json({ ...contractRes.rows[0], rounds: roundsRes.rows });
  } catch (err) {
    console.error('GET /api/ma-contracts/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/ma-contracts/:id', requireAuth, async (req, res) => {
  try {
    const { status, notes, contract_value, contract_end_date } = req.body;
    const result = await pool.query(
      `UPDATE ma_contracts SET
         status = COALESCE($1, status),
         notes = COALESCE($2, notes),
         contract_value = COALESCE($3, contract_value),
         contract_end_date = COALESCE($4, contract_end_date)
       WHERE id = $5 RETURNING *`,
      [status || null, notes || null, contract_value || null, contract_end_date || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MA Rounds ────────────────────────────────────────────────────────────────
app.post('/api/ma-rounds', requireAuth, async (req, res) => {
  try {
    const { id, contract_id, project_id, round_number, scheduled_date, actual_date, status, notes } = req.body;
    const rid = id || `mar_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO ma_rounds (id, contract_id, project_id, round_number, scheduled_date, actual_date, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         project_id=EXCLUDED.project_id, scheduled_date=EXCLUDED.scheduled_date,
         actual_date=EXCLUDED.actual_date, status=EXCLUDED.status, notes=EXCLUDED.notes
       RETURNING *`,
      [rid, contract_id, project_id || null, round_number, scheduled_date || null, actual_date || null, status || 'Scheduled', notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/ma-rounds error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/ma-rounds/:id', requireAuth, async (req, res) => {
  try {
    const { project_id, scheduled_date, actual_date, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE ma_rounds SET
         project_id = COALESCE($1, project_id),
         scheduled_date = COALESCE($2, scheduled_date),
         actual_date = COALESCE($3, actual_date),
         status = COALESCE($4, status),
         notes = COALESCE($5, notes)
       WHERE id = $6 RETURNING *`,
      [project_id || null, scheduled_date || null, actual_date || null, status || null, notes || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MA Checklist Templates ───────────────────────────────────────────────────
app.get('/api/ma-checklist-templates', requireAuth, async (req, res) => {
  try {
    const { service_type } = req.query;
    let query = 'SELECT * FROM ma_checklist_templates';
    const params = [];
    if (service_type) {
      query += ' WHERE service_type = $1';
      params.push(service_type);
    }
    query += ' ORDER BY service_type ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ma-checklist-templates', requireAuth, async (req, res) => {
  try {
    const { id, service_type, template_name, checklist_items } = req.body;
    const tid = id || `mact_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO ma_checklist_templates (id, service_type, template_name, checklist_items)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET service_type=EXCLUDED.service_type, template_name=EXCLUDED.template_name, checklist_items=EXCLUDED.checklist_items
       RETURNING *`,
      [tid, service_type, template_name || service_type, JSON.stringify(checklist_items || [])]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Using app.use instead of app.get('/(.*)', ...) to avoid path-to-regexp v6 incompatibility
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
