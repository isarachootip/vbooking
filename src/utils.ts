import type { TimesheetEntry, User, Project } from './types';

export const formatToDDMMYYYY = (dateStr?: string | Date | number | null): string => {
  if (!dateStr) return '';
  try {
    // Handle YYYY-MM-DD string directly to avoid timezone shift if possible
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = typeof dateStr === 'string' || typeof dateStr === 'number' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '';
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return typeof dateStr === 'string' ? dateStr : '';
  }
};

export const sortTimesheetsByLastUpdate = (timesheets: TimesheetEntry[]): TimesheetEntry[] => {
  return [...timesheets].sort((a, b) => {
    const getTimesheetTime = (ts: TimesheetEntry) => {
      if (ts.updatedAt) {
        const t = new Date(ts.updatedAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (ts.id && ts.id.startsWith('ts_')) {
        const t = parseInt(ts.id.substring(3));
        if (!isNaN(t)) return t;
      }
      if (ts.date) {
        const t = new Date(ts.date).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };
    return getTimesheetTime(b) - getTimesheetTime(a);
  });
};

// ── Helper: Extract all branches/zones associated with a user ──
export const getUserBranches = (user?: User | null): string[] => {
  if (!user) return [];
  const list: string[] = [];
  if (Array.isArray(user.serviceZones)) list.push(...user.serviceZones);
  if (Array.isArray(user.assignedBranches)) list.push(...user.assignedBranches);
  if (Array.isArray(user.assignedZones)) list.push(...user.assignedZones);
  if (user.department) list.push(user.department);
  if (user.name) list.push(user.name);
  return list.filter(Boolean);
};

// ── Helper: Check if user's branch / zones match a project ──
export const isUserBranchMatchProject = (user?: User | null, project?: Project | null): boolean => {
  if (!user || !project) return false;
  const userBranches = getUserBranches(user);
  const userBranchStr = userBranches.join(' ').toLowerCase();
  const projAddress = (project.address || '').toLowerCase();
  const projBranch = (project.extraDetails?.branch || '').toLowerCase();
  const projName = (project.name || '').toLowerCase();

  // 1. Direct match if project branch is listed in user branches
  if (projBranch && userBranchStr.includes(projBranch)) return true;

  // 2. Keyword matches for common zones/branches
  const matchKeywords = [
    'บางนา', 'bangna', 'สมุทรปราการ', 'samutprakran', 'สุขาภิบาล', 'sukhapiban', 
    'บางใหญ่', 'bangyai', 'พระราม 2', 'rama 2', 'rama2', 'head office', 'bbt', 
    'บางบัวทอง', 'รังสิต', 'rangsit', 'เชียงใหม่', 'chiangmai', 'ขอนแก่น', 'khonkaen',
    'โคราช', 'korat', 'พัทยา', 'pattaya', 'ชลบุรี', 'chonburi', 'ภูเก็ต', 'phuket',
    'สำนักงานใหญ่'
  ];

  for (const kw of matchKeywords) {
    if (userBranchStr.includes(kw) && (projAddress.includes(kw) || projBranch.includes(kw) || projName.includes(kw))) {
      return true;
    }
  }

  // 3. Substring matching of branch names
  for (const b of userBranches) {
    const cleanB = b.replace(/bnacs|\(|\)|สาขา|สำนักงาน|hq/gi, '').trim().toLowerCase();
    if (cleanB.length >= 2) {
      if (projBranch.includes(cleanB) || projAddress.includes(cleanB) || projName.includes(cleanB)) {
        return true;
      }
    }
  }

  return false;
};

// ── Main Permission Check for Project Operations ──
// Allowed operators: 
// 1. Admin
// 2. PM (Project Manager / Global Manager / Project Assigned PM / PIC)
// 3. QC ที่รับผิดชอบสาขานั้นๆ (QC matching branch or assigned as Inspector)
export const canOperateProject = (currentUser?: User | null, project?: Project | null): { 
  allowed: boolean; 
  reason?: string; 
  roleDescription?: string;
} => {
  if (!currentUser) {
    return { 
      allowed: false, 
      reason: 'กรุณาเข้าสู่ระบบก่อนดำเนินการโครงการ' 
    };
  }

  // 1. Admin: Always allowed full operation
  if (currentUser.globalRole === 'Admin') {
    return { allowed: true, roleDescription: 'Admin (ผู้ดูแลระบบ)' };
  }

  // 2. PM (Project Manager)
  const isGlobalPM = currentUser.globalRole === 'Manager' || 
                     currentUser.globalRole === ('PM' as any) ||
                     (currentUser.department && currentUser.department.toLowerCase().includes('pm')) ||
                     (currentUser.department && currentUser.department.toLowerCase().includes('project manager'));
  
  const isProjectPM = project?.members?.some(m => 
    (m.userId === currentUser.id || (m as any).id === currentUser.id) &&
    ['PM', 'Project Manager', 'Team Lead', 'Leader', 'หัวหน้างาน'].some(r => (m.role || '').toLowerCase().includes(r.toLowerCase()))
  );

  const isProjectPIC = project?.extraDetails?.picUser === currentUser.id || 
                       project?.extraDetails?.picUser === currentUser.name;

  if (isGlobalPM || isProjectPM || isProjectPIC) {
    return { allowed: true, roleDescription: 'PM (ผู้จัดการโครงการ)' };
  }

  // 3. QC ที่รับผิดชอบสาขานั้นๆ (QC responsible for that specific branch)
  const isQcRole = currentUser.globalRole === 'QC' || 
                   (currentUser.department && currentUser.department.toLowerCase().includes('qc')) ||
                   (currentUser.skills && currentUser.skills.some(s => s.toLowerCase().includes('qc'))) ||
                   project?.extraDetails?.surveyInspectorId === currentUser.id;

  if (isQcRole) {
    // Check if explicitly assigned QC inspector for this project
    if (project?.extraDetails?.surveyInspectorId === currentUser.id) {
      return { allowed: true, roleDescription: 'QC ผู้รับผิดชอบโครงการนี้' };
    }

    // Check branch responsibility match
    if (project && isUserBranchMatchProject(currentUser, project)) {
      const branchName = project.extraDetails?.branch || 'สาขานี้';
      return { allowed: true, roleDescription: `QC ผู้รับผิดชอบสาขา (${branchName})` };
    }
  }

  const branchText = project?.extraDetails?.branch ? `สาขา${project.extraDetails.branch}` : 'สาขานี้';
  return { 
    allowed: false, 
    reason: `เฉพาะ Admin, PM หรือ QC ที่รับผิดชอบ${branchText}เท่านั้นที่สามารถดำเนินการโครงการได้` 
  };
};

export const isQcUser = (user?: User | null): boolean => {
  if (!user) return false;
  return Boolean(
    user.globalRole === 'QC' ||
    (user.department && user.department.toUpperCase().includes('QC')) ||
    (user.name && user.name.toUpperCase().includes('QC')) ||
    (user.email && user.email.toLowerCase().includes('qc'))
  );
};

export const canUserApprove = (user?: User | null): boolean => {
  if (!user) return false;
  if (isQcUser(user)) return false;
  return Boolean(
    (user.globalRole as string) === 'Admin' ||
    (user.globalRole as string) === 'SuperAdmin' ||
    user.globalRole === 'Manager' ||
    (user.department && (user.department.includes('GM') || user.department.includes('Management') || user.department.includes('PM'))) ||
    user.email === 'isarachootip@gmail.com' ||
    user.email === 'chapirak@gmail.com' ||
    user.email === 'itchootip@gmail.com' ||
    user.id === 'u_admin' ||
    user.id === 'u_chapirak' ||
    user.id === 'u_itchootip'
  );
};

export const canUserRollbackStep = (user?: User | null): boolean => {
  if (!user) return false;
  if (isQcUser(user)) return false;
  return Boolean(
    (user.globalRole as string) === 'Admin' ||
    (user.globalRole as string) === 'SuperAdmin' ||
    user.globalRole === 'Manager' ||
    (user.department && (user.department.includes('GM') || user.department.includes('Management') || user.department.includes('PM'))) ||
    user.email === 'isarachootip@gmail.com' ||
    user.email === 'chapirak@gmail.com' ||
    user.email === 'itchootip@gmail.com' ||
    user.id === 'u_admin' ||
    user.id === 'u_chapirak' ||
    user.id === 'u_itchootip'
  );
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDateInPast = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  const cleanDate = dateStr.trim().split(' ')[0].split('T')[0];
  let isoDate = cleanDate;
  if (cleanDate.includes('/')) {
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const today = getTodayDateString();
  return isoDate < today;
};
export * from './utils/qcBranchMatcher';
