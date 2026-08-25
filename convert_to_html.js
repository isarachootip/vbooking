import fs from 'fs';
import { marked } from 'marked';

const md = fs.readFileSync('TESTER_MANUAL_LEADS_TO_COMPLETION.md', 'utf8');
const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>คู่มือทดสอบระบบ NexTime (vbooking) - QA Test Manual</title>
<style>
  body {
    font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.65;
    color: #1e293b;
    max-width: 960px;
    margin: 40px auto;
    padding: 0 25px;
    background-color: #ffffff;
  }
  h1 {
    color: #1e3a8a;
    font-size: 26px;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  h2 {
    color: #1e40af;
    font-size: 20px;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 36px;
  }
  h3 {
    color: #2563eb;
    font-size: 16px;
    margin-top: 24px;
  }
  h4 {
    color: #0f766e;
    font-size: 14px;
    margin-top: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 22px 0;
    font-size: 14px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 10px 14px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: bold;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }
  code {
    background-color: #f1f5f9;
    color: #b45309;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
  }
  pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
  }
  blockquote {
    border-left: 4px solid #3b82f6;
    padding: 12px 20px;
    background-color: #eff6ff;
    margin: 18px 0;
    color: #1e40af;
    border-radius: 0 8px 8px 0;
  }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 32px 0;
  }
  ul, ol {
    padding-left: 26px;
  }
  li {
    margin-bottom: 8px;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync('TESTER_MANUAL_LEADS_TO_COMPLETION.html', html, 'utf8');
console.log('Successfully generated TESTER_MANUAL_LEADS_TO_COMPLETION.html');
