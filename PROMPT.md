# PROMPT - SARPRAS POKADA

## Konteks Project
Ini adalah **frontend** aplikasi **SARPRAS POKADA** (Sarana Prasarana - Peminjaman Online Kampus Daring).
Frontend Next.js 16 yang terhubung ke backend Express.js 5 + Supabase di `http://localhost:5000/api`.
Target user: Mahasiswa, Dosen, Staff, Petugas, dan Admin kampus.

## Batasan Konteks
Semua development HARUS dalam scope berikut:
- Manajemen sarana prasarana kampus (items & categories CRUD)
- Paket bundling sarpras (packages)
- Peminjaman & pengembalian barang kampus (borrowings & returns)
- Laporan kerusakan (damage reports)
- Live chat konsultasi
- Notifikasi sistem
- Dashboard & laporan statistik
- Manajemen pengguna (admin only)
- Export data ke Excel

JANGAN keluar dari konteks ini. Bukan e-commerce, bukan rental umum, bukan marketplace.
Ini sistem internal kampus.

## Backend API Reference
Base URL: `http://localhost:5000/api`
Auth: `Authorization: Bearer <supabase_jwt_token>`

### Response Format
```json
// Sukses
{ "status": "success", "message": "...", "data": {...} }

// Error validasi (4xx)
{ "status": "fail", "message": "...", "errors": [{"field": "email", "message": "..."}] }

// Error server (5xx)
{ "status": "error", "message": "..." }
```

### API Endpoints
| Module | Path | Methods |
|--------|------|---------|
| Auth | `/api/auth/register, login, me, logout` | POST, GET |
| Users | `/api/users` | GET, POST, PUT, DELETE |
| Categories | `/api/categories` | GET, POST, PUT, DELETE |
| Items | `/api/items` | GET, POST, PUT, DELETE |
| Packages | `/api/packages` | GET, POST, PUT, DELETE |
| Borrowings | `/api/borrowings` | GET, POST, PATCH |
| Returns | `/api/returns` | GET, POST |
| Damage Reports | `/api/damage-reports` | GET, POST, PATCH |
| Chats | `/api/chats` | GET, POST, PATCH |
| Notifications | `/api/notifications` | GET, POST, PATCH, DELETE |
| Dashboard | `/api/dashboard` | GET |

### Roles (5 level)
`Mahasiswa` | `Dosen` | `Staff` | `Petugas` | `Admin`

### Status Peminjaman
`Pending` -> `Disetujui` / `Ditolak` -> `Dipinjam` -> `Dikembalikan` | `Dibatalkan`

### Kondisi Barang
`Baik` | `Rusak Ringan` | `Rusak Berat`

## Aturan Pengembangan

### Umum
- Bahasa UI: Indonesia
- Kode & variabel: Inggris
- Nama field tampil ke user: Indonesia
- Semua data dari backend, FE tidak akses Supabase langsung

### Komponen & Halaman
- Gunakan shadcn/ui untuk semua komponen UI (setelah diinstall)
- Sebelum shadcn/ui diinstall, gunakan Tailwind CSS native
- Server Component default, "use client" hanya jika ada interaktivitas
- Setiap halaman punya loading.tsx dan error.tsx
- Form menggunakan react-hook-form + zod validation

### Fetch Data ke Backend
- Buat helper di `lib/api.ts` untuk fetch ke BE
- Selalu sertakan `Authorization: Bearer <token>` untuk endpoint privat
- Handle response sesuai format BE: cek `status === "success"`
- Handle error: tampilkan `message` atau `errors[]` ke user via toast

### Autentikasi
- Login via POST `/api/auth/login` (email + password)
- Register via POST `/api/auth/register`
- Token JWT dari Supabase Auth, simpan di httpOnly cookie
- Cek user aktif via GET `/api/auth/me`
- Middleware Next.js untuk proteksi route dashboard
- Role-based sidebar menu (Admin lihat semua, Mahasiswa lihat peminjaman saja)

### Halaman per Role
**Admin & Petugas**: Dashboard, Items, Kategori, Paket, Peminjaman (approve/reject), Pengembalian, Kerusakan, Chat, Notifikasi, Pengguna, Laporan
**Dosen & Staff**: Dashboard (terbatas), Items (browse), Peminjaman (ajukan & riwayat), Kerusakan (lapor), Chat, Notifikasi
**Mahasiswa**: Items (browse), Peminjaman (ajukan & riwayat), Kerusakan (lapor), Chat, Notifikasi

### Peminjaman
- Auto-code dari BE: PJ-YYYYMMDD-XXXX
- User pilih items + quantity, tanggal pinjam & kembali, keperluan
- BE otomatis kurangi available_stock saat diajukan
- Admin/Petugas approve/reject via PATCH `/api/borrowings/:id/status`
- Jika ditolak/dibatalkan, stok otomatis kembali (handled by BE)

### Pengembalian
- Hanya Admin/Petugas yang proses return via POST `/api/returns`
- BE otomatis update status borrowing ke "Dikembalikan" dan restore stok

### Laporan Kerusakan
- User bisa lapor kerusakan POST `/api/damage-reports`
- Admin update status PATCH `/api/damage-reports/:id/status`
- Jika item_id disertakan, BE auto-update kondisi barang

### Laporan & Export
- Filter: periode, kategori, status
- Export ke Excel menggunakan library xlsx (sudah diinstall di FE)
- Data dari BE endpoints dengan query params filter

## Template Prompt untuk Fitur Baru

### Membuat Halaman Baru
```
Buat halaman [nama] di app/(dashboard)/[path]/page.tsx untuk SARPRAS POKADA.
Fungsi: [deskripsi singkat].
Data dari BE: [endpoint].
Role yang bisa akses: [role].
Gunakan shadcn/ui components.
```

### Membuat Komponen
```
Buat komponen [nama] di components/[folder]/[nama].tsx.
Props: [list props].
Gunakan shadcn/ui [komponen yang dipakai].
```

### Integrasi API
```
Buat fungsi fetch di lib/api.ts untuk [endpoint].
Method: [GET/POST/PUT/PATCH/DELETE].
Request body / query params: [detail].
Handle response: { status, message, data }.
```
