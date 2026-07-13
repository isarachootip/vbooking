import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Task, User, TaskPriority, TaskStatus, TaskTemplate, PermissionScheme } from '../types';
import { Calendar, CheckCircle2, Check, Clock, ArrowRight, Plus, Edit, Trash2, X, Save, Zap, ChevronDown, ChevronRight, BarChart3, Search } from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';

interface Baseline {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  isActive: boolean;
}

interface TaskComparison {
  taskId: string;
  title: string;
  base: {
    startDate?: string;
    endDate?: string;
    estimatedHours: number;
    storyPoints: number;
    status: string;
  } | null;
  compare: {
    startDate?: string;
    endDate?: string;
    estimatedHours: number;
    storyPoints: number;
    status: string;
  } | null;
  variance: {
    startDelayDays: number;
    endDelayDays: number;
    hoursDrift: number;
    pointsDrift: number;
  };
}

interface VarianceSummary {
  daysDrift: number;
  storyPointsDrift: number;
  estimatedHoursDrift: number;
  actualHoursLogged: number;
}

interface CompareData {
  projectId: string;
  baseBaseline: { id: string; name: string };
  compareBaseline: { id: string; name: string };
  varianceSummary: VarianceSummary;
  tasks: TaskComparison[];
}

interface ProjectPlanProps {
  projects: Project[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  users: User[];
  taskTemplates: TaskTemplate[];
  permissionSchemes: PermissionScheme[];
  currentUser: User | null;
  fetchInitialData?: () => void;
}

export const ProjectPlan = ({ projects, tasks, setTasks, users, taskTemplates, permissionSchemes, currentUser, fetchInitialData }: ProjectPlanProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  // Baseline states
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [activeBaselineId, setActiveBaselineId] = useState<string>('');
  const [compareBaselineId, setCompareBaselineId] = useState<string>('');
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDesc, setNewBaselineDesc] = useState('');
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [activatingBaseline, setActivatingBaseline] = useState(false);

