import { useState } from 'react';
import { MapPin, Clock, CheckCircle2, Filter, Image as ImageIcon, Search, LogIn, LogOut, FileText, AlertCircle, Camera, Upload, Trash2, ZoomIn, RefreshCw } from 'lucide-react';
import type { TimesheetEntry, Project, Task, User as UserType } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';

// Client-side image compressor utility
const compressImageFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<{ base64: string; sizeKB: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ base64: dataUrl, sizeKB });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const CHECKIN_PHOTO_SLOTS = [
  { index: 0, label: '1. สภาพพื้นที่ก่อนเริ่มงาน', subLabel: 'ก่อนทำ / สภาพเดิม', icon: '🚪' },
  { index: 1, label: '2. จุดที่กำลังปฏิบัติงาน', subLabel: 'ระหว่างทำ / ขั้นตอนงาน', icon: '⚡' },
  { index: 2, label: '3. ผลงาน / จุดสำคัญ', subLabel: 'หลังทำเสร็จ / ส่งมอบ', icon: '🎯' }
];

const parseEntryImages = (imageUrl?: string): string[] => {
  if (!imageUrl) return [];
  if (imageUrl.startsWith('[')) {
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return [imageUrl];
    }
  }
  return [imageUrl];
};

interface SiteCheckInOutProps {
  timesheets: TimesheetEntry[];
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
  projects: Project[];
  tasks: Task[];
  users: UserType[];
  currentUser: UserType;
}

