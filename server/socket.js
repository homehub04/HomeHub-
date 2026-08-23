// socket.js — Socket.IO powered real-time chat between landlords and tenants.
// Auth: client connects with `auth: { token: <JWT> }`; we verify once at connect time.

const jwt = require('jsonwebtoken');
const db = require('./db');

function initSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing auth token'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins a personal room so we can push messages to them from anywhere
    socket.join(`user:${socket.user.id}`);

    socket.on('chat:send', ({ listingId, receiverId, content }) => {
      if (!receiverId || !content?.trim()) return;

      const info = db
        .prepare(
          `INSERT INTO messages (listing_id, sender_id, receiver_id, content) VALUES (?,?,?,?)`
        )
        .run(listingId || null, socket.user.id, receiverId, content.trim());

      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);

      io.to(`user:${receiverId}`).emit('chat:receive', message);
      io.to(`user:${socket.user.id}`).emit('chat:receive', message); // echo back to sender's other tabs
    });

    socket.on('chat:typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('chat:typing', { fromUserId: socket.user.id });
    });
  });
}

module.exports = { initSocket };
