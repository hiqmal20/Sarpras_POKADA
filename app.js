const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const supabase = require('./config/supabaseClient');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { startOverdueChecker } = require('./services/cronService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors());

// Body Parsers & Limiters
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

// Base Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend SARPRAS POKADA API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      items: '/api/items',
      packages: '/api/packages',
      borrowings: '/api/borrowings',
      returns: '/api/returns',
      damageReports: '/api/damage-reports',
      chats: '/api/chats',
      notifications: '/api/notifications'
    }
  });
});

// Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        status: 'error',
        message: 'SUPABASE_KEY belum dikonfigurasi di file .env'
      });
    }

    const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Koneksi ke Supabase gagal: ' + error.message
      });
    }

    res.json({
      status: 'success',
      message: 'Server backend SARPRAS dan database Supabase terhubung',
      supabaseUrl: process.env.SUPABASE_URL
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Mount Main API Routes
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Endpoint ${req.originalUrl} tidak ditemukan`
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Aktifkan cron job pendeteksi peminjaman terlambat
  startOverdueChecker();
});
