import React, { useState, useEffect } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, TrendingUp, Filter, RefreshCw,
  Search, ShieldAlert, Zap, ArrowRight, Activity, ChevronRight,
  Layers, Check, Eye, HelpCircle, Flame, Target
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, Cell
} from 'recharts';

interface StageMetric {
  step: number;
  id: string;
  name: string;
  phase: string;
  targetSlaDays: number;
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  activeCount: number;
  completedCount: number;
  slaBreachRate: number;
  sampleCount: number;
  health: 'normal' | 'warning' | 'bottleneck';
  color: string;
}

interface PipelineSummary {
  totalPipelinesAnalyzed: number;
  avgTotalCycleDays: number;
  totalTargetSlaDays: number;
  slaComplianceRate: number;
  fastestStage: { step: number; name: string; avgDays: number };
  slowestStage: { step: number; name: string; avgDays: number };
  activeBottleneck: { step: number; name: string; avgDays: number; breachRate: number };
}

interface JobTypeStat {
  jobType: string;
  count: number;
  avgDays: number;
  breachRate: number;
}

interface ProjectTrace {
  id: string;
  projectId: string | null;
  customerName: string;
  phone: string;
  jobType: string;
  branch: string;
  status: string;
  currentStep: number;
  currentStepName: string;
  createdAt: string;
  totalDurationDays: number;
  stepDurations: Record<string, number | null>;
  isSlaBreached: boolean;
}

interface PipelinePerformanceDashboardProps {
  currentUser: any;
}

