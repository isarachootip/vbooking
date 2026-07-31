import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Users, Plus, X, Edit, Trash2, FileText, Layers, Search, Download, CheckCircle2, Clock, XCircle, Briefcase, ChevronLeft, ChevronRight, Eye, GitBranch } from 'lucide-react';
import type { User, Project, ProjectStatus, ProjectRole, Task, PermissionScheme, ProjectWorkflow, TaskTemplate } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';

interface ProjectsProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  users: User[];
  tasks?: Task[];
  permissionSchemes: PermissionScheme[];
  currentUser: User | null;
  projectWorkflows: ProjectWorkflow[];
  setProjectWorkflows: React.Dispatch<React.SetStateAction<ProjectWorkflow[]>>;
  taskTemplates?: TaskTemplate[];
}

export const Projects = ({ 
  projects, 
  setProjects, 
  users, 
  tasks: _tasks, 
  permissionSchemes: _permissionSchemes, 
  currentUser, 
  projectWorkflows, 
  setProjectWorkflows,
  taskTemplates = []
}: ProjectsProps) => {
  const location = useLocation();
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);

  // Mockup Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedProjectId(id);
          
          const clearTimer = setTimeout(() => setHighlightedProjectId(null), 3000);
          return () => clearTimeout(clearTimer);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [location]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [members, setMembers] = useState<{ userId: string; role: ProjectRole; manDayRate?: number }[]>([]);
  const [customColumnsText, setCustomColumnsText] = useState('To Do, In Progress, Review, Done');
  const [permissionSchemeId, setPermissionSchemeId] = useState('scheme_default');
  const [projectType, setProjectType] = useState<string>('construction');

  const [projectTemplateName, setProjectTemplateName] = useState('Workflow vFIX');
  const [supportTaskStyle, setSupportTaskStyle] = useState<'monthly' | 'categories'>('categories');
  const [address, setAddress] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [invoicedValue, setInvoicedValue] = useState('');
  const [collectedValue, setCollectedValue] = useState('');
  const [plannedExpense, setPlannedExpense] = useState('');
  const [actualExpense, setActualExpense] = useState('');

  // New fields matching mockup
  const [notes, setNotes] = useState('');
  const [branch, setBranch] = useState('');
  const [customerStaffPic, setCustomerStaffPic] = useState('');
  const [refStartDate, setRefStartDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [surveyTicketNo, setSurveyTicketNo] = useState('');
  const [surveyQtNo, setSurveyQtNo] = useState('');
  const [renovateQtNo, setRenovateQtNo] = useState('');
  const [renovateTicketNo, setRenovateTicketNo] = useState('');
  const [picUser, setPicUser] = useState('');
  const [jobType, setJobType] = useState('');
  const [buildingType, setBuildingType] = useState('บ้านเดี่ยว');
  const [areaSize, setAreaSize] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const [channelReceivedDate, setChannelReceivedDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('โอนเข้าบัญชีธนาคาร');
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);

  // Member select helper state
  const [tempUserId, setTempUserId] = useState('');
  const [tempRole, setTempRole] = useState<ProjectRole>('Frontend dev');
  const [customRole, setCustomRole] = useState('');
  const [tempManDayRate, setTempManDayRate] = useState('');

  const formatNumberWithCommas = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseNumberFromCommas = (formattedValue: string) => {
    if (!formattedValue) return 0;
    return parseFloat(formattedValue.replace(/,/g, '')) || 0;
  };

  const openAddModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setStatus('Planning');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setBudget('');
    setMembers([]);
    setCustomColumnsText('To Do, In Progress, Review, Done');
    setPermissionSchemeId('scheme_default');
    setProjectType('construction');
    setProjectTemplateName('Workflow vFIX');
    setSupportTaskStyle('categories');
    setAddress('');
    setProjectValue('');
    setInvoicedValue('');
    setCollectedValue('');
    setPlannedExpense('');
    setActualExpense('');

    // Reset mockup fields
    setNotes('');
    setBranch('');
    setCustomerStaffPic('');
    setRefStartDate(new Date().toISOString().split('T')[0]);
    setIsAllDay(false);
    setSurveyTicketNo('');
    setSurveyQtNo('');
    setRenovateQtNo('');
    setRenovateTicketNo('');
    setPicUser('');
    setJobType('');
    setBuildingType('บ้านเดี่ยว');
    setAreaSize('');
    setInitialBudget('');
    setChannelReceivedDate('');
    setPaymentMethod('โอนเข้าบัญชีธนาคาร');
    setWorkAreas([]);
    setWorkTypes([]);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setStartDate(project.startDate);
    setEndDate(project.endDate || '');
    setBudget(project.budget ? formatNumberWithCommas(String(project.budget)) : '');
    setMembers(project.members);
    setCustomColumnsText(project.customColumns ? project.customColumns.join(', ') : 'To Do, In Progress, Review, Done');
    setPermissionSchemeId(project.permissionSchemeId || 'scheme_default');
    setProjectType(project.projectType || 'construction');
    setProjectTemplateName(project.projectTemplateName || 'Workflow vFIX');
    setSupportTaskStyle(project.supportTaskStyle || 'categories');
    setAddress(project.address || '');
    setProjectValue(project.projectValue ? formatNumberWithCommas(String(project.projectValue)) : '');
    setInvoicedValue(project.invoicedValue ? formatNumberWithCommas(String(project.invoicedValue)) : '');
    setCollectedValue(project.collectedValue ? formatNumberWithCommas(String(project.collectedValue)) : '');
    setPlannedExpense(project.plannedExpense ? formatNumberWithCommas(String(project.plannedExpense)) : '');
    setActualExpense(project.actualExpense ? formatNumberWithCommas(String(project.actualExpense)) : '');

    const extra = project.extraDetails || {};
    setNotes(extra.notes || '');
    setBranch(extra.branch || '');
    setCustomerStaffPic(extra.customerStaffPic || '');
    setRefStartDate(extra.refStartDate || '');
    setIsAllDay(extra.isAllDay || false);
    setSurveyTicketNo(extra.surveyTicketNo || '');
    setSurveyQtNo(extra.surveyQtNo || '');
    setRenovateQtNo(extra.renovateQtNo || '');
    setRenovateTicketNo(extra.renovateTicketNo || '');
    setPicUser(extra.picUser || '');
    setJobType(extra.jobType || '');
    setBuildingType(extra.buildingType || 'บ้านเดี่ยว');
    setAreaSize(extra.areaSize || '');
    setInitialBudget(extra.initialBudget ? formatNumberWithCommas(String(extra.initialBudget)) : '');
    setChannelReceivedDate(extra.channelReceivedDate || '');
    setPaymentMethod(extra.paymentMethod || 'โอนเข้าบัญชีธนาคาร');
    setWorkAreas(extra.workAreas || []);
    setWorkTypes(extra.workTypes || []);

    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) return alert('กรุณากรอกชื่อโปรเจกต์ และวันที่เริ่มต้น');

    const cols = customColumnsText.split(',').map(c => c.trim()).filter(c => c.length > 0);

    const extraDetails = {
      notes,
      branch,
      customerStaffPic,
      refStartDate,
      isAllDay,
      surveyTicketNo,
      surveyQtNo,
      renovateQtNo,
      renovateTicketNo,
      picUser,
      jobType,
      buildingType,
      areaSize,
      initialBudget: initialBudget ? parseNumberFromCommas(initialBudget) : undefined,
      channelReceivedDate,
      paymentMethod,
      workAreas,
      workTypes
    };

    const projectData: Project = {
      id: editingProject ? editingProject.id : 'p_' + Date.now(),
      name,
      description,
      status,
      startDate,
      endDate: endDate || undefined,
      budget: budget ? parseNumberFromCommas(budget) : undefined,
      members,
      customColumns: cols.length > 0 ? cols : ['To Do', 'In Progress', 'Review', 'Done'],
      permissionSchemeId: permissionSchemeId,
      projectType,
      supportTaskStyle: projectType === 'support' ? supportTaskStyle : undefined,
      address: projectType === 'construction' ? address : undefined,
      projectValue: projectType === 'construction' ? parseNumberFromCommas(projectValue) : undefined,
      invoicedValue: projectType === 'construction' ? parseNumberFromCommas(invoicedValue) : undefined,
      collectedValue: projectType === 'construction' ? parseNumberFromCommas(collectedValue) : undefined,
      plannedExpense: projectType === 'construction' ? parseNumberFromCommas(plannedExpense) : undefined,
      actualExpense: projectType === 'construction' ? parseNumberFromCommas(actualExpense) : undefined,
      projectTemplateName: projectTemplateName || undefined,
      extraDetails
    };

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? projectData : p));
    } else {
      setProjects(prev => [...prev, projectData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  // Permission Helpers
  const canManageWorkflow = (project: Project) => {
    if (!currentUser) return false;
    if (currentUser.globalRole === 'Admin') return true;
    if (currentUser.globalRole === 'Manager') return true;
    const member = project.members.find(m => m.userId === currentUser.id);
    return member?.role === 'PM' || member?.role === 'Team Lead' || member?.role === 'Leader';
  };

  const canCreateProject = () => {
    if (!currentUser) return false;
    if (currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager') return true;
    // Allow PM/Team Lead/Leader to create projects
    return projects.some(p => p.members?.some(m => m.userId === currentUser.id && (m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader')));
  };

  // Workflow Editor State
  const [workflowEditingProject, setWorkflowEditingProject] = useState<Project | null>(null);
  const [wfStatuses, setWfStatuses] = useState<string[]>([]);
  const [wfTransitions, setWfTransitions] = useState<{
    from: string;
    to: string;
    conditions: { type: string; value?: any }[];
  }[]>([]);
  
  // New column / transition form states
  const [newColumnName, setNewColumnName] = useState('');
  const [newTransFrom, setNewTransFrom] = useState('');
  const [newTransTo, setNewTransTo] = useState('');
  const [condPMOnly, setCondPMOnly] = useState(false);
  const [condAssigneeOnly, setCondAssigneeOnly] = useState(false);
  const [condMinSP, setCondMinSP] = useState(false);
  const [condDescRequired, setCondDescRequired] = useState(false);
  const [condEstHours, setCondEstHours] = useState(false);

  const openWorkflowModal = (project: Project) => {
    setWorkflowEditingProject(project);
    const wf = projectWorkflows.find(w => w.projectId === project.id);
    if (wf) {
      setWfStatuses(wf.statuses || project.customColumns || ["To Do", "In Progress", "Review", "Done"]);
      setWfTransitions(wf.transitions || []);
    } else {
      const cols = project.customColumns || ["To Do", "In Progress", "Review", "Done"];
      setWfStatuses(cols);
      setWfTransitions([]);
    }
    setNewColumnName('');
    setNewTransFrom('');
    setNewTransTo('');
    setCondPMOnly(false);
    setCondAssigneeOnly(false);
    setCondMinSP(false);
    setCondDescRequired(false);
    setCondEstHours(false);
  };

  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return alert('Column name cannot be empty');
    if (wfStatuses.includes(trimmed)) return alert('Column already exists');
    setWfStatuses(prev => [...prev, trimmed]);
    setNewColumnName('');
  };

  const handleRemoveColumn = (colName: string) => {
    if (wfStatuses.length <= 1) return alert('Workflow must have at least one column');
    if (confirm(`Are you sure you want to remove column "${colName}"? Any tasks in this column will need to be transitioned.`)) {
      setWfStatuses(prev => prev.filter(c => c !== colName));
      setWfTransitions(prev => prev.filter(t => t.from !== colName && t.to !== colName));
    }
  };

  const handleAddTransition = () => {
    if (!newTransFrom || !newTransTo) return alert('Select "From" and "To" statuses');
    if (newTransFrom === newTransTo) return alert('Cannot transition to the same status');
    const exists = wfTransitions.some(t => t.from === newTransFrom && t.to === newTransTo);
    if (exists) return alert('This transition path already exists');

    const conditions: { type: string; value?: any }[] = [];
    if (condPMOnly) conditions.push({ type: 'pm_or_admin_only' });
    if (condAssigneeOnly) conditions.push({ type: 'assignee_only' });
    if (condMinSP) conditions.push({ type: 'min_story_points' });
    if (condDescRequired) conditions.push({ type: 'has_description' });
    if (condEstHours) conditions.push({ type: 'has_estimated_hours' });

    setWfTransitions(prev => [...prev, {
      from: newTransFrom,
      to: newTransTo,
      conditions
    }]);

    setNewTransFrom('');
    setNewTransTo('');
    setCondPMOnly(false);
    setCondAssigneeOnly(false);
    setCondMinSP(false);
    setCondDescRequired(false);
    setCondEstHours(false);
  };

  const handleRemoveTransition = (index: number) => {
    setWfTransitions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkflow = () => {
    if (!workflowEditingProject) return;
    
    const updatedWf: ProjectWorkflow = {
      projectId: workflowEditingProject.id,
      statuses: wfStatuses,
      transitions: wfTransitions
    };

    setProjectWorkflows(prev => {
      const exists = prev.some(w => w.projectId === updatedWf.projectId);
      if (exists) {
        return prev.map(w => w.projectId === updatedWf.projectId ? updatedWf : w);
      } else {
        return [...prev, updatedWf];
      }
    });

    setProjects(prev => prev.map(p => {
      if (p.id === workflowEditingProject.id) {
        return { ...p, customColumns: wfStatuses };
      }
      return p;
    }));

    setWorkflowEditingProject(null);
  };

  const addMember = () => {
    if (!tempUserId) return alert('Select a user first');
    if (members.some(m => m.userId === tempUserId)) return alert('Member already added');
    const roleToAdd = tempRole === 'Custom' ? customRole : tempRole;
    if (!roleToAdd) return alert('Please enter or select a role');
    setMembers(prev => [...prev, { 
      userId: tempUserId, 
      role: roleToAdd,
      manDayRate: Number(tempManDayRate) || 0
    }]);
    setTempUserId('');
    setCustomRole('');
    setTempManDayRate('');
  };

  const removeMember = (userId: string) => {
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const getUserAvatar = (userId: string) => users.find(u => u.id === userId)?.avatar || '';
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';

  const exportToCSV = () => {
    const headers = ['No,Project ID,Name,Building Type,Status,Document No,Customer,Branch,Created Date,PIC'];
    const rows = projects.map((p, idx) => {
      const extra = p.extraDetails || {};
      return [
        idx + 1,
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        extra.buildingType || 'บ้านเดี่ยว',
        p.status,
        extra.surveyTicketNo || extra.surveyQtNo || `ST-2505-000${idx+1}`,
        `"${(extra.customerStaffPic || 'ลูกค้า').replace(/"/g, '""')}"`,
        extra.branch || 'สาขาบางนา',
        formatToDDMMYYYY(p.startDate),
        getUserName(p.members?.[0]?.userId || '')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `buildflow_projects_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProjectsList = projects.filter(project => {
    const isMember = currentUser?.globalRole === 'Admin' || 
                    currentUser?.globalRole === 'Manager' || 
                    project.members?.some(m => m.userId === currentUser?.id);
    if (!isMember) return false;

    const extra = project.extraDetails || {};
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (extra.customerStaffPic && extra.customerStaffPic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (extra.surveyTicketNo && extra.surveyTicketNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    const matchesType = buildingTypeFilter === 'All' || (extra.buildingType || 'บ้านเดี่ยว') === buildingTypeFilter;
    const matchesBranch = branchFilter === 'All' || (extra.branch || 'สาขาบางนา') === branchFilter;

    return matchesSearch && matchesStatus && matchesType && matchesBranch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header & Action Buttons */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            ภาพรวมโครงการ (Projects)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            จัดการรายชื่อโครงการติดตั้ง งานก่อสร้าง และทีมงานรับผิดชอบ
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setViewMode(prev => prev === 'table' ? 'cards' : 'table')} 
            className="glass-panel hover-lift" 
            style={{ padding: '0.5rem 0.85rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', outline: 'none', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
          >
            <Layers size={16} /> {viewMode === 'table' ? 'มุมมองการ์ด (Cards)' : 'มุมมองตาราง (Table)'}
          </button>

          <button 
            onClick={exportToCSV} 
            className="glass-panel hover-lift" 
            style={{ padding: '0.5rem 0.85rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', outline: 'none', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
          >
            <Download size={16} /> ส่งออกข้อมูล
          </button>

          {canCreateProject() && (
            <button onClick={openAddModal} style={{ 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              padding: '0.55rem 1.25rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 700, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.9rem'
            }} className="hover-lift">
              <Plus size={18} /> + สร้างโปรเจกต์
            </button>
          )}
        </div>
      </div>

      {/* ── TOP ROW: 5 SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>โครงการทั้งหมด</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            128 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>
            ↑ 12% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากเดือนที่แล้ว</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รอดำเนินการ</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6' }}>
            36 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>
            ↑ 8% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากเดือนที่แล้ว</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>กำลังดำเนินการ</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
            62 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>
            ↑ 15% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากเดือนที่แล้ว</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เสร็จสิ้น</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
            30 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>
            ↑ 20% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากเดือนที่แล้ว</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ยกเลิก</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={18} color="#ef4444" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
            4 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โครงการ</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#ef4444', fontWeight: 600 }}>
            ↓ 20% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>จากเดือนที่แล้ว</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & MULTI-FILTER BAR ── */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาโครงการ, ชื่อลูกค้า, เลขที่เอกสาร..."
              style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.825rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
            >
              <option value="All">สถานะโปรเจกต์: ทั้งหมด</option>
              <option value="Active">กำลังดำเนินการ</option>
              <option value="Planning">รอดำเนินการ</option>
              <option value="Completed">เสร็จสิ้น</option>
              <option value="Cancelled">ยกเลิก</option>
            </select>
          </div>

          {/* Building Type Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <select 
              value={buildingTypeFilter}
              onChange={e => setBuildingTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
            >
              <option value="All">ประเภทงาน: ทั้งหมด</option>
              <option value="บ้านเดี่ยว">บ้านเดี่ยว</option>
              <option value="คอนโด">คอนโด</option>
              <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
              <option value="สำนักงาน">สำนักงาน</option>
              <option value="โรงงาน/คลังสินค้า">โรงงาน/คลังสินค้า</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <select 
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
            >
              <option value="All">สาขา: ทั้งหมด</option>
              <option value="สาขาบางนา">สาขาบางนา</option>
              <option value="สาขารัชดา">สาขารัชดา</option>
              <option value="สาขาบางพลี">สาขาบางพลี</option>
              <option value="สาขาพระราม 3">สาขาพระราม 3</option>
              <option value="สาขาธนบุรี">สาขาธนบุรี</option>
              <option value="สาขาระยอง">สาขาระยอง</option>
              <option value="สาขาอโศก">สาขาอโศก</option>
            </select>
          </div>

          {/* Date Picker */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="เลือกช่วงวันที่"
              style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
              readOnly
            />
          </div>

          {/* Reset Filters */}
          <button 
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
              setBuildingTypeFilter('All');
              setBranchFilter('All');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* ── RICH PROJECTS TABLE (MATCHING MOCKUP) ── */}
      {viewMode === 'table' ? (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={e => {
                        if (e.target.checked) setSelectedProjectIds(filteredProjectsList.map(p => p.id));
                        else setSelectedProjectIds([]);
                      }}
                      checked={selectedProjectIds.length > 0 && selectedProjectIds.length === filteredProjectsList.length}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}>No.</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>ชื่อโปรเจกต์</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>ประเภทงาน</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>สถานะโปรเจกต์</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>ขั้นตอนปัจจุบัน (Workflow)</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>เลขที่เอกสาร</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>ลูกค้า</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>สาขา</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>วันที่สร้าง</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>ผู้รับผิดชอบ</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjectsList.map((project, idx) => {
                  const extra = project.extraDetails || {};
                  const isChecked = selectedProjectIds.includes(project.id);
                  const isHighlighted = highlightedProjectId === project.id;
                  
                  // Mockup workflow mapping
                  const workflowSteps = [
                    { step: 2, label: 'Survey for Design (by Area Size)', color: '#10b981' },
                    { step: 1, label: 'Design for Purchase (No Survey)', color: '#3b82f6' },
                    { step: 3, label: 'Survey for Design & Renovation Proposal', color: '#f59e0b' },
                    { step: 4, label: 'Renovation Proposal Survey (No Design)', color: '#8b5cf6' },
                  ];
                  const wf = workflowSteps[idx % workflowSteps.length];

                  return (
                    <tr 
                      key={project.id} 
                      id={project.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        background: isHighlighted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      className="hover-bg"
                    >
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={e => {
                            if (e.target.checked) setSelectedProjectIds(prev => [...prev, project.id]);
                            else setSelectedProjectIds(prev => prev.filter(id => id !== project.id));
                          }}
                        />
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Project ID & Name */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)' }} className="hover-underline">
                            {project.id.length > 15 ? project.id.substring(0, 15) : project.id}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {project.name}
                          </span>
                        </Link>
                      </td>


                      {/* Building Type */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {extra.buildingType === 'คอนโด' ? '🏢 คอนโด' : extra.buildingType === 'อาคารพาณิชย์' ? '🏭 อาคารพาณิชย์' : extra.buildingType === 'สำนักงาน' ? '🏢 สำนักงาน' : extra.buildingType === 'โรงงาน/คลังสินค้า' ? '🏭 โรงงาน' : '🏠 บ้านเดี่ยว'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: 'var(--radius-full)', 
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: project.status === 'Active' ? 'rgba(245, 158, 11, 0.15)' : project.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : project.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: project.status === 'Active' ? '#f59e0b' : project.status === 'Completed' ? '#10b981' : project.status === 'Cancelled' ? '#ef4444' : '#3b82f6',
                        }}>
                          {project.status === 'Active' ? 'กำลังดำเนินการ' : project.status === 'Completed' ? 'เสร็จสิ้น' : project.status === 'Cancelled' ? 'ยกเลิก' : 'รอดำเนินการ'}
                        </span>
                      </td>

                      {/* Workflow Step */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: wf.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                            {wf.step}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {wf.label}
                          </span>
                        </div>
                      </td>

                      {/* Document No */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          <span>{extra.surveyTicketNo || `ST-2505-000${idx+1}`}</span>
                          <span>{extra.surveyQtNo || `QT-2505-001${idx}`}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {extra.customerStaffPic || (idx % 2 === 0 ? 'คุณสมชาย ใจดี' : 'คุณวิภาวดี พรประเสริฐ')}
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-secondary)' }}>
                        {extra.branch || (idx % 3 === 0 ? 'สาขาบางนา' : idx % 3 === 1 ? 'สาขารัชดา' : 'สาขาบางพลี')}
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formatToDDMMYYYY(project.startDate)}
                      </td>

                      {/* PIC / Responsible User */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <img 
                            src={getUserAvatar(project.members?.[0]?.userId || '') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} 
                            alt="PIC Avatar" 
                            style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
                          />
                          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getUserName(project.members?.[0]?.userId || '')}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                          <Link 
                            to={`/projects/${project.id}`} 
                            title="ดูรายละเอียดโครงการ 360°" 
                            style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                          >
                            <FileText size={15} />
                          </Link>
                          <button 
                            onClick={() => openEditModal(project)} 
                            title="แก้ไขข้อมูลโปรเจกต์" 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <Edit size={15} />
                          </button>
                          <Link 
                            to={`/project-plan?projectId=${project.id}`} 
                            title="ดูแผนงาน / Gantt" 
                            style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}
                          >
                            <Eye size={15} />
                          </Link>

                          {canManageWorkflow(project) && (
                            <>
                              <button 
                                onClick={() => openWorkflowModal(project)} 
                                title="ตั้งค่า Workflow" 
                                style={{ background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.2rem' }}
                              >
                                <GitBranch size={15} />
                              </button>
                              <button 
                                onClick={() => handleDelete(project.id)} 
                                title="ลบโปรเจกต์" 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              แสดง 1 - {filteredProjectsList.length} จาก 128 รายการ
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <button style={{ background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>1</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>2</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>3</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>4</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>5</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>13</button>
              <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Cards View Fallback */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredProjectsList.map(project => {
            const isHighlighted = highlightedProjectId === project.id;
            return (
              <div 
                key={project.id} 
                id={project.id}
                className="glass-panel hover-lift" 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.5rem',
                  border: isHighlighted ? '2px solid var(--accent-primary)' : '1px solid transparent',
                  boxShadow: isHighlighted ? '0 0 20px rgba(99, 102, 241, 0.4)' : undefined,
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{project.name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: 'var(--radius-full)', 
                        background: project.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: project.status === 'Active' ? 'var(--accent-secondary)' : 'var(--accent-warning)',
                        fontWeight: 500
                      }}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
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
            padding: '1.75rem 2rem', 
            width: '1150px', 
            maxWidth: '98%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingProject ? 'Edit project' : 'Create project'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* ── LEFT COLUMN ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* SECTION 1: ข้อมูลทั่วไปของโปรเจกต์ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                      <FileText size={18} /> ข้อมูลทั่วไปของโปรเจกต์
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Project Template <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          value={projectTemplateName} 
                          onChange={e => setProjectTemplateName(e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        >
                          <option value="Workflow vFIX">Workflow vFIX</option>
                          <option value="Default">Default (แม่แบบมาตรฐาน)</option>
                          <option value="Kitchen Renovation">Kitchen Renovation (รีโนเวทห้องครัว)</option>
                          <option value="None">None (ไม่สร้างงานย่อย)</option>
                          {Array.from(new Set(taskTemplates.map(t => t.projectTemplateName || 'General'))).filter(n => n && n !== 'General' && n !== 'Default' && n !== 'Workflow vFIX' && n !== 'Kitchen Renovation').map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          หมายเหตุ
                        </label>
                        <div style={{ position: 'relative' }}>
                          <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value.slice(0, 500))} 
                            placeholder="ระบุหมายเหตุ (ถ้ามี)"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', minHeight: '60px', width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
                          />
                          <span style={{ position: 'absolute', bottom: '6px', right: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {notes.length}/500
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: ข้อมูลโปรเจกต์ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                      <Layers size={18} /> ข้อมูลโปรเจกต์
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ประเภทโครงการ (Project Type) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          value={projectType} 
                          onChange={e => setProjectType(e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', fontWeight: 600 }}
                        >
                          <option value="construction">🏗️ งานก่อสร้าง (Construction)</option>
                          <option value="quick_service">⚡ งาน Quick service</option>
                          <option value="installation">🛠️ งานติดตั้ง (Installation)</option>
                          <option value="dev">💻 งานพัฒนา (Development)</option>
                          <option value="support">🛡️ งานซัพพอร์ต (Support)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>

                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          สาขา <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          value={branch} 
                          onChange={e => setBranch(e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        >
                          <option value="">เลือกสาขา</option>
                          <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                          <option value="สาขา สุขุมวิท">สาขา สุขุมวิท</option>
                          <option value="สาขา บางนา">สาขา บางนา</option>
                          <option value="สาขา เชียงใหม่">สาขา เชียงใหม่</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          เจ้าหน้าที่รับผิดชอบข้อมูลลูกค้า <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          value={customerStaffPic} 
                          onChange={e => setCustomerStaffPic(e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        >
                          <option value="">เลือกเจ้าหน้าที่</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department || 'Staff'})</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ชื่อโปรเจกต์ <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          placeholder="เช่น Mr./Mrs OO House XX construction"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          วันที่เริ่มต้นอ้างอิง <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <CustomDateInput 
                          value={refStartDate} 
                          onChange={e => setRefStartDate(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            วันที่เริ่ม
                          </label>
                          <label style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={isAllDay} 
                              onChange={e => setIsAllDay(e.target.checked)} 
                            />
                            ทั้งวัน
                          </label>
                        </div>
                        <CustomDateInput 
                          value={startDate} 
                          onChange={e => setStartDate(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          วันที่เสร็จ
                        </label>
                        <CustomDateInput 
                          value={endDate} 
                          onChange={e => setEndDate(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>

                    {/* สถานะโปรเจกต์ Radio options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)' }}>
                      <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        สถานะโปรเจกต์ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                        {[
                          'บันทึกข้อมูลลูกค้า',
                          'ประสานงาน/สำรวจ',
                          'รออนุมัติ QC',
                          'ออกแบบ',
                          'ลูกค้ายืนยันดำเนินการ',
                          'รอใบเสนอราคา',
                          'ยืนยันราคา/ใบดำเนินการ',
                          'ก่อสร้าง',
                          'ส่งมอบงาน/เก็บเงิน',
                          'Project Complete',
                          'Survey Complete'
                        ].map(st => (
                          <label key={st} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="project_status_radio" 
                              checked={status === st || (status === 'Planning' && st === 'บันทึกข้อมูลลูกค้า')} 
                              onChange={() => setStatus(st as ProjectStatus)} 
                            />
                            {st}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* References grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Survey Ticket Number</label>
                        <input 
                          type="text" 
                          placeholder="ระบุหมายเลข" 
                          value={surveyTicketNo} 
                          onChange={e => setSurveyTicketNo(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Survey QT Number</label>
                        <input 
                          type="text" 
                          placeholder="ระบุหมายเลข" 
                          value={surveyQtNo} 
                          onChange={e => setSurveyQtNo(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Renovate QT Number</label>
                        <input 
                          type="text" 
                          placeholder="ระบุหมายเลข" 
                          value={renovateQtNo} 
                          onChange={e => setRenovateQtNo(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Renovate Ticket Number</label>
                        <input 
                          type="text" 
                          placeholder="ระบุหมายเลข" 
                          value={renovateTicketNo} 
                          onChange={e => setRenovateTicketNo(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PIC</label>
                      <select 
                        value={picUser} 
                        onChange={e => setPicUser(e.target.value)}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                      >
                        <option value="">เลือก PIC</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>

                  </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* SECTION 3: ข้อมูลลูกค้า */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', fontWeight: 700, fontSize: '1rem' }}>
                      <Users size={18} /> ข้อมูลลูกค้า
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ประเภทงาน <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          value={jobType} 
                          onChange={e => setJobType(e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        >
                          <option value="">เลือกประเภทงาน</option>
                          <option value="งานรีโนเวท">งานรีโนเวท (Renovation)</option>
                          <option value="งานสร้างใหม่">งานสร้างใหม่ (Construction)</option>
                          <option value="งานปรับปรุง/ซ่อมแซม">งานปรับปรุง/ซ่อมแซม (Repair)</option>
                          <option value="งานตกแต่งภายใน">งานตกแต่งภายใน (Interior)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ประเภทสิ่งก่อสร้าง <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.2rem' }}>
                          {['บ้านเดี่ยว', 'คอนโด', 'อาคารพาณิชย์', 'อื่นๆ'].map(bt => (
                            <label key={bt} style={{ fontSize: '0.775rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name="building_type_radio" 
                                checked={buildingType === bt} 
                                onChange={() => setBuildingType(bt)} 
                              />
                              {bt}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ขนาดพื้นที่
                        </label>
                        <input 
                          type="text" 
                          placeholder="ระบุขนาดพื้นที่ (ตร.ม.)" 
                          value={areaSize} 
                          onChange={e => setAreaSize(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          งบประมาณเบื้องต้น (บาท)
                        </label>
                        <input 
                          type="text" 
                          placeholder="ระบุจำนวน" 
                          value={initialBudget} 
                          onChange={e => setInitialBudget(formatNumberWithCommas(e.target.value))} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ช่องทางที่ได้รับสินค้า
                        </label>
                        <CustomDateInput 
                          value={channelReceivedDate} 
                          onChange={e => setChannelReceivedDate(e.target.value)} 
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          วิธีการชำระเงิน
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.2rem' }}>
                          {['เงินสด', 'โอนเข้าบัญชีธนาคาร', 'ผ่อนชำระ', 'บัตรเครดิต', 'อื่นๆ'].map(pm => (
                            <label key={pm} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name="payment_method_radio" 
                                checked={paymentMethod === pm} 
                                onChange={() => setPaymentMethod(pm)} 
                              />
                              {pm}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* พื้นที่งาน Checkboxes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)' }}>
                      <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        พื้นที่งาน
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                        {[
                          'ห้องรับแขก', 'ห้องครัว', 'ห้องน้ำ/ห้องส้วม', 'ลาน/สนามหญ้า', 'ลานซักล้าง',
                          'ตกแต่งภายนอก', 'ห้องนอน', 'ห้องโถง/ห้องรับแขก', 'สำนักงาน / ออฟฟิศ', 'ลานจอดรถ'
                        ].map(area => {
                          const checked = workAreas.includes(area);
                          return (
                            <label key={area} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={checked} 
                                onChange={e => {
                                  if (e.target.checked) setWorkAreas(prev => [...prev, area]);
                                  else setWorkAreas(prev => prev.filter(a => a !== area));
                                }} 
                              />
                              {area}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ประเภทงานที่ต้องการ Checkboxes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)' }}>
                      <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        ประเภทงานที่ต้องการ
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                        {[
                          'งานไฟฟ้า', 'งานออกแบบ', 'งานป้องกัน', 'งานประปา', 'งานติดตั้ง', 'งานอื่นๆ'
                        ].map(wt => {
                          const checked = workTypes.includes(wt);
                          return (
                            <label key={wt} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={checked} 
                                onChange={e => {
                                  if (e.target.checked) setWorkTypes(prev => [...prev, wt]);
                                  else setWorkTypes(prev => prev.filter(t => t !== wt));
                                }} 
                              />
                              {wt}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* COLLAPSIBLE TEAM MEMBERS SECTION */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-secondary)', outline: 'none' }}>
                    👥 เพิ่มทีมงานและผู้รับผิดชอบโครงการ (Manage Team Members - {members.length}คน)
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px', gap: '0.75rem', alignItems: 'end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>เลือกบุคลากร</label>
                        <select 
                          value={tempUserId} 
                          onChange={e => setTempUserId(e.target.value)}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        >
                          <option value="">เลือกพนักงาน...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department || 'Staff'})</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>บทบาท (Role)</label>
                        <select 
                          value={tempRole} 
                          onChange={e => setTempRole(e.target.value as ProjectRole)}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
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
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rate/MD (THB)</label>
                        <input 
                          type="number" 
                          placeholder="Rate/MD"
                          value={tempManDayRate}
                          onChange={e => setTempManDayRate(e.target.value)}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>

                      <button 
                        type="button" 
                        onClick={addMember} 
                        style={{ 
                          background: 'var(--accent-primary)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 'var(--radius-sm)', 
                          padding: '0.45rem', 
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}
                      >
                        + เพิ่มสมาชิก
                      </button>
                    </div>

                    {tempRole === 'Custom' && (
                      <input 
                        type="text" 
                        placeholder="ระบุชื่อบทบาทแบบกำหนดเอง..."
                        value={customRole}
                        onChange={e => setCustomRole(e.target.value)}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.45rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
                      />
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
                      {members.map(m => (
                        <span key={m.userId} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {getUserName(m.userId)} ({m.role})
                          <button type="button" onClick={() => removeMember(m.userId)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: 0 }}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </details>
              </div>

              {/* ACTION FOOTER BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ 
                    background: 'transparent', 
                    color: '#059669', 
                    border: '1.5px solid #059669', 
                    padding: '0.55rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                  className="hover-lift"
                >
                  ยกเลิก
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      alert('บันทึกแบบร่างเรียบร้อยแล้ว');
                      setIsModalOpen(false);
                    }} 
                    style={{ 
                      background: 'transparent', 
                      color: '#059669', 
                      border: '1.5px solid #059669', 
                      padding: '0.55rem 1.25rem', 
                      borderRadius: 'var(--radius-md)', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    className="hover-lift"
                  >
                    บันทึกแบบร่าง
                  </button>

                  <button 
                    type="submit" 
                    style={{ 
                      background: '#059669', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0.55rem 1.75rem', 
                      borderRadius: 'var(--radius-md)', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }} 
                    className="hover-lift"
                  >
                    ถัดไป &gt;
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Workflow Customization Modal */}
      {workflowEditingProject && (
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
          <div className="glass-panel" style={{ padding: '2rem', width: '750px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between">
              <div>
                <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Project Workflow Editor</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configure columns and conditional transitions for <strong>{workflowEditingProject.name}</strong></p>
              </div>
              <button onClick={() => setWorkflowEditingProject(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Section 1: Columns Management */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>1. Columns (Statuses)</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0' }}>
                {wfStatuses.map(col => (
                  <span key={col} className="glass-panel" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                  }}>
                    {col}
                    <button type="button" onClick={() => handleRemoveColumn(col)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="New column/status name..." 
                  value={newColumnName}
                  onChange={e => setNewColumnName(e.target.value)}
                  style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button type="button" onClick={handleAddColumn} style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}>Add Column</button>
              </div>
            </div>

            {/* Section 2: Transitions Management */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>2. Allowed Transitions & Conditions</h3>
              
              {/* Transition creation form */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From Status</label>
                    <select 
                      value={newTransFrom} 
                      onChange={e => setNewTransFrom(e.target.value)}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="">Select source...</option>
                      {wfStatuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To Status</label>
                    <select 
                      value={newTransTo} 
                      onChange={e => setNewTransTo(e.target.value)}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="">Select target...</option>
                      {wfStatuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Transition conditions checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Transition Validation Conditions:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={condPMOnly} onChange={e => setCondPMOnly(e.target.checked)} />
                      PM / Admin Only
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={condAssigneeOnly} onChange={e => setCondAssigneeOnly(e.target.checked)} />
                      Assignee Only
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={condMinSP} onChange={e => setCondMinSP(e.target.checked)} />
                      Require Story Points (&gt; 0)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={condDescRequired} onChange={e => setCondDescRequired(e.target.checked)} />
                      Require Description
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={condEstHours} onChange={e => setCondEstHours(e.target.checked)} />
                      Require Estimated Hours (&gt; 0)
                    </label>
                  </div>
                </div>

                <button type="button" onClick={handleAddTransition} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 500
                }} className="hover-lift">Add Transition Path</button>
              </div>

              {/* Transition list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Configured Transitions ({wfTransitions.length}):</h4>
                {wfTransitions.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transition constraints defined. All statuses can transition to all others freely.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {wfTransitions.map((t, idx) => (
                      <div key={idx} className="flex-between" style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{t.from}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>&rarr;</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{t.to}</span>
                          {t.conditions && t.conditions.length > 0 && (
                            <span style={{ color: 'var(--accent-warning)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                              ({t.conditions.map(c => c.type.replace(/_/g, ' ')).join(', ')})
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => handleRemoveTransition(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button type="button" onClick={() => setWorkflowEditingProject(null)} style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}>Cancel</button>
              
              <button type="button" onClick={handleSaveWorkflow} style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: 'pointer'
              }} className="hover-lift">Save Workflow Configuration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
