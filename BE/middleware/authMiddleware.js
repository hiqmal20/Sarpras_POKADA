const supabase = require('../config/supabaseClient');

// Middleware untuk memverifikasi JWT Token dari Supabase Auth
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Akses ditolak: Format token tidak valid.'
      });
    }

    // 1. Verifikasi token via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Token tidak valid atau telah kadaluarsa. Silakan login kembali.'
      });
    }

    const authUser = authData.user;

    // 2. Cek session timeout (24 jam)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const issuedAt = payload.iat * 1000; // konversi ke ms
      const sessionLimit = 24 * 60 * 60 * 1000;
      if (Date.now() - issuedAt > sessionLimit) {
        return res.status(401).json({
          status: 'fail',
          message: 'Sesi Anda telah berakhir. Silakan login kembali.'
        });
      }
    } catch (_) {
      // Jika decode gagal, lanjutkan
    }

    // 3. Ambil data profil & role dari tabel public.users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      // Jika profil belum ada di public.users, gunakan fallback data auth
      req.user = {
        id: authUser.id,
        email: authUser.email,
        nomor_induk: authUser.user_metadata?.nomor_induk || '',
        role: authUser.user_metadata?.role || 'Mahasiswa',
        status: 'Aktif'
      };
    } else {
      const userStatus = userProfile.status || 'Aktif';
      if (userStatus === 'Nonaktif') {
        return res.status(403).json({
          status: 'fail',
          message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi Administrator SARPRAS.'
        });
      }
      req.user = {
        ...userProfile,
        status: userStatus
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Middleware untuk membatasi akses berdasarkan Role (RBAC)
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Pengguna belum terautentikasi.'
      });
    }

    const userRole = req.user.role || 'Mahasiswa';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: 'fail',
        message: `Akses ditolak: Peran '${userRole}' tidak memiliki izin untuk tindakan ini. Diperlukan peran: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
};

const requireSelfOrRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Pengguna belum terautentikasi.'
      });
    }

    const targetUserId = req.params.id || req.body.user_id || req.query.user_id;
    const isSelf = targetUserId && req.user.id === targetUserId;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isSelf && !hasRole) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk mengakses data ini.'
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requireSelfOrRole
};
