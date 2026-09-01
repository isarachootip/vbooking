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

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date()); // Default to Current Month
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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonthNow = () => {
    const now = new Date();
    return currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
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

  const getStatusTheme = (status: string) => {
    const mapping: Record<string, { bg: string; border: string; text: string; badgeBg: string }> = {
      'To Do': {
        bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(59, 130, 246, 0.12))',
        border: 'rgba(59, 130, 246, 0.45)',
        text: '#1e40af',
        badgeBg: 'rgba(59, 130, 246, 0.14)'
      },
      'In Progress': {
        bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0.12))',
        border: 'rgba(6, 182, 212, 0.45)',
        text: '#0e7490',
        badgeBg: 'rgba(6, 182, 212, 0.14)'
      },
      'ซื้อสำรวจ': {
        bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(14, 165, 233, 0.12))',
        border: 'rgba(14, 165, 233, 0.45)',
        text: '#0369a1',
        badgeBg: 'rgba(14, 165, 233, 0.14)'
      },
      'QC (สำรวจ)': {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(245, 158, 11, 0.12))',
        border: 'rgba(245, 158, 11, 0.45)',
        text: '#b45309',
        badgeBg: 'rgba(245, 158, 11, 0.14)'
      },
      'ออกแบบ': {
        bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(139, 92, 246, 0.12))',
        border: 'rgba(139, 92, 246, 0.45)',
        text: '#6d28d9',
        badgeBg: 'rgba(139, 92, 246, 0.14)'
      },
      'สร้างใบเสนอราคา': {
        bg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.22), rgba(236, 72, 153, 0.12))',
        border: 'rgba(236, 72, 153, 0.45)',
        text: '#be185d',
        badgeBg: 'rgba(236, 72, 153, 0.14)'
      },
      'ลูกค้ายืนยัน': {
        bg: 'linear-gradient(135deg, rgba(217, 70, 239, 0.22), rgba(217, 70, 239, 0.12))',
        border: 'rgba(217, 70, 239, 0.45)',
        text: '#a21caf',
        badgeBg: 'rgba(217, 70, 239, 0.14)'
      },
      'ชำระเงิน': {
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.12))',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#047857',
        badgeBg: 'rgba(16, 185, 129, 0.14)'
      },
      'ดำเนินการโครงการ': {
        bg: 'linear-gradient(135deg, rgba(20, 184, 166, 0.22), rgba(20, 184, 166, 0.12))',
        border: 'rgba(20, 184, 166, 0.45)',
        text: '#0f766e',
        badgeBg: 'rgba(20, 184, 166, 0.14)'
      },
      'ช่าง check-in/check out siteงาน': {
        bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0.12))',
        border: 'rgba(6, 182, 212, 0.45)',
        text: '#0e7490',
        badgeBg: 'rgba(6, 182, 212, 0.14)'
      },
      'Project complete': {
        bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.12))',
        border: 'rgba(34, 197, 94, 0.45)',
        text: '#15803d',
        badgeBg: 'rgba(34, 197, 94, 0.14)'
      },
      'QC (ส่งมอบ)': {
        bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0.12))',
        border: 'rgba(99, 102, 241, 0.45)',
        text: '#4338ca',
        badgeBg: 'rgba(99, 102, 241, 0.14)'
      },
      'aftersales': {
        bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.22), rgba(249, 115, 22, 0.12))',
        border: 'rgba(249, 115, 22, 0.45)',
        text: '#c2410c',
        badgeBg: 'rgba(249, 115, 22, 0.14)'
      },
      'ปิดjob': {
        bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(168, 85, 247, 0.12))',
        border: 'rgba(168, 85, 247, 0.45)',
        text: '#7e22ce',
        badgeBg: 'rgba(168, 85, 247, 0.14)'
      },
      'Active': {
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.12))',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#047857',
        badgeBg: 'rgba(16, 185, 129, 0.14)'
      },
      'Planning': {
        bg: 'linear-gradient(135deg, rgba(100, 116, 139, 0.22), rgba(100, 116, 139, 0.12))',
        border: 'rgba(100, 116, 139, 0.45)',
        text: '#334155',
        badgeBg: 'rgba(100, 116, 139, 0.14)'
      },
      'Completed': {
        bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.12))',
        border: 'rgba(34, 197, 94, 0.45)',
        text: '#15803d',
        badgeBg: 'rgba(34, 197, 94, 0.14)'
      },
      'Close': {
        bg: 'linear-gradient(135deg, rgba(100, 116, 139, 0.22), rgba(100, 116, 139, 0.12))',
        border: 'rgba(100, 116, 139, 0.45)',
        text: '#334155',
        badgeBg: 'rgba(100, 116, 139, 0.14)'
      },
      'On Hold': {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(245, 158, 11, 0.12))',
        border: 'rgba(245, 158, 11, 0.45)',
        text: '#b45309',
        badgeBg: 'rgba(245, 158, 11, 0.14)'
      }
    };
    return mapping[status] || {
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(59, 130, 246, 0.12))',
      border: 'rgba(59, 130, 246, 0.45)',
      text: '#1e40af',
      badgeBg: 'rgba(59, 130, 246, 0.14)'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8B0000' }}>
            <Calendar size={26} color="#8B0000" /> ปฏิทินไทม์ไลน์โครงการ (Project Calendar Timeline)
          </h1>
          <p style={{ color: '#000000', fontSize: '0.9rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>
            ภาพรวมตารางเวลาและกำหนดการดำเนินโครงการก่อสร้างติดตั้งทั้งหมดรายเดือน
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Project type filter */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'แสดงทั้งหมด' },
              ...masterProjectTypes.filter((t: any) => t.isActive !== false).map((t: any) => ({ id: t.id, label: t.badgeText || t.name }))
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  border: filterType === t.id ? '1.5px solid #700000' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: filterType === t.id ? '#8B0000' : 'var(--bg-tertiary)',
                  color: filterType === t.id ? '#ffffff' : '#000000',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: filterType === t.id ? '0 2px 8px rgba(139,0,0,0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>


          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '8px', padding: '0.3rem 0.6rem' }}>
            <button onClick={prevMonth} title="เดือนก่อนหน้า" style={{ background: 'transparent', border: 'none', color: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '4px' }} className="hover-lift">
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, minWidth: '130px', textAlign: 'center', color: '#000000' }}>
              {monthLabel}
            </span>
            <button onClick={nextMonth} title="เดือนถัดไป" style={{ background: 'transparent', border: 'none', color: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '4px' }} className="hover-lift">
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={goToToday}
              style={{
                marginLeft: '0.35rem',
                padding: '0.3rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: isCurrentMonthNow() ? '1.5px solid #8B0000' : '1.5px solid var(--border-color)',
                background: isCurrentMonthNow() ? 'rgba(139, 0, 0, 0.12)' : 'var(--bg-tertiary)',
                color: isCurrentMonthNow() ? '#8B0000' : '#000000',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              className="hover-lift"
              title="กลับไปที่เดือนปัจจุบัน"
            >
              เดือนปัจจุบัน
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
              width: '320px',
              padding: '1rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: '#000000',
              borderRight: '1.5px solid var(--border-color)',
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
                  flexShrink: 0,
                  background: 'var(--bg-tertiary)'
                }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: getDayNameColor(d) }}>{getDayName(d)}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: getDayNameColor(d), marginTop: '0.1rem' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Body rows */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {filteredProjects.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#000000', fontWeight: 700, width: '100%' }}>
                ไม่มีโครงการในเงื่อนไขการกรองหรือช่วงเวลานี้
              </div>
            ) : (
              filteredProjects.map((proj, idx) => {
                const barLayout = getProjectBarLayout(proj);
                const statusTheme = getStatusTheme(proj.status);
                
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
                      width: '320px',
                      padding: '0.85rem 1rem',
                      borderRight: '1.5px solid var(--border-color)',
                      flexShrink: 0,
                      background: 'var(--bg-secondary)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.88rem', 
                        fontWeight: 800, 
                        color: '#000000', 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        lineHeight: '1.3',
                        wordBreak: 'break-word'
                      }} title={proj.name}>
                        {proj.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: statusTheme.badgeBg,
                          color: statusTheme.text,
                          border: `1px solid ${statusTheme.border}`,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          fontWeight: 800
                        }}>
                          {proj.status}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#000000', fontWeight: 700 }}>
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
                            opacity: 0.6,
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
                          width: `${Math.max(barLayout.span * 32 - 8, 32)}px`,
                          height: '36px',
                          background: statusTheme.bg,
                          border: `1.5px solid ${statusTheme.border}`,
                          borderRadius: '8px',
                          backdropFilter: 'blur(6px)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.65rem',
                          color: statusTheme.text,
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                          cursor: 'pointer',
                          zIndex: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                        title={`${proj.name}\nระยะเวลา: ${formatToDDMMYYYY(proj.startDate)} - ${proj.endDate ? formatToDDMMYYYY(proj.endDate) : 'Ongoing'}\nที่อยู่: ${proj.address || 'ไม่มี'}\nสถานะ: ${proj.status}`}
                        >
                          {/* Fade indicators for start before / end after */}
                          {barLayout.isStartsBefore && (
                            <span style={{ marginRight: '0.3rem', fontWeight: 800, fontSize: '0.75rem', opacity: 0.85 }}>◀</span>
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.name} {proj.address ? `(📍 ${proj.address})` : ''}
                          </span>
                          {barLayout.isEndsAfter && (
                            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '0.75rem', opacity: 0.85 }}>▶</span>
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

