const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: SUPABASE_URL dan SUPABASE_KEY wajib diisi di file .env');
  process.exit(1);
}

// Validasi: key harus berupa JWT (service_role), bukan format sb_publishable_
if (!supabaseKey.startsWith('eyJ')) {
  console.error('FATAL: SUPABASE_KEY harus berupa service_role key (format JWT: eyJ...)');
  console.error('Ambil dari: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Cek apakah key adalah service_role (bukan anon) — decode payload JWT
try {
  const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
  if (payload.role === 'anon') {
    console.warn('⚠️  WARNING: SUPABASE_KEY menggunakan "anon" key.');
    console.warn('⚠️  Backend butuh "service_role" key agar bisa bypass RLS.');
    console.warn('⚠️  Ambil dari: Supabase Dashboard → Settings → API → service_role → Reveal');
  } else if (payload.role === 'service_role') {
    console.log('✅ Supabase terhubung dengan service_role key (bypass RLS aktif)');
  }
} catch (_) {
  // Abaikan jika decode gagal
}

const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Custom fetch wrapper agar singleton admin client SELALU memakai service_role key
// untuk semua operasi PostgREST dan Storage, sehingga tidak akan pernah terpengaruh
// atau terbajak oleh token user/session expired dari auth event.
const serviceRoleFetch = (input, init = {}) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || '';
  if (urlStr.includes('/rest/v1/') || urlStr.includes('/storage/v1/')) {
    const headers = new Headers(init.headers || {});
    headers.set('apikey', supabaseKey);
    headers.set('Authorization', `Bearer ${supabaseKey}`);
    init = { ...init, headers };
  }
  return fetch(input, init);
};

const supabase = createClient(cleanUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    fetch: serviceRoleFetch
  }
});

// Pengaman lapis kedua: pastikan singleton tidak pernah menyimpan session di memori
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    supabase.auth.signOut().catch(() => {});
  }
});

module.exports = supabase;
