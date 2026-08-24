// utils/mailer.js — sends real email for free using Gmail SMTP + an App Password.
// Setup: https://myaccount.google.com/apppasswords (needs 2FA enabled on the Gmail account)

const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.SMTP_PORT || 465);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n[EMAIL-DEV] (SMTP not configured) To: ${to} | Subject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail };
