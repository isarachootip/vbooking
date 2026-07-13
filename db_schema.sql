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
    support_task_style VARCHAR(50) DEFAULT 'categories'
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

-- 6. Task Templates Table
CREATE TABLE IF NOT EXISTS task_templates (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    start_percent NUMERIC NOT NULL DEFAULT 0,
    end_percent NUMERIC NOT NULL DEFAULT 100,
    estimated_hours NUMERIC NOT NULL DEFAULT 0
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


