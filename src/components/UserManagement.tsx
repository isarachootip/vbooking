import React, { useState, useMemo } from 'react';
import type { User, GlobalRole, Project } from '../types';
import { 
  Users, UserPlus, Search, Edit3, Trash2, Key, Eye, LayoutGrid, List, 
  Download, ShieldCheck, Building2, Calendar, Check, X, 
  CheckCircle2, AlertTriangle, Shield, UserCheck, Briefcase, ClipboardCheck
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  projects?: Project[];
  currentUser: User;
  fetchInitialData?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
];

const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'จันทร์ (Mon)' },
  { id: 'Tue', label: 'อังคาร (Tue)' },
  { id: 'Wed', label: 'พุธ (Wed)' },
  { id: 'Thu', label: 'พฤหัสบดี (Thu)' },
  { id: 'Fri', label: 'ศุกร์ (Fri)' },
  { id: 'Sat', label: 'เสาร์ (Sat)' },
  { id: 'Sun', label: 'อาทิตย์ (Sun)' }
];

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  setUsers,
  projects = [],
  currentUser,
  fetchInitialData
}) => {
  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Toast message
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form Fields
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<GlobalRole>('Employee');
  const [formDept, setFormDept] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [formBirthday, setFormBirthday] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('');
  const [formServiceZonesText, setFormServiceZonesText] = useState('');
  const [formAvatar, setFormAvatar] = useState(PRESET_AVATARS[0]);
  const [formWfhDays, setFormWfhDays] = useState<string[]>([]);

  // Unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.skills && user.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchRole = roleFilter === 'ALL' || user.globalRole === roleFilter;
      const matchDept = deptFilter === 'ALL' || user.department === deptFilter;

      return matchSearch && matchRole && matchDept;
    });
  }, [users, searchTerm, roleFilter, deptFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter(u => u.globalRole === 'Admin' || u.globalRole === 'Manager').length;
    const employeeCount = users.filter(u => u.globalRole === 'Employee' || u.globalRole === 'User').length;
    const wfhCount = users.filter(u => u.wfhDays && u.wfhDays.length > 0).length;
    return { total, adminCount, employeeCount, wfhCount, deptsCount: departments.length };
  }, [users, departments]);

  // Open Form Modal for Create / Edit
  const openCreateModal = () => {
    setEditingUser(null);
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('Employee');
    setFormDept('Installation');
    setFormGender('');
    setFormBirthday('');
    setFormSkillsText('');
    setFormServiceZonesText('');
    setFormAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
    setFormWfhDays([]);
    setIsFormModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const fullName = (user.name || '').trim();
    const spaceIdx = fullName.indexOf(' ');
    if (spaceIdx !== -1) {
      setFormFirstName(fullName.substring(0, spaceIdx));
      setFormLastName(fullName.substring(spaceIdx + 1).trim());
    } else {
      setFormFirstName(fullName);
      setFormLastName('');
    }
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.globalRole || 'Employee');
    setFormDept(user.department || '');
    setFormGender(user.gender || '');
    setFormBirthday(user.birthday || '');
    setFormSkillsText((user.skills || []).join(', '));
    setFormServiceZonesText((user.serviceZones || user.assignedBranches || []).join(', '));
    setFormAvatar(user.avatar || PRESET_AVATARS[0]);
    setFormWfhDays(user.wfhDays || []);
    setIsFormModalOpen(true);
  };

  // Toggle Day Off Day
  const handleToggleWfhDay = (dayId: string) => {
    setFormWfhDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  // Submit User Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${formFirstName.trim()} ${formLastName.trim()}`.trim();
    if (!formFirstName.trim() || !formEmail.trim()) {
      showToast('กรุณากรอกชื่อและอีเมลให้ครบถ้วน', 'error');
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      showToast('กรุณากรอกรหัสผ่านสำหรับผู้ใช้งานใหม่', 'error');
      return;
    }

    const userId = editingUser ? editingUser.id : `usr-${Date.now()}`;
    const skillsList = formSkillsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const serviceZonesList = formServiceZonesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      id: userId,
      name: fullName,
      email: formEmail.trim(),
      avatar: formAvatar,
      globalRole: formRole,
      department: formDept.trim() || 'General',
      gender: formGender,
      birthday: formBirthday,
      skills: skillsList,
      serviceZones: serviceZonesList,
      assignedBranches: serviceZonesList,
      password: formPassword.trim() || undefined,
      wfhDays: formWfhDays
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save user');
      }

      // Update local state
      const newUserObj: User = {
        id: userId,
        name: payload.name,
        email: payload.email,
        avatar: payload.avatar,
        globalRole: payload.globalRole,
        department: payload.department,
        gender: payload.gender as any,
        birthday: payload.birthday,
        skills: payload.skills,
        serviceZones: payload.serviceZones,
        assignedBranches: payload.assignedBranches,
        wfhDays: payload.wfhDays
      };

      setUsers(prev => {
        const exists = prev.some(u => u.id === userId);
        if (exists) {
          return prev.map(u => u.id === userId ? { ...u, ...newUserObj } : u);
        }
        return [...prev, newUserObj];
      });

      showToast(editingUser ? 'แก้ไขข้อมูลผู้ใช้งานสำเร็จ' : 'เพิ่มผู้ใช้งานใหม่สำเร็จแล้ว');
      setIsFormModalOpen(false);
      if (fetchInitialData) fetchInitialData();
    } catch (err: any) {
      console.error('Error saving user:', err);
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      showToast('ไม่สามารถลบผู้ใช้งานที่กำลังใช้งานอยู่ได้', 'error');
      setUserToDelete(null);
      return;
    }

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      showToast(`ลบผู้ใช้งาน "${userToDelete.name}" เรียบร้อยแล้ว`);
      setUserToDelete(null);
      if (fetchInitialData) fetchInitialData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showToast(`ลบไม่สำเร็จ: ${err.message}`, 'error');
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser || !newPassword.trim()) {
      showToast('กรุณากรอกรหัสผ่านใหม่', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/users/${passwordUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() })
      });

      if (!res.ok) throw new Error('Failed to update password');

      showToast(`รีเซ็ตรหัสผ่านของ "${passwordUser.name}" สำเร็จแล้ว`);
      setIsPasswordModalOpen(false);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showToast(`รีเซ็ตรหัสผ่านไม่สำเร็จ: ${err.message}`, 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Gender', 'Birthday', 'Skills', 'WFH Days'];
    const rows = filteredUsers.map(u => [
      `"${u.id}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.globalRole}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${u.gender || ''}"`,
      `"${u.birthday || ''}"`,
      `"${(u.skills || []).join('; ')}"`,
      `"${(u.wfhDays || []).join('; ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('ส่งออกข้อมูลผู้ใช้งานเป็น CSV สำเร็จแล้ว');
  };

  // Role Badge Styling
  const renderRoleBadge = (role: GlobalRole) => {
    switch (role) {
      case 'Admin':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.15)', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={12} /> Admin</span>;
      case 'Manager':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Shield size={12} /> Manager</span>;
      case 'QC':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ClipboardCheck size={12} /> QC</span>;
      case 'Employee':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><UserCheck size={12} /> Employee</span>;
      default:
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>{role}</span>;
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: toast.type === 'success' ? 'var(--accent-primary, #2563eb)' : '#ef4444',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 500,
          animation: 'fadeIn 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users style={{ color: 'var(--accent-primary, #2563eb)' }} />
            จัดการผู้ใช้งานระบบ (User Management)
          </h1>
          <p style={{ color: 'var(--text-secondary, #6b7280)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            บริหารจัดการสิทธิ์ ข้อมูลพนักงาน และกำหนดตาราง WFH
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            className="glass-panel hover-lift"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e5e7eb)',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            <Download size={16} /> Export CSV
          </button>

          <button
            onClick={openCreateModal}
            className="hover-lift"
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <UserPlus size={18} /> เพิ่มผู้ใช้งานใหม่
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>ผู้ใช้งานทั้งหมด</span>
            <Users size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {stats.total} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>คน</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>ผู้ดูแล & ผู้จัดการ</span>
            <ShieldCheck size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {stats.adminCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>คน</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>พนักงานทั่วไป</span>
            <UserCheck size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {stats.employeeCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>คน</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>กำหนดวันหยุด</span>
            <Calendar size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {stats.wfhCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>คน</span>
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ, อีเมล, แผนก หรือ ทักษะ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.6rem 0.6rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #d1d5db)',
                background: 'var(--input-bg, #ffffff)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #d1d5db)',
              background: 'var(--input-bg, #ffffff)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          >
            <option value="ALL">ทุกบทบาท (All Roles)</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="QC">QC</option>
            <option value="Employee">Employee</option>
            <option value="User">User</option>
          </select>

          {/* Dept Filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #d1d5db)',
              background: 'var(--input-bg, #ffffff)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          >
            <option value="ALL">ทุกแผนก (All Departments)</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* View Switcher */}
          <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.55rem 0.75rem',
                border: 'none',
                background: viewMode === 'table' ? 'var(--accent-primary, #2563eb)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="มุมมองตาราง"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.55rem 0.75rem',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--accent-primary, #2563eb)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="มุมมองการ์ด"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredUsers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</h3>
          <p style={{ fontSize: '0.875rem' }}>ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองบทบาท/แผนก</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="glass-panel" style={{ borderRadius: '12px', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color, #e5e7eb)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>ผู้ใช้งาน</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>บทบาท (Global Role)</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>แผนก</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>ทักษะ (Skills)</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>วันหยุดประจำสัปดาห์</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color, #f3f4f6)', transition: 'background 0.2s' }} className="hover-highlight">
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={user.avatar || PRESET_AVATARS[0]}
                          alt={user.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color, #e5e7eb)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {user.name}
                            {user.id === currentUser.id && (
                              <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '8px' }}>คุณ</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      {renderRoleBadge(user.globalRole)}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--badge-bg, rgba(0,0,0,0.05))', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                        <Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {user.department || 'General'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                        {user.skills && user.skills.length > 0 ? (
                          user.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontSize: '0.725rem' }}>
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>-</span>
                        )}
                        {user.skills && user.skills.length > 3 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>+{user.skills.length - 3}</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {user.wfhDays && user.wfhDays.length > 0 ? (
                          user.wfhDays.map(d => (
                            <span key={d} style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontSize: '0.7rem', fontWeight: 600 }}>
                              {d}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>ไม่มี</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => { setSelectedUserDetail(user); setIsDetailModalOpen(true); }}
                          title="ดูรายละเอียด"
                          style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px' }}
                          className="hover-bg"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          title="แก้ไขข้อมูล"
                          style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', borderRadius: '6px' }}
                          className="hover-bg"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => { setPasswordUser(user); setIsPasswordModalOpen(true); }}
                          title="รีเซ็ตรหัสผ่าน"
                          style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer', borderRadius: '6px' }}
                          className="hover-bg"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          title="ลบผู้ใช้งาน"
                          style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }}
                          className="hover-bg"
                          disabled={user.id === currentUser.id}
                        >
                          <Trash2 size={16} style={{ opacity: user.id === currentUser.id ? 0.3 : 1 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="glass-panel hover-lift"
              style={{
                borderRadius: '12px',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e5e7eb)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <img
                    src={user.avatar || PRESET_AVATARS[0]}
                    alt={user.name}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color, #e5e7eb)' }}
                  />
                  {renderRoleBadge(user.globalRole)}
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                  {user.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', wordBreak: 'break-all' }}>
                  {user.email}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--badge-bg, rgba(0,0,0,0.05))', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    🏢 {user.department || 'General'}
                  </span>
                  {user.gender && (
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--badge-bg, rgba(0,0,0,0.05))', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      👤 {user.gender}
                    </span>
                  )}
                </div>

                {user.skills && user.skills.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Skills:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {user.skills.map((s, idx) => (
                        <span key={idx} style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontSize: '0.725rem' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: '0.85rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => { setSelectedUserDetail(user); setIsDetailModalOpen(true); }}
                  style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Eye size={14} /> รายละเอียด
                </button>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => openEditModal(user)}
                    style={{ padding: '0.35rem', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px' }}
                    title="แก้ไข"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => { setPasswordUser(user); setIsPasswordModalOpen(true); }}
                    style={{ padding: '0.35rem', border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer', borderRadius: '4px' }}
                    title="ตั้งรหัสผ่านใหม่"
                  >
                    <Key size={15} />
                  </button>
                  <button
                    onClick={() => setUserToDelete(user)}
                    style={{ padding: '0.35rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}
                    title="ลบ"
                    disabled={user.id === currentUser.id}
                  >
                    <Trash2 size={15} style={{ opacity: user.id === currentUser.id ? 0.3 : 1 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isFormModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e5e7eb)', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingUser ? <Edit3 size={20} color="#2563eb" /> : <UserPlus size={20} color="#2563eb" />}
                {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
              {/* Avatar Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  รูปโปรไฟล์ (Avatar)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <img src={formAvatar} alt="Selected avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>เลือกจากพรีเซ็ต หรือกรอก URL รูปภาพ:</div>
                    <input
                      type="text"
                      value={formAvatar}
                      onChange={e => setFormAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {PRESET_AVATARS.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Preset ${i}`}
                      onClick={() => setFormAvatar(url)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: formAvatar === url ? '2px solid #2563eb' : '1px solid transparent',
                        opacity: formAvatar === url ? 1 : 0.7
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Grid Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>ชื่อ <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={e => setFormFirstName(e.target.value)}
                    placeholder="สมชาย"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>นามสกุล</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={e => setFormLastName(e.target.value)}
                    placeholder="ใจดี"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>อีเมล <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="somchai@company.com"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>รหัสผ่านเริ่มต้น <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>บทบาทในระบบ (Global Role)</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as GlobalRole)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  >
                    <option value="Admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                    <option value="Manager">Manager (ผู้จัดการโครงการ)</option>
                    <option value="QC">QC (ฝ่ายตรวจสอบคุณภาพ)</option>
                    <option value="Employee">Employee (พนักงาน/ช่างทั่วไป)</option>
                    <option value="User">User (ผู้ใช้งานทั่วไป)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>แผนก / ฝ่าย</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={e => setFormDept(e.target.value)}
                    placeholder="เช่น Installation, Dev, HR"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>เพศ</label>
                  <select
                    value={formGender}
                    onChange={e => setFormGender(e.target.value as any)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    <option value="Male">ชาย (Male)</option>
                    <option value="Female">หญิง (Female)</option>
                    <option value="Other">อื่นๆ (Other)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>วันเกิด (Birthday)</label>
                  <input
                    type="date"
                    value={formBirthday}
                    onChange={e => setFormBirthday(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>ทักษะความชำนาญ (แยกด้วยเครื่องหมายจุลภาค ,)</label>
                <input
                  type="text"
                  value={formSkillsText}
                  onChange={e => setFormSkillsText(e.target.value)}
                  placeholder="เช่น ช่างไฟฟ้า, React, Node.js, งานติดตั้ง"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                />
              </div>

              {/* Responsible Branches & Service Zones */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  🏢 สาขา / พื้นที่รับผิดชอบ (แยกด้วยเครื่องหมายจุลภาค ,)
                </label>
                <input
                  type="text"
                  value={formServiceZonesText}
                  onChange={e => setFormServiceZonesText(e.target.value)}
                  placeholder="เช่น สาขาบางนา (Bangna), สมุทรปราการ, สนง.ใหญ่"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                />
              </div>

              {/* Weekly Day Off Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>วันหยุดประจำสัปดาห์ (Weekly Day Off)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {DAYS_OF_WEEK.map(day => {
                    const isChecked = formWfhDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleToggleWfhDay(day.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '20px',
                          border: isChecked ? '1px solid #2563eb' : '1px solid var(--border-color, #d1d5db)',
                          background: isChecked ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                          color: isChecked ? '#2563eb' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: isChecked ? 600 : 400,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isChecked && <Check size={12} />}
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {editingUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้งาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {isPasswordModalOpen && passwordUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e5e7eb)', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="#d97706" /> รีเซ็ตรหัสผ่าน
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              กำหนดรหัสผ่านใหม่ให้กับ <strong>{passwordUser.name}</strong> ({passwordUser.email})
            </p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>รหัสผ่านใหม่</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                  style={{ width: '100%', padding: '0.6rem 2.2rem 0.6rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '0.875rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '34px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <Eye size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#d97706', color: '#ffffff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  ยืนยันรีเซ็ตรหัสผ่าน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {isDetailModalOpen && selectedUserDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e5e7eb)', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', padding: '2rem 1.5rem 1.5rem 1.5rem', color: '#ffffff', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '30px', height: '30px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
              <img
                src={selectedUserDetail.avatar || PRESET_AVATARS[0]}
                alt={selectedUserDetail.name}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #ffffff', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', marginBottom: '0.75rem' }}
              />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.2rem 0' }}>{selectedUserDetail.name}</h2>
              <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0 }}>{selectedUserDetail.email}</p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>บทบาท (Global Role)</div>
                  <div style={{ marginTop: '0.2rem' }}>{renderRoleBadge(selectedUserDetail.globalRole)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>แผนก / ฝ่าย</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedUserDetail.department || 'General'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>เพศ</div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedUserDetail.gender || 'ไม่ระบุ'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>วันเกิด</div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedUserDetail.birthday || 'ไม่ระบุ'}</div>
                </div>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>ทักษะความชำนาญ:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedUserDetail.skills && selectedUserDetail.skills.length > 0 ? (
                    selectedUserDetail.skills.map((s, i) => (
                      <span key={i} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontSize: '0.8rem', fontWeight: 500 }}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ยังไม่มีข้อมูลทักษะ</span>
                  )}
                </div>
              </div>

              {/* Responsible Branches & Service Zones */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>🏢 สาขา / พื้นที่รับผิดชอบ:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(selectedUserDetail.serviceZones || selectedUserDetail.assignedBranches) && (selectedUserDetail.serviceZones || selectedUserDetail.assignedBranches)!.length > 0 ? (
                    (selectedUserDetail.serviceZones || selectedUserDetail.assignedBranches)!.map((z, i) => (
                      <span key={i} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                        {z}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedUserDetail.department || 'สำนักงานใหญ่'}</span>
                  )}
                </div>
              </div>

              {/* Day Off Days */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>วันหยุดประจำสัปดาห์:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedUserDetail.wfhDays && selectedUserDetail.wfhDays.length > 0 ? (
                    selectedUserDetail.wfhDays.map(d => (
                      <span key={d} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                        {d}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>วันอาทิตย์ (วันหยุดมาตรฐาน)</span>
                  )}
                </div>
              </div>

              {/* Assigned Projects */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>โครงการที่รับผิดชอบ:</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Briefcase size={16} style={{ display: 'inline', marginRight: '6px', color: '#2563eb' }} />
                  {projects.filter(p => p.members && p.members.some(m => m.userId === selectedUserDetail.id)).length} โครงการ
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e5e7eb)', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>ยืนยันการลบผู้ใช้งาน</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              คุณต้องการลบ <strong>"{userToDelete.name}"</strong> ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setUserToDelete(null)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color, #d1d5db)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteUser}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#ffffff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
