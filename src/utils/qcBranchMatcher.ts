// QC Branch Matching & Scoring Utility

export interface QcMatchable {
  qcId?: string;
  id?: string;
  qcName?: string;
  name?: string;
  email?: string;
  department?: string;
  globalRole?: string;
  assignedBranches?: string[] | null;
  serviceZones?: string[] | null;
  assignedZones?: string[] | null;
  [key: string]: any;
}

// Comprehensive zone mapping for Bangkok Metropolitan Region & Proximity
const QC_ZONE_MAPPING: {
  qcId: string;
  keywords: string[];
  provinces: string[];
  zones: string[];
}[] = [
  {
    qcId: 'usr-qc2', // QC2 สมชาย (โซนบางนา-สมุทรปราการ)
    keywords: [
      'บางนา', 'bangna', 'สมุทรปราการ', 'samutprakran', 'เทพารักษ์', 'บางพลี', 
      'กิ่งแก้ว', 'เมกาบางนา', 'แพรกษา', 'บางปู', 'สำนักงานใหญ่', 'ศรีนครินทร์',
      'สำโรง', 'บางบ่อ', 'บางเสาธง', 'แบริ่ง', 'ลาซาล', 'อุดมสุข'
    ],
    provinces: ['สมุทรปราการ'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล', 'สมุทรปราการ']
  },
  {
    qcId: 'usr-qc3', // QC3 วิทยา (โซนลาดกระบัง-สุวรรณภูมิ)
    keywords: [
      'ลาดกระบัง', 'ladkrabang', 'สุวรรณภูมิ', 'suvarnabhumi', 'ประเวศ', 'ร่มเกล้า', 
      'อ่อนนุช', 'พัฒนาการ', 'สวนหลวง', 'ซีคอน', 'เจ้าคุณทหาร', 'หัวตะเข้', 'กิ่งแก้ว-สุวรรณภูมิ'
    ],
    provinces: ['กรุงเทพมหานคร'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล']
  },
  {
    qcId: 'usr-qc4', // QC4 อนุชา (โซนจตุจักร-รัชดา)
    keywords: [
      'จตุจักร', 'chatuchak', 'รัชดา', 'ratchada', 'ลาดพร้าว', 'ladprao', 'พหลโยธิน', 
      'ประชาชื่น', 'วงศ์สว่าง', 'เกษตร', 'หมอชิต', 'สะพานควาย', 'บางซื่อ', 'บางเขน',
      'งามวงศ์วาน (กทม)', 'วิภาวดี', 'สุทธิสาร', 'เสนานิคม', 'วังหิน'
    ],
    provinces: ['กรุงเทพมหานคร'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล']
  },
  {
    qcId: 'usr-qc5', // QC5 ธีรภัทร (โซนงามวงศ์วาน-นนทบุรี)
    keywords: [
      'งามวงศ์วาน', 'ngamwongwan', 'นนทบุรี', 'nonthaburi', 'บางบัวทอง', 'bangbuathong',
      'บางใหญ่', 'bangyai', 'รัตนาธิเบศร์', 'ติวานนท์', 'แจ้งวัฒนะ', 'chaengwattana',
      'ศรีสมาน', 'srisaman', 'เมืองทอง', 'muangthong', 'ปากเกร็ด', 'pakkret',
      'ราชพฤกษ์', 'ชัยพฤกษ์', 'ไทรน้อย', 'แคราย', 'พระราม 5', 'กาญจนาภิเษก', 'บางกรวย'
    ],
    provinces: ['นนทบุรี'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล', 'นนทบุรี']
  },
  {
    qcId: 'usr-qc6', // QC6 ธนากร (โซนธนบุรี-พระราม 2)
    keywords: [
      'ธนบุรี', 'thonburi', 'พระราม 2', 'rama 2', 'rama2', 'มหาชัย', 'mahachai',
      'สมุทรสาคร', 'samutsakhon', 'ท่าข้าม', 'แสมดำ', 'ดาวคะนอง', 'เอกชัย',
      'พระราม 3', 'จอมทอง', 'ทุ่งครุ', 'ราษฎร์บูรณะ', 'อ้อมน้อย', 'กระทุ่มแบน',
      'บางขุนเทียน', 'ประชาอุทิศ', 'สุขสวัสดิ์'
    ],
    provinces: ['สมุทรสาคร'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล', 'สมุทรสาคร']
  },
  {
    qcId: 'usr-qc7', // QC7 พงศกร (โซนรังสิต-ปทุมธานี)
    keywords: [
      'รังสิต', 'rangsit', 'ปทุมธานี', 'pathumthani', 'คลองหลวง', 'ธัญบุรี',
      'ลำลูกกา', 'lamlukka', 'เมืองเอก', 'muangek', 'นวนคร', 'สามโคก',
      'ลาดหลุมแก้ว', 'ดอนเมือง', 'donmueang', 'สรงประภา', 'สายไหม', 'saimai',
      'อยุธยา', 'ayutthaya', 'พระนครศรีอยุธยา', 'วังน้อย', 'คลอง 1', 'คลอง 2', 'คลอง 3', 'คลอง 4', 'คลอง 5'
    ],
    provinces: ['ปทุมธานี', 'พระนครศรีอยุธยา'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', '[C] ภาคกลาง', 'ปทุมธานี', 'พระนครศรีอยุธยา']
  },
  {
    qcId: 'usr-qc8', // QC8 สมศักดิ์ (โซนบางแค-เพชรเกษม)
    keywords: [
      'บางแค', 'bangkae', 'เพชรเกษม', 'phetkasem', 'พุทธมณฑล', 'phutthamonthon',
      'ศาลายา', 'salaya', 'ทวีวัฒนา', 'หนองแขม', 'nongkhaem', 'นครปฐม', 'nakhonpathom',
      'ภาษีเจริญ', 'กัลปพฤกษ์', 'บางบอน', 'bangbon', 'ตลิ่งชัน', 'ปิ่นเกล้า',
      'บางกอกน้อย', 'บางกอกใหญ่', 'พุทธมณฑลสาย 1', 'พุทธมณฑลสาย 2', 'พุทธมณฑลสาย 3', 'พุทธมณฑลสาย 4', 'พุทธมณฑลสาย 5'
    ],
    provinces: ['นครปฐม'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', '[C] ภาคกลาง', 'นครปฐม']
  },
  {
    qcId: 'usr-qc9', // QC9 วรวัฒน์ (โซนมีนบุรี-รามอินทรา)
    keywords: [
      'มีนบุรี', 'minburi', 'รามอินทรา', 'ramintra', 'คันนายาว', 'คลองสามวา',
      'หนองจอก', 'nongchok', 'นวมินทร์', 'แฟชั่นไอส์แลนด์', 'fashion island',
      'รามคำแหง', 'ramkhamhaeng', 'สุขาภิบาล 3', 'sukhapiban 3', 'สุขาภิบาล',
      'บึงกุ่ม', 'เสรีไทย', 'ฉะเชิงเทรา', 'chachoengsao', 'แปดริ้ว', 'สุวินทวงศ์',
      'หทัยราษฎร์', 'นิมิตใหม่', 'คู้บอน', 'พระยาสุเรนทร์'
    ],
    provinces: ['ฉะเชิงเทรา'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', '[E] ภาคตะวันออก', 'มีนบุรี', 'ฉะเชิงเทรา']
  },
  {
    qcId: 'usr-qc10', // QC10 ศุภชัย (โซนพระราม 9-ห้วยขวาง)
    keywords: [
      'พระราม 9', 'rama 9', 'rama9', 'ห้วยขวาง', 'huaykwang', 'ดินแดง',
      'สุทธิสาร', 'สุขุมวิท', 'sukhumvit', 'เอกมัย', 'ekkamai', 'ทองหล่อ', 'thonglor',
      'อโศก', 'asoke', 'บางกะปิ', 'bangkapi', 'วังทองหลาง', 'โชคชัย 4',
      'พระโขนง', 'คลองเตย', 'ปทุมวัน', 'พญาไท', 'สาทร', 'sathorn', 'สีลม', 'silom',
      'ปรีดี', 'ศูนย์วิจัย', 'วัฒนา'
    ],
    provinces: ['กรุงเทพมหานคร'],
    zones: ['[BKK] กรุงเทพฯ & ปริมณฑล', 'กรุงเทพฯ & ปริมณฑล']
  }
];

/**
 * Calculates a match score (0 to 1000+) between a QC inspector and a target branch / zone / location.
 */
export const getQcBranchScore = (
  qc: QcMatchable,
  branchName?: string | null,
  zoneName?: string | null
): number => {
  if (!qc) return 0;
  if (!branchName && !zoneName) return 0;

  const rawBranch = (branchName || '').trim();
  const cleanBranch = rawBranch.replace(/^สาขา/, '').replace(/\(.*\)/g, '').trim().toLowerCase();
  const fullBranchLower = rawBranch.toLowerCase();
  const rawZone = (zoneName || '').trim().toLowerCase();

  const qcId = (qc.qcId || qc.id || '').trim();
  const qcName = (qc.qcName || qc.name || '').toLowerCase();
  const qcDept = (qc.department || '').toLowerCase();
  const qcAssignedBranches = Array.isArray(qc.assignedBranches) ? qc.assignedBranches.map(b => String(b).toLowerCase()) : [];
  const qcServiceZones = Array.isArray(qc.serviceZones) ? qc.serviceZones.map(z => String(z).toLowerCase()) : [];
  const qcAssignedZones = Array.isArray(qc.assignedZones) ? qc.assignedZones.map(z => String(z).toLowerCase()) : [];

  let score = 0;

  // 1. Direct match in assignedBranches array (Score: 1000)
  if (rawBranch && qcAssignedBranches.length > 0) {
    if (qcAssignedBranches.some(b => b === fullBranchLower || b.includes(cleanBranch) || fullBranchLower.includes(b))) {
      score += 1000;
    }
  }

  // 2. Exact keyword / branch name in QC Name (Score: 800)
  if (cleanBranch && cleanBranch.length >= 2 && qcName.includes(cleanBranch)) {
    score += 800;
  }

  // 3. Mapping from QC_ZONE_MAPPING table
  const zoneConfig = QC_ZONE_MAPPING.find(z => z.qcId === qcId);
  if (zoneConfig) {
    // Check if target branch contains any keyword of this QC
    for (const kw of zoneConfig.keywords) {
      const kwLower = kw.toLowerCase();
      if (fullBranchLower.includes(kwLower) || (rawZone && rawZone.includes(kwLower))) {
        score += 700;
        break;
      }
    }

    // Check province match
    for (const prov of zoneConfig.provinces) {
      const provLower = prov.toLowerCase();
      if (fullBranchLower.includes(provLower) || (rawZone && rawZone.includes(provLower))) {
        score += 500;
        break;
      }
    }

    // Check zone match
    for (const z of zoneConfig.zones) {
      const zLower = z.toLowerCase();
      if (rawZone && (rawZone.includes(zLower) || zLower.includes(rawZone))) {
        score += 100;
        break;
      }
    }
  }

  // 4. Keyword in QC department or serviceZones
  if (cleanBranch && cleanBranch.length >= 2) {
    if (qcDept.includes(cleanBranch)) score += 600;
    if (qcServiceZones.some(z => z.includes(cleanBranch))) score += 400;
    if (qcAssignedZones.some(z => z.includes(cleanBranch))) score += 400;
  }

  return score;
};

/**
 * Checks if a QC inspector is considered a direct / recommended match for the branch.
 */
export const isQcMatchedForBranch = (
  qc: QcMatchable,
  branchName?: string | null,
  zoneName?: string | null
): boolean => {
  return getQcBranchScore(qc, branchName, zoneName) >= 500;
};

/**
 * Finds the top single QC inspector for a given branch name.
 */
export const findQcForBranch = <T extends QcMatchable>(
  branchName: string | null | undefined,
  qcList: T[],
  zoneName?: string | null
): T | null => {
  if (!branchName || !qcList || qcList.length === 0) return null;

  let bestQc: T | null = null;
  let highestScore = 0;

  for (const qc of qcList) {
    const score = getQcBranchScore(qc, branchName, zoneName);
    if (score > highestScore) {
      highestScore = score;
      bestQc = qc;
    }
  }

  return highestScore >= 500 ? bestQc : null;
};

/**
 * Sorts a list of QC inspectors with branch-matched inspectors at the very top (first priority),
 * followed by other inspectors.
 */
export const sortQcListByBranch = <T extends QcMatchable>(
  qcList: T[],
  branchName?: string | null,
  zoneName?: string | null
): { matchedQcs: T[]; otherQcs: T[]; sortedList: T[] } => {
  if (!qcList || qcList.length === 0) {
    return { matchedQcs: [], otherQcs: [], sortedList: [] };
  }

  if (!branchName && !zoneName) {
    // Standard natural sort by name if no branch specified
    const sorted = [...qcList].sort((a, b) => {
      const nameA = a.qcName || a.name || '';
      const nameB = b.qcName || b.name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
    return { matchedQcs: [], otherQcs: sorted, sortedList: sorted };
  }

  // Calculate scores
  const scoredItems = qcList.map(qc => ({
    qc,
    score: getQcBranchScore(qc, branchName, zoneName)
  }));

  const matchedQcs: T[] = [];
  const otherQcs: T[] = [];

  scoredItems.forEach(item => {
    if (item.score >= 500) {
      matchedQcs.push(item.qc);
    } else {
      otherQcs.push(item.qc);
    }
  });

  // Sort matched QCs by score descending, then by name
  matchedQcs.sort((a, b) => {
    const scoreA = getQcBranchScore(a, branchName, zoneName);
    const scoreB = getQcBranchScore(b, branchName, zoneName);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const nameA = a.qcName || a.name || '';
    const nameB = b.qcName || b.name || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Sort other QCs by name
  otherQcs.sort((a, b) => {
    const nameA = a.qcName || a.name || '';
    const nameB = b.qcName || b.name || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return {
    matchedQcs,
    otherQcs,
    sortedList: [...matchedQcs, ...otherQcs]
  };
};
