const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendEmailOtp, sendPhoneOtp, verifyOtp } = require('../utils/otp');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    email_verified: !!u.email_verified,
    phone_verified: !!u.phone_verified
  };
}

// ---- POST /api/auth/signup ----
// Body: { name, email, phone, password, role: 'tenant' | 'landlord' }
router.post('/signup', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'name, email, phone and password are all required' });
  }
  if (!['tenant', 'landlord'].includes(role)) {
    return res.status(400).json({ error: "role must be 'tenant' or 'landlord'" });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
  if (existing) return res.status(409).json({ error: 'An account with this email or phone already exists' });

  const password_hash = await bcrypt.hash(password, 10);

  const info = db
    .prepare(
      `INSERT INTO users (email, phone, password_hash, name, role) VALUES (?,?,?,?,?)`
    )
    .run(email, phone, password_hash, name, role);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  await sendEmailOtp(email, 'signup');
  await sendPhoneOtp(phone, 'signup');

  res.status(201).json({
    message: 'Account created. Check your email and phone for verification codes.',
    token: signToken(user),
    user: publicUser(user)
  });
});

// ---- POST /api/auth/verify ----
// Body: { channel: 'email' | 'phone', target, code }
router.post('/verify', (req, res) => {
  const { channel, target, code } = req.body;
  if (!['email', 'phone'].includes(channel)) return res.status(400).json({ error: 'Invalid channel' });

  const result = verifyOtp({ target, channel, code });
  if (!result.ok) return res.status(400).json({ error: result.reason });

  const column = channel === 'email' ? 'email' : 'phone';
  const flag = channel === 'email' ? 'email_verified' : 'phone_verified';
  db.prepare(`UPDATE users SET ${flag} = 1 WHERE ${column} = ?`).run(target);

  const user = db.prepare(`SELECT * FROM users WHERE ${column} = ?`).get(target);
  res.json({ message: `${channel} verified`, user: publicUser(user) });
});

// ---- POST /api/auth/resend ----
// Body: { channel: 'email' | 'phone', target }
router.post('/resend', async (req, res) => {
  const { channel, target } = req.body;
  if (channel === 'email') await sendEmailOtp(target, 'signup');
  else if (channel === 'phone') await sendPhoneOtp(target, 'signup');
  else return res.status(400).json({ error: 'Invalid channel' });
  res.json({ message: 'Code resent' });
});

// ---- POST /api/auth/login ----
// Body: { identifier, password }  -- identifier can be email OR phone
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });

  const user = db
    .prepare('SELECT * FROM users WHERE email = ? OR phone = ?')
    .get(identifier, identifier);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

// ---- GET /api/auth/me ----
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
