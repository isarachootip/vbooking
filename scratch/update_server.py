with open('server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_func = """async function fetchRemoteTechnicians() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://vibepjm.online/api/technicians', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data && data.technicians && Array.isArray(data.technicians)) {
        console.log(`ℹ️ Fetched ${data.technicians.length} remote technicians from vibepjm.online. Upserting to DB (technicians table)...`);
        let count = 0;
        for (const tech of data.technicians) {
          const zones = [];
          if (tech.primaryZone) zones.push(tech.primaryZone);
          if (Array.isArray(tech.secondaryZones)) zones.push(...tech.secondaryZones);
          
          await pool.query(`
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
          `, [
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
            await pool.query(`
              INSERT INTO master_zones (id, name, created_at)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name
            `, [zoneId, zone, new Date().toISOString()]);
          }

          count++;
        }
        console.log(`✅ Upserted ${count} technicians from VQ into BuildFlow DB (technicians table).`);
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to fetch remote technicians from vibepjm.online:', err.message);
  }
}
"""

start_idx = None
for i, line in enumerate(lines):
    if 'async function fetchRemoteTechnicians()' in line:
        start_idx = i
        break

if start_idx is not None:
    end_idx = start_idx
    while end_idx < len(lines):
        if lines[end_idx].strip() == '}' and (end_idx + 1 >= len(lines) or 'setTimeout(fetchRemoteBranches' in lines[end_idx+2] or 'setTimeout(fetchRemoteBranches' in lines[end_idx+3]):
            end_idx += 1
            break
        end_idx += 1

    print(f"Replacing lines {start_idx} to {end_idx}")
    lines[start_idx:end_idx] = [new_func]
    with open('server.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("SUCCESS")
