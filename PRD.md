# Product Requirement Document (PRD) Komprehensif
# SARPRAS POKADA (Sistem Manajemen Sarana & Prasarana Kampus)

- **Versi Dokumen**: 3.0.0
- **Status**: Production Hardened, Synchronized & Fully Evaluated
- **Klasifikasi**: Dokumen Teknis & Produk Internal Kampus
- **Terakhir Diperbarui**: November 2026

---

## 1. Executive Summary & Visi Produk

### 1.1 Latar Belakang
Pengelolaan sarana dan prasarana (sarpras) di lingkungan kampus POKADA menuntut tata kelola inventaris yang transparan, akuntabel, bebas celah keamanan, dan sinkron secara *real-time*. Praktik peminjaman manual rentan terhadap hilangnya arsip bukti serah terima, selisih stok fisik versus pencatatan sistem, keterlambatan pengembalian tanpa sanksi yang terukur, serta sengketa kondisi fisik aset sebelum dan sesudah dipinjam.

### 1.2 Visi & Objektif Produk
Menyediakan sistem operasional terpadu (*single source of truth*) berbasis web modern yang mencakup seluruh siklus sirkulasi aset kampus:
1. Penelusuran katalog barang individual maupun paket sarpras siap pakai.
2. Pengajuan peminjaman daring dengan pembatasan ketat (*1 active borrowing per user*) untuk mencegah penumpukan aset pinjaman tak terkontrol.
3. Validasi bertingkat oleh petugas/admin dengan pencatatan alasan persetujuan/penolakan.
4. Alur pengembalian dua tahap (*User Return Request* secara daring dilanjutkan dengan inspeksi fisik di loket sarpras).
5. Ticketing investigasi kerusakan/kehilangan, penetapan denda ganti rugi, hingga pengawasan status pelunasan.
6. Komunikasi interaktif langsung via *WebSocket Real-time Live Chat* berfitur *Presence* dan *Message Reply*.
7. Rekapitulasi eksekutif instan dan pelacakan audit trail keamanan (*immutable audit logs*).

### 1.3 Key Performance Indicators (KPI)
- **Zero Lost Items & 100% Traceability**: Mengeliminasi aset hilang melalui identitas peminjam terverifikasi, riwayat serah terima fisik, dan pencatatan riwayat audit keamanan di tabel `audit_logs`.
- **Approval Turnaround Time < 10 Menit**: Memangkas birokrasi persetujuan peminjaman dari manual 1x24 jam menjadi hitungan menit didukung notifikasi *real-time*.
- **Zero Stock Race Condition**: Menghilangkan selisih stok fisik vs sistem dengan mekanisme reservasi stok otomatis berbasis *PostgreSQL Stored Procedure (RPC)* dengan *Row-Level Lock* dan *Optimistic Concurrency Control (OCC)*.
- **Strict Active Loan Enforcement**: Mencegah peminjam meminjam aset baru jika masih memiliki tanggungan peminjaman berstatus aktif (*Pending / Disetujui / Dipinjam / Terlambat*).
- **Instant Audit & Reporting Export**: Pembuatan rekap transaksi peminjaman, pengembalian, laporan kerusakan, dan master aset dalam format XLSX/CSV hanya dalam 1 kali klik.

---

## 2. Ruang Lingkup & Batasan Operasional

### 2.1 Ruang Lingkup (In-Scope)
1. **Peminjaman Internal Kampus (Strict On-Campus Scope)**:
   - Dikhususkan untuk kegiatan akademik, praktikum, ormawa, dan operasional civitas kampus di ruang kelas, lab, aula, auditorium, dan area terbuka kampus.
   - Formulir pengajuan wajib mencantumkan peruntukan peminjaman (*purpose*) serta jadwal penggunaan (*borrow_date* dan *planned_return_date*).
2. **Civitas Akademika Terdaftar**:
   - 5 Peran Pengguna: **Mahasiswa**, **Dosen**, **Staff**, **Petugas Sarpras**, dan **Admin**.
3. **Mekanisme Bundling Paket Sarpras**:
   - Pengelompokan beberapa barang dalam 1 paket siap pakai (contoh: *Paket Sidang Skripsi*, *Paket Seminar Aula*).
   - Pengelolaan stok paket independen (`stock_total`, `stock_borrowed`, `stock_available`) tanpa memotong stok unit komponen ganda saat dipinjam.
4. **Siklus Hidup Aset Terintegrasi**:
   - Pengadaan/Inventarisasi -> Katalogisasi -> Reservasi Stok Peminjaman -> Pengambilan Fisik -> Pengajuan Pengembalian (Online) -> Verifikasi & Penerimaan Fisik di Loket -> Ticketing Kerusakan/Denda (jika ada) -> Pemulihan Stok Otomatis.
