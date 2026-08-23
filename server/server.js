require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const messagesRoutes = require('./routes/messages');
const { initSocket } = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend (public/) as static files — same server, one deploy
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messages', messagesRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Nzvimbo server running on http://localhost:${PORT}`);
});
