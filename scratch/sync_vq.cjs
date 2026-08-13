const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const response = await fetch('https://vibepjm.online/api/technicians');
    const data = await response.json();
    let count = 0;
    for (const tech of data.technicians) {
      const email = `${tech.id.toLowerCase()}@vq.local`;
      const zones = [];
      if (tech.primaryZone) zones.push(tech.primaryZone);
      if (Array.isArray(tech.secondaryZones)) zones.push(...tech.secondaryZones);
      const phones = tech.phone ? [tech.phone] : [];
      
      await pool.query(`
        INSERT INTO users (id, name, email, avatar, global_role, department, technician_level, phones, service_zones, skills) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name, 
          avatar = EXCLUDED.avatar, 
          technician_level = EXCLUDED.technician_level, 
          phones = EXCLUDED.phones, 
          service_zones = EXCLUDED.service_zones
      `, [
        tech.id, 
        tech.name, 
        email, 
        tech.avatar || '', 
        'Vendor', 
        'Field Service', 
        tech.tier || 'Standard', 
        phones, 
        zones, 
        ['Installation', 'Survey', 'QC']
      ]);
      count++;
    }
    console.log(`✅ Manually synced ${count} technicians from VQ into BuildFlow DB.`);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
