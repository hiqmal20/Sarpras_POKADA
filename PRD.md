# Product Requirement Document (PRD) Komprehensif
# SARPRAS POKADA (Sistem Manajemen Sarana & Prasarana Kampus)

- **Versi Dokumen**: 2.1.0
- **Status**: Production Baseline & Evaluation Ready
- **Klasifikasi**: Dokumen Teknis & Produk Internal Kampus
- **Terakhir Diperbarui**: September 2026

---

## 1. Executive Summary & Visi Produk

### 1.1 Latar Belakang
Pengelolaan sarana dan prasarana (sarpras) di lingkungan kampus POKADA membutuhkan tata kelola inventaris yang transparan, akuntabel, dan realtime. Praktik peminjaman manual berbasis kertas rentan terhadap kehilangan arsip, salah hitung stok, keterlambatan pengembalian tanpa sanksi yang jelas, serta sengketa kondisi fisik aset sebelum dan sesudah dipinjam.

### 1.2 Visi & Objektif Produk
Menyediakan sistem operasional terpadu (*single source of truth*) berbasis web yang mencakup seluruh siklus hidup sirkulasi aset kampus: mulai dari penelusuran katalog, pengajuan peminjaman barang tunggal maupun paket, validasi bertingkat, monitoring pengembalian, pelaporan kerusakan dan penagihan denda, hingga rekapitulasi audit eksekutif.

### 1.3 Key Performance Indicators (KPI)
- **Zero Lost Items**: Mengeliminasi aset hilang melalui identitas peminjam terverifikasi dan pencatatan audit trail lengkap.
- **Approval Turnaround Time < 15 Menit**: Memangkas birokrasi persetujuan peminjaman dari manual 1x24 jam menjadi hitungan menit.
- **100% Stock Synchronization**: Menghilangkan selisih stok fisik vs sistem dengan mekanisme reservasi stok otomatis.
- **Instant Audit Export**: Pembuatan rekap sirkulasi barang dari 3 hari kerja menjadi satu kali klik ekspor data XLSX/CSV.

---

## 2. Ruang Lingkup & Batasan Operasional

### 2.1 Ruang Lingkup (In-Scope)
1. **Peminjaman Internal Kampus (Strict On-Campus Scope)**:
   - Peminjaman sarpras dikhususkan untuk kegiatan akademik, ormawa, dan operasional di dalam lingkungan kampus (ruang kelas, lab, auditorium, aula, area terbuka kampus).
   - Formulir pengajuan wajib mencantumkan lokasi spesifik di kampus serta jadwal penggunaan.
2. **Civitas Akademika Terdaftar**: Mahasiswa, Dosen, Staff Tenaga Kependidikan, Petugas Sarpras, dan Administrator.
3. **Mekanisme Bundling Paket Sarpras**: Pengelompokan beberapa barang dalam 1 paket siap pakai (contoh: *Paket Sidang Skripsi*, *Paket Seminar Aula*).
4. **Siklus Hidup Aset**: Pengadaan -> Inventarisasi -> Peminjaman -> Pengembalian -> Pelaporan Kerusakan / Pemeliharaan -> Pengembalian Stok.
5. **Ticketing Kerusakan & Denda**: Pengajuan bukti kerusakan fisik barang/paket, investigasi petugas, penetapan nominal denda, dan verifikasi pembayaran.
6. **Live Communication & Alerts**: Saluran chat langsung antara peminjam dan admin/petugas serta pusat notifikasi berarah langsung (*action redirect*).

### 2.2 Batasan (Out-of-Scope)
1. Peminjaman sarpras komersial untuk pihak luar kampus tanpa izin rektorat.
2. Sistem gateway pembayaran perbankan/otomatis (seluruh denda dan penalti diproses via loket keuangan/petugas sarpras internal).
3. Integrasi gerbang fisik RFID/turnstile otomatis.

---

## 3. Matriks Peran & Hak Akses Pengguna (RBAC)

