const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:EsQShpeaGvSr21I5ieQGJRmCELp78GSlQn6hQHAIjbTnY4c1aWw56JleGierEk2t@187.77.147.16:5432/buildflowdb' 
});

async function test() {
  const r = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'");
  const apiKey = r.rows[0]?.setting_value;
  console.log('API Key found:', apiKey ? 'YES (' + apiKey.substring(0,10) + '...)' : 'NO - ยังไม่ได้ตั้งค่า');
  
  if (!apiKey) {
    await pool.end();
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ];
  
  for (const m of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('say hi');
      console.log('✅ WORKS:', m);
    } catch(e) {
      console.log('❌ FAIL: ', m, '->', e.message.substring(0, 100));
    }
  }
  
  await pool.end();
}

test().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
