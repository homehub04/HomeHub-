// utils/r2.js — uploads listing photos to Cloudflare R2 (S3-compatible API).
// Free tier: 10GB storage, zero egress fees. Create a bucket + API token in
// the Cloudflare dashboard under R2, then fill in the R2_* vars in .env.

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadToR2(fileBuffer, originalName, mimeType) {
  const ext = path.extname(originalName) || '';
  const key = `listings/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
    })
  );

  // Requires the bucket's public dev URL (or a custom domain) enabled in the
  // Cloudflare R2 dashboard -> your bucket -> Settings -> Public Access.
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadToR2 };
