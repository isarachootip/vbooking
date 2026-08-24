-- Database schema for NexTime application

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    avatar TEXT,
    global_role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    gender VARCHAR(50),
    birthday VARCHAR(50), -- kept as VARCHAR to align with react string picker YYYY-MM-DD
    skills TEXT[] DEFAULT '{}',
    line_user_id VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    wfh_days TEXT[] DEFAULT '{}'
);

-- 1.5 Permission Schemes Table
CREATE TABLE IF NOT EXISTS permission_schemes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50),
    budget NUMERIC,
    members JSONB DEFAULT '[]'::jsonb,
    custom_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    permission_scheme_id VARCHAR(50) REFERENCES permission_schemes(id) ON DELETE SET NULL,
    project_type VARCHAR(50) DEFAULT 'dev',
    support_task_style VARCHAR(50) DEFAULT 'categories',
    address TEXT,
    project_value NUMERIC DEFAULT 0,
    invoiced_value NUMERIC DEFAULT 0,
    collected_value NUMERIC DEFAULT 0,
    planned_expense NUMERIC DEFAULT 0,
    actual_expense NUMERIC DEFAULT 0
);

-- 2.5 Project Workflows Table
CREATE TABLE IF NOT EXISTS project_workflows (
    project_id VARCHAR(50) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    statuses JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    transitions JSONB DEFAULT '[]'::jsonb
);

-- 3. Sprints Table
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Planned', 'Active', 'Completed'
    start_date VARCHAR(50),
    end_date VARCHAR(50)
);

-- 4. Releases Table
CREATE TABLE IF NOT EXISTS releases (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Unreleased', 'Released'
    release_date VARCHAR(50)
);

-- 5. Tasks Table
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
    parent_id VARCHAR(50),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    sprint_id VARCHAR(50) REFERENCES sprints(id) ON DELETE SET NULL,
    release_id VARCHAR(50) REFERENCES releases(id) ON DELETE SET NULL,
    story_points INTEGER DEFAULT 0,
    issue_type VARCHAR(50) DEFAULT 'Task' -- 'Bug', 'Story', 'Task', 'Sub-task'
);

-- 5.5 Master Project Types
CREATE TABLE IF NOT EXISTS master_project_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    default_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    created_at VARCHAR(50)
);

-- 5.6 Milestone Templates
CREATE TABLE IF NOT EXISTS milestone_templates (
    id VARCHAR(50) PRIMARY KEY,
    master_type_id VARCHAR(50) REFERENCES master_project_types(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sequence_order INTEGER DEFAULT 0
);

-- 6. Task Templates Table
CREATE TABLE IF NOT EXISTS task_templates (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    start_percent NUMERIC NOT NULL DEFAULT 0,
    end_percent NUMERIC NOT NULL DEFAULT 100,
    estimated_hours NUMERIC NOT NULL DEFAULT 0,
    project_template_name VARCHAR(100) DEFAULT 'General',
    milestone_template_id VARCHAR(50) REFERENCES milestone_templates(id) ON DELETE SET NULL,
    required_proof VARCHAR(50) -- e.g. 'check_in_photo', 'check_out_photo'
);

-- 7. Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    task_id VARCHAR(50),
    date VARCHAR(50) NOT NULL,
    hours NUMERIC NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    approved_by VARCHAR(50),
    approved_at VARCHAR(50),
    image_url TEXT
);

-- 8. Task Commits (Git Integration)
CREATE TABLE IF NOT EXISTS task_commits (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    commit_hash VARCHAR(50) NOT NULL,
    message TEXT,
    author VARCHAR(100),
    timestamp VARCHAR(50)
);

-- 9. Project Baselines (Plan Versions)
CREATE TABLE IF NOT EXISTS project_baselines (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at VARCHAR(50) NOT NULL,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_baseline_per_project 
ON project_baselines (project_id) 
WHERE is_active = TRUE;

-- 10. Task Snapshots
CREATE TABLE IF NOT EXISTS task_snapshots (
    id VARCHAR(50) PRIMARY KEY,
    baseline_id VARCHAR(50) NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    task_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    estimated_hours NUMERIC NOT NULL DEFAULT 0,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    story_points INTEGER DEFAULT 0,
    assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    parent_id VARCHAR(50),
    sprint_id VARCHAR(50),
    release_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_task_snapshots_baseline ON task_snapshots(baseline_id);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_task ON task_snapshots(task_id);

-- 11. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_latitude NUMERIC,
    customer_longitude NUMERIC,
    map_url TEXT,
    job_type VARCHAR(100) NOT NULL, -- e.g., 'Quick Service', 'Installation', 'Renovation'
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    avatar TEXT,
    global_role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    gender VARCHAR(50),
    birthday VARCHAR(50), -- kept as VARCHAR to align with react string picker YYYY-MM-DD
    skills TEXT[] DEFAULT '{}',
    line_user_id VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    wfh_days TEXT[] DEFAULT '{}'
);

-- 1.5 Permission Schemes Table
CREATE TABLE IF NOT EXISTS permission_schemes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL
);

