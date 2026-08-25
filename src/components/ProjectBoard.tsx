import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, MapPin, DollarSign, Users, Layers, ArrowRight, Tag, 
  Clock, UserCheck, CheckCircle2, X, AlertCircle, Sparkles, Edit3, 
  CalendarDays, Check, ShieldAlert, Coffee, Building2, Phone, MessageSquare, Star
} from 'lucide-react';
import type { Project, User, Task, ProjectStatus, MasterProjectType } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { getWorkflowColumnsForType, STAGE_CONFIG, mapStatusToColumn } from '../config/workflows';

interface ProjectBoardProps {
  projects?: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks?: Task[];
  users?: User[];
  currentUser?: User | null;
  masterProjectTypes?: MasterProjectType[];
}

// ── Standard Survey Time Slots ──
const STANDARD_SURVEY_SLOTS = [
  { id: 'slot_morning', label: '09:00 - 12:00 (ช่วงเช้า)', shortLabel: '09:00-12:00 (เช้า)', period: 'เช้า' },
  { id: 'slot_afternoon1', label: '13:00 - 15:00 (ช่วงบ่าย 1)', shortLabel: '13:00-15:00 (บ่าย 1)', period: 'บ่าย' },
  { id: 'slot_afternoon2', label: '15:00 - 17:00 (ช่วงบ่าย 2)', shortLabel: '15:00-17:00 (บ่าย 2)', period: 'บ่าย' }
];

