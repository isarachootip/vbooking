const https = require('https');

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
  const jsContent = await getUrl('https://vibepjm.online/assets/index-CbH0iS7U.js');
  
  // Find branch objects (e.g. { id: '...', code: '...', name: '...', ... })
  // Search for branch definitions
  const idx = jsContent.indexOf('สาขาพระราม');
  console.log('Context around สาขาพระราม:');
  console.log(jsContent.substring(Math.max(0, idx - 200), idx + 800));
}

main().catch(console.error);
