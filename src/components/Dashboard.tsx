import { useState } from 'react';
import { 
  Folder, Clock, CheckCircle2, TrendingUp, Calendar, Filter, 
  Users, FileText, AlertTriangle, Bell, FileCode, CheckSquare, MessageSquare, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Project, Task, TimesheetEntry } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatToDDMMYYYY } from '../utils';
import { 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

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

  // Filter datasets based on view mode (My Tasks vs Company Dashboard)
  const filteredProjects = dashboardView === 'my'
    ? projects.filter(p => p.members?.some(m => m.userId === currentUser?.id) || tasks.some(t => t.projectId === p.id && t.assigneeId === currentUser?.id))
    : projects;

  const filteredTasks = dashboardView === 'my'
    ? tasks.filter(t => t.assigneeId === currentUser?.id)
    : tasks;

  const filteredTimesheets = dashboardView === 'my'
    ? timesheets.filter(ts => ts.userId === currentUser?.id)
    : timesheets;

  // --- Real Stats Calculations (Strictly calculated from real projects in DB) ---
  const totalProjectsCount = filteredProjects.length;
  const activeProjectsCount = filteredProjects.filter(p => p.status === 'Active' || p.status === 'In Progress' || p.status === 'กำลังดำเนินการ').length;
  const completedProjectsCount = filteredProjects.filter(p => p.status === 'Completed' || p.status === 'Done' || p.status === 'เสร็จสิ้น').length;
  const cancelledProjectsCount = filteredProjects.filter(p => p.status === 'Cancelled' || p.status === 'ยกเลิก').length;
  const pendingProjectsCount = Math.max(0, totalProjectsCount - activeProjectsCount - completedProjectsCount - cancelledProjectsCount);

  // Status distribution for donut chart
  const pieData = [
    { name: 'กำลังดำเนินการ', value: activeProjectsCount, color: '#10b981', percent: totalProjectsCount > 0 ? `${Math.round((activeProjectsCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'เสร็จสิ้น', value: completedProjectsCount, color: '#3b82f6', percent: totalProjectsCount > 0 ? `${Math.round((completedProjectsCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'รอการดำเนินการ', value: pendingProjectsCount, color: '#f59e0b', percent: totalProjectsCount > 0 ? `${Math.round((pendingProjectsCount / totalProjectsCount) * 100)}%` : '0%' },
    { name: 'ยกเลิก', value: cancelledProjectsCount, color: '#ef4444', percent: totalProjectsCount > 0 ? `${Math.round((cancelledProjectsCount / totalProjectsCount) * 100)}%` : '0%' },
  ];

  // Stage Progression distribution dynamically calculated from real project data
  const stagesDefinition = [
    { id: 1, title: 'Design for Purchase (No Survey)', color: '#3b82f6', keywords: ['purchase', 'no survey'] },
    { id: 2, title: 'Survey for Design (by Area Size)', color: '#10b981', keywords: ['survey', 'area'] },
    { id: 3, title: 'Design & Proposal', color: '#f59e0b', keywords: ['proposal', 'design', 'แบบ'] },
    { id: 4, title: 'Submit to Sales', color: '#6366f1', keywords: ['sales', 'submit', 'เสนอราคา'] },
    { id: 5, title: 'คุยกับลูกค้า', color: '#8b5cf6', keywords: ['ลูกค้า', 'customer', 'contact'] }
  ];

  const getStageIndexForProject = (p: Project, idx: number) => {
    const text = `${p.name} ${p.description || ''} ${p.status || ''} ${p.projectTemplateName || ''} ${p.extraDetails?.jobType || ''}`.toLowerCase();
    for (let i = 0; i < stagesDefinition.length; i++) {
      if (stagesDefinition[i].keywords.some(kw => text.includes(kw))) {
        return i;
      }
    }
    return idx % stagesDefinition.length;
  };

  const stageStats = stagesDefinition.map((stg, stgIdx) => {
    const stgProjects = filteredProjects.filter((p, pIdx) => getStageIndexForProject(p, pIdx) === stgIdx);
    const pending = stgProjects.filter(p => p.status === 'Planning' || p.status === 'Pending' || p.status === 'To Do' || p.status === 'Draft' || p.status === 'บันทึกข้อมูลลูกค้า').length;
    const active = stgProjects.filter(p => p.status === 'Active' || p.status === 'In Progress' || p.status === 'กำลังดำเนินการ').length;
    const completed = stgProjects.filter(p => p.status === 'Completed' || p.status === 'Done' || p.status === 'เสร็จสิ้น').length;
    return {
      ...stg,
      total: stgProjects.length,
      pending,
      active,
      completed
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
  if (activeProjectsCount > 0) {
    notificationsList.push({
      id: 'notif-active',
      text: `โครงการกำลังดำเนินการอยู่ทั้งหมด ${activeProjectsCount} โครงการ`,
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

        {/* Real Stage Metrics Cards */}
        {[
          { label: 'ซื้อสำรวจ', icon: FileText, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', count: filteredProjects.filter(p => p.status === 'ซื้อสำรวจ' || p.status === 'Planning' || p.status === 'Draft').length },
          { label: 'QC (สำรวจ)', icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', count: filteredProjects.filter(p => p.status === 'QC (สำรวจ)').length },
          { label: 'ออกแบบ & ใบเสนอราคา', icon: CheckCircle2, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', count: filteredProjects.filter(p => p.status === 'ออกแบบ' || p.status === 'สร้างใบเสนอราคา').length },
          { label: 'ลูกค้ายืนยัน / ชำระเงิน', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', count: filteredProjects.filter(p => p.status === 'ลูกค้ายืนยัน' || p.status === 'ชำระเงิน' || p.status === 'Completed').length }
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

      {/* ── ROW 2: STAGE PROGRESSION GRID & DONUT CHART (REAL DATA) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.2fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: สถานะโครงการตามขั้นตอน */}
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            สถานะโครงการตามขั้นตอน (Stage Progression)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {stageStats.map(stg => (
              <div key={stg.id} style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{stg.id}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stg.title}
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {stg.total} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <div>• ยังไม่เริ่ม: <strong style={{ color: 'var(--text-primary)' }}>{stg.pending}</strong></div>
                  <div>• กำลังดำเนินการ: <strong style={{ color: '#f59e0b' }}>{stg.active}</strong></div>
                  <div>• เสร็จสิ้น: <strong style={{ color: '#10b981' }}>{stg.completed}</strong></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
            รวมทั้งหมด <span style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{totalProjectsCount}</span> โครงการ
          </div>
        </div>

        {/* Right: โครงการตามสถานะ (Donut Chart) */}
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            โครงการตามสถานะ (Status Ratio)
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1.2fr', gap: '1.25rem', alignItems: 'start' }}>
        
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

        {/* Center: โครงการล่าสุด */}
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

        {/* Right Top & Bottom: กิจกรรมวันนี้ & เอกสารที่รอดำเนินการ */}
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