| Modul / Fitur | Mahasiswa | Dosen | Staff | Petugas Sarpras | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Katalog Barang & Paket** | Baca & Cari | Baca & Cari | Baca & Cari | Kelola Penuh (CRUD) | Kelola Penuh (CRUD) |
| **Pengajuan Peminjaman** | Buat & Pantau Milik Sendiri | Buat & Pantau Milik Sendiri | Buat & Pantau Milik Sendiri | Buat (Mewakili) | Buat & Pantau Semua |
| **Approval Peminjaman** | - | - | - | Validasi & Setujui / Tolak | Validasi, Override, & Tolak |
| **Penerimaan Pengembalian** | Ajukan Kembali | Ajukan Kembali | Ajukan Kembali | Verifikasi Kondisi & Terima | Verifikasi Kondisi & Terima |
| **Laporan Kerusakan & Denda** | Buat Laporan | Buat Laporan | Buat Laporan | Verifikasi & Tentukan Denda | Manajemen Laporan & Sanksi |
| **Live Chat Konsultasi** | Chat ke Admin | Chat ke Admin | Chat ke Admin | Respon Chat User | Respon Seluruh Chat |
| **Manajemen Master Data** | - | - | - | Barang & Kategori | Barang, Paket, Kategori, User |
| **Rekap & Ekspor Laporan** | - | - | - | Ekspor Peminjaman/Pengembalian | Ekspor Lengkap (Audit Master) |

---

## 4. Arsitektur Teknis Sistem

### 4.1 Diagram Arsitektur
```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16 App Router)                     │
│  - Portal User : Katalog, Form Pinjam/Paket, Riwayat, Lapor Rusak, Chat │
│  - Portal Admin: Dashboard Metrik, Validasi, Pengembalian, Audit Export │
└────────────────────┬──────────────────────────────────┬─────────────────┘
                     │ REST API (Bearer JWT Supabase)   │ Supabase SDK
                     ▼                                  ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────┐
│        BACKEND (Express.js 5)         │  │   SUPABASE (Cloud Backend)   │
│  - Middleware: Auth RBAC, Helmet,     │  │  - Auth Engine (auth.users)  │
│    Rate Limiter, Joi Validation       │  │  - PostgreSQL Database       │
│  - Services: Business Logic & Stock   │  │  - Realtime & Storage Bucket │
└────────────────────┬──────────────────┘  └──────────────▲───────────────┘
                     │ Supabase Service Role (Bypass RLS) │
                     └────────────────────────────────────┘
```

### 4.2 Komponen Arsitektur
1. **Frontend (Next.js 16 App Router & Tailwind CSS)**:
   - Direktori `FE/app/user/`: Antarmuka responsif pengguna (katalog aset, detail item, keranjang paket, tracking peminjaman, dashboard user).
   - Direktori `FE/app/admin/`: Antarmuka manajemen staf (manajemen peminjaman, pengembalian barang, laporan kerusakan, master barang/paket/kategori, manajemen user, dan ekspor).
   - `FE/lib/api.tsx`: Abstraksi API client terpusat dengan fallback sinkronisasi langsung ke Supabase SDK.
2. **Backend (Node.js & Express.js 5)**:
   - Arsitektur berlapis: `routes/` -> `middleware/` -> `validations/` -> `controller/` -> `services/` -> `config/`.
   - Mengisolasi aturan bisnis (seperti penyesuaian stok, pembuatan kode dokumen unik, notifikasi) di dalam layer *Services*.
3. **Database (PostgreSQL via Supabase)**:
   - Skema relasional terindeks untuk kecepatan respon query sirkulasi tinggi.
   - Menggunakan autentikasi berbasis JWT Supabase yang terikat dengan tabel profil pengguna `public.users`.

---

## 5. Alur Kerja Sistem (System Workflows)

### 5.1 Alur Pengajuan & Persetujuan Peminjaman
```text
[User]                 [Frontend]               [Backend API]            [Database]
  │                        │                          │                       │
  ├─ Pilih Barang/Paket ───►                          │                       │
  ├─ Isi Tanggal & Tujuan ─►                          │                       │
  │  (borrow_date & return_date)                      │                       │
  ├─ Submit Pengajuan ─────► POST /api/borrowings ────►                       │
  │                        │                          ├─ Validasi Stok        │
  │                        │                          ├─ Kunci Stok Barang ───► Update items
  │                        │                          ├─ Simpan Header & Item ─► Insert borrowings
  │                        │                          │  (PJ-xxx + return_date)
  │                        │                          ├─ Kirim Notifikasi ────► Insert notifications
  │                        │                          ▼                       │
  │                        ◄── Response 201 Sukses ───┤                       │
  │                                                   │                       │
[Admin / Petugas]                                     │                       │
  │                                                   │                       │
  ├─ Buka Menu Manajemen Peminjaman ─────────────────► GET /api/borrowings ───► Read with planned_return_date
  ├─ Review Jadwal & Estimasi Kembali                 │                       │
  ├─ Klik "Validasi & Setujui" ──────────────────────► PATCH /status ─────────► Update status = "Dipinjam"
  │  (Atau Klik "Tolak" ─────────────────────────────► Restore Stok) ────────► Restore available_stock
```

