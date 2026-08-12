import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project, User, MasterProjectType } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface ProjectTimelineProps {
  projects: Project[];
  currentUser: User | null;
  masterProjectTypes?: MasterProjectType[];
}

export const ProjectTimeline = ({ projects, currentUser, masterProjectTypes = [] }: ProjectTimelineProps) => {

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default to July 2026 as in screenshot context
  const [filterType, setFilterType] = useState<string>('all');

  const filteredProjects = projects.filter(p => {
    // Member check
    const isMember = currentUser?.globalRole === 'Admin' || 
                    currentUser?.globalRole === 'Manager' || 
                    p.members?.some(m => m.userId === currentUser?.id);
    if (!isMember) return false;

    // Filter by type
    if (filterType === 'all') return true;
    
    // Normalize old construction to new_house/renovate to keep compatibility
    const normalizedType = p.projectType === 'construction' ? 'new_house' : p.projectType;
    return (normalizedType || 'new_house') === filterType;
  });


  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate days array
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Day names helper
  const getDayName = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    return dayNames[d.getDay()];
  };

  const getDayNameColor = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    const day = d.getDay();
    if (day === 0) return '#dc2626'; // Vibrant Red for Sunday
    if (day === 6) return '#2563eb'; // Vibrant Blue for Saturday
    return 'var(--text-primary)';
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  // Calculate project bar position on timeline
  const getProjectBarLayout = (project: Project) => {
    if (!project.startDate) return null;

    const projStart = new Date(project.startDate);
    const projEnd = project.endDate ? new Date(project.endDate) : new Date(year, month, daysInMonth);

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    // If project is outside this month's range
    if (projEnd < monthStart || projStart > monthEnd) return null;

    // Constrain start and end to this month
    const startDay = projStart < monthStart ? 1 : projStart.getDate();
    const endDay = projEnd > monthEnd ? daysInMonth : projEnd.getDate();

    const span = endDay - startDay + 1;
    return {
      startCol: startDay,
      span: span,
      isStartsBefore: projStart < monthStart,
      isEndsAfter: projEnd > monthEnd
    };
  };

  const getStatusColor = (status: string) => {
    const mapping: Record<string, string> = {
      'ซื้อสำรวจ': '#0284c7',
      'QC (สำรวจ)': '#d97706',
      'ออกแบบ': '#7c3aed',
      'สร้างใบเสนอราคา': '#db2777',
      'ลูกค้ายืนยัน': '#c026d3',
      'ชำระเงิน': '#059669',
      'ดำเนินการโครงการ': '#0d9488',
      'ช่าง check-in/check out siteงาน': '#0891b2',
      'Project complete': '#2563eb',
      'QC (ส่งมอบ)': '#4f46e5',
      'aftersales': '#ea580c',
      'ปิดjob': '#9333ea',
      'Active': '#059669',
      'Planning': '#475569',
      'Completed': '#9333ea',
      'On Hold': '#d97706'
    };
    return mapping[status] || 'var(--accent-primary)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--accent-primary)" /> ปฏิทินไทม์ไลน์โครงการ (Project Calendar Timeline)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            ภาพรวมตารางเวลาและกำหนดการดำเนินโครงการก่อสร้างติดตั้งทั้งหมดรายเดือน
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Project type filter */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'แสดงทั้งหมด' },
              ...masterProjectTypes.filter((t: any) => t.isActive !== false).map((t: any) => ({ id: t.id, label: t.badgeText || t.name }))
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: filterType === t.id ? 'var(--accent-primary)' : 'transparent',
                  color: filterType === t.id ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>


          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.25rem 0.5rem' }}>
            <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }} className="hover-lift">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, minWidth: '120px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {monthLabel}
            </span>
            <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }} className="hover-lift">
              <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Gantt Timeline Board Grid */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        
        {/* Scroll container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'auto',
          overflowY: 'auto',
          flex: 1
        }}>
          
          {/* Table Header Row */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            {/* Left Name Label column */}
            <div style={{
              width: '240px',
              padding: '1rem',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
              borderRight: '1px solid var(--border-color)',
              flexShrink: 0,
              background: 'var(--bg-tertiary)',
              position: 'sticky',
              left: 0,
              zIndex: 10
            }}>
              ชื่อโปรเจกต์ติดตั้ง
            </div>

            {/* Days columns headers */}
            <div style={{ display: 'flex', flexGrow: 1 }}>
              {days.map(d => (
                <div key={d} style={{
                  width: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.4rem 0',
                  borderRight: '1px solid var(--border-color)',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: 600, color: getDayNameColor(d) }}>{getDayName(d)}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getDayNameColor(d), marginTop: '0.1rem' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Body rows */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {filteredProjects.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', width: '100%' }}>
                ไม่มีโครงการในเงื่อนไขการกรองหรือช่วงเวลานี้
              </div>
            ) : (
              filteredProjects.map((proj, idx) => {
                const barLayout = getProjectBarLayout(proj);
                
                return (
                  <div key={proj.id} style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                    alignItems: 'stretch',
                    minHeight: '72px'
                  }}>
                    {/* Left Project Info column */}
                    <div style={{
                      width: '240px',
                      padding: '0.85rem 1rem',
                      borderRight: '1px solid var(--border-color)',
                      flexShrink: 0,
                      background: 'var(--bg-secondary)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '0.2rem'
                    }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={proj.name}>
                        {proj.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          background: `${getStatusColor(proj.status)}25`,
                          color: getStatusColor(proj.status),
                          border: `1px solid ${getStatusColor(proj.status)}40`,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {proj.status}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {(() => {
                            const matchType = masterProjectTypes.find((t: any) => t.id === proj.projectType);
                            return matchType ? matchType.name : (proj.projectType || 'ก่อสร้าง');
                          })()}
                        </span>

                      </div>
                    </div>

                    {/* Timeline bar display area */}
                    <div style={{ display: 'flex', flexGrow: 1, position: 'relative', alignItems: 'center' }}>
                      
                      {/* Grid gridlines for days */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                        {days.map(d => (
                          <div key={d} style={{
                            width: '32px',
                            borderRight: '1px solid var(--border-color)',
                            opacity: 0.5,
                            height: '100%',
                            flexShrink: 0
                          }} />
                        ))}
                      </div>

                      {/* Project horizontal schedule bar */}
                      {barLayout && (
                        <div style={{
                          position: 'absolute',
                          left: `${(barLayout.startCol - 1) * 32 + 4}px`,
                          width: `${barLayout.span * 32 - 8}px`,
                          height: '34px',
                          background: `linear-gradient(135deg, ${getStatusColor(proj.status)}, ${getStatusColor(proj.status)}dd)`,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.5rem',
                          color: '#ffffff',
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                          cursor: 'pointer',
                          zIndex: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${proj.name}\nระยะเวลา: ${formatToDDMMYYYY(proj.startDate)} - ${proj.endDate ? formatToDDMMYYYY(proj.endDate) : 'Ongoing'}\nที่อยู่: ${proj.address || 'ไม่มี'}\nสถานะ: ${proj.status}`}
                        >
                          {/* Fade indicators for start before / end after */}
                          {barLayout.isStartsBefore && (
                            <span style={{ marginRight: '0.2rem', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>◀</span>
                          )}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.name} {proj.address ? `(📍 ${proj.address})` : ''}
                          </span>
                          {barLayout.isEndsAfter && (
                            <span style={{ marginLeft: 'auto', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>▶</span>
                          )}
                        </div>
                      )}

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

