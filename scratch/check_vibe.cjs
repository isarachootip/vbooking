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
  const html = await getUrl('https://vibepjm.online/');
  console.log('HTML preview:', html.substring(0, 300));
  
  // Find JS bundles
  const scriptRegex = /src="(\/assets\/[^"]+\.js)"/g;
  let match;
  const bundles = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    bundles.push(match[1]);
  }
  console.log('Found JS bundles:', bundles);

  for (const b of bundles) {
    const jsContent = await getUrl('https://vibepjm.online' + b);
    console.log(`Bundle ${b} size: ${jsContent.length}`);
    
    // Search for branch names or thai watsadu in bundle
    const branchMatches = jsContent.match(/สาขา[^\s"'{,}]+/g);
    if (branchMatches) {
      const unique = Array.from(new Set(branchMatches));
      console.log(`Found ${unique.length} branch names in ${b}:`, unique.slice(0, 20));
    }
  }
}

main().catch(console.error);
