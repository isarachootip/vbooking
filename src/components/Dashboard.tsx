import { useState } from 'react';
import { Clock, CheckSquare, Briefcase, AlertTriangle, TrendingUp, Users, ChevronRight, Calendar, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Project, Task, TimesheetEntry } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  timesheets: TimesheetEntry[];
  currentUser: User;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

const formatDate = (date: Date): string => {
  return formatToDDMMYYYY(date);
};

const priorityColors: Record<string, string> = {
  Urgent: 'rgba(239,68,68,0.85)',
  High: 'rgba(245,158,11,0.85)',
  Medium: 'rgba(99,102,241,0.85)',
  Low: 'rgba(107,114,128,0.85)',
};

const statusColors: Record<string, string> = {
  'To Do': 'rgba(107,114,128,0.7)',
  'In Progress': 'rgba(99,102,241,0.8)',
  'Review': 'rgba(245,158,11,0.8)',
  'Done': 'rgba(16,185,129,0.8)',
};

const projectStatusColors: Record<string, string> = {
  Planning: 'rgba(107,114,128,0.8)',
  Active: 'rgba(16,185,129,0.8)',
  'On Hold': 'rgba(245,158,11,0.8)',
  Completed: 'rgba(99,102,241,0.8)',
};

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.2rem 0.55rem',
    borderRadius: '999px',
    background: color,
    color: 'white',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

