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

const supabase = createClient(cleanUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
