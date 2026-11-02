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
    const authClient = createAuthClient();
    const { data: fallbackAuth, error: fallbackErr } = await authClient.auth.signUp({
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
  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
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

  // 1. Verifikasi identitas pada tabel users.
  // Jangan memakai satu query `.or()` untuk email/nama: email tertentu
  // dapat mengandung karakter yang ditafsirkan sebagai sintaks PostgREST.
  // Ambil kandidat berdasarkan satu field lalu cocokkan setelah dinormalisasi.
  const normalizedIdentifier = cleanIdentifier.replace(/\s+/g, '').toLowerCase();
  const normalizedNomorInduk = cleanNomorInduk.replace(/\s+/g, '').toLowerCase();
  let userProfile = null;

  // Cari berdasarkan nomor induk secara case-insensitive terlebih dahulu.
  const lookupResults = await Promise.all([
    supabase.from('users').select('*').ilike('nomor_induk', cleanNomorInduk).limit(20),
    supabase.from('users').select('*').ilike('email', cleanIdentifier).limit(20),
    supabase.from('users').select('*').ilike('name', cleanIdentifier).limit(20),
  ]);
  const lookupError = lookupResults.find((result) => result.error)?.error;
  if (lookupError) {
    if (lookupError.message && lookupError.message.includes('exceed_egress_quota')) {
      throw new AppError('Layanan Supabase dibatasi karena melebihi kuota egress (exceed_egress_quota). Silakan periksa Supabase Dashboard Anda.', 503);
    }
    throw new AppError('Gagal memeriksa data akun. Silakan coba lagi.', 500);
  }

  const candidates = lookupResults.flatMap((result) => result.data || []);
  userProfile = candidates.find((candidate) => {
    const candidateEmail = String(candidate.email || '').replace(/\s+/g, '').toLowerCase();
    const candidateNomorInduk = String(candidate.nomor_induk || '').replace(/\s+/g, '').toLowerCase();
    const candidateName = String(candidate.name || '').replace(/\s+/g, '').toLowerCase();
    // Admin/staff lama kadang memakai nama sebagai username tanpa spasi,
    // misalnya `AdminSarpras1`, sedangkan profil menyimpan `Admin Sarpras 1`.
    return candidateNomorInduk === normalizedNomorInduk && (
      candidateEmail === normalizedIdentifier ||
      candidateName === normalizedIdentifier ||
      candidateName.replace(/[^a-z0-9]/g, '') === normalizedIdentifier.replace(/[^a-z0-9]/g, '')
    );
  }) || null;

  // Fallback untuk data lama yang memiliki spasi/format berbeda pada nomor induk.
  if (!userProfile) {
    userProfile = candidates.find((candidate) => {
      const candidateEmail = String(candidate.email || '').replace(/\s+/g, '').toLowerCase();
      const candidateNomorInduk = String(candidate.nomor_induk || '').replace(/\s+/g, '').toLowerCase();
      return candidateNomorInduk === normalizedNomorInduk && candidateEmail === normalizedIdentifier;
    }) || null;
  }

  // Fallback tambahan: nomor induk dengan perbedaan leading zero (misal 00123 vs 123)
  if (!userProfile) {
    const strippedNomorInduk = normalizedNomorInduk.replace(/^0+/, '');
    userProfile = candidates.find((candidate) => {
      const candidateEmail = String(candidate.email || '').replace(/\s+/g, '').toLowerCase();
      const candidateNomorInduk = String(candidate.nomor_induk || '').replace(/\s+/g, '').toLowerCase().replace(/^0+/, '');
      const candidateName = String(candidate.name || '').replace(/\s+/g, '').toLowerCase();
      return candidateNomorInduk === strippedNomorInduk && (
        candidateEmail === normalizedIdentifier ||
        candidateName === normalizedIdentifier ||
        candidateName.replace(/[^a-z0-9]/g, '') === normalizedIdentifier.replace(/[^a-z0-9]/g, '')
      );
    }) || null;
  }

  if (!userProfile) {
    throw new AppError('Kombinasi Email/Nama, Nomor Induk, atau password salah', 401);
  }

  // Pastikan status akun aktif (jika null, default ke Aktif)
  const userStatus = userProfile.status || 'Aktif';
  if (userStatus === 'Nonaktif') {
    throw new AppError('Akun Anda telah dinonaktifkan. Hubungi admin SARPRAS.', 403);
  }

  // 2. Autentikasi dengan email yang tersimpan di Supabase Auth.
  // Email pada public.users bisa berbeda jika pernah diubah dari profil.
  // Gunakan email Auth berdasarkan user id agar login tidak gagal hanya karena
  // data profil dan data authentication belum sinkron.
  const authClient = createAuthClient();
  let authEmail = String(userProfile.email || '').trim().toLowerCase();
  const { data: authUserData } = await supabase.auth.admin.getUserById(userProfile.id);
  if (authUserData?.user?.email) {
    authEmail = authUserData.user.email.trim().toLowerCase();
  }

  // Coba email Auth terlebih dahulu. Fallback ke email public.users diperlukan
  // untuk akun lama yang pernah dibuat sebelum sinkronisasi profile diperbaiki.
  let { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: authEmail,
    password
  });

  const profileEmail = String(userProfile.email || '').trim().toLowerCase();
  if ((authError || !authData?.user) && profileEmail && profileEmail !== authEmail) {
    const retry = await authClient.auth.signInWithPassword({
      email: profileEmail,
      password
    });
    authData = retry.data;
    authError = retry.error;
  }

  // Fallback jika identifier yang diinput user adalah email berbeda yang valid di Supabase Auth
  if ((authError || !authData?.user) && cleanIdentifier.includes('@') && cleanIdentifier.toLowerCase() !== authEmail && cleanIdentifier.toLowerCase() !== profileEmail) {
    const retry = await authClient.auth.signInWithPassword({
      email: cleanIdentifier.toLowerCase(),
      password
    });
    if (retry.data?.user) {
      authData = retry.data;
      authError = null;
    }
  }

  if (authError || !authData?.user) {
    if (authError?.status === 429 || (authError?.message || '').toLowerCase().includes('rate limit')) {
      throw new AppError('Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.', 429);
    }
    console.warn(`[AUTH] Login gagal untuk ${authEmail}: ${authError?.message || 'Password tidak cocok'}`);
    throw new AppError('Password yang Anda masukkan salah. Silakan periksa kembali.', 401);
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

