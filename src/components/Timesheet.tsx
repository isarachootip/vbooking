import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Plus, CheckCircle2, Calendar as CalendarIcon, X, Trash2, ChevronLeft, ChevronRight, XCircle, Edit, Paperclip, ImageIcon, Camera, Upload, ZoomIn, RefreshCw } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth } from 'date-fns';
import type { TimesheetEntry, Project, Task, User, TimesheetStatus } from '../types';
import { sortTimesheetsByLastUpdate } from '../utils';

const TIMESHEET_PHOTO_GUIDES = [
  { id: 'before', label: '1. ก่อนเริ่มงาน', subLabel: 'สภาพเดิม / ป้าย / เตรียมงาน', icon: '🚩', color: '#f59e0b' },
  { id: 'progress1', label: '2. ระหว่างทำ 1', subLabel: 'ขั้นตอนหลัก / รื้อถอน / วางท่อ', icon: '⚙️', color: '#3b82f6' },
  { id: 'progress2', label: '3. ระหว่างทำ 2', subLabel: 'ประกอบ / ติดตั้ง / โครงสร้าง', icon: '🔨', color: '#6366f1' },
  { id: 'after', label: '4. หลังเสร็จสิ้น', subLabel: 'ผลงานที่ทำเสร็จสมบูรณ์', icon: '✅', color: '#10b981' },
  { id: 'qc', label: '5. วัดระยะ / QC', subLabel: 'ระดับน้ำ / ตลับเมตร / งานเก็บสี', icon: '📐', color: '#8b5cf6' }
];

interface TimesheetProps {
  timesheets: TimesheetEntry[];
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
  projects: Project[];
  tasks: Task[];
  currentUser: User;
  users?: User[];
}