export const Dashboard = ({ projects, tasks, timesheets, currentUser }: DashboardProps) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // --- Hero stats ---
  const activeProjects = projects.filter(
    p => p.status === 'Active' && p.members.some(m => m.userId === currentUser.id)
  );

  const myActiveTasks = tasks.filter(
    t => t.assigneeId === currentUser.id && t.status !== 'Done'
  );

  const overdueTasks = tasks.filter(t => {
    if (!t.endDate || t.status === 'Done') return false;
    const end = new Date(t.endDate);
    end.setHours(0, 0, 0, 0);
    return end < today;
  });

  // Group overdue tasks by project
  const overdueByProject = projects.map(proj => {
    const count = overdueTasks.filter(t => t.projectId === proj.id).length;
    return { id: proj.id, name: proj.name, count };
  }).filter(p => p.count > 0);

  // Group overdue tasks by priority
  const priorities = ['Urgent', 'High', 'Medium', 'Low'];
  const overdueByPriority = priorities.map(prio => {
    const count = overdueTasks.filter(t => t.priority === prio).length;
    return { priority: prio, count };
  }).filter(p => p.count > 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const hoursThisWeek = timesheets
    .filter(ts => {
      if (ts.userId !== currentUser.id) return false;
      const d = new Date(ts.date);
      return d >= sevenDaysAgo && d <= today;
    })
    .reduce((sum, ts) => sum + ts.hours, 0);

  // --- My tasks ---
  const myTasksAll = tasks.filter(t => t.assigneeId === currentUser.id);
  const myProjects = projects.filter(p => myTasksAll.some(t => t.projectId === p.id));
  
  // Get unique statuses of tasks matching the current project filter
  const filteredForStatusList = myTasksAll.filter(t => projectFilter === 'All' || t.projectId === projectFilter);
  const taskStatuses = filteredForStatusList.map(t => t.status);
  const standardStatuses = ['To Do', 'In Progress', 'Review', 'Done'];
  const uniqueStatuses = Array.from(new Set([
    ...standardStatuses,
    ...taskStatuses
  ])).filter(status => {
    if (standardStatuses.includes(status)) return true;
    return taskStatuses.includes(status);
  });
  
  const statusOrder: Record<string, number> = { 'To Do': 1, 'In Progress': 2, 'Review': 3, 'Done': 4 };
  uniqueStatuses.sort((a, b) => {
    const orderA = statusOrder[a] || 99;
    const orderB = statusOrder[b] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const myTasks = myTasksAll
    .filter(t => projectFilter === 'All' || t.projectId === projectFilter)
    .filter(t => statusFilter === 'All' || t.status === statusFilter)
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA; // Descending (latest first)
    });

  const isDueSoon = (endDate?: string): boolean => {
    if (!endDate) return false;
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diff = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  };

  const shouldShowLogTime = (task: Task): boolean => {
    const proj = projects.find(p => p.id === task.projectId);
    const columns = proj?.customColumns && proj.customColumns.length > 0
      ? proj.customColumns
      : ['To Do', 'In Progress', 'Review', 'Done'];

    const statusIndex = columns.findIndex(col => col.toLowerCase() === task.status.toLowerCase());
    const inProgressIndex = columns.findIndex(col => col.toLowerCase().includes('progress'));

    if (statusIndex !== -1 && inProgressIndex !== -1) {
      return statusIndex <= inProgressIndex;
    }

    const s = task.status.toLowerCase();
    return !(s === 'review' || s === 'done' || s === 'pending' || s === 'completed' || s === 'approved');
  };

  const [dashboardMode, setDashboardMode] = useState<'my' | 'company'>('my');
  const canViewCompanyDashboard = currentUser?.globalRole === 'Admin' || currentUser?.globalRole === 'Manager';

  // Construction-specific calculations
  const constructionProjects = projects.filter(p => p.projectType === 'construction');
  
  const totalProjectValue = constructionProjects.reduce((sum, p) => sum + (p.projectValue || 0), 0);
  const totalInvoicedValue = constructionProjects.reduce((sum, p) => sum + (p.invoicedValue || 0), 0);
  const totalCollectedValue = constructionProjects.reduce((sum, p) => sum + (p.collectedValue || 0), 0);
  const totalPlannedExpense = constructionProjects.reduce((sum, p) => sum + (p.plannedExpense || 0), 0);
  const totalActualExpense = constructionProjects.reduce((sum, p) => sum + (p.actualExpense || 0), 0);

  const completedProjectsCount = projects.filter(p => p.status === 'Completed' || p.status === 'Project Complete').length;
  const overdueProjectsCount = projects.filter(p => p.status !== 'Completed' && p.status !== 'Project Complete' && p.endDate && new Date(p.endDate) < today).length;
  const onScheduleProjectsCount = projects.length - completedProjectsCount - overdueProjectsCount;

  // Expense chart data
  const expenseChartData = [
    { name: 'แผนงาน (Planned)', Amount: totalPlannedExpense },
    { name: 'จริง (Actual)', Amount: totalActualExpense }
  ];

  // Pipeline count data
  const pipelineStatuses = [
    'ซื้อสำรวจ',
    'QC (สำรวจ)',
    'ออกแบบ',
    'สร้างใบเสนอราคา',
    'ลูกค้ายืนยัน',
    'ชำระเงิน',
    'ดำเนินการโครงการ',
    'ช่าง check-in/check out siteงาน',
    'Project complete',
    'QC (ส่งมอบ)',
    'aftersales',
    'ปิดjob'
  ];

  const pipelineChartData = pipelineStatuses.map(status => ({
    name: status,
    จำนวนโครงการ: projects.filter(p => p.status === status).length
  }));

  const getPlannedProgress = (proj: Project) => {
    if (proj.status === 'Completed' || proj.status === 'Project Complete') return 100;
    if (!proj.startDate) return 0;
    const start = new Date(proj.startDate).getTime();
    const end = proj.endDate ? new Date(proj.endDate).getTime() : new Date().getTime();
    const total = end - start;
    if (total <= 0) return 0;
    const elapsed = Date.now() - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const getActualProgress = (projectId: string) => {
    const projTasks = tasks.filter(t => t.projectId === projectId && !t.parentId);
    if (projTasks.length === 0) return 0;
    const done = projTasks.filter(t => t.status === 'Done').length;
    return Math.round((done / projTasks.length) * 100);
  };

  // --- Project health ---
  const projectHealth = projects.map(proj => {
    const projTasks = tasks.filter(t => t.projectId === proj.id);
    const done = projTasks.filter(t => t.status === 'Done').length;
    const progress = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : 0;
    const daysRemaining = proj.endDate
      ? Math.ceil((new Date(proj.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { ...proj, progress, daysRemaining };
  });

  // --- Card style helpers ---
  const heroCardStyle = (bg: string, border: string): React.CSSProperties => ({
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: '1rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>
            Good {getGreeting()}, {currentUser.name} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Calendar size={14} />
            {formatDate(new Date())}
          </p>
        </div>

        {/* Mode Switcher */}
        {canViewCompanyDashboard && (
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setDashboardMode('my')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: dashboardMode === 'my' ? 'var(--accent-primary)' : 'transparent',
                color: dashboardMode === 'my' ? 'white' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Users size={12} /> หน้างานส่วนตัว (My Tasks)
            </button>
            <button
              onClick={() => setDashboardMode('company')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: dashboardMode === 'company' ? 'var(--accent-primary)' : 'transparent',
                color: dashboardMode === 'company' ? 'white' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <BarChart3 size={12} /> ภาพรวมบริษัท (Company Dashboard)
            </button>
          </div>
        )}
      </div>

      {dashboardMode === 'my' && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Active Projects */}
        <div className="hover-lift" style={heroCardStyle('rgba(16,185,129,0.08)', 'rgba(16,185,129,0.35)')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Projects</span>
            <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.15)', borderRadius: '0.5rem' }}>
              <Briefcase size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
            {activeProjects.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>projects you're a member of</div>
        </div>

        {/* My Active Tasks */}
        <div className="hover-lift" style={heroCardStyle('rgba(99,102,241,0.08)', 'rgba(99,102,241,0.35)')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>My Active Tasks</span>
            <div style={{ padding: '0.5rem', background: 'rgba(99,102,241,0.15)', borderRadius: '0.5rem' }}>
              <CheckSquare size={18} color="#6366f1" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>
            {myActiveTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>tasks not yet Done</div>
        </div>

        {/* Overdue Tasks */}
        <div className="hover-lift" style={heroCardStyle('rgba(239,68,68,0.08)', 'rgba(239,68,68,0.35)')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Overdue Tasks</span>
            <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.15)', borderRadius: '0.5rem' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: overdueTasks.length > 0 ? '#ef4444' : 'var(--text-primary)', lineHeight: 1 }}>
            {overdueTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {overdueTasks.length === 0 ? 'all tasks on track ✓' : 'tasks past their due date'}
          </div>
        </div>

        {/* Hours This Week */}
        <div className="hover-lift" style={heroCardStyle('rgba(14,165,233,0.08)', 'rgba(14,165,233,0.35)')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Hours This Week</span>
            <div style={{ padding: '0.5rem', background: 'rgba(14,165,233,0.15)', borderRadius: '0.5rem' }}>
              <Clock size={18} color="#0ea5e9" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
            {hoursThisWeek}h
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>logged in last 7 days</div>
        </div>
      </div>

      {/* ── Overdue Alert Banner (Graph Version) ── */}
      {overdueTasks.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(23, 17, 21, 0.85) 0%, rgba(22, 26, 34, 0.95) 100%)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '1rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(239,68,68,0.15)', paddingBottom: '0.75rem' }}>
            <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>
              ⚠️ {overdueTasks.length} Overdue Tasks Need Attention
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="dashboard-row">
            {/* Left Column: Overdue by Project */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                Overdue Tasks by Project
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {overdueByProject.map(p => {
                  const percent = Math.max(8, (p.count / overdueTasks.length) * 100);
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => navigate(`/projects#${p.id}`)}
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', cursor: 'pointer' }}
                      className="hover-lift"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={p.name}>
                          {p.name}
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.count}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                          borderRadius: '999px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Overdue by Priority */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                Overdue Tasks by Priority
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {overdueByPriority.map(p => {
                  const percent = Math.max(8, (p.count / overdueTasks.length) * 100);
                  const barColors: Record<string, string> = {
                    Urgent: 'linear-gradient(90deg, #ef4444, #ff6b6b)',
                    High: 'linear-gradient(90deg, #f59e0b, #facc15)',
                    Medium: 'linear-gradient(90deg, #6366f1, #818cf8)',
                    Low: 'linear-gradient(90deg, #64748b, #94a3b8)',
                  };
                  return (
                    <div key={p.priority} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.priority}</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{p.count}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: barColors[p.priority] || 'var(--text-muted)',
                          borderRadius: '999px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

        {/* LEFT — My Tasks */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={16} color="var(--accent-primary)" />
              My Tasks
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={projectFilter}
                onChange={e => {
                  setProjectFilter(e.target.value);
                  setStatusFilter('All');
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Projects</option>
                {myProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>sorted by latest update</span>
            </div>
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            {['All', ...uniqueStatuses].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: statusFilter === status ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: statusFilter === status ? 'white' : 'var(--text-secondary)',
                  border: statusFilter === status ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: statusFilter === status ? '0 2px 4px rgba(56, 189, 248, 0.2)' : 'none'
                }}
                className="hover-lift"
              >
                {status}
              </button>
            ))}
          </div>

          {myTasks.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {projectFilter !== 'All' || statusFilter !== 'All' ? '🎉 No tasks match the filters' : '🎉 No tasks assigned to you'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '520px' }}>
              {myTasks.map(task => {
                const proj = projects.find(p => p.id === task.projectId);
                const dueSoon = isDueSoon(task.endDate);
                const isOverdue = overdueTasks.some(o => o.id === task.id);
                return (
                  <div key={task.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    background: isOverdue
                      ? 'rgba(239,68,68,0.06)'
                      : dueSoon
                        ? 'rgba(245,158,11,0.06)'
                        : 'var(--bg-tertiary)',
                    borderRadius: '0.65rem',
                    border: isOverdue
                      ? '1px solid rgba(239,68,68,0.25)'
                      : dueSoon
                        ? '1px solid rgba(245,158,11,0.25)'
                        : '1px solid transparent',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                        {isOverdue && (
                          <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>OVERDUE</span>
                        )}
                        {!isOverdue && dueSoon && (
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>DUE SOON</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {proj && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Briefcase size={11} style={{ display: 'inline', marginRight: '0.2rem', verticalAlign: 'middle' }} />
                            {proj.name}
                          </span>
                        )}
                        {task.endDate && (
                           <span style={{ fontSize: '0.75rem', color: isOverdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                             <Calendar size={11} />
                             {formatToDDMMYYYY(task.endDate)}
                           </span>
                        )}
                      </div>
                    </div>
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Badge label={task.priority} color={priorityColors[task.priority] || 'rgba(107,114,128,0.8)'} />
                        <Badge label={task.status} color={statusColors[task.status] || 'rgba(107,114,128,0.8)'} />
                      </div>
                       {shouldShowLogTime(task) && (
                        <button 
                          onClick={() => navigate('/timesheet', { state: { autoOpenLog: true, projectId: task.projectId, taskId: task.id, taskTitle: task.title } })}
                          style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.35rem',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-lift"
                        >
                          <Clock size={10} /> + Log Time
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Project Health */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <TrendingUp size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Project Health</h3>
          </div>

          {projectHealth.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No projects found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '520px' }}>
              {projectHealth.map(proj => (
                <div 
                  key={proj.id} 
                  onClick={() => navigate(`/projects#${proj.id}`)}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="hover-lift"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>{proj.name}</span>
                    <Badge label={proj.status} color={projectStatusColors[proj.status] || 'rgba(107,114,128,0.8)'} />
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>Progress</span>
                      <span>{proj.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${proj.progress}%`,
                        background: proj.progress >= 80
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : proj.progress >= 40
                            ? 'linear-gradient(90deg, #6366f1, #818cf8)'
                            : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={12} />
                      {proj.members.length} member{proj.members.length !== 1 ? 's' : ''}
                    </span>
                    {proj.daysRemaining !== null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: proj.daysRemaining < 0 ? '#ef4444' : proj.daysRemaining <= 7 ? '#f59e0b' : 'var(--text-muted)' }}>
                        <ChevronRight size={12} />
                        {proj.daysRemaining < 0
                          ? `${Math.abs(proj.daysRemaining)}d overdue`
                          : `${proj.daysRemaining}d left`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>}

      {dashboardMode === 'company' &&
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Executive KPI Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            
            {/* Total Projects */}
            <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>โครงการทั้งหมด (Total Projects)</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{projects.length}</span>
            </div>

            {/* On Schedule */}
            <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ดำเนินงานปกติ (On Schedule)</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{onScheduleProjectsCount}</span>
            </div>

            {/* Overdue */}
            <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #ef4444' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ล่าช้าเกินกำหนด (Overdue)</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{overdueProjectsCount}</span>
            </div>

            {/* Completed */}
            <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ส่งมอบแล้วเสร็จ (Completed)</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{completedProjectsCount}</span>
            </div>

          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Target Achievement SVG gauge */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '340px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>เป้าหมายยอดขายและการเก็บเงิน (Target Achievement)</h3>
              
              <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'space-around', gap: '1rem' }}>
                {/* SVG Double Circular progress rings */}
                <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    {/* Background rings */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="30" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    
                    {/* Outer Billed vs Value Ring */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#3b82f6" 
                      strokeWidth="6" 
                      strokeDasharray={`${totalProjectValue > 0 ? (totalInvoicedValue / totalProjectValue) * 251.2 : 0} 251.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />

                    {/* Inner Collected vs Billed Ring */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="30" 
                      fill="transparent" 
                      stroke="#10b981" 
                      strokeWidth="6" 
                      strokeDasharray={`${totalInvoicedValue > 0 ? (totalCollectedValue / totalInvoicedValue) * 188.4 : 0} 188.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>

                  {/* Centered label */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                      {totalProjectValue > 0 ? Math.round((totalCollectedValue / totalProjectValue) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>เก็บเงินสำเร็จ</span>
                  </div>
                </div>

                {/* Legend list details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa' }} />
                      มูลค่าเป้าหมาย (Value):
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa', marginLeft: '0.8rem' }}>
                      ฿{totalProjectValue.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                      เรียกเก็บเงินแล้ว (Billed):
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6', marginLeft: '0.8rem' }}>
                      ฿{totalInvoicedValue.toLocaleString()} ({totalProjectValue > 0 ? Math.round((totalInvoicedValue / totalProjectValue) * 100) : 0}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      ยอดเก็บเงินจริง (Collected):
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginLeft: '0.8rem' }}>
                      ฿{totalCollectedValue.toLocaleString()} ({totalInvoicedValue > 0 ? Math.round((totalCollectedValue / totalInvoicedValue) * 100) : 0}%)
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Planned vs Actual Cost Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '340px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>เปรียบเทียบค่าใช้จ่ายแผน/จริง (Planned vs Actual Cost)</h3>
              
              <div style={{ flex: 1, width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseChartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis tickFormatter={val => `฿${(val / 1000).toFixed(0)}k`} stroke="var(--text-secondary)" fontSize={11} />
                    <Tooltip formatter={val => [`฿${Number(val).toLocaleString()}`, 'จำนวนเงิน']} contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Bar dataKey="Amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span>ส่วนต่างค่าใช้จ่ายสะสม (Cost Variance):</span>
                <span style={{ fontWeight: 700, color: totalPlannedExpense - totalActualExpense >= 0 ? '#10b981' : '#ef4444' }}>
                  ฿{(totalPlannedExpense - totalActualExpense).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pipeline Stage Stacked Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '340px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>สถานะโครงการติดตั้งติดตั้งรวม (Pipeline Stage Projects)</h3>
              
              <div style={{ flex: 1, width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineChartData} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={9} width={100} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Bar dataKey="จำนวนโครงการ" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Project List Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>ตารางงบประมาณและข้อมูลความคืบหน้าโครงการติดตั้ง</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ชื่อโครงการติดตั้ง</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>สถานะ</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>ความคืบหน้าแผน (%)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>ความคืบหน้าจริง (%)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>ผลต่างความต่าง (%)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>งบประมาณแผน (Planned)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ค่าใช้จ่ายจริง (Actual)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ส่วนต่างสะสม (Variance)</th>
                  </tr>
                </thead>
                <tbody>
                  {constructionProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        ไม่มีโครงการประเภทงานติดตั้ง/ก่อสร้างในระบบ
                      </td>
                    </tr>
                  ) : (
                    constructionProjects.map(proj => {
                      const planned = getPlannedProgress(proj);
                      const actual = getActualProgress(proj.id);
                      const variance = actual - planned;
                      const costVar = (proj.plannedExpense || 0) - (proj.actualExpense || 0);

                      return (
                        <tr key={proj.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>{proj.name}</td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-secondary)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>{proj.status}</span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{planned}%</td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>{actual}%</td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, color: variance >= 0 ? '#10b981' : '#ef4444' }}>
                            {variance > 0 ? `+${variance}` : variance}%
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>฿{(proj.plannedExpense || 0).toLocaleString()}</td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>฿{(proj.actualExpense || 0).toLocaleString()}</td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 700, color: costVar >= 0 ? '#10b981' : '#ef4444' }}>
                            ฿{costVar.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      }
    </div>
  );
};
