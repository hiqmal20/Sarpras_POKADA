# Product Requirement Document (PRD) Komprehensif
# SARPRAS POKADA (Sistem Manajemen Sarana & Prasarana Kampus)

- **Versi Dokumen**: 2.0.0
- **Status**: Ready for Implementation / Production Baseline
- **Klasifikasi**: Dokumen Internal Kampus
- **Terakhir Diperbarui**: September 2026

---

## 1. Executive Summary & Visi Produk

### 1.1 Latar Belakang
Pengelolaan sarana dan prasarana (sarpras) di institusi pendidikan sering kali menghadapi hambatan:
- Pencatatan peminjaman manual berbasis kertas rentan hilang atau rusak.
- Informasi ketersediaan stok barang dan status pemeliharaan tidak transparan secara realtime.
- Sengketa kondisi barang saat sebelum dan sesudah dipinjam akibat ketiadaan dokumentasi digital.
- Kurangnya mekanisme kontrol batas waktu pengembalian serta pelacakan sirkulasi aset kampus.

### 1.2 Visi & Objektif Produk
Membangun platform digital terpusat (*single source of truth*) untuk manajemen inventaris, sirkulasi peminjaman, pelaporan kerusakan, dan monitoring aset di lingkungan kampus POKADA.

### 1.3 Key Performance Indicators (KPI)
- **Zero Loss Asset**: Penurunan angka kehilangan sarpras hingga 0% melalui validasi identitas dan audit trail.
- **Cycle Time Reduction**: Memangkas waktu pengajuan hingga persetujuan peminjaman dari rata-rata 24 jam menjadi di bawah 15 menit.
- **Data Accuracy**: Akurasi stok barang 100% realtime terintegrasi dengan database.
- **Reporting Velocity**: Pembuatan rekapitulasi audit inventaris berkurang dari 3 hari menjadi 1 klik export data.

---

## 2. Ruang Lingkup & Batasan Operasional (Scope & Constraints)

### 2.1 Ruang Lingkup (In-Scope)
1. **Peminjaman Internal Kampus Saja (Strict On-Campus Scope)**:
   - Penggunaan sarana dan prasarana **hanya diperbolehkan di dalam batas area kampus** (ruang kelas, laboratorium, auditorium, aula, area terbuka kampus).
   - Formulir pengajuan wajib mencantumkan data lokasi spesifik penggunaan barang di kampus (contoh: Gedung A Lt. 2 R. 204).
   - Pengeluaran aset melewati gerbang kampus dilarang keras tanpa otorisasi tertulis Surat Jalan khusus dari Biro Sarpras.
2. **Kategori Pengguna**: Civitas akademika terdaftar aktif (Mahasiswa, Dosen, Staff Tenaga Kependidikan, Petugas Sarpras, Admin).
3. **Mekanisme Bundling Paket**: Pembuatan grup item (misal: Paket Seminar/Sidang/Kuliah Umum).
4. **Siklus Hidup Aset**: Pengadaan -> Inventarisasi -> Peminjaman -> Pengembalian -> Maintenance/Afkir.
5. **Ticketing Kerusakan**: Pelaporan kerusakan barang fisik beserta bukti foto & status penanganan teknisi.
6. **Real-Time Communication**: Live chat interaktif antar peminjam dan admin/petugas sarpras.

### 2.2 Batasan (Out-of-Scope)
1. Peminjaman sarpras untuk kepentingan komersial pribadi non-kampus.
2. Integrasi gerbang fisik RFID/turnstile otomatis (pemeriksaan fisik tetap oleh Petugas Sarpras di pos inventaris).
3. Sistem pembayaran sewa (seluruh operasional bersifat fasilitas dinas kampus non-transaksi finansial tunai).

---

## 3. Matriks Peran & Hak Akses Pengguna (RBAC & Personas)

### 3.1 Ringkasan Hak Akses (Matrix)

