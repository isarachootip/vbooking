import { useState, useRef, useEffect } from 'react';
import type { TaskTemplate, TaskPriority, PermissionScheme, User, CostRate, MasterProjectType } from '../types';
import { Plus, Trash2, Edit, X, Save, Shield, ShieldCheck, Coins, AlertTriangle, RefreshCw, FileUp, Sparkles, FileSpreadsheet, Lock, Eye, EyeOff, Key, Image as ImageIcon, Upload, RotateCcw, Layout } from 'lucide-react';

interface SettingsProps {
  taskTemplates: TaskTemplate[];
  setTaskTemplates?: React.Dispatch<React.SetStateAction<TaskTemplate[]>>;
  masterProjectTypes: MasterProjectType[];
  setMasterProjectTypes?: React.Dispatch<React.SetStateAction<MasterProjectType[]>>;
  permissionSchemes: PermissionScheme[];
  setPermissionSchemes: React.Dispatch<React.SetStateAction<PermissionScheme[]>>;
  currentUser: User | null;
  costRates: CostRate[];
  setCostRates: React.Dispatch<React.SetStateAction<CostRate[]>>;
  systemSettings?: Record<string, any>;
  setSystemSettings?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fetchInitialData?: () => void;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
}

export const Settings = ({ 
  taskTemplates,
  setTaskTemplates,
  masterProjectTypes,
  setMasterProjectTypes,
  permissionSchemes, 
  setPermissionSchemes, 
  currentUser,
  costRates,
  setCostRates,
  systemSettings: _systemSettings,
  setSystemSettings,
  fetchInitialData,
  users = [],
  setUsers
}: SettingsProps) => {
  const uniqueTemplateNames = Array.from(new Set(taskTemplates.map(tpl => tpl.projectTemplateName || 'General'))).filter(Boolean) as string[];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'integrations' | 'permission_schemes' | 'cost_rates' | 'security' | 'data_management' | 'system_config' | 'master_project_types'>('templates');

  const [editingMasterType, setEditingMasterType] = useState<MasterProjectType | null>(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [masterTypeName, setMasterTypeName] = useState('');
  const [masterTypeId, setMasterTypeId] = useState('');
  const [masterTypeColor, setMasterTypeColor] = useState('#059669');
  const [masterTypeBadge, setMasterTypeBadge] = useState('');
  const [masterTypeDesc, setMasterTypeDesc] = useState('');
  const [masterTypeColumns, setMasterTypeColumns] = useState('To Do, In Progress, Review, Done');

  const saveMasterTypes = (types: MasterProjectType[]) => {
    if (setMasterProjectTypes) {
      setMasterProjectTypes(types);
    }
  };


  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: Record<string, number> } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // Import Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importText, setImportText] = useState('');
  const [customImportTemplateName, setCustomImportTemplateName] = useState('งานนำเข้าใหม่');

  // Preset Modal state
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [maxUploadMb, setMaxUploadMb] = useState('1');
  const [autoSyncTechs, setAutoSyncTechs] = useState(true);
  const [isSavingSystemConfig, setIsSavingSystemConfig] = useState(false);
  const [systemConfigMessage, setSystemConfigMessage] = useState('');

  // Branding & Logo States
  const [brandLogoUrl, setBrandLogoUrl] = useState('/pmt-logo.png');
  const [brandName, setBrandName] = useState('PMT Renovation');
  const [brandSubtitle, setBrandSubtitle] = useState('vBooking Suite');
  const [brandBadge, setBrandBadge] = useState('PRO');
  const [brandHeaderStyle, setBrandHeaderStyle] = useState<'banner' | 'compact'>('compact');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB (Image file size must be <= 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBrandLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Password Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwChangeMsg, setPwChangeMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Admin User Password Reset states
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [isAdminResetting, setIsAdminResetting] = useState(false);
  const [adminResetMsg, setAdminResetMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      setPwChangeMsg({ text: 'รหัสผ่านใหม่ไม่ตรงกัน (New passwords do not match)', type: 'error' });
      return;
    }
    if (newPassword.length < 4) {
      setPwChangeMsg({ text: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร (Password must be at least 4 characters)', type: 'error' });
      return;
    }

    setIsChangingPw(true);
    setPwChangeMsg(null);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPwChangeMsg({ text: '✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว! (Password changed successfully)', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwChangeMsg({ text: `❌ ${data.error || 'Failed to change password'}`, type: 'error' });
      }
    } catch (err: any) {
      setPwChangeMsg({ text: `❌ Error: ${err.message}`, type: 'error' });
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !adminNewPassword) return;
    if (adminNewPassword.length < 4) {
      setAdminResetMsg({ text: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', type: 'error' });
      return;
    }

    setIsAdminResetting(true);
    setAdminResetMsg(null);

    try {
      const res = await fetch(`/api/users/${selectedUserForReset.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({ password: adminNewPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setAdminResetMsg({ text: `✅ อัปเดตรหัสผ่านสำหรับ ${selectedUserForReset.name} สำเร็จ!`, type: 'success' });
        if (setUsers) {
          setUsers(prev => prev.map(u => u.id === selectedUserForReset.id ? { ...u, password: adminNewPassword } : u));
        }
        setTimeout(() => {
          setSelectedUserForReset(null);
          setAdminNewPassword('');
          setAdminResetMsg(null);
        }, 2000);
      } else {
        setAdminResetMsg({ text: `❌ ${data.error || 'Failed to reset password'}`, type: 'error' });
      }
    } catch (err: any) {
      setAdminResetMsg({ text: `❌ Error: ${err.message}`, type: 'error' });
    } finally {
      setIsAdminResetting(false);
    }
  };

  // Fetch System Config on tab open
  useEffect(() => {
    if (activeTab === 'system_config' && currentUser?.globalRole === 'Admin') {
      fetch('/api/system-settings', {
        headers: { 'X-User-Id': currentUser?.id || '' }
      })
      .then(res => res.json())
      .then(data => {
        if (data.gemini_api_key) {
          setGeminiApiKey(data.gemini_api_key);
        }
        if (data.google_maps_api_key) {
          setGoogleMapsApiKey(data.google_maps_api_key);
        }
        if (data.max_upload_mb) {
          setMaxUploadMb(data.max_upload_mb);
        }
        if (data.auto_sync_remote_technicians !== undefined) {
          setAutoSyncTechs(data.auto_sync_remote_technicians !== 'false');
        }
        if (data.brand_logo_url) {
          setBrandLogoUrl(data.brand_logo_url);
        }
        if (data.brand_name) {
          setBrandName(data.brand_name);
        }
        if (data.brand_subtitle !== undefined) {
          setBrandSubtitle(data.brand_subtitle);
        }
        if (data.brand_badge !== undefined) {
          setBrandBadge(data.brand_badge);
        }
        if (data.brand_header_style) {
          setBrandHeaderStyle(data.brand_header_style as 'banner' | 'compact');
        }
      })
      .catch(err => console.error('Failed to load system settings', err));
    }
  }, [activeTab, currentUser]);

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSystemConfig(true);
    setSystemConfigMessage('');
    try {
      const res = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({ 
          gemini_api_key: geminiApiKey, 
          google_maps_api_key: googleMapsApiKey,
          max_upload_mb: maxUploadMb,
          auto_sync_remote_technicians: String(autoSyncTechs),
          brand_logo_url: brandLogoUrl,
          brand_name: brandName,
          brand_subtitle: brandSubtitle,
          brand_badge: brandBadge,
          brand_header_style: brandHeaderStyle
        })
      });
      if (res.ok) {
        setSystemConfigMessage('Settings saved successfully!');
        const newSettings = {
          brand_logo_url: brandLogoUrl,
          brand_name: brandName,
          brand_subtitle: brandSubtitle,
          brand_badge: brandBadge,
          brand_header_style: brandHeaderStyle,
          gemini_api_key: geminiApiKey,
          google_maps_api_key: googleMapsApiKey,
          max_upload_mb: maxUploadMb,
          auto_sync_remote_technicians: String(autoSyncTechs),
        };
        if (setSystemSettings) {
          setSystemSettings(prev => ({ ...prev, ...newSettings }));
        }
        // Persist to localStorage so sidebar updates instantly on next page load
        try {
          const current = JSON.parse(localStorage.getItem('nt_system_settings') || '{}');
          localStorage.setItem('nt_system_settings', JSON.stringify({ ...current, ...newSettings }));
        } catch {}
        setTimeout(() => setSystemConfigMessage(''), 3000);
      } else {
        const errorData = await res.json();
        setSystemConfigMessage('Error saving settings: ' + errorData.error);
      }
    } catch (err) {
      setSystemConfigMessage('Error saving settings: ' + (err as Error).message);
    } finally {
      setIsSavingSystemConfig(false);
    }
  };

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [startPercent, setStartPercent] = useState('0');
  const [endPercent, setEndPercent] = useState('100');
  const [estimatedHours, setEstimatedHours] = useState('8');
  const [projectTemplateName, setProjectTemplateName] = useState('General');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('General');

  useEffect(() => {
    if (uniqueTemplateNames.length > 0 && !uniqueTemplateNames.includes(selectedTemplateFilter)) {
      setSelectedTemplateFilter(uniqueTemplateNames[0]);
    }
  }, [uniqueTemplateNames, selectedTemplateFilter]);

  const openAddModal = () => {
    setEditingTemplate(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStartPercent('0');
    setEndPercent('10');
    setEstimatedHours('8');
    setProjectTemplateName('General');
    setCustomTemplateName('');
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setPriority(tpl.priority);
    setStartPercent(String(tpl.startPercent));
    setEndPercent(String(tpl.endPercent));
    setEstimatedHours(String(tpl.estimatedHours));
    setProjectTemplateName(tpl.projectTemplateName || 'General');
    setCustomTemplateName('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');

    const startVal = Math.max(0, Math.min(100, Number(startPercent) || 0));
    const endVal = Math.max(startVal, Math.min(100, Number(endPercent) || 100));

    if (startVal >= endVal) {
      return alert('Start percent must be strictly less than end percent.');
    }

    const finalTemplateName = projectTemplateName === 'NEW_CUSTOM' ? (customTemplateName.trim() || 'General') : projectTemplateName;

    const tplData: TaskTemplate = {
      id: editingTemplate ? editingTemplate.id : 'tpl_' + Date.now(),
      title,
      description,
      priority,
      startPercent: startVal,
      endPercent: endVal,
      estimatedHours: Number(estimatedHours) || 0,
      projectTemplateName: finalTemplateName
    };

    if (editingTemplate) {
      if (setTaskTemplates) setTaskTemplates(prev => prev.map(t => t.id === editingTemplate.id ? tplData : t));
    } else {
      if (setTaskTemplates) setTaskTemplates(prev => [...prev, tplData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this task template? Newly created projects will not generate this task.')) {
      if (setTaskTemplates) setTaskTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  // Permission Schemes States & Handlers
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<any | null>(null);
  const [schemeName, setSchemeName] = useState('');
  const [schemeDesc, setSchemeDesc] = useState('');
  const [schemePerms, setSchemePerms] = useState<Record<string, string[]>>({});

  const openAddSchemeModal = () => {
    setEditingScheme(null);
    setSchemeName('');
    setSchemeDesc('');
    setSchemePerms({
      browse_project: ["Admin", "Manager", "PM", "Team Lead", "Member"],
      create_task: ["Admin", "PM", "Team Lead", "Member"],
      edit_task: ["Admin", "PM", "Team Lead", "Assignee"],
      assign_task: ["Admin", "PM", "Team Lead"],
      delete_task: ["Admin", "PM", "Team Lead"],
      transition_task: ["Admin", "PM", "Team Lead", "Assignee", "Member"],
      manage_sprints: ["Admin", "PM", "Team Lead"],
      manage_releases: ["Admin", "PM", "Team Lead"],
      manage_members: ["Admin", "PM", "Team Lead"]
    });
    setIsSchemeModalOpen(true);
  };

  const openEditSchemeModal = (scheme: any) => {
    setEditingScheme(scheme);
    setSchemeName(scheme.name);
    setSchemeDesc(scheme.description || '');
    setSchemePerms(scheme.permissions || {});
    setIsSchemeModalOpen(true);
  };

  const handleSaveScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemeName) return alert('Name is required');

    const schemeId = editingScheme ? editingScheme.id : 'scheme_' + Date.now();
    const data = {
      id: schemeId,
      name: schemeName,
      description: schemeDesc,
      permissions: schemePerms
    };

    setPermissionSchemes(prev => {
      const exists = prev.some(s => s.id === schemeId);
      if (exists) {
        return prev.map(s => s.id === schemeId ? data : s);
      } else {
        return [...prev, data];
      }
    });

    setIsSchemeModalOpen(false);
  };

  const handleDeleteScheme = (id: string) => {
    if (id === 'scheme_default') {
      return alert('Cannot delete the default permission scheme.');
    }
    if (confirm('Are you sure you want to delete this permission scheme? Projects using it will fall back to the default scheme.')) {
      setPermissionSchemes(prev => prev.filter(s => s.id !== id));
    }
  };

  const togglePermissionRole = (key: string, role: string) => {
    setSchemePerms(prev => {
      const current = prev[key] || [];
      let updated = [...current];
      if (updated.includes(role)) {
        updated = updated.filter(r => r !== role);
      } else {
        updated.push(role);
      }
      return { ...prev, [key]: updated };
    });
  };

  // Cost Rates States & Handlers
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const newRoleInputRef = useRef<HTMLInputElement>(null);

  // States for row editing
  const [inlineRoleName, setInlineRoleName] = useState('');
  const [inlinePerDay, setInlinePerDay] = useState('');
  const [inlinePerHour, setInlinePerHour] = useState('');
  const [inlineCurrency, setInlineCurrency] = useState('THB');

  // States for adding a new rate row
  const [newRoleName, setNewRoleName] = useState('');
  const [newPerDay, setNewPerDay] = useState('');
  const [newPerHour, setNewPerHour] = useState('');
  const [newCurrency, setNewCurrency] = useState('THB');

  const focusNewRoleInput = () => {
    if (newRoleInputRef.current) {
      newRoleInputRef.current.focus();
      newRoleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const startInlineEdit = (rate: CostRate) => {
    setEditingRateId(rate.id);
    setInlineRoleName(rate.roleName);
    setInlinePerDay(String(rate.ratePerDay));
    setInlinePerHour(String(rate.ratePerHour));
    setInlineCurrency(rate.currency);
  };

  const cancelInlineEdit = () => {
    setEditingRateId(null);
  };

  const handleSaveInlineRate = (id: string) => {
    if (!inlineRoleName) return alert('Role name is required');
    const day = parseFloat(inlinePerDay) || 0;
    const hour = parseFloat(inlinePerHour) || 0;

    const data: CostRate = {
      id,
      roleName: inlineRoleName,
      ratePerDay: day,
      ratePerHour: hour,
      currency: inlineCurrency
    };

    setCostRates(prev => prev.map(s => s.id === id ? data : s));
    setEditingRateId(null);
  };

  const handleAddInlineRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return alert('Role name is required');
    const day = parseFloat(newPerDay) || 0;
    const hour = parseFloat(newPerHour) || 0;

    const rateId = 'rate_' + Date.now();
    const data: CostRate = {
      id: rateId,
      roleName: newRoleName,
      ratePerDay: day,
      ratePerHour: hour,
      currency: newCurrency
    };

    setCostRates(prev => [...prev, data]);

    // Clear form inputs
    setNewRoleName('');
    setNewPerDay('');
    setNewPerHour('');
    setNewCurrency('THB');
  };

  const handleDeleteRate = (id: string) => {
    if (confirm('Are you sure you want to delete this cost rate? Project cost calculations for members using this role may fallback to default rates.')) {
      setCostRates(prev => prev.filter(s => s.id !== id));
    }
  };

  // Input sync helpers for inline editing row
  const handleInlineDayChange = (val: string) => {
    setInlinePerDay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setInlinePerHour((num / 8).toFixed(2));
    } else {
      setInlinePerHour('');
    }
  };

  const handleInlineHourChange = (val: string) => {
    setInlinePerHour(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setInlinePerDay((num * 8).toFixed(2));
    } else {
      setInlinePerDay('');
    }
  };

  const handleNewPerDayChange = (val: string) => {
    setNewPerDay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setNewPerHour((num / 8).toFixed(2));
    } else {
      setNewPerHour('');
    }
  };

  const handleNewPerHourChange = (val: string) => {
    setNewPerHour(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setNewPerDay((num * 8).toFixed(2));
    } else {
      setNewPerDay('');
    }
  };

  const isGlobalAdmin = currentUser?.globalRole === 'Admin';

  const getPriorityBadgeColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'Urgent': return 'var(--accent-danger)';
      case 'High': return 'var(--accent-warning)';
      case 'Medium': return 'var(--accent-info)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      {/* Top Bar */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>System Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure default milestones and main task templates for automatic project plan generation.</p>
        </div>
        {activeTab === 'templates' && (
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
            <Plus size={18} /> Add Milestone Template
          </button>
        )}
        {activeTab === 'permission_schemes' && isGlobalAdmin && (
          <button onClick={openAddSchemeModal} style={{ 
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
            <Shield size={18} /> New Permission Scheme
          </button>
        )}
        {activeTab === 'cost_rates' && isGlobalAdmin && (
          <button onClick={focusNewRoleInput} style={{ 
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
            <Coins size={18} /> Add Labor Rate
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('templates')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'templates' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'templates' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeTab === 'templates' ? 600 : 400
          }}
        >
          Milestone Templates
        </button>
        {localStorage.getItem('show_dev_settings') === 'true' && (
          <button 
            onClick={() => setActiveTab('integrations')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'integrations' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'integrations' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'integrations' ? 600 : 400
            }}
          >
            Git Webhook Integrations
          </button>
        )}
        <button 
          onClick={() => setActiveTab('permission_schemes')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'permission_schemes' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'permission_schemes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeTab === 'permission_schemes' ? 600 : 400
          }}
        >
          Permission Schemes
        </button>
        {isGlobalAdmin && (
          <button 
            onClick={() => setActiveTab('cost_rates')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'cost_rates' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'cost_rates' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'cost_rates' ? 600 : 400
            }}
          >
            Labor Rates (ค่าแรง)
          </button>
        )}
        {isGlobalAdmin && (
          <button 
            onClick={() => setActiveTab('data_management')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'data_management' ? 'var(--accent-danger)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'data_management' ? '2px solid var(--accent-danger)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'data_management' ? 600 : 400
            }}
          >
            🧹 Data Management
          </button>
        )}
        <button 
          onClick={() => setActiveTab('security')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'security' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeTab === 'security' ? 600 : 400
          }}
        >
          🔐 Security & Password
        </button>
        {isGlobalAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('master_project_types')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'master_project_types' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'master_project_types' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontWeight: activeTab === 'master_project_types' ? 600 : 400
              }}
            >
              📁 Master Project Types
            </button>
            <button 
              onClick={() => setActiveTab('system_config')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'system_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'system_config' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontWeight: activeTab === 'system_config' ? 600 : 400
              }}
            >
              ⚙️ System Config
            </button>
          </>
        )}
      </div>


      {activeTab === 'templates' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT Sidebar: Project Templates Master */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>🗂️ แม่แบบโครงการ (Master Templates)</h3>
            </div>
            
            {/* List of templates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              <button
                onClick={() => setSelectedTemplateFilter('All')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  background: selectedTemplateFilter === 'All' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: selectedTemplateFilter === 'All' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: selectedTemplateFilter === 'All' ? 600 : 400,
                  transition: 'all 0.2s'
                }}
                className="hover-lift"
              >
                <span style={{ fontSize: '0.775rem' }}>แสดงทุกแม่แบบ (All)</span>
                <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '999px', background: selectedTemplateFilter === 'All' ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)', color: selectedTemplateFilter === 'All' ? 'white' : 'var(--text-secondary)' }}>
                  {taskTemplates.length}
                </span>
              </button>

              {uniqueTemplateNames.map(name => {
                const count = taskTemplates.filter(t => (t.projectTemplateName || 'General') === name).length;
                const isSelected = selectedTemplateFilter === name;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedTemplateFilter(name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.2s'
                    }}
                    className="hover-lift"
                  >
                    <span style={{ fontSize: '0.775rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={name}>
                      {name}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '999px', background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)', color: isSelected ? 'white' : 'var(--text-secondary)' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Create new template button */}
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTitle('');
                setDescription('');
                setPriority('Medium');
                setStartPercent('0');
                setEndPercent('10');
                setEstimatedHours('8');
                setProjectTemplateName('NEW_CUSTOM');
                setCustomTemplateName('');
                setIsModalOpen(true);
              }}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px dashed var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                marginTop: 'auto',
                transition: 'all 0.2s'
              }}
              className="hover-lift"
            >
              <Plus size={14} /> สร้างแม่แบบใหม่...
            </button>
          </div>

          {/* RIGHT Panel: Selected Template steps manager */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
            
            {/* Visual Timeline Preview */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📈 สัดส่วนระยะเวลาในแม่แบบ: <span style={{ color: 'var(--accent-primary)' }}>{selectedTemplateFilter === 'All' ? 'แสดงทั้งหมด' : selectedTemplateFilter}</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    อัตราส่วนระยะเวลาการทำงานย่อย (Start % ถึง End % ของระยะเวลาโครงการทั้งหมด)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsPresetModalOpen(true)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid #8b5cf6',
                      color: '#8b5cf6',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    className="hover-lift"
                  >
                    <Sparkles size={14} /> ⚡ แม่แบบสำเร็จรูปด่วน
                  </button>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#10b981',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    className="hover-lift"
                  >
                    <FileUp size={14} /> 📥 นำเข้า Task (CSV/JSON)
                  </button>

                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setTitle('');
                      setDescription('');
                      setPriority('Medium');
                      setStartPercent('0');
                      setEndPercent('10');
                      setEstimatedHours('8');
                      setProjectTemplateName(selectedTemplateFilter === 'All' ? 'General' : selectedTemplateFilter);
                      setCustomTemplateName('');
                      setIsModalOpen(true);
                    }}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    className="hover-lift"
                  >
                    <Plus size={14} /> เพิ่มขั้นตอนงานในแม่แบบนี้
                  </button>
                </div>
              </div>

              {/* Timeline representation */}
              <div style={{ 
                position: 'relative', 
                background: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)', 
                minHeight: '260px', 
                padding: '1rem 0'
              }}>
                {/* Vertical axis ticks */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', margin: '0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Start (0%)</span>
                  <span>25%</span>
                  <span>50% (Midpoint)</span>
                  <span>75%</span>
                  <span>End (100%)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '0 1rem' }}>
                  {taskTemplates
                    .filter(t => selectedTemplateFilter === 'All' || (t.projectTemplateName || 'General') === selectedTemplateFilter)
                    .map((tpl, idx) => {
                      const widthVal = tpl.endPercent - tpl.startPercent;
                      return (
                        <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                          {/* Left Label */}
                          <span style={{ fontSize: '0.7rem', width: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                            [{tpl.projectTemplateName || 'General'}] {tpl.title}
                          </span>
                          
                          {/* Bar container */}
                          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                            <div style={{
                              position: 'absolute',
                              left: `${tpl.startPercent}%`,
                              width: `${widthVal}%`,
                              height: '14px',
                              background: idx % 2 === 0 ? 'rgba(99, 102, 241, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                              border: idx % 2 === 0 ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(168, 85, 247, 0.5)',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: '4px',
                              fontSize: '0.65rem',
                              color: 'white',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden'
                            }} title={`${tpl.title}: ${tpl.startPercent}% to ${tpl.endPercent}% (${tpl.estimatedHours}h)`}>
                              {tpl.startPercent}% - {tpl.endPercent}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Grid of Milestone Templates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {taskTemplates
                .filter(t => selectedTemplateFilter === 'All' || (t.projectTemplateName || 'General') === selectedTemplateFilter)
                .map(tpl => (
                  <div key={tpl.id} className="glass-panel hover-lift" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="flex-between">
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 600, 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: 'var(--radius-sm)', 
                          background: getPriorityBadgeColor(tpl.priority),
                          color: 'white'
                        }}>
                          {tpl.priority}
                        </span>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {tpl.projectTemplateName || 'General'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEditModal(tpl)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(tpl.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{tpl.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minHeight: '40px' }}>{tpl.description}</p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Phase: <strong>{tpl.startPercent}% - {tpl.endPercent}%</strong></span>
                      <span>Default Est: <strong>{tpl.estimatedHours} hrs</strong></span>
                    </div>
                  </div>
                ))}
            </div>

          </div>
        </div>
      ) : activeTab === 'integrations' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>GitHub Webhook Setup</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Automatically update task statuses when you push code to GitHub.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payload URL:</span>
              <code style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', wordBreak: 'break-all' }}>
                {window.location.origin}/api/webhooks/github
              </code>
            </div>
            <ol style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Go to your GitHub repository <strong>Settings</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Add webhook</strong>.</li>
              <li>Set <strong>Payload URL</strong> to the link above.</li>
              <li>Set Content type to <strong>application/json</strong>.</li>
              <li>Choose <strong>Just the push event</strong> and click <strong>Add webhook</strong>.</li>
            </ol>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>GitLab Webhook Setup</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Automatically update task statuses when you push code to GitLab.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>URL:</span>
              <code style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', wordBreak: 'break-all' }}>
                {window.location.origin}/api/webhooks/gitlab
              </code>
            </div>
            <ol style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Go to your GitLab project <strong>Settings</strong> &gt; <strong>Webhooks</strong>.</li>
              <li>Add the URL above.</li>
              <li>Select <strong>Push events</strong> trigger and click <strong>Add webhook</strong>.</li>
            </ol>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Commit Message Format Guide</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              NexTime scans your commit messages for Task IDs (e.g. <code>[t1]</code> or <code>#t1</code>) and transitions them based on keywords.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <th style={{ padding: '0.5rem 0' }}>Keywords</th>
                  <th style={{ padding: '0.5rem 0' }}>Target Status</th>
                  <th style={{ padding: '0.5rem 0' }}>Example Commit Message</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-secondary)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem 0' }}><code>fix</code>, <code>close</code>, <code>resolve</code>, <code>complete</code>, <code>done</code>, <code>แก้</code>, <code>ปิด</code></td>
                  <td style={{ padding: '0.5rem 0' }}><span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Done</span> (Last Column)</td>
                  <td style={{ padding: '0.5rem 0' }}><code>[t123] fix styling bug on dashboard</code></td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem 0' }}><code>work</code>, <code>progress</code>, <code>develop</code>, <code>start</code>, <code>ทำ</code>, <code>เริ่ม</code></td>
                  <td style={{ padding: '0.5rem 0' }}><span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>In Progress</span></td>
                  <td style={{ padding: '0.5rem 0' }}><code>#t456 start database indexing setup</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'permission_schemes' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!isGlobalAdmin && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--accent-warning)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500
            }}>
              ⚠️ View-Only Mode: Only global Admins can manage permission schemes.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {permissionSchemes.map(scheme => (
              <div key={scheme.id} className="glass-panel hover-lift" style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-secondary)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem' 
              }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} className="text-gradient" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{scheme.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => openEditSchemeModal(scheme)} 
                      title={isGlobalAdmin ? "Edit Permission Scheme" : "View Permission Scheme"} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <Edit size={16} />
                    </button>
                    {isGlobalAdmin && scheme.id !== 'scheme_default' && (
                      <button 
                        onClick={() => handleDeleteScheme(scheme.id)} 
                        title="Delete Permission Scheme" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minHeight: '36px', lineHeight: 1.5 }}>
                  {scheme.description || 'No description provided.'}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Granted Permissions:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {Object.entries(scheme.permissions || {}).map(([key, val]) => (
                      <span key={key} style={{
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '0.2rem 0.4rem',
                        color: 'var(--text-secondary)'
                      }} title={`${key}: ${val.join(', ')}`}>
                        {key.replace(/_/g, ' ')} ({val.length})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'cost_rates' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(() => {
            const inlineInputStyle: React.CSSProperties = {
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.35rem 0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              width: '100%',
            };

            const inlineSelectStyle: React.CSSProperties = {
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.3rem 0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              width: '100%',
            };

            return (
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Labor Rate Configuration (ตั้งค่าอัตราค่าแรง)</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Define default daily and hourly cost rates for each project resource role. These rates are used in the Reports dashboard to calculate project costs based on logged timesheets.
                </p>

                <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <th style={{ padding: '0.75rem 1rem', width: '30%' }}>Resource Role</th>
                        <th style={{ padding: '0.75rem 1rem', width: '22%' }}>Daily Rate (8 hrs)</th>
                        <th style={{ padding: '0.75rem 1rem', width: '22%' }}>Hourly Rate</th>
                        <th style={{ padding: '0.75rem 1rem', width: '13%' }}>Currency</th>
                        {isGlobalAdmin && <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '13%' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody style={{ color: 'var(--text-secondary)' }}>
                      {costRates.map(rate => {
                        const isEditing = editingRateId === rate.id;
                        return (
                          <tr key={rate.id} style={{ borderBottom: '1px solid var(--border-color)', background: isEditing ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
                            {isEditing ? (
                              <>
                                <td style={{ padding: '0.5rem' }}>
                                  <input 
                                    type="text" 
                                    value={inlineRoleName} 
                                    onChange={e => setInlineRoleName(e.target.value)} 
                                    style={inlineInputStyle} 
                                    required 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={inlinePerDay} 
                                    onChange={e => handleInlineDayChange(e.target.value)} 
                                    style={inlineInputStyle} 
                                    required 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={inlinePerHour} 
                                    onChange={e => handleInlineHourChange(e.target.value)} 
                                    style={inlineInputStyle} 
                                    required 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <select 
                                    value={inlineCurrency} 
                                    onChange={e => setInlineCurrency(e.target.value)} 
                                    style={inlineSelectStyle}
                                  >
                                    <option value="THB">THB</option>
                                    <option value="USD">USD</option>
                                  </select>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button 
                                      onClick={() => handleSaveInlineRate(rate.id)} 
                                      title="Save Changes" 
                                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer' }}
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button 
                                      onClick={cancelInlineEdit} 
                                      title="Cancel" 
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rate.roleName}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>฿{rate.ratePerDay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>฿{rate.ratePerHour.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hr</td>
                                <td style={{ padding: '0.75rem 1rem' }}>{rate.currency}</td>
                                {isGlobalAdmin && (
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                      <button 
                                        onClick={() => startInlineEdit(rate)} 
                                        title="Edit Rate" 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteRate(rate.id)} 
                                        title="Delete Rate" 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })}

                      {/* Inline Add Row */}
                      {isGlobalAdmin && (
                        <tr style={{ background: 'rgba(255, 255, 255, 0.01)', borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              ref={newRoleInputRef}
                              type="text" 
                              placeholder="Add new role name..." 
                              value={newRoleName} 
                              onChange={e => setNewRoleName(e.target.value)} 
                              style={inlineInputStyle} 
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              step="any" 
                              placeholder="Daily rate..." 
                              value={newPerDay} 
                              onChange={e => handleNewPerDayChange(e.target.value)} 
                              style={inlineInputStyle} 
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              step="any" 
                              placeholder="Hourly rate..." 
                              value={newPerHour} 
                              onChange={e => handleNewPerHourChange(e.target.value)} 
                              style={inlineInputStyle} 
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select 
                              value={newCurrency} 
                              onChange={e => setNewCurrency(e.target.value)} 
                              style={inlineSelectStyle}
                            >
                              <option value="THB">THB</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <button 
                              onClick={handleAddInlineRate} 
                              title="Add Labor Rate" 
                              style={{ 
                                background: 'var(--accent-primary)', 
                                border: 'none', 
                                color: 'white', 
                                borderRadius: 'var(--radius-sm)', 
                                padding: '0.35rem 0.75rem', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem' 
                              }}
                              className="hover-lift"
                            >
                              <Plus size={14} /> Add
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* CRUD Modal */}
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
          <div className="glass-panel" style={{ padding: '2rem', width: '650px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between">
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>{editingTemplate ? 'Edit Milestone Template' : 'Add New Milestone Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Project Template Name / ชื่อแม่แบบโครงการ *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={projectTemplateName === 'NEW_CUSTOM' ? 'NEW_CUSTOM' : projectTemplateName}
                    onChange={e => {
                      if (e.target.value === 'NEW_CUSTOM') {
                        setProjectTemplateName('NEW_CUSTOM');
                        setCustomTemplateName('');
                      } else {
                        setProjectTemplateName(e.target.value);
                      }
                    }}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  >
                    {uniqueTemplateNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="NEW_CUSTOM">+ เพิ่มแม่แบบใหม่...</option>
                  </select>
                  {projectTemplateName === 'NEW_CUSTOM' && (
                    <input 
                      type="text" 
                      value={customTemplateName} 
                      onChange={e => setCustomTemplateName(e.target.value)} 
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none', flex: 1 }}
                      placeholder="ระบุชื่อแม่แบบโครงการใหม่ เช่น งานสร้างครัวใหม่"
                      required
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Milestone Title *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. UX/UI Interface Design"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none', minHeight: '60px', resize: 'vertical' }}
                  placeholder="Brief summary of milestone outcomes..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Priority</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Default Est. Hours</label>
                  <input 
                    type="number" 
                    value={estimatedHours} 
                    onChange={e => setEstimatedHours(e.target.value)} 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Timeline Start Percent (0 - 100%) *</label>
                  <input 
                    type="number" 
                    value={startPercent} 
                    onChange={e => setStartPercent(e.target.value)} 
                    min="0"
                    max="99"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Timeline End Percent (0 - 100%) *</label>
                  <input 
                    type="number" 
                    value={endPercent} 
                    onChange={e => setEndPercent(e.target.value)} 
                    min="1"
                    max="100"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <button type="submit" style={{ 
                background: 'var(--accent-primary)', 
                color: 'white', 
                border: 'none', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)', 
                fontWeight: 600, 
                cursor: 'pointer',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }} className="hover-lift">
                <Save size={18} /> Save Template
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV / JSON Bulk Task Import Modal */}
      {isImportModalOpen && (
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
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ padding: '1.75rem 2rem', width: '680px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileUp size={22} color="#10b981" /> 📥 นำเข้า Task งานในแม่แบบ (Bulk Import Task Templates)
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รูปแบบข้อมูล (Format)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setImportFormat('csv')} 
                      style={{ flex: 1, padding: '0.45rem', borderRadius: 'var(--radius-md)', background: importFormat === 'csv' ? '#10b981' : 'var(--bg-tertiary)', color: importFormat === 'csv' ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      CSV Text
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setImportFormat('json')} 
                      style={{ flex: 1, padding: '0.45rem', borderRadius: 'var(--radius-md)', background: importFormat === 'json' ? '#10b981' : 'var(--bg-tertiary)', color: importFormat === 'json' ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      JSON Array
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ชื่อแม่แบบโครงการที่จะจัดเก็บ</label>
                  <input 
                    type="text" 
                    value={customImportTemplateName} 
                    onChange={e => setCustomImportTemplateName(e.target.value)} 
                    placeholder="เช่น งานรีโนเวทห้องครัว, งานติดตั้งไฟฟ้า"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.45rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>วางข้อมูลข้อความ (CSV / JSON Data)</label>
                <button
                  type="button"
                  onClick={() => {
                    if (importFormat === 'csv') {
                      setImportText(
`Title, Description, Priority, Start%, End%, Hours, TemplateGroup
สำรวจหน้างานและวัดพื้นที่จริง, เข้าวัดพื้นที่หน้างาน ตรวจสอบโครงสร้าง, High, 0, 10, 8, ${customImportTemplateName}
ออกแบบ 3D & เลือกวัสดุ, ทำแบบจำลอง 3D สเปกกระเบื้องและสุขภัณฑ์, High, 10, 25, 16, ${customImportTemplateName}
งานรื้อถอนและเตรียมพื้นผิว, รื้อถอนวัสดุเดิม สกัดกระเบื้อง ขนย้ายขยะ, Medium, 25, 40, 16, ${customImportTemplateName}
งานเดินระบบไฟฟ้า & ประปา, เดินสายไฟฝังผนัง วางระบบท่อน้ำดีและน้ำทิ้ง, High, 40, 55, 24, ${customImportTemplateName}
งานปูกระเบื้อง & งานโครงสร้าง, ฉาบปูน ปูกระเบื้องพื้นและผนังตามแบบ, Medium, 55, 75, 32, ${customImportTemplateName}
งานติดตั้งเฟอร์นิเจอร์ & อุปกรณ์, ประกอบตู้แขวน ติดตั้งซิงค์ เตาไฟฟ้า, Urgent, 75, 95, 24, ${customImportTemplateName}
ทำความสะอาด & ตรวจส่งมอบงาน (QC), ทำความสะอาดไซต์ ตรวจรับงานแก่ลูกค้า, High, 95, 100, 4, ${customImportTemplateName}`
                      );
                    } else {
                      setImportText(JSON.stringify([
                        { title: 'สำรวจหน้างาน', description: 'วัดพื้นที่จริง', priority: 'High', startPercent: 0, endPercent: 15, estimatedHours: 8, projectTemplateName: customImportTemplateName },
                        { title: 'ออกแบบ 3D', description: 'เลือกลายกระเบื้อง', priority: 'High', startPercent: 15, endPercent: 35, estimatedHours: 16, projectTemplateName: customImportTemplateName },
                        { title: 'ติดตั้งอุปกรณ์ & ส่งมอบ', description: 'ตรวจ QC', priority: 'Urgent', startPercent: 35, endPercent: 100, estimatedHours: 24, projectTemplateName: customImportTemplateName }
                      ], null, 2));
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <FileSpreadsheet size={14} /> ใส่ตัวอย่างข้อมูล CSV/JSON
                </button>
              </div>

              <textarea 
                value={importText} 
                onChange={e => setImportText(e.target.value)} 
                placeholder={importFormat === 'csv' ? "ตัวอย่าง CSV:\nTitle, Description, Priority, Start%, End%, Hours, Group\nงานสำรวจหน้างาน, ตรวจพื้นที่, High, 0, 10, 8, งานรีโนเวท" : "ตัวอย่าง JSON:\n[ {\"title\": \"งานสำรวจ\", \"startPercent\": 0, \"endPercent\": 10} ]"}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: 'var(--text-primary)', outline: 'none', minHeight: '180px', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsImportModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!importText.trim()) return alert('กรุณาวางข้อมูล CSV หรือ JSON');
                    let newTpls: TaskTemplate[] = [];

                    if (importFormat === 'json') {
                      try {
                        const parsed = JSON.parse(importText);
                        newTpls = Array.isArray(parsed) ? parsed : [parsed];
                      } catch (err) {
                        return alert('รูปแบบ JSON ไม่ถูกต้อง');
                      }
                    } else {
                      const lines = importText.split('\n').map(l => l.trim()).filter(l => l);
                      for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (i === 0 && line.toLowerCase().includes('title')) continue;
                        const parts = line.split(',').map(p => p.trim());
                        if (parts.length >= 1 && parts[0]) {
                          newTpls.push({
                            id: 'tpl_imp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
                            title: parts[0],
                            description: parts[1] || '',
                            priority: (parts[2] as TaskPriority) || 'Medium',
                            startPercent: Number(parts[3]) || 0,
                            endPercent: Number(parts[4]) || 10,
                            estimatedHours: Number(parts[5]) || 8,
                            projectTemplateName: parts[6] || customImportTemplateName || 'General'
                          });
                        }
                      }
                    }

                    if (newTpls.length === 0) return alert('ไม่พบข้อมูล Task ที่นำเข้าได้');

                    try {
                      await fetch('/api/task-templates/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templates: newTpls })
                      });
                    } catch (err) {
                      console.error('Bulk post failed:', err);
                    }

                    if (setTaskTemplates) setTaskTemplates(prev => [...prev, ...newTpls]);
                    alert(`นำเข้า Task งานในแม่แบบสำเร็จจำนวน ${newTpls.length} ขั้นตอน!`);
                    setIsImportModalOpen(false);
                    setImportText('');
                  }}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  className="hover-lift"
                >
                  <FileUp size={16} /> ยืนยันการนำเข้า Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Templates Library Modal */}
      {isPresetModalOpen && (
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
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ padding: '1.75rem 2rem', width: '750px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={22} color="#8b5cf6" /> ⚡ คลังแม่แบบมาตรฐานสำเร็จรูป (Preset Master Templates)
              </h2>
              <button onClick={() => setIsPresetModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              เลือกนำเข้าชุดแม่แบบขั้นตอนงานมาตรฐานอุตสาหกรรม เข้าสู่ระบบของคุณได้ทันทีด้วยการคลิกเพียงครั้งเดียว
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              
              {/* Preset 1: Home Renovation */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#10b981', fontSize: '1rem', marginBottom: '0.35rem' }}>
                    🏠 งานรีโนเวท & ตกแต่งบ้าน (Home Renovation)
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    6 ขั้นตอนมาตรฐานสำหรับการรีโนเวทบ้านเดี่ยว คอนโด และตกแต่งภายใน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const renovationTemplates: TaskTemplate[] = [
                      { id: 'tpl_ren_3', title: 'งานรื้อถอนและเตรียมพื้นผิว', description: 'รื้อถอนวัสดุเดิม สกัดกระเบื้อง ขนย้ายขยะ', priority: 'Medium', startPercent: 0, endPercent: 20, estimatedHours: 16, projectTemplateName: 'งานรีโนเวทบ้าน' },
                      { id: 'tpl_ren_4', title: 'งานเดินระบบไฟฟ้า & ประปา', description: 'เดินสายไฟฝังผนัง วางระบบท่อน้ำดีและน้ำทิ้ง', priority: 'High', startPercent: 20, endPercent: 40, estimatedHours: 24, projectTemplateName: 'งานรีโนเวทบ้าน' },
                      { id: 'tpl_ren_5', title: 'งานปูกระเบื้อง & งานโครงสร้าง', description: 'ฉาบปูน ปูกระเบื้องพื้นและผนังตามแบบ', priority: 'Medium', startPercent: 40, endPercent: 65, estimatedHours: 32, projectTemplateName: 'งานรีโนเวทบ้าน' },
                      { id: 'tpl_ren_6', title: 'งานติดตั้งเฟอร์นิเจอร์บิวท์อิน', description: 'ประกอบตู้แขวน เคาน์เตอร์ และชั้นวาง', priority: 'High', startPercent: 65, endPercent: 80, estimatedHours: 24, projectTemplateName: 'งานรีโนเวทบ้าน' },
                      { id: 'tpl_ren_7', title: 'งานติดตั้งสุขภัณฑ์ & อุปกรณ์', description: 'ติดตั้งอ่างล้างจาน โคมไฟ และสวิตช์ปลั๊ก', priority: 'Urgent', startPercent: 80, endPercent: 92, estimatedHours: 12, projectTemplateName: 'งานรีโนเวทบ้าน' },
                      { id: 'tpl_ren_8', title: 'ทำความสะอาด & ตรวจส่งมอบงาน (QC)', description: 'ทำความสะอาดไซต์ และส่งมอบงานลูกค้า', priority: 'High', startPercent: 92, endPercent: 100, estimatedHours: 4, projectTemplateName: 'งานรีโนเวทบ้าน' }
                    ];

                    try {
                      await fetch('/api/task-templates/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templates: renovationTemplates })
                      });
                    } catch (err) {}

                    if (setTaskTemplates) setTaskTemplates(prev => [...prev, ...renovationTemplates]);
                    alert('นำเข้าแม่แบบ "งานรีโนเวทบ้าน" สำเร็จ 6 ขั้นตอน!');
                    setIsPresetModalOpen(false);
                  }}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.55rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                  className="hover-lift"
                >
                  ⚡ นำเข้าแม่แบบรีโนเวทบ้าน (6 ขั้นตอน)
                </button>
              </div>

              {/* Preset 2: Electrical & Plumbing */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#3b82f6', fontSize: '1rem', marginBottom: '0.35rem' }}>
                    ⚡ งานติดตั้งระบบไฟฟ้า & ประปา (Electrical & Plumbing)
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    5 ขั้นตอนสำหรับการติดตั้งตู้คอนซูเมอร์ เดินท่อร้อยสายไฟ และงานประปา
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const elecTemplates: TaskTemplate[] = [
                      { id: 'tpl_elec_2', title: 'เดินสาย main และติดตั้งตู้คอนซูเมอร์', description: 'เดินสายไฟเมนเข้าตู้เบรกเกอร์', priority: 'High', startPercent: 0, endPercent: 25, estimatedHours: 16, projectTemplateName: 'งานระบบไฟฟ้า-ประปา' },
                      { id: 'tpl_elec_3', title: 'เดินท่อร้อยสายไฟ & ท่อน้ำ', description: 'สกัดผนัง เดินท่อร้อยสายไฟสีเหลืองและท่อน้ำดี', priority: 'Medium', startPercent: 25, endPercent: 55, estimatedHours: 24, projectTemplateName: 'งานระบบไฟฟ้า-ประปา' },
                      { id: 'tpl_elec_4', title: 'ติดตั้งดวงโคม สวิตช์ ปลั๊ก และก๊อกน้ำ', description: 'ประกอบอุปกรณ์ปลายทาง ปลั๊กไฟ ก๊อกน้ำ', priority: 'Medium', startPercent: 55, endPercent: 75, estimatedHours: 16, projectTemplateName: 'งานระบบไฟฟ้า-ประปา' },
                      { id: 'tpl_elec_5', title: 'ทดสอบแรงดันน้ำ & ทดสอบโหลดไฟฟ้า', description: 'เช็กไฟรั่ว เช็กแรงดันน้ำและรอยรั่ว', priority: 'Urgent', startPercent: 75, endPercent: 90, estimatedHours: 8, projectTemplateName: 'งานระบบไฟฟ้า-ประปา' },
                      { id: 'tpl_elec_6', title: 'ส่งมอบงานและรับประกันบริการ', description: 'ติดป้ายวงจรตู้ไฟ และส่งมอบใบรับประกัน', priority: 'High', startPercent: 90, endPercent: 100, estimatedHours: 4, projectTemplateName: 'งานระบบไฟฟ้า-ประปา' }
                    ];

                    try {
                      await fetch('/api/task-templates/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templates: elecTemplates })
                      });
                    } catch (err) {}

                    if (setTaskTemplates) setTaskTemplates(prev => [...prev, ...elecTemplates]);
                    alert('นำเข้าแม่แบบ "งานระบบไฟฟ้า-ประปา" สำเร็จ 5 ขั้นตอน!');
                    setIsPresetModalOpen(false);
                  }}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.55rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                  className="hover-lift"
                >
                  ⚡ นำเข้าแม่แบบระบบไฟฟ้า-ประปา (5 ขั้นตอน)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Permission Scheme CRUD Modal */}
      {isSchemeModalOpen && (
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
          <div className="glass-panel" style={{ padding: '2rem', width: '800px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between">
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>
                {editingScheme ? (isGlobalAdmin ? 'Edit Permission Scheme' : 'View Permission Scheme') : 'Add New Permission Scheme'}
              </h2>
              <button onClick={() => setIsSchemeModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Scheme Name *</label>
                <input 
                  type="text" 
                  value={schemeName} 
                  onChange={e => setSchemeName(e.target.value)} 
                  disabled={!isGlobalAdmin}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. Standard Developer Scheme"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={schemeDesc} 
                  onChange={e => setSchemeDesc(e.target.value)} 
                  disabled={!isGlobalAdmin}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none', minHeight: '50px', resize: 'vertical' }}
                  placeholder="Describe the target audience or scope for this scheme..."
                />
              </div>

              {/* Permission Checkboard Matrix */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Permissions Matrix</label>
                <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <th style={{ padding: '0.75rem' }}>Permission Key</th>
                        {["Admin", "Manager", "PM", "Team Lead", "Member", "Assignee"].map(role => (
                          <th key={role} style={{ padding: '0.75rem', textAlign: 'center' }}>{role}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ color: 'var(--text-secondary)' }}>
                      {[
                        { key: 'browse_project', name: 'Browse Project', desc: 'Ability to view project details and tasks.' },
                        { key: 'create_task', name: 'Create Task', desc: 'Ability to create new tasks or subtasks.' },
                        { key: 'edit_task', name: 'Edit Task', desc: 'Ability to edit task title, description, estimates.' },
                        { key: 'assign_task', name: 'Assign Task', desc: 'Ability to assign task owners.' },
                        { key: 'delete_task', name: 'Delete Task', desc: 'Ability to delete tasks.' },
                        { key: 'transition_task', name: 'Transition Task', desc: 'Ability to change task status/column.' },
                        { key: 'manage_sprints', name: 'Manage Sprints', desc: 'Ability to create, start, or delete sprints.' },
                        { key: 'manage_releases', name: 'Manage Releases', desc: 'Ability to manage project versions/releases.' },
                        { key: 'manage_members', name: 'Manage Members & Workflow', desc: 'Ability to add members or edit workflows.' }
                      ].map(perm => {
                        const activeRoles = schemePerms[perm.key] || [];
                        return (
                          <tr key={perm.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{perm.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{perm.desc}</div>
                            </td>
                            {["Admin", "Manager", "PM", "Team Lead", "Member", "Assignee"].map(role => {
                              const isChecked = activeRoles.includes(role);
                              return (
                                <td key={role} style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => togglePermissionRole(perm.key, role)}
                                    disabled={!isGlobalAdmin}
                                    style={{ cursor: isGlobalAdmin ? 'pointer' : 'default', width: '16px', height: '16px' }}
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

              {isGlobalAdmin && (
                <button type="submit" style={{ 
                  background: 'var(--accent-primary)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }} className="hover-lift">
                  <Save size={18} /> Save Permission Scheme
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {activeTab === 'data_management' && isGlobalAdmin && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Data Management</h3>
          </div>

          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ color: 'var(--accent-danger)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={18} /> Clean All Tasks & Plans
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '0.9rem', lineHeight: 1.6 }}>
              ล้างข้อมูลทั้งหมดเพื่อเริ่มต้น Setup ใหม่ สำหรับโครงการที่ต้องการเคลียร์งานเดิมทิ้ง
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <h5 style={{ color: 'var(--accent-danger)', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>🗑️ จะถูกลบ:</h5>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li>Tasks ทั้งหมด (Kanban Board)</li>
                  <li>Sprints ทั้งหมด</li>
                  <li>Releases ทั้งหมด</li>
                  <li>Timesheets (บันทึกชั่วโมง)</li>
                  <li>Project Baselines & Snapshots</li>
                  <li>Git Commits (ที่เชื่อมกับ Task)</li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: 'var(--accent-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>✅ จะถูกเก็บไว้:</h5>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li>Projects (โครงการ + สมาชิก)</li>
                  <li>Users / Staff (พนักงานทุกคน)</li>
                  <li>Milestone Templates</li>
                  <li>Permission Schemes</li>
                  <li>Cost Rates (อัตราค่าแรง)</li>
                  <li>Git Webhooks</li>
                </ul>
              </div>
            </div>

            {!showCleanConfirm ? (
              <button
                onClick={() => { setShowCleanConfirm(true); setCleanResult(null); }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--accent-danger)',
                  border: '1px solid var(--accent-danger)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                className="hover-lift"
              >
                <Trash2 size={18} /> Clean All Tasks & Plans
              </button>
            ) : (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '2px solid var(--accent-danger)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.25rem' 
              }}>
                <p style={{ color: 'var(--accent-danger)', fontWeight: 700, margin: '0 0 1rem 0', fontSize: '1rem' }}>
                  ⚠️ ยืนยันการลบข้อมูล?
                </p>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
                  การดำเนินการนี้จะลบ Tasks, Sprints, Releases, Timesheets, Baselines, Git Commits ทั้งหมดออกจากฐานข้อมูล <strong>ไม่สามารถกู้คืนได้!</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={async () => {
                      setIsCleaning(true);
                      try {
                        const res = await fetch('/api/clean-tasks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' }
                        });
                        const data = await res.json();
                        if (data.success) {
                          setCleanResult(data);
                          setShowCleanConfirm(false);
                          // Refresh all data
                          if (fetchInitialData) fetchInitialData();
                        } else {
                          alert('Error: ' + (data.error || 'Unknown error'));
                        }
                      } catch (err) {
                        alert('Failed to clean data: ' + (err as Error).message);
                      } finally {
                        setIsCleaning(false);
                      }
                    }}
                    disabled={isCleaning}
                    style={{
                      background: 'var(--accent-danger)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: isCleaning ? 'wait' : 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: isCleaning ? 0.7 : 1
                    }}
                  >
                    {isCleaning ? <RefreshCw size={18} className="spin" /> : <Trash2 size={18} />}
                    {isCleaning ? 'กำลังลบ...' : 'ยืนยัน ลบทั้งหมด'}
                  </button>
                  <button
                    onClick={() => setShowCleanConfirm(false)}
                    disabled={isCleaning}
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      padding: '0.75rem 1.5rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {cleanResult && (
              <div style={{ 
                marginTop: '1.25rem',
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.25rem' 
              }}>
                <h5 style={{ color: 'var(--accent-secondary)', margin: '0 0 0.75rem 0' }}>✅ ล้างข้อมูลสำเร็จ!</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  {Object.entries(cleanResult.deleted).map(([table, count]) => (
                    <div key={table} style={{ 
                      background: 'var(--bg-tertiary)', 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{table.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>-{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Change My Password */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Lock size={22} color="var(--accent-primary)" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>เปลี่ยนรหัสผ่านส่วนตัว (Change My Password)</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  บัญชีผู้ใช้ปัจจุบัน: <strong>{currentUser?.name}</strong> ({currentUser?.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>รหัสผ่านปัจจุบัน (Current Password) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="ป้อนรหัสผ่านเดิมของคุณ"
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>รหัสผ่านใหม่ (New Password) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษร"
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ยืนยันรหัสผ่านใหม่ (Confirm New Password) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="ป้อนรหัสผ่านใหม่อีกครั้ง"
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isChangingPw}
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    cursor: isChangingPw ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  className="hover-lift"
                >
                  <Key size={16} /> {isChangingPw ? 'กำลังอัปเดต...' : 'อัปเดตรหัสผ่านใหม่'}
                </button>
                {pwChangeMsg && (
                  <span style={{ fontSize: '0.9rem', color: pwChangeMsg.type === 'success' ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>
                    {pwChangeMsg.text}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Section 2: User Password Management (Admin / Manager) */}
          {isGlobalAdmin && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={22} color="var(--accent-secondary)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>จัดการรหัสผ่านผู้ใช้งาน (User Password Management)</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      ผู้ดูแลระบบสามารถรีเซ็ตหรือเปลี่ยนรหัสผ่านให้ผู้ใช้ในระบบได้โดยตรง
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>ผู้ใช้งาน (User)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>อีเมล (Email)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>สิทธิ์ (Role)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>แผนก (Department)</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>การจัดการ (Action)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={u.avatar || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: u.globalRole === 'Admin' ? 'rgba(239, 68, 68, 0.15)' : u.globalRole === 'Manager' ? 'rgba(245, 158, 11, 0.15)' : u.globalRole === 'QC' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: u.globalRole === 'Admin' ? '#f87171' : u.globalRole === 'Manager' ? '#fbbf24' : u.globalRole === 'QC' ? '#22d3ee' : '#60a5fa'
                          }}>
                            {u.globalRole}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.department || 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setAdminNewPassword('password123');
                              setShowAdminPw(false);
                              setAdminResetMsg(null);
                            }}
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--accent-primary)',
                              padding: '0.4rem 0.8rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            className="hover-lift"
                          >
                            <Key size={14} /> รีเซ็ตรหัสผ่าน
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Admin Reset Password Modal */}
          {selectedUserForReset && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
            }}>
              <div className="glass-panel" style={{ width: '450px', maxWidth: '90vw', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>🔐 รีเซ็ตรหัสผ่านผู้ใช้</h3>
                  <button onClick={() => setSelectedUserForReset(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <img src={selectedUserForReset.avatar || `https://i.pravatar.cc/150?u=${selectedUserForReset.id}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedUserForReset.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedUserForReset.email}</div>
                  </div>
                </div>

                <form onSubmit={handleAdminResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>กำหนดรหัสผ่านใหม่ (New Password)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminNewPassword('password123');
                          setShowAdminPw(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ⚡ ใช้ password123
                      </button>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showAdminPw ? 'text' : 'password'}
                        value={adminNewPassword}
                        onChange={e => setAdminNewPassword(e.target.value)}
                        placeholder="ป้อนรหัสผ่านใหม่..."
                        style={{
                          width: '100%',
                          padding: '0.6rem 2.5rem 0.6rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPw(!showAdminPw)}
                        style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {adminResetMsg && (
                    <div style={{ fontSize: '0.85rem', color: adminResetMsg.type === 'success' ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>
                      {adminResetMsg.text}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserForReset(null)}
                      style={{
                        background: 'transparent', border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer'
                      }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isAdminResetting}
                      style={{
                        background: 'var(--accent-primary)', color: 'white',
                        border: 'none', padding: '0.5rem 1.25rem',
                        borderRadius: 'var(--radius-md)', cursor: isAdminResetting ? 'wait' : 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {isAdminResetting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'system_config' && isGlobalAdmin && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <ShieldCheck size={24} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>System Configuration (Super Admin Only)</h3>
          </div>

          <form onSubmit={handleSaveSystemConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '720px' }}>
            
            {/* Branding & Logo Header Configuration */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ImageIcon size={20} color="var(--accent-primary)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      โลโก้และชื่อแบรนด์ระบบ (Workspace Logo & Header)
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ปรับแต่งโลโก้, ชื่อระบบ และรูปแบบการแสดงผลที่มุมซ้ายบนของเมนูแถบข้าง (Sidebar)
                    </p>
                  </div>
                </div>
              </div>

              {/* Style Selection (Banner vs Compact) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  รูปแบบการแสดงผลหัวแถบข้าง (Sidebar Header Style)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  <div 
                    onClick={() => setBrandHeaderStyle('banner')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${brandHeaderStyle === 'banner' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: brandHeaderStyle === 'banner' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${brandHeaderStyle === 'banner' ? 'var(--accent-primary)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {brandHeaderStyle === 'banner' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        📐 แบนเนอร์โลโก้เต็มกรอบ (Full Banner)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        แสดงรูปภาพโลโก้เต็มกรอบด้านบน (แบบกรอบแดง)
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setBrandHeaderStyle('compact')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${brandHeaderStyle === 'compact' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: brandHeaderStyle === 'compact' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${brandHeaderStyle === 'compact' ? 'var(--accent-primary)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {brandHeaderStyle === 'compact' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        📌 ไอคอนคู่ชื่อระบบ (Compact Icon + Text)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        แสดงไอคอน 36x36 คู่กับชื่อและ Badge
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  รูปภาพโลโก้ (Logo Image)
                </label>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Thumbnail / Upload Box */}
                  <div 
                    onClick={() => logoFileInputRef.current?.click()}
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px dashed var(--border-color)',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: '4px',
                      position: 'relative',
                      flexShrink: 0
                    }}
                    title="คลิกเพื่ออัปโหลดรูปภาพโลโก้ใหม่"
                  >
                    {brandLogoUrl ? (
                      <img 
                        src={brandLogoUrl} 
                        alt="Brand Logo Preview" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                        <Upload size={20} />
                        <span style={{ fontSize: '0.68rem' }}>อัปโหลด</span>
                      </div>
                    )}
                  </div>

                  <input 
                    ref={logoFileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoFileUpload} 
                    style={{ display: 'none' }} 
                  />

                  {/* Inputs & Controls */}
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        <Upload size={14} /> เลือกไฟล์รูปภาพ (Upload File)
                      </button>

                      <button
                        type="button"
                        onClick={() => setBrandLogoUrl('/pmt-logo.png')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                        title="รีเซ็ตกลับเป็นโลโก้เริ่มต้น"
                      >
                        <RotateCcw size={13} /> รีเซ็ตค่าเริ่มต้น
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หรือใส่ URL / พาธไฟล์รูปภาพ:</span>
                      <input
                        type="text"
                        value={brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        placeholder="/pmt-logo.png หรือ https://..."
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Text Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    ชื่อแบรนด์ / ระบบ (Brand Name)
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. PMT Renovation"
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    คำบรรยายใต้ชื่อ (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={brandSubtitle}
                    onChange={(e) => setBrandSubtitle(e.target.value)}
                    placeholder="e.g. vBooking Suite"
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    ป้ายกำกับ (Badge Tag)
                  </label>
                  <input
                    type="text"
                    value={brandBadge}
                    onChange={(e) => setBrandBadge(e.target.value)}
                    placeholder="e.g. PRO (เว้นว่างได้)"
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Real-time Preview Box */}
              <div style={{ marginTop: '0.25rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🔍 ตัวอย่างการแสดงผลที่แถบข้าง (Live Sidebar Preview):
                </span>
                
                <div style={{ 
                  marginTop: '0.65rem', 
                  maxWidth: '280px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden'
                }}>
                  {brandHeaderStyle === 'banner' ? (
                    <div style={{ padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ width: '100%', borderRadius: '6px', overflow: 'hidden', background: '#ffffff', padding: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={brandLogoUrl || '/pmt-logo.png'} 
                          alt="Logo Preview" 
                          style={{ width: '100%', maxHeight: '65px', objectFit: 'contain' }} 
                        />
                      </div>
                      {(brandName || brandSubtitle) && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {brandName || 'PMT Renovation'}
                          </span>
                          {brandBadge && (
                            <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              {brandBadge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '0.85rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: '2px' }}>
                        <img 
                          src={brandLogoUrl || '/pmt-logo.png'} 
                          alt="Logo Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {brandName || 'PMT Renovation'}
                          </span>
                          {brandBadge && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              {brandBadge}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {brandSubtitle || 'vBooking Suite'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Google Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Paste your Gemini API Key here..."
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                This key is used by the system's chatbot to answer user queries. Keep it secure.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Google Maps API Key (Routes & Distance Matrix)</label>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: googleMapsApiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: googleMapsApiKey ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {googleMapsApiKey ? '🟢 Live Traffic Active' : '🟡 Free Fallback Mode'}
                </span>
              </div>
              <input
                type="password"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                ใช้สำหรับการคำนวณระยะทางตามแนวถนนจริงและประเมินเวลารถติด Real-time (มีเครดิตฟรี $200/เดือน จาก Google Cloud) หากไม่ใส่ระบบจะใช้สูตรเรขาคณิตฟรี
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Max Upload Size (MB)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
                placeholder="e.g. 1"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Limit the maximum file size users can attach in the project chat. Recommended max: 50MB.
              </p>
            </div>

            {/* Remote Data Sync Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  🔄 การดึงข้อมูลช่างอัตโนมัติจากระบบหลัก (Auto-sync Remote Technicians)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  เปิด/ปิด การดึงข้อมูลรายชื่อช่างจากระบบภายนอก (vibepjm.online) ตอนเริ่มต้นระบบและทุกชั่วโมง
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={autoSyncTechs}
                  onChange={(e) => setAutoSyncTechs(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: autoSyncTechs ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                  {autoSyncTechs ? 'เปิดใช้งาน (Enabled)' : 'ปิดการทำงาน (Disabled)'}
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="submit"
                disabled={isSavingSystemConfig}
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSavingSystemConfig ? 'wait' : 'pointer',
                  fontWeight: 600,
                  opacity: isSavingSystemConfig ? 0.7 : 1
                }}
                className="hover-lift"
              >
                {isSavingSystemConfig ? 'Saving...' : 'Save Settings'}
              </button>
              {systemConfigMessage && (
                <span style={{ fontSize: '0.85rem', color: systemConfigMessage.includes('Error') ? 'var(--accent-danger)' : 'var(--accent-secondary)' }}>
                  {systemConfigMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'master_project_types' && isGlobalAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📁 การตั้งค่าประเภทโครงการ (Master Project Types Configuration)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                กำหนดประเภทโครงการหลักขององค์กร (เช่น งานก่อสร้าง, งาน Quick service, งานติดตั้ง) สำหรับใช้งานในเมนู Projects และ Project Timeline
              </p>
            </div>
            <button
              onClick={() => {
                setEditingMasterType(null);
                setMasterTypeName('');
                setMasterTypeId('type_' + Date.now());
                setMasterTypeBadge('');
                setMasterTypeColor('#059669');
                setMasterTypeDesc('');
                setMasterTypeColumns('To Do, In Progress, Review, Done');
                setIsTypeModalOpen(true);
              }}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              className="hover-lift"
            >
              + เพิ่มประเภทโครงการใหม่
            </button>
          </div>

          {/* Master Project Types Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {masterProjectTypes.map((t: any) => (
              <div key={t.id} className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: `4px solid ${t.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: `${t.color}25`,
                    color: t.color,
                    border: `1px solid ${t.color}40`,
                    fontWeight: 700
                  }}>
                    {t.badgeText || t.name}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, minHeight: '36px' }}>
                  {t.description || 'ไม่มีคำอธิบาย'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ID: {t.id}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setEditingMasterType(t);
                        setMasterTypeName(t.name);
                        setMasterTypeId(t.id);
                        setMasterTypeBadge(t.badgeText || t.name);
                        setMasterTypeColor(t.color || '#059669');
                        setMasterTypeDesc(t.description || '');
                        setIsTypeModalOpen(true);
                      }}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`ยืนยันการลบประเภทโครงการ "${t.name}"?`)) {
                          const updated = masterProjectTypes.filter((item: any) => item.id !== t.id);
                          saveMasterTypes(updated);
                        }
                      }}
                      style={{ background: 'transparent', border: '1px solid #ef444440', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for Edit / Add Master Project Type */}
          {isTypeModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--bg-secondary)' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingMasterType ? '✏️ แก้ไขประเภทโครงการ (Master Type)' : '✨ เพิ่มประเภทโครงการใหม่ (Master Type)'}
                </h3>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!masterTypeName) return alert('กรุณากรอกชื่อประเภทโครงการ');
                  
                  const newItem = {
                    id: masterTypeId || ('type_' + Date.now()),
                    name: masterTypeName,
                    badgeText: masterTypeBadge || masterTypeName,
                    color: masterTypeColor,
                    description: masterTypeDesc,
                    defaultColumns: masterTypeColumns.split(',').map(c => c.trim()).filter(Boolean),
                    isActive: true
                  };

                  let updated;
                  if (editingMasterType) {
                    updated = masterProjectTypes.map((item: any) => item.id === editingMasterType.id ? newItem : item);
                  } else {
                    updated = [...masterProjectTypes, newItem];
                  }

                  saveMasterTypes(updated);
                  setIsTypeModalOpen(false);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ชื่อประเภทโครงการ</label>
                    <input
                      type="text"
                      value={masterTypeName}
                      onChange={(e) => setMasterTypeName(e.target.value)}
                      placeholder="เช่น งานก่อสร้าง, งาน Quick service, งานติดตั้ง"
                      style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Badge Label (ป้ายกำกับ)</label>
                      <input
                        type="text"
                        value={masterTypeBadge}
                        onChange={(e) => setMasterTypeBadge(e.target.value)}
                        placeholder="เช่น Quick service ⚡"
                        style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>สีสัญลักษณ์ (Theme Color)</label>
                      <input
                        type="color"
                        value={masterTypeColor}
                        onChange={(e) => setMasterTypeColor(e.target.value)}
                        style={{ padding: '0.2rem', width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>คำอธิบายรายละเอียด</label>
                    <textarea
                      value={masterTypeDesc}
                      onChange={(e) => setMasterTypeDesc(e.target.value)}
                      placeholder="อธิบายลักษณะของโครงการประเภทนี้..."
                      style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>คอลัมน์ Kanban เริ่มต้น (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                    <textarea
                      value={masterTypeColumns}
                      onChange={(e) => setMasterTypeColumns(e.target.value)}
                      placeholder="To Do, In Progress, QA Check-in, QA Check-out, Done"
                      style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>



                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsTypeModalOpen(false)}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                    >
                      บันทึกข้อมูล
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
