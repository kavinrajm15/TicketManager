require('dotenv').config();

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');
const cors       = require('cors');

const connectDB      = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const { initSocket } = require('./socket/socket');
const webpush        = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Route imports ───
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const projectRoutes      = require('./routes/project.routes');
const ticketRoutes       = require('./routes/ticket.routes');
const commentRoutes      = require('./routes/comment.routes');
const chatRoutes         = require('./routes/chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const teamRoutes         = require('./routes/team.routes');

// ── App & HTTP server ──────
const app    = express();
const server = http.createServer(app);

// ── Socket.io ────
const io = new Server(server, {
  cors: {
    origin: '*',         
    methods: ['GET', 'POST'],
  },
});
initSocket(io);

// ── Global middleware ──────
app.use(cors());
app.use(express.json());

// ── Static file serving for uploaded attachments ──────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ─────
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Ticket Manager API is running!' });
});

// ── API routes ─────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tickets',       ticketRoutes);
app.use('/api',               commentRoutes);   
app.use('/api/chat',          chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teams',         teamRoutes);

// ── 404 handler ──────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ────
app.use(errorMiddleware);

// ── Connect DB then start server ────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io listening on port ${PORT}`);
  });
});