| Fitur / Modul | Mahasiswa | Dosen | Staff | Petugas Sarpras | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Katalog Barang & Paket** | Baca | Baca | Baca | Kelola (CRUD) | Kelola (CRUD) |
| **Pengajuan Peminjaman** | Buat, Baca Milik Sendiri | Buat, Baca Milik Sendiri | Buat, Baca Milik Sendiri | Buat (Mewakili) | Buat & Pantau Semua |
| **Approval Peminjaman** | - | - | - | Review & Setujui | Override & Setujui |
| **Serah Terima & Pengembalian** | Konfirmasi Terima | Konfirmasi Terima | Konfirmasi Terima | Eksekusi Fisik & Cek Stok | Eksekusi Fisik & Cek Stok |
| **Lapor Kerusakan** | Buat Laporan | Buat Laporan | Buat Laporan | Tindak Lanjut Teknis | Manajemen Laporan |
| **Manajemen User** | Edit Profil Sendiri | Edit Profil Sendiri | Edit Profil Sendiri | - | CRUD User & Role |
| **Live Chat Konsultasi** | Chat ke Admin | Chat ke Admin | Chat ke Admin | Respon Chat User | Respon Semua Chat |
| **Rekap Laporan & Export** | - | - | - | Baca Rekap | Export XLSX/JSON |

### 3.2 Karakteristik Persona

#### A. Mahasiswa
- **Tujuan**: Meminjam proyektor, kabel extension, sound system portable, kamera dokumentasi untuk kegiatan perkuliahan, ormawa, atau ujian tugas akhir.
- **Aturan Khusus**: Maksimal durasi pinjam 24 jam per transaksi kecuali ada surat persetujuan dosen pendamping; maksimal 2 item aktif bersamaan.

#### B. Dosen
- **Tujuan**: Meminjam perangkat laboratorium khusus, mic wireless, pointer presentasi, ruang kuliah pengganti.
- **Aturan Khusus**: Prioritas approval lebih tinggi; batas kuota peminjaman hingga 5 item.

#### C. Staff (Tenaga Kependidikan)
- **Tujuan**: Meminjam sarana kebutuhan operasional administrasi kampus, rapat senat, atau acara dies natalis.
- **Aturan Khusus**: Masa peminjaman dapat disesuaikan jadwal agenda kerja unit.

#### D. Petugas Sarpras
- **Tujuan**: Bertugas di gudang/pos sarpras; memeriksa fisik barang sebelum keluar dan sesudah kembali; mencatat nomor seri & kondisi.
- **Tanggung Jawab**: Verifikator status transaksi harian (`Dipinjam`, `Dikembalikan`).

#### E. Super Admin
- **Tujuan**: Mengatur kebijakan sistem, menambah barang baru, kategori, akun petugas, mengaudit insiden kerusakan, serta memantau log sistem.

---

## 4. Spesifikasi Fungsional Rinci (Functional Requirements)

### 4.1 Modul 1: Autentikasi & Akun Pengguna
- **REQ-AUTH-01 (Registrasi)**:
  - Input: Nama Lengkap, Email Institusi (`@campus.ac.id` / terdaftar), Password (min. 8 karakter), Nomor Kontak/WhatsApp, Unit/Jurusan, NIM/NIP.
  - Role default registrasi publik: `Mahasiswa`. Akun `Dosen` / `Staff` memerlukan approval aktivasi atau registrasi oleh Admin.
- **REQ-AUTH-02 (Login & Sesi)**:
  - Otentikasi berbasis Supabase Auth dengan penerbitan JSON Web Token (JWT).
  - Rate Limiting: Maksimal 10 kegagalan login per 15 menit per IP (mencegah *Brute-Force*).
  - Sesi tersimpan aman di cookie/local state dengan timeout konfiguratif (15m, 30m, 1h, 1 hari).
- **REQ-AUTH-03 (Profil & Keamanan)**:
  - Pengaturan profil: Ubah nama, kontak WhatsApp, jurusan, bio, avatar.
  - Pengaturan keamanan: Ubah password dengan verifikasi sandi lama, toggle Two-Factor Authentication (2FA), log riwayat aktivitas login.

