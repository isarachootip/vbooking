import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser || 'vibeproject2026@gmail.com';

let transporter = null;

// Initialize transporter if credentials are provided
if (smtpUser && smtpPass) {
  console.log(`✉️ Mail Service: Initializing SMTP with host ${smtpHost}:${smtpPort}, user: ${smtpUser}`);
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports (like 587)
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: false // Avoid SSL issue on some hosts
    }
  });
} else {
  console.warn('⚠️ Mail Service: SMTP credentials not set. Emails will be logged to the console instead.');
}

/**
 * Send an email notification.
 * @param {Object} options
 * @param {string} options.to Recipient email address
 * @param {string} options.subject Email subject
 * @param {string} options.html HTML email body
 */
export async function sendEmail({ to, subject, html }) {
  if (!to) {
    console.error('❌ Mail Service Error: No recipient address specified.');
    return false;
  }

  // Fallback: If SMTP transporter is not initialized, log the email to console
  if (!transporter) {
    console.log('\n=================== ✉️ MOCK EMAIL SENT ===================');
    console.log(`To:      ${to}`);
    console.log(`From:    ${smtpFrom}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html.replace(/<[^>]*>/g, ' ')}`); // Simple html-to-text strip for console log
    console.log('========================================================\n');
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html
    });
    console.log(`✉️ Email successfully sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Mail Service Error: Failed to send email to ${to}:`, error.message);
    return false;
  }
}