5. **Ticketing Kerusakan & Penagihan Denda**:
   - Pengajuan bukti foto fisik kerusakan barang/paket, penentuan status perbaikan (*Menunggu Review -> Sedang Diperbaiki -> Selesai*), penetapan nominal denda, dan verifikasi pelunasan (*Tidak Ada Denda -> Belum Dibayar -> Sudah Dibayar*).
6. **Live Communication & Alerts**:
   - Saluran chat langsung Socket.IO antara peminjam dan admin/petugas dengan indikator kehadiran daring (*Online / Last Seen*), *typing indicator*, audio alert, dan fitur balas pesan (*WhatsApp-style quote reply*).
   - Pusat notifikasi in-app berarah langsung (*action redirect URL*) untuk membuka modal/detail dokumen transaksi secara instan.
7. **Dukungan Dua Bahasa (Internationalization / i18n)**:
   - Antarmuka bilingual penuh (Bahasa Indonesia & English) yang dapat diganti kapan saja via *Language Switcher* di portal pengguna maupun admin.
8. **Keamanan & Audit Trail**:
   - Enkapsulasi seluruh mutasi data melalui Express 5 API (tanpa *direct database access* di *client bundle*).
   - Pencatatan seluruh aksi penting (login, logout, CRUD barang, perubahan status pinjam, verifikasi kembali, adjustment stok) ke tabel `audit_logs`.

### 2.2 Batasan (Out-of-Scope)
1. Peminjaman sarpras komersial untuk entitas eksternal di luar civitas akademika tanpa izin pimpinan kampus.
2. Integrasi *payment gateway* perbankan otomatis (seluruh pembayaran denda diselesaikan secara manual di loket tata usaha/petugas sarpras internal).
3. Integrasi palang gerbang fisik RFID/turnstile otomatis.

---

## 3. Matriks Peran & Hak Akses Pengguna (RBAC)

| Modul / Fitur | Pengunjung Publik | Mahasiswa | Dosen | Staff | Petugas Sarpras | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Katalog Barang & Paket** | Baca & Cari (Landing Page) | Baca & Cari (Lengkap) | Baca & Cari (Lengkap) | Baca & Cari (Lengkap) | Kelola Penuh (CRUD + Stok) | Kelola Penuh (CRUD + Hapus) |
| **Kategori Barang** | Baca (Landing Page) | Baca | Baca | Baca | Kelola (Buat & Edit) | Kelola Penuh (CRUD) |
| **Pengajuan Peminjaman** | - | Buat (Maks 1 Aktif) & Pantau Sendiri | Buat (Maks 1 Aktif) & Pantau Sendiri | Buat (Maks 1 Aktif) & Pantau Sendiri | Buat & Pantau Semua | Buat & Pantau Semua |
| **Approval Peminjaman** | - | - | - | - | Validasi, Setujui / Tolak | Validasi, Setujui, Tolak & Override |
| **Pengajuan Pengembalian (Online)** | - | Ajukan via `/user/pengembalian` | Ajukan via `/user/pengembalian` | Ajukan via `/user/pengembalian` | Pantau & Verifikasi | Pantau & Verifikasi |
| **Penerimaan Fisik Pengembalian** | - | - | - | - | Verifikasi Fisik, Stok, & Denda | Verifikasi Fisik, Stok, & Denda |
| **Laporan Kerusakan & Denda** | - | Buat & Pantau Status Milik Sendiri | Buat & Pantau Status Milik Sendiri | Buat & Pantau Status Milik Sendiri | Verifikasi, Tentukan Denda, Update | Kelola Penuh Laporan & Pelunasan |
| **Live Chat Konsultasi** | - | Chat ke Admin / Petugas | Chat ke Admin / Petugas | Chat ke Admin / Petugas | Respon Chat User (Real-time) | Respon Seluruh Chat (Real-time) |
| **Manajemen Master User** | - | Edit Profil & Foto Sendiri | Edit Profil & Foto Sendiri | Edit Profil & Foto Sendiri | Lihat Daftar Pengguna | CRUD User, Import CSV, Hak Akses |
| **Bulk Import (CSV)** | - | - | - | - | Import Paket | Import User & Paket |
| **Audit Logs Keamanan** | - | - | - | - | - | Baca & Filter Riwayat Aktivitas |
| **Rekap & Ekspor Laporan** | - | - | - | - | Ekspor Sirkulasi (XLSX/CSV) | Ekspor Lengkap Master & Audit |

---

## 4. Arsitektur Teknis Sistem