### 4.2 Modul 2: Master Data Inventaris Barang
- **REQ-ITEM-01 (Atribut Barang)**:
  - Setiap barang memiliki: `item_id`, `kode_barang` (unik, misal: `ELK-PRJ-001`), `nama_barang`, `kategori_id`, `total_stock`, `available_stock`, `kondisi` (*Baik, Rusak Ringan, Rusak Berat*), `status` (*Tersedia, Dipinjam, Maintenance*), `lokasi_penyimpanan` (contoh: Lemari B-03 Pos Sarpras), `spesifikasi_teknis`, dan `foto_url`.
- **REQ-ITEM-02 (Pencarian & Filtering)**:
  - Full-text search berdasarkan nama atau kode barang.
  - Filter berdasarkan Kategori, Status Ketersediaan, dan Kondisi Fisik.
  - Pagination dinamis (10, 25, 50 data per halaman).
- **REQ-ITEM-03 (Integritas Relasi)**:
  - Kategori barang tidak dapat dihapus jika masih terdapat barang aktif di dalamnya.
  - Barang tidak dapat dihapus jika masih terkait transaksi peminjaman aktif (*active foreign key guard*).

### 4.3 Modul 3: Paket Bundling Sarpras
- **REQ-PKG-01 (Struktur Paket)**:
  - Admin dapat membuat paket kegiatan (contoh: "Paket Sidang Skripsi" = 1 Proyektor HDMI + 1 Pointer Laser + 1 Roll Kabel 5m).
- **REQ-PKG-02 (Cek Ketersediaan Paket)**:
  - Status paket dianggap `Tersedia` hanya jika **seluruh** item penyusun paket memiliki `available_stock >= kuantitas_paket`.
  - Jika salah satu item stoknya 0, status paket otomatis menjadi `Stok Sebagian Tidak Tersedia`.

### 4.4 Modul 4: Engine Transaksi Peminjaman
- **REQ-BRW-01 (Pengajuan)**:
  - Peminjam memilih barang tunggal atau paket bundling.
  - Peminjam wajib menginput:
    - Tanggal dan Jam Mulai Pinjam.
    - Tanggal dan Jam Rencana Pengembalian.
    - Lokasi Pemakaian di Kampus (Gedung, Lantai, Nomor Ruangan / Area).
    - Keperluan / Agenda Penggunaan.
    - Berkas Surat Rekomendasi/Pendukung (Opsional/Wajib untuk ormawa).
- **REQ-BRW-02 (Validasi Ketersediaan & Locking Stok)**:
  - Sistem menghasilkan nomor referensi: `PJ-YYYYMMDD-XXXX`.
  - Saat status `Pending`, kuantitas `available_stock` langsung dikunci sementara (*reserved*) agar tidak terjadi *double booking*.
- **REQ-BRW-03 (Alur Approval)**:
  - Admin / Petugas menerima alert peminjaman masuk.
  - Opsi tindakan:
    - **Setujui (Approve)**: Peminjam menerima notifikasi persetujuan beserta instruksi pengambilan barang di loket.
    - **Tolak (Reject)**: Wajib memasukkan alasan penolakan (misal: "Stok dialokasikan untuk ujian", "Lokasi luar kampus ditolak"). Stok barang otomatis dipulihkan (*unlocked*).

### 4.5 Modul 5: Alur Serah Terima & Pengembalian
- **REQ-RET-01 (Handover / Pengambilan Fisik)**:
  - Peminjam datang ke loket sarpras menunjukkan Kartu Tanda Mahasiswa (KTM) / Identitas Pegawai dan kode `PJ-XXXX`.
  - Petugas memverifikasi fisik barang di hadapan peminjam, lalu menekan tombol `Serahkan Barang` di sistem -> Status berubah menjadi `Dipinjam`.
- **REQ-RET-02 (Proses Pengembalian Fisik)**:
  - Petugas memeriksa kelengkapan unit, kabel, tas, aksesoris, dan fungsi barang.
  - Input form pengembalian oleh Petugas:
    - Tanggal & Waktu Aktual Pengembalian.
    - Kondisi Akhir Barang: `Baik`, `Rusak Ringan`, atau `Rusak Berat`.
    - Catatan Petugas (misal: "Kabel HDMI hilang", "Bodi lecet normal").
  - Sistem otomatis:
    - Mengubah status peminjaman menjadi `Selesai`.
    - Menambah kembali kuantitas `available_stock` pada tabel `items`.
