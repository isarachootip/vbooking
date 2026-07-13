import { useState, useEffect, useRef } from 'react';
import type { Task, TaskStatus, TaskPriority, Project, User, Sprint, Release, TaskCommit } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';
import { Plus, Filter, Clock, X, Edit, Trash2, GripVertical, Calendar, Bug, FileText, CheckSquare, Layers, GitBranch, GitCommit, ChevronRight, ChevronDown, BarChart3, CalendarRange } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const taskTemplates = [
  {
    title: 'Requirement Analysis & Specs Drafting',
    description: 'Gather, analyze, and detail project requirements. Deliverable: PRD / specification document.',
    estimatedHours: '12',
    priority: 'Medium'
  },
  {
    title: 'Database & System Architecture Design',
    description: 'Design database tables, indexes, entity relationships, and backend API endpoints structure.',
    estimatedHours: '16',
    priority: 'High'
  },
  {
    title: 'Database Setup & Initial Schema Migration',
    description: 'Create PostgreSQL database tables, define indexes, foreign keys, and seed initial values.',
    estimatedHours: '6',
    priority: 'High'
  },
  {
    title: 'Backend API Development: Auth & CRUD Operations',
    description: 'Implement API controllers, models, JWT authorization, and validation rules for core resources.',
    estimatedHours: '24',
    priority: 'High'
  },
  {
    title: 'Frontend Page Layouts & Core UI Components',
    description: 'Build responsive views, layouts, navigation, and reusable buttons, modals, cards.',
    estimatedHours: '16',
    priority: 'Medium'
  },
  {
    title: 'Frontend State Management & Backend API Integration',
    description: 'Connect frontend views to API endpoints using fetch/axios, handle loading states and local caching.',
    estimatedHours: '20',
    priority: 'High'
  },
  {
    title: 'Comprehensive QA Testing & Bug Resolution',
    description: 'Execute unit and integration tests, verify responsive display on mobile, fix discovered edge cases.',
    estimatedHours: '16',
    priority: 'High'
  },
  {
    title: 'CI/CD Pipeline Setup & Production Deployment',
    description: 'Configure build scripts, dockerize application, set environment variables, deploy to staging/production server.',
    estimatedHours: '8',
    priority: 'Urgent'
  }
];

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  users: User[];
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  releases: Release[];
  setReleases: React.Dispatch<React.SetStateAction<Release[]>>;
  projectWorkflows: any[];
  setProjectWorkflows: React.Dispatch<React.SetStateAction<any[]>>;
  permissionSchemes: any[];
  currentUser: User;
}

// ── Draggable Task Card ────────────────────────────────────────────────────────
interface DraggableCardProps {
  task: Task;
  isDragging?: boolean;
  getProjectName: (id: string) => string;
  getParentTaskTitle: (id?: string) => string;
  getUserAvatar: (id?: string) => string;
  getUserName: (id?: string) => string;
  getPriorityColor: (p: TaskPriority) => string;
  statuses: TaskStatus[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}

function DraggableCard({
  task,
  isDragging = false,
  getProjectName,
  getParentTaskTitle,
  getUserAvatar,
  getUserName,
  getPriorityColor,
  statuses,
  onEdit,
  onDelete,
  onMove,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    transition: isDragging ? 'none' : 'opacity 0.2s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent
        task={task}
        getProjectName={getProjectName}
        getParentTaskTitle={getParentTaskTitle}
        getUserAvatar={getUserAvatar}
        getUserName={getUserName}
        getPriorityColor={getPriorityColor}
        statuses={statuses}
        onEdit={onEdit}
        onDelete={onDelete}
        onMove={onMove}
      />
    </div>
  );
}

// ── Task Card Content (reused in DragOverlay too) ─────────────────────────────
interface TaskCardContentProps {
  task: Task;
  isOverlay?: boolean;
  getProjectName: (id: string) => string;
  getParentTaskTitle: (id?: string) => string;
  getUserAvatar: (id?: string) => string;
  getUserName: (id?: string) => string;
  getPriorityColor: (p: TaskPriority) => string;
  statuses: TaskStatus[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}

function TaskCardContent({
  task,
  isOverlay = false,
  getProjectName,
  getParentTaskTitle,
  getUserAvatar,
  getUserName,
  getPriorityColor,
  statuses,
  onEdit,
  onDelete,
  onMove,
}: TaskCardContentProps) {
  const getIssueTypeIcon = (type?: string) => {
    switch (type) {
      case 'Bug':
        return <Bug size={14} color="#ef4444" />;
      case 'Story':
        return <FileText size={14} color="#10b981" />;
      case 'Sub-task':
        return <GitBranch size={14} color="#a855f7" />;
      default:
        return <CheckSquare size={14} color="#3b82f6" />;
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
        borderRadius: '10px',
        boxShadow: isOverlay
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(139,92,246,0.4)'
          : undefined,
        cursor: isOverlay ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Card top row: project name + drag handle + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {getProjectName(task.projectId)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              padding: '2px',
              pointerEvents: 'none',
            }}
          >
            <GripVertical size={14} />
          </span>
          <button
            onClick={() => onEdit(task)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: 0 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Parent badge */}
      {task.parentId && (
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--accent-info)',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span>📁 Under: {getParentTaskTitle(task.parentId)}</span>
        </div>
      )}

      {/* Title */}
      <h4
        style={{
          fontSize: '0.925rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          flexWrap: 'wrap',
        }}
      >
        {!task.parentId && (
          <span
            style={{
              fontSize: '0.7rem',
              background: 'var(--bg-tertiary)',
              padding: '0.1rem 0.35rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            Main
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          {getIssueTypeIcon(task.issueType)}
        </span>
        {task.title}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '1rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.description}
      </p>

      {/* Footer: hours, SP, status select, avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> {task.estimatedHours || 0}h (= {task.estimatedHours ? task.estimatedHours / 8 : 0} MD)
          </span>
          {task.storyPoints !== undefined && task.storyPoints > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '50px',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
              title="Story Points"
            >
              {task.storyPoints} SP
            </span>
          )}
          {task.startDate && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              📅 {formatToDDMMYYYY(task.startDate)}{task.endDate ? ` → ${formatToDDMMYYYY(task.endDate)}` : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={task.status}
            onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              padding: '0.1rem 0.25rem',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <img
            src={getUserAvatar(task.assigneeId)}
            alt={getUserName(task.assigneeId)}
            title={getUserName(task.assigneeId)}
            style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0 }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ───────────────────────────────────────────────────────────
interface DroppableColumnProps {
  colStatus: TaskStatus;
  tasks: Task[];
  activeId: string | null;
  overColumnId: string | null;
  getProjectName: (id: string) => string;
  getParentTaskTitle: (id?: string) => string;
  getUserAvatar: (id?: string) => string;
  getUserName: (id?: string) => string;
  getPriorityColor: (p: TaskPriority) => string;
  statuses: TaskStatus[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}

function DroppableColumn({
  colStatus,
  tasks,
  activeId,
  overColumnId,
  getProjectName,
  getParentTaskTitle,
  getUserAvatar,
  getUserName,
  getPriorityColor,
  statuses,
  onEdit,
  onDelete,
  onMove,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: colStatus });

  const isHighlighted = isOver || overColumnId === colStatus;

  const colHeaderColors: Record<string, string> = {
    'To Do': '#6366f1',
    'In Progress': '#f59e0b',
    'Review': '#3b82f6',
    'Done': '#10b981',
  };
  return (
    <div
      ref={setNodeRef}
      className="glass-panel kanban-column"
      style={{
        padding: '1.25rem',
        background: isHighlighted
          ? 'rgba(139, 92, 246, 0.08)'
          : 'rgba(22, 26, 34, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        maxHeight: '100%',
        overflowY: 'hidden',
        border: isHighlighted
          ? '2px solid rgba(139, 92, 246, 0.7)'
          : '2px solid transparent',
        borderRadius: '12px',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colHeaderColors[colStatus] || 'var(--accent-primary)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600 }}>{colStatus}</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task Cards - Internally scrollable */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '60px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            isDragging={activeId === task.id}
            getProjectName={getProjectName}
            getParentTaskTitle={getParentTaskTitle}
            getUserAvatar={getUserAvatar}
            getUserName={getUserName}
            getPriorityColor={getPriorityColor}
            statuses={statuses}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
        {tasks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              opacity: isHighlighted ? 0.8 : 0.4,
              transition: 'opacity 0.15s ease',
            }}
          >
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

const getIssueTypeIconGlobal = (type?: string) => {
  switch (type) {
    case 'Bug':
      return <Bug size={14} color="#ef4444" />;
    case 'Story':
      return <FileText size={14} color="#10b981" />;
    case 'Sub-task':
      return <GitBranch size={14} color="#a855f7" />;
    default:
      return <CheckSquare size={14} color="#3b82f6" />;
  }
};

const getTaskKeyGlobal = (task: Task, projects: Project[]) => {
  const proj = projects.find((p) => p.id === task.projectId);
  const prefix = proj
    ? proj.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3)
    : 'TS';
  const suffix = task.id.includes('_') ? task.id.split('_')[1].slice(-4) : task.id.slice(-4);
  return `${prefix}-${suffix}`;
};

const getJiraStatusStyle = (status: TaskStatus) => {
  const s = status.toUpperCase();
  if (s.includes('TO DO') || s.includes('BACKLOG') || s.includes('PLANNED')) {
    return { bg: '#2d3748', color: '#cbd5e1' }; // dark gray/blue, light text
  }
  if (s.includes('PROGRESS') || s.includes('DEVELOP') || s.includes('ACTIVE')) {
    return { bg: '#1e3a8a', color: '#bfdbfe' }; // deep blue
  }
  if (s.includes('DONE') || s.includes('COMPLETED') || s.includes('FINISHED')) {
    return { bg: '#064e3b', color: '#a7f3d0' }; // dark green
  }
  return { bg: '#581c87', color: '#f3e8ff' }; // dark purple
};

const formatDueDate = (dateStr?: string) => {
  return formatToDDMMYYYY(dateStr);
};

interface BacklogTaskRowProps {
  task: Task;
  projects: Project[];
  openEditModal: (t: Task) => void;
  activeColumns: TaskStatus[];
  onMoveStatus: (id: string, status: TaskStatus) => void;
  onMoveSprint: (id: string, sprintId: string | undefined) => void;
  projectSprints: Sprint[];
  getUserAvatar: (id?: string) => string;
  getUserName: (id?: string) => string;
}

function BacklogTaskRow({
  task,
  projects,
  openEditModal,
  activeColumns,
  onMoveStatus,
  onMoveSprint,
  projectSprints,
  getUserAvatar,
  getUserName,
}: BacklogTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: 0.5,
        zIndex: 1000,
      }
    : undefined;

  const statusStyle = getJiraStatusStyle(task.status);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 1rem',
        background: isDragging ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        fontSize: '0.85rem',
        transition: 'background-color 0.2s',
        gap: '1rem',
      }}
      {...attributes}
    >
      {/* Left section: drag handle, issue type, key, title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        <span
          {...listeners}
          style={{
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            padding: '2px',
          }}
          title="Drag to reorder/move to sprint"
        >
          <GripVertical size={14} />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {getIssueTypeIconGlobal(task.issueType)}
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            fontWeight: 500,
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {getTaskKeyGlobal(task, projects)}
        </span>
        <span
          onClick={() => openEditModal(task)}
          style={{
            fontWeight: 500,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={task.title}
        >
          {task.title}
        </span>
      </div>

      {/* Right section: status, sprint, due date, story points, assignee, edit */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        {/* Inline Status Select (Jira status badge styled) */}
        <select
          value={task.status}
          onChange={(e) => onMoveStatus(task.id, e.target.value as TaskStatus)}
          style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.25rem 0.5rem',
            cursor: 'pointer',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        >
          {activeColumns.map((col) => (
            <option
              key={col}
              value={col}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {col}
            </option>
          ))}
        </select>

        {/* Quick Sprint Move Dropdown */}
        <select
          value={task.sprintId || ''}
          onChange={(e) => onMoveSprint(task.id, e.target.value || undefined)}
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            padding: '0.2rem 0.4rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Backlog</option>
          {projectSprints
            .filter((s) => s.status !== 'Completed')
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        {/* Due Date Badge */}
        {task.endDate && (
          <span
            style={{
              fontSize: '0.75rem',
              color:
                new Date(task.endDate) < new Date() && task.status !== 'Done'
                  ? 'var(--accent-danger)'
                  : 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
            }}
            title={`Due date: ${task.endDate}`}
          >
            {formatDueDate(task.endDate)}
          </span>
        )}

        {/* Story Points Pill */}
        {task.storyPoints !== undefined && task.storyPoints > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.75rem',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
            }}
            title={`${task.storyPoints} Story Points`}
          >
            {task.storyPoints}
          </span>
        ) : (
          <span style={{ width: '22px', height: '22px', display: 'inline-block' }} />
        )}

        {/* Assignee Avatar */}
        <img
          src={getUserAvatar(task.assigneeId)}
          alt={getUserName(task.assigneeId)}
          title={getUserName(task.assigneeId)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '1px solid var(--border-color)',
          }}
        />

