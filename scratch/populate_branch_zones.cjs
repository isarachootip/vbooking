const pool = require('../src/config/db.cjs');

const PROVINCE_TO_ZONE_MAP = {
  // กรุงเทพฯ & ปริมณฑล
  'กรุงเทพมหานคร': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },
  'นนทบุรี': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },
  'ปทุมธานี': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },
  'สมุทรปราการ': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },
  'สมุทรสาคร': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },
  'นครปฐม': { zone: 'กรุงเทพฯ & ปริมณฑล', region: 'ภาคกลาง & ปริมณฑล' },

  // ภาคกลาง & ตะวันตก
  'พระนครศรีอยุธยา': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'สระบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'ลพบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'ชัยนาท': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'นครนายก': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'อุทัยธานี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'สุพรรณบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'กาญจนบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'ราชบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },
  'เพชรบุรี': { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง & ตะวันตก' },

  // ภาคตะวันออก
  'ชลบุรี': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ระยอง': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'จันทบุรี': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ฉะเชิงเทรา': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'ปราจีนบุรี': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },
  'สระแก้ว': { zone: 'ภาคตะวันออก', region: 'ภาคตะวันออก' },

  // ภาคเหนือ
  'เชียงใหม่': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'เชียงราย': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'ลำปาง': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'น่าน': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'แพร่': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'พิษณุโลก': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'ตาก': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'เพชรบูรณ์': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'กำแพงเพชร': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },
  'นครสวรรค์': { zone: 'ภาคเหนือ', region: 'ภาคเหนือ' },

  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  'ขอนแก่น': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'นครราชสีมา': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'อุดรธานี': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'อุบลราชธานี': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ร้อยเอ็ด': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'สกลนคร': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'สุรินทร์': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'บุรีรัมย์': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ชัยภูมิ': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'มหาสารคาม': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'มุกดาหาร': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'หนองบัวลำภู': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'เลย': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ยโสธร': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'ศรีสะเกษ': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },
  'กาฬสินธุ์': { zone: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)', region: 'ภาคตะวันออกเฉียงเหนือ' },

  // ภาคใต้
  'ภูเก็ต': { zone: 'ภาคใต้', region: 'ภาคใต้' },
  'สุราษฎร์ธานี': { zone: 'ภาคใต้', region: 'ภาคใต้' },
  'นครศรีธรรมราช': { zone: 'ภาคใต้', region: 'ภาคใต้' },
  'ตรัง': { zone: 'ภาคใต้', region: 'ภาคใต้' },
  'สงขลา': { zone: 'ภาคใต้', region: 'ภาคใต้' }
};

async function main() {
  console.log('🌍 Updating branch zones and regions...');

  // Add columns if not exist
  await pool.query(`
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS region VARCHAR(100);
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS assigned_qc_ids TEXT[];
    ALTER TABLE master_branches ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
    ALTER TABLE master_branches ADD COLUMN IF NOT EXISTS region VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branches TEXT[];
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zones TEXT[];
  `);

  const branches = await pool.query(`SELECT id, name, province FROM branches`);
  console.log(`Processing ${branches.rows.length} branches...`);

  let count = 0;
  for (const b of branches.rows) {
    const prov = (b.province || '').trim();
    const info = PROVINCE_TO_ZONE_MAP[prov] || { zone: 'ภาคกลาง & ตะวันตก', region: 'ภาคกลาง' };

    await pool.query(
      `UPDATE branches SET zone = $1, region = $2 WHERE id = $3`,
      [info.zone, info.region, b.id]
    );
    await pool.query(
      `UPDATE master_branches SET zone = $1, region = $2 WHERE id = $3`,
      [info.zone, info.region, b.id]
    );
    count++;
  }

  console.log(`✅ Successfully assigned zones & regions to ${count} branches!`);

  // Print Summary by Zone
  const summary = await pool.query(`
    SELECT zone, COUNT(*) as branch_count, STRING_AGG(DISTINCT province, ', ') as provinces
    FROM branches 
    GROUP BY zone 
    ORDER BY branch_count DESC
  `);
  console.log('\n📊 สรุปการแบ่งโซนสาขาทั่วประเทศ:');
  console.table(summary.rows);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
