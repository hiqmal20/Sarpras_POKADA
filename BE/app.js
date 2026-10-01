const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config();

// Supabase is used by application services; health endpoint remains a lightweight liveness check.
const supabase = require('./config/supabaseClient');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { startOverdueChecker } = require('./services/cronService');
const setupSocketHandlers = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.includes(origin);
};

// Setup Socket.IO dengan CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// Setup Socket.IO handlers
setupSocketHandlers(io, app);

// Make io accessible in other files
app.set('io', io);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Cookie-authenticated state-changing requests must originate from an allowed UI.
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ status: 'fail', message: 'Origin tidak diizinkan' });
    }
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend SARPRAS POKADA API is running',
    features: {
      rest_api: true,
      websocket: true,
      real_time_chat: true
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'Server aktif' });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Endpoint tidak ditemukan'
  });
});

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 HTTP API: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  // Aktifkan cron job pendeteksi peminjaman terlambat
  startOverdueChecker();
});
