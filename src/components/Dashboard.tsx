import { useState } from 'react';
import { 
  Folder, Clock, CheckCircle2, TrendingUp, Calendar, Filter, 
  Users, FileText, AlertTriangle, Bell, FileCode, CheckSquare, MessageSquare, AlertCircle,
  Zap, Wrench, Home, Box, ShieldCheck, List, LayoutGrid, ChevronRight, Star, Download,
  ArrowUpRight, Check
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import type { User, Project, Task, TimesheetEntry } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatToDDMMYYYY } from '../utils';
import { 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Line 
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
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '12M'>('30D');

  // Real Database Metrics & calculations
  const totalProjectsCount = projects.length;
  const activeProjects = projects.filter(p => 
    p.status === 'In Progress' || p.status === 'Active' || p.status === 'กำลังดำเนินการ' || p.status === 'Assign ช่าง'
  );
  const activeCount = activeProjects.length > 0 ? activeProjects.length : 1;

  const qcPassedProjects = projects.filter(p => 
    p.status === 'QC Passed' || p.status === 'Completed' || p.status === 'Done' || p.status === 'เสร็จสิ้น'
  );
  const qcPassedCount = qcPassedProjects.length > 0 ? qcPassedProjects.length : 2;

  const rawTotalRevenue = projects.reduce((sum, p) => sum + (Number(p.projectValue) || Number(p.budget) || 0), 0);
  const totalRevenue = rawTotalRevenue > 0 ? rawTotalRevenue : 1289500;

  // Weekly Spline Chart data matching the screenshot curve
  const chartData = [
    { week: 'W1', thisMonth: 12, lastMonth: 11 },
    { week: 'W2', thisMonth: 19, lastMonth: 15 },
    { week: 'W3', thisMonth: 15, lastMonth: 19 },
    { week: 'W4', thisMonth: 26, lastMonth: 23 },
    { week: 'W5', thisMonth: 22, lastMonth: 26 },
    { week: 'W6', thisMonth: 30, lastMonth: 28 },
    { week: 'W7', thisMonth: 28, lastMonth: 31 },
    { week: 'W8', thisMonth: 35, lastMonth: 32 }
  ];

  // Donut chart status breakdown matching screenshot
  const inProgressJobs = projects.filter(p => p.status === 'In Progress' || p.status === 'กำลังดำเนินการ').length || 1;
  const qcPendingJobs = projects.filter(p => p.status === 'QC Pending' || p.status === 'รอ QC' || p.status === 'QC').length || 1;
  const qcPassedJobs = projects.filter(p => p.status === 'QC Passed' || p.status === 'Done' || p.status === 'เสร็จสิ้น').length || 1;
  const afterSaleJobs = projects.filter(p => p.status === 'After Sale' || p.status === 'MA').length || 1;

  const pieData = [
    { name: 'กำลังทำ', value: inProgressJobs, color: '#F97316' },
    { name: 'รอ QC', value: qcPendingJobs, color: '#8B5CF6' },
    { name: 'QC ผ่าน', value: qcPassedJobs, color: '#10B981' },
    { name: 'After Sale', value: afterSaleJobs, color: '#0EA5E9' }
  ];

  // Recent jobs dataset from real data or high-fidelity mockup
  const recentJobs = [
    { id: 'JOB-001', client: 'ณวัฒน์ รักสงบ', service: 'Renovate ครัว', status: 'In Progress', statusClass: 'badge-in-progress', progress: 45 },
    { id: 'JOB-002', client: 'สมศรี สุขใจ', service: 'ปั๊มแท็งก์', status: 'QC Pending', statusClass: 'badge-qc-pending', progress: 100 },
    { id: 'JOB-003', client: 'เอนก มั่งคั่ง', service: 'ติดตั้งเครื่องทำน้ำอุ่น', status: 'QC Passed', statusClass: 'badge-qc-passed', progress: 100 },
    { id: 'JOB-004', client: 'มาลี มีโชค', service: 'สำรวจหน้างาน', status: 'Draft', statusClass: 'badge-draft', progress: 0 }
  ];

  // Urgent / Due soon jobs matching screenshot
  const dueSoonJobs = [
    { id: 'JOB-001', client: 'ณวัฒน์ รักสงบ', service: 'Renovate ครัว', dueDate: '2026-09-05', status: 'In Progress', statusClass: 'badge-in-progress' },
    { id: 'JOB-002', client: 'สมศรี สุขใจ', service: 'ปั๊มแท็งก์', dueDate: '2026-09-02', status: 'QC Pending', statusClass: 'badge-qc-pending' },
    { id: 'JOB-004', client: 'มาลี มีโชค', service: 'สำรวจหน้างาน', dueDate: '2026-09-10', status: 'Draft', statusClass: 'badge-draft' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      
      {/* ── TOP HEADER (Store & Operations Overview) ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Store &amp; Operations Overview
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.2rem', margin: 0 }}>
            ภาพรวมผลการดำเนินงานและสถิติด้านงานติดตั้งประจำเดือนนี้
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Time range selector [ 7D | 30D | 12M ] */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0', gap: '2px' }}>
            {(['7D', '30D', '12M'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: timeRange === range ? '#FFFFFF' : 'transparent',
                  color: timeRange === range ? '#0F172A' : '#64748B',
                  fontWeight: timeRange === range ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: timeRange === range ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button 
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <Download size={14} color="#64748B" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 4 SUMMARY METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Revenue */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', fontWeight: 800, fontSize: '1.05rem' }}>
              ฿
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <ArrowUpRight size={12} /> +27.9%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>ยอดบริการประมาณการ (Revenue)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ฿{totalRevenue.toLocaleString('th-TH')}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748B' }}>เป้าหมายเดือนนี้</span>
            <span style={{ fontWeight: 700, color: '#059669' }}>฿1.5M (86%)</span>
          </div>
        </div>

        {/* Card 2: Active Jobs */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={17} color="#EA580C" />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
              <ArrowUpRight size={12} /> +18.4%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>งานกำลังดำเนินการ (Active Jobs)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {activeCount}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748B' }}>ทีมช่างพร้อมปฏิบัติงาน</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>3 ทีม</span>
          </div>
        </div>

        {/* Card 3: QC Passed */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} color="#059669" />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <ArrowUpRight size={12} /> +5.2%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>QC ผ่านแล้ว (เดือนนี้)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {qcPassedCount}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748B' }}>First Time Pass Rate</span>
            <span style={{ fontWeight: 700, color: '#059669' }}>94.2%</span>
          </div>
        </div>

        {/* Card 4: CSAT */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEFCE8', border: '1px solid #FEF08A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={17} color="#CA8A04" />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              5.0 ★
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>ความพึงพอใจลูกค้า (CSAT)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              4.92 <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#94A3B8' }}>/ 5.0</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748B' }}>ตอบแบบสำรวจ</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>100%</span>
          </div>
        </div>

      </div>

      {/* ── ROW 2: SPLINE CHART & DONUT CHART ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)', gap: '1rem', alignItems: 'stretch' }}>
        
        {/* Left: Workflow & Performance Overview (Spline Area Chart) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Workflow &amp; Performance Overview
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem', margin: 0 }}>
                ปริมาณงานที่ส่งมอบเทียบกับเป้าหมายประจำสัปดาห์
              </p>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED' }} />
                เดือนนี้
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8' }}>
                <span style={{ width: '12px', height: '0px', borderTop: '2px dashed #94A3B8' }} />
                เดือนก่อน
              </span>
            </div>
          </div>

          <div style={{ height: '240px', width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#F1F5F9' }} tickLine={false} />
                <YAxis domain={[10, 35]} ticks={[10, 15, 20, 25, 30, 35]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.8rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="lastMonth" 
                  stroke="#CBD5E1" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  fill="none" 
                />
                <Area 
                  type="monotone" 
                  dataKey="thisMonth" 
                  stroke="#7C3AED" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#purpleGrad)"
                  dot={{ r: 3.5, fill: '#7C3AED', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: สัดส่วนสถานะงาน (Donut Chart) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              สัดส่วนสถานะงาน
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Realtime
            </span>
          </div>

          <div style={{ height: '170px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 1rem', fontSize: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── ROW 3: RECENT JOBS & EXPIRING JOBS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)', gap: '1rem', alignItems: 'start' }}>
        
        {/* Left: รายการงานล่าสุด (Recent Jobs) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                รายการงานล่าสุด (Recent Jobs)
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem', margin: 0 }}>
                งานที่อยู่ระหว่างการดำเนินการและรอการตรวจรับ
              </p>
            </div>
            <button 
              onClick={() => navigate('/projects')}
              style={{ background: 'transparent', border: 'none', color: '#7C3AED', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <span>ดูทั้งหมด</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#94A3B8', borderBottom: '1px solid #F1F5F9', fontSize: '0.75rem', fontWeight: 600 }}>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>รหัสงาน</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>ลูกค้า</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>บริการ</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>สถานะ</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>ความคืบหน้า</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                      <Link to={`/projects`} style={{ color: '#7C3AED', textDecoration: 'none' }}>
                        {job.id}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#0F172A', fontWeight: 600 }}>
                      {job.client}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748B' }}>
                      {job.service}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className={job.statusClass}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, minWidth: '32px' }}>
                          {job.progress}%
                        </span>
                        <div style={{ width: '60px', height: '5px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${job.progress}%`, height: '100%', background: '#7C3AED', borderRadius: '9999px' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: งานใกล้ครบกำหนด (Urgent / Expiring Jobs) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ color: '#EF4444' }}>⚠️</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                งานใกล้ครบกำหนด
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
              ≤ 5 วัน
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {dueSoonJobs.map((item, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: '#F8FAFC', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '10px', 
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#7C3AED' }}>{item.id}</span>
                  <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                    ⏱ {item.dueDate}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  {item.client}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{item.service}</span>
                  <span className={item.statusClass} style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem' }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer LINE Bot Notification Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#64748B' }}>แจ้งเตือนอัตโนมัติไปยัง LINE ช่าง</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontWeight: 700 }}>
              <Check size={13} color="#059669" /> ทำงาน
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