### 5.2 Alur Pengembalian Barang & Verifikasi Kondisi
1. **Penerimaan Fisik**: Peminjam menyerahkan barang fisik ke pos SARPRAS.
2. **Pemeriksaan Petugas**: Petugas membuka menu *Pengembalian*, memverifikasi kuantitas dan kelayakan fisik barang (*Baik / Rusak Ringan / Rusak Berat / Hilang*).
3. **Pencatatan Sistem (`POST /api/returns`)**:
   - Sistem mencatat record baru pada tabel `returns` bersama ID penerima.
   - Status peminjaman pada `borrowings` diubah menjadi `Selesai` dengan timestamp `actual_return_date`.
   - Stok `available_stock` pada tabel `items` dipulihkan kembali secara otomatis.
   - Jika terindikasi rusak/hilang, petugas/user langsung diarahkan membuat tiket kerusakan.

### 5.3 Alur Pelaporan Kerusakan & Penagihan Denda
1. **Penerbitan Tiket (`POST /api/damage-reports`)**:
   - Dibuat oleh peminjam atau petugas dengan mencantumkan kronologi, foto bukti, dan referensi peminjaman/barang.
   - Sistem otomatis memberi kode unik `ITM-YYYYMMDD-XXXX` (barang individual) atau `PKG-YYYYMMDD-XXXX` (paket).
2. **Review Admin**:
   - Admin menetapkan status penanganan (*Menunggu Review -> Sedang Diperbaiki -> Selesai*).
   - Menetapkan besaran denda ganti rugi (`fine_amount`), alasan denda (`fine_reason`), dan mengawasi status pelunasan (`fine_status`).

### 5.4 Alur Live Chat & Notifikasi Interaktif
- **Konsultasi**: User dapat membuka sesi percakapan dengan admin untuk menanyakan spesifikasi teknis barang, negosiasi perpanjangan batas kembali, atau koordinasi ruangan.
- **Direct Notification**: Setiap notifikasi approval/kerusakan dilengkapi `action_url`, `reference_id`, dan `reference_type` sehingga user langsung diarahkan ke detail dokumen terkait saat diklik.

---

## 6. Output & Artefak yang Dihasilkan Sistem

1. **Standardisasi Kode Dokumen Unik**:
   - Peminjaman: `PJ-YYYYMMDD-XXXX` (contoh: `PJ-20260924-G8DQ`)
   - Master Barang: `BRG-XXX` / Kode Inventaris Kategori (contoh: `BRG-001`)
   - Laporan Kerusakan: `ITM-YYYYMMDD-XXXX` atau `PKG-YYYYMMDD-XXXX`
2. **Executive Dashboard Analytics**:
   - Kartu metrik total aset, stok tersedia, barang terpinjam, dan barang pemeliharaan.
   - Counter sirkulasi aktif: Peminjaman Pending, Sedang Dipinjam, Pengembalian Bulan Ini, dan Laporan Menunggu Review.
3. **Ekspor Data Sirkulasi (Spreadsheet XLSX / CSV)**:
   - Laporan transaksi peminjaman lengkap dengan tanggal pinjam, estimasi kembali, peminjam, status, dan catatan admin.
   - Laporan audit pengembalian dengan data petugas penerima dan kondisi aset fisik saat diterima.
4. **Pusat Log Notifikasi Realtime**:
   - Riwayat pemberitahuan status transaksi dengan pelacakan status baca (`is_read`).

---

## 7. Pemetaan Skema Database Riil (Supabase PostgreSQL)