### 4.1 Diagram Arsitektur
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16 App Router & React 19)                     │
│  - Portal Publik : Landing Page, Katalog Publik, Info Kampus                           │
│  - Portal User   : Dashboard, Katalog/Detail Item, Keranjang Paket, Form Pinjam,      │
│                    Pengajuan Kembali, Riwayat, Lapor Rusak, Chat, Profil, i18n (ID/EN) │
│  - Portal Admin  : Dashboard Metrik, Manajemen Pinjam, Verifikasi Pengembalian,       │
│                    Katalog Barang/Paket/Kategori, Manajemen User, Chat, Rekap Ekspor   │
│  - Client Layer  : lib/api.tsx (BE-Only API Client) + lib/socket.ts (Socket.IO Client) │
└───────────────────────────────┬──────────────────────────▲────────────────────────────┘
                                │ REST API (HTTP/JSON)     │ WebSocket (Socket.IO)
                                ▼                          │
┌──────────────────────────────────────────────────────────┴─────────────────────────────┐
│                            BACKEND (Node.js & Express.js 5)                            │
│  - Middleware  : Auth (Supabase JWT), RBAC, Helmet (CORP cross-origin), CORS           │
│                  Whitelist, HPP, Compression, Rate Limiter, UUID Validator, Multer    │
│  - Validation  : Joi Schemas (Auth, Borrowing, Return, Damage, Item, Package, User)    │
│  - Services    : Business Logic, Stock Reservation, Overdue Checker (Cron),            │
│                  Audit Logger, Notification Pusher                                     │
│  - Realtime    : Socket.IO Server (Rooms, Heartbeat, User Presence, Message Reply)     │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │ Supabase Service Role Key (Bypass RLS)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SUPABASE (Cloud Infrastructure)                          │
│  - Auth Engine       : Manajemen Akun & Sesi JWT (auth.users)                          │
│  - PostgreSQL DB     : 11 Tabel Relasional Utama, Foreign Keys, Indeks Teroptimasi     │
│  - Stored Procedures : Atomic Stock Functions (decrement/increment item & package)     │
│  - Row Level Security: RLS Aktif pada Seluruh Tabel (Lapisan Pertahanan Tambahan)      │
│  - Storage Buckets   : Penyimpanan Berkas Foto Profil dan Bukti Kerusakan              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Komponen Arsitektur Utama
1. **Frontend (Next.js 16 App Router, TypeScript, Tailwind CSS)**:
   - Direktori `FE/app/user/`: Antarmuka operasional pengguna civitas kampus.
   - Direktori `FE/app/admin/`: Antarmuka operasional staf sarpras dan administrator.
   - `FE/lib/api.tsx`: Abstraksi API client terpusat murni ke Express backend (*100% BE-only architecture*). Tidak ada kebocoran kunci rahasia (*secret keys*) di *client bundle*. Dilengkapi *auto-refresh token* berbasis HTTP 401 interceptor.
   - `FE/lib/socket.ts`: Inisialisasi koneksi Socket.IO client dengan token autentikasi, rekoneksi otomatis, dan manajemen langganan *room*.
   - `FE/lib/i18n.tsx`: Context provider multi-bahasa terpadu (Bahasa Indonesia & English) yang mencakup seluruh string antarmuka pengguna dan admin.
2. **Backend (Node.js & Express.js 5)**:
   - Arsitektur berlapis modular: `routes/` -> `middleware/` -> `validations/` -> `controller/` -> `services/` -> `utils/` -> `config/`.
   - `middleware/authMiddleware.js`: Verifikasi token JWT pengguna via Supabase Auth dan validasi hierarki RBAC.
   - `middleware/validateUuid.js`: Validasi format UUID v4 pada seluruh parameter route (`:id`, `:chatId`, `:messageId`) guna menangkal *malformed input* dan *injection*.
   - `middleware/uploadMiddleware.js`: Validasi berkas memori via Multer untuk unggahan foto profil (JPG/PNG/WebP maks 3MB) dan import data CSV (maks 2MB).
   - `utils/stockManager.js`: Orkestrator mutasi stok atomik menggunakan Stored Procedure PostgreSQL dengan fallback *Optimistic Concurrency Control (OCC)*.
   - `services/cronService.js`: Penjadwal otomatis (*node-cron*) harian pukul 08:00 WIB untuk mendeteksi peminjaman melewati batas *planned_return_date* dan menyebarkan notifikasi peringatan.
3. **Database (Supabase PostgreSQL)**:
   - Terdiri dari 11 tabel relasional utama dengan indeks performa tinggi pada kolom pencarian dan relasi foreign key.
   - RLS (*Row Level Security*) diaktifkan pada semua tabel sebagai *safety net* jika terjadi akses tak sengaja dari klien publik.
   - Menggunakan *Service Role Key* pada backend untuk menjamin otorisasi tersentralisasi di level aplikasi.

