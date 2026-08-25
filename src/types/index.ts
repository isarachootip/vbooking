export type GlobalRole = 'Admin' | 'Manager' | 'Employee' | 'User' | 'QC';
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
  assignedBranches?: string[];
  assignedZones?: string[];
  workSlots?: string[];
  certificates?: Array<{ name: string; url?: string; type?: string; selected?: boolean }>;
  criminalRecord?: string;
  creditTermDays?: number;
  technicianLevel?: string;
  // Home Origin Location for Daily Route Planning
  homeLatitude?: number | string | null;
  homeLongitude?: number | string | null;
  homeAddress?: string;
}

export interface MasterBranch {
  id: string;
  code: string;
  name: string;
  province: string;
  status: string;
  zone?: string;
  region?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  province: string;
  status: string;
  zone?: string;
  region?: string;
  fullName?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  openTime?: string;
  closeTime?: string;
  phone?: string;
  storeGroup?: string;
  assignedQcIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterZone {
  id: string;
  name: string;
  createdAt?: string;
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
  customerName?: string | null;
  customerPhone?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  site_latitude?: number | string | null;
  site_longitude?: number | string | null;
  execution_phase?: string;
  projectValue?: number;
  invoicedValue?: number;
  collectedValue?: number;
  plannedExpense?: number;
  actualExpense?: number;
  projectTemplateName?: string;
  extraDetails?: {
    notes?: string;
    surveyAppNo?: string;
    questionnaireNo?: string;
    qtNo?: string;
    branch?: string;
    customerStaffPic?: string;
    refStartDate?: string;
    isAllDay?: boolean;
    surveyTicketNo?: string;
    surveyDate?: string;
    surveyTime?: string;
    surveyInspectorId?: string;
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
    lifecycle?: any;
  };
  leadId?: string | null;
  convertedAt?: string | null;
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
  attachments?: string[];
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
  check_in_lat?: number;
  check_in_lng?: number;
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
  iconName?: string;
  taskTypeStyle?: 'single' | 'workflow' | 'sla';
}

export type SystemSettings = Record<string, any>;

export interface ServicePriceItem {
  id: string;
  category: string;
  service_name: string;
  unit_type: string;
  material_cost: number;
  labor_cost: number;
  selling_price: number;
  is_active: boolean;
}

export type QCPlanItemStatus = 'Pending' | 'Travelling' | 'Checked In' | 'Inspecting' | 'Completed' | 'Skipped';

export interface QCPlanItem {
  id: string;
  planId: string;
  leadId?: string | null;
  projectId?: string | null;
  sequenceOrder: number;
  timeSlot?: string;
  siteName: string;
  customerName?: string;
  customerPhone?: string;
  siteAddress?: string;
  siteLatitude: number;
  siteLongitude: number;
  estimatedDistanceFromPrevKm?: number;
  estimatedDurationMin?: number;
  status: QCPlanItemStatus;
  checkInTime?: string;
  checkOutTime?: string;
  actualCheckInLat?: number;
  actualCheckInLng?: number;
  qcInspectionId?: string;
  notes?: string;
  createdAt?: string;
}

export interface QCDailyPlan {
  id: string;
  qcId: string;
  qcName?: string;
  qcAvatar?: string;
  qcPhone?: string;
  planDate: string; // YYYY-MM-DD
  originLatitude: number;
  originLongitude: number;
  originAddress?: string;
  totalEstimatedKm: number;
  totalEstimatedDurationMin: number;
  status: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed';
  notes?: string;
  items: QCPlanItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CustomerSite {
  id: string;
  customerId: string;
  siteName: string;
  isDefault: boolean;
  address: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mapUrl?: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
  coordinatorLineId?: string;
  siteNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  customerCode?: string;
  customerType: 'individual' | 'corporate';
  firstName: string;
  lastName?: string;
  customerName?: string;
  companyName?: string;
  taxId?: string;
  phone: string;
  phoneSecondary?: string;
  lineId?: string;
  email?: string;
  notes?: string;
  sites?: CustomerSite[];
  sitesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── MA (Maintenance Agreement) Types ─────────────────────────────────────────

export interface MAServiceItem {
  id: string;
  name: string;        // e.g. "ห้องนอนใหญ่"
  brand?: string;      // e.g. "Mitsubishi"
  model?: string;
  btu?: string;        // e.g. "1.5"
  location?: string;
  notes?: string;
}

export interface MARound {
  id: string;
  contractId: string;
  projectId?: string;
  roundNumber: number;
  scheduledDate?: string;
  actualDate?: string;
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Rescheduled' | 'Skipped';
  notes?: string;
  createdAt?: string;
  // Joined from projects
  projId?: string;
  projName?: string;
  projStatus?: string;
}

export interface MAContract {
  id: string;
  contractNo?: string;
  customerId?: string;
  customerSiteId?: string;
  serviceType?: string;
  serviceItems: MAServiceItem[];
  frequencyMonths: number;
  totalRounds: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractValue?: number;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Suspended';
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  // Joined fields from API
  customerName?: string;
  customerPhone?: string;
  siteName?: string;
  siteAddress?: string;
  totalRoundsCount?: number;
  completedRounds?: number;
  rounds?: MARound[];
}

export interface MAChecklistItem {
  id: string;
  label: string;
  required: boolean;
  checked?: boolean;
  notes?: string;
}

export interface MAChecklistTemplate {
  id: string;
  serviceType: string;
  templateName?: string;
  checklistItems: MAChecklistItem[];
  createdAt?: string;
}
