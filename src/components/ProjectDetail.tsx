import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Printer, MoreVertical, Home, 
  Upload, ChevronRight, Clock, CheckSquare, FileText, 
  MapPin, Activity, TrendingUp, CheckCircle2, AlertTriangle, 
  RotateCcw, DollarSign, UserPlus, Plus, Search, 
  Trash2, Save, FileSignature, ThumbsUp, Check, X,
  AlertCircle, MessageSquare
} from 'lucide-react';
import type { Project, User, Task, ProjectWorkflow, TimesheetEntry } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { STAGE_CONFIG } from '../config/workflows';

interface ProjectDetailProps {
  projects: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  users: User[];
  currentUser?: User | null;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  projectWorkflows?: ProjectWorkflow[];
  timesheets?: TimesheetEntry[];
  setTimesheets?: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projects,
  setProjects,
  users,
  currentUser,
  tasks = [],
  setTasks,
  projectWorkflows = [],
  timesheets = [],
  setTimesheets,
}) => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find target project or fallback to first project
  const project = projects.find(p => p.id === id) || projects[0];

  const [notes, setNotes] = useState(project?.extraDetails?.notes || 'ลูกค้าต้องการรีโนเวทบางส่วน เน้นความสวยงามและฟังก์ชันการใช้งาน งบประมาณเบื้องต้น 1,000 บาท');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; date: string }>>([]);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState('All');

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'quotations'>('workflow');

  // Quotations & Price Book State
  const [priceBook, setPriceBook] = useState<any[]>([]);
  const [projectQuotations, setProjectQuotations] = useState<any[]>([]);

  // Load pricebook and quotations on mount
  React.useEffect(() => {
    fetch('/api/pricebook')
      .then(res => res.json())
      .then(data => setPriceBook(data || []))
      .catch(err => console.error('Error fetching pricebook:', err));
  }, []);

  React.useEffect(() => {
    if (project?.id) {
      fetch(`/api/quotations?project_id=${project.id}`)
        .then(res => res.json())
        .then(data => setProjectQuotations(data || []))
        .catch(err => console.error('Error fetching project quotations:', err));
    }
  }, [project?.id]);

  // Quotation Builder form states
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [quoteIssueDate, setQuoteIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoteVatType, setQuoteVatType] = useState('Exclude VAT');
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [quoteNotes, setQuoteNotes] = useState('');

  // Safe helper to read the project's current lifecycle flow state
  const flowState = project?.extraDetails?.lifecycle || {
    phase: 'PHASE_01_LEAD_SURVEY',
    step: 'customer_enquiry',
    survey_appointment: 'yes',
    surveyor_id: '',
    survey_date: '',
    survey_checked_in: false,
    survey_checked_out: false,
    survey_check_in_time: '',
    survey_check_out_time: '',
    survey_photo_before: '',
    survey_photo_after: '',
    followup_scheduled: false,
    followup_date: '',
    followup_notes: '',
    design_required: 'yes',
    design_files: [] as Array<{ name: string; url: string }>,
    design_approved: 'pending', // 'pending', 'approved', 'rejected'
    design_revise_count: 0,
    quotation_approved: 'pending', // 'pending', 'approved', 'rejected'
    payment_received: false,
    payment_slip_url: '',
    project_plan_created: false,
    technicians: [] as string[],
    work_started: false,
    work_finished: false,
    qc_passed: 'pending', // 'pending', 'passed', 'failed'
    online_qc_review_notes: '',
    customer_satisfied: 'pending', // 'pending', 'yes', 'no'
    rework_count: 0,
    settled_in_bmt: false,
    bmt_payment_recorded: false,
    bmt_aftersales_result: '',
  };

  // Safe helper to update the project's lifecycle flow state and persist it to PostgreSQL
  const updateFlowState = (updatedFields: Partial<typeof flowState>) => {
    if (!setProjects || !project) return;
    const newExtra = {
      ...(project.extraDetails || {}),
      lifecycle: {
        ...flowState,
        ...updatedFields
      }
    };
    const updatedProject = {
      ...project,
      extraDetails: newExtra
    };
    setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
  };

  const [surveyorId, setSurveyorId] = useState(flowState.surveyor_id || '');
  const [surveyDate, setSurveyDate] = useState(flowState.survey_date || '');
  const [followupDate, setFollowupDate] = useState(flowState.followup_date || '');
  const [followupNotesText, setFollowupNotesText] = useState(flowState.followup_notes || '');
  const [designUrl, setDesignUrl] = useState('');
  const [qcReviewNotes, setQcReviewNotes] = useState(flowState.online_qc_review_notes || '');
  const [bmtAftersalesText, setBmtAftersalesText] = useState(flowState.bmt_aftersales_result || '');
  const [paymentSlip, setPaymentSlip] = useState(flowState.payment_slip_url || '');

  // Synchronize inputs when flowState changes
  React.useEffect(() => {
    if (project?.extraDetails?.lifecycle) {
      const lf = project.extraDetails.lifecycle;
      setSurveyorId(lf.surveyor_id || '');
      setSurveyDate(lf.survey_date || '');
      setFollowupDate(lf.followup_date || '');
      setFollowupNotesText(lf.followup_notes || '');
      setQcReviewNotes(lf.online_qc_review_notes || '');
      setBmtAftersalesText(lf.bmt_aftersales_result || '');
      setPaymentSlip(lf.payment_slip_url || '');
    }
  }, [project?.extraDetails?.lifecycle]);

  const handleFlowCheckIn = (role: 'surveyor' | 'technician' | 'qc_inspector') => {
    if (!setTimesheets || !project) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    
    const lat = 13.851979;
    const lng = 100.643406;
    
    const newEntry: TimesheetEntry = {
      id: 'ts_flow_' + Date.now(),
      userId: currentUser?.id || 'admin',
      projectId: project.id,
      date: dateStr,
      hours: 0,
      startTime: timeStr,
      description: role === 'surveyor' 
        ? '📍 เข้าสำรวจหน้างาน (Survey Check-In)' 
        : role === 'qc_inspector' 
          ? '📍 ตรวจสอบคุณภาพ QC Check-In' 
          : '📍 เริ่มทำงานช่าง Check-In',
      status: 'Approved',
      check_in_lat: lat,
      check_in_lng: lng,
    };

    setTimesheets(prev => [newEntry, ...prev]);

    if (role === 'surveyor') {
      updateFlowState({
        survey_checked_in: true,
        survey_check_in_time: `${dateStr} ${timeStr}`,
        step: 'on_site_survey'
      });
    } else if (role === 'technician') {
      updateFlowState({
        work_started: true
      });
    } else if (role === 'qc_inspector') {
      updateFlowState({
        survey_checked_in: true,
        survey_check_in_time: `${dateStr} ${timeStr}`,
      });
    }
    
    alert(`บันทึก Check-In สำเร็จ! (${role})\nพิกัด GPS: ${lat}, ${lng}`);
  };

  const handleFlowCheckOut = (role: 'surveyor' | 'technician' | 'qc_inspector', customProof?: string) => {
    if (!setTimesheets || !project) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    
    const activeTs = timesheets.find(t => t.projectId === project.id && !t.endTime);
    if (!activeTs) {
      alert('ไม่พบบันทึก Check-In ที่ยังไม่ได้ Check-Out สำหรับโครงการนี้');
      return;
    }

    let hoursDiff = 2.0;
    if (activeTs.startTime) {
      const [sh, sm] = activeTs.startTime.split(':').map(Number);
      const [eh, em] = timeStr.split(':').map(Number);
      const diffMin = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMin > 0) {
        hoursDiff = Number((diffMin / 60).toFixed(1));
      }
    }

    const imgUrl = customProof || 'https://images.unsplash.com/photo-1581094288338-2314dddb7eed?auto=format&fit=crop&q=80&w=300';
    const updatedEntry: TimesheetEntry = {
      ...activeTs,
      endTime: timeStr,
      hours: hoursDiff,
      workResults: role === 'surveyor' 
        ? 'สำรวจสภาพหน้างานเรียบร้อย' 
        : role === 'qc_inspector' 
          ? 'ตรวจสอบ QC คุณภาพผลงานส่งมอบ' 
          : 'ปฏิบัติงานประจำวันเสร็จสิ้น',
      imageUrl: imgUrl,
    };

    setTimesheets(prev => prev.map(t => t.id === activeTs.id ? updatedEntry : t));

    if (role === 'surveyor') {
      updateFlowState({
        survey_checked_out: true,
        survey_check_out_time: `${dateStr} ${timeStr}`,
        survey_photo_after: imgUrl,
        step: 'lead_record_updated'
      });
    } else if (role === 'technician') {
      updateFlowState({
        work_finished: true
      });
    } else if (role === 'qc_inspector') {
      updateFlowState({
        survey_checked_out: true,
        survey_check_out_time: `${dateStr} ${timeStr}`,
        survey_photo_after: imgUrl,
        qc_passed: 'passed'
      });
    }

    alert(`บันทึก Check-Out สำเร็จ! (${role})\nบันทึกเวลาปฏิบัติงาน: ${hoursDiff} ชม.`);
  };

  const handleApproveQuotation = (quo: any) => {
    if (!setProjects || !project) return;
    
    fetch(`/api/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...quo,
        status: 'Approved',
        updated_at: new Date().toISOString()
      })
    }).then(res => {
      if (res.ok) {
        fetch(`/api/quotations?project_id=${project.id}`)
          .then(r => r.json())
          .then(data => setProjectQuotations(data || []))
          .catch(err => console.error(err));
      }
    });

    const updatedProject = {
      ...project,
      budget: Number(quo.grand_total),
      projectValue: Number(quo.grand_total),
      extraDetails: {
        ...(project.extraDetails || {}),
        lifecycle: {
          ...flowState,
          quotation_approved: 'approved'
        }
      }
    };
    
    setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
    alert('อนุมัติใบเสนอราคาเรียบร้อยแล้ว! อัปเดตงบประมาณโครงการเป็น: ฿' + Number(quo.grand_total).toLocaleString());
  };

  if (!project) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>ไม่พบข้อมูลโครงการที่ระบุ</h2>
        <Link to="/projects" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          ← กลับไปหน้ารายการโครงการ
        </Link>
      </div>
    );
  }

  const extra = project.extraDetails || {};
  const picUser = users.find(u => u.id === extra.picUser || u.id === project.members?.[0]?.userId);
  const picName = picUser ? picUser.name : (extra.picUser || 'PAKPOOM J.');
  const picAvatar = picUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString('th-TH')
      }));
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const FlowBox = ({ title, isActive, isCompleted, isWarning }: { title: string; isActive: boolean; isCompleted: boolean; isWarning?: boolean }) => {
    let border = '1px solid var(--border-color)';
    let bg = 'rgba(255,255,255,0.02)';
    let color = 'var(--text-muted)';
    
    if (isCompleted) {
      border = '1px solid #10b981';
      bg = 'rgba(16, 185, 129, 0.08)';
      color = '#10b981';
    } else if (isActive) {
      border = '2px solid var(--accent-primary)';
      bg = 'rgba(0, 245, 255, 0.08)';
      color = 'var(--accent-primary)';
    } else if (isWarning) {
      border = '1px solid #f59e0b';
      bg = 'rgba(245, 158, 11, 0.08)';
      color = '#f59e0b';
    }
    
    return (
      <div style={{
        padding: '0.6rem 0.85rem',
        borderRadius: '6px',
        border,
        background: bg,
        color,
        fontSize: '0.8rem',
        fontWeight: (isActive || isCompleted) ? 700 : 500,
        textAlign: 'center',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? '0 0 10px rgba(0, 245, 255, 0.15)' : 'none'
      }}>
        {title}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* ── BREADCRUMB & BACK BUTTON ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link to="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>Projects</Link>
          <ChevronRight size={14} />
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{project.id}</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>รายละเอียดโครงการ</span>
        </div>

        <button 
          onClick={() => navigate('/projects')} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--accent-primary)', 
            fontWeight: 700, 
            fontSize: '0.875rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <ArrowLeft size={16} /> กลับไปหน้ารายการ
        </button>
      </div>

      {/* ── HEADER BANNER ── */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        borderLeft: '4px solid var(--accent-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <Home size={26} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {project.id}
              </h1>
              {(() => {
                const conf = STAGE_CONFIG[project.status] || {
                  color: '#3b82f6',
                  bg: 'rgba(59, 130, 246, 0.15)'
                };
                return (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.2rem 0.75rem', 
                    borderRadius: 'var(--radius-full)', 
                    background: conf.bg,
                    color: conf.color,
                    fontWeight: 700,
                    border: `1px solid ${conf.color}40`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: conf.color }} />
                    {project.status || 'To Do'}
                  </span>
                );
              })()}
            </div>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {project.name}
            </span>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button 
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              padding: '0.5rem 0.85rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <MoreVertical size={16} /> ตัวเลือก
          </button>

          <button 
            onClick={handlePrint}
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              padding: '0.5rem 0.85rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            className="hover-lift"
          >
            <Printer size={16} /> พิมพ์
          </button>

          <button 
            onClick={() => navigate(`/projects`)}
            style={{ 
              background: 'var(--accent-primary)', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            className="hover-lift"
          >
            <Edit size={16} /> แก้ไขข้อมูล
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'overview' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Home size={16} /> ภาพรวมโครงการ
        </button>
        <button 
          onClick={() => setActiveTab('workflow')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'workflow' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'workflow' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            fontWeight: activeTab === 'workflow' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Activity size={16} /> Workflow Timeline Tracker
        </button>
        <button 
          onClick={() => setActiveTab('quotations')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'quotations' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'quotations' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            fontWeight: activeTab === 'quotations' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FileText size={16} /> ใบเสนอราคา & BOQ
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: DETAILED INFO CARDS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* TOP GRID: ข้อมูลโครงการ & ข้อมูลลูกค้า */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            
            {/* CARD 1: ข้อมูลโครงการ */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                ข้อมูลโครงการ
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>Project Template</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{project.projectTemplateName || 'Workflow vFIX'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>สถานะโปรเจกต์</span>
                  {(() => {
                    const conf = STAGE_CONFIG[project.status] || {
                      color: '#3b82f6',
                      bg: 'rgba(59, 130, 246, 0.15)'
                    };
                    return (
                      <span style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.color}40`, padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: conf.color }} />
                        {project.status || 'To Do'}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>วันที่เริ่ม</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatToDDMMYYYY(project.startDate || '2025-05-16')}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ประเภทงาน</span>
                  <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    🏠 {extra.buildingType || 'บ้านเดี่ยว'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontSize: '0.725rem' }}>สาขา</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extra.branch || 'สาขาบางนา'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>วันที่สร้าง</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatToDDMMYYYY(project.startDate || '2025-05-16')} 10:30</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ชื่อโปรเจกต์</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{project.name}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>เจ้าหน้าที่รับผิดชอบ</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <img src={picAvatar} alt="PIC" style={{ width: '22px', height: '22px', borderRadius: '50%' }} />
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>{picName}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: ข้อมูลลูกค้า */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                ข้อมูลลูกค้า
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ชื่อลูกค้า</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{project.customerName || extra.customerStaffPic || 'คุณสมชาย ใจดี'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>เบอร์โทรศัพท์</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{project.customerPhone || '081-234-5678'}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ประเภทสิ่งปลูกสร้าง</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extra.buildingType || 'บ้านเดี่ยว'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>อีเมล</span>
                  <strong style={{ color: 'var(--text-primary)' }}>somchai.jaidee@email.com</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>งบประมาณเบื้องต้น</span>
                  <strong style={{ color: '#10b981' }}>฿{extra.initialBudget ? extra.initialBudget.toLocaleString() : '1,000'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ช่องทางที่ได้รับสินค้า</span>
                  <span style={{ color: 'var(--text-secondary)' }}>แนะนำจากเพื่อน</span>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ที่อยู่</span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {project.address || '99/99 หมู่ 3 ถ.บางนา-ตราด แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* CARD 3: รายละเอียดงาน */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              รายละเอียดงาน
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ขนาดพื้นที่</span>
                <strong style={{ color: 'var(--text-primary)' }}>{extra.areaSize || '150'} ตร.ม.</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ช่วงเวลาที่ต้องการเริ่มงาน</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatToDDMMYYYY(extra.refStartDate || '2025-06-15')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ความต้องการ</span>
                <strong style={{ color: 'var(--text-primary)' }}>{project.description || 'รีโนเวทห้องรับแขกและห้องครัว'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>งบประมาณเบื้องต้น</span>
                <strong style={{ color: '#10b981' }}>฿{extra.initialBudget ? extra.initialBudget.toLocaleString() : '1,000'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>วิธีการชำระเงิน</span>
                <strong style={{ color: 'var(--text-primary)' }}>{extra.paymentMethod || 'โอนเข้าบัญชีธนาคาร'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ช่องทางที่ได้รับสินค้า</span>
                <span style={{ color: 'var(--text-secondary)' }}>แนะนำจากเพื่อน</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>พื้นที่งาน</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {extra.workAreas && extra.workAreas.length > 0 ? extra.workAreas.join(', ') : 'ห้องรับแขก, ห้องครัว, ห้องนอน'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ประเภทความต้องการ</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {extra.workTypes && extra.workTypes.length > 0 ? extra.workTypes.join(', ') : 'งานป้องกัน'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>PIC</span>
                <span style={{ color: 'var(--text-secondary)' }}>{picName}</span>
              </div>
            </div>
          </div>

          {/* CARD 4: อ้างอิง / เอกสารที่เกี่ยวข้อง */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              อ้างอิง / เอกสารที่เกี่ยวข้อง
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Survey Ticket Number</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{extra.surveyTicketNo || 'ST-2505-0001'}</strong>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Survey QT Number</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{extra.surveyQtNo || 'QT-2505-0010'}</strong>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Renovate QT Number</span>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{extra.renovateQtNo || 'ยังไม่สร้าง'}</span>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Renovate Ticket Number</span>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{extra.renovateTicketNo || 'ยังไม่สร้าง'}</span>
              </div>

            </div>
          </div>

          {/* CARD 5: ขั้นตอนปัจจุบัน */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Home size={18} color="var(--accent-primary)" /> ขั้นตอนปัจจุบัน
              </h3>
              <button 
                onClick={() => navigate(`/project-plan?projectId=${project.id}`)}
                style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ดูขั้นตอนทั้งหมด
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>ขั้นตอน</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: 'white', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Design for Purchase (No Survey)</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>เริ่มต้นเมื่อ</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatToDDMMYYYY(project.startDate || '2025-05-16')} 10:30</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>สถานะ</span>
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.725rem' }}>
                  กำลังดำเนินการ
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>กำหนดเสร็จสิ้น</span>
                <span style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>PIC</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <img src={picAvatar} alt="PIC" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{picName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 6 & 7: โน้ต / หมายเหตุ & ไฟล์แนบ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            
            {/* โน้ต / หมายเหตุ */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                โน้ต / หมายเหตุ
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุโน้ตหรือหมายเหตุสำหรับโครงการนี้..."
                style={{ 
                  width: '100%', 
                  minHeight: '80px', 
                  padding: '0.6rem', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.825rem', 
                  outline: 'none', 
                  resize: 'vertical' 
                }}
              />
            </div>

            {/* ไฟล์แนบ (Upload Zone) */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                ไฟล์แนบ ({attachments.length})
              </h3>
              
              <label style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: '8px', 
                padding: '1.25rem 1rem', 
                textAlign: 'center', 
                cursor: 'pointer', 
                background: 'var(--bg-tertiary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem'
              }} className="hover-lift">
                <Upload size={22} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  ลากไฟล์มาวางที่นี่ หรือ <span style={{ color: 'var(--accent-primary)' }}>คลิกเพื่ออัปโหลดไฟล์</span>
                </span>
                <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {attachments.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{file.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ── RIGHT COLUMN: ACTIVITY HISTORY TIMELINE ── */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              ประวัติกิจกรรม
            </h3>
            <select 
              value={selectedHistoryFilter}
              onChange={(e) => setSelectedHistoryFilter(e.target.value)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.725rem', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="All">กิจกรรมทั้งหมด</option>
              <option value="Created">สร้างโครงการ</option>
              <option value="Edited">แก้ไขข้อมูล</option>
              <option value="Steps">ขั้นตอนงาน</option>
            </select>
          </div>

          {/* Activity Log Nodes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1.25rem' }}>
            
            {/* Timeline Vertical Line */}
            <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border-color)' }} />

            {/* Node 1: สร้างโครงการ */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ position: 'absolute', left: '-1.25rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 800 }}>+</div>
              <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>สร้างโครงการ</strong>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{picName}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>16/05/2025 10:30</span>
            </div>

            {/* Node 2: แก้ไขข้อมูลโครงการ */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ position: 'absolute', left: '-1.25rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#f59e0b', border: '2px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.55rem', fontWeight: 800 }}>✏️</div>
              <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>แก้ไขข้อมูลโครงการ</strong>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{picName}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>16/05/2025 10:30</span>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                • แก้ไขงบประมาณเบื้องต้น จาก <span style={{ textDecoration: 'line-through' }}>-</span> เป็น 1,000
              </div>
            </div>

            {/* Node 3: เริ่มขั้นตอนที่ 1 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ position: 'absolute', left: '-1.25rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', border: '2px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 800 }}>1</div>
              <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>เริ่มขั้นตอนที่ 1</strong>
              <span style={{ fontSize: '0.775rem', color: '#3b82f6', fontWeight: 600 }}>Design for Purchase (No Survey)</span>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{picName}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>16/05/2025 10:30</span>
            </div>

          </div>
        </div>

      </div>
      )}

      {activeTab === 'workflow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', paddingBottom: '3rem' }}>
          
          {/* ── VISUAL STEPPER ── */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent-primary)" /> Project Lifecycle Stepper
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '24px', left: '12%', right: '12%', height: '3px', background: 'var(--border-color)', zIndex: 0 }} />
              
              {/* Phase 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', zIndex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: flowState.phase === 'PHASE_01_LEAD_SURVEY' ? 'var(--accent-primary)' : (flowState.phase !== 'PHASE_01_LEAD_SURVEY' ? '#10b981' : 'var(--bg-tertiary)'),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '4px solid var(--bg-secondary)',
                  boxShadow: flowState.phase === 'PHASE_01_LEAD_SURVEY' ? '0 0 15px var(--accent-primary)' : 'none'
                }}>
                  {flowState.phase !== 'PHASE_01_LEAD_SURVEY' ? '✓' : '1'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Phase 01: Lead & Survey</strong>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: flowState.phase === 'PHASE_01_LEAD_SURVEY' ? 'var(--accent-primary)' : (flowState.phase !== 'PHASE_01_LEAD_SURVEY' ? '#10b981' : 'var(--text-muted)') }}>
                    {flowState.phase === 'PHASE_01_LEAD_SURVEY' ? 'กำลังดำเนินการ' : 'เสร็จสมบูรณ์'}
                  </span>
                </div>
              </div>

              {/* Phase 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', zIndex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' ? 'var(--accent-primary)' : (['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase) ? '#10b981' : 'var(--bg-tertiary)'),
                  color: flowState.phase === 'PHASE_01_LEAD_SURVEY' ? 'var(--text-muted)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '4px solid var(--bg-secondary)',
                  boxShadow: flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' ? '0 0 15px var(--accent-primary)' : 'none'
                }}>
                  {['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase) ? '✓' : '2'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Phase 02: Design & Quote</strong>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' ? 'var(--accent-primary)' : (['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase) ? '#10b981' : 'var(--text-muted)') }}>
                    {flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' ? 'กำลังดำเนินการ' : (['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase) ? 'เสร็จสมบูรณ์' : 'รอดำเนินการ')}
                  </span>
                </div>
              </div>

              {/* Phase 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', zIndex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: flowState.phase === 'PHASE_03_PROJECT_EXECUTION' ? 'var(--accent-primary)' : (flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? '#10b981' : 'var(--bg-tertiary)'),
                  color: ['PHASE_01_LEAD_SURVEY', 'PHASE_02_DESIGN_QUOTE_PAYMENT'].includes(flowState.phase) ? 'var(--text-muted)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '4px solid var(--bg-secondary)',
                  boxShadow: flowState.phase === 'PHASE_03_PROJECT_EXECUTION' ? '0 0 15px var(--accent-primary)' : 'none'
                }}>
                  {flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? '✓' : '3'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Phase 03: Execution</strong>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: flowState.phase === 'PHASE_03_PROJECT_EXECUTION' ? 'var(--accent-primary)' : (flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? '#10b981' : 'var(--text-muted)') }}>
                    {flowState.phase === 'PHASE_03_PROJECT_EXECUTION' ? 'กำลังดำเนินการ' : (flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? 'เสร็จสมบูรณ์' : 'รอดำเนินการ')}
                  </span>
                </div>
              </div>

              {/* Phase 4 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', zIndex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? (flowState.settled_in_bmt ? '#10b981' : 'var(--accent-primary)') : 'var(--bg-tertiary)',
                  color: flowState.phase !== 'PHASE_04_QC_HANDOVER_AFTERSALES' ? 'var(--text-muted)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '4px solid var(--bg-secondary)',
                  boxShadow: flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && !flowState.settled_in_bmt ? '0 0 15px var(--accent-primary)' : 'none'
                }}>
                  {flowState.settled_in_bmt ? '✓' : '4'}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Phase 04: QC & After-Sales</strong>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {flowState.settled_in_bmt ? 'ปิดโครงการเสร็จสิ้น (BMT settled)' : (flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' ? 'กำลังดำเนินการ' : 'รอดำเนินการ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── TWO-COLUMN WORKFLOW GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: ACTIVE PHASE DETAILED CONTROLS */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* PHASE 1: LEAD & SURVEY VIEW */}
              {flowState.phase === 'PHASE_01_LEAD_SURVEY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>ขั้นตอนการตรวจสอบและนัดสำรวจ</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>PHASE 01: Lead & Site Survey</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>💡 Step 1 & 2: นัดหมายสำรวจหน้างาน (Survey Appointment)</div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="radio" 
                          name="survey_appoint" 
                          checked={flowState.survey_appointment === 'yes'} 
                          onChange={() => updateFlowState({ survey_appointment: 'yes' })} 
                        />
                        นัดหมายเข้าสำรวจ (YES)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="radio" 
                          name="survey_appoint" 
                          checked={flowState.survey_appointment === 'no'} 
                          onChange={() => updateFlowState({ survey_appointment: 'no' })} 
                        />
                        ข้ามการสำรวจ / ติดตามงาน (NO)
                      </label>
                    </div>

                    {flowState.survey_appointment === 'yes' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>ผู้สำรวจหน้างาน (QC Surveyor) *</label>
                          <select 
                            value={surveyorId} 
                            onChange={e => {
                              setSurveyorId(e.target.value);
                              updateFlowState({ surveyor_id: e.target.value });
                            }}
                            style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          >
                            <option value="">เลือกช่างสำรวจ...</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.globalRole})</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>วันเวลานัดหมายเข้าสำรวจ *</label>
                          <input 
                            type="datetime-local" 
                            value={surveyDate} 
                            onChange={e => {
                              setSurveyDate(e.target.value);
                              updateFlowState({ survey_date: e.target.value, step: 'on_site_survey_pending' });
                            }} 
                            style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>วันที่นัดติดตามผล (Follow-up Date) *</label>
                            <input 
                              type="date" 
                              value={followupDate} 
                              onChange={e => {
                                setFollowupDate(e.target.value);
                                updateFlowState({ followup_date: e.target.value, followup_scheduled: true });
                              }}
                              style={{ width: '200px', padding: '0.4rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>บันทึกรายละเอียดการโทร / ติดตาม *</label>
                          <textarea 
                            value={followupNotesText} 
                            onChange={e => {
                              setFollowupNotesText(e.target.value);
                              updateFlowState({ followup_notes: e.target.value });
                            }}
                            placeholder="พิมพ์บันทึกการพูดคุยกับลูกค้า..."
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem', minHeight: '60px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {flowState.survey_appointment === 'yes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>📱 Step 3: ช่างสำรวจเช็คอิน-เช็คเอาท์ (On-site Survey Simulation)</div>
                      
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleFlowCheckIn('surveyor')}
                          disabled={flowState.survey_checked_in}
                          style={{
                            background: flowState.survey_checked_in ? 'var(--bg-secondary)' : '#10b981',
                            color: flowState.survey_checked_in ? 'white' : 'white',
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: flowState.survey_checked_in ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <MapPin size={16} /> 📍 Surveyor Check-In (GPS)
                        </button>
                        <button 
                          onClick={() => handleFlowCheckOut('surveyor')}
                          disabled={!flowState.survey_checked_in || flowState.survey_checked_out}
                          style={{
                            background: (!flowState.survey_checked_in || flowState.survey_checked_out) ? 'var(--bg-secondary)' : '#8b5cf6',
                            color: (!flowState.survey_checked_in || flowState.survey_checked_out) ? 'var(--text-muted)' : 'white',
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (!flowState.survey_checked_in || flowState.survey_checked_out) ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Clock size={16} /> 🚪 Surveyor Check-Out & Upload Picture
                        </button>
                      </div>

                      {/* Display Survey Logs */}
                      {flowState.survey_checked_in && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                          <div>🟢 **Check-In:** {flowState.survey_check_in_time} (GPS Verified)</div>
                          {flowState.survey_checked_out && (
                            <>
                              <div>🔴 **Check-Out:** {flowState.survey_check_out_time}</div>
                              <div>🖼️ **ภาพถ่ายหลักฐาน:** <a href={flowState.survey_photo_after} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>คลิกเพื่อดูรูปภาพ</a></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        updateFlowState({
                          phase: 'PHASE_02_DESIGN_QUOTE_PAYMENT',
                          step: 'design_required_selection'
                        });
                      }}
                      style={{
                        background: 'var(--accent-primary)',
                        color: 'white',
                        padding: '0.6rem 1.5rem',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      💾 อัปเดต Lead Record & ถันไป (Phase 2) →
                    </button>
                  </div>
                </div>
              )}

              {/* PHASE 2: DESIGN, QUOTE & PAYMENT VIEW */}
              {flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>ขั้นตอนออกแบบ เสนอราคา และชำระเงิน</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>PHASE 02: Design, Quote & Payment</h2>
                    </div>
                    <button 
                      onClick={() => updateFlowState({ phase: 'PHASE_01_LEAD_SURVEY' })}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      ← ย้อนกลับ Phase 1
                    </button>
                  </div>

                  {/* Design Step */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>📐 Step 4: ดีไซน์และแบบแปลน (Design Requirement)</div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="radio" 
                          name="design_req" 
                          checked={flowState.design_required === 'yes'} 
                          onChange={() => updateFlowState({ design_required: 'yes' })} 
                        />
                        ต้องการจัดทำแบบแปลน 2D/3D (YES)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="radio" 
                          name="design_req" 
                          checked={flowState.design_required === 'no'} 
                          onChange={() => updateFlowState({ design_required: 'no', design_approved: 'approved' })} 
                        />
                        ไม่ต้องออกแบบ ถอดราคาเลย (NO)
                      </label>
                    </div>

                    {flowState.design_required === 'yes' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>อัปโหลดภาพจำลอง 3D / แบบแปลน 2D (URL Link)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              value={designUrl}
                              onChange={e => setDesignUrl(e.target.value)}
                              placeholder="https://... ลิงก์รูปภาพแบบแปลน" 
                              style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                            />
                            <button 
                              onClick={() => {
                                if (!designUrl) return;
                                const newFiles = [...(flowState.design_files || []), { name: `แปลน_${Date.now()}.jpg`, url: designUrl }];
                                updateFlowState({ design_files: newFiles, design_approved: 'pending' });
                                setDesignUrl('');
                              }}
                              style={{ padding: '0.4rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              อัปโหลด
                            </button>
                          </div>
                        </div>

                        {flowState.design_files && flowState.design_files.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>แบบร่างดีไซน์ในระบบ:</span>
                            {flowState.design_files.map((f: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>{f.name}</a>
                                <button 
                                  onClick={() => {
                                    const filtered = flowState.design_files.filter((_: any, i: number) => i !== idx);
                                    updateFlowState({ design_files: filtered });
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                          <button 
                            onClick={() => {
                              updateFlowState({ design_approved: 'approved' });
                              alert('ลูกค้าอนุมัติแบบดีไซน์สำเร็จ!');
                            }}
                            disabled={!flowState.design_files || flowState.design_files.length === 0}
                            style={{
                              flex: 1,
                              background: (!flowState.design_files || flowState.design_files.length === 0) ? 'var(--bg-secondary)' : '#10b981',
                              color: (!flowState.design_files || flowState.design_files.length === 0) ? 'var(--text-muted)' : 'white',
                              padding: '0.45rem',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: (!flowState.design_files || flowState.design_files.length === 0) ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.775rem'
                            }}
                          >
                            ✓ อนุมัติแบบ (Design Approved)
                          </button>
                          <button 
                            onClick={() => {
                              updateFlowState({ 
                                design_approved: 'rejected',
                                design_revise_count: (flowState.design_revise_count || 0) + 1 
                              });
                              alert('ปฏิเสธแบบเรียบร้อยแล้ว ส่งกลับไปแก้ไขแบบดีไซน์ (REVISE)');
                            }}
                            disabled={!flowState.design_files || flowState.design_files.length === 0}
                            style={{
                              flex: 1,
                              background: (!flowState.design_files || flowState.design_files.length === 0) ? 'var(--bg-secondary)' : '#f59e0b',
                              color: (!flowState.design_files || flowState.design_files.length === 0) ? 'var(--text-muted)' : 'white',
                              padding: '0.45rem',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: (!flowState.design_files || flowState.design_files.length === 0) ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.775rem'
                            }}
                          >
                            ↺ ปรับแก้แบบ (Revise Design)
                          </button>
                        </div>

                        {flowState.design_approved !== 'pending' && (
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: flowState.design_approved === 'approved' ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
                            สถานะการอนุมัติแบบ: {flowState.design_approved === 'approved' ? 'อนุมัติผ่าน (Approved)' : 'ส่งแบบแก้ไของค์ประกอบ (Revise)'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price Book and Quotation Stage */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>💰 Step 5: ออกใบเสนอราคา (Cost Estimate & Issue Quotation)</div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      คุณสามารถออกใบเสนอราคาโดยดึงราคาจากฐานข้อมูล Price Book และส่งให้ลูกค้ายืนยันอนุมัติ
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={() => setActiveTab('quotations')}
                        style={{
                          background: 'var(--accent-primary)',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        📂 เปิดระบบออกใบเสนอราคา
                      </button>
                    </div>

                    {projectQuotations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ประวัติใบเสนอราคาทั้งหมด:</div>
                        {projectQuotations.map(quo => (
                          <div key={quo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                            <div>
                              <strong style={{ color: 'var(--accent-primary)' }}>{quo.quotation_number}</strong>
                              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>ยอดรวม: ฿{Number(quo.grand_total).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {flowState.quotation_approved !== 'approved' && (
                                <button 
                                  onClick={() => handleApproveQuotation(quo)}
                                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                >
                                  อนุมัติ (Approve)
                                </button>
                              )}
                              <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: quo.status === 'Approved' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: quo.status === 'Approved' ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.65rem' }}>
                                {quo.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic' }}>ยังไม่มีการออกใบเสนอราคาสำหรับโครงการนี้</div>
                    )}
                  </div>

                  {/* Payment Stage */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>💳 Step 6: ชำระเงินมัดจำ (Payment Received)</div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      กรอกลิงก์หรืออัปโหลดรูปภาพสลิปการชำระเงินมัดจำงวดแรกเพื่อยืนยันการรับเงิน
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>ลิงก์สลิปโอนเงิน (Payment Slip URL) *</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={paymentSlip}
                          onChange={e => {
                            setPaymentSlip(e.target.value);
                            updateFlowState({ payment_slip_url: e.target.value });
                          }}
                          placeholder="https://... ลิงก์สลิปเงินมัดจำ" 
                          style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        />
                        <button 
                          onClick={() => {
                            if (!paymentSlip) {
                              alert('กรุณากรอกลิงก์รูปสลิป');
                              return;
                            }
                            updateFlowState({ payment_received: true });
                            
                            if (setProjects && project) {
                              const depositVal = Math.round(Number(project.projectValue) * 0.3);
                              const updatedProject = {
                                ...project,
                                collectedValue: depositVal,
                                extraDetails: {
                                  ...(project.extraDetails || {}),
                                  lifecycle: {
                                    ...flowState,
                                    payment_slip_url: paymentSlip,
                                    payment_received: true
                                  }
                                }
                              };
                              setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
                            }
                            alert('ยืนยันชำระเงินมัดจำเรียบร้อยแล้ว!');
                          }}
                          style={{ padding: '0.4rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          ยืนยันยอดรับเงิน
                        </button>
                      </div>
                    </div>

                    {flowState.payment_received && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                        <Check size={16} /> ยืนยันยอดเงินโอนเข้าบัญชีเรียบร้อย (collected: ฿{Number(project.collectedValue).toLocaleString()})
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        if (!flowState.payment_received) {
                          alert('กรุณายืนยันการรับเงินมัดจำ (Payment Received) ก่อนดำเนินการขั้นตอนก่อสร้าง');
                          return;
                        }
                        updateFlowState({
                          phase: 'PHASE_03_PROJECT_EXECUTION',
                          step: 'project_plan_creation'
                        });
                      }}
                      style={{
                        background: flowState.payment_received ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: flowState.payment_received ? 'white' : 'var(--text-muted)',
                        padding: '0.6rem 1.5rem',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: flowState.payment_received ? 'pointer' : 'not-allowed',
                        fontSize: '0.85rem'
                      }}
                    >
                      💾 เริ่มต้นดำเนินงานก่อสร้าง (Execution) →
                    </button>
                  </div>
                </div>
              )}

              {/* PHASE 3: PROJECT EXECUTION VIEW */}
              {flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>ขั้นตอนการก่อสร้างและควบคุมงาน</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>PHASE 03: Project Execution (JMT)</h2>
                    </div>
                    <button 
                      onClick={() => updateFlowState({ phase: 'PHASE_02_DESIGN_QUOTE_PAYMENT' })}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      ← ย้อนกลับ Phase 2
                    </button>
                  </div>

                  {/* Confirm Plan / JMT Integration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>📋 Step 7: สร้างแผนงานโครงการ [JMT Plan Integration]</div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ระบบรองรับการสร้างแผนและดึงช่างติดตั้งจากฐานระบบ JMT เพื่อยืนยันความพร้อมหน้างาน
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={() => {
                          updateFlowState({ project_plan_created: true });
                          alert('สร้างแผนโครงการใน JMT และยืนยันกับลูกค้าเสร็จสมบูรณ์!');
                        }}
                        style={{
                          background: flowState.project_plan_created ? 'rgba(16,185,129,0.15)' : 'var(--accent-primary)',
                          color: flowState.project_plan_created ? '#10b981' : 'white',
                          border: flowState.project_plan_created ? '1px solid #10b981' : 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        {flowState.project_plan_created ? '✓ แผนงาน JMT บันทึกเรียบร้อย' : 'สร้างแผนงานและ WBS (JMT)'}
                      </button>

                      <button 
                        onClick={() => {
                          const mockTechs = ['สมใจ แสนดี (ช่างไฟฟ้า)', 'ณรงค์ ทนทาน (ช่างฝีมือ)', 'วิชัย อิ่มใจ (ช่างทั่วไป)'];
                          updateFlowState({ technicians: mockTechs });
                          alert('ดึงรายชื่อช่างผู้ร่วมงานจากระบบ JMT เรียบร้อย: ' + mockTechs.join(', '));
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        👥 ดึงช่างติดตั้งจาก JMT
                      </button>
                    </div>

                    {flowState.technicians && flowState.technicians.length > 0 && (
                      <div style={{ background: 'var(--bg-primary)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>ช่างจาก JMT:</span>
                        {flowState.technicians.map((t: any, idx: number) => (
                          <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--accent-primary)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Technician Check-in/out */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>📱 Step 8 & 9: เช็คอินช่างและบันทึก Timesheet (Check-In / Out)</div>
                    
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleFlowCheckIn('technician')}
                        disabled={flowState.work_started && !flowState.work_finished}
                        style={{
                          background: (flowState.work_started && !flowState.work_finished) ? 'var(--bg-secondary)' : '#10b981',
                          color: (flowState.work_started && !flowState.work_finished) ? 'var(--text-muted)' : 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (flowState.work_started && !flowState.work_finished) ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <MapPin size={16} /> 📍 Start Project Check-In (GPS)
                      </button>
                      
                      <button 
                        onClick={() => handleFlowCheckOut('technician')}
                        disabled={!flowState.work_started || flowState.work_finished}
                        style={{
                          background: (!flowState.work_started || flowState.work_finished) ? 'var(--bg-secondary)' : '#8b5cf6',
                          color: (!flowState.work_started || flowState.work_finished) ? 'var(--text-muted)' : 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!flowState.work_started || flowState.work_finished) ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Clock size={16} /> 🚪 Update Task Check-Out & log timesheet
                      </button>
                    </div>

                    {flowState.work_started && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div>🟢 **สถานะการเข้างานช่าง:** ได้เช็คอินเริ่มดำเนินงานก่อสร้างหน้างานแล้ว</div>
                        {flowState.work_finished && (
                          <div style={{ color: '#10b981', fontWeight: 700 }}>✓ ดำเนินการก่อสร้างและเช็คเอาท์หน้างาน (Check-Out) เรียบร้อย!</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        if (!flowState.work_finished) {
                          alert('กรุณาทำการเช็คเอาท์ (Check-Out) และบันทึก Timesheet เพื่อส่งมอบผลงานก่อนเข้าตรวจ QC');
                          return;
                        }
                        updateFlowState({
                          phase: 'PHASE_04_QC_HANDOVER_AFTERSALES',
                          step: 'qc_inspection'
                        });
                      }}
                      style={{
                        background: flowState.work_finished ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: flowState.work_finished ? 'white' : 'var(--text-muted)',
                        padding: '0.6rem 1.5rem',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: flowState.work_finished ? 'pointer' : 'not-allowed',
                        fontSize: '0.85rem'
                      }}
                    >
                      💾 ส่งมอบงาน & เข้าสู่การตรวจสอบ QC (Phase 4) →
                    </button>
                  </div>
                </div>
              )}

              {/* PHASE 4: QC, HANDOVER & AFTER-SALES VIEW */}
              {flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>ขั้นตอนการตรวจสอบและปิดโครงการ</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>PHASE 04: QC, Handover & After-Sales</h2>
                    </div>
                    <button 
                      onClick={() => updateFlowState({ phase: 'PHASE_03_PROJECT_EXECUTION' })}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      ← ย้อนกลับ Phase 3
                    </button>
                  </div>

                  {/* QC Inspection Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>🔍 Step 11: การตรวจสอบคุณภาพ (QC Inspection)</div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={() => {
                          updateFlowState({ qc_passed: 'passed' });
                          alert('ตรวจสอบคุณภาพผ่านเกณฑ์มาตรฐาน QC เรียบร้อย!');
                        }}
                        style={{
                          flex: 1,
                          background: flowState.qc_passed === 'passed' ? '#10b981' : 'var(--bg-primary)',
                          color: flowState.qc_passed === 'passed' ? 'white' : 'var(--text-secondary)',
                          border: flowState.qc_passed === 'passed' ? 'none' : '1px solid var(--border-color)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        ✓ ผ่าน QC (Passed QC)
                      </button>
                      <button 
                        onClick={() => {
                          updateFlowState({ qc_passed: 'failed' });
                          alert('คุณภาพงานไม่ผ่านเกณฑ์ส่งมอบ! ต้องดำเนินการตรวจสอบทบทวนออนไลน์');
                        }}
                        style={{
                          flex: 1,
                          background: flowState.qc_passed === 'failed' ? '#ef4444' : 'var(--bg-primary)',
                          color: flowState.qc_passed === 'failed' ? 'white' : 'var(--text-secondary)',
                          border: flowState.qc_passed === 'failed' ? 'none' : '1px solid var(--border-color)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        ✕ ไม่ผ่าน QC (Failed QC)
                      </button>
                    </div>

                    {flowState.qc_passed === 'failed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>💻 Online QC Review - ส่งกลับไปตรวจสอบข้อบกพร่องออนไลน์</div>
                        <textarea 
                          value={qcReviewNotes}
                          onChange={e => {
                            setQcReviewNotes(e.target.value);
                            updateFlowState({ online_qc_review_notes: e.target.value });
                          }}
                          placeholder="พิมพ์ข้อบกพร่องที่ต้องปรับแก้ ดึงข้อมูลไปแสดงในสรุป QC..."
                          style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem', minHeight: '60px' }}
                        />
                        <button 
                          onClick={() => {
                            updateFlowState({ qc_passed: 'passed' });
                            alert('ทบทวนแบบข้อบกพร่องออนไลน์และอนุมัติผ่าน QC เรียบร้อย!');
                          }}
                          style={{ padding: '0.35rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, alignSelf: 'flex-end' }}
                        >
                          บันทึกความถูกต้อง / อนุมัติผ่าน QC
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Customer Satisfaction and Rework Loop */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>🤝 Step 12: ความพึงพอใจของลูกค้าและบริการหลังการขาย (Aftersales & Satisfaction)</div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      สำรวจความพึงพอใจของลูกค้าหลังส่งมอบ หากต้องการแก้ไขงานให้ทำเรื่อง Rework วนลูปกลับไปทำแผนก่อสร้างใหม่
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={() => {
                          updateFlowState({ customer_satisfied: 'yes' });
                          alert('ลูกค้ายืนยันความพึงพอใจเรียบร้อยแล้ว!');
                        }}
                        style={{
                          flex: 1,
                          background: flowState.customer_satisfied === 'yes' ? '#10b981' : 'var(--bg-primary)',
                          color: flowState.customer_satisfied === 'yes' ? 'white' : 'var(--text-secondary)',
                          border: flowState.customer_satisfied === 'yes' ? 'none' : '1px solid var(--border-color)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        👍 พึงพอใจ (Satisfied)
                      </button>
                      <button 
                        onClick={() => {
                          updateFlowState({ 
                            customer_satisfied: 'no',
                            phase: 'PHASE_03_PROJECT_EXECUTION',
                            project_plan_created: false,
                            work_started: false,
                            work_finished: false,
                            rework_count: (flowState.rework_count || 0) + 1 
                          });
                          alert('เกิดรายการ Rework! วนลูปกลับไปจัดทำแผนงาน (Create project plan) ใน Phase 3 อีกครั้ง');
                        }}
                        style={{
                          flex: 1,
                          background: flowState.customer_satisfied === 'no' ? '#ef4444' : 'var(--bg-primary)',
                          color: flowState.customer_satisfied === 'no' ? 'white' : 'var(--text-secondary)',
                          border: flowState.customer_satisfied === 'no' ? 'none' : '1px solid var(--border-color)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        ↺ ปรับปรุงแก้ไข (Rework)
                      </button>
                    </div>
                  </div>

                  {/* BMT Settlement */}
                  {flowState.customer_satisfied === 'yes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>🏦 Step 13: เคลียร์ยอดเงินและปิดงานระบบใหญ่ (Close & Settle in BMT)</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <button 
                            onClick={() => {
                              alert('ดึงพนักงานที่ร่วมทำงานเสร็จสิ้น: \n- ' + (flowState.technicians?.join('\n- ') || 'ไม่พบรายชื่อในระบบ JMT'));
                            }}
                            style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Pull JMT Technicians
                          </button>
                          <button 
                            onClick={() => {
                              updateFlowState({ bmt_payment_recorded: true });
                              
                              if (setProjects && project) {
                                const updatedProject = {
                                  ...project,
                                  collectedValue: Number(project.projectValue),
                                  extraDetails: {
                                    ...(project.extraDetails || {}),
                                    lifecycle: {
                                      ...flowState,
                                      bmt_payment_recorded: true
                                    }
                                  }
                                };
                                setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
                              }
                              alert('บันทึกปิดยอดเงินในระบบ BMT สำเร็จ (collected: 100%)');
                            }}
                            style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Record Final Payment
                          </button>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ข้อมูลผลการดูแลหลังการขาย (After-Sales Result) *</label>
                          <input 
                            type="text" 
                            value={bmtAftersalesText}
                            onChange={e => {
                              setBmtAftersalesText(e.target.value);
                              updateFlowState({ bmt_aftersales_result: e.target.value });
                            }}
                            placeholder="เช่น ติดตามผลหลังทำเสร็จ 7 วัน ลูกค้าพอใจมาก" 
                            style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>

                        <button 
                          onClick={() => {
                            updateFlowState({ settled_in_bmt: true });
                            
                            if (setProjects && project) {
                              const updatedProject = {
                                ...project,
                                status: 'Close',
                                extraDetails: {
                                  ...(project.extraDetails || {}),
                                  lifecycle: {
                                    ...flowState,
                                    settled_in_bmt: true
                                  }
                                }
                              };
                              setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
                            }
                            alert('ปิดและเคลียร์บัญชีโครงการใน BMT เรียบร้อย! โครงการเสร็จสิ้นสมบูรณ์');
                          }}
                          style={{
                            width: '100%',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '0.55rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            marginTop: '0.5rem'
                          }}
                        >
                          🔒 ยืนยันจบงานและปิดโครงการ (Complete & Close in BMT)
                        </button>

                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: DYNAMIC WORKFLOW DIAGRAM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  แผนผังเวิร์กโฟลว์ (Workflow Flowchart)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase 01: Lead & Survey</div>
                  <FlowBox title="Customer Enquiry" isActive={false} isCompleted={true} />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Sales Rep Makes Contact" isActive={false} isCompleted={true} />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FlowBox title="On-site Survey" isActive={flowState.phase === 'PHASE_01_LEAD_SURVEY' && flowState.survey_appointment === 'yes'} isCompleted={flowState.phase !== 'PHASE_01_LEAD_SURVEY' && flowState.survey_appointment === 'yes'} />
                    <FlowBox title="Schedule Follow-up" isActive={flowState.phase === 'PHASE_01_LEAD_SURVEY' && flowState.survey_appointment === 'no'} isCompleted={flowState.phase !== 'PHASE_01_LEAD_SURVEY' && flowState.survey_appointment === 'no'} />
                  </div>
                  
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Update Lead Record" isActive={flowState.phase === 'PHASE_01_LEAD_SURVEY' && flowState.step === 'lead_record_updated'} isCompleted={flowState.phase !== 'PHASE_01_LEAD_SURVEY'} />
                  
                  <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '0.5rem 0' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase 02: Design & Quote</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FlowBox title="Create Design" isActive={flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.design_required === 'yes' && flowState.design_approved !== 'approved'} isCompleted={flowState.phase !== 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.design_required === 'yes'} />
                    <FlowBox title="Skip Design (Cost Est)" isActive={flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.design_required === 'no'} isCompleted={flowState.phase !== 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.design_required === 'no'} />
                  </div>
                  
                  {flowState.design_revise_count > 0 && (
                    <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600 }}>
                      ↺ Design Revise ({flowState.design_revise_count} times)
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Issue Quotation" isActive={flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.quotation_approved !== 'approved'} isCompleted={['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase)} />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Payment Received (Deposit)" isActive={flowState.phase === 'PHASE_02_DESIGN_QUOTE_PAYMENT' && flowState.quotation_approved === 'approved' && !flowState.payment_received} isCompleted={['PHASE_03_PROJECT_EXECUTION', 'PHASE_04_QC_HANDOVER_AFTERSALES'].includes(flowState.phase)} />
                  
                  <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '0.5rem 0' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase 03: Project Execution</div>
                  
                  <FlowBox title="Create Plan [JMT]" isActive={flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && !flowState.project_plan_created} isCompleted={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' || (flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && flowState.project_plan_created)} />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Start Project (Check-in)" isActive={flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && flowState.project_plan_created && !flowState.work_started} isCompleted={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' || (flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && flowState.work_started)} />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Update Task (Check-out)" isActive={flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && flowState.work_started && !flowState.work_finished} isCompleted={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' || (flowState.phase === 'PHASE_03_PROJECT_EXECUTION' && flowState.work_finished)} />
                  
                  <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '0.5rem 0' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase 04: QC & After-Sales</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FlowBox title="Passed QC" isActive={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && flowState.qc_passed === 'passed'} isCompleted={flowState.settled_in_bmt && flowState.qc_passed === 'passed'} />
                    <FlowBox title="Online QC Review" isActive={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && flowState.qc_passed === 'failed'} isCompleted={flowState.settled_in_bmt && flowState.qc_passed === 'failed'} />
                  </div>
                  
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="After-Sales Support" isActive={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && flowState.qc_passed !== 'pending' && flowState.customer_satisfied === 'pending'} isCompleted={flowState.settled_in_bmt} />
                  
                  {flowState.rework_count > 0 && (
                    <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}>
                      ↺ Rework Active ({flowState.rework_count} times)
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>↓</div>
                  <FlowBox title="Close & Settle (BMT)" isActive={flowState.phase === 'PHASE_04_QC_HANDOVER_AFTERSALES' && flowState.customer_satisfied === 'yes' && !flowState.settled_in_bmt} isCompleted={flowState.settled_in_bmt} />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'quotations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', paddingBottom: '3rem' }}>
          
          <div className="flex-between">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>ใบเสนอราคาของโครงการ ({project.id})</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>จัดการใบเสนอราคาและราคาวัสดุ อ้างอิงราคากลาง Price Book</p>
            </div>
            
            <button 
              onClick={() => {
                setQuoteItems([]);
                setQuoteNotes('');
                setIsCreateQuoteOpen(true);
              }}
              style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> สร้างใบเสนอราคาใหม่
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.85rem' }}>เลขที่บิล</th>
                  <th style={{ padding: '0.85rem' }}>วันที่ออกเอกสาร</th>
                  <th style={{ padding: '0.85rem' }}>ยอดรวมสุทธิ (Grand Total)</th>
                  <th style={{ padding: '0.85rem' }}>ภาษีมูลค่าเพิ่ม (VAT)</th>
                  <th style={{ padding: '0.85rem' }}>สถานะ</th>
                  <th style={{ padding: '0.85rem', textAlign: 'right' }}>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {projectQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีประวัติใบเสนอราคาของโครงการนี้</td>
                  </tr>
                ) : (
                  projectQuotations.map(quo => (
                    <tr key={quo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{quo.quotation_number}</td>
                      <td style={{ padding: '0.85rem' }}>{quo.issue_date}</td>
                      <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: 700 }}>฿{Number(quo.grand_total).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem', color: 'var(--text-secondary)' }}>{quo.vat_type}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: quo.status === 'Approved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: quo.status === 'Approved' ? '#10b981' : '#f59e0b',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {quo.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                        {quo.status !== 'Approved' && (
                          <button 
                            onClick={() => handleApproveQuotation(quo)}
                            style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            อนุมัติงวดราคา
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* CREATE QUOTATION POPUP MODAL */}
          {isCreateQuoteOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
              <div className="glass-panel" style={{ width: '900px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="var(--accent-primary)" /> ออกใบเสนอราคาโครงการ
                  </h2>
                  <button onClick={() => setIsCreateQuoteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
                  {/* Left panel: builder items */}
                  <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>วันที่เสนอราคา</label>
                        <input type="date" value={quoteIssueDate} onChange={e => setQuoteIssueDate(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>ประเภทภาษี (VAT)</label>
                        <select value={quoteVatType} onChange={e => setQuoteVatType(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                          <option value="Exclude VAT">ราคาแยกภาษี (Exclude VAT +7%)</option>
                          <option value="Include VAT">ราคารวมภาษีแล้ว (Include VAT 7%)</option>
                          <option value="No VAT">ไม่คิดภาษี (No VAT)</option>
                        </select>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>รายการ</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', width: '80px' }}>จำนวน</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคาขายต่อหน่วย</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคารวม</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กรุณาเลือกรายการสินค้า/บริการจากกล่อง Price Book ด้านขวาเพื่อเริ่มคำนวณเงิน</td>
                          </tr>
                        ) : (
                          quoteItems.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                              <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.service_name}</td>
                              <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={item.quantity} 
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    const updated = [...quoteItems];
                                    updated[idx].quantity = val;
                                    updated[idx].total_price = val * item.unit_price;
                                    setQuoteItems(updated);
                                  }} 
                                  style={{ width: '50px', padding: '0.2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                />
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>฿{Number(item.unit_price).toLocaleString()}</td>
                              <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>฿{Number(item.total_price).toLocaleString()}</td>
                              <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                <button 
                                  onClick={() => {
                                    const filtered = quoteItems.filter((_, i) => i !== idx);
                                    setQuoteItems(filtered);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Totals Summary */}
                    {quoteItems.length > 0 && (() => {
                      const sub = quoteItems.reduce((acc, it) => acc + Number(it.total_price), 0);
                      let vatVal = 0;
                      let grandVal = sub;
                      if (quoteVatType === 'Exclude VAT') {
                        vatVal = sub * 0.07;
                        grandVal = sub + vatVal;
                      } else if (quoteVatType === 'Include VAT') {
                        vatVal = sub - (sub / 1.07);
                      }
                      return (
                        <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', width: '220px', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>ยอดรวมสุทธิ:</span>
                            <span>฿{sub.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', width: '220px', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>VAT (7%):</span>
                            <span>฿{vatVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', width: '220px', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem', borderTop: '1px solid var(--border-color)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                            <span>ยอดเงินรวมทั้งสิ้น:</span>
                            <span style={{ color: '#10b981' }}>฿{grandVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right panel: Price book selector */}
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>รายการจาก Price Book</h3>
                    
                    {priceBook.map(pb => (
                      <div key={pb.id} style={{ background: 'var(--bg-primary)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{pb.service_name}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>หมวดหมู่: {pb.category}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>฿{Number(pb.selling_price).toLocaleString()} / {pb.unit_type}</span>
                          <button 
                            onClick={() => {
                              const existing = quoteItems.find(it => it.price_book_id === pb.id);
                              if (existing) {
                                alert('รายการนี้ถูกเลือกอยู่แล้ว!');
                                return;
                              }
                              setQuoteItems([...quoteItems, {
                                price_book_id: pb.id,
                                service_name: pb.service_name,
                                quantity: 1,
                                unit_type: pb.unit_type,
                                unit_cost: pb.material_cost + pb.labor_cost,
                                unit_price: pb.selling_price,
                                total_price: pb.selling_price
                              }]);
                            }}
                            style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.15rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem' }}
                          >
                            + เพิ่ม
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-secondary)' }}>
                  <button onClick={() => setIsCreateQuoteOpen(false)} style={{ padding: '0.45rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>ยกเลิก</button>
                  <button 
                    onClick={async () => {
                      if (quoteItems.length === 0) return;
                      const sub = quoteItems.reduce((acc, it) => acc + Number(it.total_price), 0);
                      let vatVal = 0;
                      let grandVal = sub;
                      if (quoteVatType === 'Exclude VAT') {
                        vatVal = sub * 0.07;
                        grandVal = sub + vatVal;
                      } else if (quoteVatType === 'Include VAT') {
                        vatVal = sub - (sub / 1.07);
                      }
                      
                      try {
                        const res = await fetch('/api/quotations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            project_id: project.id,
                            issue_date: quoteIssueDate,
                            vat_type: quoteVatType,
                            items: quoteItems,
                            notes: quoteNotes,
                            created_by: currentUser?.name || 'Admin'
                          })
                        });
                        
                        if (res.ok) {
                          setIsCreateQuoteOpen(false);
                          setQuoteItems([]);
                          
                          const r = await fetch(`/api/quotations?project_id=${project.id}`);
                          if (r.ok) {
                            const d = await r.json();
                            setProjectQuotations(d);
                          }
                          alert('ออกใบเสนอราคาสำเร็จ!');
                        } else {
                          alert('ไม่สามารถเซฟใบเสนอราคาได้');
                        }
                      } catch(e) {
                        console.error(e);
                        alert('เกิดข้อผิดพลาดในการเซฟ');
                      }
                    }}
                    disabled={quoteItems.length === 0}
                    style={{
                      background: quoteItems.length > 0 ? '#10b981' : 'var(--bg-tertiary)',
                      color: quoteItems.length > 0 ? 'white' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.45rem 1.5rem',
                      borderRadius: '6px',
                      cursor: quoteItems.length > 0 ? 'pointer' : 'not-allowed',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Save size={14} /> บันทึกและออกบิล
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}



    </div>
  );
};