---

## 5. Alur Kerja Sistem (System Workflows) yang Diperbarui

### 5.1 Alur Pengajuan Peminjaman & Proteksi Transaksi Aktif
```text
[User / Mahasiswa]          [Frontend Next.js]         [Backend Express API]        [Supabase DB / RPC]
        │                            │                           │                           │
        ├─ Buka Katalog Barang/Paket─►                           │                           │
        ├─ Klik "Pinjam" ────────────► GET /check-active ────────► Cek Peminjaman Aktif ─────► Read borrowings
        │                            │                           │ (Pending/Disetujui/       │ (WHERE status IN
        │                            │                           │  Dipinjam/Terlambat)      │  active_statuses)
        │                            ◄── 409 Jika Ada Pinjaman ──┤                           │
        │                            │   Aktif Belum Selesai     │                           │
        │  (Jika Bebas Pinjaman)     │                           │                           │
        ├─ Isi Tanggal & Peruntukan ─►                           │                           │
        ├─ Submit Pengajuan ─────────► POST /api/borrowings ─────► Validasi Joi & Format     │
        │                            │                           ├─ Cek Ketersediaan Stok    │
        │                            │                           ├─ Eksekusi Atomic RPC ─────► decrement_item_stock()
        │                            │                           │  (Kurangi available_stock)│ ATAU decrement_package_stock()
        │                            │                           ├─ Insert Transaksi Pinjam ─► INSERT INTO borrowings
        │                            │                           ├─ Insert Rincian Item ─────► INSERT INTO borrowings_items
        │                            │                           ├─ Catat Audit Log ─────────► INSERT INTO audit_logs
        │                            │                           ├─ Kirim Notif ke User & Staf► INSERT INTO notifications
        │                            │                           ▼                           │
        │                            ◄── Response 201 Created ───┤                           │
        ▼                            ▼                           ▼                           ▼
[Petugas Sarpras / Admin]
        │
        ├─ Buka Menu "Manajemen Peminjaman" (/admin/manajemen_peminjaman)
        ├─ Tinjau Jadwal, Peruntukan, dan Rincian Barang
        ├─ Tindakan Persetujuan:
        │  ├── Klik "Setujui / Validasi" ──► PATCH /borrowings/:id/status ("Disetujui" / "Dipinjam")
        │  └── Klik "Tolak" (Wajib Alasan) ─► PATCH /borrowings/:id/status ("Ditolak")
        │                                    ├─ Pulihkan Stok via increment_item_stock() / increment_package_stock()
        │                                    └─ Simpan Rejection Reason & Kirim Notif Penolakan ke User
```

### 5.2 Alur Pengembalian Barang Dua Tahap (Two-Tier Return Flow)
Untuk memastikan transparansi dan koordinasi antara peminjam dan petugas loket sarpras, sistem menerapkan alur pengembalian dua tahap:
1. **Tahap 1: Pengajuan Pengembalian Daring oleh Pengguna (`/user/pengembalian`)**:
   - Peminjam membuka menu *Pengembalian*, memilih transaksi peminjaman aktif yang akan dikembalikan.
   - Peminjam mengisi rencana tanggal pengembalian fisik, klaim kondisi barang (*Baik / Rusak Ringan / Rusak Berat*), dan catatan penjelas.
   - Frontend memanggil `POST /api/return-requests`. Sistem menyimpan permohonan ke tabel `return_requests` dengan status `Menunggu Verifikasi`.
   - Event *WebSocket* dipancarkan ke admin (`return_request_created`) untuk memberi sinyal kedatangan barang.
2. **Tahap 2: Verifikasi Fisik & Penyelesaian di Loket Sarpras (`/admin/pengembalian`)**:
   - Peminjam membawa barang fisik ke pos/loket SARPRAS.
   - Petugas memeriksa kuantitas barang yang dikembalikan serta kondisi fisiknya secara langsung.
   - Petugas mengklik tombol "Konfirmasi Pengembalian":
     - Mengisi kondisi fisik aktual (*Baik / Rusak Ringan / Rusak Berat / Hilang*).
     - Menulis catatan penerimaan dan jumlah barang yang kembali (`quantity_returned`).
     - Jika terindikasi rusak/hilang, petugas dapat langsung menginput nominal denda (`fine_amount`) dan alasan denda (`fine_reason`).
   - Sistem memanggil `POST /api/returns`:
     - Mencatat riwayat ke tabel `returns` bersama ID petugas penerima (`received_by`).
     - Mengubah status peminjaman pada `borrowings` menjadi `Dikembalikan` serta mencatat `actual_return_date`.
     - Mengubah status `return_requests` terkait menjadi `Disetujui`.
     - Memulihkan kuantitas stok barang/paket secara atomik via `incrementStock` / `incrementPackageStock`.
     - Jika ada kerusakan/denda, sistem secara otomatis menerbitkan tiket laporan kerusakan di tabel `damage_reports` yang terhubung dengan transaksi peminjaman.
     - Mencatat entri riwayat ke tabel `audit_logs` dan memicu notifikasi penyelesaian ke peminjam.