- **REQ-RET-03 (Keterlambatan)**:
  - Jika waktu aktual pengembalian melebihi batas jadwal, sistem menandai flag `Terlambat (Overdue)` dan menghitung durasi keterlambatan.
  - Pengguna dengan catatan keterlambatan aktif dibekukan hak pengajuan pinjam baru sampai status diselesaikan oleh Admin.

### 4.6 Modul 6: Laporan Kerusakan & Pemeliharaan (Damage Ticketing)
- **REQ-DMG-01 (Tiket Kerusakan)**:
  - Pengguna atau Petugas dapat menerbitkan laporan kerusakan terhubung dengan kode peminjaman atau langsung pada item inventaris.
  - Komponen input: Nama Item, Tingkat Kerusakan (*Ringan, Sedang, Berat, Hilang*), Kronologi Kejadian, Foto Bukti Fisik (Upload berkas gambar).
- **REQ-DMG-02 (Tindakan Teknis & Perubahan Inventaris)**:
  - Saat tiket dibuat, status barang otomatis berubah menjadi `Dalam Pemeliharaan (Maintenance)` dan dikeluarkan dari stok pinjam.
  - Admin dapat memperbarui status tiket: `Menunggu Review` -> `Sedang Diperbaiki` -> `Selesai` / `Ditolak`.
  - Setelah selesai diperbaiki, Admin memulihkan status barang menjadi `Tersedia`.

### 4.7 Modul 7: Live Chat Konsultasi & Notifikasi Realtime
- **REQ-COM-01 (Live Chat via Socket.io)**:
  - Komunikasi langsung *one-on-one* antara Peminjam dan Petugas/Admin Sarpras terkait ketersediaan, konfirmasi izin ruang, dan koordinasi pengembalian.
  - Fitur: Kirim teks, indikator terbaca (*read receipt*), badge pesan belum dibaca (*unread count*).
- **REQ-COM-02 (Notification Center)**:
  - Notifikasi instan dalam aplikasi (*toast popup* dan menu lonceng di navbar):
    - Status pengajuan di-approve / di-reject.
    - Pengingat jatuh tempo H-2 jam sebelum batas akhir pengembalian.
    - Konfirmasi barang sukses dikembalikan.
    - Tiket kerusakan direspon oleh Admin.

### 4.8 Modul 8: Rekapitulasi Laporan & Audit Data
- **REQ-RPT-01 (Dashboard Statistik Admin)**:
  - Total Aset, Total Aset Dipinjam, Total Aset Rusak/Maintenance.
  - Grafik tren peminjaman mingguan dan bulanan.
  - Daftar peminjaman paling aktif dan barang paling sering dipinjam.
- **REQ-RPT-02 (Ekspor Laporan)**:
  - Filter rentang tanggal laporan.
  - Ekspor format: Microsoft Excel (`.xlsx`) via sheetjs/xlsx dan format `.json`.

---

## 5. Arsitektur Data & Model Entitas (Database Schema)

Sistem menggunakan Supabase PostgreSQL dengan skema tabel relasional sebagai berikut:

### 5.1 Entitas Utama

1. **`users`**:
   - `id` (UUID, PK, FK ke `auth.users.id`)
   - `nama` (VARCHAR 255)
   - `email` (VARCHAR 255, Unique)
   - `role` (ENUM: `'Mahasiswa'`, `'Dosen'`, `'Staff'`, `'Petugas'`, `'Admin'`)
   - `nomor_induk` (VARCHAR 50 - NIM / NIP)
   - `jurusan_unit` (VARCHAR 100)
   - `no_telepon` (VARCHAR 20)
   - `status` (ENUM: `'Aktif'`, `'Nonaktif'`, `'Pending'`)
   - `avatar_url` (TEXT)
   - `created_at` (TIMESTAMPTZ)

2. **`categories`**:
   - `id` (UUID, PK)
   - `nama_kategori` (VARCHAR 100, Unique)
   - `deskripsi` (TEXT)
   - `created_at` (TIMESTAMPTZ)

