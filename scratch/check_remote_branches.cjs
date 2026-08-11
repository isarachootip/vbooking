const https = require('https');

function getJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ url, status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ url, status: res.statusCode, error: 'Not JSON', text: data.substring(0, 200) });
        }
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  console.log('🔍 Querying remote branches API...');
  const res = await getJson('https://vibepjm.online/api/branches');
  console.log('Status:', res.status);
  if (res.body) {
    console.log('Is Success:', res.body.status);
    console.log('Source:', res.body.source);
    if (res.body.branches) {
      console.log('Total branches returned:', res.body.branches.length);
      console.log('Sample branch:', res.body.branches[0]);
    }
  } else {
    console.log('Error/Text:', res.error || res.text);
  }
}

main().catch(console.error);