### 5.3 Alur Pelaporan Kerusakan & Penagihan Denda (Ticketing Lifecycle)
```text
[Inisiasi Laporan] 
  - User via menu /user/laporan_kerusakan (Upload foto bukti fisik, judul, deskripsi)
  - ATAU Otomatis saat Petugas menerima barang rusak pada menu Pengembalian
                           │
                           ▼
[Kode Laporan Unik]: ITM-YYYYMMDD-XXXX (Item) / PKG-YYYYMMDD-XXXX (Paket)
                           │
                           ▼
[Status Tiket: "Menunggu Review"] ──► Notifikasi dikirim ke Staf Sarpras
                           │
                           ▼
[Status Tiket: "Sedang Diperbaiki"]
  - Admin/Petugas mengubah status investigasi.
  - Jika stok barang habis akibat kerusakan, status item diubah menjadi "Dalam Pemeliharaan".
                           │
                           ▼
[Penetapan & Status Denda]:
  - Admin menetapkan nominal denda (fine_amount) dan alasan (fine_reason).
  - Status Denda: "Belum Dibayar" (Menunggu pelunasan di loket).
  - Saat peminjam melunasi denda di loket:
    - Admin menyetel fine_status = "Sudah Dibayar".
    - Sistem otomatis mengubah status laporan menjadi "Selesai".
                           │
                           ▼
[Status Tiket: "Selesai"]
  - Stok barang dipulihkan ke kondisi "Baik" dan status "Tersedia".
  - Notifikasi konfirmasi penyelesaian dikirim ke pengguna.
```

### 5.4 Alur Real-time Live Chat & Presensi Daring
1. **Autentikasi Socket**: Klien Socket.IO terhubung ke server Express dengan menyertakan token JWT Supabase. Server memverifikasi token dan mengaitkan identitas pengguna.
2. **User Presence**: Server melacak pengguna yang aktif dalam `onlineUsers` dan mencatat `lastSeenMap`. Status `user_online`, `user_offline`, dan `user_status_change` disiarkan secara realtime ke antarmuka pesan.
3. **Pesan & Reply (WhatsApp Style)**:
   - Pengguna atau admin dapat mengirim pesan teks dan lampiran gambar.
   - Pesan balasan merujuk pada `reply_to_message_id` (relasi ke tabel `chat_messages`) sehingga pesan yang dikutip tampil rapi di gelembung obrolan.
4. **Read Receipts**: Penanda pesan dibaca (`is_read = true`) diperbarui saat penerima membuka ruang percakapan.

---

## 6. Output & Artefak yang Dihasilkan Sistem

1. **Standardisasi Kode Dokumen Unik**:
   - Peminjaman: `PJ-YYYYMMDD-XXXX` (contoh: `PJ-20261109-A8F2`)
   - Master Barang: `BRG-XXX` atau format kode aset institusi (contoh: `BRG-001`, `LAP-002`)
   - Master Paket: `PKG-XXX` (contoh: `PKG-001`)
   - Laporan Kerusakan Item: `ITM-YYYYMMDD-XXXX`
   - Laporan Kerusakan Paket: `PKG-YYYYMMDD-XXXX`
2. **Dashboard Eksekutif & Statistik Interaktif**:
   - Metrik total aset, stok tersedia, barang terpinjam, dan barang dalam pemeliharaan.
   - Metrik sirkulasi: Peminjaman Menunggu Persetujuan, Sedang Dipinjam, Terlambat, Pengembalian Hari Ini, dan Total Selesai.
   - Visualisasi pie chart proporsi kategori barang dan daftar peminjaman terkini.
3. **Ekspor Data Sirkulasi (Spreadsheet XLSX & CSV)**:
   - Laporan Peminjaman: Dilengkapi kode pinjam, peminjam, tanggal pinjam, estimasi batas kembali, status, dan catatan admin.
   - Laporan Pengembalian: Dilengkapi nama petugas penerima, kondisi fisik akhir, denda, dan catatan investigasi.
   - Laporan Kerusakan & Denda: Rekapitulasi nilai denda yang belum dibayar vs sudah lunas.
