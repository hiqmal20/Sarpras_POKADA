# 🚀 PANDUAN LENGKAP HOSTING SARPRAS POKADA
**Backend:** [Railway](https://railway.com/) (Dukungan WebSocket 24/7 & Node-Cron)  
**Frontend:** [Vercel](https://vercel.com/) (Next.js 16 Edge / Serverless)

---

## 📋 DAFTAR ISI
1. [Langkah 1: Hosting Backend di Railway](#langkah-1-hosting-backend-di-railway)
2. [Langkah 2: Hosting Frontend di Vercel](#langkah-2-hosting-frontend-di-vercel)
3. [Langkah 3: Sinkronisasi CORS & Environment Variables](#langkah-3-sinkronisasi-cors--environment-variables)
4. [Langkah 4: Verifikasi Uji Coba (Demo Pre-flight Checklist)](#langkah-4-verifikasi-uji-coba)

---

## 🛠️ LANGKAH 1: HOSTING BACKEND DI RAILWAY

Railway dipilih karena mendukung WebSocket (Socket.IO) yang harus selalu online dan proses background (Node-Cron pengingat pengembalian).

### 1.1 Buat Project Baru di Railway
1. Masuk ke [Railway Dashboard](https://railway.com/dashboard).
2. Klik tombol **New Project** → pilih **Deploy from GitHub repo**.
3. Pilih repository: `Sarpras_POKADA`.

### 1.2 Konfigurasi Root Directory & Build
1. Masuk ke kartu layanan (Service) yang baru dibuat di Railway.
2. Buka tab **Settings**:
   - Cari bagian **Root Directory**, klik **Edit**, lalu isi dengan:
     ```text
     BE
     ```
   - (Railway sudah mendeteksi `railway.json` dan `Procfile` yang telah disediakan secara otomatis).
   - Cari bagian **Networking** → Klik **Generate Domain** untuk mendapatkan URL publik backend, misalnya:
     ```text
     https://sarpras-pokada-production.up.railway.app
     ```
     *(Simpan domain ini untuk konfigurasi frontend).*

### 1.3 Isi Environment Variables Backend di Railway
Buka tab **Variables** pada service backend di Railway, lalu tambahkan variabel berikut:

| Nama Variabel | Nilai / Contoh | Keterangan |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Wajib untuk optimasi & keamanan cookie lintas-domain |
| `PORT` | `5000` | Railway otomatis me-route port |
| `SUPABASE_URL` | `https://bhslahptvqhkyiwmcnkx.supabase.co` | URL Project Supabase Anda |
| `SUPABASE_KEY` | *(Service Role Secret Key Anda)* | Dari Supabase: Settings → API → `service_role` (Reveal) |
| `ALLOWED_ORIGINS` | `https://*.vercel.app,http://localhost:3000` | Tambahkan URL domain Vercel Anda di sini |

*Catatan: Setelah URL Vercel didapat di Langkah 2, tambahkan domain spesifik Vercel Anda ke `ALLOWED_ORIGINS` (contoh: `https://sarpras-pokada.vercel.app,https://*.vercel.app,http://localhost:3000`).*

### 1.4 Verifikasi Backend
Buka browser dan akses domain Railway Anda:
- `https://your-backend.up.railway.app/`  
  Harus menampilkan status JSON: `{"status": "success", "message": "Backend SARPRAS POKADA API is running", ...}`
- `https://your-backend.up.railway.app/api/health`  
  Harus menampilkan: `{"status": "success", "message": "Server aktif"}`

---

## 🌐 LANGKAH 2: HOSTING FRONTEND DI VERCEL

### 2.1 Hubungkan Repo ke Vercel
1. Masuk ke [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New...** → **Project**.
3. Pilih repository: `Sarpras_POKADA`.

### 2.2 Konfigurasi Root Directory Frontend
1. Pada menu konfigurasi proyek:
   - Cari bagian **Root Directory**, klik **Edit**, lalu pilih:
     ```text
     FE
     ```
   - Framework Preset otomatis mendeteksi: **Next.js**.
   - Build Command: `npm run build` *(default)*.
   - Output Directory: `.next` *(default)*.

### 2.3 Isi Environment Variables Frontend di Vercel
Buka bagian **Environment Variables** di Vercel, lalu tambahkan:

| Key | Value / Contoh | Keterangan |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api` | Akhiri dengan `/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-backend.up.railway.app` | Domain Railway TANPA `/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bhslahptvqhkyiwmcnkx.supabase.co` | URL Supabase Project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Anon Public Key Anda)* | HANYA anon key, JANGAN service_role! |

### 2.4 Deploy
Klik **Deploy**. Tunggu proses build Next.js hingga selesai (Status: Ready).
Vercel akan memberikan domain publik, misalnya:
`https://sarpras-pokada.vercel.app`.

---

## 🔄 LANGKAH 3: SINKRONISASI CORS & ENVIRONMENT VARIABLES

Agar Frontend (Vercel) dan Backend (Railway) dapat saling berkomunikasi:
1. Kembali ke Railway Dashboard → Service Backend → Tab **Variables**.
2. Perbarui nilai `ALLOWED_ORIGINS` agar mencakup domain Vercel Anda:
   ```text
   https://sarpras-pokada.vercel.app,https://*.vercel.app,http://localhost:3000
   ```
3. Railway akan melakukan auto-redeploy secara instan.

---

## ✅ LANGKAH 4: VERIFIKASI UJI COBA (DEMO PRE-FLIGHT CHECKLIST)

Sebelum presentasi/demo, pastikan menguji alur sistem berikut:

1. **Autentikasi (Login & Logout)**:
   - Login sebagai Admin (`admin.sarpras@gmail.com` / `Admin123!`).
   - Pastikan masuk ke `/admin/dashboard_admin` tanpa looping redirect.
   - Buka tab/browser terpisah dan login sebagai Mahasiswa (`fathir@gmail.com` / `Hitam123`).
   - Pastikan masuk ke `/user/dashboard`.

2. **Real-time Chat & WebSocket**:
   - Buka halaman Pesan di User (`/user/messages`) dan Admin (`/admin/messages`) secara berdampingan.
   - Kirim pesan dari User ke Admin → pastikan pesan langsung muncul tanpa refresh browser.
   - Coba fitur Reply (Kutip Pesan) ala WhatsApp → pastikan bubble reply ter-render sempurna.
   - Perhatikan indikator online/offline di profil chat.

3. **Alur Peminjaman & Stok**:
   - User memilih barang di Katalog Barang (`/user/item_catalog`), ajukan peminjaman.
   - Stok barang otomatis terpotong.
   - Admin membuka Manajemen Peminjaman (`/admin/manajemen_peminjaman`) dan menyetujui peminjaman.
   - Notifikasi real-time muncul di lonceng notifikasi user.

4. **Alur Pengembalian Barang**:
   - User mengajukan pengembalian di `/user/pengembalian`.
   - Admin memeriksa dan menyetujui pengembalian di `/admin/pengembalian`.
   - Stok barang otomatis kembali normal.

5. **Responsif & Multi-bahasa**:
   - Ubah preferensi bahasa (ID / EN) melalui Navbar.
   - Pastikan transisi dark/light mode berjalan mulus.