Sistem beroperasi di atas 10 tabel relasional utama:

1. **`users`**:
   - `id` (UUID, PK -> `auth.users.id`), `name` (TEXT), `email` (TEXT), `nomor_induk` (TEXT), `no_hp` (TEXT), `role` (ENUM: `Mahasiswa`, `Dosen`, `Staff`, `Petugas`, `Admin`), `foto` (TEXT), `status` (TEXT), `last_seen` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
2. **`categories`**:
   - `id` (UUID, PK), `name` (TEXT), `description` (TEXT), `created_at` (TIMESTAMPTZ).
3. **`items`**:
   - `id` (UUID, PK), `category_id` (UUID, FK -> `categories.id`), `code` (TEXT, Unique), `name` (TEXT), `description` (TEXT), `stock` (INT), `available_stock` (INT), `condition` (TEXT), `status` (TEXT), `image_url` (TEXT), `created_at` (TIMESTAMPTZ).
4. **`packages` & `packages_items`**:
   - `packages`: `id` (UUID, PK), `name` (TEXT), `code` (TEXT), `description` (TEXT), `image_url` (TEXT).
   - `packages_items`: `id` (UUID, PK), `package_id` (UUID, FK), `item_id` (UUID, FK), `quantity` (INT).
5. **`borrowings`**:
   - `id` (UUID, PK), `borrow_code` (TEXT, Unique), `user_id` (UUID, FK -> `users.id`), `borrow_date` (TIMESTAMPTZ), `planned_return_date` (TIMESTAMPTZ, Estimasi Kembali), `actual_return_date` (TIMESTAMPTZ, Tanggal Selesai Aktual), `purpose` (TEXT), `status` (TEXT), `admin_note` (TEXT), `created_at` (TIMESTAMPTZ).
6. **`borrowings_items`**:
   - `id` (UUID, PK), `borrowing_id` (UUID, FK), `item_id` (UUID, FK), `quantity` (INT), `condition_before` (TEXT), `condition_after` (TEXT), `note` (TEXT).
7. **`returns`**:
   - `id` (UUID, PK), `borrowing_id` (UUID, FK -> `borrowings.id`), `received_by` (UUID, FK -> `users.id`), `return_date` (TIMESTAMPTZ), `condition` (TEXT), `note` (TEXT), `created_at` (TIMESTAMPTZ).
8. **`damage_reports`**:
   - `id` (UUID, PK), `report_code` (TEXT, Unique), `damage_type` (`per_item` / `per_package`), `user_id` (UUID, FK), `item_id` (UUID, FK, Nullable), `package_id` (UUID, FK, Nullable), `borrowing_id` (UUID, FK, Nullable), `description` (TEXT), `proof_url` (TEXT), `status` (TEXT), `fine_amount` (BIGINT), `fine_reason` (TEXT), `fine_status` (TEXT), `admin_note` (TEXT), `created_at` (TIMESTAMPTZ).
9. **`chats` & `chat_messages`**:
   - `chats`: `id` (UUID, PK), `user_id` (UUID, FK), `admin_id` (UUID, FK), `created_at` (TIMESTAMPTZ).
   - `chat_messages`: `id` (UUID, PK), `chat_id` (UUID, FK), `sender_id` (UUID, FK), `message` (TEXT), `is_read` (BOOLEAN), `created_at` (TIMESTAMPTZ).
10. **`notifications`**:
    - `id` (UUID, PK), `user_id` (UUID, FK), `title` (TEXT), `message` (TEXT), `type` (TEXT), `action_url` (TEXT), `reference_id` (TEXT), `reference_type` (TEXT), `is_read` (BOOLEAN), `created_at` (TIMESTAMPTZ).

---

## 8. Analisis Evaluasi Sistem (Keunggulan & Kelemahan)

