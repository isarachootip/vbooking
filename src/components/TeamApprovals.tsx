import { useState, useEffect, useRef } from 'react';
import type { TimesheetEntry, User, GlobalRole, Project, ProjectRole } from '../types';
import { Check, X, Clock, Award, Users, Plus, Edit, Trash2, Calendar, Home, LayoutGrid, List, MapPin } from 'lucide-react';
import { formatToDDMMYYYY, sortTimesheetsByLastUpdate } from '../utils';
import { SiteVisitApprovalManager } from './SiteVisitApprovalManager';

interface TeamApprovalsProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  timesheets: TimesheetEntry[];
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: any[];
  currentUser: User;
  branches?: any[];
}

export const TeamApprovals = ({ users, setUsers, timesheets, setTimesheets, projects, setProjects, tasks, currentUser, branches = [] }: TeamApprovalsProps) => {
  const [activeTab, setActiveTab] = useState<'team' | 'approvals' | 'wfh' | 'site_visits'>('team');
  const [pendingSiteVisitsCount, setPendingSiteVisitsCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('team_view_mode') as 'card' | 'list') || 'card';
  });

  const toggleViewMode = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('team_view_mode', mode);
  };

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

  // Technician Detail Profile & ID Card Form states
  const [modalViewMode, setModalViewMode] = useState<'card' | 'list'>('card');
  const [taxId, setTaxId] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardFiles, setIdCardFiles] = useState<Array<{ name: string; url?: string; type?: string; selected?: boolean }>>([]);
  const [companyName, setCompanyName] = useState('');
  const [lineId, setLineId] = useState('');
  const [phones, setPhones] = useState<string[]>(['082-137-1123']);
  const [jobTypes, setJobTypes] = useState<string[]>(['ติดตั้ง', 'service MTN']);
  const [serviceZones, setServiceZones] = useState<string[]>(['นครปฐม', 'ราชบุรี']);
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const [workSlots, setWorkSlots] = useState<string[]>(['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2']);
  const [certificates, setCertificates] = useState<Array<{ name: string; url?: string; type?: string; selected?: boolean }>>([
    { name: 'cert_elec.jpg', selected: true },
    { name: 'cert_aircon.pdf', selected: true },
    { name: 'resume_draft.txt', selected: true }
  ]);
  const [criminalRecord, setCriminalRecord] = useState('ไม่มี');
  const [creditTermDays, setCreditTermDays] = useState(30);
  const [technicianLevel, setTechnicianLevel] = useState('Standard');

  const hasRestored = useRef(false);

  const formatThaiIdCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    let formatted = '';
    if (digits.length > 0) formatted += digits.substring(0, 1);
    if (digits.length > 1) formatted += '-' + digits.substring(1, 5);
    if (digits.length > 5) formatted += '-' + digits.substring(5, 10);
    if (digits.length > 10) formatted += '-' + digits.substring(10, 12);
    if (digits.length > 12) formatted += '-' + digits.substring(12, 13);
    return formatted;
  };

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
        avatar,
        taxId,
        idCardNumber,
        idCardFiles,
        companyName,
        lineId,
        phones,
        jobTypes,
        serviceZones,
        assignedBranches,
        assignedZones,
        workSlots,
        certificates,
        criminalRecord,
        creditTermDays,
        technicianLevel
      };
      localStorage.setItem('nt_employee_form_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('nt_employee_form_draft');
    }
  }, [isModalOpen, editingUser, name, email, globalRole, department, selectedProjectId, projectRole, customRole, gender, birthday, skills, avatar, taxId, idCardNumber, idCardFiles, companyName, lineId, phones, jobTypes, serviceZones, assignedBranches, assignedZones, workSlots, certificates, criminalRecord, creditTermDays, technicianLevel]);

  const fetchPendingSiteVisitsCount = async () => {
    try {
      const res = await fetch('/api/leads/site-visits?status=Pending', {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingSiteVisitsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {
      console.error('Failed to fetch pending site visits count:', e);
    }
  };

  useEffect(() => {
    fetchPendingSiteVisitsCount();
  }, [activeTab]);

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
        setTaxId(draft.taxId || '');
        setIdCardNumber(draft.idCardNumber || '1-2345-67890-12-3');
        setIdCardFiles(draft.idCardFiles || [{ name: 'id_card_front.jpg', selected: true }]);
        setCompanyName(draft.companyName || '');
        setLineId(draft.lineId || '');
        setPhones(draft.phones || ['082-137-1123']);
        setJobTypes(draft.jobTypes || ['ติดตั้ง', 'service MTN']);
        setServiceZones(draft.serviceZones || ['นครปฐม', 'ราชบุรี']);
        setAssignedBranches(draft.assignedBranches || []);
        setAssignedZones(draft.assignedZones || []);
        setWorkSlots(draft.workSlots || ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2']);
        setCertificates(draft.certificates || [
          { name: 'cert_elec.jpg', selected: true },
          { name: 'cert_aircon.pdf', selected: true },
          { name: 'resume_draft.txt', selected: true }
        ]);
        setCriminalRecord(draft.criminalRecord || 'ไม่มี');
        setCreditTermDays(draft.creditTermDays != null ? draft.creditTermDays : 30);
        setTechnicianLevel(draft.technicianLevel || 'Standard');
        
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

  // Filter pending timesheets
  const pendingEntries = sortTimesheetsByLastUpdate(timesheets.filter(ts => ts.status === 'Pending'));

  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
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
    setDepartment('Technician / Site');
    setSelectedProjectId('');
    setProjectRole('ช่างติดตั้ง');
    setCustomRole('');
    setGender('');
    setBirthday('');
    setSkills('งานไฟฟ้า, ติดตั้งแอร์');
    setAvatar('');
    setTaxId('1-2345-67890-12-3');
    setIdCardNumber('1-2345-67890-12-3');
    setIdCardFiles([{ name: 'id_card_front.jpg', selected: true }]);
    setCompanyName('ทีมช่างสมชาย เมธากุล (เทคทีม)');
    setLineId('somchai_id');
    setPhones(['082-137-1123']);
    setJobTypes(['ติดตั้ง', 'service MTN']);
    setServiceZones(['นครปฐม', 'ราชบุรี']);
    setAssignedBranches([]);
    setAssignedZones([]);
    setWorkSlots(['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2']);
    setCertificates([
      { name: 'cert_elec.jpg', selected: true },
      { name: 'cert_aircon.pdf', selected: true },
      { name: 'resume_draft.txt', selected: true }
    ]);
    setCriminalRecord('ไม่มี');
    setCreditTermDays(30);
    setTechnicianLevel('Standard');
    setModalViewMode('card');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setGlobalRole(user.globalRole);
    setDepartment(user.department || 'Technician / Site');
    setGender(user.gender || '');
    setBirthday(user.birthday || '');
    setSkills(user.skills ? user.skills.join(', ') : 'งานไฟฟ้า, ติดตั้งแอร์');
    setAvatar(user.avatar || '');
    setTaxId(user.taxId || '1-2345-67890-12-3');
    setIdCardNumber(user.idCardNumber || '1-2345-67890-12-3');
    setIdCardFiles(user.idCardFiles && user.idCardFiles.length > 0 ? user.idCardFiles : [{ name: 'id_card_front.jpg', selected: true }]);
    setCompanyName(user.companyName || user.name);
    setLineId(user.lineId || '');
    setPhones(user.phones && user.phones.length > 0 ? user.phones : ['082-137-1123']);
    setJobTypes(user.jobTypes && user.jobTypes.length > 0 ? user.jobTypes : ['ติดตั้ง', 'service MTN']);
    setServiceZones(user.serviceZones && user.serviceZones.length > 0 ? user.serviceZones : ['นครปฐม', 'ราชบุรี']);
    setAssignedBranches(user.assignedBranches && user.assignedBranches.length > 0 ? user.assignedBranches : []);
    setAssignedZones(user.assignedZones && user.assignedZones.length > 0 ? user.assignedZones : []);
    setWorkSlots(user.workSlots && user.workSlots.length > 0 ? user.workSlots : ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2']);
    setCertificates(user.certificates && user.certificates.length > 0 ? user.certificates : [
      { name: 'cert_elec.jpg', selected: true },
      { name: 'cert_aircon.pdf', selected: true },
      { name: 'resume_draft.txt', selected: true }
    ]);
    setCriminalRecord(user.criminalRecord || 'ไม่มี');
    setCreditTermDays(user.creditTermDays != null ? user.creditTermDays : 30);
    setTechnicianLevel(user.technicianLevel || 'Standard');
    setModalViewMode('card');
    
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
    const skillsArray = skills ? (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(s => s.length > 0) : skills) : [];
    
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
      ...(password ? { password } : {}),
      taxId,
      idCardNumber,
      idCardFiles,
      companyName,
      lineId,
      phones,
      jobTypes,
      serviceZones,
      assignedBranches,
      assignedZones,
      workSlots,
      certificates,
      criminalRecord,
      creditTermDays,
      technicianLevel
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
    showToast(editingUser ? '💾 บันทึกข้อมูลช่างเรียบร้อย' : '✨ เพิ่มข้อมูลช่างเข้าสู่ระบบเรียบร้อย');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* View Mode Toggle (Card / List) */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '0.2rem' 
            }}>
              <button
                type="button"
                onClick={() => toggleViewMode('card')}
                title="Card View (แสดงแบบการ์ด)"
                style={{
                  background: viewMode === 'card' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'card' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <LayoutGrid size={16} /> Card
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('list')}
                title="List View (แสดงแบบรายการ)"
                style={{
                  background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <List size={16} /> List
              </button>
            </div>

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
          </div>
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
        {isPMorAdmin && (
        <button 
          onClick={() => setActiveTab('site_visits')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'site_visits' ? '#ea580c' : 'var(--text-muted)',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'site_visits' ? '2px solid #ea580c' : '2px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#ea580c" /> อนุมัตินัดหมายออก Site (GM Approval)
            {pendingSiteVisitsCount > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#ea580c', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>
                {pendingSiteVisitsCount}
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
        viewMode === 'card' ? (
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
                                      user.globalRole === 'QC' ? 'rgba(6, 182, 212, 0.1)' : 
                                      user.globalRole === 'Employee' ? 'rgba(16, 185, 129, 0.1)' : 
                                      'rgba(245, 158, 11, 0.1)',
                          color: user.globalRole === 'Admin' ? '#EF4444' : 
                                 user.globalRole === 'Manager' ? '#3B82F6' : 
                                 user.globalRole === 'QC' ? '#06B6D4' : 
                                 user.globalRole === 'Employee' ? '#10B981' : 
                                 '#F59E0B',
                          border: user.globalRole === 'Admin' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                                  user.globalRole === 'Manager' ? '1px solid rgba(59, 130, 246, 0.2)' : 
                                  user.globalRole === 'QC' ? '1px solid rgba(6, 182, 212, 0.2)' : 
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

                      {/* Assigned Branches for QC / Managers */}
                      {user.assignedBranches && user.assignedBranches.length > 0 && (
                        <div style={{ marginTop: '0.45rem', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={12} style={{ flexShrink: 0 }} />
                          <span>
                            <strong>ดูแล {user.assignedBranches.length} สาขา</strong> {user.assignedZones && user.assignedZones.length > 0 ? `(${user.assignedZones.join(', ')})` : ''}
                          </span>
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
        ) : (
          /* List View (Table Format) */
          <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>พนักงาน (Employee)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>อีเมล (Email)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>สิทธิ์ระบบ (Role)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>แผนก (Department)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>บทบาทในโครงการ (Project Roles)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>จัดการ (Actions)</th>
                </tr>
              </thead>
              <tbody>
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
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', height: '64px' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <img src={user.avatar} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{user.name}</div>
                            {(user.gender || user.birthday) && (
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                {user.gender && <span>{user.gender}</span>}
                                {user.gender && user.birthday && <span> • </span>}
                                {user.birthday && <span>{user.birthday} ({calculateAge(user.birthday)} yrs)</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: 'var(--radius-sm)', 
                          fontWeight: 600,
                          background: user.globalRole === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : 
                                      user.globalRole === 'Manager' ? 'rgba(59, 130, 246, 0.1)' : 
                                      user.globalRole === 'QC' ? 'rgba(6, 182, 212, 0.1)' : 
                                      user.globalRole === 'Employee' ? 'rgba(16, 185, 129, 0.1)' : 
                                      'rgba(245, 158, 11, 0.1)',
                          color: user.globalRole === 'Admin' ? '#EF4444' : 
                                 user.globalRole === 'Manager' ? '#3B82F6' : 
                                 user.globalRole === 'QC' ? '#06B6D4' : 
                                 user.globalRole === 'Employee' ? '#10B981' : 
                                 '#F59E0B',
                          border: user.globalRole === 'Admin' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                                  user.globalRole === 'Manager' ? '1px solid rgba(59, 130, 246, 0.2)' : 
                                  user.globalRole === 'QC' ? '1px solid rgba(6, 182, 212, 0.2)' : 
                                  user.globalRole === 'Employee' ? '1px solid rgba(16, 185, 129, 0.2)' : 
                                  '1px solid rgba(245, 158, 11, 0.2)',
                        }}>
                          {user.globalRole === 'User' ? 'User / บุคคลภายนอก' : user.globalRole}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {user.department || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {userProjectRoles.length > 0 ? (
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
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => openEditModal(user)} 
                            title="Edit"
                            style={{ 
                              background: 'var(--bg-tertiary)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-secondary)', 
                              padding: '0.35rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.8rem'
                            }}
                            className="hover-lift"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)} 
                            title="Delete"
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.1)', 
                              border: '1px solid rgba(239, 68, 68, 0.2)', 
                              color: '#EF4444', 
                              padding: '0.35rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.8rem'
                            }}
                            className="hover-lift"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
      ) : activeTab === 'site_visits' ? (
        /* Site Visit Approvals & Sales Assignment Manager */
        <SiteVisitApprovalManager 
          currentUser={currentUser}
          users={users}
          onRefreshParent={fetchPendingSiteVisitsCount}
        />
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

      {/* User Add/Edit Modal: Detail Profile ช่าง | Personal Information & Work Settings */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ 
            padding: 0,
            width: '1100px', 
            maxWidth: '98vw', 
            maxHeight: '94vh',
            overflow: 'hidden',
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            background: 'var(--bg-secondary)'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              background: '#0f172a',
              borderBottom: '1px solid rgba(255,255,255,0.1)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexShrink: 0,
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  background: '#f59e0b', 
                  color: '#000', 
                  fontWeight: 800, 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '6px',
                  letterSpacing: '0.5px'
                }}>
                  STEP 1 OF 5
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Detail Profile ช่าง <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>| Personal Information & Work Settings</span>
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* View Mode Toggle inside modal */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('card')}
                    style={{
                      background: modalViewMode === 'card' ? '#f59e0b' : 'transparent',
                      color: modalViewMode === 'card' ? '#000' : '#94a3b8',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <LayoutGrid size={14} /> แบบการ์ด (Card View)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('list')}
                    style={{
                      background: modalViewMode === 'list' ? '#f59e0b' : 'transparent',
                      color: modalViewMode === 'list' ? '#000' : '#94a3b8',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <List size={14} /> แบบรายการ (List View)
                  </button>
                </div>

                <button 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#0b0f19' }}>
                {modalViewMode === 'card' ? (
                  /* CARD VIEW: 3 Columns Grid */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                    
                    {/* Column 1: ข้อมูลส่วนตัวและติดต่อ */}
                    <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#38bdf8', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700 }}>ข้อมูลส่วนตัวและติดต่อ (Personal & Contact Info)</h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ชื่อ-นามสกุล ช่าง * (Full Name *)</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          placeholder="ทีมช่างสมชาย เมธากุล (เทคทีม)"
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>เบอร์โทร * (Phone Number *)</label>
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>(เลือกได้มากกว่า 1 เบอร์)</span>
                        </div>
                        {phones.map((phone, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.35rem' }}>
                            <input 
                              type="text" 
                              value={phone} 
                              onChange={e => {
                                const next = [...phones];
                                next[idx] = e.target.value;
                                setPhones(next);
                              }}
                              placeholder="082-137-1123"
                              style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                              required={idx === 0}
                            />
                            {phones.length > 1 && (
                              <button type="button" onClick={() => setPhones(phones.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPhones([...phones, ''])}
                          style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '8px', padding: '0.45rem', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.2rem' }}
                        >
                          + เพิ่มเบอร์โทรศัพท์
                        </button>
                      </div>

                      {/* เลขบัตรประชาชน / เลขผู้เสียภาษี */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>เลขผู้เสียภาษี / ID Card * (13 หลัก)</label>
                        <input 
                          type="text" 
                          value={idCardNumber || taxId} 
                          onChange={e => {
                            const formatted = formatThaiIdCard(e.target.value);
                            setIdCardNumber(formatted);
                            setTaxId(formatted);
                          }} 
                          placeholder="1-2345-67890-12-3"
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                          required
                        />
                      </div>

                      {/* สำเนา/รูปถ่ายบัตรประชาชน Attach ID Card */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          💳 แนบรูป/สำเนาบัตรประชาชน (Attach ID Card Photo)
                        </label>
                        <label style={{ 
                          border: '2px dashed #334155', 
                          borderRadius: '8px', 
                          padding: '0.75rem', 
                          textAlign: 'center', 
                          cursor: 'pointer',
                          background: '#0f172a',
                          color: '#94a3b8',
                          fontSize: '0.75rem'
                        }}>
                          📷 คลิกแนบไฟล์บัตรประชาชน หรือลากไฟล์มาวาง
                          <input 
                            type="file" 
                            accept="image/*,.pdf" 
                            multiple 
                            style={{ display: 'none' }} 
                            onChange={e => {
                              const files = e.target.files;
                              if (!files) return;
                              Array.from(files).forEach(f => {
                                setIdCardFiles(prev => [...prev, { name: f.name, selected: true }]);
                              });
                            }}
                          />
                        </label>
                        {idCardFiles.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                            {idCardFiles.map((file, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #334155' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={file.selected !== false} 
                                    onChange={e => {
                                      const next = [...idCardFiles];
                                      next[idx].selected = e.target.checked;
                                      setIdCardFiles(next);
                                    }}
                                    style={{ accentColor: '#38bdf8' }}
                                  />
                                  <span>💳 {file.name}</span>
                                </label>
                                <button type="button" onClick={() => setIdCardFiles(idCardFiles.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ชื่อบริษัท / ร้าน</label>
                        <input 
                          type="text" 
                          value={companyName} 
                          onChange={e => setCompanyName(e.target.value)} 
                          placeholder="ทีมช่างสมชาย เมธากุล (เทคทีม)"
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>อีเมล * (Email *)</label>
                        <input 
                          type="email" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          placeholder="somchai@email.com"
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>LINE ID</label>
                        <input 
                          type="text" 
                          value={lineId} 
                          onChange={e => setLineId(e.target.value)} 
                          placeholder="somchai_id"
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      {/* Profile Picture */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>รูปโปรไฟล์ ช่าง (Profile Avatar)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={avatar || `https://i.pravatar.cc/150?u=${name}`} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38bdf8' }} />
                          <label style={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            📁 เปลี่ยนรูป
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: ข้อมูลทักษะและงาน */}
                    <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a855f7', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700 }}>ข้อมูลทักษะและงาน (Skills & Services)</h3>
                      </div>

                      {/* ทักษะและความเชี่ยวชาญ */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ทักษะและความเชี่ยวชาญ *</label>
                          <span style={{ fontSize: '0.7rem', color: '#a855f7' }}>(เลือกได้มากกว่า 1)</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: '#0f172a', padding: '0.6rem', borderRadius: '8px', border: '1px solid #334155', minHeight: '44px' }}>
                          {(typeof skills === 'string' ? skills.split(',').map(s=>s.trim()).filter(Boolean) : skills).map((sk, idx) => (
                            <span key={idx} style={{ background: '#334155', color: 'white', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {sk}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => {
                                const arr = typeof skills === 'string' ? skills.split(',').map(s=>s.trim()).filter(Boolean) : skills;
                                setSkills(arr.filter((_, i) => i !== idx).join(', '));
                              }} />
                            </span>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="+ พิมพ์ทักษะแล้วกด Enter (เช่น งานไฟฟ้า, ติดตั้งแอร์)" 
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                const currentArr = typeof skills === 'string' ? skills.split(',').map(s=>s.trim()).filter(Boolean) : skills;
                                setSkills([...currentArr, val].join(', '));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                        />
                      </div>

                      {/* ประเภทงานที่รับ */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ประเภทงานที่รับ * (Job Types *)</label>
                          <span style={{ fontSize: '0.7rem', color: '#a855f7' }}>(เลือกได้มากกว่า 1)</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: '#0f172a', padding: '0.6rem', borderRadius: '8px', border: '1px solid #334155', minHeight: '44px' }}>
                          {jobTypes.map((jt, idx) => (
                            <span key={idx} style={{ background: '#334155', color: 'white', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {jt}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setJobTypes(jobTypes.filter((_, i) => i !== idx))} />
                            </span>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="+ เพิ่มประเภทงาน (พิมพ์แล้วกด Enter)" 
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                setJobTypes([...jobTypes, val]);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                        />
                      </div>

                      {/* โซน / จังหวัดที่รับงาน */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>โซน / จังหวัดที่รับงาน * (Service Zones *)</label>
                          <span style={{ fontSize: '0.7rem', color: '#a855f7' }}>(เลือกได้มากกว่า 1)</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: '#0f172a', padding: '0.6rem', borderRadius: '8px', border: '1px solid #334155', minHeight: '44px' }}>
                          {serviceZones.map((sz, idx) => (
                            <span key={idx} style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              📍 {sz}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setServiceZones(serviceZones.filter((_, i) => i !== idx))} />
                            </span>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="+ พิมพ์จังหวัด/โซน แล้วกด Enter" 
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                setServiceZones([...serviceZones, val]);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                        />
                      </div>

                      {/* สาขา & โซนในความรับผิดชอบ (Assigned Branches & Regional Zones for QC / Supervisors) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: '#0f172a', padding: '0.75rem', borderRadius: '10px', border: '1px solid #06b6d4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            🏢 สาขาในความดูแล * (สำหรับ QC / ผู้จัดการ)
                          </label>
                          <span style={{ fontSize: '0.7rem', color: '#67e8f9', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            เลือกแล้ว {assignedBranches.length} สาขา
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                          กดเลือกทั้งโซน/ภาค หรือเลือกรายสาขาเพื่อมอบหมายให้ QC ดูแล
                        </p>

                        {/* Regional Zone Selector Tabs / Quick Toggles */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {[
                            { name: 'กรุงเทพฯ & ปริมณฑล', emoji: '🏙️', count: 30 },
                            { name: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', emoji: '🌾', count: 20 },
                            { name: 'ภาคเหนือ', emoji: '⛰️', count: 13 },
                            { name: 'ภาคตะวันออก', emoji: '🌊', count: 13 },
                            { name: 'ภาคกลาง & ตะวันตก', emoji: '🏞️', count: 11 },
                            { name: 'ภาคใต้', emoji: '🌴', count: 8 },
                          ].map(z => {
                            const zoneBranches = branches.filter(b => b.zone === z.name || (z.name === 'ภาคกลาง & ตะวันตก' && b.zone?.includes('ภาคกลาง')));
                            const isAllSelected = zoneBranches.length > 0 && zoneBranches.every(b => assignedBranches.includes(b.id));
                            const someSelected = zoneBranches.some(b => assignedBranches.includes(b.id));

                            const toggleZone = () => {
                              const zoneBranchIds = zoneBranches.map(b => b.id);
                              if (isAllSelected) {
                                setAssignedBranches(prev => prev.filter(id => !zoneBranchIds.includes(id)));
                                setAssignedZones(prev => prev.filter(zn => zn !== z.name));
                              } else {
                                setAssignedBranches(prev => Array.from(new Set([...prev, ...zoneBranchIds])));
                                setAssignedZones(prev => Array.from(new Set([...prev, z.name])));
                              }
                            };

                            return (
                              <button
                                key={z.name}
                                type="button"
                                onClick={toggleZone}
                                style={{
                                  background: isAllSelected ? '#0891b2' : someSelected ? 'rgba(6, 182, 212, 0.2)' : '#1e293b',
                                  color: isAllSelected ? 'white' : someSelected ? '#67e8f9' : '#94a3b8',
                                  border: isAllSelected ? '1px solid #22d3ee' : someSelected ? '1px solid #0891b2' : '1px solid #334155',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  fontWeight: isAllSelected ? 700 : 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                {z.emoji} {z.name} ({zoneBranches.length || z.count}) {isAllSelected ? '✓' : ''}
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Branches Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '110px', overflowY: 'auto', background: '#1e293b', padding: '0.45rem', borderRadius: '6px', border: '1px solid #334155' }}>
                          {assignedBranches.length === 0 ? (
                            <span style={{ fontSize: '0.73rem', color: '#64748b' }}>ยังไม่ได้เลือกสาขา (กดปุ่มโซนด้านบน หรือเลือกจากรายการด้านล่าง)</span>
                          ) : (
                            assignedBranches.map(bId => {
                              const bObj = branches.find(b => b.id === bId);
                              return (
                                <span key={bId} style={{ background: 'rgba(6, 182, 212, 0.18)', color: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.35)', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  🏢 [{bObj?.code || bId}] {bObj?.name || bId}
                                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setAssignedBranches(prev => prev.filter(id => id !== bId))} />
                                </span>
                              );
                            })
                          )}
                        </div>

                        {/* Individual Branch Selector Dropdown */}
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <select
                            onChange={e => {
                              const val = e.target.value;
                              if (val && !assignedBranches.includes(val)) {
                                setAssignedBranches(prev => [...prev, val]);
                                const bObj = branches.find(b => b.id === val);
                                if (bObj?.zone && !assignedZones.includes(bObj.zone)) {
                                  setAssignedZones(prev => [...prev, bObj.zone]);
                                }
                              }
                              e.target.value = '';
                            }}
                            style={{
                              flex: 1,
                              background: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '0.4rem 0.6rem',
                              color: 'white',
                              fontSize: '0.78rem'
                            }}
                          >
                            <option value="">+ เลือกเพิ่มทีละสาขา (คลิกเพื่อเลือก)...</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.id} disabled={assignedBranches.includes(b.id)}>
                                [{b.code}] {b.name} ({b.province}) - {b.zone || ''}
                              </option>
                            ))}
                          </select>

                          {assignedBranches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setAssignedBranches([]); setAssignedZones([]); }}
                              style={{ background: 'transparent', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.72rem', padding: '0.35rem 0.55rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              ล้างสาขาทั้งหมด
                            </button>
                          )}
                        </div>
                      </div>

                      {/* รอบเวลารับงานต่อวัน */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>รอบเวลารับงานต่อวัน * (Slots / Day *)</label>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>เพิ่มช่วงเวลาได้อิสระ</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {workSlots.map((slot, idx) => (
                            <span key={idx} style={{ background: '#0f172a', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              ⏰ {slot}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setWorkSlots(workSlots.filter((_, i) => i !== idx))} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: เอกสารและประวัติ & เงื่อนไขทางการค้า */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Section 3: เอกสารและประวัติ */}
                      <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700 }}>เอกสารและประวัติ (Availability & Docs)</h3>
                        </div>

                        {/* แนบรูป Certificate */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>แนบรูป Certificate (Attach Certificates)</label>
                          <label style={{ 
                            border: '2px dashed #334155', 
                            borderRadius: '8px', 
                            padding: '1rem', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            background: '#0f172a',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <span style={{ fontSize: '1.2rem' }}>📤</span>
                            <span>Drag and drop file upload หรือคลิกเลือกไฟล์</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf,.doc,.docx,.txt" 
                              multiple 
                              style={{ display: 'none' }} 
                              onChange={e => {
                                const files = e.target.files;
                                if (!files) return;
                                Array.from(files).forEach(f => {
                                  setCertificates(prev => [...prev, { name: f.name, selected: true }]);
                                });
                              }}
                            />
                          </label>

                          {/* Certificate File List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {certificates.map((cert, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={cert.selected !== false} 
                                    onChange={e => {
                                      const next = [...certificates];
                                      next[idx].selected = e.target.checked;
                                      setCertificates(next);
                                    }}
                                    style={{ accentColor: '#3b82f6' }}
                                  />
                                  <span>📄 {cert.name}</span>
                                </label>
                                <button type="button" onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ประวัติอาชญากรรม */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ประวัติอาชญากรรม * (Criminal Record *)</label>
                          <select 
                            value={criminalRecord} 
                            onChange={e => setCriminalRecord(e.target.value)}
                            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                          >
                            <option value="ไม่มี">ไม่มี (Clean Record)</option>
                            <option value="มี (แนบเอกสารชี้แจง)">มี (แนบเอกสารชี้แจง)</option>
                            <option value="อยู่ระหว่างตรวจสอบ">อยู่ระหว่างตรวจสอบ</option>
                          </select>
                        </div>
                      </div>

                      {/* Section 5: เงื่อนไขทางการค้าและระดับ */}
                      <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f59e0b', color: '#000', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>5</span>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700 }}>เงื่อนไขทางการค้าและระดับ (Financial & Level)</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Credit Term (วัน) *</label>
                            <input 
                              type="number" 
                              value={creditTermDays} 
                              onChange={e => setCreditTermDays(parseInt(e.target.value) || 0)} 
                              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ระดับช่าง (Level)</label>
                            <select 
                              value={technicianLevel} 
                              onChange={e => setTechnicianLevel(e.target.value)}
                              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                            >
                              <option value="Standard">Standard</option>
                              <option value="Silver">Silver</option>
                              <option value="Gold">Gold</option>
                              <option value="VIP">VIP</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* LIST VIEW: Structured Step-by-Step Vertical List */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '900px', margin: '0 auto' }}>
                    
                    {/* List Section 1: ข้อมูลส่วนตัวและติดต่อ */}
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#38bdf8', fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                        1. ข้อมูลส่วนตัวและติดต่อ (Personal & Contact Info)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ชื่อ-นามสกุล ช่าง *</label>
                          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>เลขผู้เสียภาษี / ID Card *</label>
                          <input type="text" value={idCardNumber || taxId} onChange={e => { const f = formatThaiIdCard(e.target.value); setIdCardNumber(f); setTaxId(f); }} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>เบอร์โทร *</label>
                          <input type="text" value={phones[0] || ''} onChange={e => setPhones([e.target.value])} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>อีเมล *</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ชื่อบริษัท / ร้าน</label>
                          <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>LINE ID</label>
                          <input type="text" value={lineId} onChange={e => setLineId(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                      </div>

                      {/* ID Card attachments in List view */}
                      <div style={{ marginTop: '1rem', borderTop: '1px dashed #334155', paddingTop: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>💳 เอกสาร/สำเนาบัตรประชาชน (ID Card Documents):</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                          {idCardFiles.map((f, idx) => (
                            <span key={idx} style={{ background: '#0f172a', border: '1px solid #38bdf8', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              💳 {f.name}
                            </span>
                          ))}
                          <label style={{ background: '#0f172a', border: '1px dashed #334155', color: '#94a3b8', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            + เพิ่มสำเนาบัตรประชาชน
                            <input type="file" accept="image/*,.pdf" onChange={e => { if (e.target.files?.[0]) setIdCardFiles([...idCardFiles, { name: e.target.files[0].name, selected: true }]); }} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* List Section 2: ข้อมูลทักษะและงาน */}
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#a855f7', fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                        2. ข้อมูลทักษะและงาน (Skills & Services)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ทักษะและความเชี่ยวชาญ:</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {(typeof skills === 'string' ? skills.split(',').map(s=>s.trim()).filter(Boolean) : skills).map((sk, idx) => (
                              <span key={idx} style={{ background: '#334155', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>{sk}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ประเภทงานที่รับ:</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {jobTypes.map((jt, idx) => (
                              <span key={idx} style={{ background: '#334155', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>{jt}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>โซน / จังหวัดที่รับงาน:</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {serviceZones.map((sz, idx) => (
                              <span key={idx} style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>📍 {sz}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* List Section 3: เอกสารและประวัติ (Availability & Docs) */}
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#10b981', fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                        3. เอกสารและประวัติ (Availability & Docs)
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Certificate Attachments in List view */}
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                            แนบรูป Certificate (Attach Certificates)
                          </label>
                          
                          <label style={{ 
                            border: '2px dashed #334155', 
                            borderRadius: '8px', 
                            padding: '0.85rem', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            background: '#0f172a',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            display: 'block',
                            marginBottom: '0.75rem'
                          }}>
                            📤 Drag and drop file upload หรือคลิกเลือกไฟล์
                            <input 
                              type="file" 
                              accept="image/*,.pdf,.doc,.docx,.txt" 
                              multiple 
                              style={{ display: 'none' }} 
                              onChange={e => {
                                const files = e.target.files;
                                if (!files) return;
                                Array.from(files).forEach(f => {
                                  setCertificates(prev => [...prev, { name: f.name, selected: true }]);
                                });
                              }}
                            />
                          </label>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {certificates.map((cert, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={cert.selected !== false} 
                                    onChange={e => {
                                      const next = [...certificates];
                                      next[idx].selected = e.target.checked;
                                      setCertificates(next);
                                    }}
                                    style={{ accentColor: '#3b82f6' }}
                                  />
                                  <span>📄 {cert.name}</span>
                                </label>
                                <button type="button" onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>ประวัติอาชญากรรม * (Criminal Record *)</label>
                          <select 
                            value={criminalRecord} 
                            onChange={e => setCriminalRecord(e.target.value)}
                            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem' }}
                          >
                            <option value="ไม่มี">ไม่มี (Clean Record)</option>
                            <option value="มี (แนบเอกสารชี้แจง)">มี (แนบเอกสารชี้แจง)</option>
                            <option value="อยู่ระหว่างตรวจสอบ">อยู่ระหว่างตรวจสอบ</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* List Section 5: เงื่อนไขทางการค้าและระดับ */}
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f59e0b', fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                        5. เงื่อนไขทางการค้าและระดับ (Financial & Level)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Credit Term (วัน) *</label>
                          <input type="number" value={creditTermDays} onChange={e => setCreditTermDays(parseInt(e.target.value) || 0)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ระดับช่าง (Level)</label>
                          <select value={technicianLevel} onChange={e => setTechnicianLevel(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '0.5rem', color: 'white', fontSize: '0.85rem' }}>
                            <option value="Standard">Standard</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="VIP">VIP</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Modal Footer / Save Bar */}
              <div style={{ 
                padding: '1rem 1.5rem', 
                background: '#0f172a', 
                borderTop: '1px solid rgba(255,255,255,0.1)', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '1rem',
                flexShrink: 0
              }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ยกเลิก / Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                    color: '#000', 
                    border: 'none', 
                    padding: '0.75rem 2rem', 
                    borderRadius: '8px', 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                  }} 
                  className="hover-lift"
                >
                  💾 บันทึกข้อมูลช่าง / Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
