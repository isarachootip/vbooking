const https = require('https');

function getHealth(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ url, status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ url, status: res.statusCode, error: 'Not JSON', text: data.substring(0, 150) });
        }
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  console.log('🔍 Checking production server health statuses...');
  const buildflowHealth = await getHealth('https://buildflowx.online/api/health');
  const vqHealth = await getHealth('https://vibepjm.online/api/health');
  
  console.log('\n--- BuildFlow Dashboard Health ---');
  console.log(JSON.stringify(buildflowHealth, null, 2));
  
  console.log('\n--- VQ Installer Management Health ---');
  console.log(JSON.stringify(vqHealth, null, 2));
}

main().catch(console.error);
