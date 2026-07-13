import { useState, useEffect, useRef } from 'react';
import type { TimesheetEntry, User, GlobalRole, Project, ProjectRole } from '../types';
import { Check, X, Clock, Award, Users, Plus, Edit, Trash2, Calendar, Home } from 'lucide-react';
import { formatToDDMMYYYY, sortTimesheetsByLastUpdate } from '../utils';
import { CustomDateInput } from './CustomDateInput';

interface TeamApprovalsProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  timesheets: TimesheetEntry[];
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: any[];
  currentUser: User;
}

export const TeamApprovals = ({ users, setUsers, timesheets, setTimesheets, projects, setProjects, tasks, currentUser }: TeamApprovalsProps) => {
  const [activeTab, setActiveTab] = useState<'team' | 'approvals' | 'wfh'>('team');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // User form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole>('Employee');
  const [department, setDepartment] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('Frontend dev');
  const [customRole, setCustomRole] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [birthday, setBirthday] = useState('');
  const [skills, setSkills] = useState('');
  const [avatar, setAvatar] = useState('');

  // Camera states and refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasRestored = useRef(false);

  // Auto-save form draft to localStorage
  useEffect(() => {
    if (isModalOpen) {
      const draft = {
        editingUserId: editingUser?.id || null,
        name,
        email,
        globalRole,
        department,
        selectedProjectId,
        projectRole,
        customRole,
        gender,
        birthday,
        skills,
        avatar
      };
      localStorage.setItem('nt_employee_form_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('nt_employee_form_draft');
    }
  }, [isModalOpen, editingUser, name, email, globalRole, department, selectedProjectId, projectRole, customRole, gender, birthday, skills, avatar]);

  // Restore form draft on mount / when users list is ready
  useEffect(() => {
    if (hasRestored.current) return;
    
    const savedDraft = localStorage.getItem('nt_employee_form_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setName(draft.name || '');
        setEmail(draft.email || '');
        setGlobalRole(draft.globalRole || 'Employee');
        setDepartment(draft.department || '');
        setSelectedProjectId(draft.selectedProjectId || '');
        setProjectRole(draft.projectRole || 'Frontend dev');
        setCustomRole(draft.customRole || '');
        setGender(draft.gender || '');
        setBirthday(draft.birthday || '');
        setSkills(draft.skills || '');
        setAvatar(draft.avatar || '');
        
        if (draft.editingUserId) {
          if (users.length > 0) {
            const userObj = users.find(u => u.id === draft.editingUserId);
            if (userObj) {
              setEditingUser(userObj);
              hasRestored.current = true;
            }
          }
        } else {
          setEditingUser(null);
          hasRestored.current = true;
        }
        setIsModalOpen(true);
      } catch (err) {
        console.error('Failed to restore form draft:', err);
        hasRestored.current = true;
      }
    } else {
      hasRestored.current = true;
    }
  }, [users]);

  // Stop camera if modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      stopCamera();
    }
  }, [isModalOpen]);

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    setCameraError(null);
    setIsCameraActive(true);
    setFacingMode(mode);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play error:", e));
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องถ่ายภาพได้ (อาจไม่ได้รับอนุญาตหรืออุปกรณ์ไม่รองรับ)');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        
        // Compress/Resize
        const MAX_SIZE = 600;
        let finalWidth = width;
        let finalHeight = height;
        if (width > height && width > MAX_SIZE) {
          finalHeight = Math.round((height * MAX_SIZE) / width);
          finalWidth = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          finalWidth = Math.round((width * MAX_SIZE) / height);
          finalHeight = MAX_SIZE;
        }
        
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = finalWidth;
        resizeCanvas.height = finalHeight;
        const resizeCtx = resizeCanvas.getContext('2d');
        if (resizeCtx) {
          resizeCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
          const compressed = resizeCanvas.toDataURL('image/jpeg', 0.75);
          setAvatar(compressed);
        }
      }
      stopCamera();
    }
  };

  // Filter pending timesheets
  const pendingEntries = sortTimesheetsByLastUpdate(timesheets.filter(ts => ts.status === 'Pending'));

  const calculateAge = (birthdayStr?: string) => {
    if (!birthdayStr) return null;
    const birthDate = new Date(birthdayStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown Project';
  const getTaskName = (id?: string) => id ? (tasks.find(t => t.id === id)?.title || 'Unknown Task') : 'General';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';
  const getUserAvatar = (id: string) => users.find(u => u.id === id)?.avatar || '';

  // Check if current user has approval rights (Admin or PM of any project)
  const isPMorAdmin = currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager' ||
    projects.some(p => p.members?.some(m => m.userId === currentUser.id && (m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader')));

  const handleApprove = (id: string) => {
    setTimesheets(prev => prev.map(ts => ts.id === id ? { ...ts, status: 'Approved', approvedBy: currentUser.id, approvedAt: new Date().toISOString() } : ts));
  };

  const handleReject = (id: string) => {
    setTimesheets(prev => prev.map(ts => ts.id === id ? { ...ts, status: 'Rejected', approvedBy: currentUser.id, approvedAt: new Date().toISOString() } : ts));
  };

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setGlobalRole('Employee');
    setDepartment('');
    setSelectedProjectId('');
    setProjectRole('Frontend dev');
    setCustomRole('');
    setGender('');
    setBirthday('');
    setSkills('');
    setAvatar('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setGlobalRole(user.globalRole);
    setDepartment(user.department);
    setGender(user.gender || '');
    setBirthday(user.birthday || '');
    setSkills(user.skills ? user.skills.join(', ') : '');
    setAvatar(user.avatar || '');
    
    // Find current project membership
    const currentProj = projects.find(p => p.members && p.members.some(m => m.userId === user.id));
    if (currentProj) {
      setSelectedProjectId(currentProj.id);
      const member = currentProj.members.find(m => m.userId === user.id);
      const role = member ? member.role : 'Frontend dev';
      const defaultRoles = ['PM', 'Frontend dev', 'Backend dev', 'QA', 'UX/UI', 'System Analyst'];
      if (defaultRoles.includes(role)) {
        setProjectRole(role);
        setCustomRole('');
      } else {
        setProjectRole('Custom');
        setCustomRole(role);
      }
    } else {
      setSelectedProjectId('');
      setProjectRole('Frontend dev');
      setCustomRole('');
    }
    
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image using Canvas before saving (prevents mobile memory crash)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_SIZE = 600; // max width/height in px
      let { width, height } = img;

      // Scale down proportionally
      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG at 75% quality (~50-100KB)
      const compressed = canvas.toDataURL('image/jpeg', 0.75);
      setAvatar(compressed);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };


  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return alert('Name and Email are required');
    if (!editingUser && !password) return alert('Password is required for new employee');

    const userId = editingUser ? editingUser.id : 'u_' + Date.now();
    const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    
    const userData: User = {
      id: userId,
      name,
      email,
      globalRole,
      department,
      gender,
      birthday,
      skills: skillsArray,
      avatar: avatar || `https://i.pravatar.cc/150?u=${userId}`,
      ...(password ? { password } : {})
    };

    // 1. Update users list
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? userData : u));
    } else {
      setUsers(prev => [...prev, userData]);
    }

    // 2. Update projects membership
    setProjects(prevProjects => {
      return prevProjects.map(proj => {
        // Remove user from this project if it's not the selected one
        if (proj.id !== selectedProjectId) {
          return {
            ...proj,
            members: proj.members ? proj.members.filter(m => m.userId !== userId) : []
          };
        }
        
        // If it is the selected project, add/update the user membership
        const membersList = proj.members || [];
        const isAlreadyMember = membersList.some(m => m.userId === userId);
        
        const roleToAdd = projectRole === 'Custom' ? customRole : projectRole;
        
        if (isAlreadyMember) {
          return {
            ...proj,
            members: membersList.map(m => m.userId === userId ? { ...m, role: roleToAdd } : m)
          };
        } else {
          return {
            ...proj,
            members: [...membersList, { userId, role: roleToAdd }]
          };
        }
      });
    });

    setIsModalOpen(false);
    showToast(editingUser ? '✅ อัปเดตข้อมูลพนักงานสำเร็จ!' : '✅ เพิ่มพนักงานใหม่สำเร็จ!');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to remove this employee?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('🗑️ ลบพนักงานออกจากระบบแล้ว', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
          background: toast.type === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
          color: 'white', padding: '0.875rem 1.25rem', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: '0.95rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'slideInRight 0.3s ease',
          maxWidth: '320px'
        }}>
          {toast.msg}
        </div>
      )}
      {/* Top Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Team & Approvals</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage team members and approve timesheet submissions.</p>
        </div>
        {activeTab === 'team' && (
          <button onClick={openAddModal} style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', 
            fontWeight: 500, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }} className="hover-lift">
            <Plus size={18} /> Add Employee
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('team')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'team' ? 'var(--text-primary)' : 'var(--text-muted)',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'team' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Team Directory
          </div>
        </button>
        {isPMorAdmin && (
        <button 
          onClick={() => setActiveTab('approvals')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'approvals' ? 'var(--text-primary)' : 'var(--text-muted)',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'approvals' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> Pending Approvals 
            {pendingEntries.length > 0 && (
              <span style={{ fontSize: '0.75rem', background: 'var(--accent-danger)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)' }}>
                {pendingEntries.length}
              </span>
            )}
          </div>
        </button>
        )}
        <button 
          onClick={() => setActiveTab('wfh')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'wfh' ? 'var(--text-primary)' : 'var(--text-muted)',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'wfh' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> WFH Schedule
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'team' ? (
        /* Team Directory */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {users.map(user => {
            const userProjectRoles = projects
              .filter(p => p.members && p.members.some((m: any) => m.userId === user.id))
              .map(p => {
                const member = p.members.find((m: any) => m.userId === user.id);
                return { 
                  projectName: p.name, 
                  role: member ? member.role : '',
                  startDate: p.startDate,
                  endDate: p.endDate
                };
              });

             return (
              <div key={user.id} className="glass-panel hover-lift team-member-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <div className="member-card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img src={user.avatar} alt={user.name} style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
                  <div className="member-info" style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{user.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: 'var(--radius-sm)', 
                        fontWeight: 600,
                        background: user.globalRole === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : 
                                    user.globalRole === 'Manager' ? 'rgba(59, 130, 246, 0.1)' : 
                                    user.globalRole === 'Employee' ? 'rgba(16, 185, 129, 0.1)' : 
                                    'rgba(245, 158, 11, 0.1)',
                        color: user.globalRole === 'Admin' ? '#EF4444' : 
                               user.globalRole === 'Manager' ? '#3B82F6' : 
                               user.globalRole === 'Employee' ? '#10B981' : 
                               '#F59E0B',
                        border: user.globalRole === 'Admin' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                                user.globalRole === 'Manager' ? '1px solid rgba(59, 130, 246, 0.2)' : 
                                user.globalRole === 'Employee' ? '1px solid rgba(16, 185, 129, 0.2)' : 
                                '1px solid rgba(245, 158, 11, 0.2)',
                      }}>
                        {user.globalRole === 'User' ? 'User / บุคคลภายนอก' : user.globalRole}
                      </span>
                      {user.department && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          • {user.department}
                        </span>
                      )}
                    </div>
                    
                    {(user.gender || user.birthday) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {user.gender && <span>{user.gender}</span>}
                        {user.gender && user.birthday && <span> • </span>}
                        {user.birthday && (
                          <span>
                            {user.birthday} ({calculateAge(user.birthday)} yrs)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="member-email" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                      {user.email}
                    </div>

                    {user.skills && user.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                        {user.skills.map((skill, idx) => (
                          <span key={idx} style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.1rem 0.4rem', 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-secondary)', 
                            borderRadius: 'var(--radius-sm)' 
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="member-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => openEditModal(user)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Display Project Specific Roles */}
                {userProjectRoles.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Project Roles:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {userProjectRoles.map((pr, idx) => (
                        <span key={idx} style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          background: 'rgba(99, 102, 241, 0.1)', 
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          color: 'var(--accent-primary)', 
                          borderRadius: 'var(--radius-sm)' 
                        }}>
                          {pr.projectName} ({pr.role})
                          {pr.startDate && <span style={{ marginLeft: '4px', opacity: 0.8 }}>• {formatToDDMMYYYY(pr.startDate)} {pr.endDate ? `to ${formatToDDMMYYYY(pr.endDate)}` : '(Present)'}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : activeTab === 'approvals' ? (
        /* Approvals Queue */
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '300px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Pending Timesheet Submissions</h3>
          
          {pendingEntries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)', height: '200px' }}>
              <Award size={48} opacity={0.3} />
              <p>All timesheets have been processed. Great job!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingEntries.map(entry => (
                <div key={entry.id} style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--accent-warning)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={getUserAvatar(entry.userId)} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{getUserName(entry.userId)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatToDDMMYYYY(entry.date)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getProjectName(entry.projectId)}</span> ({getTaskName(entry.taskId)}): {entry.description}
                      </div>
                      {entry.startTime && entry.endTime && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)',
                          marginTop: '0.35rem'
                        }}>
                          <Clock size={11} style={{ color: 'var(--accent-primary)', verticalAlign: 'middle' }} />
                          <span>{entry.startTime} – {entry.endTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      {/* Actual hours logged */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{entry.hours}h</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>actual</span>
                      </div>
                      {/* Planned hours row — only shown when plannedHours is stored */}
                      {entry.plannedHours != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plan: {entry.plannedHours}h</span>
                          {entry.hours !== entry.plannedHours && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background: entry.hours > entry.plannedHours
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(16,185,129,0.15)',
                              color: entry.hours > entry.plannedHours
                                ? 'var(--accent-danger)'
                                : 'var(--accent-secondary)'
                            }}>
                              {entry.hours > entry.plannedHours ? '+' : ''}{(entry.hours - entry.plannedHours).toFixed(1)}h
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleApprove(entry.id)}
                        style={{ 
                          background: 'rgba(16, 185, 129, 0.2)', 
                          color: 'var(--accent-secondary)', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: 'var(--radius-md)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="hover-lift"
                        title="Approve"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleReject(entry.id)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: 'var(--accent-danger)', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: 'var(--radius-md)', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="hover-lift"
                        title="Reject"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* WFH Planner Schedule */
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Home size={18} color="var(--accent-primary)" /> Weekly Work From Home (WFH) Planner
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Set your planned WFH days for this week. Admins and Managers can monitor all schedules in one view.
            </p>
          </div>
          
          <div style={{ overflowX: 'auto', maxHeight: '450px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', width: '220px' }}>Employee</th>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <th key={day} style={{ padding: '1rem', textAlign: 'center' }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const userWfhDays = user.wfhDays || [];
                  const isSelf = currentUser.id === user.id;

                  const toggleWfhDay = (day: string) => {
                    if (!isSelf) return;
                    let nextDays = [...userWfhDays];
                    if (nextDays.includes(day)) {
                      nextDays = nextDays.filter(d => d !== day);
                    } else {
                      nextDays.push(day);
                    }
                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, wfhDays: nextDays } : u));
                    showToast(`Updated WFH days for ${day}`);
                  };

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', height: '56px' }}>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                          alt={user.name} 
                          style={{ width: '28px', height: '28px', borderRadius: '50%' }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name} {isSelf && '(You)'}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.department || 'Staff'}</span>
                        </div>
                      </td>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const isChecked = userWfhDays.includes(day);
                        return (
                          <td key={day} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              disabled={!isSelf}
                              onChange={() => toggleWfhDay(day)}
                              style={{ 
                                cursor: isSelf ? 'pointer' : 'not-allowed',
                                width: '18px',
                                height: '18px',
                                accentColor: 'var(--accent-primary)',
                                opacity: isSelf ? 1 : 0.7
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
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
          <div className="glass-panel" style={{ 
            padding: 0,
            width: '650px', 
            maxWidth: '95vw', 
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex', 
            flexDirection: 'column',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 className="text-gradient" style={{ fontSize: '1.4rem', margin: 0 }}>{editingUser ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Scrollable fields area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Full Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email *</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Password {editingUser ? '' : '*'}</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder={editingUser ? 'Leave blank to keep existing password' : 'Enter password'}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  required={!editingUser}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department</label>
                <input 
                  type="text" 
                  value={department} 
                  onChange={e => setDepartment(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</label>
                <select 
                  value={globalRole} 
                  onChange={e => setGlobalRole(e.target.value as GlobalRole)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Project Assignment</label>
                <select 
                  value={selectedProjectId} 
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">None</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Project Role</label>
                  <select 
                    value={projectRole} 
                    onChange={e => setProjectRole(e.target.value as ProjectRole)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="PM">PM (Project Manager)</option>
                    <option value="Frontend dev">Frontend dev</option>
                    <option value="Backend dev">Backend dev</option>
                    <option value="QA">QA</option>
                    <option value="UX/UI">UX/UI</option>
                    <option value="System Analyst">System Analyst</option>
                    <option value="Custom">Custom Role...</option>
                  </select>
                </div>
              )}

              {projectRole === 'Custom' && selectedProjectId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Custom Project Role Name</label>
                  <input 
                    type="text" 
                    value={customRole} 
                    onChange={e => setCustomRole(e.target.value)} 
                    placeholder="e.g. DevOps Engineer"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Gender</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value as any)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="">Unspecified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Birthday</label>
                  <CustomDateInput 
                    value={birthday} 
                    onChange={e => setBirthday(e.target.value)} 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.45rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Skills (Comma-separated)</label>
                <input 
                  type="text" 
                  value={skills} 
                  placeholder="e.g. React, TypeScript, Node.js"
                  onChange={e => setSkills(e.target.value)} 
                  list="common-skills"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                />
                <datalist id="common-skills">
                  <option value="React" />
                  <option value="TypeScript" />
                  <option value="Node.js" />
                  <option value="Docker" />
                  <option value="DevOps" />
                  <option value="Go" />
                  <option value="Python" />
                  <option value="PostgreSQL" />
                  <option value="Figma" />
                  <option value="UI/UX" />
                </datalist>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Profile Picture</label>
                
                {isCameraActive ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem', 
                    background: 'var(--bg-tertiary)', 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    alignItems: 'center'
                  }}>
                    {cameraError ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                        <div style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                          ⚠️ {cameraError}
                        </div>
                        <label style={{ 
                          width: '100%',
                          maxWidth: '240px',
                          background: 'var(--accent-primary)', 
                          padding: '0.6rem', 
                          borderRadius: 'var(--radius-md)', 
                          fontSize: '0.75rem', 
                          textAlign: 'center', 
                          cursor: 'pointer',
                          color: 'white',
                          display: 'block',
                          fontWeight: 600
                        }} className="hover-lift">
                          📸 Take Photo (Use System Camera)
                          <input 
                            type="file" 
                            accept="image/*"
                            capture="user"
                            onChange={(e) => {
                              handleFileChange(e);
                              stopCamera();
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        maxWidth: '320px', 
                        aspectRatio: '4/3', 
                        overflow: 'hidden', 
                        borderRadius: 'var(--radius-md)', 
                        background: '#000',
                        border: '2px solid var(--accent-primary)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                      }}>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {!cameraError && (
                        <>
                          <button 
                            type="button"
                            onClick={capturePhoto}
                            style={{ 
                              background: 'var(--accent-primary)', 
                              color: 'white', 
                              border: 'none', 
                              padding: '0.6rem 1.25rem', 
                              borderRadius: 'var(--radius-md)', 
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            className="hover-lift"
                          >
                            📸 Capture
                          </button>
                          <button 
                            type="button"
                            onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                            style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              border: '1px solid var(--border-color)', 
                              padding: '0.6rem 1rem', 
                              borderRadius: 'var(--radius-md)', 
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer' 
                            }}
                            className="hover-lift"
                          >
                            🔄 Switch Camera
                          </button>
                        </>
                      )}
                      <button 
                        type="button"
                        onClick={stopCamera}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: 'var(--accent-danger)', 
                          border: 'none', 
                          padding: '0.6rem 1rem', 
                          borderRadius: 'var(--radius-md)', 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer' 
                        }}
                        className="hover-lift"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {avatar ? (
                      <img src={avatar} alt="Preview" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border-color)' }}>No Pic</div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label style={{ 
                          flex: 1,
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-color)', 
                          padding: '0.5rem', 
                          borderRadius: 'var(--radius-md)', 
                          fontSize: '0.75rem', 
                          textAlign: 'center', 
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          display: 'block'
                        }} className="hover-lift">
                          📁 Choose Photo
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        
                        <button 
                          type="button"
                          onClick={() => startCamera('user')}
                          style={{ 
                            flex: 1,
                            background: 'var(--accent-primary)', 
                            border: 'none',
                            padding: '0.5rem', 
                            borderRadius: 'var(--radius-md)', 
                            fontSize: '0.75rem', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            color: 'white',
                            display: 'block',
                            fontFamily: 'inherit',
                            fontWeight: 500
                          }} 
                          className="hover-lift"
                        >
                          📸 Take Photo
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={avatar} 
                        placeholder="Or paste Image URL"
                        onChange={e => setAvatar(e.target.value)} 
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {selectedProjectId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role in Project</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      value={projectRole} 
                      onChange={e => setProjectRole(e.target.value)}
                      style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="Frontend dev">Frontend dev</option>
                      <option value="Backend dev">Backend dev</option>
                      <option value="PM">PM</option>
                      <option value="SA">SA</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="DevOps">DevOps</option>
                      <option value="QC">QC</option>
                      <option value="Designer">Designer</option>
                      <option value="Custom">Custom Role...</option>
                    </select>

                    {projectRole === 'Custom' && (
                      <input 
                        type="text" 
                        placeholder="Type role..."
                        value={customRole}
                        onChange={e => setCustomRole(e.target.value)}
                        style={{ flex: 1.5, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    )}
                  </div>
                </div>
              )}

              </div>{/* end scrollable fields */}

              {/* Save button — always visible at bottom */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                <button type="submit" style={{ 
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--accent-primary), #4f46e5)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  fontSize: '1rem',
                  letterSpacing: '0.5px',
                }} className="hover-lift">
                  💾 บันทึก / Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