export const ProjectBoard = ({ projects = [], setProjects, tasks = [], users = [], currentUser, masterProjectTypes = [] }: ProjectBoardProps) => {

  const [filterType, setFilterType] = useState<string>('all');
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  // State for Buy-Survey Dialog Modal
  const [buySurveyModalProject, setBuySurveyModalProject] = useState<Project | null>(null);
  const [surveyTicketNo, setSurveyTicketNo] = useState<string>('');
  const [surveyDate, setSurveyDate] = useState<string>('');
  const [surveyTimeSlot, setSurveyTimeSlot] = useState<string>('09:00 - 12:00 (ช่วงเช้า)');
  const [surveyInspectorId, setSurveyInspectorId] = useState<string>('');
  const [surveyNotes, setSurveyNotes] = useState<string>('');
  const [surveyError, setSurveyError] = useState<string>('');
  const [showScheduleMatrix, setShowScheduleMatrix] = useState<boolean>(true);

  // Dynamic Workflow Columns based on selected filter type or full workflow for 'all'
  const matchedMasterType = masterProjectTypes.find((t: any) => t.id === filterType);
  const activeColumnKeys = filterType === 'all'
    ? getWorkflowColumnsForType('renovate')
    : getWorkflowColumnsForType(matchedMasterType?.name || filterType);

  const columns = activeColumnKeys.map(colKey => ({
    id: colKey,
    title: colKey,
    color: STAGE_CONFIG[colKey]?.color || '#3b82f6',
    bg: STAGE_CONFIG[colKey]?.bg || 'rgba(59, 130, 246, 0.15)',
    description: STAGE_CONFIG[colKey]?.description || ''
  }));

  // Map project status to active columns cleanly
  const getProjectColumn = (project: Project): string => {
    return mapStatusToColumn(project.status, activeColumnKeys);
  };

  const filteredProjects = projects.filter(p => {
    const isMember = currentUser?.globalRole === 'Admin' || 
                    currentUser?.globalRole === 'Manager' || 
                    p.members?.some(m => m.userId === currentUser?.id || (m as any).id === currentUser?.id);
    if (!isMember) return false;

    if (filterType === 'all') return true;
    
    // Check match with masterProjectTypes
    if (matchedMasterType) {
      const typeName = (matchedMasterType.name || '').toLowerCase();
      const projType = (p.projectType || '').toLowerCase();
      if (projType === typeName || projType.includes(typeName) || typeName.includes(projType)) return true;
    }

    // Normalize old construction to new_house/renovate to keep compatibility
    const normalizedType = p.projectType === 'construction' ? 'new_house' : p.projectType;
    const projTypeStr = (p.projectType || '').toLowerCase();
    const filterStr = filterType.toLowerCase();

    return (normalizedType || 'new_house').toLowerCase() === filterStr ||
           projTypeStr === filterStr ||
           projTypeStr.includes(filterStr) ||
           filterStr.includes(projTypeStr);
  });

  const handleDragStart = (projectId: string) => {
    setDraggedProjectId(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const qcOfficers = useMemo(() => {
    return users.filter(u => u.globalRole === 'QC' || u.skills?.includes('QC') || u.globalRole === 'Admin');
  }, [users]);

  // ── Helper: Extract Responsible Branches for a QC user ──
  const getQcBranches = (user?: User | null): string[] => {
    if (!user) return [];
    if (user.serviceZones && user.serviceZones.length > 0) return user.serviceZones;
    if (user.assignedBranches && user.assignedBranches.length > 0) return user.assignedBranches;
    if (user.department) return [user.department];
    return ['สำนักงานใหญ่'];
  };

  // ── Helper: Check if QC branch matches project address / location ──
  const isBranchMatchProject = (user?: User | null, project?: Project | null): boolean => {
    if (!user || !project) return false;
    const branches = getQcBranches(user).join(' ').toLowerCase();
    const projAddress = (project.address || '').toLowerCase();
    const projBranch = (project.extraDetails?.branch || '').toLowerCase();
    const projName = (project.name || '').toLowerCase();

    // Check matches in address, branch, or project name
    const matchKeywords = ['บางนา', 'bangna', 'สมุทรปราการ', 'samutprakran', 'สุขาภิบาล', 'sukhapiban', 'บางใหญ่', 'bangyai', 'พระราม 2', 'rama 2', 'head office', 'bbt', 'บางบัวทอง'];
    for (const kw of matchKeywords) {
      if (branches.includes(kw) && (projAddress.includes(kw) || projBranch.includes(kw) || projName.includes(kw))) {
        return true;
      }
    }
    return false;
  };

  // ── Helper: Check Day Off / Holiday for a QC user ──
  const checkDayOffForQc = (user?: User | null, dateStr?: string) => {
    if (!dateStr || !user) return { isDayOff: false, reason: '', dayThai: '' };
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return { isDayOff: false, reason: '', dayThai: '' };

    const dayOfWeekIndex = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayCodes = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesThai = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const currentDayCode = dayCodes[dayOfWeekIndex];
    const currentDayThai = dayNamesThai[dayOfWeekIndex];

    // 1. Sunday is standard day off
    if (currentDayCode === 'Sun') {
      return { isDayOff: true, reason: 'วันอาทิตย์ (วันหยุดประจำสัปดาห์)', dayThai: currentDayThai };
    }

    // 2. Specific weekly Day Off configured on user profile
    if (user.wfhDays && user.wfhDays.includes(currentDayCode)) {
      return { isDayOff: true, reason: `วันหยุดประจำ${currentDayThai}`, dayThai: currentDayThai };
    }

    return { isDayOff: false, reason: '', dayThai: currentDayThai };
  };

  // ── Helper: Get Booked Timeslots for a QC on a specific date ──
  const getBookedSlotsForQc = (qcId: string, dateStr: string, currentProjectId?: string) => {
    if (!qcId || !dateStr) return [];
    
    return projects.filter(p => {
      if (currentProjectId && p.id === currentProjectId) return false;
      const extra = p.extraDetails || {};
      const pDate = extra.surveyDate || extra.refStartDate;
      return extra.surveyInspectorId === qcId && pDate === dateStr && extra.surveyTime;
    }).map(p => ({
      projectId: p.id,
      projectName: p.name,
      timeSlot: p.extraDetails?.surveyTime || '',
      ticketNo: p.extraDetails?.surveyTicketNo || ''
    }));
  };

  // ── Helper: Check if a specific timeslot is booked for a QC ──
  const isTimeslotBooked = (slotLabel: string, qcId: string, dateStr: string, currentProjectId?: string) => {
    if (!qcId || !dateStr) return null;
    const booked = getBookedSlotsForQc(qcId, dateStr, currentProjectId);
    return booked.find(b => {
      if (b.timeSlot === slotLabel) return true;
      if (b.timeSlot.includes('09:00') && slotLabel.includes('09:00')) return true;
      if (b.timeSlot.includes('13:00 - 15:00') && slotLabel.includes('13:00 - 15:00')) return true;
      if (b.timeSlot.includes('15:00 - 17:00') && slotLabel.includes('15:00 - 17:00')) return true;
      if (b.timeSlot.includes('13:00 - 17:00') && (slotLabel.includes('13:00') || slotLabel.includes('15:00'))) return true;
      return false;
    }) || null;
  };

  // Currently selected QC user object
  const selectedQcUser = useMemo(() => {
    return users.find(u => u.id === surveyInspectorId);
  }, [users, surveyInspectorId]);

  // Day Off status of currently selected QC on chosen date
  const currentDayOffInfo = useMemo(() => {
    return checkDayOffForQc(selectedQcUser, surveyDate);
  }, [selectedQcUser, surveyDate]);

  // Available (unbooked) time slots for selected QC on chosen date
  const availableSlots = useMemo(() => {
    if (!surveyInspectorId || !surveyDate) return STANDARD_SURVEY_SLOTS;
    return STANDARD_SURVEY_SLOTS.filter(s => {
      const booked = isTimeslotBooked(s.label, surveyInspectorId, surveyDate, buySurveyModalProject?.id);
      return !booked;
    });
  }, [surveyInspectorId, surveyDate, buySurveyModalProject, projects]);

  // If selected slot becomes occupied when switching QC or date, auto-switch to first available
  useEffect(() => {
    if (!buySurveyModalProject) return;
    if (availableSlots.length > 0) {
      const isCurrentStillValid = availableSlots.some(s => s.label === surveyTimeSlot);
      if (!isCurrentStillValid) {
        setSurveyTimeSlot(availableSlots[0].label);
      }
    } else {
      setSurveyTimeSlot('');
    }
  }, [surveyInspectorId, surveyDate, availableSlots]);

  const openBuySurveyModal = (project: Project) => {
    const extra = project.extraDetails || {};
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Generate default running Ticket No if not yet set: e.g. TK-20260817-5421
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const generatedTicket = extra.surveyTicketNo || `TK-${yyyy}${mm}${dd}-${randSeq}`;

    // Auto-match best QC based on project location if not already assigned
    let defaultQcId = extra.surveyInspectorId;
    if (!defaultQcId) {
      const matchingQc = qcOfficers.find(qc => isBranchMatchProject(qc, project));
      defaultQcId = matchingQc ? matchingQc.id : (qcOfficers[0]?.id || '');
    }

    const chosenDate = extra.surveyDate || extra.refStartDate || project.startDate || todayStr;

    setSurveyTicketNo(extra.surveyTicketNo || generatedTicket);
    setSurveyDate(chosenDate);
    setSurveyInspectorId(defaultQcId);
    setSurveyTimeSlot(extra.surveyTime || '09:00 - 12:00 (ช่วงเช้า)');
    setSurveyNotes(extra.notes || '');
    setSurveyError('');
    setBuySurveyModalProject(project);
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedProjectId || !setProjects) return;
    const targetProject = projects.find(p => p.id === draggedProjectId);
    if (!targetProject) return;

    // Check if moving to Buy-Survey column
    const isBuySurvey = columnId === 'Buy-Survey' || 
                        columnId.toLowerCase() === 'buy-survey' || 
                        columnId.toLowerCase() === 'ซื้อสำรวจ' ||
                        columnId.toLowerCase() === 'buy_survey';

    if (isBuySurvey) {
      openBuySurveyModal(targetProject);
      setDraggedProjectId(null);
      return;
    }

    // Normal column transition
    const updated = {
      ...targetProject,
      status: columnId as ProjectStatus
    };

    setProjects(prev => prev.map(p => p.id === draggedProjectId ? updated : p));
    setDraggedProjectId(null);

    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error('Failed to update project status in DB', e);
    }
  };

  const handleConfirmBuySurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buySurveyModalProject || !setProjects) return;

    if (!surveyTicketNo.trim()) {
      setSurveyError('⚠️ กรุณาระบุเลขที่ Ticket สำรวจ');
      return;
    }

    if (!surveyDate.trim()) {
      setSurveyError('⚠️ กรุณาระบุวันกำหนดนัดหมาย Survey');
      return;
    }

    if (!surveyInspectorId) {
      setSurveyError('⚠️ กรุณาเลือกเจ้าหน้าที่สำรวจ (QC)');
      return;
    }

    if (!surveyTimeSlot) {
      setSurveyError('⚠️ กรุณาเลือกช่วงเวลานัดหมายที่ยังว่างอยู่ (หรือเปลี่ยนเจ้าหน้าที่ QC/วันที่)');
      return;
    }

    // Check double-booking conflict
    const conflict = isTimeslotBooked(surveyTimeSlot, surveyInspectorId, surveyDate, buySurveyModalProject.id);
    if (conflict) {
      setSurveyError(`⚠️ ช่วงเวลานี้ถูกจองไปแล้วโดยโครงการ ${conflict.projectId} (${conflict.projectName})`);
      return;
    }

    const updatedExtra = {
      ...(buySurveyModalProject.extraDetails || {}),
      surveyTicketNo: surveyTicketNo.trim(),
      surveyDate: surveyDate,
      refStartDate: surveyDate,
      surveyTime: surveyTimeSlot,
      surveyInspectorId: surveyInspectorId || undefined,
      notes: surveyNotes ? surveyNotes.trim() : (buySurveyModalProject.extraDetails?.notes || '')
    };

    const updated: Project = {
      ...buySurveyModalProject,
      status: 'Buy-Survey' as ProjectStatus,
      startDate: surveyDate || buySurveyModalProject.startDate,
      extraDetails: updatedExtra
    };

    setProjects(prev => prev.map(p => p.id === buySurveyModalProject.id ? updated : p));
    setBuySurveyModalProject(null);

    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Failed to save project Buy-Survey info', err);
    }
  };

  const handleGenerateTicket = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    setSurveyTicketNo(`TK-${yyyy}${mm}${dd}-${randSeq}`);
  };

  const handleQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setSurveyDate(target.toISOString().split('T')[0]);
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
  const getQcPrimaryBranch = (userId: string) => {
    const u = users.find(user => user.id === userId);
    return u?.serviceZones?.[0] || u?.department || '';
  };

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
                borderBottom: `2px solid ${col.color}30`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {col.title}
                  </span>
                </div>
                <span style={{
                  background: colProjects.length > 0 ? col.bg : 'var(--bg-tertiary)',
                  color: colProjects.length > 0 ? col.color : 'var(--text-muted)',
                  border: colProjects.length > 0 ? `1px solid ${col.color}40` : '1px solid transparent',
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
                    const isCardInBuySurvey = col.id === 'Buy-Survey' || proj.status === 'Buy-Survey';
                    const hasSurveyInfo = proj.extraDetails?.surveyTicketNo || proj.extraDetails?.surveyDate || proj.extraDetails?.refStartDate;

                    return (
                      <div
                        key={proj.id}
                        draggable
                        onDragStart={() => handleDragStart(proj.id)}
                        className="glass-panel hover-lift"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: isCardInBuySurvey ? '1.5px solid rgba(14, 165, 233, 0.4)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem',
                          cursor: 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          transition: 'all 0.2s ease-in-out',
                          position: 'relative'
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
                            [{proj.id}] {((proj as any).customerName || proj.extraDetails?.customerStaffPic) ? `${(proj as any).customerName || proj.extraDetails?.customerStaffPic} - ` : ''}{proj.name}
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

                        {/* Survey Ticket & Date Badge (If in Buy-Survey or has ticket data) */}
                        {hasSurveyInfo && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem',
                            padding: '0.45rem 0.6rem',
                            background: 'rgba(14, 165, 233, 0.08)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(14, 165, 233, 0.25)',
                            marginTop: '0.1rem'
                          }}>
                            {proj.extraDetails?.surveyTicketNo && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0284c7', fontWeight: 700 }}>
                                  <Tag size={12} color="#0284c7" />
                                  Ticket: <strong style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{proj.extraDetails.surveyTicketNo}</strong>
                                </span>
                                {isCardInBuySurvey && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openBuySurveyModal(proj); }}
                                    style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                    title="แก้ไขเลข Ticket / วันนัดหมาย"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                )}
                              </div>
                            )}

                            {(proj.extraDetails?.surveyDate || proj.extraDetails?.refStartDate) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', color: '#0369a1', fontWeight: 600 }}>
                                <Clock size={12} color="#0369a1" />
                                <span>
                                  นัดสำรวจ: <strong>{formatToDDMMYYYY(proj.extraDetails.surveyDate || proj.extraDetails.refStartDate)}</strong>
                                  {proj.extraDetails.surveyTime ? ` (${proj.extraDetails.surveyTime})` : ''}
                                </span>
                              </div>
                            )}

                            {proj.extraDetails?.surveyInspectorId && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                <UserCheck size={11} color="var(--accent-primary)" />
                                <span>QC: <strong>{getUserName(proj.extraDetails.surveyInspectorId)}</strong> {getQcPrimaryBranch(proj.extraDetails.surveyInspectorId) ? `(${getQcPrimaryBranch(proj.extraDetails.surveyInspectorId)})` : ''}</span>
                              </div>
                            )}
                          </div>
                        )}

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

      {/* ── MODAL: BUY-SURVEY DETAILS INPUT WITH QC BRANCHES, TIMESLOT & DAY OFF MATRIX ── */}
      {buySurveyModalProject && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)',
          overflowY: 'auto'
        }}>
          <div 
            className="glass-panel" 
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '1px solid rgba(14, 165, 233, 0.4)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0ea5e9'
                }}>
                  <Tag size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    บันทึกข้อมูล Buy-Survey (สั่งซื้อสำรวจ)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    กำหนดเลขที่ Ticket, วันนัดหมาย และเลือกเจ้าหน้าที่ QC ตามสาขาที่รับผิดชอบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuySurveyModalProject(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '50%'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Project Summary Card */}
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>โครงการเป้าหมาย</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {buySurveyModalProject.name}
                </div>
                {buySurveyModalProject.address && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                    <MapPin size={12} color="var(--accent-primary)" /> {buySurveyModalProject.address}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(14, 165, 233, 0.12)', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                รหัส: {buySurveyModalProject.id}
              </span>
            </div>

            {/* Error banner */}
            {surveyError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{surveyError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmBuySurvey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Row 1: เลขที่ Ticket & วันกำหนด Survey */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                {/* Field 1: เลขที่ Ticket */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Tag size={13} color="var(--accent-primary)" /> เลขที่ Ticket สำรวจ <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateTicket}
                      style={{
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        color: '#0284c7',
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Sparkles size={10} /> สุ่มเลข
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น TK-20260817-001"
                    value={surveyTicketNo}
                    onChange={e => { setSurveyTicketNo(e.target.value); setSurveyError(''); }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Field 2: วันกำหนด Survey */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} color="var(--accent-primary)" /> วันกำหนด Survey <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(0)}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.625rem', padding: '0.1rem 0.35rem', borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(1)}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.625rem', padding: '0.1rem 0.35rem', borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        พรุ่งนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(3)}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.625rem', padding: '0.1rem 0.35rem', borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        +3 วัน
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={surveyDate}
                    onChange={e => { setSurveyDate(e.target.value); setSurveyError(''); }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: เจ้าหน้าที่ QC & สาขาที่รับผิดชอบ */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserCheck size={14} color="var(--accent-primary)" /> เจ้าหน้าที่สำรวจ (QC Officer) & สาขาที่รับผิดชอบ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {selectedQcUser && (
                    <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                      🏢 {getQcBranches(selectedQcUser)[0] || 'สาขาหลัก'}
                    </span>
                  )}
                </div>

                <select
                  value={surveyInspectorId}
                  onChange={e => { setSurveyInspectorId(e.target.value); setSurveyError(''); }}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-tertiary)',
                    border: currentDayOffInfo.isDayOff ? '1px solid #ef4444' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ QC --</option>
                  {qcOfficers.map(u => {
                    const dayOff = checkDayOffForQc(u, surveyDate);
                    const branches = getQcBranches(u);
                    const isMatch = isBranchMatchProject(u, buySurveyModalProject);

                    return (
                      <option key={u.id} value={u.id}>
                        {isMatch ? '⭐ [ตรงสาขา] ' : ''}{u.name} — 🏢 สาขา: {branches.join(', ')} {dayOff.isDayOff ? `[⛔ ${dayOff.reason}]` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* QC Responsible Branch & Contact Card */}
                {selectedQcUser && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(14, 165, 233, 0.06)',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.775rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Building2 size={14} color="#0284c7" />
                        <span>สาขา/พื้นที่รับผิดชอบ:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {getQcBranches(selectedQcUser).map((br, idx) => (
                            <span 
                              key={idx} 
                              style={{ 
                                background: idx === 0 ? 'rgba(14, 165, 233, 0.2)' : 'var(--bg-secondary)', 
                                color: idx === 0 ? '#0284c7' : 'var(--text-primary)', 
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                padding: '0.1rem 0.45rem', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                fontWeight: 700 
                              }}
                            >
                              {br}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isBranchMatchProject(selectedQcUser, buySurveyModalProject) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(22, 163, 74, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          <Star size={11} /> สาขาตรงกับพื้นที่โครงการ
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.725rem' }}>
                      {selectedQcUser.phones && selectedQcUser.phones.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={12} color="#0284c7" /> {selectedQcUser.phones[0]}
                        </span>
                      )}
                      {selectedQcUser.lineId && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MessageSquare size={12} color="#16a34a" /> LINE: {selectedQcUser.lineId}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Day Off Notice Banner */}
                {currentDayOffInfo.isDayOff && selectedQcUser && (
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    fontWeight: 600
                  }}>
                    <Coffee size={14} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>แจ้งเตือนวันหยุด:</strong> วันที่ {formatToDDMMYYYY(surveyDate)} ตรงกับ <u>{currentDayOffInfo.reason}</u> ของ {selectedQcUser.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: ช่วงเวลา Timeslot ที่ยังว่าง (Dynamic Timeslots) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} color="var(--accent-primary)" /> ช่วงเวลาสำรวจ (Time Slot) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: availableSlots.length > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {availableSlots.length > 0 ? `✓ ว่าง ${availableSlots.length} ช่วงเวลา` : '❌ คิวเต็มทุกช่วงเวลา'}
                  </span>
                </div>

                {/* Timeslot Chips / Selector */}
                {availableSlots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
                    {STANDARD_SURVEY_SLOTS.map(slot => {
                      const booked = isTimeslotBooked(slot.label, surveyInspectorId, surveyDate, buySurveyModalProject?.id);
                      const isSelected = surveyTimeSlot === slot.label;

                      if (booked) {
                        // Booked / Occupied Slot -> Strikethrough & disabled or hidden
                        return (
                          <div
                            key={slot.id}
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px dashed rgba(239, 68, 68, 0.3)',
                              color: 'var(--text-muted)',
                              fontSize: '0.775rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.15rem',
                              opacity: 0.7,
                              cursor: 'not-allowed'
                            }}
                            title={`จองแล้วโดยโครงการ: ${booked.projectId} (${booked.projectName})`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>{slot.shortLabel}</span>
                              <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                ไม่ว่าง
                              </span>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {booked.projectId}
                            </span>
                          </div>
                        );
                      }

                      // Available Slot
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => { setSurveyTimeSlot(slot.label); setSurveyError(''); }}
                          style={{
                            padding: '0.6rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(14, 165, 233, 0.18)' : 'var(--bg-tertiary)',
                            color: isSelected ? '#0284c7' : 'var(--text-primary)',
                            fontSize: '0.775rem',
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease-in-out'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={12} color={isSelected ? '#0284c7' : 'var(--text-muted)'} />
                            <span>{slot.shortLabel}</span>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 size={14} color="#0284c7" />
                          ) : (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    <ShieldAlert size={20} style={{ margin: '0 auto 0.25rem' }} />
                    เจ้าหน้าที่ QC ท่านนี้ติดคิวเต็มทุกช่วงเวลาในวันที่เลือก กรุณาเลือกเจ้าหน้าที่ท่านอื่นในตารางด้านล่าง หรือเปลี่ยนวันนัดหมาย
                  </div>
                )}
              </div>

              {/* Row 4: ตาราง Timeslot, สาขา และสถานะของเจ้าหน้าที่ QC ทั้งหมด (Schedule & Branch Matrix) */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <div 
                  onClick={() => setShowScheduleMatrix(!showScheduleMatrix)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CalendarDays size={13} color="var(--accent-primary)" />
                    ตารางคิวงาน & สาขาที่รับผิดชอบของ QC ทุกท่าน ประจำวันที่ {formatToDDMMYYYY(surveyDate)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {showScheduleMatrix ? '▲ ซ่อนตาราง' : '▼ แสดงตารางคิว'}
                  </span>
                </div>

                {showScheduleMatrix && (
                  <div style={{ overflowX: 'auto', padding: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.4rem 0.5rem' }}>เจ้าหน้าที่ QC</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>สาขาที่รับผิดชอบ</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>สถานะวัน</th>
                          {STANDARD_SURVEY_SLOTS.map(s => (
                            <th key={s.id} style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>{s.shortLabel}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {qcOfficers.map(qc => {
                          const isQcSelected = qc.id === surveyInspectorId;
                          const dayOff = checkDayOffForQc(qc, surveyDate);
                          const branches = getQcBranches(qc);
                          const isMatch = isBranchMatchProject(qc, buySurveyModalProject);

                          return (
                            <tr 
                              key={qc.id}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                background: isQcSelected ? 'rgba(14, 165, 233, 0.08)' : isMatch ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                                transition: 'background 0.15s'
                              }}
                            >
                              {/* QC Name */}
                              <td style={{ padding: '0.45rem 0.5rem', fontWeight: isQcSelected ? 700 : 500 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {isQcSelected && <Check size={12} color="#0284c7" />}
                                  {isMatch && <Star size={11} color="#16a34a" fill="#16a34a" />}
                                  <span style={{ color: isQcSelected ? '#0284c7' : 'var(--text-primary)' }}>{qc.name}</span>
                                </div>
                              </td>

                              {/* Responsible Branches */}
                              <td style={{ padding: '0.45rem 0.5rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                                  {branches.slice(0, 2).map((br, idx) => (
                                    <span 
                                      key={idx}
                                      style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        padding: '0.05rem 0.35rem',
                                        borderRadius: '3px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600
                                      }}
                                    >
                                      {br}
                                    </span>
                                  ))}
                                  {branches.length > 2 && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{branches.length - 2}</span>
                                  )}
                                </div>
                              </td>

                              {/* Day Status */}
                              <td style={{ padding: '0.45rem 0.5rem' }}>
                                {dayOff.isDayOff ? (
                                  <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>
                                    วันหยุด
                                  </span>
                                ) : (
                                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 600 }}>
                                    วันทำงาน
                                  </span>
                                )}
                              </td>

                              {/* Slot Columns */}
                              {STANDARD_SURVEY_SLOTS.map(slot => {
                                const booked = isTimeslotBooked(slot.label, qc.id, surveyDate, buySurveyModalProject?.id);

                                if (booked) {
                                  return (
                                    <td key={slot.id} style={{ padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                                      <span 
                                        style={{ 
                                          background: 'rgba(239, 68, 68, 0.12)', 
                                          color: '#ef4444', 
                                          padding: '0.15rem 0.35rem', 
                                          borderRadius: '3px', 
                                          fontSize: '0.65rem', 
                                          fontWeight: 700, 
                                          display: 'inline-block',
                                          maxWidth: '90px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={`จองโดย: ${booked.projectId} - ${booked.projectName}`}
                                      >
                                        ติดนัด
                                      </span>
                                    </td>
                                  );
                                }

                                const isThisChosen = isQcSelected && surveyTimeSlot === slot.label;

                                return (
                                  <td key={slot.id} style={{ padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSurveyInspectorId(qc.id);
                                        setSurveyTimeSlot(slot.label);
                                        setSurveyError('');
                                      }}
                                      style={{
                                        background: isThisChosen ? '#0284c7' : 'rgba(16, 185, 129, 0.12)',
                                        border: isThisChosen ? '1px solid #0284c7' : '1px solid rgba(16, 185, 129, 0.3)',
                                        color: isThisChosen ? 'white' : '#10b981',
                                        padding: '0.2rem 0.45rem',
                                        borderRadius: '4px',
                                        fontSize: '0.675rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {isThisChosen ? '✓ เลือก' : 'ว่าง'}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Field 5: หมายเหตุเพิ่มเติม */}
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  หมายเหตุ / เงื่อนไขหน้างาน
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น นิติบุคคลอนุญาตให้เข้าหลัง 10:00 น., ลูกค้าขอเข้าพร้อมช่างแอร์"
                  value={surveyNotes}
                  onChange={e => setSurveyNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setBuySurveyModalProject(null)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={availableSlots.length === 0}
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: availableSlots.length > 0 ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'var(--bg-tertiary)',
                    color: availableSlots.length > 0 ? 'white' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: availableSlots.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: availableSlots.length > 0 ? '0 4px 14px rgba(14, 165, 233, 0.4)' : 'none'
                  }}
                >
                  <CheckCircle2 size={16} /> ยืนยันย้ายไป Buy-Survey
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
