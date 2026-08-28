const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.registerUser = async ({ email, password, name, role = 'Mahasiswa', no_hp = '', foto = null }) => {
  // 1. Daftarkan akun ke Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, no_hp }
    }
  });

  if (authError) {
    throw new AppError(authError.message, 400);
  }

  if (!authData.user) {
    throw new AppError('Gagal membuat akun, silakan coba lagi', 400);
  }

  const userId = authData.user.id;
  const now = new Date().toISOString();

  // 2. Simpan profil ke public.users
  const userPayload = {
    id: userId,
    name,
    email,
    role,
    no_hp,
    foto,
    status: 'Aktif',
    created_at: now
  };

  const { data: profileData } = await supabase
    .from('users')
    .upsert(userPayload)
    .select()
    .single();

  // 3. Notifikasi selamat datang
  await supabase.from('notifications').insert([{
    user_id: userId,
    title: 'Selamat Datang di SARPRAS POKADA',
    message: `Halo ${name}, akun Anda sebagai ${role} berhasil dibuat. Silakan gunakan sistem untuk kebutuhan sarana & prasarana kampus.`,
    type: 'sistem',
    is_read: false,
    created_at: now
  }]);

  return {
    user: profileData || userPayload,
    session: authData.session
  };
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

exports.loginUser = async ({ email, password }) => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.user) {
    throw new AppError('Email atau password yang Anda masukkan salah', 401);
  }

  const authUser = authData.user;

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userProfile && userProfile.status === 'Nonaktif') {
    throw new AppError('Akun Anda telah dinonaktifkan. Hubungi admin SARPRAS.', 403);
  }

  const finalUser = userProfile || {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || '',
    role: authUser.user_metadata?.role || 'Mahasiswa',
    status: 'Aktif'
  };

  return {
    user: finalUser,
    token: authData.session?.access_token,
    refreshToken: authData.session?.refresh_token,
    expiresIn: authData.session?.expires_in
  };
};
