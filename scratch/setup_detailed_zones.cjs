const pool = require('../src/config/db.cjs');

const DETAILED_ZONES = [
  {
    id: 'zone-bkk',
    code: 'BKK',
    name: '[BKK] กรุงเทพฯ & ปริมณฑล',
    region: 'กรุงเทพฯ & ปริมณฑล',
    description: 'ครอบคลุม กรุงเทพฯ, นนทบุรี, ปทุมธานี, สมุทรปราการ, สมุทรสาคร',
    provinces: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร']
  },
  {
    id: 'zone-c',
    code: 'C',
    name: '[C] ภาคกลาง',
    region: 'ภาคกลาง',
    description: 'ครอบคลุม พระนครศรีอยุธยา, สระบุรี, ลพบุรี, ชัยนาท, นครนายก, อุทัยธานี, นครปฐม, สุพรรณบุรี',
    provinces: ['พระนครศรีอยุธยา', 'สระบุรี', 'ลพบุรี', 'ชัยนาท', 'นครนายก', 'อุทัยธานี', 'นครปฐม', 'สุพรรณบุรี']
  },
  {
    id: 'zone-w',
    code: 'W',
    name: '[W] ภาคตะวันตก',
    region: 'ภาคตะวันตก',
    description: 'ครอบคลุม กาญจนบุรี, ราชบุรี, เพชรบุรี',
    provinces: ['กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี']
  },
  {
    id: 'zone-e',
    code: 'E',
    name: '[E] ภาคตะวันออก',
    region: 'ภาคตะวันออก',
    description: 'ครอบคลุม ชลบุรี, ระยอง, จันทบุรี, ฉะเชิงเทรา, ปราจีนบุรี, สระแก้ว',
    provinces: ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว']
  },
  {
    id: 'zone-n',
    code: 'N',
    name: '[N] ภาคเหนือ',
    region: 'ภาคเหนือ',
    description: 'ครอบคลุม เชียงใหม่, เชียงราย, ลำปาง, น่าน, แพร่, พิษณุโลก, ตาก, เพชรบูรณ์, กำแพงเพชร, นครสวรรค์',
    provinces: ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'น่าน', 'แพร่', 'พิษณุโลก', 'ตาก', 'เพชรบูรณ์', 'กำแพงเพชร', 'นครสวรรค์']
  },
  {
    id: 'zone-ne-u',
    code: 'NE-U',
    name: '[NE-U] ภาคอีสานตอนบน',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    description: 'ครอบคลุม ขอนแก่น, อุดรธานี, สกลนคร, มุกดาหาร, หนองบัวลำภู, เลย, กาฬสินธุ์',
    provinces: ['ขอนแก่น', 'อุดรธานี', 'สกลนคร', 'มุกดาหาร', 'หนองบัวลำภู', 'เลย', 'กาฬสินธุ์']
  },
  {
    id: 'zone-ne-l',
    code: 'NE-L',
    name: '[NE-L] ภาคอีสานตอนล่าง',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    description: 'ครอบคลุม นครราชสีมา, บุรีรัมย์, สุรินทร์, ศรีสะเกษ, อุบลราชธานี, ยโสธร, ร้อยเอ็ด, ชัยภูมิ, มหาสารคาม',
    provinces: ['นครราชสีมา', 'บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'อุบลราชธานี', 'ยโสธร', 'ร้อยเอ็ด', 'ชัยภูมิ', 'มหาสารคาม']
  },
  {
    id: 'zone-s-u',
    code: 'S-U',
    name: '[S-U] ภาคใต้ตอนบน',
    region: 'ภาคใต้',
    description: 'ครอบคลุม สุราษฎร์ธานี, ภูเก็ต, นครศรีธรรมราช',
    provinces: ['สุราษฎร์ธานี', 'ภูเก็ต', 'นครศรีธรรมราช']
  },
  {
    id: 'zone-s-l',
    code: 'S-L',
    name: '[S-L] ภาคใต้ตอนล่าง',
    region: 'ภาคใต้',
    description: 'ครอบคลุม ตรัง, สงขลา (หาดใหญ่)',
    provinces: ['ตรัง', 'สงขลา']
  }
];

async function main() {
  console.log('🔄 Setting up detailed regional zones and connecting branches...');

  // Ensure columns in master_zones
  await pool.query(`
    ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS code VARCHAR(50);
    ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS region VARCHAR(100);
    ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE master_zones ADD COLUMN IF NOT EXISTS provinces TEXT[];
  `);

  // Clear & repopulate master_zones
  await pool.query(`DELETE FROM master_zones`);
  for (const z of DETAILED_ZONES) {
    await pool.query(
      `INSERT INTO master_zones (id, code, name, region, description, provinces, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [z.id, z.code, z.name, z.region, z.description, z.provinces]
    );
  }
  console.log(`✅ Populated ${DETAILED_ZONES.length} master zones.`);

  // Province to Zone Lookup
  const provLookup = {};
  for (const z of DETAILED_ZONES) {
    for (const prov of z.provinces) {
      provLookup[prov] = z;
    }
  }

  // Update all branches in DB
  const branches = await pool.query(`SELECT id, code, name, province FROM branches`);
  let updatedCount = 0;
  for (const b of branches.rows) {
    const prov = (b.province || '').trim();
    const zoneObj = provLookup[prov] || DETAILED_ZONES[0];

    await pool.query(
      `UPDATE branches SET zone = $1, region = $2 WHERE id = $3`,
      [zoneObj.name, zoneObj.region, b.id]
    );
    await pool.query(
      `UPDATE master_branches SET zone = $1, region = $2 WHERE id = $3`,
      [zoneObj.name, zoneObj.region, b.id]
    );
    updatedCount++;
  }
  console.log(`✅ Connected ${updatedCount} branches into their respective zones.`);

  // Summary of branches connected per zone
  const summary = await pool.query(`
    SELECT zone, COUNT(*) as branch_count, STRING_AGG(code || ' ' || name, ', ' ORDER BY code) as branch_list
    FROM branches 
    GROUP BY zone 
    ORDER BY branch_count DESC
  `);
  console.log('\n📊 สรุปการเชื่อมโยงสาขาเข้าสู่แต่ละโซน:');
  console.table(summary.rows.map(r => ({
    zone: r.zone,
    branch_count: r.branch_count,
    sample_branches: r.branch_list.substring(0, 80) + '...'
  })));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