-- 1.6 Master Branches (Synced from VQ)
CREATE TABLE IF NOT EXISTS master_branches (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(150) NOT NULL,
    province VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    created_at VARCHAR(50),
    updated_at VARCHAR(50)
);

-- 1.7 Master Zones (Synced from VQ)
CREATE TABLE IF NOT EXISTS master_zones (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    created_at VARCHAR(50)
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50),
    budget NUMERIC,
    members JSONB DEFAULT '[]'::jsonb,
    custom_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    permission_scheme_id VARCHAR(50) REFERENCES permission_schemes(id) ON DELETE SET NULL,
    project_type VARCHAR(50) DEFAULT 'dev',
    support_task_style VARCHAR(50) DEFAULT 'categories',
    address TEXT,
    project_value NUMERIC DEFAULT 0,
    invoiced_value NUMERIC DEFAULT 0,
    collected_value NUMERIC DEFAULT 0,
    planned_expense NUMERIC DEFAULT 0,
    actual_expense NUMERIC DEFAULT 0
);

-- 2.5 Project Workflows Table
CREATE TABLE IF NOT EXISTS project_workflows (
    project_id VARCHAR(50) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    statuses JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    transitions JSONB DEFAULT '[]'::jsonb
);

-- 3. Sprints Table
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Planned', 'Active', 'Completed'
    start_date VARCHAR(50),
    end_date VARCHAR(50)
);

-- 4. Releases Table
CREATE TABLE IF NOT EXISTS releases (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Unreleased', 'Released'
    release_date VARCHAR(50)
);

-- 5. Tasks Table
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
    parent_id VARCHAR(50),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    sprint_id VARCHAR(50) REFERENCES sprints(id) ON DELETE SET NULL,
    release_id VARCHAR(50) REFERENCES releases(id) ON DELETE SET NULL,
    story_points INTEGER DEFAULT 0,
    issue_type VARCHAR(50) DEFAULT 'Task' -- 'Bug', 'Story', 'Task', 'Sub-task'
);

-- 5.5 Master Project Types
CREATE TABLE IF NOT EXISTS master_project_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    default_columns JSONB DEFAULT '["To Do", "In Progress", "Review", "Done"]'::jsonb,
    created_at VARCHAR(50)
);

-- 5.6 Milestone Templates
CREATE TABLE IF NOT EXISTS milestone_templates (
    id VARCHAR(50) PRIMARY KEY,
    master_type_id VARCHAR(50) REFERENCES master_project_types(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sequence_order INTEGER DEFAULT 0
);

-- 6. Task Templates Table
CREATE TABLE IF NOT EXISTS task_templates (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    start_percent NUMERIC NOT NULL DEFAULT 0,
    end_percent NUMERIC NOT NULL DEFAULT 100,
    estimated_hours NUMERIC NOT NULL DEFAULT 0,
    project_template_name VARCHAR(100) DEFAULT 'General',
    milestone_template_id VARCHAR(50) REFERENCES milestone_templates(id) ON DELETE SET NULL,
    required_proof VARCHAR(50) -- e.g. 'check_in_photo', 'check_out_photo'
);

-- 7. Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    task_id VARCHAR(50),
    date VARCHAR(50) NOT NULL,
    hours NUMERIC NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    approved_by VARCHAR(50),
    approved_at VARCHAR(50),
    image_url TEXT
);

-- 8. Task Commits (Git Integration)
CREATE TABLE IF NOT EXISTS task_commits (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    commit_hash VARCHAR(50) NOT NULL,
    message TEXT,
    author VARCHAR(100),
    timestamp VARCHAR(50)
);

