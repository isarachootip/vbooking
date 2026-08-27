export interface WorkflowStage {
  id: number;
  key: string;
  title: string;
  color: string;
  bg: string;
  description?: string;
  statuses: string[];
}

export const STAGE_CONFIG: Record<string, { title: string; color: string; bg: string; description: string; statuses: string[] }> = {
  'To Do': {
    title: 'To Do',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    description: 'รับแจ้งงาน / วางแผนเริ่มต้นโครงการ',
    statuses: ['To Do', 'Todo', 'Planning', 'Draft', 'todo', 'บันทึกข้อมูลลูกค้า', 'Buy-Survey', 'Survey', 'Design', 'ชำระเงิน', 'ซื้อสำรวจ', 'สำรวจ', 'ออกแบบ']
  },
  'Assign ช่าง': {
    title: 'Assign ช่าง',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    description: 'จัดสรรทีมช่าง/หัวหน้าช่างเข้าปฏิบัติงาน',
    statuses: ['Assign ช่าง', 'กำลังดำเนินการ', 'Active', 'ก่อสร้าง', 'assign']
  },
  'Check-in': {
    title: 'Check-in',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    description: 'ทีมช่างเช็คอินเข้าปฏิบัติงานจริงที่หน้างาน',
    statuses: ['Check-in', 'เข้าหน้างาน', 'In Progress', 'checkin']
  },
  'Check-out': {
    title: 'Check-out',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    description: 'ทีมช่างปฏิบัติงานเสร็จสิ้นและเช็คเอาต์ออกจากหน้างาน',
    statuses: ['Check-out', 'ออกหน้างาน', 'checkout']
  },
  'QC': {
    title: 'QC',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    description: 'ตรวจสอบคุณภาพงานส่งมอบตามมาตรฐาน QC',
    statuses: ['QC', 'ตรวจงาน', 'รออนุมัติ QC', 'qc']
  },
  'Aftersale': {
    title: 'Aftersale',
    color: '#84cc16',
    bg: 'rgba(132, 204, 22, 0.15)',
    description: 'บริการหลังการขาย รับประกันผลงาน และติดตามความพึงพอใจ',
    statuses: ['Aftersale', 'รับประกัน', 'ส่งมอบงาน/เก็บเงิน', 'aftersale']
  },
  'Close': {
    title: 'Close',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.15)',
    description: 'ปิดโครงการเสร็จสมบูรณ์',
    statuses: ['Close', 'เสร็จสิ้น', 'Completed', 'Done', 'Project Complete', 'Survey Complete', 'close']
  }
};

export const QUICK_SERVICE_COLUMNS: string[] = [
  'To Do',
  'Assign ช่าง',
  'Check-in',
  'Check-out',
  'QC',
  'Aftersale',
  'Close'
];

export const INSTALLER_MA_COLUMNS: string[] = [
  'To Do',
  'Assign ช่าง',
  'Check-in',
  'Check-out',
  'QC',
  'Aftersale',
  'Close'
];

export const RENOVATE_BUILDIN_NEWHOUSE_COLUMNS: string[] = [
  'To Do',
  'Assign ช่าง',
  'Check-in',
  'Check-out',
  'QC',
  'Aftersale',
  'Close'
];

export const ALL_WORKFLOW_COLUMNS: string[] = RENOVATE_BUILDIN_NEWHOUSE_COLUMNS;

export const normalizeProjectType = (projectType?: string): 'quick_service' | 'installer_ma' | 'renovate_buildin_newhouse' => {
  const t = (projectType || '').trim().toLowerCase();
  if (t === 'quick' || t === 'quick_service' || t === 'quick service' || t === 'pq' || t.startsWith('quick')) {
    return 'quick_service';
  }
  if (
    t === 'install' ||
    t === 'installer' ||
    t === 'installer service' ||
    t === 'installation' ||
    t === 'pi' ||
    t === 'ma' ||
    t === 'maintenance' ||
    t === 'ma service' ||
    t === 'support' ||
    t === 'pm'
  ) {
    return 'installer_ma';
  }
  return 'renovate_buildin_newhouse';
};

export const getWorkflowColumnsForType = (projectType?: string): string[] => {
  const category = normalizeProjectType(projectType);
  if (category === 'quick_service') return QUICK_SERVICE_COLUMNS;
  if (category === 'installer_ma') return INSTALLER_MA_COLUMNS;
  return RENOVATE_BUILDIN_NEWHOUSE_COLUMNS;
};

export const getWorkflowStagesForType = (projectType?: string): WorkflowStage[] => {
  const columns = getWorkflowColumnsForType(projectType);
  return columns.map((colKey, index) => {
    const conf = STAGE_CONFIG[colKey] || {
      title: colKey,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.15)',
      description: colKey,
      statuses: [colKey]
    };
    return {
      id: index + 1,
      key: colKey,
      title: conf.title,
      color: conf.color,
      bg: conf.bg,
      description: conf.description,
      statuses: conf.statuses
    };
  });
};

export const mapStatusToColumn = (status: string, availableColumns: string[]): string => {
  if (availableColumns.includes(status)) return status;
  for (const col of availableColumns) {
    const conf = STAGE_CONFIG[col];
    if (conf && conf.statuses.some(s => s.toLowerCase() === (status || '').trim().toLowerCase())) {
      return col;
    }
  }
  return availableColumns[0] || 'To Do';
};
