require('dotenv').config();
const pg = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const defaultPwHash = crypto.createHash('sha256').update('password123').digest('hex');

const qcUsers = [
  {
    id: 'qc_alongkorn',
    name: 'อลงณ์กรต รักวรางคณา (สันต์)',
    email: 'alongkorn.r@vq.local',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'DIV QC Renovate / Head Office&BBT',
    gender: 'Male',
    birthday: '1988-05-15',
    skills: ['QC', 'Survey', 'Renovate', 'Instore', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: ['Fri'],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'Head Office & BBT',
    line_id: '00google00',
    phones: ['0968672442', '096-867-2442'],
    job_types: ['QC Renovate', 'Survey', 'Renovate', 'Instore'],
    service_zones: ['Head Office', 'BBT', 'บางใหญ่', 'กรุงเทพและปริมณฑล'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_renovate.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'DIV QC Renovate Manager'
  },
  {
    id: 'qc_rawiphon',
    name: 'รวิพล แต้เฮง (แท่ง)',
    email: 'rawiphon.t@vq.local',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'QC Center (Instore) / Bangna',
    gender: 'Male',
    birthday: '1990-08-20',
    skills: ['QC', 'Survey', 'Instore', 'Installation', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: [],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'QC Center Bangna',
    line_id: '0982512746',
    phones: ['0982512746', '098-251-2746'],
    job_types: ['QC Center (Instore)', 'Survey', 'Installation'],
    service_zones: ['Bangna', 'บางนา', 'กรุงเทพฯ ตะวันออกใต้ (ประเวศ - สวนหลวง - บางนา)'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_instore.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'Department Manager (QC)'
  },
  {
    id: 'qc_chaiyakrit',
    name: 'ชัยกฤต หมูแก้วเครือ (ฟอร์ด)',
    email: 'chaiyakrit.m@vq.local',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'QC Center (Instore) / Samutprakran',
    gender: 'Male',
    birthday: '1991-11-12',
    skills: ['QC', 'Survey', 'Instore', 'Installation', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: [],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'QC Center Samutprakran',
    line_id: 'fordsky_',
    phones: ['0954757168', '095-475-7168'],
    job_types: ['QC Center (Instore)', 'Survey', 'Installation'],
    service_zones: ['Samutprakran', 'สมุทรปราการ', '[BKK] สมุทรปราการ'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_instore.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'Department Manager (QC)'
  },
  {
    id: 'qc_kantinan',
    name: 'กันตินันท์ โอกาวา (บอล)',
    email: 'kantinan.o@vq.local',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'QC Center (Instore) / Sukhapiban 3',
    gender: 'Male',
    birthday: '1992-03-25',
    skills: ['QC', 'Survey', 'Instore', 'Installation', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: [],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'QC Center Sukhapiban 3',
    line_id: '0910044958',
    phones: ['0910044958', '091-004-4958'],
    job_types: ['QC Center (Instore)', 'Survey', 'Installation'],
    service_zones: ['Sukhapiban 3', 'สุขาภิบาล 3', 'กรุงเทพฯ'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_instore.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'Department Manager (QC)'
  },
  {
    id: 'qc_patipran',
    name: 'ปฏิภาณ สมบัติทวี (บอส)',
    email: 'patipran.s@vq.local',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'QC Center (Instore) / Bangyai',
    gender: 'Male',
    birthday: '1993-07-19',
    skills: ['QC', 'Survey', 'Instore', 'Installation', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: [],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'QC Center Bangyai',
    line_id: 'patipran.s',
    phones: ['0823626458', '082-362-6458'],
    job_types: ['QC Center (Instore)', 'Survey', 'Installation'],
    service_zones: ['Bangyai', 'บางใหญ่', '[BKK] นนทบุรี'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_instore.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'Department Manager (QC)'
  },
  {
    id: 'qc_chatri',
    name: 'ชาตรี ทองคำ (แมว)',
    email: 'chatri.t@vq.local',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    global_role: 'QC',
    department: 'QC Center (Instore) / Rama 2',
    gender: 'Male',
    birthday: '1989-12-05',
    skills: ['QC', 'Survey', 'Instore', 'Installation', 'Inspection'],
    password_hash: defaultPwHash,
    wfh_days: [],
    tax_id: '',
    id_card_number: '',
    id_card_files: [],
    company_name: 'QC Center Rama 2',
    line_id: '0979956637',
    phones: ['0979956637', '097-995-6637'],
    job_types: ['QC Center (Instore)', 'Survey', 'Installation'],
    service_zones: ['Rama 2', 'พระราม 2', 'กรุงเทพฯ ฝั่งธนบุรีใต้'],
    work_slots: ['Slot 1: เช้า', 'Slot 2: บ่าย 1', 'Slot 3: บ่าย 2'],
    certificates: [{ name: 'cert_qc_instore.pdf', selected: true }],
    criminal_record: 'ไม่มี',
    credit_term_days: 30,
    technician_level: 'Department Manager (QC)'
  }
];

async function run() {
  try {
    for (const u of qcUsers) {
      console.log(`Inserting/Updating user ${u.name} (${u.email})...`);
      await pool.query(
        `INSERT INTO users (
           id, name, email, avatar, global_role, department, gender, birthday, skills, password_hash, wfh_days,
           tax_id, id_card_number, id_card_files, company_name, line_id, phones, job_types, service_zones, work_slots, certificates, criminal_record, credit_term_days, technician_level
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           avatar = EXCLUDED.avatar,
           global_role = EXCLUDED.global_role,
           department = EXCLUDED.department,
           gender = EXCLUDED.gender,
           birthday = EXCLUDED.birthday,
           skills = EXCLUDED.skills,
           password_hash = EXCLUDED.password_hash,
           wfh_days = EXCLUDED.wfh_days,
           tax_id = EXCLUDED.tax_id,
           id_card_number = EXCLUDED.id_card_number,
           id_card_files = EXCLUDED.id_card_files,
           company_name = EXCLUDED.company_name,
           line_id = EXCLUDED.line_id,
           phones = EXCLUDED.phones,
           job_types = EXCLUDED.job_types,
           service_zones = EXCLUDED.service_zones,
           work_slots = EXCLUDED.work_slots,
           certificates = EXCLUDED.certificates,
           criminal_record = EXCLUDED.criminal_record,
           credit_term_days = EXCLUDED.credit_term_days,
           technician_level = EXCLUDED.technician_level`,
        [
          u.id, u.name, u.email, u.avatar, u.global_role, u.department, u.gender, u.birthday, u.skills, u.password_hash, u.wfh_days,
          u.tax_id, u.id_card_number, JSON.stringify(u.id_card_files), u.company_name, u.line_id,
          u.phones, u.job_types, u.service_zones, u.work_slots, JSON.stringify(u.certificates),
          u.criminal_record, u.credit_term_days, u.technician_level
        ]
      );
    }
    console.log('Successfully inserted all 6 QC users into PostgreSQL database!');
  } catch (err) {
    console.error('Error inserting QC users:', err);
  } finally {
    await pool.end();
  }
}

run();