export const SiteCheckInOut = ({
  timesheets,
  setTimesheets,
  projects,
  tasks,
  users,
  currentUser,
}: SiteCheckInOutProps) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'checkin' | 'checkout' | 'edit'>('checkin');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form states
  const [formUserId, setFormUserId] = useState<string>(currentUser.id);
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formTaskId, setFormTaskId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState<string>('08:30');
  const [formEndTime, setFormEndTime] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formWorkResults, setFormWorkResults] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [photoSizeKB, setPhotoSizeKB] = useState<number>(0);
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = timesheets.filter((entry) => {
    // Date filter (if set)
    if (selectedDate && entry.date !== selectedDate) {
      // allow flexible search if search query exists
      if (!searchQuery && selectedDate) {
        // match exact date unless 'all'
      }
    }
    const matchProject = selectedProject === 'all' || entry.projectId === selectedProject;
    const matchUser = selectedUser === 'all' || entry.userId === selectedUser;
    
    const isCompleted = Boolean(entry.endTime && entry.endTime.trim() !== '');
    const matchStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? !isCompleted :
      isCompleted;

    const userObj = users.find(u => u.id === entry.userId);
    const projObj = projects.find(p => p.id === entry.projectId);
    const matchSearch = !searchQuery || 
      (userObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (projObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchProject && matchUser && matchStatus && matchSearch;
  });

  // Calculate KPIs
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = timesheets.filter(t => t.date === todayStr);
  const activeNowCount = todayEntries.filter(t => !t.endTime || t.endTime.trim() === '').length;
  const completedTodayCount = todayEntries.filter(t => t.endTime && t.endTime.trim() !== '').length;
  const totalHoursToday = todayEntries.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const { base64, sizeKB } = await compressImageFile(file, 1200, 1200, 0.75);
      setFormImageUrl(base64);
      setPhotoSizeKB(sizeKB);
    } catch (err) {
      console.error('Error compressing check-in photo:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  const openCheckInModal = () => {
    setModalMode('checkin');
    setEditingEntryId(null);
    setFormUserId(currentUser.id);
    setFormProjectId(projects[0]?.id || '');
    setFormTaskId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setFormStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormEndTime('');
    setFormDescription('เข้าปฏิบัติงานหน้างาน (Check-In Site)');
    setFormWorkResults('');
    setFormImageUrl('');
    setPhotoSizeKB(0);
    setIsModalOpen(true);
  };

  const openCheckOutModal = (entry: TimesheetEntry) => {
    setModalMode('checkout');
    setEditingEntryId(entry.id);
    setFormUserId(entry.userId);
    setFormProjectId(entry.projectId);
    setFormTaskId(entry.taskId || '');
    setFormDate(entry.date);
    setFormStartTime(entry.startTime || '08:30');
    const now = new Date();
    setFormEndTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormDescription(entry.description || 'ปฏิบัติงานเรียบร้อย (Check-Out)');
    setFormWorkResults(entry.workResults || 'เสร็จสิ้นภารกิจประจำวัน');
    setFormImageUrl(entry.imageUrl || '');
    setPhotoSizeKB(entry.imageUrl && entry.imageUrl.length > 500 ? Math.round((entry.imageUrl.length * 3) / 4 / 1024) : 0);
    setIsModalOpen(true);
  };

  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId || !formUserId) {
      alert('กรุณาเลือกช่าง/พนักงาน และโครงการ');
      return;
    }

    // Calculate hours if start & end time exist
    let calcHours = 8;
    if (formStartTime && formEndTime && formEndTime.trim() !== '') {
      const [sh, sm] = formStartTime.split(':').map(Number);
      const [eh, em] = formEndTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin <= startMin) {
        alert(`⚠️ เวลา Check-Out (${formEndTime} น.) ต้องมากกว่าเวลา Check-In (${formStartTime} น.)`);
        return;
      }

      const diffMin = endMin - startMin;
      calcHours = Number((diffMin / 60).toFixed(1));
    }

    const newEntry: TimesheetEntry = {
      id: editingEntryId || 'ts_' + Date.now(),
      userId: formUserId,
      projectId: formProjectId,
      taskId: formTaskId || undefined,
      date: formDate,
      hours: calcHours,
      startTime: formStartTime,
      endTime: formEndTime || undefined,
      description: formDescription,
      workResults: formWorkResults,
      imageUrl: formImageUrl || undefined,
      status: 'Approved',
      updatedAt: new Date().toISOString()
    };

    if (editingEntryId) {
      setTimesheets(prev => prev.map(t => t.id === editingEntryId ? newEntry : t));
    } else {
      setTimesheets(prev => [newEntry, ...prev]);
    }

    setIsModalOpen(false);
  };

  const getUserObj = (uId: string) => users.find(u => u.id === uId);
  const getProjObj = (pId: string) => projects.find(p => p.id === pId);
  const getTaskObj = (tId?: string) => tasks.find(t => t.id === tId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* ── TOP HEADER ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.35rem', fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <MapPin size={28} color="#10b981" /> การบันทึก เข้า-ออกงานช่าง (Site Check-In / Out)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            ติดตามการเข้าปฏิบัติงานของช่างและทีมงานแบบ Real-time พร้อมรูปถ่ายและหลักฐานหน้างาน
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={openCheckInModal}
            style={{ 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
            className="hover-lift"
          >
            <LogIn size={18} /> 📍 บันทึก Check-In หน้างาน
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogIn size={24} color="#10b981" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>เช็คอินวันนี้ (Checked In)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{todayEntries.length} คน</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} color="#3b82f6" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>กำลังปฏิบัติงาน (Active On-Site)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{activeNowCount} คน</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} color="#8b5cf6" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>เช็คเอาท์เรียบร้อย (Completed)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>{completedTodayCount} คน</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} color="#f59e0b" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ชั่วโมงทำงานรวมวันนี้</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{totalHoursToday} ชม.</div>
          </div>
        </div>

      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <Filter size={18} color="#10b981" /> กรองข้อมูลบันทึกเข้า-ออกงาน
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ค้นหาตามคำ/ช่าง/โปรเจกต์</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="ค้นหาชื่อช่าง หรือโปรเจกต์..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem 0.5rem 2.25rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>เลือกวันที่</label>
            <CustomDateInput 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>เลือกโครงการ</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="all">ทุกโครงการ (All Projects)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>เลือกช่าง/พนักงาน</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="all">ทุกคน (All Staff)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department || 'Staff'})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>สถานะ Check-In/Out</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="all">แสดงทั้งหมด (All Statuses)</option>
              <option value="active">กำลังทำงานอยู่ (Checked In)</option>
              <option value="completed">เช็คเอาท์เสร็จสิ้น (Checked Out)</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── ATTENDANCE LOG TABLE ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="flex-between">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 ตารางรายการบันทึกการเข้า-ออกงาน ({filteredEntries.length} รายการ)
          </h3>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={40} color="var(--text-muted)" />
            <span>ไม่พบข้อมูลบันทึกเข้า-ออกงานตามเงื่อนไขที่เลือก</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>ช่าง / พนักงาน</th>
                  <th style={{ padding: '0.75rem 1rem' }}>โครงการ</th>
                  <th style={{ padding: '0.75rem 1rem' }}>วันที่</th>
                  <th style={{ padding: '0.75rem 1rem' }}>เวลาเข้า (Check-In)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>เวลาออก (Check-Out)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ชั่วโมงทำงาน</th>
                  <th style={{ padding: '0.75rem 1rem' }}>สถานะ</th>
                  <th style={{ padding: '0.75rem 1rem' }}>รูปถ่ายหน้างาน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const usr = getUserObj(entry.userId);
                  const prj = getProjObj(entry.projectId);
                  const tsk = getTaskObj(entry.taskId);
                  const isCheckedOut = Boolean(entry.endTime && entry.endTime.trim() !== '');

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-bg">
                      
                      {/* User */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <img 
                            src={usr?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userId}`} 
                            alt="User avatar" 
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{usr?.name || 'Unassigned Worker'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{usr?.department || 'Technician'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Project */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{prj?.name || 'Project N/A'}</div>
                        {tsk && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📌 {tsk.title}</div>}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {formatToDDMMYYYY(entry.date)}
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem' }}>
                          <LogIn size={14} /> {entry.startTime || '08:30'}
                        </span>
                      </td>

                      {/* End Time */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isCheckedOut ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem' }}>
                            <LogOut size={14} /> {entry.endTime}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>- ยังไม่ลงเวลา -</span>
                        )}
                      </td>

                      {/* Hours */}
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {entry.hours} ชม.
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isCheckedOut ? (
                          <span style={{ padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
                            ✅ Checked Out
                          </span>
                        ) : (
                          <span style={{ padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600, fontSize: '0.75rem' }}>
                            ⏱️ Working On-Site
                          </span>
                        )}
                      </td>

                      {/* Image preview */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {entry.imageUrl ? (
                          <button 
                            onClick={() => setPreviewImage(entry.imageUrl || null)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 500 }}
                          >
                            <ImageIcon size={16} /> ดูรูปหลักฐาน
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ไม่มีรูปถ่าย</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {!isCheckedOut ? (
                          <button
                            onClick={() => openCheckOutModal(entry)}
                            style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}
                            className="hover-lift"
                          >
                            🚪 ลงเวลา Check-Out
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setEditingEntryId(entry.id);
                              setFormUserId(entry.userId);
                              setFormProjectId(entry.projectId);
                              setFormTaskId(entry.taskId || '');
                              setFormDate(entry.date);
                              setFormStartTime(entry.startTime || '08:30');
                              setFormEndTime(entry.endTime || '17:30');
                              setFormDescription(entry.description || '');
                              setFormWorkResults(entry.workResults || '');
                              setFormImageUrl(entry.imageUrl || '');
                              setIsModalOpen(true);
                            }}
                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            แก้ไข
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL FORM (Check-In / Check-Out) ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '0.5rem' : '1rem'
        }}>
          <div className="glass-panel" style={{
            padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1.25rem 1rem' : '1.75rem 2rem',
            width: typeof window !== 'undefined' && window.innerWidth <= 768 ? '100vw' : '560px',
            maxWidth: '100%',
            maxHeight: typeof window !== 'undefined' && window.innerWidth <= 768 ? '96dvh' : '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            background: 'var(--bg-secondary)',
            borderRadius: typeof window !== 'undefined' && window.innerWidth <= 768 ? '14px' : 'var(--radius-lg)'
          }}>
            
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modalMode === 'checkin' ? '📍 บันทึก Check-In เข้าปฏิบัติงาน' : modalMode === 'checkout' ? '🚪 บันทึก Check-Out ออกจากงาน' : '✏️ แก้ไขข้อมูลเข้า-ออกงาน'}
              </h2>
            </div>

            <form onSubmit={handleSaveCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ช่าง / พนักงาน *</label>
                  <select
                    value={formUserId}
                    onChange={e => setFormUserId(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                    required
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department || 'Staff'})</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>โครงการ (Project) *</label>
                  <select
                    value={formProjectId}
                    onChange={e => setFormProjectId(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                    required
                  >
                    <option value="">เลือกโครงการ...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1fr' : '1fr 1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>วันที่ *</label>
                  <CustomDateInput 
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เวลา Check-In *</label>
                  <input 
                    type="time" 
                    value={formStartTime} 
                    onChange={e => setFormStartTime(e.target.value)} 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                {(() => {
                  let isEndTimeInvalid = false;
                  if (formStartTime && formEndTime && formEndTime.trim() !== '') {
                    const [sh, sm] = formStartTime.split(':').map(Number);
                    const [eh, em] = formEndTime.split(':').map(Number);
                    isEndTimeInvalid = (eh * 60 + em) <= (sh * 60 + sm);
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.825rem', color: isEndTimeInvalid ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>
                        เวลา Check-Out {isEndTimeInvalid ? '(ไม่ถูกต้อง)' : ''}
                      </label>
                      <input 
                        type="time" 
                        value={formEndTime} 
                        onChange={e => setFormEndTime(e.target.value)} 
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: isEndTimeInvalid ? '2px solid #ef4444' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontSize: '0.85rem'
                        }}
                      />
                      {isEndTimeInvalid && (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={12} /> เวลาออกต้องมากกว่าเวลาเข้า ({formStartTime} น.)
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รายละเอียดการปฏิบัติงาน / หมายเหตุ</label>
                <textarea 
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="ระบุสถานที่ หรือรายละเอียดภารกิจหน้างาน..."
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', minHeight: '60px', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>สรุปผลงานหลังทำเสร็จ (Work Summary)</label>
                <textarea 
                  value={formWorkResults}
                  onChange={e => setFormWorkResults(e.target.value)}
                  placeholder="ระบุผลงานที่ทำเสร็จ สรุปงานวันนี้..."
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', minHeight: '50px', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Camera size={15} color="#10b981" /> รูปถ่ายพื้นที่ / งานที่เข้าไปทำ (Site Evidence Photo)
                  </label>
                  {formImageUrl && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981', background: '#d1fae5', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                      ✓ แนบรูปภาพแล้ว
                    </span>
                  )}
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  border: formImageUrl ? '2px solid #10b981' : '1.5px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '130px',
                  position: 'relative'
                }}>
                  {isCompressingImage ? (
                    <div style={{ textAlign: 'center', color: '#2563eb', padding: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 0.4rem auto' }} />
                      กำลังบีบอัดรูปภาพ...
                    </div>
                  ) : formImageUrl ? (
                    <div style={{ position: 'relative', width: '100%', maxHeight: '200px', display: 'flex', justifyContent: 'center' }}>
                      <img 
                        src={formImageUrl} 
                        alt="Site evidence" 
                        style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => setPreviewImage(formImageUrl)}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        display: 'flex',
                        gap: '4px',
                        background: 'rgba(0,0,0,0.65)',
                        borderRadius: '6px',
                        padding: '3px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setPreviewImage(formImageUrl)}
                          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }}
                          title="ดูภาพขยาย"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormImageUrl(''); setPhotoSizeKB(0); }}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {photoSizeKB ? (
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#4ade80',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {photoSizeKB} KB
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                      }}>
                        <Camera size={16} /> <span>ถ่ายรูป / เลือกรูปภาพหน้างาน</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        บีบอัดอัตโนมัติ (~100-200 KB) รองรับทั้งกล้องมือถือและไฟล์ภาพ
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  style={{ background: modalMode === 'checkout' ? '#8b5cf6' : '#10b981', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
                  className="hover-lift"
                >
                  {modalMode === 'checkout' ? '🚪 บันทึก Check-Out' : '💾 บันทึกข้อมูล'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── PHOTO PREVIEW MODAL ── */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '80%', maxHeight: '80%' }}>
            <img src={previewImage} alt="Site evidence" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
            <button 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
