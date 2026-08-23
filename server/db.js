// db.js — zero-cost local database using SQLite (file-based, no server to run/pay for).
// Swap this out for Postgres/Supabase later if you outgrow it; the query shapes
// below are simple enough to port.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'nzvimbo.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant', -- tenant | landlord | admin
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,       -- email address or phone number
  channel TEXT NOT NULL,      -- 'email' | 'phone'
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,      -- 'signup' | 'login'
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landlord_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  area_sqm REAL,
  address TEXT NOT NULL,
  city TEXT,
  lat REAL,
  lng REAL,
  images TEXT DEFAULT '[]',   -- JSON array of R2 URLs
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | live | rented | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER REFERENCES listings(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(listing_id, sender_id, receiver_id);
`);

module.exports = db;
