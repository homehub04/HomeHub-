const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadToR2 } = require('../utils/r2');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});

// ---- POST /api/upload ----  (landlord only) — form field name: "photos", up to 8 files
router.post('/', requireAuth, requireRole('landlord'), upload.array('photos', 8), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });

    const urls = await Promise.all(
      req.files.map(f => uploadToR2(f.buffer, f.originalname, f.mimetype))
    );

    res.json({ urls });
  } catch (err) {
    console.error('R2 upload failed:', err);
    res.status(500).json({ error: 'Upload failed. Check your R2 credentials in .env' });
  }
});

module.exports = router;
