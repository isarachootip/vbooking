import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Kanban, Users, AlertTriangle, CheckCircle2, 
  TrendingUp, Folder, Wrench, Sparkles, AlertCircle
} from 'lucide-react';
import type { Project, User, Task } from '../types';

interface ProjectBoardProps {
  projects?: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks?: Task[];
  users?: User[];
  currentUser?: User | null;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = () => {
  const [viewMode, setViewMode] = useState<'team' | 'kanban'>('team');
  const [selectedOverdueTeam, setSelectedOverdueTeam] = useState<string>('all');


  // Teams configuration
  const teamsData = [
    { id: 'sale', code: 'SA', name: 'Sale Team', desc: 'ฝ่ายขาย', color: '#10b981', total: 42, active: 18, pending: 12, done: 11, cancelled: 1, within7Days: 7, overdue: 2 },
    { id: 'design', code: 'DE', name: 'Design Team', desc: 'ออกแบบ', color: '#2563eb', total: 28, active: 14, pending: 6, done: 8, cancelled: 0, within7Days: 5, overdue: 1 },
    { id: 'qc', code: 'QC', name: 'QC Team', desc: 'ตรวจสอบ', color: '#7c3aed', total: 32, active: 20, pending: 5, done: 7, cancelled: 0, within7Days: 6, overdue: 0 },
    { id: 'install', code: 'IN', name: 'Installation Team', desc: 'ติดตั้ง', color: '#f59e0b', total: 18, active: 15, pending: 2, done: 1, cancelled: 0, within7Days: 8, overdue: 1 },
    { id: 'aftersale', code: 'AS', name: 'After Sales Team', desc: 'บริการหลังการขาย', color: '#0891b2', total: 8, active: 4, pending: 2, done: 2, cancelled: 0, within7Days: 2, overdue: 0 }
  ];

  // Overdue Due Date Items Data
  const overdueItems = [
    { id: 'Job #0004', title: 'Renovate Joy cafe', sub: 'Shop drawing', teamId: 'design', teamName: 'Design HO', iconBg: '#10b981', dueDate: '15/7/69', daysOver: '30 วัน' },
    { id: 'Job #0012', title: 'Renovate บ้านคุณสมชาย', sub: 'Shop drawing', teamId: 'design', teamName: 'Design HO', iconBg: '#10b981', dueDate: '12/7/69', daysOver: '27 วัน' },
    { id: 'Job #0028', title: 'Renovate Office ชั้น 5', sub: 'QC Check ระบบ', teamId: 'qc', teamName: 'QC Renovate', iconBg: '#7c3aed', dueDate: '14/7/69', daysOver: '25 วัน' },
    { id: 'Job #0031', title: 'เรือนรับรอง คุณวิชัย', sub: 'QC Check หน้างาน', teamId: 'qc', teamName: 'QC Renovate', iconBg: '#7c3aed', dueDate: '10/7/69', daysOver: '29 วัน' },
    { id: 'Job #0042', title: 'Renovate คอนโด สุขุมวิท', sub: 'นัดเข้าทำงาน', teamId: 'install', teamName: 'ทีม ช่าง / Site', iconBg: '#f59e0b', dueDate: '11/7/69', daysOver: '28 วัน' },
    { id: 'Job #0048', title: 'ปรับปรุงร้านค้า Lotus', sub: 'ยืนยันใบเสนอราคา', teamId: 'sale', teamName: 'Sale', iconBg: '#2563eb', dueDate: '13/7/69', daysOver: '26 วัน' }
  ];

  const filteredOverdueItems = selectedOverdueTeam === 'all' 
    ? overdueItems 
    : overdueItems.filter(item => item.teamId === selectedOverdueTeam);

  // Default Kanban stages
  const kanbanColumns = [
    { id: 'sale_inquiry', label: 'SALE', subLabel: 'New Inquiry', color: '#64748b' },
    { id: 'design_drawing', label: 'DESIGN HO', subLabel: 'Design & Drawing', color: '#9f1239' },
    { id: 'qc_renovate', label: 'QC RENOVATE', subLabel: '', color: '#d97706' },
    { id: 'qc_ce', label: 'QC CE', subLabel: '', color: '#881337' },
    { id: 'chang', label: 'Chang', subLabel: '', color: '#475569' },
    { id: 'gm_approval', label: 'GM Approval', subLabel: '', color: '#b45309' },
    { id: 'done', label: 'Done', subLabel: '', color: '#047857' }
  ];

  // Pipeline sample cards
  const kanbanCards: Record<string, Array<{ id: string; name: string; status: string; statusBadge: string; createDate: string; dueDate: string; tag: string; tagBg: string }>> = {
    sale_inquiry: [
      { id: 'Job #0007', name: 'ห้องน้ำคุณสมหญิง', status: 'Status: Pending', statusBadge: 'New Inquiry', createDate: '20/7/69 (7 D)', dueDate: '30/8/69', tag: 'New Inquiry', tagBg: '#f59e0b' },
      { id: 'Job #0008', name: 'คอนโดคุณเนาวรัตน์', status: 'Status: New Inquiry', statusBadge: 'Inquiry', createDate: '22/7/69 (5 D)', dueDate: '22/8/69', tag: 'Inquiry', tagBg: '#64748b' }
    ],
    design_drawing: [
      { id: 'Job #0004', name: 'Renovate Joy cafe', status: 'Status: Shop drawing', statusBadge: 'Design', createDate: '15/5/69 (30 D)', dueDate: '15/7/69 (Overdue)', tag: 'Design', tagBg: '#be123c' },
      { id: 'Job #0006', name: 'บ้านคุณอำนาจ', status: 'Status: In Design', statusBadge: 'Design', createDate: '10/7/69 (17 D)', dueDate: '31/7/69', tag: 'Design', tagBg: '#be123c' }
    ],
    qc_renovate: [
      { id: 'Job #0005', name: 'ครัวคุณสมหมาย', status: 'Status: รอสำรวจ', statusBadge: 'Renovate', createDate: '1/7/69 (97 D)', dueDate: '1/8/69', tag: 'Renovate', tagBg: '#d97706' },
      { id: 'Job #0003', name: 'ร้านกาแฟ The One', status: 'Status: QC Check', statusBadge: 'Renovate D 10', createDate: '16/7/69 (9 D)', dueDate: '28/7/69', tag: 'Renovate D 10', tagBg: '#d97706' }
    ],
    qc_ce: [
      { id: 'Job #0002', name: 'โรงงานสมพงษ์', status: 'Status: CE Review', statusBadge: 'CE Review', createDate: '1/7/69 (27 D)', dueDate: '31/7/69', tag: 'CE Review', tagBg: '#881337' }
    ],
    chang: [
      { id: 'Job #2024-08B', name: 'Type 2: Survey for Design', status: 'Status: Survey for Design', statusBadge: 'Chang', createDate: '21/7/69 (6 D)', dueDate: '30/7/69', tag: 'Chang', tagBg: '#475569' }
    ],
    gm_approval: [
      { id: 'Job #0007', name: 'ห้องน้ำคุณสมหญิง', status: 'Status: Awaiting Approval', statusBadge: 'Approval', createDate: '20/7/69 (7 D)', dueDate: '30/6/69', tag: 'Approval', tagBg: '#b45309' }
    ],
    done: [
      { id: 'Job #0001', name: 'ลานจอดรถคุณสมชาย', status: 'Status: ส่งมอบงานเรียบร้อย', statusBadge: 'House Complete', createDate: '30/7/69', dueDate: 'House Complete', tag: 'House Complete', tagBg: '#047857' },
      { id: 'Job #0009', name: 'ออฟฟิศ AIS', status: 'Status: Close Project', statusBadge: 'House Complete', createDate: '15/7/69', dueDate: 'House Complete', tag: 'House Complete', tagBg: '#047857' }
    ]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      
      {/* ── HEADER BANNER & VIEW SWITCHER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Kanban size={24} color="var(--accent-primary)" />
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              PROJECT BOARD (แยกตามทีม)
            </h1>

          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>
            ภาพรวมโครงการทั้งหมด แยกตามทีมที่รับผิดชอบและติดตามสถานะงานเกินกำหนด (Overdue)
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setViewMode('team')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: viewMode === 'team' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'team' ? 'white' : 'var(--text-secondary)',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            📊 มุมมองแยกตามทีม (Executive Board)
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: viewMode === 'kanban' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'kanban' ? 'white' : 'var(--text-secondary)',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            📋 มุมมองขั้นตอน (Kanban Pipeline)
          </button>
        </div>
      </div>

      {/* ── TOP 6 METRIC CARDS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: ทั้งหมด */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ทั้งหมด</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Folder size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>128</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 12% จากเดือนก่อนหน้า
          </span>
        </div>

        {/* Card 2: Sale Team */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sale Team</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>42</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 15% จากเดือนก่อนหน้า
          </span>
        </div>

        {/* Card 3: Design Team */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Design Team</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>28</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 8% จากเดือนก่อนหน้า
          </span>
        </div>

        {/* Card 4: QC Team */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>QC Team</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>32</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 5% จากเดือนก่อนหน้า
          </span>
        </div>

        {/* Card 5: Chang / ช่าง */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chang / ช่าง</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Wrench size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>18</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 20% จากเดือนก่อนหน้า
          </span>
        </div>

        {/* Card 6: Done */}
        <div className="glass-panel hover-lift" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Done</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>8</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={13} /> ↑ 10% จากเดือนก่อนหน้า
          </span>
        </div>

      </div>

      {/* ── MIDDLE TABLE: SUMMARY BREAKDOWN BY TEAM ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>ทีม</th>
              <th style={{ padding: '0.75rem 0.75rem' }}>รับผิดชอบ</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>ทั้งหมด</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>กำลังดำเนินการ</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>รอดำเนินการ</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>เสร็จสิ้น</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>ยกเลิก</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#f59e0b' }}>ภายใน 7 วัน</th>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', color: '#ef4444' }}>เกินกำหนด 🚨</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {teamsData.map(team => (
              <tr key={team.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-lift">
                {/* Team Badge & Name */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: team.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.725rem' }}>
                      {team.code}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{team.name}</span>
                  </div>
                </td>

                <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                  {team.desc}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {team.total}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                  {team.active}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>
                  {team.pending}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                  {team.done}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>
                  {team.cancelled}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                  {team.within7Days}
                </td>

                <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, color: team.overdue > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                  {team.overdue}
                </td>

                <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                  <button 
                    onClick={() => setSelectedOverdueTeam(team.id)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    className="hover-lift"
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── BOTTOM MAIN SPLIT SECTION ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* ── LEFT: KANBAN PIPELINE BOARD ("Dashboard") ── */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Kanban size={20} color="var(--accent-primary)" /> Dashboard (สถานะงานตามขั้นตอน)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ลากการ์ดเพื่อย้ายขั้นตอน</span>
          </div>

          {/* Horizontal Scrollable Stage Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(210px, 1fr))', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {kanbanColumns.map(col => {
              const cards = kanbanCards[col.id] || [];
              return (
                <div 
                  key={col.id}
                  style={{ 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: '8px', 
                    padding: '0.75rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem',
                    minHeight: '400px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {/* Column Header */}
                  <div style={{ background: col.color, color: 'white', padding: '0.5rem 0.6rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{col.label}</div>
                    {col.subLabel && <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>{col.subLabel}</div>}
                  </div>

                  {/* Cards inside column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {cards.map(card => (
                      <Link 
                        key={card.id}
                        to={`/projects/PRJ-2505-0001`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div 
                          className="hover-lift"
                          style={{ 
                            background: card.dueDate.includes('Overdue') ? '#450a0a' : 'var(--bg-secondary)', 
                            border: card.dueDate.includes('Overdue') ? '1px solid #ef4444' : '1px solid var(--border-color)', 
                            borderRadius: '6px', 
                            padding: '0.65rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>{card.id}</span>
                          </div>

                          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {card.name}
                          </div>

                          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                            {card.status}
                          </div>

                          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                            Create: {card.createDate}
                          </div>

                          <div style={{ fontSize: '0.675rem', color: card.dueDate.includes('Overdue') ? '#ef4444' : 'var(--text-muted)', fontWeight: card.dueDate.includes('Overdue') ? 700 : 400 }}>
                            Due Date: {card.dueDate}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
                            <span style={{ background: card.tagBg, color: 'white', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700 }}>
                              {card.tag}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: OVERDUE DUE DATE URGENT ALERT BOX ── */}
        <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          
          {/* Header Banner Red Alert */}
          <div style={{ background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>งานที่เลย Due Date</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>งานที่เกินกำหนด แยกตามทีมรับผิดชอบ</div>
              </div>
            </div>
            <span style={{ background: 'white', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.725rem', fontWeight: 800 }}>
              ทั้งหมด 6 งาน
            </span>
          </div>

          {/* Team Filter Tabs Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'sale', label: '👤 ทีม Sale (1)' },
              { id: 'design', label: '🖥️ ทีม Design HO (2)' },
              { id: 'qc', label: '🏢 ทีม QC (2)' },
              { id: 'install', label: '👷 ทีม ช่าง/Site (1)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedOverdueTeam(tab.id)}
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: selectedOverdueTeam === tab.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: selectedOverdueTeam === tab.id ? 'white' : 'var(--text-primary)',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overdue Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredOverdueItems.map(item => (
              <div key={item.id} style={{ background: 'var(--bg-tertiary)', padding: '0.65rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span style={{ color: '#f59e0b', marginRight: '0.35rem' }}>{item.id}</span>
                    {item.title}
                  </div>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                    {item.sub}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                  <span style={{ background: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                    Overdue
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 800 }}>
                    เลย {item.daysOver}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Alert Footer Warning */}
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.6rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ef4444', fontSize: '0.725rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <AlertCircle size={14} /> กรุณาติดตามและเร่งดำเนินการเพื่อป้องกันผลกระทบ
            </span>
            <Link to="/tasks" style={{ color: '#ef4444', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              ดูทั้งหมด &gt;
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};
