export type Language = 'th' | 'en';

export interface TranslationDictionary {
  // Navigation
  dashboard: string;
  leads: string;
  quotations: string;
  projects: string;
  projectBoard: string;
  projectTimeline: string;
  projectPlan: string;
  tasks: string;
  timesheet: string;
  siteCheckInOut: string;
  chat: string;
  team: string;
  userManagement: string;
  reports: string;
  settings: string;
  help: string;

  // Header & Common
  systemOverview: string;
  themeLight: string;
  themeDark: string;
  language: string;
  logout: string;
  search: string;
  filter: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  addProject: string;
  addTask: string;
  checkIn: string;
  checkOut: string;
  status: string;
  actions: string;
  date: string;
  user: string;
  project: string;
  allProjects: string;
  allUsers: string;

  // Statuses
  toDo: string;
  inProgress: string;
  review: string;
  done: string;
  active: string;
  completed: string;
  planning: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  th: {
    // Navigation
    dashboard: 'แดชบอร์ดโครงการ',
    leads: 'ลูกค้ามุ่งหวัง (Leads)',
    quotations: 'ใบเสนอราคา & BOQ',
    projects: 'รายชื่อโครงการติดตั้ง',
    projectBoard: 'โปรเจกต์บอร์ด',
    projectTimeline: 'ปฏิทินโปรเจกต์',
    projectPlan: 'แผนงาน / Gantt',
    tasks: 'ขั้นตอนงาน & QC',
    timesheet: 'บันทึกหน้างาน / ช่าง',
    siteCheckInOut: 'เช็คอิน / เช็คเอาท์ช่าง',
    chat: 'แชทติดต่อช่าง',
    team: 'ช่างติดตั้ง & ทีมงาน',
    userManagement: 'จัดการผู้ใช้งาน',
    reports: 'สรุปงบประมาณและต้นทุน',
    settings: 'ตั้งค่าระบบ',
    help: 'คู่มือระบบ BuildFlow',

    // Header & Common
    systemOverview: 'ภาพรวมระบบบริหารจัดการ',
    themeLight: 'ธีมสว่าง',
    themeDark: 'ธีมมืด',
    language: 'ภาษา',
    logout: 'ออกจากระบบ',
    search: 'ค้นหา...',
    filter: 'กรองข้อมูล',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    edit: 'แก้ไข',
    delete: 'ลบ',
    addProject: '+ สร้างโครงการใหม่',
    addTask: '+ สร้างงานย่อยใหม่',
    checkIn: '📍 บันทึก Check-In หน้างาน',
    checkOut: '🚪 บันทึก Check-Out',
    status: 'สถานะ',
    actions: 'การดำเนินการ',
    date: 'วันที่',
    user: 'ผู้ใช้งาน / ช่าง',
    project: 'โครงการ',
    allProjects: 'ทุกโครงการ',
    allUsers: 'ผู้ใช้งานทุกคน',

    // Statuses
    toDo: 'รอดำเนินการ (To Do)',
    inProgress: 'กำลังทำ (In Progress)',
    review: 'รอตรวจสอบ (Review)',
    done: 'เสร็จสิ้น (Done)',
    active: 'กำลังดำเนินการ (Active)',
    completed: 'เสร็จสมบูรณ์ (Completed)',
    planning: 'วางแผนงาน (Planning)',
  },
  en: {
    // Navigation
    dashboard: 'Project Dashboard',
    leads: 'Leads Management',
    quotations: 'Quotations & BOQ',
    projects: 'Projects List',
    projectBoard: 'Project Board',
    projectTimeline: 'Project Timeline',
    projectPlan: 'Project Plan & Gantt',
    tasks: 'Tasks & QC',
    timesheet: 'Timesheet & Site Logs',
    siteCheckInOut: 'Site Check-In / Out',
    chat: 'Technician Chat',
    team: 'Technicians & Team',
    userManagement: 'User Management',
    reports: 'Financial Reports & Costs',
    settings: 'System Settings',
    help: 'BuildFlow User Guide',

    // Header & Common
    systemOverview: 'System Overview',
    themeLight: 'Light Theme',
    themeDark: 'Dark Theme',
    language: 'Language',
    logout: 'Log Out',
    search: 'Search...',
    filter: 'Filter Data',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    addProject: '+ New Project',
    addTask: '+ Add New Task',
    checkIn: '📍 Site Check-In',
    checkOut: '🚪 Site Check-Out',
    status: 'Status',
    actions: 'Actions',
    date: 'Date',
    user: 'User / Tech',
    project: 'Project',
    allProjects: 'All Projects',
    allUsers: 'All Users',

    // Statuses
    toDo: 'To Do',
    inProgress: 'In Progress',
    review: 'Review',
    done: 'Done',
    active: 'Active',
    completed: 'Completed',
    planning: 'Planning',
  }
};