-- 9. Project Baselines (Plan Versions)
CREATE TABLE IF NOT EXISTS project_baselines (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at VARCHAR(50) NOT NULL,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_baseline_per_project 
ON project_baselines (project_id) 
WHERE is_active = TRUE;

-- 10. Task Snapshots
CREATE TABLE IF NOT EXISTS task_snapshots (
    id VARCHAR(50) PRIMARY KEY,
    baseline_id VARCHAR(50) NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    task_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    estimated_hours NUMERIC NOT NULL DEFAULT 0,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    story_points INTEGER DEFAULT 0,
    assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    parent_id VARCHAR(50),
    sprint_id VARCHAR(50),
    release_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_task_snapshots_baseline ON task_snapshots(baseline_id);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_task ON task_snapshots(task_id);

-- 11. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_latitude NUMERIC,
    customer_longitude NUMERIC,
    map_url TEXT,
    job_type VARCHAR(100) NOT NULL, -- e.g., 'Quick Service', 'Installation', 'Renovation'
    status VARCHAR(50) NOT NULL DEFAULT 'New', -- 'New', 'Contacted', 'Qualified', 'Converted', 'Lost'
    appointment_date VARCHAR(50),
    appointment_type VARCHAR(50),
    appointment_assignee VARCHAR(150),
    notes TEXT,
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
    sales_contact_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Lead Followups Table
CREATE TABLE IF NOT EXISTS lead_followups (
    id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'Call Back', 'Site Visit', 'Follow-up Quote', 'Note'
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

-- 13. Service Price Book Table
CREATE TABLE IF NOT EXISTS service_price_book (
    id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit_type VARCHAR(50),
    labor_cost NUMERIC DEFAULT 0,
    material_cost NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    default_margin_percent NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at VARCHAR(50),
    updated_at VARCHAR(50)
);

-- 14. Quotations Table (Phase 5)
CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
    quotation_number VARCHAR(100) NOT NULL,
    issue_date VARCHAR(50) NOT NULL,
    valid_until VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Sent', 'Approved', 'Rejected'
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    vat_type VARCHAR(50) DEFAULT 'Exclude VAT', -- 'Exclude VAT', 'Include VAT', 'No VAT'
    vat_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0, -- For margin calculation
    notes TEXT,
    created_at VARCHAR(50) NOT NULL,
    created_by VARCHAR(150),
    updated_at VARCHAR(50)
);

-- 15. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
    id VARCHAR(50) PRIMARY KEY,
    quotation_id VARCHAR(50) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    price_book_id VARCHAR(50) REFERENCES service_price_book(id) ON DELETE SET NULL,
    service_name VARCHAR(200) NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_type VARCHAR(50),
    unit_cost NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- ==============================================
-- Database Performance Indexes (Phase 4 & 5)
-- ==============================================

-- Quotations
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Lead Followups
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id_project_id ON timesheets(user_id, project_id);

-- ==============================================
-- Phase 9: Advanced Site Tracking
-- ==============================================

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS before_image TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS after_image TEXT;

-- ==============================================
-- Phase 11: Smart Dispatch (Surveyor)
-- ==============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS surveyor_id VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS survey_date VARCHAR(50);

-- ==============================================
-- Phase 12: Project Reference & UI
-- ==============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_id VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS converted_at VARCHAR(50);

-- ==============================================
-- Phase 13: QC Daily Planning & Origin Route Optimization
-- ==============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS home_latitude NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;

CREATE TABLE IF NOT EXISTS qc_daily_plans (
    id VARCHAR(50) PRIMARY KEY,
    qc_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date VARCHAR(50) NOT NULL,
    origin_latitude NUMERIC NOT NULL,
    origin_longitude NUMERIC NOT NULL,
    origin_address TEXT,
    total_estimated_km NUMERIC DEFAULT 0,
    total_estimated_duration_min INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Confirmed',
    notes TEXT,
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL,
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS qc_plan_items (
    id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL REFERENCES qc_daily_plans(id) ON DELETE CASCADE,
    lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    time_slot VARCHAR(50),
    site_name VARCHAR(200) NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    site_address TEXT,
    site_latitude NUMERIC NOT NULL,
    site_longitude NUMERIC NOT NULL,
    estimated_distance_from_prev_km NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    check_in_time VARCHAR(50),
    check_out_time VARCHAR(50),
    actual_check_in_lat NUMERIC,
    actual_check_in_lng NUMERIC,
    qc_inspection_id VARCHAR(50) REFERENCES project_qc_inspections(id) ON DELETE SET NULL,
    notes TEXT,
    created_at VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qc_daily_plans_qc_date ON qc_daily_plans(qc_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_qc_plan_items_plan_id ON qc_plan_items(plan_id);

