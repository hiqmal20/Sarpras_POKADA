const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

let rawUrl = process.env.SUPABASE_URL || 'https://ffvaemxzopqtsckdhdpq.supabase.co';

// Bersihkan URL jika ada suffix /rest/v1 atau trailing slash
let cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (!supabaseKey) {
  console.warn('Peringatan: SUPABASE_KEY belum diisi di file .env.');
} else {
  supabase = createClient(cleanUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = supabase;
