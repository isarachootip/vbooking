import { useState } from 'react';
import { Calendar, MapPin, DollarSign, Users, Kanban } from 'lucide-react';
import type { Project, User, Task } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface ProjectBoardProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  users: User[];
  currentUser: User | null;
}

export const ProjectBoard = ({ projects, setProjects, tasks, users, currentUser }: ProjectBoardProps) => {
  const [filterType, setFilterType] = useState<'all' | 'construction' | 'dev' | 'support'>('construction');
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const columns = [
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

  // Map database standard statuses to columns if needed, or fallback
  const getProjectColumn = (project: Project): string => {
    const status = project.status;
    if (columns.includes(status)) return status;
    // Map standard dev/support statuses to pipeline columns
    if (status === 'Planning') return 'ซื้อสำรวจ';
    if (status === 'Active') return 'ดำเนินการโครงการ';
    if (status === 'On Hold') return 'สร้างใบเสนอราคา';
    if (status === 'Completed') return 'ปิดjob';
    return 'ซื้อสำรวจ'; // default fallback
  };

  const filteredProjects = projects.filter(p => {
    // Member check
    const isMember = currentUser?.globalRole === 'Admin' || 
                    currentUser?.globalRole === 'Manager' || 
                    p.members?.some(m => m.userId === currentUser?.id);
    if (!isMember) return false;

    if (filterType === 'all') return true;
    return p.projectType === filterType;
  });

  const handleDragStart = (projectId: string) => {
    setDraggedProjectId(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnName: string) => {
    if (!draggedProjectId) return;

    setProjects(prev => prev.map(p => {
      if (p.id === draggedProjectId) {
        // Map back to standard status if Completed column
        let status = columnName;
        if (columnName === 'ปิดjob') {
          status = 'Completed';
        }
        return { ...p, status };
      }
      return p;
    }));

    setDraggedProjectId(null);
  };

  const getProjectProgress = (projectId: string): number => {
    const projTasks = tasks.filter(t => t.projectId === projectId && !t.parentId);
    if (projTasks.length === 0) return 0;
    const doneTasks = projTasks.filter(t => t.status === 'Done');
    return Math.round((doneTasks.length / projTasks.length) * 100);
  };

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';
  const getUserAvatar = (userId: string) => users.find(u => u.id === userId)?.avatar || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Kanban size={24} color="var(--accent-primary)" /> โปรเจกต์บอร์ด (Project Pipeline Board)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            ย้ายขั้นตอนการดำเนินโครงการติดตั้งและงานก่อสร้างระดับสูง
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {(['construction', 'dev', 'support', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: '0.4rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: filterType === t ? 'var(--accent-primary)' : 'transparent',
                color: filterType === t ? 'white' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {t === 'construction' ? 'Construction 🇹🇭' : t === 'dev' ? 'Development' : t === 'support' ? 'Support' : 'Show All'}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban lanes scroll container */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        flex: 1,
        paddingBottom: '1rem',
        alignItems: 'stretch'
      }}>
        {columns.map(col => {
          const colProjects = filteredProjects.filter(p => getProjectColumn(p) === col);

          return (
            <div
              key={col}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col)}
              style={{
                flex: '0 0 280px',
                background: 'rgba(20, 26, 38, 0.45)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '0.75rem',
                maxHeight: '100%',
                overflow: 'hidden'
              }}
            >
              {/* Header column */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={col}>
                  {col}
                </span>
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-primary)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px'
                }}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards container */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                overflowY: 'auto',
                flex: 1,
                paddingRight: '0.2rem'
              }}>
                {colProjects.length === 0 ? (
                  <div style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    border: '1px dashed rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    ไม่มีโครงการในขั้นนี้
                  </div>
                ) : (
                  colProjects.map(proj => {
                    const progress = getProjectProgress(proj.id);
                    return (
                      <div
                        key={proj.id}
                        draggable
                        onDragStart={() => handleDragStart(proj.id)}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          cursor: 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                          transition: 'transform 0.15s, border-color 0.15s'
                        }}
                        className="hover-lift"
                      >
                        {/* Project name */}
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {proj.name}
                        </div>

                        {/* Description */}
                        {proj.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                            {proj.description}
                          </div>
                        )}

                        {/* Location address */}
                        {proj.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <MapPin size={12} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proj.address}>
                              {proj.address}
                            </span>
                          </div>
                        )}

                        {/* Date schedule */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} style={{ flexShrink: 0 }} />
                          <span>{formatToDDMMYYYY(proj.startDate)} - {proj.endDate ? formatToDDMMYYYY(proj.endDate) : 'Ongoing'}</span>
                        </div>

                        {/* Budget / Financial values */}
                        {proj.projectType === 'construction' && proj.projectValue ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                            <DollarSign size={12} style={{ flexShrink: 0 }} />
                            <span>฿{proj.projectValue.toLocaleString()}</span>
                          </div>
                        ) : proj.budget ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <DollarSign size={12} style={{ flexShrink: 0 }} />
                            <span>${proj.budget.toLocaleString()}</span>
                          </div>
                        ) : null}

                        {/* Progress bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            <span>ความคืบหน้า</span>
                            <span>{progress}%</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #818cf8)', borderRadius: '2px' }} />
                          </div>
                        </div>

                        {/* Team Avatars */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Users size={10} /> {proj.members?.length || 0} ช่างติดตั้ง
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {proj.members?.slice(0, 3).map((m, idx) => (
                              <img
                                key={m.userId}
                                src={getUserAvatar(m.userId) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserName(m.userId)}`}
                                alt={getUserName(m.userId)}
                                title={`${getUserName(m.userId)} (${m.role})`}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: '1px solid var(--bg-secondary)',
                                  marginLeft: idx > 0 ? '-6px' : 0,
                                  zIndex: 10 - idx
                                }}
                              />
                            ))}
                            {proj.members && proj.members.length > 3 && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                +{proj.members.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};
