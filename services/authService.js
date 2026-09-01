const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.registerUser = async ({ nomor_induk, email, password, name, role = 'Mahasiswa', no_hp = '', foto = null }) => {
  const cleanNomorInduk = nomor_induk ? nomor_induk.trim() : '';
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  // 1. Cek apakah nomor_induk atau email sudah terdaftar di public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, nomor_induk')
    .or(`email.eq.${cleanEmail},nomor_induk.eq.${cleanNomorInduk}`)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.nomor_induk === cleanNomorInduk) {
      throw new AppError('Nomor Induk (NIM/ID) sudah terdaftar dalam sistem', 400);
    }
    if (existingUser.email === cleanEmail) {
      throw new AppError('Email sudah terdaftar dalam sistem', 400);
    }
  }

  // 2. Daftarkan akun ke Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { name, role, nomor_induk: cleanNomorInduk, no_hp }
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

  // 3. Simpan profil ke public.users
  const userPayload = {
    id: userId,
    nomor_induk: cleanNomorInduk,
    name,
    email: cleanEmail,
    role,
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

  // 4. Notifikasi selamat datang
  await supabase.from('notifications').insert([{
    user_id: userId,
    title: 'Selamat Datang di SARPRAS POKADA',
    message: `Halo ${name} (${cleanNomorInduk}), akun Anda sebagai ${role} berhasil dibuat. Silakan gunakan sistem untuk kebutuhan sarana & prasarana kampus.`,
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

exports.loginUser = async ({ identifier, email, password }) => {
  const loginKey = (identifier || email || '').trim();

  if (!loginKey) {
    throw new AppError('Email atau Nomor Induk wajib diisi', 400);
  }

  let targetEmail = loginKey;

  // 1. Jika bukan format email, cari email berdasarkan nomor_induk di tabel users
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginKey);
  if (!isEmail) {
    const { data: userByNomorInduk, error: findError } = await supabase
      .from('users')
      .select('email, status')
      .eq('nomor_induk', loginKey)
      .maybeSingle();

    if (findError || !userByNomorInduk) {
      throw new AppError('Nomor Induk atau password yang Anda masukkan salah', 401);
    }

    if (userByNomorInduk.status === 'Nonaktif') {
      throw new AppError('Akun Anda telah dinonaktifkan. Hubungi admin SARPRAS.', 403);
    }

    targetEmail = userByNomorInduk.email;
  }

  // 2. Autentikasi dengan Supabase Auth via email
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password
  });

  if (authError || !authData.user) {
    throw new AppError('Email/Nomor Induk atau password yang Anda masukkan salah', 401);
  }

  const authUser = authData.user;

  // 3. Ambil data profil lengkap dari public.users
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
    nomor_induk: authUser.user_metadata?.nomor_induk || '',
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