export const PipelinePerformanceDashboard: React.FC<PipelinePerformanceDashboardProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [stages, setStages] = useState<StageMetric[]>([]);
  const [jobTypeStats, setJobTypeStats] = useState<JobTypeStat[]>([]);
  const [traces, setTraces] = useState<ProjectTrace[]>([]);
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedJobType, setSelectedJobType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<ProjectTrace | null>(null);
  const [activePhaseFilter, setActivePhaseFilter] = useState<'ALL' | 'Pre-Construction' | 'Construction' | 'Completion'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.append('branch', selectedBranch);
      if (selectedJobType !== 'all') params.append('jobType', selectedJobType);

      const res = await fetch(`/api/dashboard/pipeline-performance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setStages(data.stagePerformance || []);
        setJobTypeStats(data.jobTypeStats || []);
        setTraces(data.recentTraces || []);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch, selectedJobType]);

  const filteredStages = stages.filter(s => {
    if (activePhaseFilter === 'ALL') return true;
    return s.phase === activePhaseFilter;
  });

  const filteredTraces = traces.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.projectId && t.projectId.toLowerCase().includes(q)) ||
      (t.jobType && t.jobType.toLowerCase().includes(q))
    );
  });

  const chartData = stages.map(s => ({
    name: `Step ${s.step}`,
    fullName: s.name,
    'เวลาจริงเฉลี่ย (วัน)': s.avgDays,
    'เกณฑ์เป้าหมาย SLA (วัน)': s.targetSlaDays,
    health: s.health
  }));

  if (loading && !summary) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={36} style={{ margin: '0 auto 1rem auto', color: 'var(--accent-primary)' }} />
        <h3>กำลังประมวลผลประวัติการทำงานและประสิทธิภาพ 12 ขั้นตอน...</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ─── 1. Header & Filters ─── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={24} color="#3b82f6" /> 
            12-Step Pipeline Cycle Time & Performance Monitor
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            วิเคราะห์ระยะเวลาการทำงานจริงในแต่ละขั้นตอน (Lead Time) จากฐานข้อมูลประวัติการทำงาน เพื่อตรวจหาจุดคอขวดและควบคุม SLA
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedJobType}
            onChange={(e) => setSelectedJobType(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">ทุกประเภทงาน (All Types)</option>
            <option value="Renovation">งานรีโนเวท (Renovation)</option>
            <option value="Built-in">งานบิลท์อิน (Built-in)</option>
            <option value="Quick Service">งานบริการด่วน (Quick Service)</option>
            <option value="Installer">งานติดตั้งระบบ (Installer)</option>
            <option value="MA Service">งานบำรุงรักษา (MA)</option>
          </select>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">ทุกสาขา / Zone (All Branches)</option>
            <option value="HQ0">HQ - สำนักงานใหญ่</option>
            <option value="BKK">BKK - สาขากรุงเทพฯ</option>
            <option value="NTH">NTH - สาขาภาคเหนือ</option>
            <option value="EST">EST - สาขาภาคตะวันออก</option>
          </select>

          <button
            onClick={fetchData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <RefreshCw size={15} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* ─── 2. Top Summary KPI Cards ─── */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>เวลารวมเฉลี่ยทั้งสายงาน</span>
              <Activity size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {summary.avgTotalCycleDays} <span style={{ fontSize: '1rem', fontWeight: 500 }}>วัน</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              เป้าหมายรวม SLA: <strong>{summary.totalTargetSlaDays} วัน</strong>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>อัตราทำงานทันตาม SLA</span>
              <Target size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: summary.slaComplianceRate >= 80 ? '#10b981' : '#f59e0b', marginTop: '0.35rem' }}>
              {summary.slaComplianceRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 600 }}>
              {stages.filter(s => s.health === 'normal').length} จาก 12 ขั้นตอนผ่านเกณฑ์
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>จุดคอขวดหลัก (Bottleneck)</span>
              <Flame size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary.activeBottleneck.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              เฉลี่ย <strong>{summary.activeBottleneck.avgDays} วัน</strong> (เกินเกณฑ์ {summary.activeBottleneck.breachRate}%)
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>ขั้นตอนที่เร็วที่สุด</span>
              <Zap size={16} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary.fastestStage.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              ใช้เวลาเพียง <strong>{summary.fastestStage.avgDays} วัน</strong>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Phase Filter Tabs ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'ALL', label: 'ทั้งหมด (12 ขั้นตอน)' },
          { key: 'Pre-Construction', label: '1. Pre-Construction (Step 1-4)' },
          { key: 'Construction', label: '2. Construction & Prep (Step 5-8)' },
          { key: 'Completion', label: '3. Completion & Handover (Step 9-12)' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActivePhaseFilter(tab.key as any)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activePhaseFilter === tab.key ? 'var(--accent-primary)' : 'transparent',
              color: activePhaseFilter === tab.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 4. Horizontal 12-Step Flow Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {filteredStages.map(st => {
          const isBottleneck = st.health === 'bottleneck';
          const isWarning = st.health === 'warning';
          const statusBg = isBottleneck ? 'rgba(239, 68, 68, 0.1)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)';
          const statusBorder = isBottleneck ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
          const statusText = isBottleneck ? 'คอขวด (Bottleneck)' : isWarning ? 'ใกล้เกินเกณฑ์' : 'ตรงตามเกณฑ์ (On Track)';

          return (
            <div
              key={st.id}
              className="glass-panel"
              style={{
                padding: '1rem',
                borderTop: `4px solid ${statusBorder}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {st.phase}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: statusBg, color: statusBorder, fontWeight: 700 }}>
                    {statusText}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                  {st.name}
                </h4>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>เวลาจริงเฉลี่ย:</span>
                  <span style={{ fontWeight: 800, color: statusBorder }}>{st.avgDays} วัน</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>เกณฑ์ SLA:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.targetSlaDays} วัน</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ช่วงเวลาต่ำสุด - สูงสุด:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{st.minDays} - {st.maxDays} วัน</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <span>กำลังค้างอยู่: <strong style={{ color: 'var(--text-primary)' }}>{st.activeCount}</strong> รายการ</span>
                <span>ผ่านแล้ว: <strong style={{ color: '#10b981' }}>{st.completedCount}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 5. Visual Charts Section ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#3b82f6" /> การเปรียบเทียบระยะเวลาจริง vs เกณฑ์เป้าหมาย SLA (รายขั้นตอน)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                แท่งสีแดงบ่งบอกถึงขั้นตอนที่เป็นคอขวด (เกินเกณฑ์ SLA มากกว่า 35%)
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis unit=" วัน" stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} วัน`,
                    name === 'เวลาจริงเฉลี่ย (วัน)' ? `${item.payload.fullName} (จริง)` : name
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="เวลาจริงเฉลี่ย (วัน)" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.health === 'bottleneck' ? '#ef4444' : entry.health === 'warning' ? '#f59e0b' : '#3b82f6'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="เกณฑ์เป้าหมาย SLA (วัน)" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── 6. Project-by-Project Pipeline Timeline Drilldown Table ─── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#8b5cf6" /> ตารางติดตามความคืบหน้ารายโครงการ (Pipeline Trace & Drilldown)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              ตรวจสอบเส้นเวลาจริงของแต่ละ Lead และโครงการ เพื่อดูว่าใช้เวลากี่วันในแต่ละขั้นตอน
            </p>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, รหัส Lead, โครงการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>รหัส / ลูกค้า</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>ประเภทงาน</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>สาขา</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>ขั้นตอนปัจจุบัน</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>เวลารวมสะสม</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>สถานะ SLA</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>ตรวจรายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraces.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredTraces.map((trace) => {
                  return (
                    <tr
                      key={trace.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trace.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {trace.id} {trace.projectId ? `• โครงการ: ${trace.projectId}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-secondary)', fontSize: '0.75rem' }}>
                          {trace.jobType}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {trace.branch}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Step {trace.currentStep}:</span>
                          <span>{trace.currentStepName.split('. ')[1] || trace.currentStepName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {trace.totalDurationDays} วัน
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {trace.isSlaBreached ? (
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertTriangle size={12} /> เกินเกณฑ์ SLA
                          </span>
                        ) : (
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={12} /> ปกติ
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTrace(trace)}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={13} /> ดูไทม์ไลน์
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 7. Trace Detail Modal ─── */}
      {selectedTrace && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setSelectedTrace(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ลำดับเวลา 12 ขั้นตอน: {selectedTrace.customerName}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  รหัส Lead: {selectedTrace.id} {selectedTrace.projectId ? `| รหัสโครงการ: ${selectedTrace.projectId}` : ''} | เวลารวม: {selectedTrace.totalDurationDays} วัน
                </p>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stages.map((st) => {
                const duration = selectedTrace.stepDurations[st.id];
                const isCurrent = selectedTrace.currentStep === st.step;
                const isPassed = selectedTrace.currentStep > st.step || (duration !== null && duration !== undefined);
                const isBreached = duration !== null && duration > st.targetSlaDays;

                return (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: isCurrent ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                      border: isCurrent ? '1.5px solid #3b82f6' : '1px solid var(--border-color)'
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: isPassed ? '#10b981' : isCurrent ? '#3b82f6' : 'var(--bg-tertiary)',
                        color: isPassed || isCurrent ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {isPassed ? '✓' : st.step}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {st.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        เกณฑ์ SLA: {st.targetSlaDays} วัน
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {duration !== null && duration !== undefined ? (
                        <div>
                          <span style={{ fontWeight: 800, color: isBreached ? '#ef4444' : '#10b981', fontSize: '0.9rem' }}>
                            {duration} วัน
                          </span>
                          {isBreached && (
                            <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                              เกิน SLA (+{(duration - st.targetSlaDays).toFixed(1)} วัน)
                            </div>
                          )}
                        </div>
                      ) : isCurrent ? (
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                          กำลังดำเนินการ
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          ยังไม่ถึง
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
