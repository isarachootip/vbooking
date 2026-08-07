const http = require('http');

const API_KEY = 'bf_vq_sync_secret_2026';
const PORT = 3000;
const HOST = 'localhost';

function request(method, path, data = null, useValidKey = true) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (useValidKey) {
      options.headers['x-api-key'] = API_KEY;
    } else {
      options.headers['x-api-key'] = 'invalid_secret_key';
    }

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function test() {
  console.log('🚀 Starting VQ REST Integration API Tests...');

  // Test 1: 401 Unauthorized check
  const unauthorizedRes = await request('GET', '/api/integration/zones', null, false);
  console.assert(unauthorizedRes.status === 401, 'Test 1 Failed: Should return 401');
  console.log('✅ Test 1 Passed: 401 Unauthorized handler is working!');

  // Test 2: GET Zones with valid API Key
  const getZonesRes = await request('GET', '/api/integration/zones', null, true);
  console.assert(getZonesRes.status === 200, 'Test 2 Failed: Should return 200');
  console.log(`✅ Test 2 Passed: Authorized GET /zones returned ${getZonesRes.data.zones.length} zones.`);

  // Test 3: POST Zone (Create/Upsert)
  const testZone = {
    id: 'test-zone-999',
    code: 'Z99-TEST',
    name: 'โซนทดสอบพญาไท',
    description: 'พื้นที่สำหรับทดสอบระบบบูรณาการ API',
    coverage_zipcodes: ['10400', '10401']
  };
  const createZoneRes = await request('POST', '/api/integration/zones', testZone, true);
  console.assert(createZoneRes.status === 200, 'Test 3 Failed: Should create zone');
  console.assert(createZoneRes.data.zone.code === 'Z99-TEST', 'Test 3 Failed: Code mismatch');
  console.log('✅ Test 3 Passed: POST /zones (Create/Upsert) works!');

  // Test 4: PUT Zone (Update)
  const updateZonePayload = {
    code: 'Z99-TEST-UPDATED',
    name: 'โซนทดสอบพญาไท (แก้ไข)',
    description: 'คำอธิบายโซนทดสอบหลังอัปเดต',
    coverage_zipcodes: ['10400']
  };
  const updateZoneRes = await request('PUT', `/api/integration/zones/${testZone.id}`, updateZonePayload, true);
  console.assert(updateZoneRes.status === 200, 'Test 4 Failed: Should update zone');
  console.assert(updateZoneRes.data.zone.name === 'โซนทดสอบพญาไท (แก้ไข)', 'Test 4 Failed: Name update mismatch');
  console.log('✅ Test 4 Passed: PUT /zones/:id (Update) works!');

  // Test 5: POST Technician (Create/Upsert)
  const testTech = {
    id: 'tech-test-999',
    user_id: 'usr-test-999',
    code: 'T-TEST-999',
    name: 'นายช่างทดสอบ ซิงค์ระบบ',
    phone: '089-999-9999',
    avatar: 'https://i.pravatar.cc/150?u=tech-test-999',
    tier: 'Premium',
    rating: 4.8,
    status: 'Active',
    primary_zone: 'test-zone-999',
    secondary_zones: ['test-zone-999'],
    skills: ['ซ่อมกล้องวงจรปิด', 'ติดตั้งไฟสนาม'],
    extra_data: { certs: ['C-101'] }
  };
  const createTechRes = await request('POST', '/api/integration/technicians', testTech, true);
  console.assert(createTechRes.status === 200, 'Test 5 Failed: Should create technician');
  console.assert(createTechRes.data.technician.name === 'นายช่างทดสอบ ซิงค์ระบบ', 'Test 5 Failed: Name mismatch');
  console.log('✅ Test 5 Passed: POST /technicians (Create/Upsert) works!');

  // Test 6: GET Skills (Aggregation list)
  const getSkillsRes = await request('GET', '/api/integration/skills', null, true);
  console.assert(getSkillsRes.status === 200, 'Test 6 Failed: Should get skills');
  console.assert(getSkillsRes.data.skills.includes('ซ่อมกล้องวงจรปิด'), 'Test 6 Failed: Missing test skill');
  console.log(`✅ Test 6 Passed: GET /skills aggregated correctly! Unique skills list: [${getSkillsRes.data.skills.join(', ')}]`);

  // Test 7: PUT Technician (Update)
  const updateTechPayload = {
    code: 'T-TEST-999-UPDATED',
    name: 'นายช่างทดสอบ ซิงค์ระบบ (แก้ไข)',
    phone: '089-999-8888',
    avatar: 'https://i.pravatar.cc/150?u=tech-test-999',
    tier: 'Premium',
    rating: 4.9,
    status: 'Active',
    primary_zone: 'test-zone-999',
    secondary_zones: ['test-zone-999'],
    skills: ['ซ่อมกล้องวงจรปิด', 'ติดตั้งไฟสนาม', 'ติดตั้งตู้เย็น'],
    extra_data: { certs: ['C-101', 'C-102'] }
  };
  const updateTechRes = await request('PUT', `/api/integration/technicians/${testTech.id}`, updateTechPayload, true);
  console.assert(updateTechRes.status === 200, 'Test 7 Failed: Should update technician');
  console.assert(updateTechRes.data.technician.rating === '4.9', 'Test 7 Failed: Rating mismatch');
  console.log('✅ Test 7 Passed: PUT /technicians/:id (Update) works!');

  // Test 8: DELETE Technician
  const deleteTechRes = await request('DELETE', `/api/integration/technicians/${testTech.id}`, null, true);
  console.assert(deleteTechRes.status === 200, 'Test 8 Failed: Should delete technician');
  console.log('✅ Test 8 Passed: DELETE /technicians/:id works!');

  // Test 9: DELETE Zone
  const deleteZoneRes = await request('DELETE', `/api/integration/zones/${testZone.id}`, null, true);
  console.assert(deleteZoneRes.status === 200, 'Test 9 Failed: Should delete zone');
  console.log('✅ Test 9 Passed: DELETE /zones/:id works!');

  // Test 9: POST Branch (Create/Upsert)
  const testBranch = {
    id: 'br-test-999',
    code: 'B999',
    name: 'สาขาซิงค์ทดสอบ',
    province: 'กรุงเทพมหานคร',
    status: 'Active',
    fullName: 'บริษัท ทดสอบ การจำกัด (สาขาซิงค์ทดสอบ)',
    address: '999/999 ถนนพญาไท เขตราชเทวี 10400',
    latitude: 13.7563,
    longitude: 100.5018,
    openTime: '08:00',
    closeTime: '22:00',
    phone: '1308',
    storeGroup: 'HBY'
  };
  const createBranchRes = await request('POST', '/api/integration/branches', testBranch, true);
  console.assert(createBranchRes.status === 200, 'Test 9 Failed: Should create branch');
  console.assert(createBranchRes.data.branch.name === 'สาขาซิงค์ทดสอบ', 'Test 9 Failed: Branch name mismatch');
  console.log('✅ Test 9 Passed: POST /branches (Create/Upsert) works!');

  // Test 10: PUT Branch (Update)
  const updateBranchPayload = {
    code: 'B999-UPDATED',
    name: 'สาขาซิงค์ทดสอบ (แก้ไข)',
    province: 'นนทบุรี',
    status: 'Active',
    fullName: 'บริษัท ทดสอบ การจำกัด (สาขาซิงค์ทดสอบ - แก้ไข)',
    address: '999/999 ถนนปากเกร็ด 11120',
    latitude: 13.9188,
    longitude: 100.4188,
    openTime: '09:00',
    closeTime: '21:00',
    phone: '1308',
    storeGroup: 'TWD'
  };
  const updateBranchRes = await request('PUT', `/api/integration/branches/${testBranch.id}`, updateBranchPayload, true);
  console.assert(updateBranchRes.status === 200, 'Test 10 Failed: Should update branch');
  console.assert(updateBranchRes.data.branch.province === 'นนทบุรี', 'Test 10 Failed: Province mismatch');
  console.log('✅ Test 10 Passed: PUT /branches/:id (Update) works!');

  // Test 11: DELETE Branch
  const deleteBranchRes = await request('DELETE', `/api/integration/branches/${testBranch.id}`, null, true);
  console.assert(deleteBranchRes.status === 200, 'Test 11 Failed: Should delete branch');
  console.log('✅ Test 11 Passed: DELETE /branches/:id works!');

  console.log('\n⭐ ALL INTEGRATION API TESTS PASSED SUCCESSFULLY! ⭐\n');
}

test().catch(err => {
  console.error('❌ Integration API Test Suite Failed:', err);
  process.exit(1);
});
