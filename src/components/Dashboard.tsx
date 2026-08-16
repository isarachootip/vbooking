import { useState } from 'react';
import { 
  Folder, Clock, CheckCircle2, TrendingUp, Calendar, Filter, 
  Users, FileText, AlertTriangle, Bell, FileCode, CheckSquare, MessageSquare, AlertCircle,
  Zap, Wrench, Home, Box, ShieldCheck, List, LayoutGrid, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Project, Task, TimesheetEntry } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatToDDMMYYYY } from '../utils';
import { 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { getWorkflowStagesForType } from '../config/workflows';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  timesheets: TimesheetEntry[];
  currentUser: User;
}

export const Dashboard = ({ projects = [], tasks = [], timesheets = [], currentUser }: DashboardProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [dashboardView, setDashboardView] = useState<'my' | 'company'>('company');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [stageViewMode, setStageViewMode] = useState<'list' | 'grid'>('list');
  const [activeStageFilter, setActiveStageFilter] = useState<number | 'all'>('all');

  // Filter datasets based on view mode (My Tasks vs Company Dashboard)
  const modeFilteredProjects = dashboardView === 'my'
    ? projects.filter(p => p.members?.some(m => m.userId === currentUser?.id) || tasks.some(t => t.projectId === p.id && t.assigneeId === currentUser?.id))
    : projects;

  const modeFilteredTasks = dashboardView === 'my'
    ? tasks.filter(t => t.assigneeId === currentUser?.id)
    : tasks;

  const modeFilteredTimesheets = dashboardView === 'my'
    ? timesheets.filter(ts => ts.userId === currentUser?.id)
    : timesheets;

  // Filter datasets based on selected project type
  const filteredProjects = modeFilteredProjects.filter(p => {
    if (selectedType === 'all') return true;
    const type = (p.projectType || '').toLowerCase().trim();
    if (selectedType === 'quick_service') {
      return type === 'quick' || type === 'quick_service' || type === 'quick service' || p.id.startsWith('PQ');
    }
    if (selectedType === 'installer') {
      return type === 'install' || type === 'installation' || type === 'installer' || type === 'installer service' || p.id.startsWith('PI');
    }
    if (selectedType === 'renovate') {
      return type === 'renovate' || type === 'renovate service' || (!type && !p.id.startsWith('PQ') && !p.id.startsWith('PI') && !p.id.startsWith('PM') && !p.id.startsWith('PB') && !p.id.startsWith('PN'));
    }
    if (selectedType === 'build_in') {
      return type === 'build' || type === 'build_in' || type === 'build-in' || p.id.startsWith('PB');
    }
    if (selectedType === 'new_house') {
      return type === 'new_house' || type === 'new house' || type === 'construction' || p.id.startsWith('PN');
    }
    if (selectedType === 'maintenance') {
      return type === 'ma' || type === 'support' || type === 'maintenance' || type === 'ma service' || p.id.startsWith('PM');
    }
    return true;
  });

  const filteredTasks = modeFilteredTasks.filter(t => {
    if (selectedType === 'all') return true;
    const project = projects.find(p => p.id === t.projectId);
    if (!project) return false;
    const type = (project.projectType || '').toLowerCase().trim();
    if (selectedType === 'quick_service') {
      return type === 'quick' || type === 'quick_service' || type === 'quick service' || project.id.startsWith('PQ');
    }
    if (selectedType === 'installer') {
      return type === 'install' || type === 'installation' || type === 'installer' || type === 'installer service' || project.id.startsWith('PI');
    }
    if (selectedType === 'renovate') {
      return type === 'renovate' || type === 'renovate service' || (!type && !project.id.startsWith('PQ') && !project.id.startsWith('PI') && !project.id.startsWith('PM') && !project.id.startsWith('PB') && !project.id.startsWith('PN'));
    }
    if (selectedType === 'build_in') {
      return type === 'build' || type === 'build_in' || type === 'build-in' || project.id.startsWith('PB');
    }
    if (selectedType === 'new_house') {
      return type === 'new_house' || type === 'new house' || type === 'construction' || project.id.startsWith('PN');
    }
    if (selectedType === 'maintenance') {
      return type === 'ma' || type === 'support' || type === 'maintenance' || type === 'ma service' || project.id.startsWith('PM');
    }
    return true;
  });

  const filteredTimesheets = modeFilteredTimesheets.filter(ts => {
    if (selectedType === 'all') return true;
    const project = projects.find(p => p.id === ts.projectId);
    if (!project) return false;
    const type = (project.projectType || '').toLowerCase().trim();
    if (selectedType === 'quick_service') {
      return type === 'quick' || type === 'quick_service' || type === 'quick service' || project.id.startsWith('PQ');
    }
    if (selectedType === 'installer') {
      return type === 'install' || type === 'installation' || type === 'installer' || type === 'installer service' || project.id.startsWith('PI');
    }
    if (selectedType === 'renovate') {
      return type === 'renovate' || type === 'renovate service' || (!type && !project.id.startsWith('PQ') && !project.id.startsWith('PI') && !project.id.startsWith('PM') && !project.id.startsWith('PB') && !project.id.startsWith('PN'));
    }
    if (selectedType === 'build_in') {
      return type === 'build' || type === 'build_in' || type === 'build-in' || project.id.startsWith('PB');
    }
    if (selectedType === 'new_house') {
      return type === 'new_house' || type === 'new house' || type === 'construction' || project.id.startsWith('PN');
    }
    if (selectedType === 'maintenance') {
      return type === 'ma' || type === 'support' || type === 'maintenance' || type === 'ma service' || project.id.startsWith('PM');
    }
    return true;
  });

  // --- Real Stats Calculations (Strictly calculated from real projects in DB) ---
  const totalProjectsCount = filteredProjects.length;

  // Project Type breakdown distribution for donut chart
  const quickCount = filteredProjects.filter(p => p.projectType === 'quick' || p.projectType === 'quick_service').length;
  const installCount = filteredProjects.filter(p => p.projectType === 'install' || p.projectType === 'installation' || p.projectType === 'installer').length;
  const renovateCount = filteredProjects.filter(p => p.projectType === 'renovate' || !p.projectType).length;
  const newCount = filteredProjects.filter(p => p.projectType === 'new_house' || p.projectType === 'construction').length;
  const buildCount = filteredProjects.filter(p => p.projectType === 'build' || p.projectType === 'build_in').length;
  const maCount = filteredProjects.filter(p => p.projectType === 'ma' || p.projectType === 'support' || p.projectType === 'maintenance').length;

  const pieData = [
    { name: 'Renovate (งานรีโนเวท)', value: renovateCount, color: '#8B0000', percent: totalProjectsCount > 0 ? `${Math.round((renovateCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'New (สร้างบ้านใหม่)', value: newCount, color: '#059669', percent: totalProjectsCount > 0 ? `${Math.round((newCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'Installer (งานติดตั้ง)', value: installCount, color: '#2563eb', percent: totalProjectsCount > 0 ? `${Math.round((installCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'Quick service (งานด่วน)', value: quickCount, color: '#f59e0b', percent: totalProjectsCount > 0 ? `${Math.round((quickCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'Build-in (งานบิวท์อิน)', value: buildCount, color: '#8b5cf6', percent: totalProjectsCount > 0 ? `${Math.round((buildCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'Maintenance (ซ่อมบำรุง MA)', value: maCount, color: '#3b82f6', percent: totalProjectsCount > 0 ? `${Math.round((maCount / totalProjectsCount) * 100)}%` : '0%' }
  ];

  // Stage Progression distribution dynamically matching the standardized workflow stages for each project type
  const stagesDefinition = getWorkflowStagesForType(selectedType);

  const stageStats = stagesDefinition.map(stg => {
    const stgProjects = filteredProjects.filter(p => {
      const pStatus = (p.status || '').trim().toLowerCase();
      return stg.statuses.some(s => s.toLowerCase() === pStatus) || 
             (stg.key === 'To Do' && (pStatus === 'planning' || pStatus === 'draft')) ||
             (stg.key === 'Assign ช่าง' && (pStatus === 'active' || pStatus === 'กำลังดำเนินการ')) ||
             (stg.key === 'Close' && (pStatus === 'completed' || pStatus === 'done'));
    });
    return {
      ...stg,
      total: stgProjects.length,
      projectsList: stgProjects
    };
  });

  // Project value trend & total project value
  const totalProjectValue = filteredProjects.reduce((sum, p) => sum + (Number(p.projectValue) || Number(p.budget) || 0), 0);

  const valueTrendData = (() => {
    if (filteredProjects.length === 0) {
      return [{ date: 'ปัจจุบัน', value: 0 }];
    }
    const sorted = [...filteredProjects].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    let cumulative = 0;
    const mapByDate: Record<string, number> = {};
    sorted.forEach(p => {
      const val = Number(p.projectValue) || Number(p.budget) || 0;
      cumulative += val;
      const d = p.startDate ? formatToDDMMYYYY(p.startDate) : 'เริ่มต้น';
      mapByDate[d] = cumulative;
    });
    const result = Object.entries(mapByDate).map(([date, value]) => ({ date, value }));
    return result.length > 0 ? result : [{ date: 'ปัจจุบัน', value: totalProjectValue }];
  })();

  // Recent Projects list from real data
  const recentProjectsList = [...filteredProjects]
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
    .slice(0, 5)
    .map(p => {
      let stageColor = '#f59e0b';
      if (p.status === 'Active' || p.status === 'In Progress' || p.status === 'กำลังดำเนินการ') stageColor = '#10b981';
      else if (p.status === 'Completed' || p.status === 'Done' || p.status === 'เสร็จสิ้น') stageColor = '#3b82f6';
      else if (p.status === 'Cancelled' || p.status === 'ยกเลิก') stageColor = '#ef4444';
      else if (p.status === 'คุยกับลูกค้า') stageColor = '#8b5cf6';

      return {
        id: p.id,
        customer: p.name,
        stage: p.status || 'Planning',
        stageColor,
        date: p.startDate ? formatToDDMMYYYY(p.startDate) : 'N/A'
      };
    });

  // Today's Tasks breakdown from real tasks
  const todayTasksList = [
    { label: 'นัดหมายเข้าพบลูกค้า', count: filteredTasks.filter(t => t.title.toLowerCase().includes('ลูกค้า') || t.description?.toLowerCase().includes('ลูกค้า') || t.title.toLowerCase().includes('meet')).length, color: '#10b981', icon: Calendar },
    { label: 'สำรวจหน้างาน', count: filteredTasks.filter(t => t.title.toLowerCase().includes('สำรวจ') || t.description?.toLowerCase().includes('สำรวจ') || t.title.toLowerCase().includes('survey') || t.title.toLowerCase().includes('site')).length, color: '#f59e0b', icon: Users },
    { label: 'ส่งแบบ/เสนอราคา', count: filteredTasks.filter(t => t.title.toLowerCase().includes('แบบ') || t.title.toLowerCase().includes('เสนอราคา') || t.title.toLowerCase().includes('design') || t.title.toLowerCase().includes('proposal')).length, color: '#3b82f6', icon: FileText },
    { label: 'คุยกับลูกค้า / งานทั่วไป', count: filteredTasks.filter(t => t.status !== 'Done' && t.status !== 'Completed').length, color: '#8b5cf6', icon: MessageSquare }
  ];

  // Pending Docs breakdown from real tasks & timesheets
  const pendingDocsList = [
    { label: 'ใบประเมินราคา', count: filteredTasks.filter(t => t.status !== 'Done' && (t.title.includes('ประเมิน') || t.title.includes('ราคา'))).length, color: '#ef4444', icon: FileText },
    { label: 'แบบ 3D', count: filteredTasks.filter(t => t.status !== 'Done' && (t.title.includes('3D') || t.title.includes('Design'))).length, color: '#f59e0b', icon: FileCode },
    { label: 'แบบแปลน', count: filteredTasks.filter(t => t.status !== 'Done' && (t.title.includes('แปลน') || t.title.includes('Plan'))).length, color: '#3b82f6', icon: FileText },
    { label: 'BOQ / รายการวัสดุ', count: filteredTasks.filter(t => t.status !== 'Done' && (t.title.includes('BOQ') || t.title.includes('วัสดุ'))).length + filteredTimesheets.filter(ts => ts.status === 'Pending').length, color: '#10b981', icon: CheckSquare }
  ];

  // Team Productivity calculations from real tasks
  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
  const overallRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const salesTasks = filteredTasks.filter(t => t.title.toLowerCase().includes('sales') || t.title.includes('ลูกค้า'));
  const salesRate = salesTasks.length > 0 ? Math.round((salesTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length / salesTasks.length) * 100) : overallRate;

  const designTasks = filteredTasks.filter(t => t.title.toLowerCase().includes('design') || t.title.includes('แบบ'));
  const designRate = designTasks.length > 0 ? Math.round((designTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length / designTasks.length) * 100) : overallRate;

  const qcTasks = filteredTasks.filter(t => t.title.toLowerCase().includes('qc') || t.title.includes('สำรวจ'));
  const qcRate = qcTasks.length > 0 ? Math.round((qcTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length / qcTasks.length) * 100) : overallRate;

  // Real Dynamic Notifications
  const overdueTasks = filteredTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'Done' && t.status !== 'Completed');
  const pendingTsCount = filteredTimesheets.filter(ts => ts.status === 'Pending').length;

  const notificationsList = [];
  if (overdueTasks.length > 0) {
    notificationsList.push({
      id: 'notif-overdue',
      text: `มี ${overdueTasks.length} รายการงานที่เกินกำหนดเวลาการส่งมอบ`,
      time: 'งานเกินกำหนด',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: '#ef4444',
      iconColor: '#ef4444',
      icon: AlertTriangle
    });
  }
  if (pendingTsCount > 0) {
    notificationsList.push({
      id: 'notif-ts',
      text: `มีบันทึกเวลา (Timesheet) ${pendingTsCount} รายการ รอการอนุมัติ`,
      time: 'รออนุมัติ',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: '#f59e0b',
      iconColor: '#f59e0b',
      icon: AlertCircle
    });
  }
  if (totalProjectsCount > 0) {
    notificationsList.push({
      id: 'notif-active',
      text: `โครงการในระบบทั้งหมด ${totalProjectsCount} โครงการ`,
      time: 'ภาพรวมระบบ',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: '#10b981',
      iconColor: '#10b981',
      icon: CheckCircle2
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* ── HEADER BAR ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            {lang === 'th' ? 'ภาพรวมโครงการ' : 'Project Overview'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            {lang === 'th' ? 'สรุปภาพรวมการดำเนินงานและสถานะโครงการทั้งหมด' : 'Executive summary of all active operations and project stages'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Date range display */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>ข้อมูลตามจริงในระบบ</span>
          </div>

          <button className="glass-panel hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            <Filter size={15} /> {lang === 'th' ? 'ตัวกรอง' : 'Filter'}
          </button>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setDashboardView('my')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dashboardView === 'my' ? 'var(--accent-primary)' : 'transparent',
                color: dashboardView === 'my' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Users size={14} /> {lang === 'th' ? 'หน้างานส่วนตัว (My Tasks)' : 'My Tasks'}
            </button>
            <button
              onClick={() => setDashboardView('company')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dashboardView === 'company' ? 'var(--accent-primary)' : 'transparent',
                color: dashboardView === 'company' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <TrendingUp size={14} /> {lang === 'th' ? 'ภาพรวมบริษัท (Company Dashboard)' : 'Company Dashboard'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PROJECT TYPE TABS ── */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          padding: '0.5rem', 
          borderRadius: 'var(--radius-lg)', 
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {[
          { id: 'all', nameTh: 'โครงการทั้งหมด (All)', nameEn: 'All Projects', color: 'var(--accent-primary)', icon: Folder },
          { id: 'quick_service', nameTh: 'Quick service ⚡', nameEn: 'Quick service ⚡', color: '#f59e0b', icon: Zap },
          { id: 'installer', nameTh: 'งานติดตั้ง 🛠️', nameEn: 'Installer Service 🛠️', color: '#2563eb', icon: Wrench },
          { id: 'renovate', nameTh: 'งานรีโนเวท 🏡', nameEn: 'Renovate Service 🏡', color: '#8B0000', icon: Home },
          { id: 'build_in', nameTh: 'งานบิวท์อิน 🛋️', nameEn: 'Build-in 🛋️', color: '#8b5cf6', icon: Box },
          { id: 'new_house', nameTh: 'สร้างบ้านใหม่ 🏠', nameEn: 'New House 🏠', color: '#059669', icon: Home },
          { id: 'maintenance', nameTh: 'ซ่อมบำรุง MA 🔧', nameEn: 'MA Service 🔧', color: '#3b82f6', icon: ShieldCheck }
        ].map(type => {
          const Icon = type.icon;
          const isActive = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="hover-lift"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                border: isActive ? `1px solid ${type.color}` : '1px solid transparent',
                background: isActive ? type.color : 'var(--bg-tertiary)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? `0 4px 12px ${type.color}35` : 'none'
              }}
            >
              <Icon size={15} color={isActive ? 'white' : type.color} />
              <span>{lang === 'th' ? type.nameTh : type.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* ── ROW 1: 5 DYNAMIC KPI SUMMARY CARDS (REAL DATA) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Total */}
        <div className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>โครงการทั้งหมด</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalProjectsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} /> ข้อมูลตามจริง <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ในระบบ</span>
          </div>
        </div>

        {/* Standard Workflow KPI Cards */}
        {[
          { 
            label: 'To Do', 
            icon: FileText, 
            color: '#3b82f6', 
            bg: 'rgba(59, 130, 246, 0.15)', 
            count: filteredProjects.filter(p => ['To Do', 'Todo', 'Planning', 'Draft', 'todo'].some(s => s.toLowerCase() === (p.status || '').toLowerCase())).length 
          },
          { 
            label: 'Survey (สำรวจ)', 
            icon: FileText, 
            color: '#0ea5e9', 
            bg: 'rgba(14, 165, 233, 0.15)', 
            count: filteredProjects.filter(p => ['Buy-Survey', 'Survey', 'ซื้อสำรวจ', 'QC (สำรวจ)'].some(s => s.toLowerCase() === (p.status || '').toLowerCase())).length 
          },
          { 
            label: 'Design & ชำระเงิน', 
            icon: CheckCircle2, 
            color: '#8b5cf6', 
            bg: 'rgba(139, 92, 246, 0.15)', 
            count: filteredProjects.filter(p => ['Design', 'ออกแบบ', 'สร้างใบเสนอราคา', 'ชำระเงิน', 'ลูกค้ายืนยัน'].some(s => s.toLowerCase() === (p.status || '').toLowerCase())).length 
          },
          { 
            label: 'Assign ช่าง & หน้างาน', 
            icon: Clock, 
            color: '#f59e0b', 
            bg: 'rgba(245, 158, 11, 0.15)', 
            count: filteredProjects.filter(p => ['Assign ช่าง', 'Check-in', 'Check-out', 'In Progress', 'Active', 'กำลังดำเนินการ'].some(s => s.toLowerCase() === (p.status || '').toLowerCase())).length 
          },
          { 
            label: 'QC, Aftersale & Close', 
            icon: CheckCircle2, 
            color: '#10b981', 
            bg: 'rgba(16, 185, 129, 0.15)', 
            count: filteredProjects.filter(p => ['QC', 'Aftersale', 'Close', 'Completed', 'Done', 'เสร็จสิ้น'].some(s => s.toLowerCase() === (p.status || '').toLowerCase())).length 
          }
        ].map((stg, i) => (
          <div key={i} className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stg.label}</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: stg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stg.icon size={20} color={stg.color} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stg.color }}>
              {stg.count} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ตามขั้นตอนปัจจุบัน
            </div>
          </div>
        ))}

      </div>

      {/* ── ROW 2: STAGE PROGRESSION GRID / LIST (REAL DATA) ── */}
      <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>สถานะโครงการตามขั้นตอน (Stage Progression)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-primary)', padding: '0.15rem 0.55rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {totalProjectsCount} โครงการ
              </span>
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              ติดตามความคืบหน้ารายโครงการในแต่ละขั้นตอนการทำงานตาม Workflow
            </div>
          </div>

          {/* View Switcher: List View vs Column View */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '3px' }}>
            <button
              onClick={() => setStageViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: stageViewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                color: stageViewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                boxShadow: stageViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={14} />
              <span>มุมมองรายการ (List)</span>
            </button>
            <button
              onClick={() => setStageViewMode('grid')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: stageViewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                color: stageViewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                boxShadow: stageViewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutGrid size={14} />
              <span>มุมมองคอลัมน์ (Columns)</span>
            </button>
          </div>
        </div>

        {/* ── MODE 1: LIST VIEW (Clean Table / Grouped List) ── */}
        {stageViewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Stage Quick Filter Pills */}
            <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.35rem' }} className="custom-scrollbar">
              <button
                onClick={() => setActiveStageFilter('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '20px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeStageFilter === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: activeStageFilter === 'all' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: activeStageFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>ทุกขั้นตอนทั้งหมด</span>
                <span style={{ fontSize: '0.675rem', background: activeStageFilter === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                  {totalProjectsCount}
                </span>
              </button>

              {stageStats.map(stg => {
                const isActive = activeStageFilter === stg.id;
                return (
                  <button
                    key={stg.id}
                    onClick={() => setActiveStageFilter(isActive ? 'all' : stg.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.7rem',
                      borderRadius: '20px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isActive 
                        ? '1px solid var(--accent-primary)' 
                        : (stg.total > 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)'),
                      background: isActive 
                        ? 'var(--accent-primary)' 
                        : (stg.total > 0 ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-tertiary)'),
                      color: isActive ? '#fff' : (stg.total > 0 ? 'var(--text-primary)' : 'var(--text-muted)'),
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>ขั้นที่ {stg.id}: {stg.title}</span>
                    <span 
                      style={{ 
                        fontSize: '0.675rem', 
                        fontWeight: 700,
                        background: isActive ? 'rgba(255,255,255,0.25)' : (stg.total > 0 ? 'var(--accent-primary)' : 'var(--border-color)'), 
                        color: isActive ? '#fff' : (stg.total > 0 ? '#fff' : 'var(--text-muted)'),
                        padding: '0.1rem 0.45rem', 
                        borderRadius: '10px' 
                      }}
                    >
                      {stg.total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List Table of Projects */}
            {totalProjectsCount === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                ไม่มีโครงการในหมวดหมู่นี้
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600 }}>ขั้นตอนปัจจุบัน (Stage)</th>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600 }}>รหัสโครงการ</th>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600 }}>ชื่อโครงการ / ลูกค้า</th>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600 }}>วันที่เริ่ม</th>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600, textAlign: 'right' }}>มูลค่าโครงการ</th>
                      <th style={{ padding: '0.7rem 0.9rem', fontWeight: 600, textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageStats
                      .filter(stg => activeStageFilter === 'all' || activeStageFilter === stg.id)
                      .flatMap(stg => 
                        stg.projectsList.map((proj: any) => (
                          <tr 
                            key={proj.id}
                            onClick={() => navigate(`/projects/${proj.id}`)}
                            className="hover-lift"
                            style={{ 
                              borderBottom: '1px solid var(--border-color)', 
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '0.7rem 0.9rem', whiteSpace: 'nowrap' }}>
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.35rem', 
                                  fontSize: '0.725rem', 
                                  fontWeight: 700, 
                                  color: 'var(--accent-primary)',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                              >
                                <span>ขั้นที่ {stg.id}:</span>
                                <span>{stg.title}</span>
                              </span>
                            </td>
                            <td style={{ padding: '0.7rem 0.9rem', fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                              {proj.id}
                            </td>
                            <td style={{ padding: '0.7rem 0.9rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{proj.name}</div>
                              {proj.client ? (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  ลูกค้า: {proj.client}
                                </div>
                              ) : null}
                            </td>
                            <td style={{ padding: '0.7rem 0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {proj.startDate ? formatToDDMMYYYY(proj.startDate).substring(0, 10) : '-'}
                            </td>
                            <td style={{ padding: '0.7rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                              {proj.projectValue || proj.budget 
                                ? `฿${(Number(proj.projectValue || proj.budget) || 0).toLocaleString('th-TH')}` 
                                : '-'}
                            </td>
                            <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${proj.id}`);
                                }}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  background: 'var(--bg-tertiary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <span>ดูโครงการ</span>
                                <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── MODE 2: COLUMN / BOARD VIEW (Refined Compact Cards) ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {stageStats.map(stg => (
              <div 
                key={stg.id} 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: '0.85rem 0.65rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem', 
                  minHeight: '260px'
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>ขั้นตอนที่ {stg.id}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginTop: '0.15rem' }}>
                    {stg.title}
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.35rem' }}>
                    {stg.total} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-secondary)' }}>โครงการ</span>
                  </div>
                </div>

                {/* List of projects under this stage */}
                <div 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.4rem', 
                    overflowY: 'auto', 
                    flex: 1,
                    maxHeight: '180px',
                    paddingRight: '2px'
                  }}
                  className="custom-scrollbar"
                >
                  {stg.total === 0 ? (
                    <div style={{ margin: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      ไม่มีโครงการ
                    </div>
                  ) : (
                    stg.projectsList.map((proj: any) => (
                      <div 
                        key={proj.id} 
                        className="hover-lift"
                        onClick={() => navigate(`/projects/${proj.id}`)}
                        style={{ 
                          background: 'var(--bg-secondary)', 
                          padding: '0.5rem', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.725rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          <span>ID: {proj.id}</span>
                          <span>{proj.startDate ? formatToDDMMYYYY(proj.startDate).substring(0, 10) : ''}</span>
                        </div>
                        {proj.projectValue || proj.budget ? (
                          <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.675rem', marginTop: '0.2rem', textAlign: 'right' }}>
                            ฿{(Number(proj.projectValue || proj.budget) || 0).toLocaleString('th-TH')}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
          รวมทั้งหมด <span style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{totalProjectsCount}</span> โครงการ
        </div>
      </div>

      {/* ── ROW 3: VALUE TREND & PROJECT TYPE RATIO CHARTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: มูลค่าโครงการ (Value Trend Chart) */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>มูลค่าโครงการ (รวมทุกสถานะ)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem' }}>
              {totalProjectValue.toLocaleString('th-TH')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>บาท</span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, marginTop: '0.15rem' }}>
              ข้อมูลตามจริงในระบบ
            </div>
          </div>

          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valueTrendData}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#valGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: โครงการตามสถานะ (Donut Chart) */}
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            สัดส่วนประเภทโครงการ (Project Type Ratio)
          </h3>

          <div style={{ height: '180px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalProjectsCount}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>โครงการ</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.775rem' }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                  {item.name}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {item.value} ({item.percent})
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── ROW 4: RECENT PROJECTS & TASKS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: โครงการล่าสุด */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              โครงการล่าสุด (Recent Projects)
            </h3>
            <button onClick={() => navigate('/projects')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              ดูทั้งหมด
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {recentProjectsList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ยังไม่มีข้อมูลโครงการในระบบ
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>รหัสโครงการ</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>ชื่อโครงการ</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>ขั้นตอนปัจจุบัน</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>วันที่เริ่มต้น</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjectsList.map(rp => (
                    <tr key={rp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rp.id}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{rp.customer}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: `${rp.stageColor}20`, color: rp.stageColor, fontWeight: 600, fontSize: '0.7rem' }}>
                          {rp.stage}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{rp.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: กิจกรรมวันนี้ & เอกสารที่รอดำเนินการ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* กิจกรรมวันนี้ */}
          <div className="glass-panel" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                กิจกรรมวันนี้ (Today's Tasks)
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>ดูทั้งหมด</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.775rem' }}>
              {todayTasksList.map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ItemIcon size={14} color={item.color} /> {item.label}
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.count} รายการ</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* เอกสารที่รอดำเนินการ */}
          <div className="glass-panel" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                เอกสารที่รอดำเนินการ (Pending Docs)
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }}>ดูทั้งหมด</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.775rem' }}>
              {pendingDocsList.map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ItemIcon size={14} color={item.color} /> {item.label}
                    </span>
                    <strong style={{ color: item.color }}>{item.count} รายการ</strong>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ── ROW 4: TEAM PRODUCTIVITY & ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: ประสิทธิภาพการทำงานของทีม */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            ประสิทธิภาพการทำงานของทีม (Team Productivity)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
            
            {/* Sales */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {salesRate}%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sales</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>อัตรางานเสร็จ</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>ตามข้อมูลจริง</span>
            </div>

            {/* Design */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {designRate}%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Design</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>อัตรางานเสร็จ</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>ตามข้อมูลจริง</span>
            </div>

            {/* QC */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {qcRate}%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>QC</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>อัตรางานเสร็จ</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>ตามข้อมูลจริง</span>
            </div>

            {/* Overall */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {overallRate}%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Overall</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>ประสิทธิผลภาพรวม</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>ตามข้อมูลจริง</span>
            </div>

          </div>
        </div>

        {/* Right: การแจ้งเตือน (Notifications / Alerts Panel) */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} color="#f59e0b" /> การแจ้งเตือน (Notifications)
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }}>ดูทั้งหมด</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.775rem' }}>
            {notificationsList.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                ไม่มีการแจ้งเตือนใหม่ในขณะนี้
              </div>
            ) : (
              notificationsList.map(notif => {
                const NotifIcon = notif.icon;
                return (
                  <div key={notif.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', background: notif.bg, borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${notif.border}` }}>
                    <NotifIcon size={15} color={notif.iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{notif.text}</div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{notif.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
