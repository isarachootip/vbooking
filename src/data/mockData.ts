import type { User, Project, Task, TimesheetEntry } from '../types';

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    avatar: 'https://i.pravatar.cc/150?u=u1',
    globalRole: 'Manager',
    department: 'Engineering'
  },
  {
    id: 'u2',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    avatar: 'https://i.pravatar.cc/150?u=u2',
    globalRole: 'Employee',
    department: 'Engineering'
  },
  {
    id: 'u3',
    name: 'Mike Johnson',
    email: 'mike.j@company.com',
    avatar: 'https://i.pravatar.cc/150?u=u3',
    globalRole: 'Employee',
    department: 'Design'
  },
  {
    id: 'u4',
    name: 'isarachootip',
    email: 'isarachootip@gmail.com',
    avatar: 'https://i.pravatar.cc/150?u=u4',
    globalRole: 'Admin',
    department: 'Management'
  }
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'โครงการติดตั้งระบบไฟและน้ำ บ้านคุณสมศักดิ์',
    description: 'งานเดินสายไฟระบบฝังผนัง ติดตั้งระบบประปาห้องน้ำ และประกอบโคมไฟภายในบ้านเดี่ยว 2 ชั้น',
    status: 'Active',
    startDate: '2026-06-01',
    endDate: '2026-08-30',
    budget: 50000,
    members: [
      { userId: 'u1', role: 'PM' },
      { userId: 'u2', role: 'ช่างไฟ' },
      { userId: 'u3', role: 'ช่างประปา' }
    ]
  },
  {
    id: 'p2',
    name: 'โครงการรีโนเวทห้องครัว ทาวน์โฮมสุขุมวิท',
    description: 'งานรื้อเคาน์เตอร์ครัวเก่า ปูกระเบื้องผนังใหม่ ติดตั้งตู้บิวท์อิน เครื่องดูดควัน และอ่างล้างจาน',
    status: 'Planning',
    startDate: '2026-07-15',
    members: [
      { userId: 'u1', role: 'PM' },
      { userId: 'u2', role: 'ช่างปูกระเบื้อง' },
      { userId: 'u3', role: 'ช่างติดตั้งเฟอร์นิเจอร์' }
    ]
  }
];

export const mockTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    assigneeId: 'u3',
    title: 'Design UI Mockups',
    description: 'Create high-fidelity mockups for the dashboard.',
    status: 'Done',
    priority: 'High',
    estimatedHours: 16,
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 't2',
    projectId: 'p1',
    assigneeId: 'u2',
    title: 'Setup React + Vite Foundation',
    description: 'Initialize the frontend project and set up routing.',
    status: 'Done',
    priority: 'Urgent',
    estimatedHours: 8,
    createdAt: '2026-06-03T09:00:00Z'
  },
  {
    id: 't3',
    projectId: 'p1',
    assigneeId: 'u2',
    title: 'Implement Task Board',
    description: 'Create the Kanban board for task management.',
    status: 'In Progress',
    priority: 'High',
    estimatedHours: 24,
    createdAt: '2026-06-05T11:00:00Z'
  },
  {
    id: 't4',
    projectId: 'p1',
    assigneeId: 'u1',
    title: 'Review System Architecture',
    description: 'Review and approve the system architecture document.',
    status: 'Review',
    priority: 'Medium',
    estimatedHours: 4,
    createdAt: '2026-06-06T14:00:00Z'
  }
];

export const mockTimesheets: TimesheetEntry[] = [
  {
    id: 'ts1',
    userId: 'u2',
    projectId: 'p1',
    taskId: 't2',
    date: '2026-06-03',
    hours: 8,
    description: 'Completed setup and initial routing',
    status: 'Approved',
    approvedBy: 'u1',
    approvedAt: '2026-06-04T09:00:00Z'
  },
  {
    id: 'ts2',
    userId: 'u3',
    projectId: 'p1',
    taskId: 't1',
    date: '2026-06-04',
    hours: 6,
    description: 'Worked on dashboard mockups',
    status: 'Approved',
    approvedBy: 'u1',
    approvedAt: '2026-06-05T09:00:00Z'
  },
  {
    id: 'ts3',
    userId: 'u2',
    projectId: 'p1',
    taskId: 't3',
    date: '2026-06-08',
    hours: 7,
    description: 'Implemented the base layout for Kanban board',
    status: 'Pending'
  },
  {
    id: 'ts4',
    userId: 'u2',
    projectId: 'p1',
    taskId: 't3',
    date: '2026-06-09',
    hours: 5,
    description: 'Added drag and drop functionality',
    status: 'Pending'
  }
];
