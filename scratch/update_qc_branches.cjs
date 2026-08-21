require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const updates = [
      { id: 'qc_rawiphon', zones: ['สาขาบางนา (Bangna)', 'ประเวศ', 'สวนหลวง', 'กรุงเทพฯ ตะวันออกใต้'] },
      { id: 'qc_alongkorn', zones: ['สำนักงานใหญ่ (Head Office)', 'สาขาบางบัวทอง (BBT)', 'Renovate ทุกสาขา'] },
      { id: 'qc_chaiyakrit', zones: ['สาขาสมุทรปราการ (Samutprakran)', 'แพรกษา', 'บางปู', 'กิ่งแก้ว'] },
      { id: 'qc_kantinan', zones: ['สาขาสุขาภิบาล 3 (Sukhapiban 3)', 'รามคำแหง', 'มีนบุรี', 'กรุงเทพฯ ตะวันออก'] },
      { id: 'qc_patipran', zones: ['สาขาบางใหญ่ (Bangyai)', 'นนทบุรี', 'รัตนาธิเบศร์', 'ไทรน้อย'] },
      { id: 'qc_chatri', zones: ['สาขาพระราม 2 (Rama 2)', 'สมุทรสาคร', 'มหาชัย', 'ฝั่งธนบุรีใต้'] }
    ];

    for (const u of updates) {
      await pool.query('UPDATE users SET service_zones = $1 WHERE id = $2', [u.zones, u.id]);
    }
    console.log('Updated service_zones / responsible branches for 6 QC officers.');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