4. **Log Audit Trail Keamanan (`audit_logs`)**:
   - Mencatat kolom: waktu peristiwa (`created_at`), ID pengguna (`user_id`), email pengguna (`user_email`), role (`user_role`), aksi (`action`), entitas sasaran (`entity` & `entity_type`), alamat IP (`ip_address`), *user agent*, serta rincian payload data (`details`).

---

## 7. Pemetaan Skema Database Riil (Supabase PostgreSQL)

Sistem beroperasi di atas 11 tabel relasional utama dan sekumpulan *Stored Procedures*:

### 7.1 Struktur Tabel
1. **`users` (Profil Pengguna & Staf)**:
   - `id` (UUID, PK -> `auth.users.id`), `nomor_induk` (TEXT, Unique), `name` (TEXT), `email` (TEXT, Unique), `role` (`Mahasiswa`, `Dosen`, `Staff`, `Petugas`, `Admin`), `no_hp` (TEXT), `foto` (TEXT), `status` (`Aktif`, `Nonaktif`, `Ditangguhkan`), `last_seen` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ), `update_at` (TIMESTAMPTZ).
2. **`categories` (Kategori Sarpras)**:
   - `id` (UUID, PK), `name` (TEXT), `description` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
3. **`items` (Aset Barang Sarpras)**:
   - `id` (UUID, PK), `category_id` (UUID, FK -> `categories.id`), `item_code` (TEXT, Unique), `name` (TEXT), `brand` (TEXT), `description` (TEXT), `stock` (INT), `available_stock` (INT), `condition` (TEXT: `Baik`, `Rusak Ringan`, dll.), `location` (TEXT), `image_url` (TEXT), `status` (`Tersedia`, `Stok Kosong`, `Dalam Pemeliharaan`), `created_at` (TIMESTAMPTZ), `update_at` (TIMESTAMPTZ).
