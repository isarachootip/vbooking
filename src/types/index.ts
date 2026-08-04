export type GlobalRole = 'Admin' | 'Manager' | 'Employee' | 'User';
export type ProjectRole = string;
export type TaskStatus = string; // Made generic to support custom workflow columns
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TimesheetStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';
export type ProjectStatus = string;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  globalRole: GlobalRole;
  department: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  birthday?: string;
  skills?: string[];
  password?: string;
  wfhDays?: string[];
  // Technician Profile & ID Card Fields
  taxId?: string;
  idCardNumber?: string;
  idCardFiles?: Array<{ name: string; url?: string; type?: string; selected?: boolean }>;
  companyName?: string;
  lineId?: string;
  phones?: string[];
  jobTypes?: string[];
  serviceZones?: string[];
  workSlots?: string[];
  certificates?: Array<{ name: string; url?: string; type?: string; selected?: boolean }>;
  criminalRecord?: string;
  creditTermDays?: number;
  technicianLevel?: string;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  manDayRate?: number;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  text: string;
  timestamp: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: number;
  members: ProjectMember[];
  customColumns?: string[];
  permissionSchemeId?: string;
  projectType?: 'construction' | 'quick_service' | 'installation' | 'dev' | 'support' | string;
  supportTaskStyle?: 'monthly' | 'categories';

  address?: string;
  projectValue?: number;
  invoicedValue?: number;
  collectedValue?: number;
  plannedExpense?: number;
  actualExpense?: number;
  projectTemplateName?: string;
  extraDetails?: {
    notes?: string;
    branch?: string;
    customerStaffPic?: string;
    refStartDate?: string;
    isAllDay?: boolean;
    surveyTicketNo?: string;
    surveyQtNo?: string;
    renovateQtNo?: string;
    renovateTicketNo?: string;
    picUser?: string;
    jobType?: string;
    buildingType?: string;
    areaSize?: string;
    initialBudget?: number;
    channelReceivedDate?: string;
    paymentMethod?: string;
    workAreas?: string[];
    workTypes?: string[];
  };
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  status: 'Planned' | 'Active' | 'Completed';
  startDate?: string;
  endDate?: string;
}

export interface Release {
  id: string;
  projectId: string;
  name: string;
  status: 'Unreleased' | 'Released';
  releaseDate?: string;
}

export interface TaskCommit {
  id: string;
  taskId: string;
  commitHash: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface Task {
  id: string;
  projectId: string;
  assigneeId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedHours: number;
  createdAt: string;
  parentId?: string;
  startDate?: string;
  endDate?: string;
  sprintId?: string;
  releaseId?: string;
  storyPoints?: number;
  issueType?: 'Bug' | 'Story' | 'Task' | 'Sub-task';
  updatedAt?: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  startPercent: number;
  endPercent: number;
  estimatedHours: number;
  projectTemplateName?: string;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId?: string;
  date: string;
  hours: number;
  plannedHours?: number;
  startTime?: string;
  endTime?: string;
  description: string;
  status: TimesheetStatus;
  approvedBy?: string;
  approvedAt?: string;
  imageUrl?: string;
  workResults?: string;
  updatedAt?: string;
}

export interface PermissionScheme {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, string[]>;
}

export interface ProjectWorkflow {
  projectId: string;
  statuses: string[];
  transitions: Array<{
    from: string;
    to: string;
    conditions: Array<{ type: string; value?: any }>;
  }>;
}

export interface CostRate {
  id: string;
  roleName: string;
  ratePerDay: number;
  ratePerHour: number;
  currency: string;
}

export interface MasterProjectType {
  id: string;
  name: string;
  color: string;
  badgeText: string;
  description?: string;
  isActive: boolean;
}




