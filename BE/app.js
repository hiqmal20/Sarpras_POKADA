const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

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
  transports: ['websocket', 'polling']
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

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

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Koneksi ke database gagal'
      });
    }

    res.json({
      status: 'success',
      message: 'Server dan database terhubung',
      websocket: {
        enabled: true,
        connections: io.engine.clientsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server'
    });
  }
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Endpoint tidak ditemukan'
  });
});

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 HTTP API: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  // Aktifkan cron job pendeteksi peminjaman terlambat
  startOverdueChecker();
});