4. **`packages` & `packages_items` (Paket Bundling Sarpras)**:
   - `packages`: `id` (UUID, PK), `package_code` (TEXT, Unique), `name` (TEXT), `description` (TEXT), `category_id` (UUID, FK), `image_url` (TEXT), `status` (TEXT), `stock_total` (INT), `stock_borrowed` (INT), `stock_available` (INT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
   - `packages_items`: `id` (UUID, PK), `package_id` (UUID, FK -> `packages.id` ON DELETE CASCADE), `item_id` (UUID, FK -> `items.id` ON DELETE CASCADE), `quantity` (INT), `created_at` (TIMESTAMPTZ).
5. **`borrowings` (Header Transaksi Peminjaman)**:
   - `id` (UUID, PK), `borrow_code` (TEXT, Unique), `user_id` (UUID, FK -> `users.id`), `package_id` (UUID, FK -> `packages.id`, Nullable), `package_quantity` (INT, Default 1), `borrow_date` (DATE/TIMESTAMPTZ), `planned_return_date` (DATE/TIMESTAMPTZ, Wajib), `actual_return_date` (DATE/TIMESTAMPTZ, Nullable), `purpose` (TEXT), `status` (`Pending`, `Disetujui`, `Dipinjam`, `Dikembalikan`, `Ditolak`, `Dibatalkan`, `Terlambat`), `rejection_reason` (TEXT), `admin_note` (TEXT), `created_at` (TIMESTAMPTZ), `update_at` (TIMESTAMPTZ).
   - **Indeks Unik Peminjaman Aktif**: `uq_active_borrowing_per_user` pada `(user_id)` dengan predikat `WHERE status IN ('Pending', 'Disetujui', 'Dipinjam', 'Terlambat')`.
6. **`borrowings_items` (Rincian Item Peminjaman)**:
   - `id` (UUID, PK), `borrowing_id` (UUID, FK -> `borrowings.id` ON DELETE CASCADE), `item_id` (UUID, FK -> `items.id`), `quantity` (INT), `quantity_returned` (INT, Default 0), `condition_before` (TEXT), `condition_after` (TEXT), `note` (TEXT), `created_at` (TIMESTAMPTZ).
7. **`returns` (Riwayat Penerimaan Pengembalian Fisik)**:
   - `id` (UUID, PK), `borrowing_id` (UUID, FK -> `borrowings.id` ON DELETE CASCADE), `received_by` (UUID, FK -> `users.id`), `return_date` (DATE/TIMESTAMPTZ), `condition` (TEXT: `Baik`, `Rusak Ringan`, `Rusak Berat`, `Hilang`), `note` (TEXT), `created_at` (TIMESTAMPTZ).
8. **`return_requests` (Pengajuan Pengembalian Online oleh Pengguna)**:
   - `id` (UUID, PK), `borrowing_id` (UUID, FK -> `borrowings.id` ON DELETE CASCADE), `user_id` (UUID, FK -> `users.id`), `planned_return_date` (DATE), `condition` (`Baik`, `Rusak Ringan`, `Rusak Berat`), `note` (TEXT), `status` (`Menunggu Verifikasi`, `Disetujui`, `Ditolak`), `admin_note` (TEXT), `verified_by` (UUID, FK -> `users.id`), `verified_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
9. **`damage_reports` (Tiket Kerusakan & Penagihan Denda)**:
   - `id` (UUID, PK), `report_code` (TEXT, Unique), `user_id` (UUID, FK -> `users.id`), `item_id` (UUID, FK, Nullable), `package_id` (UUID, FK, Nullable), `borrowing_id` (UUID, FK, Nullable), `title` (TEXT), `description` (TEXT), `image_url` (TEXT), `report_type` (`Kerusakan`, `Kehilangan`, `Cacat Fungsi`), `damage_type` (`per_item`, `per_package`), `status` (`Menunggu Review`, `Sedang Diperbaiki`, `Selesai`), `fine_amount` (BIGINT, Default 0), `fine_reason` (TEXT), `fine_status` (`Tidak Ada Denda`, `Belum Dibayar`, `Sudah Dibayar`), `admin_note` (TEXT), `created_at` (TIMESTAMPTZ), `update_at` (TIMESTAMPTZ).
10. **`chats` & `chat_messages` (Komunikasi & WhatsApp-style Reply)**:
    - `chats`: `id` (UUID, PK), `user_id` (UUID, FK), `admin_id` (UUID, FK), `subject` (TEXT), `status` (`Open`, `Closed`), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
    - `chat_messages`: `id` (UUID, PK), `chat_id` (UUID, FK -> `chats.id` ON DELETE CASCADE), `sender_id` (UUID, FK -> `users.id`), `message` (TEXT), `attachment_url` (TEXT), `is_read` (BOOLEAN), `reply_to_message_id` (UUID, FK -> `chat_messages.id` ON DELETE SET NULL), `created_at` (TIMESTAMPTZ).
11. **`notifications` (Pusat Pemberitahuan Sistem)**:
    - `id` (UUID, PK), `user_id` (UUID, FK), `title` (TEXT), `message` (TEXT), `type` (TEXT), `is_read` (BOOLEAN), `action_url` (TEXT), `reference_id` (TEXT), `reference_type` (TEXT), `created_at` (TIMESTAMPTZ).
12. **`audit_logs` (Pencatatan Audit Keamanan & Jejak Operasional)**:
    - `id` (UUID, PK), `user_id` (UUID, FK -> `users.id`), `user_email` (TEXT), `user_role` (TEXT), `action` (TEXT: `LOGIN`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `RETURN_CONFIRM`, dll.), `entity` (TEXT), `entity_type` (TEXT), `entity_id` (TEXT), `details` (JSONB), `ip_address` (TEXT), `user_agent` (TEXT), `created_at` (TIMESTAMPTZ).

### 7.2 Stored Procedures & Atomic Functions
- **`decrement_item_stock(p_item_id UUID, p_quantity INT)`**:
  Mengurangi `available_stock` dengan validasi kecukupan stok secara atomik di dalam Postgres engine. Mengubah status barang ke `'Stok Kosong'` jika sisa stok menjadi 0.
- **`increment_item_stock(p_item_id UUID, p_quantity INT)`**:
  Menambah kembali `available_stock` tanpa melebihi batas total `stock`. Mengembalikan status barang ke `'Tersedia'` jika sebelumnya kosong.
- **`decrement_package_stock(p_package_id UUID, p_quantity INT)`**:
  Mengurangi `stock_available` dan menambah `stock_borrowed` pada tabel paket.
- **`increment_package_stock(p_package_id UUID, p_quantity INT)`**:
  Memulihkan `stock_available` dan mengurangi `stock_borrowed` pada unit paket yang selesai dikembalikan.

---

## 8. Analisis Evaluasi Sistem (Status Resolusi Kelemahan & Best Practices)

Seluruh kelemahan arsitektural yang teridentifikasi pada evaluasi versi 2.1.0 sebelumnya telah diselesaikan secara tuntas pada pembaruan versi 3.0.0 ini:

| Area Evaluasi | Status Evaluasi Sebelumnya (v2.1.0) | Resolusi & Implementasi Terkini (v3.0.0) | Status Saat Ini |
|---|---|---|:---:|
| **Integritas Mutasi Stok** | Rawan race condition akibat query update stok terpisah dari insert transaksi. | Diimplementasikan **PostgreSQL Atomic Stored Procedures** (`decrement_item_stock`, `increment_item_stock`, `decrement_package_stock`) + row lock dan mekanisme fallback *Optimistic Concurrency Control (OCC)* di `stockManager.js`. | **TERSELESAIKAN (RESOLVED)** |
| **Arsitektur Data Split-Brain** | Frontend memiliki direct query ke Supabase SDK yang berpotensi memotong validasi Express API. | **100% BE-Only Client Architecture**: Seluruh mutasi dan query data dari frontend Next.js dialirkan melalui `FE/lib/api.tsx` ke Express 5 API. Tidak ada kebocoran kunci database di browser. | **TERSELESAIKAN (RESOLVED)** |
| **Unggahan Berkas & Media** | Foto dan tautan dokumen masih berupa string URL mentah tanpa validasi MIME. | Diimplementasikan middleware **Multer** di `uploadMiddleware.js` dengan memori buffer, validasi MIME-type ketat (JPG/PNG/WebP/CSV), pembatasan ukuran berkas (maks 3MB gambar, 2MB CSV), serta integrasi upload foto profil dan import data massal. | **TERSELESAIKAN (RESOLVED)** |
| **Alur Pengembalian Barang** | Hanya ada pencatatan pasif di pos tanpa koordinasi online oleh peminjam. | Diimplementasikan modul **`return_requests`**: Pengguna mengajukan rencana pengembalian daring beserta asesmen kondisi fisik sebelum diverifikasi langsung oleh petugas loket sarpras. | **TERSELESAIKAN (RESOLVED)** |
| **Audit Trail Keamanan** | Tidak ada pencatatan terpusat siapa yang mengubah status peminjaman, stok, atau user. | Dibangun tabel dan modul **`audit_logs`** lengkap dengan penangkapan alamat IP, *user agent*, *before-after payload diff*, serta portal visualisasi khusus admin di `/api/audit-logs`. | **TERSELESAIKAN (RESOLVED)** |
| **Fitur Balas Obrolan (Chat)** | Percakapan chat tidak mendukung balasan kutipan pesan (quote reply). | Ditambahkan kolom self-referential `reply_to_message_id` di `chat_messages` dengan relasi `ON DELETE SET NULL`, mendukung antarmuka balasan pesan bergaya WhatsApp. | **TERSELESAIKAN (RESOLVED)** |
| **Dukungan Multi-Bahasa** | Antarmuka hanya mendukung satu bahasa secara statis dan terpisah. | Diimplementasikan context provider **`FE/lib/i18n.tsx`** dengan 2000+ token terjemahan lengkap untuk Bahasa Indonesia dan English yang sinkron di seluruh komponen layout. | **TERSELESAIKAN (RESOLVED)** |
| **Proteksi Navigasi Browser** | Masalah jebakan back arrow pada halaman auth yang membuat user macet di login/register. | Diperbaiki: Perangkap `popstate` / `history.pushState` telah dibersihkan. Navigasi back browser berfungsi natural, dengan sesi terlindungi aman via `middleware.ts` dan pemeriksaan bfcache (*pageshow*). | **TERSELESAIKAN (RESOLVED)** |

---

## 9. Rencana Rilis & Milestone Pengembangan

- **Fase 1 (Selesai)**: Core REST API, Otentikasi Supabase JWT, CRUD Master Barang & Kategori, Skema Dasar Peminjaman.
- **Fase 2 (Selesai)**: Antarmuka Next.js 16 (Admin & User), Dashboard Visualisasi Metrik, Rekap Ekspor XLSX/CSV, Modul Denda & Kerusakan.
- **Fase 3 (Selesai - Current Baseline v3.0.0)**:
  - Full Security Hardening (RBAC strict, UUID v4 validation, Helmet CORP, Rate Limiting, PostgREST search sanitization).
  - Atomic Concurrency Stock Management via PostgreSQL RPC & OCC fallback.
  - Modul Two-Tier Return (`return_requests` + physical inspection).
  - Modul Immutable Audit Logging (`audit_logs`).
  - WhatsApp-style Chat Quote Reply & Presence Tracker via Socket.IO.
  - Multi-language System (i18n ID & EN).
  - 100% BE-only API Client Abstraction.
- **Fase 4 (Roadmap Peningkatan Masa Depan)**:
  - Migrasi cron job server lokal ke ekstensi **`pg_cron`** native di Supabase untuk keandalan arsitektur multi-container.
  - Integrasi modul **Webcam QR Code Scanner** pada `/admin/pengembalian` dan `/admin/manajemen_peminjaman` untuk serah terima barang instan tanpa input manual.
  - Integrasi WhatsApp Gateway (Fonnte/Twilio) untuk pengingat otomatis H-1 tanggal jatuh tempo peminjaman langsung ke nomor WhatsApp mahasiswa/dosen.
