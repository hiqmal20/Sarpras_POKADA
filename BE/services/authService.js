const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

// Helper untuk auth tanpa mengubah state session singleton admin client
const createAuthClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseKey = process.env.SUPABASE_KEY;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

exports.registerUser = async ({ nomor_induk, email, password, name, role = 'Mahasiswa', no_hp = '', foto = null }) => {
  const cleanNomorInduk = (nomor_induk || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const safeRole = ['Admin', 'Petugas'].includes(role) ? 'Mahasiswa' : (role || 'Mahasiswa');

  // 1. Cek apakah nomor_induk atau email sudah terdaftar di public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, nomor_induk')
    .or(`email.ilike.${cleanEmail},nomor_induk.ilike.${cleanNomorInduk}`)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.nomor_induk && existingUser.nomor_induk.toLowerCase() === cleanNomorInduk.toLowerCase()) {
      throw new AppError('Nomor Induk (NIM/ID) sudah terdaftar dalam sistem', 400);
    }
    if (existingUser.email && existingUser.email.toLowerCase() === cleanEmail) {
      throw new AppError('Email sudah terdaftar dalam sistem', 400);
    }
  }

  // 2. Daftarkan akun ke Supabase Auth via Admin API (bypass RLS & auto-confirm email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { name: cleanName, role: safeRole, nomor_induk: cleanNomorInduk, no_hp }
  });

  let userId = null;

  if (authError) {
    // Fallback jika bukan admin client
    const { data: fallbackAuth, error: fallbackErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: cleanName, role: safeRole, nomor_induk: cleanNomorInduk, no_hp }
      }
    });

    if (fallbackErr || !fallbackAuth?.user) {
      throw new AppError(fallbackErr?.message || authError.message, 400);
    }
    userId = fallbackAuth.user.id;
  } else {
    userId = authData.user.id;
  }

  const now = new Date().toISOString();

  // 3. Simpan / Sinkronisasi profil ke public.users
  const userPayload = {
    id: userId,
    nomor_induk: cleanNomorInduk,
    name: cleanName,
    email: cleanEmail,
    role: safeRole,
    no_hp,
    foto,
    status: 'Aktif',
    created_at: now
  };

  const { data: profileData, error: profileErr } = await supabase
    .from('users')
    .upsert(userPayload)
    .select()
    .single();

  if (profileErr) {
    throw new AppError(`Gagal menyimpan profil pengguna: ${profileErr.message}`, 500);
  }

  // Login otomatis agar mendapatkan session token
  const authClient = createAuthClient();
  const { data: loginData } = await authClient.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  // 4. Notifikasi selamat datang
  await supabase.from('notifications').insert([{
    user_id: userId,
    title: 'Selamat Datang di SARPRAS POKADA',
    message: `Halo ${cleanName} (${cleanNomorInduk}), akun Anda sebagai ${role} berhasil dibuat. Silakan gunakan sistem untuk kebutuhan sarana & prasarana kampus.`,
    type: 'sistem',
    is_read: false,
    created_at: now
  }]);

  return {
    user: profileData || userPayload,
    token: loginData?.session?.access_token,
    refreshToken: loginData?.session?.refresh_token,
    session: loginData?.session
  };
};

exports.changePassword = async (user, currentPassword, newPassword) => {
  const authClient = createAuthClient();
  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (verifyError) {
    throw new AppError('Password saat ini tidak sesuai', 400);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) {
    throw new AppError(`Gagal mengubah password: ${error.message}`, 400);
  }

  return { changed: true };
};

exports.refreshToken = async (refreshToken) => {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    throw new AppError('Refresh token tidak valid atau sudah kadaluarsa. Silakan login kembali.', 401);
  }

  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in
  };
};

exports.loginUser = async ({ email, nomor_induk, password }) => {
  const cleanIdentifier = (email || '').trim();
  const cleanNomorInduk = (nomor_induk || '').trim();

  if (!cleanIdentifier || !cleanNomorInduk || !password) {
    throw new AppError('Email/Nama Pengguna, Nomor Induk, dan Password wajib diisi', 400);
  }

  // 1. Verifikasi kecocokan Email atau Name dengan Nomor Induk di tabel users
  const isEmail = cleanIdentifier.includes('@');
  
  let userProfile = null;
  if (isEmail) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanIdentifier)
      .ilike('nomor_induk', cleanNomorInduk)
      .maybeSingle();
    userProfile = data;
  } else {
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanIdentifier)
      .ilike('nomor_induk', cleanNomorInduk)
      .maybeSingle();
    userProfile = data;
  }

  if (!userProfile) {
    throw new AppError('Kombinasi Email/Nama, Nomor Induk, atau password salah', 401);
  }

  // Pastikan status akun aktif (jika null, default ke Aktif)
  const userStatus = userProfile.status || 'Aktif';
  if (userStatus === 'Nonaktif') {
    throw new AppError('Akun Anda telah dinonaktifkan. Hubungi admin SARPRAS.', 403);
  }

  // 2. Autentikasi dengan Supabase Auth via email terdaftar & password
  const authClient = createAuthClient();
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: userProfile.email,
    password
  });

  if (authError || !authData.user) {
    throw new AppError('Kombinasi Email/Nama, Nomor Induk, atau password salah', 401);
  }

  return {
    user: {
      ...userProfile,
      status: userStatus
    },
    token: authData.session?.access_token,
    refreshToken: authData.session?.refresh_token,
    expiresIn: authData.session?.expires_in
  };
};

