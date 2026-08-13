const http = require('http');

http.get('http://localhost:3000/api/initial-data', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Projects count:', parsed.projects ? parsed.projects.length : 0);
    } catch (e) {
      console.log('Failed to parse:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