  // Fetch baselines when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    fetchBaselines();
  }, [selectedProjectId]);

  const fetchBaselines = async () => {
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/baselines`);
      if (res.ok) {
        const data = await res.json();
        setBaselines(data);
        const active = data.find((b: Baseline) => b.isActive);
        if (active) {
          setActiveBaselineId(active.id);
          setCompareBaselineId('live');
        } else if (data.length > 0) {
          setActiveBaselineId(data[0].id);
          setCompareBaselineId('live');
        } else {
          setActiveBaselineId('');
          setCompareBaselineId('');
          setCompareData(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch baselines:', err);
    }
  };

  // Fetch comparison data when activeBaselineId or compareBaselineId changes
  useEffect(() => {
    if (!selectedProjectId || !activeBaselineId || !compareBaselineId) {
      setCompareData(null);
      return;
    }
    fetchCompareData();
  }, [selectedProjectId, activeBaselineId, compareBaselineId]);

  const fetchCompareData = async () => {
    setLoadingCompare(true);
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/baselines/compare?baseId=${activeBaselineId}&compareId=${compareBaselineId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      }
    } catch (err) {
      console.error('Failed to fetch comparison data:', err);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleActivateBaseline = async (baselineId: string) => {
    if (!hasProjectPermission(selectedProjectId, 'edit_task')) {
      alert('Permission denied: You do not have permission to change the active plan.');
      return;
    }
    if (!confirm('Are you sure you want to activate this baseline? This will swap your active workspace tasks to this baseline version.')) {
      return;
    }

    setActivatingBaseline(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/baselines/${baselineId}/activate`, {
        method: 'PUT',
        headers: {
          'X-User-Id': currentUser?.id || '',
        },
      });
      if (res.ok) {
        alert('Baseline activated successfully!');
        await fetchBaselines();
        if (fetchInitialData) {
          fetchInitialData();
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to activate baseline');
      }
    } catch (err) {
      console.error('Error activating baseline:', err);
      alert('Failed to activate baseline due to network error.');
    } finally {
      setActivatingBaseline(false);
    }
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProjectPermission(selectedProjectId, 'edit_task')) {
      alert('Permission denied: You do not have permission to save baselines.');
      return;
    }
    if (!newBaselineName.trim()) {
      alert('Please enter a baseline name.');
      return;
    }

    setSavingBaseline(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/baselines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({
          name: newBaselineName,
          description: newBaselineDesc,
        }),
      });
      if (res.ok) {
        setIsBaselineModalOpen(false);
        setNewBaselineName('');
        setNewBaselineDesc('');
        await fetchBaselines();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save baseline');
      }
    } catch (err) {
      console.error('Error saving baseline:', err);
      alert('Failed to save baseline due to network error.');
    } finally {
      setSavingBaseline(false);
    }
  };

  // Task form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('To Do');
  const [formPriority, setFormPriority] = useState<TaskPriority>('Medium');
  const [formEstHours, setFormEstHours] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsMain, setFormIsMain] = useState(true);
  const [formParentId, setFormParentId] = useState('');

  const project = projects.find(p => p.id === selectedProjectId);
  const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];

  // Filter main tasks (milestones) for the selected project
  const projectMilestones = tasks
    .filter(t => t.projectId === selectedProjectId && !t.parentId)
    .sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aTime - bTime;
    });

  const filteredMilestones = projectMilestones.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Check if milestone title/description matches
    const matchMilestone = 
      m.title.toLowerCase().includes(q) || 
      (m.description || '').toLowerCase().includes(q);
    
    if (matchMilestone) return true;
    
    // Check if any of its subtasks match
    const subtasks = tasks.filter(t => t.parentId === m.id);
    const matchSubtask = subtasks.some(sub => 
      sub.title.toLowerCase().includes(q) || 
      (sub.description || '').toLowerCase().includes(q)
    );
    
    return matchSubtask;
  });

  const getSubtasks = (milestoneId: string) =>
    tasks.filter(t => t.parentId === milestoneId);

  const getAssigneeName = (id?: string) => {
    if (!id) return 'Unassigned';
    return users.find(u => u.id === id)?.name || 'Unknown';
  };

  const getAssigneeAvatar = (id?: string) => {
    if (!id) return 'https://i.pravatar.cc/150?u=unassigned';
    return users.find(u => u.id === id)?.avatar || 'https://i.pravatar.cc/150?u=unassigned';
  };

  const calculateMilestoneProgress = (milestoneId: string, milestoneStatus: string) => {
    const subtasks = tasks.filter(t => t.parentId === milestoneId);
    if (subtasks.length === 0) {
      if (milestoneStatus === 'Done') return 100;
      if (milestoneStatus === 'Review') return 90;
      if (milestoneStatus === 'In Progress') return 50;
      return 0;
    }
    const completed = subtasks.filter(t => t.status === 'Done').length;
    return Math.round((completed / subtasks.length) * 100);
  };

  const getPriorityColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f59e0b';
      case 'Medium': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: '#10b981' };
      case 'In Progress': return { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: '#818cf8' };
      case 'Review': return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: '#f59e0b' };
      default: return { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af', border: '#4b5563' };
    }
  };

  // Timeline geometry
  const projStart = project?.startDate ? new Date(project.startDate).getTime() : 0;
  const projEnd = project?.endDate ? new Date(project.endDate).getTime() : projStart + 30 * 24 * 60 * 60 * 1000;
  const projDuration = projEnd - projStart;
  const totalDays = projDuration > 0 ? Math.round(projDuration / (24 * 60 * 60 * 1000)) : 0;

  const ticks: string[] = [];
  if (projDuration > 0) {
    for (let i = 0; i <= 4; i++) {
      const tickTime = projStart + (projDuration * i) / 4;
      ticks.push(formatToDDMMYYYY(new Date(tickTime)));
    }
  }

  const overallProgress = projectMilestones.length === 0 ? 0
    : Math.round(projectMilestones.reduce((sum, m) => sum + calculateMilestoneProgress(m.id, m.status), 0) / projectMilestones.length);

  // Toggle milestone expansion
  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const hasProjectPermission = (projId: string, permissionKey: string, taskObj?: Task) => {
    if (!currentUser) return false;
    if (currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager') return true;

    const project = projects.find(p => p.id === projId);
    if (!project) return false;

    let projectRole: string | null = null;
    const members = project.members || [];
    const member = members.find(m => m.userId === currentUser.id);
    if (member) {
      projectRole = member.role;
      if (projectRole === 'Team Lead' || projectRole === 'Leader') {
        projectRole = 'PM';
      }
    }

    const schemeId = project.permissionSchemeId || 'scheme_default';
    const scheme = permissionSchemes.find(s => s.id === schemeId);
    if (!scheme) return false;

    const allowed = scheme.permissions?.[permissionKey] || [];
    if (!Array.isArray(allowed)) return false;

    if (allowed.includes(currentUser.globalRole)) return true;
    if (projectRole && allowed.includes(projectRole)) return true;
    if (allowed.includes('Member') && projectRole) return true;
    if (allowed.includes('Assignee') && taskObj && taskObj.assigneeId === currentUser.id) return true;

    return false;
  };

  // Generate milestones from templates
  const handleGenerateFromTemplates = async () => {
    if (!hasProjectPermission(selectedProjectId, 'create_task')) {
      alert('Permission denied: You do not have permission to create tasks in this project.');
      return;
    }
    if (!project || !project.startDate || !project.endDate) {
      alert('This project must have both a Start Date and End Date to auto-generate milestones.');
      return;
    }
    if (taskTemplates.length === 0) {
      alert('No milestone templates found. Please add templates in Settings first.');
      return;
    }
    if (!confirm(`Generate ${taskTemplates.length} milestone tasks for "${project.name}" from templates? Existing milestones will remain.`)) return;

    setIsGenerating(true);
    const startD = new Date(project.startDate);
    const endD = new Date(project.endDate);
    const totalMs = endD.getTime() - startD.getTime();

    const sorted = [...taskTemplates].sort((a, b) => a.startPercent - b.startPercent);
    const newTasks: Task[] = sorted.map(tpl => {
      const taskStartMs = startD.getTime() + (totalMs * tpl.startPercent / 100);
      const taskEndMs = startD.getTime() + (totalMs * tpl.endPercent / 100);
      return {
        id: 't_' + Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        title: tpl.title,
        description: tpl.description,
        status: 'To Do' as TaskStatus,
        priority: tpl.priority,
        estimatedHours: tpl.estimatedHours,
        createdAt: new Date().toISOString(),
        startDate: new Date(taskStartMs).toISOString().split('T')[0],
        endDate: new Date(taskEndMs).toISOString().split('T')[0],
      };
    });

    setTasks(prev => [...prev, ...newTasks]);
    setIsGenerating(false);
  };

  // Open modal helpers
  const openAddMainTask = () => {
    setEditingTask(null);
    setDefaultParentId(undefined);
    setFormTitle(''); setFormDescription(''); setFormStatus('To Do'); setFormPriority('Medium');
    setFormEstHours(''); setFormAssigneeId(''); setFormStartDate(''); setFormEndDate('');
    setFormIsMain(true); setFormParentId('');
    setIsModalOpen(true);
  };

  const openAddSubtask = (milestoneId: string) => {
    setEditingTask(null);
    setDefaultParentId(milestoneId);
    setFormTitle(''); setFormDescription(''); setFormStatus('To Do'); setFormPriority('Medium');
    setFormEstHours(''); setFormAssigneeId(''); setFormStartDate(''); setFormEndDate('');
    setFormIsMain(false); setFormParentId(milestoneId);
    setIsModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultParentId(task.parentId);
    setFormTitle(task.title); setFormDescription(task.description);
    setFormStatus(task.status); setFormPriority(task.priority);
    setFormEstHours(String(task.estimatedHours)); setFormAssigneeId(task.assigneeId || '');
    setFormStartDate(task.startDate || ''); setFormEndDate(task.endDate || '');
    setFormIsMain(!task.parentId); setFormParentId(task.parentId || '');
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string, isMain: boolean) => {
    const taskObj = tasks.find(t => t.id === taskId);
    if (!hasProjectPermission(selectedProjectId, 'delete_task', taskObj)) {
      alert('Permission denied: You do not have permission to delete tasks in this project.');
      return;
    }
    const subtaskCount = tasks.filter(t => t.parentId === taskId).length;
    const msg = isMain && subtaskCount > 0
      ? `Delete this milestone AND its ${subtaskCount} subtask(s)?`
      : 'Delete this task?';
    if (!confirm(msg)) return;
    setTasks(prev => {
      const idsToRemove = new Set<string>([taskId]);
      if (isMain) prev.filter(t => t.parentId === taskId).forEach(t => idsToRemove.add(t.id));
      return prev.filter(t => !idsToRemove.has(t.id));
    });
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingTask;
    const permKey = isEditing ? 'edit_task' : 'create_task';
    if (!hasProjectPermission(selectedProjectId, permKey, editingTask || undefined)) {
      alert(`Permission denied: You do not have permission to ${isEditing ? 'edit' : 'create'} tasks in this project.`);
      return;
    }
    if (!formTitle) return alert('Title is required');

    const est = Number(formEstHours) || 0;
    const parentVal = formIsMain ? undefined : (formParentId || undefined);

    // Validate hour budget for subtasks
    if (!formIsMain && parentVal) {
      const parentTask = tasks.find(t => t.id === parentVal);
      if (parentTask) {
        const used = tasks.filter(t => t.parentId === parentVal && t.id !== (editingTask?.id || '')).reduce((s, t) => s + t.estimatedHours, 0);
        if (used + est > parentTask.estimatedHours) {
          return alert(`Subtask hours (${used + est}h) would exceed the milestone budget of ${parentTask.estimatedHours}h. (Used: ${used}h)`);
        }
      }
    }

    const taskData: Task = {
      id: editingTask ? editingTask.id : 't_' + Date.now(),
      projectId: selectedProjectId,
      title: formTitle,
      description: formDescription,
      status: formStatus,
      priority: formPriority,
      estimatedHours: est,
      assigneeId: formAssigneeId || undefined,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      parentId: parentVal,
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined,
    };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? taskData : t));
    } else {
      setTasks(prev => [...prev, taskData]);
    }
    setIsModalOpen(false);
  };

  const labelStyle = { fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };
  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.6rem 0.9rem', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ─── Top Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Project Plan & Timeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage milestones, Gantt timeline and task progress.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Project selector */}
          <div className="glass-panel" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}
            >
              {projects
                .filter(p => 
                  currentUser?.globalRole === 'Admin' || 
                  currentUser?.globalRole === 'Manager' || 
                  p.members?.some(m => m.userId === currentUser?.id)
                )
                .map(p => (
                  <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)' }}>{p.name}</option>
                ))}
            </select>
          </div>

          {/* Active Baseline Plan Selector */}
          {project?.projectType !== 'support' && baselines.length > 0 && (
            <div className="glass-panel" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Plan:</span>
              <select
                value={activeBaselineId}
                onChange={e => handleActivateBaseline(e.target.value)}
                disabled={activatingBaseline}
                style={{ background: 'transparent', border: 'none', color: '#10b981', outline: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}
              >
                {baselines.map(b => (
                  <option key={b.id} value={b.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {b.name} {b.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compare Baseline Plan Selector */}
          {project?.projectType !== 'support' && baselines.length > 0 && (
            <div className="glass-panel" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Compare vs:</span>
              <select
                value={compareBaselineId}
                onChange={e => setCompareBaselineId(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', outline: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}
              >
                <option value="live" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Current Live Plan</option>
                {baselines.filter(b => b.id !== activeBaselineId).map(b => (
                  <option key={b.id} value={b.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save Version Button */}
          {project?.projectType !== 'support' && (
            <button 
              onClick={() => setIsBaselineModalOpen(true)} 
              className="hover-lift" 
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.12)', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '8px', 
                fontWeight: 600, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.9rem' 
              }}
            >
              <Save size={16} /> Save Version
            </button>
          )}

          {/* Add Main Task button */}
          {project?.projectType !== 'support' && (
            <button onClick={openAddMainTask} className="hover-lift" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <Plus size={16} /> Add Milestone
            </button>
          )}
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      {project && project.projectType !== 'support' && (
        <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search milestones and subtasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              outline: 'none',
              width: '100%',
              fontSize: '0.92rem'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {project ? (
        project.projectType === 'support' ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem 2rem', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', minHeight: '300px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>Support & Maintenance Project</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.5' }}>
                โปรเจกต์นี้เป็นประเภท Support ซึ่งเป็นงานบริการดูแลและบำรุงรักษาอย่างต่อเนื่อง จึงไม่มีการใช้งาน Timeline, Milestones, หรือการบันทึกแผนงานฐานข้อมูล (Baseline)
              </p>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 0 auto', fontSize: '0.9rem' }}>
                คุณสามารถไปจัดการงานแยกตามระบบ/BU หรือบันทึกเวลาปฏิบัติงานได้ในเมนูบอร์ดและลงเวลาหลักของระบบได้ทันที
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Link to="/tasks" className="hover-lift" style={{ background: 'var(--accent-primary)', color: 'white', textDecoration: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                ไปที่หน้า Tasks Board
              </Link>
              <Link to="/timesheet" className="hover-lift" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                ไปที่หน้า Timesheets
              </Link>
            </div>
          </div>
        ) : (
          <>
          {/* ─── Variance Dashboard Widgets ─── */}
          {compareData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                  Comparison Variance: <span style={{ color: '#10b981' }}>{compareData.baseBaseline.name}</span> vs <span style={{ color: '#38bdf8' }}>{compareData.compareBaseline.name}</span>
                </h3>
              </div>

              {loadingCompare ? (
                <div className="glass-panel flex-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                  Loading comparison metrics...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  {/* Schedule Drift */}
                  <div style={{ 
                    background: compareData.varianceSummary.daysDrift > 0 
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)' 
                      : compareData.varianceSummary.daysDrift < 0 
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.04) 100%)' 
                        : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                    border: `1px solid ${
                      compareData.varianceSummary.daysDrift > 0 
                        ? 'rgba(239,68,68,0.25)' 
                        : compareData.varianceSummary.daysDrift < 0 
                          ? 'rgba(16,185,129,0.25)' 
                          : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: '14px', 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center' 
                  }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Schedule Slippage (Drift)</p>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 800, 
                      color: compareData.varianceSummary.daysDrift > 0 
                        ? '#f87171' 
                        : compareData.varianceSummary.daysDrift < 0 
                          ? '#34d399' 
                          : 'white' 
                    }}>
                      {compareData.varianceSummary.daysDrift > 0 ? `+${compareData.varianceSummary.daysDrift} Days` : compareData.varianceSummary.daysDrift < 0 ? `${compareData.varianceSummary.daysDrift} Days` : 'On Track (0d)'}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {compareData.varianceSummary.daysDrift > 0 ? 'Slipped compared to baseline' : compareData.varianceSummary.daysDrift < 0 ? 'Ahead of baseline schedule' : 'No delay detected'}
                    </p>
                  </div>

                  {/* Estimate Variance */}
                  <div style={{ 
                    background: compareData.varianceSummary.estimatedHoursDrift > 0 
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)' 
                      : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                    border: `1px solid ${
                      compareData.varianceSummary.estimatedHoursDrift > 0 
                        ? 'rgba(245,158,11,0.25)' 
                        : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: '14px', 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center' 
                  }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Estimate Drift</p>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 800, 
                      color: compareData.varianceSummary.estimatedHoursDrift > 0 
                        ? '#fbbf24' 
                        : compareData.varianceSummary.estimatedHoursDrift < 0 
                          ? '#34d399' 
                          : 'white' 
                    }}>
                      {compareData.varianceSummary.estimatedHoursDrift > 0 ? `+${compareData.varianceSummary.estimatedHoursDrift}h` : compareData.varianceSummary.estimatedHoursDrift < 0 ? `${compareData.varianceSummary.estimatedHoursDrift}h` : '0h Variance'}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {compareData.varianceSummary.estimatedHoursDrift > 0 ? 'Scope expansion (hours)' : compareData.varianceSummary.estimatedHoursDrift < 0 ? 'Fewer hours estimated' : 'Same estimated hours'}
                    </p>
                  </div>

                  {/* Story Point Drift */}
                  <div style={{ 
                    background: compareData.varianceSummary.storyPointsDrift > 0 
                      ? 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.04) 100%)' 
                      : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                    border: `1px solid ${
                      compareData.varianceSummary.storyPointsDrift > 0 
                        ? 'rgba(167,139,250,0.25)' 
                        : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: '14px', 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center' 
                  }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Story Points Drift</p>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 800, 
                      color: compareData.varianceSummary.storyPointsDrift > 0 
                        ? '#a78bfa' 
                        : compareData.varianceSummary.storyPointsDrift < 0 
                          ? '#34d399' 
                          : 'white' 
                    }}>
                      {compareData.varianceSummary.storyPointsDrift > 0 ? `+${compareData.varianceSummary.storyPointsDrift} SP` : compareData.varianceSummary.storyPointsDrift < 0 ? `${compareData.varianceSummary.storyPointsDrift} SP` : '0 SP Drift'}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {compareData.varianceSummary.storyPointsDrift > 0 ? 'Scope expansion (SP)' : compareData.varianceSummary.storyPointsDrift < 0 ? 'Fewer SP planned' : 'Same story points'}
                    </p>
                  </div>

                  {/* Approved Timesheet Hours */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.04) 100%)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    borderRadius: '14px', 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center' 
                  }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Approved Actual Hours</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
                      {compareData.varianceSummary.actualHoursLogged}h
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Actual logged from timesheets
                    </p>
                  </div>
                </div>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1rem 0' }} />
            </div>
          )}

          {/* ─── Summary Cards ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Duration */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '14px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} color="#818cf8" />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#a5b4fc', marginBottom: '0.2rem' }}>Project Duration</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>{totalDays} Days</h3>
                <p style={{ fontSize: '0.75rem', color: '#c7d2fe', marginTop: '0.1rem' }}>
                  {formatToDDMMYYYY(project.startDate)} → {project.endDate ? formatToDDMMYYYY(project.endDate) : 'Ongoing'}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '14px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#10b981" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', color: '#6ee7b7', marginBottom: '0.2rem' }}>Milestones Progress</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>{overallProgress}% Done</h3>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
                  <div style={{ width: `${overallProgress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #6ee7b7)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>

            {/* Total milestones */}
            <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.25) 0%, rgba(14,165,233,0.08) 100%)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: '14px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14,165,233,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="#38bdf8" />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#7dd3fc', marginBottom: '0.2rem' }}>Total Milestones</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>{projectMilestones.length} Main Tasks</h3>
                <p style={{ fontSize: '0.75rem', color: '#bae6fd', marginTop: '0.1rem' }}>
                  {tasks.filter(t => t.projectId === selectedProjectId && !!t.parentId).length} subtasks total
                </p>
              </div>
            </div>
          </div>

          {/* ─── No Milestones: Generate button ─── */}
          {projectMilestones.length === 0 && (
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '14px', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Zap size={40} color="#f59e0b" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>No milestones yet for this project</h3>
              <p style={{ color: '#fcd34d', fontSize: '0.95rem', maxWidth: '500px' }}>
                Auto-generate {taskTemplates.length} milestone tasks from the default templates (proportional dates based on project timeline), or add manually using the "Add Milestone" button.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={handleGenerateFromTemplates}
                  disabled={isGenerating || taskTemplates.length === 0}
                  className="hover-lift"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', opacity: isGenerating ? 0.7 : 1 }}
                >
                  <Zap size={18} /> {isGenerating ? 'Generating...' : `🚀 Generate ${taskTemplates.length} Milestones from Templates`}
                </button>
                <button onClick={openAddMainTask} className="hover-lift" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <Plus size={18} /> Add Manually
                </button>
              </div>
            </div>
          )}

          {/* ─── Gantt Chart ─── */}
          {projectMilestones.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>📅 Proportional Gantt Timeline</h3>
              <div style={{ minWidth: '700px' }}>
                {/* Date header */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '240px', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Milestone</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280', paddingLeft: '1rem' }}>
                    {ticks.map((t, i) => <span key={i}>{t}</span>)}
                  </div>
                </div>
                {/* Gantt rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: compareData ? '1.25rem' : '0.85rem' }}>
                  {filteredMilestones.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No matching milestones found.
                    </div>
                  ) : (
                    filteredMilestones.map(m => {
                    const subtasks = getSubtasks(m.id);
                    const progress = calculateMilestoneProgress(m.id, m.status);

                    const getGanttGeometry = (startDateStr?: string, endDateStr?: string) => {
                      const start = startDateStr ? new Date(startDateStr).getTime() : projStart;
                      const end = endDateStr ? new Date(endDateStr).getTime() : projEnd;
                      const left = projDuration > 0 ? Math.max(0, Math.min(100, ((start - projStart) / projDuration) * 100)) : 0;
                      const width = projDuration > 0 ? Math.max(2, Math.min(100 - left, ((end - start) / projDuration) * 100)) : 100;
                      return { left, width, start, end };
                    };

                    if (compareData) {
                      const compTask = compareData.tasks.find(t => t.taskId === m.id);
                      
                      const compGeom = compTask?.compare 
                        ? getGanttGeometry(compTask.compare.startDate, compTask.compare.endDate)
                        : getGanttGeometry(m.startDate, m.endDate);
                        
                      const baseGeom = compTask?.base 
                        ? getGanttGeometry(compTask.base.startDate, compTask.base.endDate)
                        : getGanttGeometry(m.startDate, m.endDate);

                      const compEndPos = compGeom.left + compGeom.width;
                      const baseEndPos = baseGeom.left + baseGeom.width;
                      
                      const hasDrift = compTask && compTask.variance.endDelayDays !== 0;
                      const delayDays = compTask ? compTask.variance.endDelayDays : 0;
                      
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                          {/* Label */}
                          <div style={{ width: '240px', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: progress === 100 ? '#10b981' : 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textShadow: progress === 100 ? '0 0 8px rgba(16,185,129,0.3)' : 'none' }} title={m.title}>
                              {progress === 100 && (
                                <Check size={18} color="#10b981" strokeWidth={3.5} style={{ flexShrink: 0, filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.4))' }} />
                              )}
                              {m.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem' }}>
                              {subtasks.length} subtasks · Est: {compTask?.compare?.estimatedHours ?? m.estimatedHours}h vs Base: {compTask?.base?.estimatedHours ?? 0}h
                            </span>
                          </div>
                          
                          {/* Visual Timelines */}
                          <div style={{ flex: 1, position: 'relative', height: '56px', marginLeft: '1rem' }}>
                            {/* Comparison Target Bar (Top) */}
                            {compTask?.compare ? (
                              <div style={{
                                position: 'absolute', left: `${compGeom.left}%`, width: `${compGeom.width}%`, height: '20px', top: '2px',
                                background: progress === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                border: `2px solid ${progress === 100 ? '#10b981' : '#38bdf8'}`,
                                borderRadius: '5px', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 6px',
                                zIndex: 2
                              }} title={`Comparison: ${compGeom.start ? formatToDDMMYYYY(compGeom.start) : 'TBD'} → ${compGeom.end ? formatToDDMMYYYY(compGeom.end) : 'TBD'}`}>
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: progress === 100 ? '#10b981' : '#38bdf8', opacity: 0.2 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', zIndex: 1 }}>
                                  {progress === 100 && (
                                    <Check size={14} color="#10b981" strokeWidth={3.5} style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }} />
                                  )}
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: progress === 100 ? '#10b981' : '#38bdf8', textShadow: progress === 100 ? '0 0 4px rgba(16,185,129,0.4)' : 'none' }}>
                                    {progress}% (Comp)
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ position: 'absolute', left: 0, top: '2px', height: '20px', fontSize: '0.7rem', color: '#4b5563', fontStyle: 'italic' }}>
                                Not in comparison plan
                              </div>
                            )}

                            {/* Baseline Target Bar (Bottom) */}
                            {compTask?.base ? (
                              <div style={{
                                position: 'absolute', left: `${baseGeom.left}%`, width: `${baseGeom.width}%`, height: '20px', bottom: '2px',
                                background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.3)',
                                borderRadius: '5px', display: 'flex', alignItems: 'center', padding: '0 6px',
                                zIndex: 1
                              }} title={`Baseline: ${baseGeom.start ? formatToDDMMYYYY(baseGeom.start) : 'TBD'} → ${baseGeom.end ? formatToDDMMYYYY(baseGeom.end) : 'TBD'}`}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Base Plan</span>
                              </div>
                            ) : (
                              <div style={{ position: 'absolute', left: 0, bottom: '2px', height: '20px', fontSize: '0.7rem', color: '#4b5563', fontStyle: 'italic' }}>
                                Not in baseline plan
                              </div>
                            )}

                            {/* Delay Connector Line & Label */}
                            {hasDrift && (
                              <>
                                {/* Horizontal dotted connector */}
                                <div style={{
                                  position: 'absolute',
                                  left: `${Math.min(compEndPos, baseEndPos)}%`,
                                  width: `${Math.max(2, Math.abs(compEndPos - baseEndPos))}%`,
                                  height: '0px',
                                  borderTop: `2px dotted ${delayDays > 0 ? '#ef4444' : '#10b981'}`,
                                  top: '26px',
                                  zIndex: 0
                                }} />
                                {/* Delay badge */}
                                <span style={{
                                  position: 'absolute',
                                  left: `${Math.max(compEndPos, baseEndPos) + 1}%`,
                                  top: '18px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  background: delayDays > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: delayDays > 0 ? '#f87171' : '#34d399',
                                  border: `1px solid ${delayDays > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                  whiteSpace: 'nowrap',
                                  zIndex: 3
                                }}>
                                  {delayDays > 0 ? `+${delayDays}d Delay` : `${delayDays}d Ahead`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // Normal single bar Gantt row (as originally implemented)
                      const taskStart = m.startDate ? new Date(m.startDate).getTime() : projStart;
                      const taskEnd = m.endDate ? new Date(m.endDate).getTime() : projEnd;
                      const leftOffset = projDuration > 0 ? Math.max(0, Math.min(100, ((taskStart - projStart) / projDuration) * 100)) : 0;
                      const widthVal = projDuration > 0 ? Math.max(2, Math.min(100 - leftOffset, ((taskEnd - taskStart) / projDuration) * 100)) : 100;
                      
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.65rem' }}>
                          <div style={{ width: '240px', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: progress === 100 ? '#10b981' : 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textShadow: progress === 100 ? '0 0 8px rgba(16,185,129,0.3)' : 'none' }} title={m.title}>
                              {progress === 100 && (
                                <Check size={18} color="#10b981" strokeWidth={3.5} style={{ flexShrink: 0, filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.4))' }} />
                              )}
                              {m.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem' }}>{subtasks.length} subtasks · {m.estimatedHours}h</span>
                          </div>
                          <div style={{ flex: 1, position: 'relative', height: '34px', marginLeft: '1rem' }}>
                            <div style={{
                              position: 'absolute', left: `${leftOffset}%`, width: `${widthVal}%`, height: '28px', top: '3px',
                              background: 'rgba(99,102,241,0.15)', border: `2px solid ${getPriorityColor(m.priority)}`,
                              borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 8px',
                            }} title={`${m.title}: ${m.startDate || 'TBD'} → ${m.endDate || 'TBD'}`}>
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: getPriorityColor(m.priority), opacity: 0.2 }} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', zIndex: 1 }}>
                                {progress === 100 && (
                                  <Check size={14} color="#10b981" strokeWidth={3.5} style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }} />
                                )}
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: progress === 100 ? '#10b981' : 'white' }}>{progress}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Milestones Detail Table with CRUD ─── */}
          {projectMilestones.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>📋 Milestones & Subtasks</h3>
                <button 
                  disabled={true} 
                  style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: '#10b981', 
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    padding: '0.4rem 1rem', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontSize: '0.8rem',
                    cursor: 'not-allowed'
                  }}
                >
                  <Check size={14} /> Already
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredMilestones.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No matching milestones or subtasks found</h3>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try adjusting your search terms.</p>
                  </div>
                ) : (
                  filteredMilestones.map(m => {
                    const progress = calculateMilestoneProgress(m.id, m.status);
                    const subtasks = getSubtasks(m.id);
                    const visibleSubtasks = subtasks.filter(sub => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      const milestoneMatches = m.title.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
                      if (milestoneMatches) return true;
                      return sub.title.toLowerCase().includes(q) || (sub.description || '').toLowerCase().includes(q);
                    });
                    const isExpanded = searchQuery ? true : expandedMilestones.has(m.id);
                    const statusColors = getStatusColor(m.status);

                    return (
                      <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Milestone row */}
                        <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '28px 2fr 1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleMilestone(m.id)}>
                        {/* Expand icon */}
                        <span style={{ color: '#6b7280' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        {/* Title */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 700 }}>MAIN</span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{m.title}</span>
                          </div>
                          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{m.description}</p>
                        </div>
                        {/* Dates */}
                        <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                          {m.startDate && m.endDate ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span>{formatToDDMMYYYY(m.startDate)}</span>
                              <ArrowRight size={10} />
                              <span>{formatToDDMMYYYY(m.endDate)}</span>
                            </div>
                          ) : <span style={{ color: '#4b5563' }}>Not scheduled</span>}
                        </div>
                        {/* Hours */}
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{m.estimatedHours}h</span>
                        {/* Owner */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img src={getAssigneeAvatar(m.assigneeId)} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                          <span style={{ fontSize: '0.9rem', color: '#d1d5db' }}>{getAssigneeName(m.assigneeId)}</span>
                        </div>
                        {/* Status + Progress */}
                        <div>
                          <span style={{ fontSize: '0.82rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}33`, fontWeight: 600 }}>{m.status}</span>
                          <div style={{ marginTop: '0.35rem', width: '80px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: getPriorityColor(m.priority), borderRadius: '2px' }} />
                          </div>
                        </div>
                        {/* Actions */}
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => openAddSubtask(m.id)} title="Add subtask" style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', cursor: 'pointer', borderRadius: '6px', padding: '0.35rem 0.5rem', display: 'flex' }}><Plus size={13} /></button>
                          <button onClick={() => openEditTask(m)} title="Edit" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: '6px', padding: '0.35rem 0.5rem', display: 'flex' }}><Edit size={13} /></button>
                          <button onClick={() => handleDeleteTask(m.id, true)} title="Delete" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', padding: '0.35rem 0.5rem', display: 'flex' }}><Trash2 size={13} /></button>
                        </div>
                      </div>

                      {/* Subtasks (expanded) */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                          {subtasks.length === 0 ? (
                            <div style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic' }}>No subtasks yet — click ➕ to add one.</div>
                          ) : visibleSubtasks.length === 0 ? (
                            <div style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic' }}>No subtasks match your search query.</div>
                          ) : (
                            visibleSubtasks.map(sub => {
                              const subColors = getStatusColor(sub.status);
                              return (
                                <div key={sub.id} style={{ padding: '0.65rem 1.25rem 0.65rem 3rem', display: 'grid', gridTemplateColumns: '28px 2fr 1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: '#374151', fontSize: '0.85rem' }}>↳</span>
                                  <div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#e5e7eb' }}>{sub.title}</span>
                                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{sub.description}</p>
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                    {sub.startDate ? formatToDDMMYYYY(sub.startDate) : '—'}
                                  </div>
                                  <span style={{ fontSize: '0.92rem', color: '#e5e7eb' }}>{sub.estimatedHours}h</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <img src={getAssigneeAvatar(sub.assigneeId)} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{getAssigneeName(sub.assigneeId)}</span>
                                  </div>
                                  <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', borderRadius: '5px', background: subColors.bg, color: subColors.text, fontWeight: 600 }}>{sub.status}</span>
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button onClick={() => openEditTask(sub)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: '6px', padding: '0.3rem 0.45rem', display: 'flex' }}><Edit size={12} /></button>
                                    <button onClick={() => handleDeleteTask(sub.id, false)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', padding: '0.3rem 0.45rem', display: 'flex' }}><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div style={{ padding: '0.5rem 1.25rem 0.5rem 3rem' }}>
                            <button onClick={() => openAddSubtask(m.id)} style={{ background: 'transparent', border: '1px dashed rgba(99,102,241,0.4)', color: '#818cf8', cursor: 'pointer', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Plus size={13} /> Add Subtask
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          )}
          </>
        )
      ) : (
        <div className="glass-panel flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No active projects found. Please create a project first.</p>
        </div>
      )}

      {/* ─── CRUD Modal ─── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '640px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingTask ? 'Edit Task' : (formIsMain ? 'Add New Milestone' : 'Add Subtask')}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Task type toggle (only when adding new) */}
              {!editingTask && (
                <div>
                  <label style={labelStyle}>Task Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['Main', 'Sub'] as const).map(type => (
                      <button key={type} type="button" onClick={() => { setFormIsMain(type === 'Main'); if (type === 'Main') setFormParentId(''); else setFormParentId(defaultParentId || ''); }}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `1px solid ${(type === 'Main') === formIsMain ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`, background: (type === 'Main') === formIsMain ? 'rgba(99,102,241,0.2)' : 'transparent', color: (type === 'Main') === formIsMain ? '#a5b4fc' : '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                        {type === 'Main' ? '🎯 Main Milestone' : '📝 Subtask'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent task selector (for subtasks) */}
              {!formIsMain && (
                <div>
                  <label style={labelStyle}>Under Milestone *</label>
                  <select value={formParentId} onChange={e => setFormParentId(e.target.value)} style={inputStyle} required>
                    <option value="">Select Main Task...</option>
                    {projectMilestones.filter(m => m.id !== editingTask?.id).map(m => (
                      <option key={m.id} value={m.id}>{m.title} ({m.estimatedHours}h)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label style={labelStyle}>Title *</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} style={inputStyle} placeholder="Enter task title..." required />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} placeholder="Brief summary of this task..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Status */}
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as TaskStatus)} style={inputStyle}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Priority */}
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value as TaskPriority)} style={inputStyle}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Assignee */}
                <div>
                  <label style={labelStyle}>Assignee</label>
                  <select value={formAssigneeId} onChange={e => setFormAssigneeId(e.target.value)} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                {/* Est Hours */}
                <div>
                  <label style={labelStyle}>Est. Hours</label>
                  <input type="number" value={formEstHours} onChange={e => setFormEstHours(e.target.value)} style={inputStyle} min="0" placeholder="0" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Start Date */}
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <CustomDateInput value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={inputStyle} />
                </div>
                {/* End Date */}
                <div>
                  <label style={labelStyle}>End Date</label>
                  <CustomDateInput value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <button type="submit" className="hover-lift" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', color: 'white', border: 'none', padding: '0.85rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Save size={18} /> {editingTask ? 'Update Task' : 'Save Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Save Baseline Modal ─── */}
      {isBaselineModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Save Baseline Version</h2>
              <button onClick={() => setIsBaselineModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleSaveBaseline} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Version Name *</label>
                <input 
                  type="text" 
                  value={newBaselineName} 
                  onChange={e => setNewBaselineName(e.target.value)} 
                  style={inputStyle} 
                  placeholder="e.g. preplan, v1_start, plan_final..." 
                  required 
                />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea 
                  value={newBaselineDesc} 
                  onChange={e => setNewBaselineDesc(e.target.value)} 
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
                  placeholder="Describe the context of this plan version..." 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsBaselineModalOpen(false)} 
                  style={{ 
                    flex: 1, 
                    background: 'rgba(255,255,255,0.06)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingBaseline}
                  className="hover-lift" 
                  style={{ 
                    flex: 1, 
                    background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    opacity: savingBaseline ? 0.7 : 1
                  }}
                >
                  {savingBaseline ? 'Saving...' : 'Save Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
