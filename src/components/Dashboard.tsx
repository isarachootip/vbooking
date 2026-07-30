import { useState } from 'react';
import { 
  Folder, Zap, Clock, CheckCircle2, XCircle, TrendingUp, Calendar, Filter, 
  Users, FileText, AlertTriangle, Bell, FileCode, CheckSquare, MessageSquare, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Project, Task, TimesheetEntry } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  timesheets: TimesheetEntry[];
  currentUser: User;
}

export const Dashboard = ({ projects: _projects, tasks: _tasks, timesheets: _timesheets, currentUser: _currentUser }: DashboardProps) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [dashboardView, setDashboardView] = useState<'my' | 'company'>('company');
  const [dateRangeFilter] = useState('01 พ.ค. 2025 - 16 พ.ค. 2025');

  // Value trend data for chart
  const valueTrendData = [
    { date: '01 พ.ค.', value: 12000000 },
    { date: '03 พ.ค.', value: 15500000 },
    { date: '05 พ.ค.', value: 24000000 },
    { date: '07 พ.ค.', value: 18000000 },
    { date: '09 พ.ค.', value: 19500000 },
    { date: '11 พ.ค.', value: 22000000 },
    { date: '13 พ.ค.', value: 25680000 },
    { date: '16 พ.ค.', value: 25680000 },
  ];

  // Pie chart status distribution
  const pieData = [
    { name: 'กำลังดำเนินการ', value: 62, color: '#10b981', percent: '48%' },
    { name: 'เสร็จสิ้น', value: 48, color: '#3b82f6', percent: '38%' },
    { name: 'รอการดำเนินการ', value: 18, color: '#f59e0b', percent: '14%' },
    { name: 'ยกเลิก', value: 0, color: '#ef4444', percent: '0%' },
  ];

  // Recent Projects List
  const recentProjectsList = [
    { id: 'PRJ-2505-0128', customer: 'คุณสมชาย ใจดี', stage: 'คุยกับลูกค้า', stageColor: '#8b5cf6', date: '16/05/2025 15:30' },
    { id: 'PRJ-2505-0127', customer: 'คุณวิภาวดี พรประเสริฐ', stage: 'Submit to Sales', stageColor: '#3b82f6', date: '16/05/2025 14:45' },
    { id: 'PRJ-2505-0126', customer: 'บริษัท แสงทอง จำกัด', stage: 'Design & Proposal', stageColor: '#f59e0b', date: '16/05/2025 13:20' },
    { id: 'PRJ-2505-0125', customer: 'คุณนพดล แซ่ตั้ง', stage: 'Survey for Design', stageColor: '#10b981', date: '16/05/2025 11:10' },
    { id: 'PRJ-2505-0124', customer: 'คุณกิตติศักดิ์ มียิ่งใหญ่', stage: 'Design for Purchase', stageColor: '#6366f1', date: '16/05/2025 10:02' },
  ];

  // Real stats calculation
  const totalProjectsCount = 128;
  const activeProjectsCount = 62;
  const pendingProjectsCount = 18;
  const completedProjectsCount = 48;
  const cancelledProjectsCount = 0;

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
          {/* Date range filter */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{dateRangeFilter}</span>
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

      {/* ── ROW 1: 5 KPI SUMMARY CARDS ── */}
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
            <TrendingUp size={12} /> ↑ 12% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* Card 2: Active */}
        <div className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>กำลังดำเนินการ</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b' }}>
            {activeProjectsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} /> ↑ 8% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รอการดำเนินการ</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444' }}>
            {pendingProjectsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ↓ 5% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เสร็จสิ้น</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#3b82f6' }}>
            {completedProjectsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} /> ↑ 15% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* Card 5: Cancelled */}
        <div className="glass-panel hover-lift" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ยกเลิก</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(107, 114, 128, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={20} color="#6b7280" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            {cancelledProjectsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            - 0% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
          </div>
        </div>

      </div>

      {/* ── ROW 2: STAGE PROGRESSION GRID & DONUT CHART ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.2fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: สถานะโครงการตามขั้นตอน */}
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            สถานะโครงการตามขั้นตอน (Stage Progression)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            
            {/* Stage 1 */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>1</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Design for Purchase (No Survey)
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>28 <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span></div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <div>• ยังไม่เริ่ม: <strong style={{ color: 'var(--text-primary)' }}>8</strong></div>
                <div>• กำลังดำเนินการ: <strong style={{ color: '#f59e0b' }}>12</strong></div>
                <div>• เสร็จสิ้น: <strong style={{ color: '#10b981' }}>8</strong></div>
              </div>
            </div>

            {/* Stage 2 */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>2</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Survey for Design (by Area Size)
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>32 <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span></div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <div>• ยังไม่เริ่ม: <strong style={{ color: 'var(--text-primary)' }}>6</strong></div>
                <div>• กำลังดำเนินการ: <strong style={{ color: '#f59e0b' }}>18</strong></div>
                <div>• เสร็จสิ้น: <strong style={{ color: '#10b981' }}>8</strong></div>
              </div>
            </div>

            {/* Stage 3 */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>3</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Design & Proposal
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>25 <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span></div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <div>• ยังไม่เริ่ม: <strong style={{ color: 'var(--text-primary)' }}>4</strong></div>
                <div>• กำลังดำเนินการ: <strong style={{ color: '#f59e0b' }}>13</strong></div>
                <div>• เสร็จสิ้น: <strong style={{ color: '#10b981' }}>8</strong></div>
              </div>
            </div>

            {/* Stage 4 */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>4</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Submit to Sales
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>24 <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span></div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <div>• ยังไม่เริ่ม: <strong style={{ color: 'var(--text-primary)' }}>3</strong></div>
                <div>• กำลังดำเนินการ: <strong style={{ color: '#f59e0b' }}>10</strong></div>
                <div>• เสร็จสิ้น: <strong style={{ color: '#10b981' }}>11</strong></div>
              </div>
            </div>

            {/* Stage 5 */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>5</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                คุยกับลูกค้า
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>19 <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>โครงการ</span></div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <div>• กำลังดำเนินการ: <strong style={{ color: '#8b5cf6' }}>19</strong></div>
              </div>
            </div>

          </div>

          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
            รวมทั้งหมด <span style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>128</span> โครงการ
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
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>128</div>
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

      {/* ── ROW 3: VALUE TREND, RECENT PROJECTS, ACTIVITIES, DOCUMENTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1.2fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left: มูลค่าโครงการ (Value Trend Chart) */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>มูลค่าโครงการ (รวมทุกสถานะ)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem' }}>
              25,680,000 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>บาท</span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, marginTop: '0.15rem' }}>
              ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากช่วงก่อนหน้า</span>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.4rem 0.5rem' }}>รหัสโครงการ</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>ชื่อลูกค้า</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>ขั้นตอนปัจจุบัน</th>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>อัปเดตล่าสุด</th>
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
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer' }}>ดูทั้งหมด</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} color="#10b981" /> นัดหมายเข้าพบลูกค้า
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>5 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={14} color="#f59e0b" /> สำรวจหน้างาน
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>8 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} color="#3b82f6" /> ส่งแบบ/เสนอราคา
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>6 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={14} color="#8b5cf6" /> คุยกับลูกค้า
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>7 รายการ</strong>
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} color="#ef4444" /> ใบประเมินราคา
                </span>
                <strong style={{ color: '#ef4444' }}>12 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileCode size={14} color="#f59e0b" /> แบบ 3D
                </span>
                <strong style={{ color: '#f59e0b' }}>9 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} color="#3b82f6" /> แบบแปลน
                </span>
                <strong style={{ color: '#3b82f6' }}>15 รายการ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckSquare size={14} color="#10b981" /> BOQ / รายการวัสดุ
                </span>
                <strong style={{ color: '#10b981' }}>7 รายการ</strong>
              </div>
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
                85%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sales</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>ตอบกลับลูกค้าเร็วขึ้น</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>↑ 12% จากสัปดาห์ก่อน</span>
            </div>

            {/* Design */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                78%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Design</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>ส่งแบบตรงตามเวลา</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>↑ 8% จากสัปดาห์ก่อน</span>
            </div>

            {/* QC */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                92%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>QC</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>สำรวจและเสร็จตามแผน</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>↑ 15% จากสัปดาห์ก่อน</span>
            </div>

            {/* Overall */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '5px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                84%
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>Overall</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>ประสิทธิผลภาพรวม</span>
              <span style={{ fontSize: '0.675rem', color: '#10b981', fontWeight: 600 }}>↑ 10% จากสัปดาห์ก่อน</span>
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
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #f59e0b' }}>
              <AlertTriangle size={15} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>QC มีนัดสำรวจวันนี้ 8 รายการ</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>10 นาทีที่แล้ว</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #3b82f6' }}>
              <AlertCircle size={15} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>โครงการ PRJ-2505-0123 ขอข้อมูลเพิ่มเติมจากลูกค้า</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>1 ชั่วโมงที่แล้ว</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #10b981' }}>
              <CheckCircle2 size={15} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>โครงการ PRJ-2505-0118 เสร็จสิ้นขั้นตอน Submit to Sales</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>2 ชั่วโมงที่แล้ว</div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