### 8.1 Keunggulan Sistem (Strengths)
1. **Arsitektur Berlapis Bersih (Separation of Concerns)**: Backend memisahkan antara HTTP handling, validasi skema Joi, dan logika bisnis service. Hal ini mempermudah maintenance dan mencegah duplikasi kode.
2. **Proteksi Anti Double-Booking & Stok Balik Otomatis**: Kuantitas `available_stock` dipotong saat status peminjaman dibuat, serta otomatis dikembalikan ke inventaris apabila pengajuan ditolak/dibatalkan oleh admin.
3. **Fleksibilitas Peminjaman Multi-Item & Paket Bundling**: Mendukung peminjaman puluhan item sekaligus maupun paket gabungan sarpras, mempercepat proses pengajuan acara besar.
4. **Keamanan Jaringan & Data Berlapis**: Mengimplementasikan sanitasi HTTP Header via *Helmet*, pembatasan percobaan login via *express-rate-limit*, serta role authorization berbasis middleware token JWT.
5. **Resiliensi Dual-Data Source Frontend**: Frontend memiliki mekanisme fallback ke Supabase SDK langsung jika instance backend Express lokal dalam keadaan mati/restarting.

### 8.2 Kelemahan Sistem Saat Ini (Weaknesses) & Rekomendasi Perbaikan

| Area Evaluasi | Kelemahan Saat Ini | Potensi Risiko | Rencana Aksi Solusi / Evaluasi |
|---|---|---|---|
| **Integritas Transaksi DB** | Operasi insert peminjaman dan update stok di `borrowingService.js` berjalan dalam beberapa query terpisah tanpa DB Transaction atomik. | Jika server crash di tengah loop pengurangan stok, stok bisa terpotong sebagian tanpa record peminjaman yang utuh. | Implementasikan **Database Transaction via Supabase RPC (Stored Procedure PostgreSQL)** agar bersifat ACID (seluruh data tersimpan atau di-rollback total). |
| **Arsitektur Data Split-Brain** | Adanya direct query ke Supabase SDK pada `FE/lib/api.tsx` yang memotong jalur Express API. | Logika bisnis (trigger notifikasi, audit log) yang ada di Express bisa terlewat jika frontend membaca/menulis langsung ke Supabase. | Standarisasi mutasi data (*Write Operations*) **100% wajib melalui API Express**. Supabase SDK di client hanya dipakai untuk listen Realtime channel. |
| **Media & File Storage** | URL gambar bukti kerusakan dan foto barang masih menggunakan string teks mentah/link eksternal. | Rawan tautan mati (*broken image*), tidak ada sanitasi format berkas, serta rawan eksploitasi ukuran berkas raksasa. | Bangun endpoint upload multipart (**Multer + Supabase Storage Bucket**) dengan validasi MIME-type (JPG/PNG/WebP) dan limit ukuran maksimal 2MB. |
| **Ketiadaan Soft Delete** | Penghapusan barang/kategori menggunakan perintah SQL `DELETE` permanen. | Riwayat transaksi lama akan mengalami *orphan record* atau error foreign key jika barang yang sudah rusak/dibuang dihapus dari katalog master. | Tambahkan kolom `is_deleted` atau `deleted_at` (**Soft Delete**) sehingga aset afkir tetap memiliki rekam jejak pada riwayat peminjaman terdahulu. |
| **Skalabilitas Cron Scheduler** | Pengecekan peminjaman overdue dijalankan via `node-cron` pada memori server lokal. | Jika backend di-deploy dalam cluster multi-instance/container, job cron akan berjalan berulang kali dan memicu notifikasi ganda ke user. | Migrasikan scheduler ke level basis data menggunakan ekstensi **`pg_cron` Supabase** atau menggunakan cron scheduler cloud terdedikasi. |

---

## 9. Rencana Rilis & Milestone Pengembangan

- **Fase 1 (Selesai)**: Core REST API, otentikasi JWT Supabase, modul master barang/kategori, dan skema dasar peminjaman.
- **Fase 2 (Selesai)**: Antarmuka Next.js 16 (Admin & User), visualisasi dashboard analitik, live chat konsultasi, ekspor XLSX/CSV, penagihan denda kerusakan, dan perbaikan alur `planned_return_date`.
- **Fase 3 (Roadmap Peningkatan Mutu)**:
  - Migrasi seluruh alur pengurangan stok ke Stored Procedure PostgreSQL (ACID Transaction).
  - Implementasi upload gambar bukti fisik terintegrasi Supabase Storage.
  - Implementasi QR Code Scanner pada modul serah terima fisik loket sarpras.
  - Integrasi WhatsApp Gateway untuk notifikasi otomatis pengingat batas waktu pengembalian.
