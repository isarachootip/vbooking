import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Users, Layers, ArrowRight } from 'lucide-react';
import type { Project, User, Task, ProjectStatus, MasterProjectType } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface ProjectBoardProps {
  projects?: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks?: Task[];
  users?: User[];
  currentUser?: User | null;
  masterProjectTypes?: MasterProjectType[];
}

export const ProjectBoard = ({ projects = [], setProjects, tasks = [], users = [], currentUser, masterProjectTypes = [] }: ProjectBoardProps) => {

  const [filterType, setFilterType] = useState<string>('all');
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  // Workflow Columns matching original setup shown in reference screenshot
  const columns = [
    { id: 'ซื้อสำรวจ', title: 'ซื้อสำรวจ' },
    { id: 'QC (สำรวจ)', title: 'QC (สำรวจ)' },
    { id: 'ออกแบบ', title: 'ออกแบบ' },
    { id: 'สร้างใบเสนอราคา', title: 'สร้างใบเสนอราคา' },
    { id: 'ลูกค้ายืนยัน', title: 'ลูกค้ายืนยัน' },
    { id: 'ชำระเงิน', title: 'ชำระเงิน' },
    { id: 'กำลังดำเนินการ', title: 'กำลังดำเนินการ' },
    { id: 'เสร็จสิ้น', title: 'เสร็จสิ้น' }
  ];

  // Map project status to columns cleanly
  const getProjectColumn = (project: Project): string => {
    const status = project.status;
    if (columns.some(c => c.id === status)) return status;
    if (status === 'Planning' || status === 'Draft' || status === 'To Do') return 'ซื้อสำรวจ';
    if (status === 'In Progress' || status === 'Active') return 'กำลังดำเนินการ';
    if (status === 'Completed' || status === 'Done') return 'เสร็จสิ้น';
    return 'ซื้อสำรวจ';
  };

  const filteredProjects = projects.filter(p => {
    const isMember = currentUser?.globalRole === 'Admin' || 
                    currentUser?.globalRole === 'Manager' || 
                    p.members?.some(m => m.userId === currentUser?.id);
    if (!isMember) return false;

    if (filterType === 'all') return true;
    
    // Normalize old construction to new_house/renovate to keep compatibility
    const normalizedType = p.projectType === 'construction' ? 'new_house' : p.projectType;
    return (normalizedType || 'new_house') === filterType;
  });

  const handleDragStart = (projectId: string) => {
    setDraggedProjectId(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (!draggedProjectId || !setProjects) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== draggedProjectId) return p;
      
      let newStatus: ProjectStatus = p.status;
      if (columnId === 'ซื้อสำรวจ') newStatus = 'Planning';
      else if (columnId === 'กำลังดำเนินการ') newStatus = 'Active';
      else if (columnId === 'เสร็จสิ้น') newStatus = 'Completed';
      else newStatus = columnId as ProjectStatus;

      return {
        ...p,
        status: newStatus
      };
    }));
    setDraggedProjectId(null);
  };

  const filterTabs = [
    { id: 'all', label: 'แสดงทั้งหมด' },
    ...masterProjectTypes.filter((t: any) => t.isActive !== false).map((t: any) => ({ id: t.id, label: t.badgeText || t.name }))
  ];

  const getProjectProgress = (projectId: string): number => {
    const projTasks = tasks.filter(t => t.projectId === projectId && !t.parentId);
    if (projTasks.length === 0) return 0;
    const doneTasks = projTasks.filter(t => t.status === 'Done' || t.status === 'Completed');
    return Math.round((doneTasks.length / projTasks.length) * 100);
  };

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unassigned';
  const getUserAvatar = (userId: string) => users.find(u => u.id === userId)?.avatar || '';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* ── KANBAN HEADER ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={26} color="var(--accent-primary)" /> บอร์ดขั้นตอนงานโครงการ (Project Kanban Board)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, marginTop: '0.25rem' }}>
            ย้ายขั้นตอนการดำเนินโครงการติดตั้งและงานก่อสร้างระดับสูง (Drag & Drop Card)
          </p>
        </div>

        {/* Filter Tab controls */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          {filterTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: filterType === t.id ? 'var(--accent-primary)' : 'transparent',
                color: filterType === t.id ? 'white' : 'var(--text-secondary)',
                fontSize: '0.775rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KANBAN LANES CONTAINER ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gridAutoFlow: 'column',
        gridAutoColumns: 'minmax(240px, 1fr)',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        minHeight: '650px',
        alignItems: 'stretch'
      }}>
        {columns.map(col => {
          const colProjects = filteredProjects.filter(p => getProjectColumn(p) === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                marginBottom: '0.75rem',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {col.title}
                </span>
                <span style={{
                  background: colProjects.length > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: colProjects.length > 0 ? 'white' : 'var(--text-muted)',
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '12px'
                }}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards Container */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flex: 1,
                overflowY: 'auto'
              }}>
                {colProjects.length === 0 ? (
                  <div style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: 'var(--bg-tertiary)'
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
                        className="glass-panel hover-lift"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem',
                          cursor: 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {/* Title & Detail Link */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <Link 
                            to={`/projects/${proj.id}`}
                            style={{ 
                              fontWeight: 700, 
                              fontSize: '0.875rem', 
                              color: 'var(--text-primary)', 
                              lineHeight: 1.3,
                              textDecoration: 'none'
                            }}
                            className="hover:underline"
                          >
                            {proj.name}
                          </Link>
                          <Link 
                            to={`/projects/${proj.id}`}
                            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                            title="ดูรายละเอียดโครงการ"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>

                        {/* Location address */}
                        {proj.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={13} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proj.address}>
                              {proj.address}
                            </span>
                          </div>
                        )}

                        {/* Date schedule */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          <Calendar size={13} style={{ flexShrink: 0 }} />
                          <span>{formatToDDMMYYYY(proj.startDate)} - {proj.endDate ? formatToDDMMYYYY(proj.endDate) : 'Ongoing'}</span>
                        </div>

                        {/* Budget / Financial values */}
                        {proj.projectValue ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                            <DollarSign size={13} style={{ flexShrink: 0 }} />
                            <span>฿{Number(proj.projectValue).toLocaleString()}</span>
                          </div>
                        ) : proj.budget ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <DollarSign size={13} style={{ flexShrink: 0 }} />
                            <span>฿{Number(proj.budget).toLocaleString()}</span>
                          </div>
                        ) : null}

                        {/* Progress Bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <span>ความคืบหน้า</span>
                            <span>{progress}%</span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
                          </div>
                        </div>

                        {/* Team Avatars */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.45rem' }}>
                          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                            <Users size={12} /> {proj.members?.length || 0} ช่างติดตั้ง
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {proj.members?.slice(0, 3).map((m, idx) => (
                              <img
                                key={m.userId}
                                src={getUserAvatar(m.userId) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserName(m.userId)}`}
                                alt={getUserName(m.userId)}
                                title={`${getUserName(m.userId)} (${m.role})`}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '1.5px solid var(--bg-tertiary)',
                                  marginLeft: idx > 0 ? '-6px' : 0,
                                  zIndex: 10 - idx,
                                  objectFit: 'cover'
                                }}
                              />
                            ))}
                            {proj.members && proj.members.length > 3 && (
                              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginLeft: '0.25rem', fontWeight: 600 }}>
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
