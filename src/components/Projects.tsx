import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Calendar, Users, DollarSign, Plus, X, Edit, Trash2, GitBranch, MessageSquare } from 'lucide-react';
import type { User, Project, ProjectStatus, ProjectRole, Task, PermissionScheme, ProjectWorkflow } from '../types';
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
}

export const Projects = ({ 
  projects, 
  setProjects, 
  users, 
  tasks, 
  permissionSchemes, 
  currentUser, 
  projectWorkflows, 
  setProjectWorkflows 
}: ProjectsProps) => {
  const location = useLocation();
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);

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
  const [projectType, setProjectType] = useState<'dev' | 'support'>('dev');
  const [supportTaskStyle, setSupportTaskStyle] = useState<'monthly' | 'categories'>('categories');

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
    return parseFloat(formattedValue.replace(/,/g, '')) || 0;
  };

  const openAddModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setStatus('Planning');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setMembers([]);
    setCustomColumnsText('To Do, In Progress, Review, Done');
    setPermissionSchemeId('scheme_default');
    setProjectType('dev');
    setSupportTaskStyle('categories');
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
    setProjectType(project.projectType || 'dev');
    setSupportTaskStyle(project.supportTaskStyle || 'categories');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) return alert('Name and Start Date are required');

    const cols = customColumnsText.split(',').map(c => c.trim()).filter(c => c.length > 0);

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
      supportTaskStyle: projectType === 'support' ? supportTaskStyle : undefined
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Projects</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active projects and team assignments.</p>
        </div>
        {canCreateProject() && (
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
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {projects
          .filter(project => 
            currentUser?.globalRole === 'Admin' || 
            currentUser?.globalRole === 'Manager' || 
            project.members?.some(m => m.userId === currentUser?.id)
          )
          .map(project => {
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
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: 'var(--radius-full)', 
                        background: project.projectType === 'support' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        color: project.projectType === 'support' ? '#3b82f6' : '#8b5cf6',
                        fontWeight: 500
                      }}>
                        {project.projectType === 'support' ? 'Support' : 'Development'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {(currentUser?.globalRole === 'Admin' || currentUser?.globalRole === 'Manager' || project.members?.some(m => m.userId === currentUser?.id)) && (
                      <Link to={`/chat?projectId=${project.id}`} title="Project Chat" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }} className="hover-lift">
                        <MessageSquare size={16} />
                      </Link>
                    )}
                    {canManageWorkflow(project) && (
                      <>
                        <button onClick={() => openWorkflowModal(project)} title="Configure Workflow" style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <GitBranch size={16} />
                        </button>
                        <button onClick={() => openEditModal(project)} title="Edit Project" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Edit size={16} />
                        </button>
                      </>
                    )}
                    {(currentUser?.globalRole === 'Admin' || currentUser?.globalRole === 'Manager') && (
                      <button onClick={() => handleDelete(project.id)} title="Delete Project" style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {project.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <Calendar size={16} />
                  <span>{formatToDDMMYYYY(project.startDate)} - {project.endDate ? formatToDDMMYYYY(project.endDate) : 'Ongoing'}</span>
                </div>
                {project.budget && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <DollarSign size={16} />
                    <span>${project.budget.toLocaleString()} Budget</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={14} /> Team ({project.members.length})
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {project.members.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No members added yet</span>
                  ) : (
                    project.members.map((member, index) => (
                      <img 
                        key={member.userId} 
                        src={getUserAvatar(member.userId)} 
                        alt="Team member" 
                        title={`${getUserName(member.userId)} (${member.role})`}
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          border: '2px solid var(--bg-tertiary)',
                          marginLeft: index > 0 ? '-10px' : '0',
                          zIndex: project.members.length - index
                        }} 
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Collapsible Project Milestones Checklist */}
              {(() => {
                const projectTasks = tasks ? tasks.filter(t => t.projectId === project.id && !t.parentId) : [];
                if (projectTasks.length === 0) return null;
                return (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <details style={{ cursor: 'pointer' }}>
                      <summary style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 500, outline: 'none' }}>
                        📅 Auto-Generated Plan ({projectTasks.length} Milestones)
                      </summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {projectTasks.map(t => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={t.title}>
                              {t.title}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {t.startDate ? `${formatToDDMMYYYY(t.startDate)} - ${t.endDate ? formatToDDMMYYYY(t.endDate) : ''}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
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
          <div className="glass-panel" style={{ padding: '2rem', width: '650px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between">
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Project Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: projectType === 'support' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)',
                    textDecoration: 'underline',
                    textDecorationColor: '#ff4d4d',
                    textDecorationThickness: '2px',
                    textUnderlineOffset: '4px',
                    fontWeight: 600
                  }}>
                    Project Type
                  </label>
                  <select 
                    value={projectType} 
                    onChange={e => setProjectType(e.target.value as 'dev' | 'support')}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="dev">Development Project (มี Timeline & Sprint/Release)</option>
                    <option value="support">Support Project (มีแค่ Task & บันทึกเวลาแยกตามระบบ/BU)</option>
                  </select>
                </div>

                {projectType === 'support' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Support Task Auto-generation</label>
                    <select 
                      value={supportTaskStyle} 
                      onChange={e => setSupportTaskStyle(e.target.value as 'monthly' | 'categories')}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="categories">Category-based Tasks (ระบบสนับสนุน / BU Support)</option>
                      <option value="monthly">Monthly Tasks (แบ่งเป็นถังรายเดือน [YYYY-MM])</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Kanban Columns (comma-separated workflow columns)</label>
                <input 
                  type="text" 
                  value={customColumnsText} 
                  onChange={e => setCustomColumnsText(e.target.value)} 
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="e.g. To Do, In Progress, Review, Done"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Permission Scheme</label>
                <select 
                  value={permissionSchemeId} 
                  onChange={e => setPermissionSchemeId(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {permissionSchemes.map(ps => (
                    <option key={ps.id} value={ps.id}>{ps.name} - {ps.description}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as ProjectStatus)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Budget ($)</label>
                  <input 
                    type="text" 
                    value={budget} 
                    onChange={e => setBudget(formatNumberWithCommas(e.target.value))} 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                   <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start Date *</label>
                   <CustomDateInput 
                     value={startDate} 
                     onChange={e => setStartDate(e.target.value)} 
                     style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                     required
                   />
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                   <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>End Date</label>
                   <CustomDateInput 
                     value={endDate} 
                     onChange={e => setEndDate(e.target.value)} 
                     style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                   />
                 </div>
               </div>

              {/* Members Setup */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem' }}>Manage Members</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Employee</label>
                    <select 
                      value={tempUserId} 
                      onChange={e => setTempUserId(e.target.value)}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
                    >
                      <option value="">Select Employee...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role</label>
                    <select 
                      value={tempRole} 
                      onChange={e => setTempRole(e.target.value)}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
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

                  {tempRole === 'Custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom Role Name</label>
                      <input 
                        type="text" 
                        placeholder="Type role..."
                        value={customRole}
                        onChange={e => setCustomRole(e.target.value)}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rate/MD (THB)</label>
                    <input 
                      type="number" 
                      placeholder="Rate/MD (THB)"
                      value={tempManDayRate}
                      onChange={e => setTempManDayRate(e.target.value)}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={addMember} 
                  style={{ 
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '0.5rem 1.25rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    fontWeight: 500
                  }}
                  className="hover-lift"
                >
                  <Plus size={16} /> Add Member
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {members.map(m => (
                    <div key={m.userId} className="flex-between" style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{getUserName(m.userId)} - <span style={{ color: 'var(--text-muted)' }}>{m.role} {m.manDayRate ? `(${m.manDayRate.toLocaleString()} THB/MD)` : ''}</span></span>
                      <button type="button" onClick={() => removeMember(m.userId)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
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
                marginTop: '1rem'
              }} className="hover-lift">
                Save Project
              </button>
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