3. **`items`**:
   - `id` (UUID, PK)
   - `kategori_id` (UUID, FK -> `categories.id`)
   - `kode_barang` (VARCHAR 50, Unique)
   - `nama_barang` (VARCHAR 255)
   - `deskripsi` (TEXT)
   - `total_stock` (INTEGER)
   - `available_stock` (INTEGER)
   - `kondisi` (ENUM: `'Baik'`, `'Rusak Ringan'`, `'Rusak Berat'`)
   - `status` (ENUM: `'Tersedia'`, `'Dipinjam'`, `'Dalam Pemeliharaan'`)
   - `lokasi_penyimpanan` (VARCHAR 255)
   - `foto_url` (TEXT)
   - `created_at` (TIMESTAMPTZ)

4. **`packages` & `packages_items`**:
   - `packages`: `id` (UUID, PK), `nama_paket` (VARCHAR 255), `deskripsi` (TEXT), `foto_url` (TEXT)
   - `packages_items`: `id` (UUID, PK), `package_id` (UUID, FK), `item_id` (UUID, FK), `kuantitas` (INTEGER)

5. **`borrowings`**:
   - `id` (UUID, PK)
   - `kode_peminjaman` (VARCHAR 50, Unique - `PJ-YYYYMMDD-XXXX`)
   - `user_id` (UUID, FK -> `users.id`)
   - `tanggal_pinjam` (TIMESTAMPTZ)
   - `tanggal_kembali_rencana` (TIMESTAMPTZ)
   - `tanggal_kembali_aktual` (TIMESTAMPTZ, Nullable)
   - `lokasi_kampus` (VARCHAR 255 - Ruangan/Gedung di kampus)
   - `keperluan` (TEXT)
   - `status` (ENUM: `'Pending'`, `'Disetujui'`, `'Ditolak'`, `'Dipinjam'`, `'Selesai'`, `'Dibatalkan'`)
   - `catatan_admin` (TEXT)
   - `approved_by` (UUID, FK -> `users.id`, Nullable)
   - `created_at` (TIMESTAMPTZ)

6. **`borrowings_items`**:
   - `id` (UUID, PK)
   - `borrowing_id` (UUID, FK -> `borrowings.id`)
   - `item_id` (UUID, FK -> `items.id`)
   - `kuantitas` (INTEGER)

7. **`returns`**:
   - `id` (UUID, PK)
   - `borrowing_id` (UUID, FK -> `borrowings.id`, Unique)
   - `petugas_id` (UUID, FK -> `users.id`)
   - `tanggal_kembali` (TIMESTAMPTZ)
   - `kondisi_barang` (ENUM: `'Baik'`, `'Rusak Ringan'`, `'Rusak Berat'`)
   - `denda_keterlambatan` (BOOLEAN / NUMERIC)
   - `catatan_pemeriksaan` (TEXT)

8. **`damage_reports`**:
   - `id` (UUID, PK)
   - `user_id` (UUID, FK -> `users.id`)
   - `item_id` (UUID, FK -> `items.id`)
   - `borrowing_id` (UUID, FK -> `borrowings.id`, Nullable)
   - `tingkat_kerusakan` (VARCHAR 50)
   - `deskripsi_kerusakan` (TEXT)
   - `foto_bukti_url` (TEXT)
   - `status` (ENUM: `'Menunggu Review'`, `'Sedang Diperbaiki'`, `'Selesai'`, `'Ditolak'`)
   - `catatan_tindak_lanjut` (TEXT)
   - `created_at` (TIMESTAMPTZ)

9. **`chats` & `chat_messages`**:
   - `chats`: `id` (UUID, PK), `user_id` (UUID, FK), `admin_id` (UUID, FK, Nullable), `status` (VARCHAR 20)
   - `chat_messages`: `id` (UUID, PK), `chat_id` (UUID, FK), `sender_id` (UUID, FK), `pesan` (TEXT), `lampiran_url` (TEXT), `is_read` (BOOLEAN), `created_at` (TIMESTAMPTZ)

