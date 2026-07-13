import { sendEmail } from '../mailService.js';

async function run() {
  console.log('Sending test email...');
  const success = await sendEmail({
    to: 'test-recipient@example.com',
    subject: 'NexTime Email Test Notification',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>NexTime Notification Connection Test</h3>
        <p>This is a test email sent from the NexTime email notification service.</p>
        <p>If you see this and SMTP credentials were set, it means the SMTP connection is fully functional!</p>
        <p>Timestamp: <strong>${new Date().toISOString()}</strong></p>
      </div>
    `
  });
  console.log('Test send status:', success ? 'SUCCESS' : 'FAILED');
}

run();
