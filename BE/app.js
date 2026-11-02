const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
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

const envOrigins = [
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN
]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Selalu izinkan localhost dan semua subdomain vercel.app secara bawaan
const defaultAllowed = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://*.vercel.app'
];

const allowedOrigins = Array.from(new Set([...defaultAllowed, ...envOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');

  // Izinkan Vercel deployment preview / production
  if (cleanOrigin.endsWith('.vercel.app')) return true;
  if (process.env.VERCEL_URL && cleanOrigin === `https://${process.env.VERCEL_URL}`) return true;

  // Izinkan localhost atau 127.0.0.1 dengan port berapapun
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    const cleanAllowed = allowed.replace(/\/+$/, '');
    if (cleanAllowed === cleanOrigin) return true;
    if (cleanAllowed.includes('*')) {
      const pattern = new RegExp(
        '^' + cleanAllowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      );
      return pattern.test(cleanOrigin);
    }
    return false;
  });
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Ditolak untuk origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
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

// Trust proxy for secure cookies and reverse proxies (Heroku, Render, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Helmet dengan cross-origin policy agar API dapat diakses dari domain frontend berbeda (misal Vercel)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors(corsOptions));

// Enforce HTTPS in production (skip on Vercel where edge handles HTTPS)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

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

// Gambar pada form inventaris/paket dikirim sebagai Data URL JSON.
// Batasi tetap secara wajar agar upload normal tidak gagal dengan 413.
// Form inventaris dan paket dapat membawa gambar sebagai Data URL. Batas ini
// harus lebih besar dari ukuran file karena Base64 menambah sekitar 33% ukuran.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(hpp());
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

if (require.main === module || !process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 HTTP API listening on port ${PORT}`);
    console.log('⚡ WebSocket server enabled');
    // Aktifkan cron job pendeteksi peminjaman terlambat
    startOverdueChecker();
  });
}

module.exports = app;