10. **`notifications`**:
    - `id` (UUID, PK), `user_id` (UUID, FK), `judul` (VARCHAR 255), `pesan` (TEXT), `tipe` (VARCHAR 50), `is_read` (BOOLEAN), `created_at` (TIMESTAMPTZ)

---

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 6.1 Keamanan & Kepatuhan (Security)
- **Zero Raw Secret Exposure**: Variabel kredensial database disimpan terenkripsi di server `.env`.
- **RBAC Strict Enforcement**: Middleware Express `requireAuth` dan `requireRole` memeriksa klaim token setiap kali request rute privat dipanggil.
- **Input Sanitization & Schema Validation**: Pustaka `Joi` menolak seluruh payload dengan skema tidak sesuai sebelum mencapai layer controller database.
- **Header Hardening**: `Helmet` terpasang penuh untuk mematikan header `X-Powered-By`, mitigasi XSS, dan Clickjacking (`X-Frame-Options: SAMEORIGIN`).
- **DDoS & Flooding Mitigation**: `express-rate-limit` aktif pada seluruh endpoint publik dan transaksi.

### 6.2 Performa & Skalabilitas (Performance)
- Response time API rata-rata di bawah 200 ms untuk transaksi CRUD standar.
- Latensi broadcast WebSocket Socket.io di bawah 100 ms untuk pengiriman pesan chat dan notifikasi real-time.
- Database index aktif pada kolom pencarian: `kode_barang`, `kode_peminjaman`, `user_id`, `status`.

### 6.3 Kompatibilitas & Tampilan (Usability & UI/UX)
- Antarmuka Frontend Next.js responsif optimal di resolusi Desktop (1920x1080), Laptop (1366x768), dan Tablet Pos Petugas (1024x768).
- Tema: Dukungan Light Theme dan Dark Theme tersimpan di preferensi pengguna.
- Lokalisasi: Dukungan antarmuka Bahasa Indonesia (Bahasa Utama), Bahasa Inggris, dan Bahasa Jawa.

---

## 7. Aturan Bisnis & Penanganan Kondisi Khusus (Edge Cases)

1. **Konflik Peminjaman Bersamaan (Concurrency Collision)**:
   - Jika dua peminjam mengajukan barang terakhir di detik yang sama, sistem menggunakan transaksi database atomik PostgreSQL (`SELECT FOR UPDATE` / decrement check). Pengaju pertama mendapat status `Pending`, pengaju kedua menerima error "Stok barang tidak mencukupi".
2. **Keterlambatan Pengembalian (Overdue Penalty)**:
   - Pengguna yang terlambat mengembalikan barang lebih dari 12 jam tanpa konfirmasi otomatis dibekukan (*suspend*) akunnya dari pengajuan barang lain.
3. **Barang Hilang atau Rusak Berat**:
   - Jika barang dikembalikan dalam kondisi `Rusak Berat` atau `Hilang`, Petugas menginput status tersebut pada form pengembalian.
   - Peminjaman tidak langsung diselesaikan sebelum ada berita acara ganti rugi fisik/biaya perbaikan yang divalidasi oleh Biro Sarpras.
4. **Pembatalan oleh Pengguna**:
   - Peminjam hanya boleh membatalkan pengajuan saat status masih `Pending`. Jika sudah `Disetujui`, pembatalan harus menghubungi Petugas via live chat.

---

## 8. Rencana Rilis & Milestone (Release Phasing)

- **Fase 1 (Selesai)**: Core backend, integrasi database Supabase, CRUD barang/kategori, autentikasi RBAC, transaksi peminjaman & pengembalian dasar.
- **Fase 2 (Selesai)**: UI Admin Next.js, UI User/Mahasiswa, Live Chat Socket.io, Notification Center, Export Laporan Excel.
- **Fase 3 (Pengembangan Mendatang)**:
  - Implementasi Barcode/QR Scanner fisik pada aplikasi mobile/web kamera untuk serah-terima instan di loket sarpras.
  - Integrasi push notification via WhatsApp API ke nomor HP peminjam untuk pengingat jadwal pengembalian otomatis.
