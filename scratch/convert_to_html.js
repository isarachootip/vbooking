import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Read markdown
const md = fs.readFileSync(path.join(projectRoot, 'user_manual.md'), 'utf-8');

// Custom renderer to embed images as base64
const renderer = new marked.Renderer();
const originalImage = renderer.image;

renderer.image = function({ href, title, text }) {
  if (href && !href.startsWith('http')) {
    const imgPath = path.join(projectRoot, href);
    if (fs.existsSync(imgPath)) {
      const imgData = fs.readFileSync(imgPath);
      const base64 = imgData.toString('base64');
      const ext = path.extname(imgPath).slice(1);
      const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      return `<div style="text-align:center;margin:20px 0;"><img src="data:${mimeType};base64,${base64}" alt="${text || ''}" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);" /><br/><em style="color:#666;font-size:0.9em;">${text || ''}</em></div>`;
    }
  }
  return `<div style="text-align:center;margin:20px 0;"><img src="${href}" alt="${text || ''}" style="max-width:100%;" /><br/><em>${text || ''}</em></div>`;
};

// Process GitHub-style alerts: > [!NOTE], > [!WARNING], etc.
function processAlerts(html) {
  const alertTypes = {
    'NOTE': { color: '#0969da', bg: '#ddf4ff', icon: 'ℹ️', label: 'หมายเหตุ' },
    'TIP': { color: '#1a7f37', bg: '#dafbe1', icon: '💡', label: 'เคล็ดลับ' },
    'IMPORTANT': { color: '#8250df', bg: '#fbefff', icon: '❗', label: 'สำคัญ' },
    'WARNING': { color: '#9a6700', bg: '#fff8c5', icon: '⚠️', label: 'คำเตือน' },
    'CAUTION': { color: '#cf222e', bg: '#ffebe9', icon: '🚨', label: 'ระวัง' },
  };

  for (const [type, style] of Object.entries(alertTypes)) {
    const regex = new RegExp(`<blockquote>\\s*<p>\\[!${type}\\]\\s*<br>([\\s\\S]*?)</p>\\s*</blockquote>`, 'gi');
    html = html.replace(regex, (_, content) => {
      return `<div style="border-left:4px solid ${style.color};background:${style.bg};padding:12px 16px;margin:16px 0;border-radius:4px;"><strong style="color:${style.color};">${style.icon} ${style.label}</strong><br/>${content.trim()}</div>`;
    });
    // Also handle multiline format
    const regex2 = new RegExp(`<blockquote>\\s*<p>\\[!${type}\\]</p>\\s*<p>([\\s\\S]*?)</p>\\s*</blockquote>`, 'gi');
    html = html.replace(regex2, (_, content) => {
      return `<div style="border-left:4px solid ${style.color};background:${style.bg};padding:12px 16px;margin:16px 0;border-radius:4px;"><strong style="color:${style.color};">${style.icon} ${style.label}</strong><br/>${content.trim()}</div>`;
    });
  }
  return html;
}

// Configure marked
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true,
});

// Convert markdown to HTML
let htmlBody = marked(md);
htmlBody = processAlerts(htmlBody);

// Create full HTML document with styling
const htmlDoc = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คู่มือการใช้งานระบบ NexTime</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
    
    body {
      font-family: 'Sarabun', 'Segoe UI', sans-serif;
      line-height: 1.8;
      color: #1a1a2e;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 30px;
      background: #fff;
    }
    
    h1 {
      font-size: 2em;
      color: #1a1a2e;
      border-bottom: 3px solid #6c5ce7;
      padding-bottom: 12px;
      margin-top: 40px;
    }
    
    h2 {
      font-size: 1.5em;
      color: #2d3436;
      border-bottom: 2px solid #dfe6e9;
      padding-bottom: 8px;
      margin-top: 36px;
    }
    
    h3 {
      font-size: 1.2em;
      color: #2d3436;
      margin-top: 24px;
    }
    
    h4 {
      font-size: 1.1em;
      color: #636e72;
      margin-top: 16px;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 0.95em;
    }
    
    th {
      background: #6c5ce7;
      color: white;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 8px 14px;
      border: 1px solid #dfe6e9;
    }
    
    tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    code {
      background: #f1f2f6;
      color: #e17055;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    
    pre {
      background: #2d3436;
      color: #dfe6e9;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.5;
    }
    
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid #6c5ce7;
      background: #f8f9fa;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
      color: #2d3436;
    }
    
    blockquote p {
      margin: 4px 0;
    }
    
    hr {
      border: none;
      border-top: 2px solid #dfe6e9;
      margin: 32px 0;
    }
    
    ul, ol {
      padding-left: 24px;
    }
    
    li {
      margin: 4px 0;
    }
    
    strong {
      color: #2d3436;
    }
    
    a {
      color: #6c5ce7;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* NEW tag styling */
    em {
      font-style: italic;
    }
    
    /* Page break hints for printing */
    h2 {
      page-break-before: auto;
    }
    
    @media print {
      body {
        font-size: 11pt;
        padding: 0;
      }
      h1 { font-size: 18pt; }
      h2 { font-size: 14pt; page-break-before: always; }
      h3 { font-size: 12pt; }
      pre { font-size: 9pt; }
    }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

// Write HTML file
const outputPath = path.join(projectRoot, 'user_manual.html');
fs.writeFileSync(outputPath, htmlDoc, 'utf-8');

console.log(`✅ HTML file created: ${outputPath}`);
console.log(`📄 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('');
console.log('📋 วิธีนำเข้า Google Docs:');
console.log('   1. ไปที่ Google Drive (drive.google.com)');
console.log('   2. คลิก "+ ใหม่" > "อัปโหลดไฟล์"');
console.log('   3. เลือกไฟล์ user_manual.html');
console.log('   4. เมื่ออัปโหลดเสร็จ คลิกขวาที่ไฟล์ > "เปิดด้วย" > "Google เอกสาร"');
console.log('   5. Google Docs จะแปลงเป็นเอกสารพร้อมรูปภาพอัตโนมัติ!');
