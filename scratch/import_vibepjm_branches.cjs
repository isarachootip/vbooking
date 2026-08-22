const https = require('https');
const pool = require('../src/config/db.cjs');

function getUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('🚀 Connecting to https://vibepjm.online to fetch latest frontend bundle...');
  const html = await getUrl('https://vibepjm.online/');
  
  const scriptRegex = /src="(\/assets\/index-[^"]+\.js)"/;
  const match = html.match(scriptRegex);
  if (!match) {
    throw new Error('Could not find bundle script in vibepjm.online');
  }

  const bundleUrl = 'https://vibepjm.online' + match[1];
  console.log(`📦 Loading bundle from ${bundleUrl}...`);
  const jsContent = await getUrl(bundleUrl);

  // Find array containing branch definitions: [{id:`br-01`,code:`B01`,name:`สาขาพระราม 9`...
  const startMarker = '[{id:`br-01`,code:`B01`,name:`สาขาพระราม 9`';
  const startIdx = jsContent.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error('Could not locate branch array in JS bundle');
  }

  // Find the end of array ']'
  // We can track matching brackets
  let bracketCount = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < jsContent.length; i++) {
    if (jsContent[i] === '[') bracketCount++;
    else if (jsContent[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  const arrayStr = jsContent.substring(startIdx, endIdx);
  console.log(`Found branch array definition of length ${arrayStr.length} chars.`);

  // Convert template literals and JS keys to valid JSON
  // Or evaluate in safe sandbox function
  const cleanFn = new Function(`return ${arrayStr};`);
  const branches = cleanFn();

  console.log(`✅ Successfully extracted ${branches.length} branches from https://vibepjm.online!`);

  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_branches (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      province VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Active',
      created_at VARCHAR(50),
      updated_at VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS branches (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      province VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Active',
      full_name VARCHAR(255),
      address TEXT,
      latitude NUMERIC(10,8),
      longitude NUMERIC(11,8),
      open_time VARCHAR(50) DEFAULT '07:00',
      close_time VARCHAR(50) DEFAULT '21:00',
      phone VARCHAR(50) DEFAULT '1308',
      store_group VARCHAR(100) DEFAULT 'TWD',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  let masterCount = 0;
  let branchCount = 0;
  const now = new Date().toISOString();

  for (const b of branches) {
    const branchId = b.id || `br-${b.code || Date.now()}`;
    const branchCode = b.code || branchId;
    const branchName = b.name;
    const province = b.province || 'กรุงเทพมหานคร';
    const status = b.status || 'Active';
    const fullName = b.fullName || b.name;
    const address = b.address || `${b.name} ${province}`;
    const lat = b.latitude ? parseFloat(b.latitude) : null;
    const lng = b.longitude ? parseFloat(b.longitude) : null;
    const openTime = b.openTime || '07:00';
    const closeTime = b.closeTime || '21:00';
    const phone = b.phone || '1308';
    const storeGroup = b.storeGroup || (b.name.includes('ไทวัสดุ') ? 'TWD' : 'BNB');

    // 1. Insert into master_branches
    await pool.query(`
      INSERT INTO master_branches (id, code, name, province, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        province = EXCLUDED.province,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [branchId, branchCode, branchName, province, status, now, now]);
    masterCount++;

    // 2. Insert into branches
    await pool.query(`
      INSERT INTO branches (id, code, name, province, status, full_name, address, latitude, longitude, open_time, close_time, phone, store_group, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        province = EXCLUDED.province,
        status = EXCLUDED.status,
        full_name = EXCLUDED.full_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        phone = EXCLUDED.phone,
        store_group = EXCLUDED.store_group,
        updated_at = CURRENT_TIMESTAMP
    `, [
      branchId, branchCode, branchName, province, status,
      fullName, address, lat, lng, openTime, closeTime, phone, storeGroup
    ]);
    branchCount++;
  }

  console.log(`🎉 IMPORT COMPLETE!`);
  console.log(`📊 master_branches: ${masterCount} สาขา`);
  console.log(`📊 branches: ${branchCount} สาขา`);

  // Verify first 5
  const sample = await pool.query(`SELECT id, code, name, province, store_group, latitude, longitude FROM branches ORDER BY id ASC LIMIT 5`);
  console.log('Sample branches in DB:', sample.rows);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
