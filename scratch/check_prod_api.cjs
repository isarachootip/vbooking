const https = require('https');

https.get('https://buildflowx.online/api/initial-data', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Projects count:', parsed.projects ? parsed.projects.length : 'undefined');
      if (parsed.projects && parsed.projects.length > 0) {
        console.log('First project:', parsed.projects[0].name);
      }
    } catch (e) {
      console.log('Failed to parse:', data.substring(0, 100));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
