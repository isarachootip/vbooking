import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Printer, MoreVertical, Home, 
  Upload, ChevronRight
} from 'lucide-react';
import type { Project, User, Task, ProjectWorkflow } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface ProjectDetailProps {
  projects: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  users: User[];
  currentUser?: User | null;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  projectWorkflows?: ProjectWorkflow[];
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projects,
  users,
}) => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find target project or fallback to first project
  const project = projects.find(p => p.id === id) || projects[0];

  const [notes, setNotes] = useState(project?.extraDetails?.notes || 'ลูกค้าต้องการรีโนเวทบางส่วน เน้นความสวยงามและฟังก์ชันการใช้งาน งบประมาณเบื้องต้น 1,000 บาท');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; date: string }>>([]);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState('All');

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
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.2rem 0.75rem', 
                borderRadius: 'var(--radius-full)', 
                background: project.status === 'Active' || project.status === 'กำลังดำเนินการ' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: project.status === 'Active' || project.status === 'กำลังดำเนินการ' ? '#10b981' : '#f59e0b',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {project.status === 'Planning' ? 'กำลังดำเนินการ' : project.status}
              </span>
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

      {/* ── TWO-COLUMN MAIN CONTAINER ── */}
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
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.725rem' }}>
                    {project.status === 'Planning' ? 'กำลังดำเนินการ' : project.status}
                  </span>
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
                  <strong style={{ color: 'var(--text-primary)' }}>{extra.customerStaffPic || 'คุณสมชาย ใจดี'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.725rem' }}>เบอร์โทรศัพท์</span>
                  <strong style={{ color: 'var(--text-primary)' }}>081-234-5678</strong>
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

    </div>
  );
};
