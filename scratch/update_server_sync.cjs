const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetFunc = `async function fetchRemoteTechnicians() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://vibepjm.online/api/technicians', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.technicians && Array.isArray(data.technicians)) {
        console.log(\`ℹ️ Fetched \${data.technicians.length} remote technicians from vibepjm.online. Upserting to DB...\`);
        let count = 0;
        for (const tech of data.technicians) {
          const email = \`\${tech.id.toLowerCase()}@vq.local\`;
          const zones = [];
          if (tech.primaryZone) zones.push(tech.primaryZone);
          if (Array.isArray(tech.secondaryZones)) zones.push(...tech.secondaryZones);
          const phones = tech.phone ? [tech.phone] : [];
          
          await pool.query(\`
            INSERT INTO users (id, name, email, avatar, global_role, department, technician_level, phones, service_zones, skills)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              avatar = EXCLUDED.avatar,
              technician_level = EXCLUDED.technician_level,
              phones = EXCLUDED.phones,
              service_zones = EXCLUDED.service_zones
          \`, [
            tech.id, 
            tech.name, 
            email, 
            tech.avatar || '', 
            'Vendor', 
            'Field Service', 
            tech.tier || 'Standard', 
            phones, 
            zones, 
            ['Installation', 'Survey']
          ]);

          // UPSERT unique zones into master_zones
          for (const zone of zones) {
            if (!zone) continue;
            // Create a pseudo-ID from zone name (e.g. "[BKK] กรุงเทพฯ..." -> base64 or clean string)
            const zoneId = Buffer.from(zone).toString('base64').substring(0, 50);
            await pool.query(\`
              INSERT INTO master_zones (id, name, created_at)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name
            \`, [zoneId, zone, new Date().toISOString()]);
          }

          count++;
        }
        console.log(\`✅ Upserted \${count} technicians from VQ into BuildFlow DB.\`);
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch remote technicians from vibepjm.online:', err.message);
  }
}`;

const replacementFunc = `async function fetchRemoteTechnicians() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://vibepjm.online/api/technicians', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.technicians && Array.isArray(data.technicians)) {
        console.log(\`ℹ️ Fetched \${data.technicians.length} remote technicians from vibepjm.online. Upserting to DB (technicians table)...\`);
        let count = 0;
        for (const tech of data.technicians) {
          const zones = [];
          if (tech.primaryZone) zones.push(tech.primaryZone);
          if (Array.isArray(tech.secondaryZones)) zones.push(...tech.secondaryZones);
          
          await pool.query(\`
            INSERT INTO technicians (
              id, user_id, code, name, phone, avatar, tier, rating, status,
              primary_zone, secondary_zones, skills, extra_data, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              code = EXCLUDED.code,
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              avatar = EXCLUDED.avatar,
              tier = EXCLUDED.tier,
              rating = EXCLUDED.rating,
              status = EXCLUDED.status,
              primary_zone = EXCLUDED.primary_zone,
              secondary_zones = EXCLUDED.secondary_zones,
              skills = EXCLUDED.skills,
              extra_data = EXCLUDED.extra_data,
              updated_at = NOW()
          \`, [
            tech.id,
            tech.userId || null,
            tech.code || tech.id,
            tech.name,
            tech.phone || null,
            tech.avatar || null,
            tech.tier || 'Standard',
            tech.rating ? parseFloat(tech.rating) : 5.0,
            tech.status || 'Active',
            tech.primaryZone || null,
            JSON.stringify(tech.secondaryZones || []),
            JSON.stringify(tech.skills || []),
            JSON.stringify(tech.extraData || {})
          ]);

          // UPSERT unique zones into master_zones
          for (const zone of zones) {
            if (!zone) continue;
            const zoneId = Buffer.from(zone).toString('base64').substring(0, 50);
            await pool.query(\`
              INSERT INTO master_zones (id, name, created_at)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name
            \`, [zoneId, zone, new Date().toISOString()]);
          }

          count++;
        }
        console.log(\`✅ Upserted \${count} technicians from VQ into BuildFlow DB (technicians table).\`);
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch remote technicians from vibepjm.online:', err.message);
  }
}`;

if (content.includes(targetFunc)) {
  content = content.replace(targetFunc, replacementFunc);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully updated fetchRemoteTechnicians in server.js');
} else {
  // Try normalized line endings
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = targetFunc.replace(/\r\n/g, '\n');
  const normRep = replacementFunc.replace(/\r\n/g, '\n');
  if (normContent.includes(normTarget)) {
    const res = normContent.replace(normTarget, normRep);
    fs.writeFileSync(filePath, res, 'utf8');
    console.log('✅ Successfully updated fetchRemoteTechnicians in server.js (normalized)');
  } else {
    console.error('❌ Could not find targetFunc in server.js');
  }
}