        {/* Edit Button */}
        <button
          onClick={() => openEditModal(task)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
          title="Edit Task"
        >
          <Edit size={14} />
        </button>
      </div>
    </div>
  );
}

interface DroppableSprintSectionProps {
  sprintId: string;
  sprintName: string;
  sprintDates?: string;
  sprintStatus: 'Active' | 'Planned' | 'Completed';
  tasks: Task[];
  children: React.ReactNode;
  onComplete?: () => void;
  onStart?: () => void;
  onDelete?: () => void;
  storyPoints: { completed: number; total: number };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuickCreate: () => void;
  onEditDates: () => void;
  canManageSprints?: boolean;
}

function DroppableSprintSection({
  sprintId,
  sprintName,
  sprintDates,
  sprintStatus,
  tasks,
  children,
  onComplete,
  onStart,
  onDelete,
  storyPoints,
  isExpanded,
  onToggleExpand,
  onQuickCreate,
  onEditDates,
  canManageSprints,
}: DroppableSprintSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: sprintId,
  });

  return (
    <div
      ref={setNodeRef}
      className="glass-panel"
      style={{
        padding: '1.25rem',
        background: isOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(22, 26, 34, 0.4)',
        border: isOver ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header Panel */}
      <div
        className="flex-between"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggleExpand}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {isExpanded ? (
            <ChevronDown size={16} color="var(--text-secondary)" />
          ) : (
            <ChevronRight size={16} color="var(--text-secondary)" />
          )}
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{sprintName}</span>

          {sprintStatus === 'Active' && (
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-secondary)',
                padding: '0.1rem 0.45rem',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              ACTIVE
            </span>
          )}

          {canManageSprints ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onEditDates();
              }}
              style={{
                fontSize: '0.8rem',
                color: sprintDates ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'dashed',
              }}
              title="Click to edit sprint dates"
            >
              {sprintDates || 'Add dates'}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {sprintDates || 'No dates set'}
            </span>
          )}

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            • {tasks.length} work items
          </span>
        </div>

        {/* Right Info and Actions */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            style={{
              fontSize: '0.8rem',
              background: 'var(--bg-tertiary)',
              padding: '0.2rem 0.6rem',
              borderRadius: '50px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            Story Points: {storyPoints.completed} / {storyPoints.total}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canManageSprints && (
              <>
                {sprintStatus === 'Active' && onComplete && (
                  <button
                    onClick={onComplete}
                    style={{
                      background: 'var(--accent-secondary)',
                      color: 'white',
                      border: 'none',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  >
                    Complete Sprint
                  </button>
                )}

                {sprintStatus === 'Planned' && onStart && (
                  <button
                    onClick={onStart}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--accent-secondary)',
                      color: 'var(--accent-secondary)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Start Sprint
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={onDelete}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-danger)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {children}

          <div
            onClick={onQuickCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Plus size={14} /> Create task
          </div>
        </div>
      )}
    </div>
  );
}

interface DroppableBacklogSectionProps {
  tasks: Task[];
  children: React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuickCreate: () => void;
  onCreateSprint: () => void;
  canManageSprints?: boolean;
}

function DroppableBacklogSection({
  tasks,
  children,
  isExpanded,
  onToggleExpand,
  onQuickCreate,
  onCreateSprint,
  canManageSprints,
}: DroppableBacklogSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
  });

  return (
    <div
      ref={setNodeRef}
      className="glass-panel"
      style={{
        padding: '1.25rem',
        background: isOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(22, 26, 34, 0.4)',
        border: isOver ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header Panel */}
      <div
        className="flex-between"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isExpanded ? (
            <ChevronDown size={16} color="var(--text-secondary)" />
          ) : (
            <ChevronRight size={16} color="var(--text-secondary)" />
          )}
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>Project Backlog</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({tasks.length} tasks)
          </span>
        </div>

        {canManageSprints && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSprint();
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.8rem',
            }}
          >
            Create Sprint
          </button>
        )}
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {children}

          <div
            onClick={onQuickCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Plus size={14} /> Create task
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Tasks Component ───────────────────────────────────────────────────────
export const Tasks = ({ tasks, setTasks, projects, users, sprints, setSprints, releases, setReleases, projectWorkflows, setProjectWorkflows: _setProjectWorkflows, permissionSchemes, currentUser }: TasksProps) => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'backlog' | 'board' | 'timeline' | 'releases' | 'grooming'>('summary');
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const prevProjectRef = useRef(selectedProject);
  useEffect(() => {
    setAssigneeFilter(null);
    const projectChanged = prevProjectRef.current !== selectedProject;
    prevProjectRef.current = selectedProject;

    if (selectedProject === 'all') {
      setSelectedSprint('all');
    } else {
      const projSprints = sprints.filter((s) => s.projectId === selectedProject);
      const active = projSprints.find((s) => s.status === 'Active');
      
      if (projectChanged || (selectedSprint === 'all' && active)) {
        if (active) {
          setSelectedSprint(active.id);
        } else {
          setSelectedSprint('all');
        }
      }
    }
  }, [selectedProject, sprints, selectedSprint]);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [commits, setCommits] = useState<TaskCommit[]>([]);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskCategory, setTaskCategory] = useState<'Main' | 'Sub'>('Main');
  const [parentId, setParentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Agile additional states
  const [sprintId, setSprintId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [issueType, setIssueType] = useState<'Bug' | 'Story' | 'Task' | 'Sub-task'>('Task');

  // Backlog Grooming states
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [groomingSearch, setGroomingSearch] = useState('');
  const [groomingPriority, setGroomingPriority] = useState('all');
  const [groomingType, setGroomingType] = useState('all');
  const [groomingAssignee, setGroomingAssignee] = useState('all');

  // Bulk action values
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkSprint, setBulkSprint] = useState('');
  const [bulkStoryPoints, setBulkStoryPoints] = useState('');
  const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({ backlog: true });
  // Quick task creation states
  const [quickCreateSprintId, setQuickCreateSprintId] = useState<string | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');

  // Permission & Workflow transition validation helpers
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

    // Enforce: regular employees/users cannot edit, transition, assign, or delete other people's tasks
    if (taskObj && taskObj.assigneeId && taskObj.assigneeId !== currentUser.id) {
      if (['edit_task', 'delete_task', 'transition_task', 'assign_task'].includes(permissionKey)) {
        if (projectRole !== 'PM') {
          return false; // Can see, but not edit/modify!
        }
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

  const validateTransitionClient = (task: Task, newStatus: TaskStatus): { allowed: boolean; reason?: string } => {
    if (task.status === newStatus) return { allowed: true };
    
    const wf = projectWorkflows.find(w => w.projectId === task.projectId);
    if (!wf) return { allowed: true };
    
    const statuses = wf.statuses || [];
    const transitions = wf.transitions || [];
    
    if (!statuses.includes(newStatus)) {
      return { allowed: false, reason: `Status column "${newStatus}" does not exist in this project.` };
    }
    
    if (transitions.length === 0) {
      return { allowed: true };
    }
    
    const transition = transitions.find((t: any) => (t.from === task.status || t.from === '*') && t.to === newStatus);
    if (!transition) {
      return { allowed: false, reason: `Transition from "${task.status}" to "${newStatus}" is not allowed by this project's workflow.` };
    }
    
    const conditions = transition.conditions || [];
    for (const cond of conditions) {
      if (cond.type === 'pm_or_admin_only') {
        const globalRole = currentUser?.globalRole;
        const project = projects.find(p => p.id === task.projectId);
        const members = project?.members || [];
        const memberRole = members.find(m => m.userId === currentUser?.id)?.role;
        if (globalRole !== 'Admin' && globalRole !== 'Manager' && memberRole !== 'PM') {
          return { allowed: false, reason: `Only a Project Manager or Admin can perform this transition.` };
        }
      }
      if (cond.type === 'assignee_only') {
        if (task.assigneeId !== currentUser?.id) {
          return { allowed: false, reason: `Only the assignee of this task can perform this transition.` };
        }
      }
      if (cond.type === 'min_story_points') {
        if (!task.storyPoints || task.storyPoints <= 0) {
          return { allowed: false, reason: `This transition requires the task to have story points set.` };
        }
      }
      if (cond.type === 'has_description') {
        if (!task.description || task.description.trim() === '') {
          return { allowed: false, reason: `This transition requires the task to have a description.` };
        }
      }
      if (cond.type === 'has_estimated_hours') {
        if (!task.estimatedHours || task.estimatedHours <= 0) {
          return { allowed: false, reason: `This transition requires the task to have estimated hours set.` };
        }
      }
    }
    
    return { allowed: true };
  };

  const toggleSprintExpanded = (sId: string) => {
    setExpandedSprints((prev) => ({ ...prev, [sId]: prev[sId] === false }));
  };

  const handleQuickCreate = (sId: string | undefined, qTitle: string) => {
    if (!qTitle.trim()) {
      setQuickCreateSprintId(null);
      return;
    }
    const taskData: Task = {
      id: 't_' + Date.now(),
      projectId: selectedProject,
      title: qTitle.trim(),
      description: '',
      status: activeColumns[0] || 'To Do',
      priority: 'Medium',
      estimatedHours: 0,
      createdAt: new Date().toISOString(),
      sprintId: sId || undefined,
      issueType: 'Task',
    };
    setTasks((prev) => [...prev, taskData]);
    setQuickCreateTitle('');
    setQuickCreateSprintId(null);
  };

  const handleBacklogDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const destinationId = String(over.id);

    let targetSprintId: string | undefined = undefined;

    if (destinationId === 'backlog') {
      targetSprintId = undefined;
    } else if (destinationId.startsWith('s_')) {
      targetSprintId = destinationId;
    } else {
      const targetTask = tasks.find((t) => t.id === destinationId);
      if (targetTask) {
        targetSprintId = targetTask.sprintId;
      } else {
        return;
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, sprintId: targetSprintId } : t))
    );
  };

  const editSprintDates = (sId: string) => {
    const sprint = sprints.find((s) => s.id === sId);
    if (!sprint) return;
    const datesStr = prompt(
      `Enter dates for ${sprint.name} (e.g. 15 Jun - 29 Jun):`,
      sprint.startDate && sprint.endDate ? `${sprint.startDate} - ${sprint.endDate}` : ''
    );
    if (datesStr === null) return;

    if (!datesStr.trim()) {
      setSprints((prev) =>
        prev.map((s) => (s.id === sId ? { ...s, startDate: undefined, endDate: undefined } : s))
      );
      return;
    }

    const parts = datesStr.split(/[-—–to]/);
    if (parts.length >= 2) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === sId ? { ...s, startDate: parts[0].trim(), endDate: parts[1].trim() } : s
        )
      );
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === sId ? { ...s, startDate: datesStr.trim(), endDate: undefined } : s))
      );
    }
  };

  // Load project-specific columns
  const getProjectColumns = () => {
    if (selectedProject === 'all') {
      return ['To Do', 'In Progress', 'Review', 'Done'];
    }
    const proj = projects.find((p) => p.id === selectedProject);
    return proj?.customColumns && proj.customColumns.length > 0
      ? proj.customColumns
      : ['To Do', 'In Progress', 'Review', 'Done'];
  };

  const activeColumns = getProjectColumns();

  // Fetch commits when editing task
  useEffect(() => {
    if (editingTask) {
      fetch(`/api/tasks/${editingTask.id}/commits`)
        .then((res) => res.json())
        .then((data) => setCommits(data || []))
        .catch((err) => console.error('Error fetching commits:', err));
    } else {
      setCommits([]);
    }
  }, [editingTask]);

  // Lock parent overflow when in Board view
  useEffect(() => {
    const contentArea = document.querySelector('.content-area') as HTMLElement;
    if (contentArea) {
      if (activeSubTab === 'board') {
        contentArea.style.overflowY = 'hidden';
      } else {
        contentArea.style.overflowY = 'auto';
      }
    }
    return () => {
      if (contentArea) {
        contentArea.style.overflowY = 'auto';
      }
    };
  }, [activeSubTab]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const myProjectIds = new Set(
    projects
      .filter(p => currentUser?.globalRole === 'Admin' || currentUser?.globalRole === 'Manager' || p.members?.some(m => m.userId === currentUser?.id))
      .map(p => p.id)
  );

  const filteredTasks = (
    selectedProject === 'all'
      ? tasks.filter(t => myProjectIds.has(t.projectId))
      : tasks.filter((t) => t.projectId === selectedProject && myProjectIds.has(t.projectId))
  ).filter(t => !assigneeFilter || t.assigneeId === assigneeFilter);

  const getSortedSprints = () => {
    const projSprints = selectedProject === 'all'
      ? sprints
      : sprints.filter((s) => s.projectId === selectedProject);

    const statusOrder: Record<string, number> = { 'Active': 1, 'Planned': 2, 'Completed': 3 };
    
    return [...projSprints].sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  };

  const sprintFilteredTasks = selectedSprint === 'all'
    ? filteredTasks
    : filteredTasks.filter((t) => t.sprintId === selectedSprint);

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || 'Unknown Project';

  const getUserAvatar = (id?: string) => {
    if (!id) return 'https://i.pravatar.cc/150?u=unassigned';
    return users.find((u) => u.id === id)?.avatar || 'https://i.pravatar.cc/150?u=unassigned';
  };

  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return users.find((u) => u.id === id)?.name || 'Unknown User';
  };

  const getPriorityColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'Urgent': return 'var(--accent-danger)';
      case 'High': return 'var(--accent-warning)';
      case 'Medium': return 'var(--accent-info)';
      default: return 'var(--text-muted)';
    }
  };

  const getParentTaskTitle = (pId?: string) => {
    if (!pId) return '';
    return tasks.find((t) => t.id === pId)?.title || '';
  };

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setStatus(activeColumns[0] || 'To Do');
    setPriority('Medium');
    setEstimatedHours('');
    setAssigneeId('');
    const defaultProjId = selectedProject !== 'all' ? selectedProject : projects[0]?.id || '';
    setProjectId(defaultProjId);
    setTaskCategory('Main');
    setParentId('');
    setStartDate('');
    setEndDate('');
    
    // Intelligent Sprint pre-selection
    if (selectedSprint !== 'all') {
      const activeSprintOfProject = sprints.find(s => s.id === selectedSprint);
      if (activeSprintOfProject && activeSprintOfProject.projectId === defaultProjId) {
        setSprintId(selectedSprint);
      } else {
        const activeSprintOfProj = sprints.find(s => s.projectId === defaultProjId && s.status === 'Active');
        setSprintId(activeSprintOfProj ? activeSprintOfProj.id : '');
      }
    } else {
      const activeSprintOfProj = sprints.find(s => s.projectId === defaultProjId && s.status === 'Active');
      setSprintId(activeSprintOfProj ? activeSprintOfProj.id : '');
    }

    setReleaseId('');
    setStoryPoints('');
    setIssueType('Task');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setEstimatedHours(String(task.estimatedHours || ''));
    setAssigneeId(task.assigneeId || '');
    setProjectId(task.projectId);
    setTaskCategory(task.parentId ? 'Sub' : 'Main');
    setParentId(task.parentId || '');
    setStartDate(task.startDate || '');
    setEndDate(task.endDate || '');
    setSprintId(task.sprintId || '');
    setReleaseId(task.releaseId || '');
    setStoryPoints(task.storyPoints ? String(task.storyPoints) : '');
    setIssueType(task.issueType || 'Task');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !projectId) return alert('Title and Project are required');

    // 1. Enforce permission checks
    if (!editingTask) {
      if (!hasProjectPermission(projectId, 'create_task')) {
        return alert('Permission denied: You do not have permission to create tasks in this project.');
      }
    } else {
      if (!hasProjectPermission(editingTask.projectId, 'edit_task', editingTask)) {
        return alert('Permission denied: You do not have permission to edit this task.');
      }
      if (editingTask.assigneeId !== (assigneeId || undefined)) {
        if (!hasProjectPermission(editingTask.projectId, 'assign_task', editingTask)) {
          return alert('Permission denied: You do not have permission to assign tasks in this project.');
        }
      }
      if (editingTask.status !== status) {
        if (!hasProjectPermission(editingTask.projectId, 'transition_task', editingTask)) {
          return alert('Permission denied: You do not have permission to transition this task.');
        }
        const validation = validateTransitionClient(editingTask, status);
        if (!validation.allowed) {
          return alert(validation.reason || 'Transition blocked by workflow rules');
        }
      }
    }

    const est = estimatedHours ? Number(estimatedHours) : 0;
    const spVal = storyPoints ? Number(storyPoints) : 0;
    const parentVal = taskCategory === 'Sub' ? parentId : undefined;

    if (taskCategory === 'Sub') {
      if (!parentId) return alert('Please select a Main Task for this Subtask');
      const parentTask = tasks.find((t) => t.id === parentId);
      if (parentTask) {
        const parentLimit = parentTask.estimatedHours;
        const otherSubtasksHours = tasks
          .filter((t) => t.parentId === parentId && t.id !== (editingTask?.id || ''))
          .reduce((sum, t) => sum + t.estimatedHours, 0);

        if (otherSubtasksHours + est > parentLimit) {
          return alert(
            `Cannot save. Total subtask hours (${otherSubtasksHours + est}h) would exceed the Main Task's budgeted limit of ${parentLimit}h. (Already used: ${otherSubtasksHours}h)`
          );
        }
      }
    }

    const taskData: Task = {
      id: editingTask ? editingTask.id : 't_' + Date.now(),
      projectId,
      title,
      description,
      status,
      priority,
      estimatedHours: est,
      assigneeId: assigneeId || undefined,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      parentId: parentVal,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sprintId: sprintId || undefined,
      releaseId: releaseId || undefined,
      storyPoints: spVal || undefined,
      issueType: taskCategory === 'Sub' ? 'Sub-task' : issueType,
    };

    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? taskData : t)));
    } else {
      setTasks((prev) => [...prev, taskData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!hasProjectPermission(task.projectId, 'delete_task', task)) {
      alert('Permission denied: You do not have permission to delete tasks in this project.');
      return;
    }
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const updateTaskField = (taskId: string, fieldName: string, value: any) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (fieldName === 'assigneeId') {
      if (!hasProjectPermission(task.projectId, 'assign_task', task)) {
        alert('Permission denied: You do not have permission to assign tasks in this project.');
        return;
      }
    } else if (fieldName === 'status') {
      if (!hasProjectPermission(task.projectId, 'transition_task', task)) {
        alert('Permission denied: You do not have permission to transition tasks in this project.');
        return;
      }
      const validation = validateTransitionClient(task, value);
      if (!validation.allowed) {
        alert(validation.reason || 'Transition blocked by workflow rules');
        return;
      }
    } else {
      if (!hasProjectPermission(task.projectId, 'edit_task', task)) {
        alert('Permission denied: You do not have permission to edit tasks in this project.');
        return;
      }
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [fieldName]: value } : t));
  };

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!hasProjectPermission(task.projectId, 'transition_task', task)) {
      alert('Permission denied: You do not have permission to transition tasks in this project.');
      return;
    }

    const validation = validateTransitionClient(task, newStatus);
    if (!validation.allowed) {
      alert(validation.reason || 'Transition blocked by workflow rules');
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  // ── DnD Handlers ────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOverColumnId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id;
    if (overId && activeColumns.includes(overId as TaskStatus)) {
      setOverColumnId(String(overId));
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const draggedTaskId = String(active.id);
    const overId = String(over.id);

    // If dropped over a column status
    if (activeColumns.includes(overId as TaskStatus)) {
      moveTask(draggedTaskId, overId as TaskStatus);
      return;
    }

    // If dropped over another card - find which column the card belongs to
    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask) {
      moveTask(draggedTaskId, targetTask.status);
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  // ── Agile View Helpers ──────────────────────────────────────────────────────
  const projectSprints = sprints.filter((s) => s.projectId === selectedProject);
  const projectReleases = releases.filter((r) => r.projectId === selectedProject);
  const activeSprint = projectSprints.find((s) => s.status === 'Active');
  const plannedSprints = projectSprints.filter((s) => s.status === 'Planned');
  const backlogTasks = filteredTasks.filter((t) => !t.sprintId);

  const createSprint = () => {
    if (selectedProject === 'all') return alert('Please select a project first');
    if (!hasProjectPermission(selectedProject, 'manage_sprints')) {
      return alert('Permission denied: You do not have permission to manage sprints.');
    }
    const newSprint: Sprint = {
      id: 's_' + Date.now(),
      projectId: selectedProject,
      name: `Sprint ${projectSprints.length + 1}`,
      status: 'Planned',
    };
    setSprints((prev) => [...prev, newSprint]);
  };

  const startSprint = (sId: string) => {
    const sprintObj = sprints.find((s) => s.id === sId);
    if (!sprintObj || !hasProjectPermission(sprintObj.projectId, 'manage_sprints')) {
      return alert('Permission denied: You do not have permission to manage sprints.');
    }
    if (activeSprint) return alert('Only one sprint can be active at a time.');
    const today = new Date().toISOString().split('T')[0];
    setSprints((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, status: 'Active', startDate: today } : s))
    );
  };

  const completeSprint = (sId: string) => {
    const sprintObj = sprints.find((s) => s.id === sId);
    if (!sprintObj || !hasProjectPermission(sprintObj.projectId, 'manage_sprints')) {
      return alert('Permission denied: You do not have permission to manage sprints.');
    }
    if (!confirm('Are you sure you want to complete this Sprint?')) return;
    
    const activeCols = getProjectColumns();
    const doneCol = activeCols[activeCols.length - 1];

    const incompleteTasks = filteredTasks.filter((t) => t.sprintId === sId && t.status !== doneCol);
    if (incompleteTasks.length > 0) {
      const option = confirm(
        `There are ${incompleteTasks.length} incomplete tasks. Press OK to move them back to the Backlog, or CANCEL to keep them in this sprint (will be archived).`
      );
      if (option) {
        setTasks((prev) =>
          prev.map((t) =>
            t.sprintId === sId && t.status !== doneCol ? { ...t, sprintId: undefined } : t
          )
        );
      }
    }

    setSprints((prev) =>
      prev.map((s) =>
        s.id === sId
          ? {
              ...s,
              status: 'Completed',
              endDate: new Date().toISOString().split('T')[0],
            }
          : s
      )
    );
  };

  const createRelease = () => {
    if (selectedProject === 'all') return alert('Please select a project first');
    if (!hasProjectPermission(selectedProject, 'manage_releases')) {
      return alert('Permission denied: You do not have permission to manage releases.');
    }
    const name = prompt('Enter release version (e.g. v1.0.0):');
    if (!name) return;
    const newRelease: Release = {
      id: 'r_' + Date.now(),
      projectId: selectedProject,
      name,
      status: 'Unreleased',
    };
    setReleases((prev) => [...prev, newRelease]);
  };

  const toggleReleaseStatus = (rId: string) => {
    const relObj = releases.find((r) => r.id === rId);
    if (!relObj || !hasProjectPermission(relObj.projectId, 'manage_releases')) {
      return alert('Permission denied: You do not have permission to manage releases.');
    }
    setReleases((prev) =>
      prev.map((r) =>
        r.id === rId
          ? {
              ...r,
              status: r.status === 'Released' ? 'Unreleased' : 'Released',
              releaseDate: r.status === 'Unreleased' ? new Date().toISOString().split('T')[0] : undefined,
            }
          : r
      )
    );
  };

  const deleteRelease = (rId: string) => {
    const relObj = releases.find((r) => r.id === rId);
    if (!relObj || !hasProjectPermission(relObj.projectId, 'manage_releases')) {
      return alert('Permission denied: You do not have permission to manage releases.');
    }
    if (confirm('Are you sure you want to delete this Release?')) {
      setReleases((prev) => prev.filter((r) => r.id !== rId));
    }
  };

  const deleteSprint = (sId: string) => {
    const sprintObj = sprints.find((s) => s.id === sId);
    if (!sprintObj || !hasProjectPermission(sprintObj.projectId, 'manage_sprints')) {
      return alert('Permission denied: You do not have permission to manage sprints.');
    }
    if (confirm('Are you sure you want to delete this Sprint? Tasks will be returned to Backlog.')) {
      setTasks((prev) =>
        prev.map((t) => (t.sprintId === sId ? { ...t, sprintId: undefined } : t))
      );
      setSprints((prev) => prev.filter((s) => s.id !== sId));
    }
  };

  const applyBulkAction = (actionType: 'assign' | 'priority' | 'sprint' | 'storyPoints' | 'delete') => {
    if (selectedTaskIds.length === 0) return;
    
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    
    if (actionType === 'delete') {
      const unauthorized = selectedTasks.some(t => !hasProjectPermission(t.projectId, 'delete_task', t));
      if (unauthorized) {
        return alert('Permission denied: You do not have permission to delete one or more of the selected tasks.');
      }
      if (confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected tasks?`)) {
        setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
        setSelectedTaskIds([]);
      }
      return;
    }

    if (actionType === 'assign') {
      const unauthorized = selectedTasks.some(t => !hasProjectPermission(t.projectId, 'assign_task', t));
      if (unauthorized) {
        return alert('Permission denied: You do not have permission to assign one or more of the selected tasks.');
      }
    } else if (actionType === 'sprint') {
      const unauthorized = selectedTasks.some(t => !hasProjectPermission(t.projectId, 'manage_sprints', t));
      if (unauthorized) {
        return alert('Permission denied: You do not have permission to manage sprints (move tasks to sprints) for one or more of the selected tasks.');
      }
    } else {
      const unauthorized = selectedTasks.some(t => !hasProjectPermission(t.projectId, 'edit_task', t));
      if (unauthorized) {
        return alert('Permission denied: You do not have permission to edit one or more of the selected tasks.');
      }
    }

    setTasks(prev => prev.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        const updated = { ...t };
        if (actionType === 'assign') {
          updated.assigneeId = bulkAssignee || undefined;
        } else if (actionType === 'priority') {
          updated.priority = bulkPriority as TaskPriority;
        } else if (actionType === 'sprint') {
          updated.sprintId = bulkSprint || undefined;
        } else if (actionType === 'storyPoints') {
          updated.storyPoints = Number(bulkStoryPoints) || 0;
        }
        return updated;
      }
      return t;
    }));
    
    alert(`Successfully applied bulk action to ${selectedTaskIds.length} tasks.`);
    setSelectedTaskIds([]);
  };

  const getSprintStoryPoints = (sId: string) => {
    const sprintTasks = filteredTasks.filter((t) => t.sprintId === sId);
    const total = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    const activeCols = getProjectColumns();
    const doneCol = activeCols[activeCols.length - 1];
    const completed = sprintTasks
      .filter((t) => t.status === doneCol)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      
    return { total, completed };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      {/* Top Bar */}
      <div className="flex-between" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>
            Tasks & Agile Planner
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track and manage project tasks across Agile boards, sprints, and releases.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            className="glass-panel"
            style={{
              padding: '0.25rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Filter size={16} color="var(--text-secondary)" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <option value="all" style={{ background: 'var(--bg-secondary)' }}>
                All Projects
              </option>
              {projects
                .filter(p => 
                  currentUser?.globalRole === 'Admin' || 
                  currentUser?.globalRole === 'Manager' || 
                  p.members?.some(m => m.userId === currentUser?.id)
                )
                .map((p) => (
                  <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)' }}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          {(activeSubTab === 'board' || activeSubTab === 'timeline') && (
            <div
              className="glass-panel"
              style={{
                padding: '0.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Layers size={16} color="var(--text-secondary)" />
              <select
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <option value="all" style={{ background: 'var(--bg-secondary)' }}>
                  All Sprints
                </option>
                {getSortedSprints().map((s) => (
                  <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)' }}>
                    {s.name} {selectedProject === 'all' ? `(${getProjectName(s.projectId)})` : `(${s.status})`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={openAddModal}
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            className="hover-lift"
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      {/* Sub-navbar */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={() => setActiveSubTab('summary')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeSubTab === 'summary' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'summary' ? '2px solid #7C3AED' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'summary' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <BarChart3 size={16} /> Summary
        </button>
        <button
          onClick={() => setActiveSubTab('backlog')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeSubTab === 'backlog' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'backlog' ? '2px solid #7C3AED' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'backlog' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Layers size={16} /> Backlog
        </button>
        <button
          onClick={() => setActiveSubTab('board')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeSubTab === 'board' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'board' ? '2px solid #7C3AED' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'board' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Layers size={16} /> Board
        </button>
        <button
          onClick={() => setActiveSubTab('timeline')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeSubTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'timeline' ? '2px solid #7C3AED' : '2px solid transparent',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'timeline' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CalendarRange size={16} /> Timeline
        </button>
        {/* More dropdown for Releases and Grooming */}
        <div style={{ position: 'relative', marginLeft: '0.25rem' }}>
          <button
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: (activeSubTab === 'releases' || activeSubTab === 'grooming') ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: (activeSubTab === 'releases' || activeSubTab === 'grooming') ? '2px solid #7C3AED' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: (activeSubTab === 'releases' || activeSubTab === 'grooming') ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            More ▾
          </button>
          {moreDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.25rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '200px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => { setActiveSubTab('releases'); setMoreDropdownOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.65rem 1rem',
                  background: activeSubTab === 'releases' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                  border: 'none',
                  color: activeSubTab === 'releases' ? '#7C3AED' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === 'releases' ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <Calendar size={16} /> Releases / Versions
              </button>
              <button
                onClick={() => { setActiveSubTab('grooming'); setMoreDropdownOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.65rem 1rem',
                  background: activeSubTab === 'grooming' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                  border: 'none',
                  color: activeSubTab === 'grooming' ? '#7C3AED' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === 'grooming' ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <CheckSquare size={16} /> Backlog Grooming
              </button>
            </div>
          )}
        </div>

        {/* Project members filter */}
        {selectedProject !== 'all' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', paddingRight: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Assignee:</span>
            {projects.find(p => p.id === selectedProject)?.members?.map(m => {
              const u = users.find(user => user.id === m.userId);
              if (!u) return null;
              const isSelected = assigneeFilter === u.id;
              return (
                <img
                  key={u.id}
                  src={u.avatar}
                  alt={u.name}
                  title={u.name}
                  onClick={() => setAssigneeFilter(isSelected ? null : u.id)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    boxShadow: isSelected ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none',
                    opacity: assigneeFilter && !isSelected ? 0.4 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-lift"
                />
              );
            })}
            {assigneeFilter && (
              <button
                onClick={() => setAssigneeFilter(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  marginLeft: '0.25rem'
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── SUMMARY TAB ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'summary' && (() => {
        const summaryTasks = (
          selectedProject === 'all'
            ? tasks.filter(t => myProjectIds.has(t.projectId))
            : tasks.filter(t => t.projectId === selectedProject && myProjectIds.has(t.projectId))
        ).filter(t => !assigneeFilter || t.assigneeId === assigneeFilter);
        const columns = activeColumns;
        const doneCol = columns[columns.length - 1] || 'Done';
        const todoCol = columns[0] || 'To Do';
        const inProgressCol = columns.length > 2 ? columns[1] : 'In Progress';
        const reviewCol = columns.length > 3 ? columns[2] : 'Review';

        const todoCount = summaryTasks.filter(t => t.status === todoCol).length;
        const inProgressCount = summaryTasks.filter(t => t.status === inProgressCol).length;
        const reviewCount = summaryTasks.filter(t => t.status === reviewCol).length;
        const doneCount = summaryTasks.filter(t => t.status === doneCol).length;



        // Correct Sprint Progress calculations
        const sprintTasks = activeSprint ? summaryTasks.filter(t => t.sprintId === activeSprint.id) : [];
        const sprintTotalCount = sprintTasks.length;
        const sprintDoneCount = sprintTasks.filter(t => t.status === doneCol).length;
        const sprintDonePercent = sprintTotalCount > 0 ? Math.round((sprintDoneCount / sprintTotalCount) * 100) : 0;

        // Subtask Overview calculations
        const subtasks = summaryTasks.filter(t => t.parentId);
        const subtaskTodoCount = subtasks.filter(t => t.status === todoCol).length;
        const subtaskInProgressCount = subtasks.filter(t => t.status === inProgressCol).length;
        const subtaskReviewCount = subtasks.filter(t => t.status === reviewCol).length;
        const subtaskDoneCount = subtasks.filter(t => t.status === doneCol).length;
        const totalSubtasksCount = subtasks.length;
        const subtaskDonePercent = totalSubtasksCount > 0 ? Math.round((subtaskDoneCount / totalSubtasksCount) * 100) : 0;

        // Team workload
        const workloadMap: Record<string, number> = {};
        summaryTasks.forEach(t => {
          const key = t.assigneeId || '__unassigned__';
          workloadMap[key] = (workloadMap[key] || 0) + 1;
        });
        const maxWorkload = Math.max(...Object.values(workloadMap), 1);

        // Upcoming tasks (within 7 days)
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingTasks = summaryTasks
          .filter(t => t.endDate && new Date(t.endDate) >= now && new Date(t.endDate) <= sevenDays && t.status !== doneCol)
          .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Sprint Progress Card */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Sprint Progress
                </h3>
                {activeSprint ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{activeSprint.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                          {formatToDDMMYYYY(activeSprint.startDate) || '—'} → {formatToDDMMYYYY(activeSprint.endDate) || '—'}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#7C3AED', fontSize: '1.25rem' }}>{sprintDonePercent}%</span>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${sprintDonePercent}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>{todoCol}: <strong>{summaryTasks.filter(t => t.sprintId === activeSprint.id && t.status === todoCol).length}</strong></span>
                      <span>{inProgressCol}: <strong>{summaryTasks.filter(t => t.sprintId === activeSprint.id && t.status === inProgressCol).length}</strong></span>
                      <span>{reviewCol}: <strong>{summaryTasks.filter(t => t.sprintId === activeSprint.id && t.status === reviewCol).length}</strong></span>
                      <span>{doneCol}: <strong>{summaryTasks.filter(t => t.sprintId === activeSprint.id && t.status === doneCol).length}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active sprint. Start a sprint from the Backlog tab.</p>
                )}
              </div>

              {/* Subtasks Overview Card */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Subtasks Overview
                </h3>
                {totalSubtasksCount > 0 ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Subtask Completion</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                          {subtaskDoneCount} of {totalSubtasksCount} completed
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#10B981', fontSize: '1.25rem' }}>{subtaskDonePercent}%</span>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${subtaskDonePercent}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>{todoCol}: <strong>{subtaskTodoCount}</strong></span>
                      <span>{inProgressCol}: <strong>{subtaskInProgressCount}</strong></span>
                      <span>{reviewCol}: <strong>{subtaskReviewCount}</strong></span>
                      <span>{doneCol}: <strong>{subtaskDoneCount}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No subtasks created for this project yet.</p>
                )}
              </div>
            </div>

            {/* Task Status Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: todoCol, count: todoCount, color: '#6B7280', bg: 'rgba(107, 114, 128, 0.08)' },
                { label: inProgressCol, count: inProgressCount, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
                { label: reviewCol, count: reviewCount, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
                { label: doneCol, count: doneCount, color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
              ].map(card => (
                <div
                  key={card.label}
                  className="glass-panel"
                  style={{ padding: '1.25rem', background: card.bg, borderLeft: `3px solid ${card.color}` }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>{card.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>{card.count}</div>
                </div>
              ))}
            </div>

            {/* Team Workload */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Team Workload
              </h3>
              {Object.keys(workloadMap).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No tasks assigned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Object.entries(workloadMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([uid, count]) => {
                      const name = uid === '__unassigned__' ? 'Unassigned' : (users.find(u => u.id === uid)?.name || 'Unknown');
                      const barWidth = Math.round((count / maxWorkload) * 100);
                      return (
                        <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ minWidth: '120px', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                            <div style={{ width: `${barWidth}%`, height: '100%', background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ minWidth: '32px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Upcoming Tasks <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>(due within 7 days)</span>
              </h3>
              {upcomingTasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No upcoming tasks due in the next 7 days.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {upcomingTasks.map(t => {
                    const priorityColors: Record<string, string> = { Urgent: 'var(--accent-danger)', High: 'var(--accent-warning)', Medium: '#3B82F6', Low: '#6B7280' };
                    const daysLeft = Math.ceil((new Date(t.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(124, 58, 237, 0.06)',
                          borderRadius: '0.5rem',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: priorityColors[t.priority] || '#6B7280',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {users.find(u => u.id === t.assigneeId)?.name || 'Unassigned'}
                          </span>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: daysLeft <= 1 ? 'var(--accent-danger)' : daysLeft <= 3 ? 'var(--accent-warning)' : 'var(--text-secondary)',
                          }}>
                            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatToDDMMYYYY(t.endDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── TIMELINE TAB ───────────────────────────────────────────────────────── */}
      {activeSubTab === 'timeline' && (
        selectedProject === 'all' ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3>Please Select a Project</h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Timeline Gantt chart requires filtering by a specific project. Use the filter dropdown above.
            </p>
          </div>
        ) : (() => {
          // Timeline Gantt Chart implementation
          const timelineTasks = sprintFilteredTasks.filter(t => t.startDate || t.endDate);
        const allDates = timelineTasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean) as string[]);
        
        // Calculate date range
        const today = new Date();
        let minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => new Date(d).getTime()))) : new Date(today.getFullYear(), today.getMonth(), 1);
        let maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : new Date(today.getFullYear(), today.getMonth() + 2, 0);
        
        // Add buffer
        minDate = new Date(minDate.getTime() - 7 * 86400000);
        maxDate = new Date(maxDate.getTime() + 14 * 86400000);
        
        const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
        const dayWidth = 28; // pixels per day
        const totalWidth = totalDays * dayWidth;
        const rowHeight = 36;
        
        // Generate week markers
        const weeks: { date: Date; left: number }[] = [];
        const d = new Date(minDate);
        d.setDate(d.getDate() - d.getDay()); // Start from Sunday
        while (d <= maxDate) {
          const left = Math.round((d.getTime() - minDate.getTime()) / 86400000) * dayWidth;
          if (left >= 0) weeks.push({ date: new Date(d), left });
          d.setDate(d.getDate() + 7);
        }
        
        // Today marker
        const todayLeft = Math.round((today.getTime() - minDate.getTime()) / 86400000) * dayWidth;
        
        const getBarStyle = (task: Task) => {
          const start = task.startDate ? new Date(task.startDate) : today;
          const end = task.endDate ? new Date(task.endDate) : new Date(start.getTime() + 7 * 86400000);
          const left = Math.round((start.getTime() - minDate.getTime()) / 86400000) * dayWidth;
          const width = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) * dayWidth, dayWidth);
          return { left, width };
        };
        
        const priorityColors: Record<string, string> = {
          Urgent: '#EF4444',
          High: '#F59E0B',
          Medium: '#7C3AED',
          Low: '#6B7280'
        };
        
        const statusBg: Record<string, string> = {
          'Done': 'rgba(16, 185, 129, 0.25)',
          'In Progress': 'rgba(59, 130, 246, 0.25)',
          'Review': 'rgba(245, 158, 11, 0.25)',
          'To Do': 'rgba(107, 114, 128, 0.15)',
        };
        
        // Group by sprint
        const sprintGroups: { sprint: Sprint | null; tasks: Task[] }[] = [];
        const activeSprints = projectSprints.filter(s => s.status === 'Active');
        const plannedSprints = projectSprints.filter(s => s.status === 'Planned');
        const allSprintsOrdered = [...activeSprints, ...plannedSprints];
        
        for (const sp of allSprintsOrdered) {
          const spTasks = timelineTasks.filter(t => t.sprintId === sp.id);
          if (spTasks.length > 0) sprintGroups.push({ sprint: sp, tasks: spTasks });
        }
        const backlogTasks = timelineTasks.filter(t => !t.sprintId);
        if (backlogTasks.length > 0) sprintGroups.push({ sprint: null, tasks: backlogTasks });
        
        // Drag state for timeline
        const [dragInfo, setDragInfo] = useState<{
          taskId: string;
          type: 'move' | 'resize-left' | 'resize-right';
          startX: number;
          origLeft: number;
          origWidth: number;
          origStartDate: string;
          origEndDate: string;
        } | null>(null);
        
        const handleTimelineMouseDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize-left' | 'resize-right') => {
          e.preventDefault();
          e.stopPropagation();
          const bar = getBarStyle(task);
          setDragInfo({
            taskId: task.id,
            type,
            startX: e.clientX,
            origLeft: bar.left,
            origWidth: bar.width,
            origStartDate: task.startDate || new Date().toISOString().slice(0, 10),
            origEndDate: task.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          });
        };
        
        const handleTimelineMouseMove = (e: React.MouseEvent) => {
          if (!dragInfo) return;
          const dx = e.clientX - dragInfo.startX;
          const daysDelta = Math.round(dx / dayWidth);
          if (daysDelta === 0) return;
          
          const task = filteredTasks.find(t => t.id === dragInfo.taskId);
          if (!task) return;
          
          const origStart = new Date(dragInfo.origStartDate);
          const origEnd = new Date(dragInfo.origEndDate);
          
          let newStart: Date, newEnd: Date;
          if (dragInfo.type === 'move') {
            newStart = new Date(origStart.getTime() + daysDelta * 86400000);
            newEnd = new Date(origEnd.getTime() + daysDelta * 86400000);
          } else if (dragInfo.type === 'resize-left') {
            newStart = new Date(origStart.getTime() + daysDelta * 86400000);
            newEnd = origEnd;
            if (newStart >= newEnd) return;
          } else {
            newStart = origStart;
            newEnd = new Date(origEnd.getTime() + daysDelta * 86400000);
            if (newEnd <= newStart) return;
          }
          
          setTasks(prev => prev.map(t => t.id === dragInfo.taskId ? {
            ...t,
            startDate: newStart.toISOString().slice(0, 10),
            endDate: newEnd.toISOString().slice(0, 10),
          } : t));
        };
        
        const handleTimelineMouseUp = () => {
          if (dragInfo) {
            // Save to server
            const task = filteredTasks.find(t => t.id === dragInfo.taskId);
            if (task) {
              fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
              }).catch(() => {});
            }
            setDragInfo(null);
          }
        };
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Timeline Header */}
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CalendarRange size={20} color="#7C3AED" />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Timeline</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {timelineTasks.length} tasks with dates
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 12, height: 3, background: '#EF4444', borderRadius: 2 }} /> Urgent
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 12, height: 3, background: '#F59E0B', borderRadius: 2 }} /> High
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 12, height: 3, background: '#7C3AED', borderRadius: 2 }} /> Medium
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 12, height: 3, background: '#6B7280', borderRadius: 2 }} /> Low
                </span>
              </div>
            </div>

            {/* Gantt Chart */}
            <div
              className="glass-panel"
              style={{ overflow: 'auto', padding: 0, cursor: dragInfo ? 'grabbing' : 'default' }}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onMouseLeave={handleTimelineMouseUp}
            >
              <div style={{ display: 'flex', minWidth: totalWidth + 260 }}>
                {/* Left panel: task names */}
                <div style={{ width: 260, minWidth: 260, borderRight: '1px solid var(--border-color)', background: 'rgba(22, 26, 34, 0.6)', position: 'sticky', left: 0, zIndex: 10 }}>
                  {/* Header */}
                  <div style={{ height: 40, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Task
                  </div>
                  {/* Rows */}
                  {sprintGroups.map((group, gi) => (
                    <div key={gi}>
                      {/* Sprint header */}
                      <div style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 1rem',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#7C3AED',
                        background: 'rgba(124, 58, 237, 0.08)',
                        borderBottom: '1px solid var(--border-color)',
                        gap: '0.5rem',
                      }}>
                        <Layers size={12} />
                        {group.sprint ? group.sprint.name : '📋 Backlog'}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({group.tasks.length})</span>
                      </div>
                      {group.tasks.map(task => (
                        <div
                          key={task.id}
                          style={{
                            height: rowHeight,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 0.75rem',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: priorityColors[task.priority] || '#6B7280', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right panel: timeline bars */}
                <div style={{ flex: 1, position: 'relative' }}>
                  {/* Week headers */}
                  <div style={{ height: 40, borderBottom: '1px solid var(--border-color)', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {weeks.map((w, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        left: w.left,
                        width: dayWidth * 7,
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        borderLeft: '1px solid rgba(255,255,255,0.06)',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {w.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    ))}
                  </div>

                  {/* Today line */}
                  {todayLeft >= 0 && todayLeft <= totalWidth && (
                    <div style={{
                      position: 'absolute',
                      left: todayLeft,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: '#EF4444',
                      zIndex: 5,
                      opacity: 0.7,
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 2,
                        left: -14,
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '0.55rem',
                        padding: '1px 4px',
                        borderRadius: 3,
                        fontWeight: 700,
                      }}>
                        TODAY
                      </div>
                    </div>
                  )}

                  {/* Week grid lines */}
                  {weeks.map((w, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: w.left,
                      top: 40,
                      bottom: 0,
                      width: 1,
                      background: 'rgba(255,255,255,0.04)',
                    }} />
                  ))}

                  {/* Task bars */}
                  {sprintGroups.map((group, gi) => {
                    // Calculate offset for sprint headers
                    let offset = 0;
                    for (let i = 0; i < gi; i++) {
                      offset += 32 + sprintGroups[i].tasks.length * rowHeight;
                    }
                    
                    return (
                      <div key={gi}>
                        {/* Sprint header row */}
                        <div style={{
                          height: 32,
                          background: 'rgba(124, 58, 237, 0.04)',
                          borderBottom: '1px solid var(--border-color)',
                          position: 'relative',
                        }}>
                          {/* Sprint date range background */}
                          {group.sprint?.startDate && group.sprint?.endDate && (() => {
                            const spStart = new Date(group.sprint!.startDate!);
                            const spEnd = new Date(group.sprint!.endDate!);
                            const spLeft = Math.round((spStart.getTime() - minDate.getTime()) / 86400000) * dayWidth;
                            const spWidth = Math.round((spEnd.getTime() - spStart.getTime()) / 86400000) * dayWidth;
                            return (
                              <div style={{
                                position: 'absolute',
                                left: spLeft,
                                top: 4,
                                width: Math.max(spWidth, dayWidth),
                                height: 24,
                                background: 'rgba(124, 58, 237, 0.1)',
                                border: '1px dashed rgba(124, 58, 237, 0.3)',
                                borderRadius: 4,
                              }} />
                            );
                          })()}
                        </div>
                        
                        {/* Task bars */}
                        {group.tasks.map(task => {
                          const bar = getBarStyle(task);
                          const isDragging = dragInfo?.taskId === task.id;
                          const pColor = priorityColors[task.priority] || '#6B7280';
                          const sBg = statusBg[task.status] || statusBg['To Do'];
                          
                          return (
                            <div
                              key={task.id}
                              style={{
                                height: rowHeight,
                                position: 'relative',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              {/* Task bar */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: bar.left,
                                  top: 6,
                                  width: bar.width,
                                  height: rowHeight - 12,
                                  background: sBg,
                                  borderLeft: `3px solid ${pColor}`,
                                  borderRadius: 4,
                                  cursor: isDragging ? 'grabbing' : 'grab',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 6px',
                                  fontSize: '0.68rem',
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  userSelect: 'none',
                                  boxShadow: isDragging ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                                  transition: isDragging ? 'none' : 'box-shadow 0.15s',
                                  zIndex: isDragging ? 20 : 1,
                                }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, task, 'move')}
                                title={`${task.title}\n${task.startDate || '?'} → ${task.endDate || '?'}\nDrag to move`}
                              >
                                {/* Left resize handle */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: 6,
                                    height: '100%',
                                    cursor: 'col-resize',
                                    zIndex: 2,
                                  }}
                                  onMouseDown={(e) => handleTimelineMouseDown(e, task, 'resize-left')}
                                />
                                
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: 2 }}>
                                  {task.title}
                                </span>
                                
                                {/* Right resize handle */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    width: 6,
                                    height: '100%',
                                    cursor: 'col-resize',
                                    zIndex: 2,
                                  }}
                                  onMouseDown={(e) => handleTimelineMouseDown(e, task, 'resize-right')}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* No tasks message */}
            {timelineTasks.length === 0 && (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CalendarRange size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No tasks with dates found. Add start/end dates to tasks to see them on the timeline.</p>
              </div>
            )}
          </div>
        );
      })())}

      {/* CONDITIONAL SUBTAB RENDERING */}
      {activeSubTab === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="kanban-board"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeColumns.length}, minmax(250px, 1fr))`,
              gap: '1.25rem',
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              alignItems: 'stretch',
            }}
          >
            {activeColumns.map((colStatus) => {
              const statusTasks = sprintFilteredTasks.filter((t) => t.status === colStatus);
              return (
                <DroppableColumn
                  key={colStatus}
                  colStatus={colStatus}
                  tasks={statusTasks}
                  activeId={activeId}
                  overColumnId={overColumnId}
                  getProjectName={getProjectName}
                  getParentTaskTitle={getParentTaskTitle}
                  getUserAvatar={getUserAvatar}
                  getUserName={getUserName}
                  getPriorityColor={getPriorityColor}
                  statuses={activeColumns}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onMove={moveTask}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCardContent
                task={activeTask}
                isOverlay
                getProjectName={getProjectName}
                getParentTaskTitle={getParentTaskTitle}
                getUserAvatar={getUserAvatar}
                getUserName={getUserName}
                getPriorityColor={getPriorityColor}
                statuses={activeColumns}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onMove={moveTask}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {activeSubTab === 'backlog' && (
        selectedProject === 'all' ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3>Please Select a Project</h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Backlog and Sprint planning require filtering by a specific project. Use the filter dropdown above.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event) => setActiveId(String(event.active.id))}
            onDragEnd={handleBacklogDragEnd}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Active Sprint Section */}
              {activeSprint && (
                <DroppableSprintSection
                  sprintId={activeSprint.id}
                  sprintName={activeSprint.name}
                  sprintDates={
                    activeSprint.startDate && activeSprint.endDate
                      ? `${formatToDDMMYYYY(activeSprint.startDate)} - ${formatToDDMMYYYY(activeSprint.endDate)}`
                      : undefined
                  }
                  sprintStatus="Active"
                  tasks={filteredTasks.filter((t) => t.sprintId === activeSprint.id)}
                  storyPoints={getSprintStoryPoints(activeSprint.id)}
                  isExpanded={expandedSprints[activeSprint.id] !== false}
                  onToggleExpand={() => toggleSprintExpanded(activeSprint.id)}
                  onComplete={() => completeSprint(activeSprint.id)}
                  canManageSprints={hasProjectPermission(selectedProject, 'manage_sprints')}
                  onQuickCreate={() => {
                    setQuickCreateSprintId(activeSprint.id);
                    setQuickCreateTitle('');
                  }}
                  onEditDates={() => editSprintDates(activeSprint.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {quickCreateSprintId === activeSprint.id && (
                      <div style={{ padding: '0.25rem 0.75rem' }}>
                        <input
                          autoFocus
                          type="text"
                          placeholder="What needs to be done? Press Enter to save, Esc to cancel"
                          value={quickCreateTitle}
                          onChange={(e) => setQuickCreateTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuickCreate(activeSprint.id, quickCreateTitle);
                            } else if (e.key === 'Escape') {
                              setQuickCreateSprintId(null);
                              setQuickCreateTitle('');
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              handleQuickCreate(activeSprint.id, quickCreateTitle);
                              setQuickCreateSprintId(null);
                            }, 200);
                          }}
                          style={{
                            width: '100%',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '4px',
                            padding: '0.5rem 0.75rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>
                    )}
                    {filteredTasks
                      .filter((t) => t.sprintId === activeSprint.id)
                      .map((task) => (
                        <BacklogTaskRow
                          key={task.id}
                          task={task}
                          projects={projects}
                          openEditModal={openEditModal}
                          activeColumns={activeColumns}
                          onMoveStatus={moveTask}
                          onMoveSprint={(id, sId) => {
                            setTasks((prev) =>
                              prev.map((t) => (t.id === id ? { ...t, sprintId: sId } : t))
                            );
                          }}
                          projectSprints={projectSprints}
                          getUserAvatar={getUserAvatar}
                          getUserName={getUserName}
                        />
                      ))}
                    {filteredTasks.filter((t) => t.sprintId === activeSprint.id).length === 0 && (
                      <p
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                          padding: '1.5rem',
                          border: '1px dashed var(--border-color)',
                          borderRadius: '6px',
                        }}
                      >
                        Drag tasks here or click 'Create task' below to start.
                      </p>
                    )}
                  </div>
                </DroppableSprintSection>
              )}

              {/* Planned Sprints */}
              {plannedSprints.map((sprint) => (
                <DroppableSprintSection
                  key={sprint.id}
                  sprintId={sprint.id}
                  sprintName={sprint.name}
                  sprintDates={
                    sprint.startDate && sprint.endDate
                      ? `${formatToDDMMYYYY(sprint.startDate)} - ${formatToDDMMYYYY(sprint.endDate)}`
                      : undefined
                  }
                  sprintStatus="Planned"
                  tasks={filteredTasks.filter((t) => t.sprintId === sprint.id)}
                  storyPoints={getSprintStoryPoints(sprint.id)}
                  isExpanded={expandedSprints[sprint.id] !== false}
                  onToggleExpand={() => toggleSprintExpanded(sprint.id)}
                  onStart={() => startSprint(sprint.id)}
                  onDelete={() => deleteSprint(sprint.id)}
                  canManageSprints={hasProjectPermission(selectedProject, 'manage_sprints')}
                  onQuickCreate={() => {
                    setQuickCreateSprintId(sprint.id);
                    setQuickCreateTitle('');
                  }}
                  onEditDates={() => editSprintDates(sprint.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {quickCreateSprintId === sprint.id && (
                      <div style={{ padding: '0.25rem 0.75rem' }}>
                        <input
                          autoFocus
                          type="text"
                          placeholder="What needs to be done? Press Enter to save, Esc to cancel"
                          value={quickCreateTitle}
                          onChange={(e) => setQuickCreateTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuickCreate(sprint.id, quickCreateTitle);
                            } else if (e.key === 'Escape') {
                              setQuickCreateSprintId(null);
                              setQuickCreateTitle('');
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              handleQuickCreate(sprint.id, quickCreateTitle);
                              setQuickCreateSprintId(null);
                            }, 200);
                          }}
                          style={{
                            width: '100%',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '4px',
                            padding: '0.5rem 0.75rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>
                    )}
                    {filteredTasks
                      .filter((t) => t.sprintId === sprint.id)
                      .map((task) => (
                        <BacklogTaskRow
                          key={task.id}
                          task={task}
                          projects={projects}
                          openEditModal={openEditModal}
                          activeColumns={activeColumns}
                          onMoveStatus={moveTask}
                          onMoveSprint={(id, sId) => {
                            setTasks((prev) =>
                              prev.map((t) => (t.id === id ? { ...t, sprintId: sId } : t))
                            );
                          }}
                          projectSprints={projectSprints}
                          getUserAvatar={getUserAvatar}
                          getUserName={getUserName}
                        />
                      ))}
                    {filteredTasks.filter((t) => t.sprintId === sprint.id).length === 0 && (
                      <p
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                          padding: '1.5rem',
                          border: '1px dashed var(--border-color)',
                          borderRadius: '6px',
                        }}
                      >
                        Drag tasks here or click 'Create task' below to start.
                      </p>
                    )}
                  </div>
                </DroppableSprintSection>
              ))}

              {/* Project Backlog Section */}
              <DroppableBacklogSection
                tasks={backlogTasks}
                isExpanded={expandedSprints['backlog'] !== false}
                onToggleExpand={() => toggleSprintExpanded('backlog')}
                onCreateSprint={createSprint}
                canManageSprints={hasProjectPermission(selectedProject, 'manage_sprints')}
                onQuickCreate={() => {
                  setQuickCreateSprintId('backlog');
                  setQuickCreateTitle('');
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {quickCreateSprintId === 'backlog' && (
                    <div style={{ padding: '0.25rem 0.75rem' }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="What needs to be done? Press Enter to save, Esc to cancel"
                        value={quickCreateTitle}
                        onChange={(e) => setQuickCreateTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickCreate(undefined, quickCreateTitle);
                          } else if (e.key === 'Escape') {
                            setQuickCreateSprintId(null);
                            setQuickCreateTitle('');
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            handleQuickCreate(undefined, quickCreateTitle);
                            setQuickCreateSprintId(null);
                          }, 200);
                        }}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '4px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  )}
                  {backlogTasks.map((task) => (
                    <BacklogTaskRow
                      key={task.id}
                      task={task}
                      projects={projects}
                      openEditModal={openEditModal}
                      activeColumns={activeColumns}
                      onMoveStatus={moveTask}
                      onMoveSprint={(id, sId) => {
                        setTasks((prev) =>
                          prev.map((t) => (t.id === id ? { ...t, sprintId: sId } : t))
                        );
                      }}
                      projectSprints={projectSprints}
                      getUserAvatar={getUserAvatar}
                      getUserName={getUserName}
                    />
                  ))}
                  {backlogTasks.length === 0 && (
                    <p
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        padding: '2rem',
                      }}
                    >
                      All tasks are currently assigned to Sprints.
                    </p>
                  )}
                </div>
              </DroppableBacklogSection>
            </div>
            <DragOverlay>
              {activeId ? (
                (() => {
                  const task = tasks.find((t) => t.id === activeId);
                  if (!task) return null;
                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--accent-primary)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        boxShadow: 'var(--shadow-lg)',
                        opacity: 0.9,
                        gap: '1rem',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>
                          <GripVertical size={14} />
                        </span>
                        {getIssueTypeIconGlobal(task.issueType)}
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                          }}
                        >
                          {getTaskKeyGlobal(task, projects)}
                        </span>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      )}

      {activeSubTab === 'releases' && (
        selectedProject === 'all' ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3>Please Select a Project</h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Releases and versioning require filtering by a specific project. Use the filter dropdown above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="flex-between">
              <h3>Releases & Versions</h3>
              {hasProjectPermission(selectedProject, 'manage_releases') && (
                <button
                  onClick={createRelease}
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Create Release
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {projectReleases.map((release) => {
                const releaseTasks = filteredTasks.filter((t) => t.releaseId === release.id);
                return (
                  <div key={release.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="flex-between">
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{release.name}</h4>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.5rem',
                            borderRadius: '50px',
                            background: release.status === 'Released' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: release.status === 'Released' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                          }}
                        >
                          {release.status}
                        </span>
                      </div>
                      {hasProjectPermission(release.projectId, 'manage_releases') && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => toggleReleaseStatus(release.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {release.status === 'Released' ? 'Revert to Unreleased' : 'Release'}
                          </button>
                          <button
                            onClick={() => deleteRelease(release.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {release.releaseDate && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Released on: {release.releaseDate}</p>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Included Tasks ({releaseTasks.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                        {releaseTasks.map((t) => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.title}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {projectReleases.length === 0 && (
                <p style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No releases configured for this project.</p>
              )}
            </div>
          </div>
        )
      )}

      {activeSubTab === 'grooming' && (
        selectedProject === 'all' ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3>Please Select a Project</h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Backlog grooming requires filtering by a specific project. Use the filter dropdown above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div>
              <h3>Backlog Grooming & Refinement</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Refine, estimate, prioritize, and prepare backlog items for future sprints.
              </p>
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px', flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Search Backlog</span>
                <input
                  type="text"
                  placeholder="Filter by title/description..."
                  value={groomingSearch}
                  onChange={(e) => setGroomingSearch(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '130px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Issue Type</span>
                <select
                  value={groomingType}
                  onChange={(e) => setGroomingType(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="all">All Types</option>
                  <option value="Bug">Bug</option>
                  <option value="Story">Story</option>
                  <option value="Task">Task</option>
                  <option value="Sub-task">Sub-task</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '130px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Priority</span>
                <select
                  value={groomingPriority}
                  onChange={(e) => setGroomingPriority(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="all">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '160px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assignee</span>
                <select
                  value={groomingAssignee}
                  onChange={(e) => setGroomingAssignee(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedTaskIds.length > 0 && (
              <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-primary)', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(99, 102, 241, 0.08)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ⚡ Bulk Actions ({selectedTaskIds.length} selected)
                </span>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.3rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    <option value="">Unassign</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button onClick={() => applyBulkAction('assign')} style={{ background: 'var(--accent-info)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Assign
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={bulkPriority}
                    onChange={(e) => setBulkPriority(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.3rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <button onClick={() => applyBulkAction('priority')} style={{ background: 'var(--accent-info)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Set Priority
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={bulkSprint}
                    onChange={(e) => setBulkSprint(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.3rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    <option value="">Move to Backlog</option>
                    {sprints.filter(s => s.projectId === selectedProject && s.status !== 'Completed').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button onClick={() => applyBulkAction('sprint')} style={{ background: 'var(--accent-info)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Move to Sprint
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Story Points"
                    value={bulkStoryPoints}
                    onChange={(e) => setBulkStoryPoints(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.3rem', color: 'var(--text-primary)', fontSize: '0.8rem', width: '80px' }}
                  />
                  <button onClick={() => applyBulkAction('storyPoints')} style={{ background: 'var(--accent-info)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Set SP
                  </button>
                </div>

                <button onClick={() => applyBulkAction('delete')} style={{ background: 'var(--accent-danger)', color: 'white', border: 'none', padding: '0.35rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 'auto' }}>
                  Delete Selected
                </button>
              </div>
            )}

            {/* Backlog List */}
            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', maxHeight: '550px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-tertiary)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredTasks.filter(t => !t.sprintId).length > 0 && selectedTaskIds.length === filteredTasks.filter(t => !t.sprintId).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTaskIds(filteredTasks.filter(t => !t.sprintId).map(t => t.id));
                          } else {
                            setSelectedTaskIds([]);
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: '1rem', width: '100px' }}>Task ID</th>
                    <th style={{ padding: '1rem', width: '120px' }}>Type</th>
                    <th style={{ padding: '1rem' }}>Title</th>
                    <th style={{ padding: '1rem', width: '180px' }}>Grooming Status</th>
                    <th style={{ padding: '1rem', width: '160px' }}>Assignee</th>
                    <th style={{ padding: '1rem', width: '120px' }}>Priority</th>
                    <th style={{ padding: '1rem', width: '90px' }}>Story Points</th>
                    <th style={{ padding: '1rem', width: '130px' }}>Est. Hours (MD)</th>
                    <th style={{ padding: '1rem', width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const backlog = filteredTasks.filter(t => !t.sprintId);
                    const query = groomingSearch.toLowerCase().trim();
                    const filteredBacklog = backlog.filter(t => {
                      const matchesSearch = query === '' || 
                        t.title.toLowerCase().includes(query) || 
                        (t.description || '').toLowerCase().includes(query);
                      const matchesPriority = groomingPriority === 'all' || t.priority === groomingPriority;
                      const matchesType = groomingType === 'all' || t.issueType === groomingType;
                      const matchesAssignee = groomingAssignee === 'all' || 
                        (groomingAssignee === 'unassigned' ? !t.assigneeId : t.assigneeId === groomingAssignee);
                      return matchesSearch && matchesPriority && matchesType && matchesAssignee;
                    });

                    if (filteredBacklog.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            No backlog tasks found matching the criteria.
                          </td>
                        </tr>
                      );
                    }

                    return filteredBacklog.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      
                      // Calculate Grooming warnings
                      const warnings = [];
                      if (!task.description || task.description.trim() === '') warnings.push('No desc');
                      if (task.storyPoints === undefined || task.storyPoints === null || task.storyPoints === 0) warnings.push('No SP');
                      if (!task.assigneeId) warnings.push('No Assignee');
                      if (!task.estimatedHours || task.estimatedHours === 0) warnings.push('No Est');

                      const isGroomed = warnings.length === 0;

                      return (
                        <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)', background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent', transition: 'background var(--transition-fast)' }} className="hover-lift">
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaskIds(prev => [...prev, task.id]);
                                } else {
                                  setSelectedTaskIds(prev => prev.filter(id => id !== task.id));
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            #{task.id}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select
                              value={task.issueType || 'Task'}
                              onChange={(e) => updateTaskField(task.id, 'issueType', e.target.value)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                            >
                              <option value="Bug">🔴 Bug</option>
                              <option value="Story">🟢 Story</option>
                              <option value="Task">🔵 Task</option>
                              <option value="Sub-task">🟣 Sub-task</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                              style={{ background: 'transparent', border: 'none', width: '100%', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {isGroomed ? (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.5rem', borderRadius: '50px', background: 'rgba(16, 185, 129, 0.12)' }}>
                                ✅ Groomed
                              </span>
                            ) : (
                              <span 
                                title={warnings.join(', ')} 
                                style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-danger)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.5rem', borderRadius: '50px', background: 'rgba(239, 68, 68, 0.12)', cursor: 'help' }}
                              >
                                ⚠️ Needs {warnings.length} edits
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select
                              value={task.assigneeId || ''}
                              onChange={(e) => updateTaskField(task.id, 'assigneeId', e.target.value || undefined)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                            >
                              <option value="">Unassigned</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <select
                              value={task.priority}
                              onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Urgent">Urgent</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input
                              type="number"
                              value={task.storyPoints || 0}
                              onChange={(e) => updateTaskField(task.id, 'storyPoints', Number(e.target.value))}
                              style={{ background: 'transparent', border: 'none', width: '60px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                              min="0"
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input
                              type="number"
                              value={task.estimatedHours || 0}
                              onChange={(e) => updateTaskField(task.id, 'estimatedHours', Number(e.target.value))}
                              style={{ background: 'transparent', border: 'none', width: '60px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                              min="0"
                            />
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => openEditModal(task)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                title="Edit Full Details"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                                title="Delete Task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Task Add/Edit Modal */}
      {isModalOpen && (
        <div
          style={{
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
            zIndex: 1100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              width: '700px',
              maxWidth: '95%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex-between">
              <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!editingTask && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Load from Template (Helps break down tasks under 3 days)
                  </label>
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx) && taskTemplates[idx]) {
                        const tpl = taskTemplates[idx];
                        setTitle(tpl.title);
                        setDescription(tpl.description);
                        setEstimatedHours(String(tpl.estimatedHours || ''));
                        setPriority(tpl.priority as TaskPriority);
                      }
                    }}
                    defaultValue=""
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Select a Template --</option>
                    {taskTemplates.map((t, idx) => (
                      <option key={idx} value={idx}>
                        {t.title} ({t.estimatedHours}h = {t.estimatedHours ? Number(t.estimatedHours) / 8 : 0} MD)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Issue Type
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as any)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="Task">Task (Blue)</option>
                    <option value="Story">Story (Green)</option>
                    <option value="Bug">Bug (Red)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Story Points (SP)
                  </label>
                  <select
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="">No Estimate (0 SP)</option>
                    <option value="1">1 SP</option>
                    <option value="2">2 SP</option>
                    <option value="3">3 SP</option>
                    <option value="5">5 SP</option>
                    <option value="8">8 SP</option>
                    <option value="13">13 SP</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 1rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 1rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    minHeight: '60px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Project *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    required
                  >
                    <option value="">Select Project...</option>
                    {projects
                      .filter(p => 
                        currentUser?.globalRole === 'Admin' || 
                        currentUser?.globalRole === 'Manager' || 
                        p.members?.some(m => m.userId === currentUser?.id)
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Task Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as 'Main' | 'Sub')}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="Main">Main Task (Milestone / Parent)</option>
                    <option value="Sub">Subtask (To Do under Main Task)</option>
                  </select>
                </div>
              </div>

              {taskCategory === 'Sub' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Under Main Task *
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    required={taskCategory === 'Sub'}
                  >
                    <option value="">Select Main Task...</option>
                    {tasks
                      .filter(
                        (t) =>
                          t.projectId === projectId &&
                          !t.parentId &&
                          t.id !== (editingTask?.id || '')
                      )
                      .map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.title} ({mt.estimatedHours}h = {mt.estimatedHours ? mt.estimatedHours / 8 : 0} MD)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Sprint
                  </label>
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="">No Sprint (Backlog)</option>
                    {sprints.filter(s => s.projectId === projectId && s.status !== 'Completed').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Release / Version
                  </label>
                  <select
                    value={releaseId}
                    onChange={(e) => setReleaseId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="">No Release</option>
                    {releases.filter(r => r.projectId === projectId).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    {activeColumns.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Assignee
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Est. Hours {estimatedHours ? `(= ${Number(estimatedHours) / 8} MD)` : ''}
                  </label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem 1rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Start Date
                  </label>
                  <CustomDateInput
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem 1rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    End Date
                  </label>
                  <CustomDateInput
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem 1rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Commit History Panel */}
              {editingTask && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <GitCommit size={16} /> Git Commits & Updates ({commits.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {commits.map((c) => (
                      <div key={c.id} style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                        <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{c.commitHash}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-primary)', margin: '0.1rem 0' }}>{c.message}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>By: {c.author}</span>
                      </div>
                    ))}
                    {commits.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>
                        No commits logged yet. Hook up GitHub/GitLab and commit with <code>[{editingTask.id}]</code> to see updates.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                const isSaveDisabled = editingTask 
                  ? !hasProjectPermission(editingTask.projectId, 'edit_task', editingTask)
                  : (projectId ? !hasProjectPermission(projectId, 'create_task') : false);
                return (
                  <>
                    {isSaveDisabled && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        marginTop: '1rem',
                        color: 'var(--accent-danger)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500
                      }}>
                        ⚠️ Read-Only Mode: You do not have permission to save tasks in this project.
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSaveDisabled}
                      style={{
                        background: isSaveDisabled ? 'var(--text-muted)' : 'var(--accent-primary)',
                        color: isSaveDisabled ? 'rgba(255, 255, 255, 0.3)' : 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                        marginTop: '1rem',
                        opacity: isSaveDisabled ? 0.5 : 1
                      }}
                      className={isSaveDisabled ? '' : 'hover-lift'}
                    >
                      Save Task
                    </button>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