export const Timesheet = ({ timesheets, setTimesheets, projects, tasks, currentUser, users }: TimesheetProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'personal' | 'team' | 'project'>('personal');
  const [selectedReportProject, setSelectedReportProject] = useState<string>('all');

  // Form states
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [workResults, setWorkResults] = useState('');
  const [entryStatus, setEntryStatus] = useState<TimesheetStatus>('Pending');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasRestored = useRef(false);

  // Auto-save form draft to localStorage
  useEffect(() => {
    if (isModalOpen) {
      const draft = {
        editingEntryId,
        projectId,
        taskId,
        hours,
        startTime,
        endTime,
        description,
        workResults,
        imageUrls,
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
      };
      localStorage.setItem('nt_timesheet_form_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('nt_timesheet_form_draft');
    }
  }, [isModalOpen, editingEntryId, projectId, taskId, hours, startTime, endTime, description, workResults, imageUrls, selectedDate]);

  // Restore form draft on mount
  useEffect(() => {
    if (hasRestored.current) return;
    const savedDraft = localStorage.getItem('nt_timesheet_form_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEditingEntryId(draft.editingEntryId || null);
        setProjectId(draft.projectId || '');
        setTaskId(draft.taskId || '');
        setHours(draft.hours || '');
        setStartTime(draft.startTime || '');
        setEndTime(draft.endTime || '');
        setDescription(draft.description || '');
        setWorkResults(draft.workResults || '');
        setImageUrls(draft.imageUrls || (draft.imageUrl ? [draft.imageUrl] : []));
        if (draft.selectedDate) {
          setSelectedDate(new Date(draft.selectedDate));
        }
        setIsModalOpen(true);
      } catch (e) {
        console.error('Failed to restore timesheet draft:', e);
      }
    }
    hasRestored.current = true;
  }, []);

  // Release camera if modal closes
  useEffect(() => {
    if (!isModalOpen) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsCameraActive(false);
    }
  }, [isModalOpen, stream]);

  const location = useLocation();
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (location.state?.autoOpenLog && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const { projectId: sProjId, taskId: sTaskId, taskTitle } = location.state;
      setIsModalOpen(true);
      setProjectId(sProjId || '');
      setTaskId(sTaskId || '');
      setDescription(taskTitle || '');
      // Clear location state to avoid reopening on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter project-specific tasks. Employees/Users only see tasks assigned to them or unassigned.
  const projectTasks = tasks.filter(t => {
    if (t.projectId !== projectId) return false;
    if (!currentUser) return false;
    if (currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager') return true;
    return !t.assigneeId || t.assigneeId === currentUser.id;
  });

  // Generate calendar grid for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const isAdmin = currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager';
  const allUsers = users || [];
  const teamMembersCount = allUsers.length || 1;

  // Filter entries
  const userEntries = timesheets.filter(ts => ts.userId === currentUser.id);
  const todaysEntries = sortTimesheetsByLastUpdate(userEntries.filter(ts => isSameDay(new Date(ts.date), selectedDate)));
  const totalHoursToday = todaysEntries.reduce((sum, entry) => sum + entry.hours, 0);

  const teamTodaysEntries = timesheets.filter(ts => isSameDay(new Date(ts.date), selectedDate));
  const teamTotalHoursToday = teamTodaysEntries.reduce((sum, entry) => sum + entry.hours, 0);
  
  const teamActiveUsersCount = allUsers.filter(u => 
    timesheets.some(ts => ts.userId === u.id && isSameDay(new Date(ts.date), selectedDate))
  ).length;

  const teamPendingCountToday = teamTodaysEntries.filter(ts => ts.status === 'Pending').length;

  // Project entries for selected date
  const projectTodaysEntries = teamTodaysEntries.filter(ts => selectedReportProject === 'all' || ts.projectId === selectedReportProject);
  const projectTotalHoursToday = projectTodaysEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const projectActiveUsersCount = allUsers.filter(u => 
    projectTodaysEntries.some(ts => ts.userId === u.id)
  ).length;
  const projectPendingCountToday = projectTodaysEntries.filter(ts => ts.status === 'Pending').length;

  // Monthly stats based on view mode
  const thisMonthEntries = timesheets.filter(ts => {
    const entryDate = new Date(ts.date);
    const inMonth = isSameMonth(entryDate, currentMonth);
    if (!inMonth) return false;
    if (isAdmin && viewMode === 'team') return true;
    if (isAdmin && viewMode === 'project') return (selectedReportProject === 'all' || ts.projectId === selectedReportProject);
    return ts.userId === currentUser.id;
  });
  const monthlyHours = thisMonthEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const approvedHours = thisMonthEntries.filter(ts => ts.status === 'Approved').reduce((sum, entry) => sum + entry.hours, 0);
  const pendingHours = thisMonthEntries.filter(ts => ts.status === 'Pending').reduce((sum, entry) => sum + entry.hours, 0);

  // Get unique PMs for pending timesheets
  const pendingProjects = [...new Set(thisMonthEntries.filter(ts => ts.status === 'Pending').map(ts => ts.projectId))];
  const approvers = new Set<string>();
  pendingProjects.forEach(pid => {
    const proj = projects.find(p => p.id === pid);
    if (proj) {
      proj.members.filter(m => m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader').forEach(pm => {
        const user = users?.find(u => u.id === pm.userId);
        if (user) approvers.add(user.name.split(' ')[0]); // Use first name for brevity
      });
    }
  });
  
  const approverNames = Array.from(approvers).join(', ') || 'PM';

  // Check if a date has entries (for dot indicator)
  const dateHasEntries = (d: Date) => {
    if (isAdmin && (viewMode === 'team' || viewMode === 'project')) {
      if (viewMode === 'project' && selectedReportProject !== 'all') {
        return timesheets.some(ts => ts.projectId === selectedReportProject && isSameDay(new Date(ts.date), d));
      }
      return timesheets.some(ts => isSameDay(new Date(ts.date), d));
    }
    return userEntries.some(ts => isSameDay(new Date(ts.date), d));
  };

  const handleApprove = (entryId: string) => {
    setTimesheets(prev => prev.map(ts => {
      if (ts.id === entryId) {
        return { ...ts, status: 'Approved', approvedBy: currentUser.id, approvedAt: new Date().toISOString() };
      }
      return ts;
    }));
  };

  const handleReject = (entryId: string) => {
    if (confirm('Are you sure you want to reject this time entry?')) {
      setTimesheets(prev => prev.map(ts => {
        if (ts.id === entryId) {
          return { ...ts, status: 'Rejected' };
        }
        return ts;
      }));
    }
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown Project';
  const getTaskName = (id?: string) => id ? (tasks.find(t => t.id === id)?.title || 'Unknown Task') : 'General';

  const resetForm = () => {
    setProjectId('');
    setTaskId('');
    setHours('');
    setStartTime('');
    setEndTime('');
    setDescription('');
    setWorkResults('');
    setEntryStatus('Pending');
    setImageUrls([]);
    setEditingEntryId(null);
  };

  const openLogModal = () => {
    resetForm();
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TimesheetEntry) => {
    setProjectId(entry.projectId);
    setTaskId(entry.taskId || '');
    setHours(String(entry.hours));
    setStartTime(entry.startTime || '');
    setEndTime(entry.endTime || '');
    setDescription(entry.description);
    setWorkResults(entry.workResults || '');
    setEntryStatus(entry.status);
    setImageUrls(entry.imageUrls || (entry.imageUrl ? [entry.imageUrl] : []));
    setSelectedDate(new Date(entry.date));
    setEditingEntryId(entry.id);
    setIsModalOpen(true);
  };

  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  const startCamera = async (slotIdx?: number) => {
    if (typeof slotIdx === 'number') {
      setActiveSlotIdx(slotIdx);
    } else {
      const emptyIdx = imageUrls.findIndex((u, i) => !u && i < 5);
      setActiveSlotIdx(emptyIdx !== -1 ? emptyIdx : 0);
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to front camera if environment camera fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
        setIsCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        }, 100);
      } catch (e) {
        alert("Could not access camera. Please check permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setActiveSlotIdx(null);
  };

  const uploadBase64ImageToSlot = async (base64: string, slotIdx: number) => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName: `ts_photo_${slotIdx + 1}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setImageUrls(prev => {
          const next = [...prev];
          next[slotIdx] = data.url;
          return next;
        });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload image');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading captured image');
    } finally {
      setIsUploading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    
    const MAX_SIZE = 800;
    let targetWidth = width;
    let targetHeight = height;
    
    if (width > height && width > MAX_SIZE) {
      targetHeight = Math.round((height * MAX_SIZE) / width);
      targetWidth = MAX_SIZE;
    } else if (height > MAX_SIZE) {
      targetWidth = Math.round((width * MAX_SIZE) / height);
      targetHeight = MAX_SIZE;
    }
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const targetSlot = activeSlotIdx !== null ? activeSlotIdx : 0;
      uploadBase64ImageToSlot(dataUrl, targetSlot);
    }
    stopCamera();
  };

  const handleSingleSlotUpload = (slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            fileName: file.name,
            type: file.type
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setImageUrls(prev => {
            const next = [...prev];
            next[slotIdx] = data.url;
            return next;
          });
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to upload image');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading file');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMultiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const fileList = Array.from(files).slice(0, 5);
      const uploadPromises = fileList.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64 = reader.result as string;
              const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file: base64,
                  fileName: file.name,
                  type: file.type
                })
              });
              if (res.ok) {
                const data = await res.json();
                resolve(data.url);
              } else {
                resolve('');
              }
            } catch (err) {
              resolve('');
            }
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(uploadPromises);
      const validUrls = results.filter(Boolean);
      setImageUrls(prev => {
        const next = [...prev];
        let vIdx = 0;
        for (let i = 0; i < 5 && vIdx < validUrls.length; i++) {
          if (!next[i]) {
            next[i] = validUrls[vIdx++];
          }
        }
        // Fill remaining if still any validUrls
        while (vIdx < validUrls.length) {
          const emptySlot = next.findIndex((u, idx) => !u && idx < 5);
          if (emptySlot !== -1) {
            next[emptySlot] = validUrls[vIdx++];
          } else {
            break;
          }
        }
        return next.slice(0, 5);
      });
    } catch (err) {
      console.error('Multi upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveSlotPhoto = (slotIdx: number) => {
    setImageUrls(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
  };

  // Auto-calculate hours from startTime and endTime
  const calcHoursFromTime = (start: string, end: string) => {
    if (!start || !end) return;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // overnight
    const h = Math.round(diff / 30) * 0.5; // round to nearest 0.5h
    if (h > 0) setHours(String(h));
  };

  const handleStartTimeChange = (v: string) => {
    setStartTime(v);
    calcHoursFromTime(v, endTime);
  };

  const handleEndTimeChange = (v: string) => {
    setEndTime(v);
    calcHoursFromTime(startTime, v);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !hours || !description) return alert('Project, Hours, and Description are required');

    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        return alert(`⚠️ เวลาสิ้นสุด (${endTime} น.) ต้องมากกว่าเวลาเริ่มต้น (${startTime} น.)`);
      }
    }

    if (editingEntryId) {
      const existing = timesheets.find(ts => ts.id === editingEntryId);
      const updatedEntry: TimesheetEntry = {
        ...existing,
        id: editingEntryId,
        userId: existing ? existing.userId : currentUser.id,
        projectId,
        taskId: taskId || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        hours: Number(hours),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description,
        workResults: workResults || undefined,
        status: existing ? existing.status : 'Pending',
        imageUrl: imageUrls.find(Boolean) || undefined,
        imageUrls: imageUrls.filter(Boolean).length > 0 ? imageUrls : undefined
      };
      setTimesheets(prev => prev.map(ts => ts.id === editingEntryId ? updatedEntry : ts));
    } else {
      const newEntry: TimesheetEntry = {
        id: 'ts_' + Date.now(),
        userId: currentUser.id,
        projectId,
        taskId: taskId || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        hours: Number(hours),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description,
        workResults: workResults || undefined,
        status: entryStatus,
        imageUrl: imageUrls.find(Boolean) || undefined,
        imageUrls: imageUrls.filter(Boolean).length > 0 ? imageUrls : undefined
      };
      setTimesheets(prev => [...prev, newEntry]);
    }

    resetForm();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this log entry?')) {
      setTimesheets(prev => prev.filter(ts => ts.id !== id));
    }
  };

  const handleDateClick = (d: Date) => {
    setSelectedDate(d);
    if (!isSameMonth(d, currentMonth)) {
      setCurrentMonth(d);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Timesheet</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Log your hours and track your daily activities.</p>
      </div>

      <div className="timesheet-row" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        
        {/* Left Column: Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Mini Monthly Calendar */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} className="hover-lift">
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} className="hover-lift">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day Names Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '0.25rem' }}>
              {dayNames.map(dn => (
                <div key={dn} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.25rem 0' }}>{dn}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calendarDays.map((d, i) => {
                const isSelected = isSameDay(d, selectedDate);
                const isToday = isSameDay(d, new Date());
                const isCurrentMonth = isSameMonth(d, currentMonth);
                const hasEntries = dateHasEntries(d);

                return (
                  <div
                    key={i}
                    onClick={() => handleDateClick(d)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.3rem 0',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-primary)' : isToday ? 'rgba(0, 206, 209, 0.15)' : 'transparent',
                      color: isSelected ? 'white' : !isCurrentMonth ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      fontSize: '0.8rem',
                      fontWeight: isSelected || isToday ? 700 : 400,
                      position: 'relative',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      border: isToday && !isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      minHeight: '32px'
                    }}
                  >
                    {format(d, 'd')}
                    {hasEntries && (
                      <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: isSelected ? 'white' : 'var(--accent-secondary)',
                        marginTop: '1px'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today Button */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button 
                onClick={() => { setSelectedDate(new Date()); setCurrentMonth(new Date()); }} 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--accent-primary)', 
                  padding: '0.3rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }} 
                className="hover-lift"
              >
                Today
              </button>
            </div>
          </div>

          {/* Daily Entries */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                onClick={() => setViewMode('personal')}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: viewMode === 'personal' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: viewMode === 'personal' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)'
                }}
                className="hover-lift"
              >
                My Timesheet
              </button>
              <button 
                onClick={() => setViewMode('team')}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: viewMode === 'team' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: viewMode === 'team' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)'
                }}
                className="hover-lift"
              >
                👥 Team Daily Report
              </button>
              <button 
                onClick={() => setViewMode('project')}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: viewMode === 'project' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: viewMode === 'project' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)'
                }}
                className="hover-lift"
              >
                📁 Project Daily Report
              </button>
            </div>
          )}

          {viewMode === 'project' && isAdmin ? (
            <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem' }}>Project Daily Report</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Activity log for {format(selectedDate, 'dd/MM/yyyy')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <select 
                    value={selectedReportProject} 
                    onChange={e => setSelectedReportProject(e.target.value)}
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)', 
                      padding: '0.4rem 0.75rem', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    <option value="all" style={{ background: 'var(--bg-secondary)' }}>All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)' }}>{p.name}</option>
                    ))}
                  </select>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{projectTotalHoursToday}h Total Logged</div>
                </div>
              </div>

              {/* Project Statistics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged Hours</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{projectTotalHoursToday}h</span>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Members</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {projectActiveUsersCount} / {allUsers.length}
                  </span>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Approvals</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: projectPendingCountToday > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                    {projectPendingCountToday}
                  </span>
                </div>
              </div>

              {/* Employee Log Cards - Internally scrollable */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: 'calc(100vh - 430px)', overflowY: 'auto', paddingRight: '4px' }}>
                {allUsers.map(user => {
                  const uEntries = sortTimesheetsByLastUpdate(projectTodaysEntries.filter(ts => ts.userId === user.id));
                  if (selectedReportProject !== 'all' && uEntries.length === 0) return null; // Hide users with no entries for this project
                  const userTotalHours = uEntries.reduce((sum, e) => sum + e.hours, 0);

                  return (
                    <div key={user.id} style={{ 
                      padding: '1.25rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={user.avatar} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {user.name}
                              {user.id === currentUser.id && (
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(0, 206, 209, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)' }}>You</span>
                              )}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({user.department})</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: userTotalHours > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                            {userTotalHours}h
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged Today</div>
                        </div>
                      </div>

                      {uEntries.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                          <span>No hours logged for this date.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {uEntries.map(entry => (
                            <div key={entry.id} style={{ 
                              padding: '1rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              borderLeft: `4px solid ${entry.status === 'Approved' ? 'var(--accent-secondary)' : entry.status === 'Pending' ? 'var(--accent-warning)' : entry.status === 'Rejected' ? 'var(--accent-danger)' : 'var(--text-muted)'}`
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{getProjectName(entry.projectId)}</span>
                                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                                    {getTaskName(entry.taskId)}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}><strong>เป้าหมาย:</strong> {entry.description}</p>
                                {entry.workResults && (
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}><strong>ผลการทำงาน:</strong> {entry.workResults}</p>
                                )}
                                {entry.startTime && entry.endTime && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <Clock size={10} />
                                    <span>{entry.startTime} → {entry.endTime}</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{entry.hours}h</div>
                                  {entry.status === 'Approved' ? (
                                    <span style={{ color: 'var(--accent-secondary)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <CheckCircle2 size={12} /> Approved
                                    </span>
                                  ) : entry.status === 'Pending' ? (
                                    <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <Clock size={12} /> Pending
                                    </span>
                                  ) : entry.status === 'Rejected' ? (
                                    <span style={{ color: 'var(--accent-danger)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <XCircle size={12} /> Rejected
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Draft</span>
                                  )}
                                </div>
                                
                                {/* Quick Admin Approval Actions */}
                                {entry.status === 'Pending' && (
                                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleApprove(entry.id)} 
                                      title="Approve time entry"
                                      style={{
                                        background: 'rgba(217, 70, 239, 0.1)',
                                        border: '1px solid rgba(217, 70, 239, 0.2)',
                                        color: 'var(--accent-secondary)',
                                        padding: '0.35rem',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all var(--transition-fast)'
                                      }}
                                      className="hover-lift"
                                    >
                                      <CheckCircle2 size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleReject(entry.id)} 
                                      title="Reject time entry"
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: 'var(--accent-danger)',
                                        padding: '0.35rem',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all var(--transition-fast)'
                                      }}
                                      className="hover-lift"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'team' && isAdmin ? (
            <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem' }}>Team Daily Report</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Activity log for {format(selectedDate, 'dd/MM/yyyy')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{teamTotalHoursToday}h Total Logged</div>
                </div>
              </div>

              {/* Team Statistics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged Hours</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{teamTotalHoursToday}h</span>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Members</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {teamActiveUsersCount} / {allUsers.length}
                  </span>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Approvals</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: teamPendingCountToday > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                    {teamPendingCountToday}
                  </span>
                </div>
              </div>

              {/* Employee Log Cards - Internally scrollable */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: 'calc(100vh - 430px)', overflowY: 'auto', paddingRight: '4px' }}>
                {allUsers.map(user => {
                  const uEntries = timesheets.filter(ts => ts.userId === user.id && isSameDay(new Date(ts.date), selectedDate));
                  const userTotalHours = uEntries.reduce((sum, e) => sum + e.hours, 0);

                  return (
                    <div key={user.id} style={{ 
                      padding: '1.25rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={user.avatar} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {user.name}
                              {user.id === currentUser.id && (
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(0, 206, 209, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)' }}>You</span>
                              )}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({user.department})</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: userTotalHours > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                            {userTotalHours}h
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged Today</div>
                        </div>
                      </div>

                      {uEntries.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                          <span>No hours logged for this date.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {uEntries.map(entry => (
                            <div key={entry.id} style={{ 
                              padding: '1rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              borderLeft: `4px solid ${entry.status === 'Approved' ? 'var(--accent-secondary)' : entry.status === 'Pending' ? 'var(--accent-warning)' : entry.status === 'Rejected' ? 'var(--accent-danger)' : 'var(--text-muted)'}`
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{getProjectName(entry.projectId)}</span>
                                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                                    {getTaskName(entry.taskId)}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}><strong>เป้าหมาย:</strong> {entry.description}</p>
                                {entry.workResults && (
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}><strong>ผลการทำงาน:</strong> {entry.workResults}</p>
                                )}
                                {entry.startTime && entry.endTime && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <Clock size={10} />
                                    <span>{entry.startTime} → {entry.endTime}</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{entry.hours}h</div>
                                  {entry.status === 'Approved' ? (
                                    <span style={{ color: 'var(--accent-secondary)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <CheckCircle2 size={12} /> Approved
                                    </span>
                                  ) : entry.status === 'Pending' ? (
                                    <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <Clock size={12} /> Pending
                                    </span>
                                  ) : entry.status === 'Rejected' ? (
                                    <span style={{ color: 'var(--accent-danger)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                      <XCircle size={12} /> Rejected
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Draft</span>
                                  )}
                                </div>
                                
                                {/* Quick Admin Approval Actions */}
                                {entry.status === 'Pending' && (
                                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleApprove(entry.id)} 
                                      title="Approve time entry"
                                      style={{
                                        background: 'rgba(217, 70, 239, 0.1)',
                                        border: '1px solid rgba(217, 70, 239, 0.2)',
                                        color: 'var(--accent-secondary)',
                                        padding: '0.35rem',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all var(--transition-fast)'
                                      }}
                                      className="hover-lift"
                                    >
                                      <CheckCircle2 size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleReject(entry.id)} 
                                      title="Reject time entry"
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: 'var(--accent-danger)',
                                        padding: '0.35rem',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all var(--transition-fast)'
                                      }}
                                      className="hover-lift"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Entries for {format(selectedDate, 'dd/MM/yyyy')}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{totalHoursToday} Hours Total</div>
                  <button onClick={openLogModal} style={{ 
                    background: 'var(--accent-primary)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.5rem 1rem', 
                    borderRadius: 'var(--radius-md)', 
                    fontWeight: 500, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem'
                  }} className="hover-lift">
                    <Plus size={16} /> Log Time
                  </button>
                </div>
              </div>

              {todaysEntries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)', height: '200px' }}>
                  <Clock size={48} opacity={0.3} />
                  <p>No time logged for this date.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {todaysEntries.map(entry => (
                    <div key={entry.id} style={{ 
                      padding: '1.25rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid var(--accent-primary)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getProjectName(entry.projectId)}</span>
<span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                            {getTaskName(entry.taskId)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}><strong>เป้าหมาย:</strong> {entry.description}</p>
                        {entry.workResults && (
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}><strong>ผลการทำงาน:</strong> {entry.workResults}</p>
                        )}
                        {entry.startTime && entry.endTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Clock size={12} />
                            <span>{entry.startTime} → {entry.endTime}</span>
                          </div>
                        )}
                        {((entry.imageUrls && entry.imageUrls.filter(Boolean).length > 0) || entry.imageUrl) && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {(entry.imageUrls && entry.imageUrls.filter(Boolean).length > 0 ? entry.imageUrls.filter(Boolean) : [entry.imageUrl || '']).map((img, iIdx) => (
                              <div
                                key={iIdx}
                                onClick={() => setPreviewImageUrl(img)}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                                className="hover-lift"
                                title={`ดูรูปภาพที่ ${iIdx + 1}`}
                              >
                                <img src={img} alt={`Proof ${iIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                            <button
                              onClick={() => setPreviewImageUrl((entry.imageUrls && entry.imageUrls.find(Boolean)) || entry.imageUrl || '')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                background: 'rgba(37, 99, 235, 0.08)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                color: '#2563eb',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              className="hover-lift"
                            >
                              <ImageIcon size={12} /> {entry.imageUrls && entry.imageUrls.filter(Boolean).length > 1 ? `ดูหลักฐาน (${entry.imageUrls.filter(Boolean).length} รูป)` : 'ดูรูปหลักฐาน'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{entry.hours}h</div>
                          {entry.status === 'Approved' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-secondary)', fontSize: '0.75rem' }}>
                              <CheckCircle2 size={14} /> Approved
                            </div>
                          ) : entry.status === 'Pending' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-warning)', fontSize: '0.75rem' }}>
                              <Clock size={14} /> Pending
                            </div>
                          ) : entry.status === 'Rejected' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-danger)', fontSize: '0.75rem' }}>
                              <XCircle size={14} /> Rejected
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              Draft
                            </div>
                          )}
                        </div>
                        {(entry.status !== 'Approved' || isAdmin) && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => openEditModal(entry)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-info)', cursor: 'pointer' }} title="Edit log entry">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(entry.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} title="Delete log entry">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Weekly Summary or Quick Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={18} /> Monthly Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isAdmin && viewMode === 'team' ? 'Team Logged' : 'Total Logged'}
                </span>
                <span style={{ fontWeight: 600 }}>{monthlyHours}h</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isAdmin && viewMode === 'team' ? `Target (${teamMembersCount} Users)` : 'Target'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {isAdmin && viewMode === 'team' ? 160 * teamMembersCount : 160}h
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, (monthlyHours / (isAdmin && viewMode === 'team' ? 160 * teamMembersCount : 160)) * 100)}%`, 
                  background: 'var(--accent-secondary)' 
                }} />
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Approval Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-secondary)', borderRadius: '50%' }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{approvedHours}h Approved</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>This month</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', borderRadius: '50%' }}>
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{pendingHours}h Pending</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {isAdmin && viewMode === 'team' ? 'Awaiting review / PM review' : `Awaiting ${approverNames} approval`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Time Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="glass-panel" style={{ padding: '1.75rem', width: '780px', maxWidth: '96%', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {editingEntryId ? 'แก้ไขเวลาทำงาน (Edit Work Time)' : 'บันทึกเวลาทำงาน (Log Work Time)'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>โครงการ (Project) *</label>
                <select 
                  value={projectId} 
                  onChange={e => { setProjectId(e.target.value); setTaskId(''); }}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                  required
                >
                  <option value="">Select Project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>งาน (Task)</label>
                <select 
                  value={taskId} 
                  onChange={e => setTaskId(e.target.value)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                  disabled={!projectId}
                >
                  <option value="">General Work / No Task</option>
                  {projectTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              {/* Visual Time Bar Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ช่วงเวลาทำงาน (Work Period) — ลากเมาส์บนแถบเพื่อเลือกช่วงเวลา
                </label>
                
                {/* Time bar info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {startTime && endTime ? (
                      <>
                        <span style={{ 
                          background: 'rgba(37, 99, 235, 0.12)', 
                          border: '1px solid rgba(37, 99, 235, 0.4)', 
                          padding: '0.3rem 0.75rem', 
                          borderRadius: '6px', 
                          fontWeight: 800, 
                          fontSize: '1.05rem',
                          color: '#2563eb'
                        }}>
                          {startTime}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>→</span>
                        <span style={{ 
                          background: 'rgba(37, 99, 235, 0.12)', 
                          border: '1px solid rgba(37, 99, 235, 0.4)', 
                          padding: '0.3rem 0.75rem', 
                          borderRadius: '6px', 
                          fontWeight: 800, 
                          fontSize: '1.05rem',
                          color: '#2563eb'
                        }}>
                          {endTime}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>คลิกและลากเมาส์บนแถบเวลาด้านล่าง</span>
                    )}
                  </div>
                  {hours && (
                    <span style={{ 
                      background: 'rgba(124, 58, 237, 0.15)', 
                      border: '1px solid rgba(124, 58, 237, 0.4)',
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '6px', 
                      fontWeight: 800, 
                      fontSize: '1.1rem',
                      color: '#7c3aed'
                    }}>
                      {hours} ชม. ({hours}h)
                    </span>
                  )}
                </div>

                {/* Draggable Time Bar */}
                {(() => {
                  const BAR_START = 6; // 06:00
                  const BAR_END = 22;  // 22:00
                  const SLOTS = (BAR_END - BAR_START) * 2; // 30-min slots
                  const slotToTime = (slot: number) => {
                    const h = BAR_START + Math.floor(slot / 2);
                    const m = (slot % 2) * 30;
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  };
                  const timeToSlot = (time: string) => {
                    if (!time) return -1;
                    const [h, m] = time.split(':').map(Number);
                    return (h - BAR_START) * 2 + Math.round(m / 30);
                  };
                  
                  const startSlot = timeToSlot(startTime);
                  const endSlot = timeToSlot(endTime);

                  return (
                    <div
                      style={{
                        position: 'relative',
                        background: 'var(--bg-primary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        userSelect: 'none',
                        cursor: 'crosshair',
                      }}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const slot = Math.max(0, Math.min(SLOTS, Math.round((x / rect.width) * SLOTS)));
                        const time = slotToTime(slot);
                        setStartTime(time);
                        setEndTime('');
                        setHours('');
                        
                        const handleMove = (ev: MouseEvent) => {
                          const mx = ev.clientX - rect.left;
                          const mSlot = Math.max(0, Math.min(SLOTS, Math.round((mx / rect.width) * SLOTS)));
                          if (mSlot !== slot) {
                            const s = Math.min(slot, mSlot);
                            const en = Math.max(slot, mSlot);
                            const sTime = slotToTime(s);
                            const eTime = slotToTime(en);
                            setStartTime(sTime);
                            setEndTime(eTime);
                            const diff = (en - s) * 0.5;
                            if (diff > 0) setHours(String(diff));
                          }
                        };
                        const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove);
                          document.removeEventListener('mouseup', handleUp);
                        };
                        document.addEventListener('mousemove', handleMove);
                        document.addEventListener('mouseup', handleUp);
                      }}
                    >
                      {/* Hour labels */}
                      <div style={{ display: 'flex', height: 22, background: 'var(--bg-tertiary)' }}>
                        {Array.from({ length: BAR_END - BAR_START }, (_, i) => (
                          <div key={i} style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            fontSize: '0.65rem', 
                            color: 'var(--text-primary)',
                            borderLeft: i > 0 ? '1px solid var(--border-color)' : 'none',
                            paddingTop: 3,
                            fontWeight: 800,
                          }}>
                            {String(BAR_START + i).padStart(2, '0')}
                          </div>
                        ))}
                      </div>

                      {/* Slots bar */}
                      <div style={{ display: 'flex', height: 36, position: 'relative' }}>
                        {Array.from({ length: SLOTS }, (_, i) => {
                          const isSelected = startSlot >= 0 && endSlot > startSlot && i >= startSlot && i < endSlot;
                          const isHour = i % 2 === 0;
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                background: isSelected 
                                  ? 'linear-gradient(180deg, rgba(37,99,235,0.45), rgba(37,99,235,0.25))' 
                                  : 'transparent',
                                borderLeft: isHour ? '1px solid var(--border-color)' : '1px dashed rgba(150,150,150,0.2)',
                                transition: 'background 0.1s',
                                position: 'relative',
                              }}
                            >
                              {isSelected && i === startSlot && (
                                <div style={{
                                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                                  background: '#2563eb', borderRadius: 1,
                                  boxShadow: '0 0 6px rgba(37,99,235,0.8)'
                                }} />
                              )}
                              {isSelected && i === endSlot - 1 && (
                                <div style={{
                                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 3,
                                  background: '#2563eb', borderRadius: 1,
                                  boxShadow: '0 0 6px rgba(37,99,235,0.8)'
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom hour ticks */}
                      <div style={{ display: 'flex', height: 6, background: 'var(--bg-tertiary)' }}>
                        {Array.from({ length: BAR_END - BAR_START }, (_, i) => (
                          <div key={i} style={{ 
                            flex: 1, 
                            borderLeft: i > 0 ? '1px solid var(--border-color)' : 'none',
                          }} />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Fine-tune inputs row */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Start</span>
                    <input 
                      type="time" 
                      value={startTime} 
                      onChange={e => handleStartTimeChange(e.target.value)} 
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '0.35rem 0.5rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: 700, flex: 1 }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>End</span>
                    <input 
                      type="time" 
                      value={endTime} 
                      onChange={e => handleEndTimeChange(e.target.value)} 
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '0.35rem 0.5rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: 700, flex: 1 }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Hours</span>
                    <input 
                      type="number" 
                      step="0.5" min="0.5" max="24"
                      value={hours} 
                      onChange={e => setHours(e.target.value)} 
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '0.35rem 0.5rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: 700, flex: 1 }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>เป้าหมาย / Description (Goal/Activity) *</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-primary)', outline: 'none', minHeight: '65px', resize: 'vertical', fontSize: '0.85rem' }}
                  placeholder="รายละเอียดงานที่ทำ หรือเป้าหมายของงาน..."
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>ผลการทำงาน / Work Results (Optional)</label>
                <textarea 
                  value={workResults} 
                  onChange={e => setWorkResults(e.target.value)} 
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-primary)', outline: 'none', minHeight: '65px', resize: 'vertical', fontSize: '0.85rem' }}
                  placeholder="ผลงานที่เสร็จสิ้น ข้อสังเกต หรือปัญหาที่พบ..."
                />
              </div>

              {/* 5-Photo Proof of Work Section */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                {/* Section Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Camera size={18} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ภาพถ่ายหลักฐานการทำงาน (5 มุมมาตรฐาน)
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: imageUrls.filter(Boolean).length > 0 ? '#10b981' : 'var(--text-muted)',
                      background: imageUrls.filter(Boolean).length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      border: '1px solid ' + (imageUrls.filter(Boolean).length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)')
                    }}>
                      แนบแล้ว {imageUrls.filter(Boolean).length}/5 รูป
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      disabled={isUploading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: isUploading ? 'not-allowed' : 'pointer'
                      }}
                      className="hover-lift"
                    >
                      <Camera size={13} style={{ color: '#2563eb' }} /> เปิดกล้อง
                    </button>

                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.7rem',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: 'white',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <Upload size={13} /> {isUploading ? 'กำลังอัปโหลด...' : 'เลือกพร้อมกัน 5 รูป'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultiPhotoUpload}
                        disabled={isUploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Camera Live Preview (If active) */}
                {isCameraActive && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#000',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>
                      กำลังถ่ายสำหรับช่อง: {TIMESHEET_PHOTO_GUIDES[activeSlotIdx ?? 0]?.label}
                    </div>
                    <div style={{ borderRadius: '6px', overflow: 'hidden', width: '100%', maxWidth: '360px', aspectRatio: '4/3', background: '#000' }}>
                      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        style={{ padding: '0.4rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        📸 บันทึกภาพนี้
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* 5-Slot Responsive Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {TIMESHEET_PHOTO_GUIDES.map((guide, sIdx) => {
                    const photoUrl = imageUrls[sIdx] || '';
                    return (
                      <div
                        key={guide.id}
                        style={{
                          border: photoUrl ? '1.5px solid #10b981' : '1px dashed var(--border-color)',
                          borderRadius: '8px',
                          background: 'var(--bg-primary)',
                          padding: '0.4rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem'
                        }}
                      >
                        {/* Slot Header Label */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {guide.icon} {guide.label}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={guide.subLabel}>
                            {guide.subLabel}
                          </span>
                        </div>

                        {/* Slot Box / Thumbnail */}
                        <div style={{
                          position: 'relative',
                          height: '95px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {photoUrl ? (
                            <>
                              <img
                                src={photoUrl}
                                alt={guide.label}
                                style={{ width: '100%', height: '95px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setPreviewImageUrl(photoUrl)}
                              />
                              {/* Overlay actions */}
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                display: 'flex',
                                gap: '3px'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(photoUrl)}
                                  style={{
                                    background: 'rgba(0,0,0,0.65)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    width: '22px',
                                    height: '22px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="ดูรูปขนาดเต็ม"
                                >
                                  <ZoomIn size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlotPhoto(sIdx)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.85)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    width: '22px',
                                    height: '22px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="ลบรูปนี้"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              gap: '0.2rem',
                              padding: '0.25rem',
                              textAlign: 'center'
                            }}>
                              <Camera size={18} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                + ถ่าย / เลือกรูป
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleSingleSlotUpload(sIdx, e)}
                                style={{ display: 'none' }}
                                disabled={isUploading}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>สถานะการส่ง (Submission Status)</label>
                <select 
                  value={entryStatus} 
                  onChange={e => setEntryStatus(e.target.value as TimesheetStatus)}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                >
                  <option value="Pending">ส่งขออนุมัติ (Submit for Approval)</option>
                  <option value="Draft">บันทึกเป็นร่าง (Save as Draft)</option>
                </select>
              </div>

              <button type="submit" style={{ 
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', 
                color: 'white', 
                border: 'none', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                fontWeight: 700, 
                fontSize: '0.95rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
              }} className="hover-lift">
                {editingEntryId ? 'บันทึกการแก้ไข' : 'บันทึกเวลาทำงาน (Log Time Entry)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Proof of Work Image Full-screen Preview Modal */}
      {previewImageUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200
        }} onClick={() => setPreviewImageUrl(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImageUrl(null)} 
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}
            >
              <X size={20} /> Close
            </button>
            <img 
              src={previewImageUrl} 
              alt="Full size proof of work" 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
