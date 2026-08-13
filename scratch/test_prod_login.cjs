const https = require('https');

const data = JSON.stringify({
  email: 'isarachootip@gmail.com',
  password: 'password123'
});

const req = https.request('https://buildflowx.online/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.token) {
        console.log('Login success. Fetching initial-data...');
        
        https.get('https://buildflowx.online/api/initial-data', {
          headers: { 'Authorization': `Bearer ${parsed.token}` }
        }, (res2) => {
          let body2 = '';
          res2.on('data', chunk => { body2 += chunk; });
          res2.on('end', () => {
            try {
              const data2 = JSON.parse(body2);
              console.log('Projects count:', data2.projects ? data2.projects.length : 'undefined');
              if (data2.projects && data2.projects.length > 0) {
                console.log('First project:', data2.projects[0].name);
              }
            } catch (e) {
              console.log('Failed to parse initial-data:', body2.substring(0, 100));
            }
          });
        });
      } else {
        console.log('Login failed:', parsed);
      }
    } catch (e) {
      console.log('Failed to parse login response:', body.substring(0, 100));
    }
  });
});
req.on('error', console.error);
req.write(data);
req.end();
