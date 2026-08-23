const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---- GET /api/messages/:listingId/:otherUserId ---- history for one chat thread
router.get('/:listingId/:otherUserId', requireAuth, (req, res) => {
  const { listingId, otherUserId } = req.params;
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE listing_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY created_at ASC`
    )
    .all(listingId, req.user.id, otherUserId, otherUserId, req.user.id);
  res.json({ messages: rows });
});

// ---- GET /api/messages/threads ---- list of conversations for the logged-in user
router.get('/threads/all', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, l.title AS listing_title,
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id
       FROM messages m
       LEFT JOIN listings l ON l.id = m.listing_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(req.user.id, req.user.id, req.user.id);

  // collapse to most recent message per thread
  const seen = new Set();
  const threads = [];
  for (const r of rows) {
    const key = `${r.listing_id}-${r.other_user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    threads.push(r);
  }
  res.json({ threads });
});

module.exports = router;
