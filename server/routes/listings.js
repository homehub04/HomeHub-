const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---- GET /api/listings ----
// Query: city, minPrice, maxPrice, bedrooms, q
router.get('/', (req, res) => {
  const { city, minPrice, maxPrice, bedrooms, q } = req.query;

  let sql = `SELECT listings.*, users.name AS landlord_name FROM listings
             JOIN users ON users.id = listings.landlord_id
             WHERE listings.status = 'live'`;
  const params = [];

  if (city) { sql += ` AND listings.city LIKE ?`; params.push(`%${city}%`); }
  if (minPrice) { sql += ` AND listings.price >= ?`; params.push(Number(minPrice)); }
  if (maxPrice) { sql += ` AND listings.price <= ?`; params.push(Number(maxPrice)); }
  if (bedrooms) { sql += ` AND listings.bedrooms >= ?`; params.push(Number(bedrooms)); }
  if (q) { sql += ` AND (listings.title LIKE ? OR listings.address LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }

  sql += ` ORDER BY listings.created_at DESC LIMIT 100`;

  const rows = db.prepare(sql).all(...params).map(r => ({ ...r, images: JSON.parse(r.images || '[]') }));
  res.json({ listings: rows });
});

// ---- GET /api/listings/:id ----
router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT listings.*, users.name AS landlord_name, users.phone AS landlord_phone
       FROM listings JOIN users ON users.id = listings.landlord_id
       WHERE listings.id = ?`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  res.json({ listing: { ...row, images: JSON.parse(row.images || '[]') } });
});

// ---- POST /api/listings ---- (landlord only)
router.post('/', requireAuth, requireRole('landlord'), (req, res) => {
  const { title, description, price, currency, bedrooms, bathrooms, area_sqm, address, city, lat, lng, images } = req.body;

  if (!title || !price || !address) {
    return res.status(400).json({ error: 'title, price and address are required' });
  }

  const info = db
    .prepare(
      `INSERT INTO listings
       (landlord_id, title, description, price, currency, bedrooms, bathrooms, area_sqm, address, city, lat, lng, images, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`
    )
    .run(
      req.user.id, title, description || '', price, currency || 'USD',
      bedrooms || 0, bathrooms || 0, area_sqm || null, address, city || '',
      lat || null, lng || null, JSON.stringify(images || [])
    );

  res.status(201).json({ id: info.lastInsertRowid, message: 'Listing submitted for verification' });
});

// ---- PATCH /api/listings/:id ---- (owner landlord only)
router.patch('/:id', requireAuth, requireRole('landlord'), (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.landlord_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

  const fields = ['title', 'description', 'price', 'bedrooms', 'bathrooms', 'area_sqm', 'address', 'city', 'status'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Listing updated' });
});

// ---- GET /api/listings/mine/all ---- (landlord dashboard)
router.get('/mine/all', requireAuth, requireRole('landlord'), (req, res) => {
  const rows = db
    .prepare('SELECT * FROM listings WHERE landlord_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
    .map(r => ({ ...r, images: JSON.parse(r.images || '[]') }));
  res.json({ listings: rows });
});

// ---- POST /api/listings/:id/verify ---- (admin only — simulates the Cloud Function verification step)
router.post('/:id/verify', requireAuth, requireRole('admin'), (req, res) => {
  db.prepare(`UPDATE listings SET verified = 1, status = 'live' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Listing verified and published' });
});

module.exports = router;
