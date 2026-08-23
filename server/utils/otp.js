// utils/otp.js — generate + deliver one-time codes for email and phone verification.
//
// Email is delivered for real via free Gmail SMTP (see mailer.js).
// Phone SMS has no genuinely free provider at any real volume, so by default
// this just logs the code to your server console (SMS_PROVIDER=console) —
// good enough to build and test the full signup flow end to end. When you're
// ready to send real texts, add a provider below (Africa's Talking has a
// free sandbox; Termii gives free trial credits for African numbers) and
// switch SMS_PROVIDER in .env.

const db = require('../db');
const { sendMail } = require('./mailer');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function saveOtp({ target, channel, purpose }) {
  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  db.prepare(
    `INSERT INTO otps (target, channel, code, purpose, expires_at) VALUES (?,?,?,?,?)`
  ).run(target, channel, code, purpose, expires);
  return code;
}

async function sendEmailOtp(email, purpose) {
  const code = saveOtp({ target: email, channel: 'email', purpose });
  await sendMail({
    to: email,
    subject: `Your Nzvimbo verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your Nzvimbo verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes.</p>`
  });
  return true;
}

async function sendPhoneOtp(phone, purpose) {
  const code = saveOtp({ target: phone, channel: 'phone', purpose });
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    console.log(`\n[SMS-DEV] Verification code for ${phone}: ${code}\n`);
    return true;
  }

  // Example shape for wiring a real provider later:
  // if (provider === 'africastalking') { await africastalkingClient.SMS.send({...}); }
  // if (provider === 'termii') { await fetch('https://api.ng.termii.com/api/sms/send', {...}); }

  throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
}

function verifyOtp({ target, channel, code }) {
  const row = db
    .prepare(
      `SELECT * FROM otps WHERE target = ? AND channel = ? AND code = ? AND consumed = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(target, channel, code);

  if (!row) return { ok: false, reason: 'invalid_code' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };

  db.prepare(`UPDATE otps SET consumed = 1 WHERE id = ?`).run(row.id);
  return { ok: true };
}

module.exports = { sendEmailOtp, sendPhoneOtp, verifyOtp };
