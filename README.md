# Sistem Peminjaman Barang

Aplikasi web untuk mempermudah proses peminjaman, pengembalian, dan pengelolaan barang.

## Fitur

### User

* Register dan Login
* Melihat daftar barang
* Melihat paket barang
* Melakukan peminjaman barang
* Melihat detail peminjaman
* Melihat riwayat peminjaman
* Chat dengan admin
* Mengelola profile
* Mengubah nama, email, dan password

### Admin

* Dashboard
* Mengelola barang
* Mengelola kategori barang
* Mengelola akun user
* Mengelola peminjaman
* Mengelola pengembalian
* Membuat laporan barang rusak atau hilang
* Melihat rekap laporan
* Mengelola profile

## Teknologi

### Frontend

* Next.js
* Tailwind CSS

### Backend

* Node.js
* Express.js
* JWT

### Database

* Supabase
* PostgreSQL

## Instalasi

Clone repository:

```bash
git clone <URL-REPOSITORY>
```

Masuk ke folder project:

```bash
cd nama-project
```

Install dependency:

```bash
npm install
```

Buat file `.env` dan masukkan konfigurasi yang diperlukan.

Jalankan project dalam mode development:

```bash
npm run dev
```

## Struktur Project

```text
project/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   └── package.json
│
├── .gitignore
└── README.md
```

## Environment Variables

Contoh konfigurasi:

```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

Jangan memasukkan file `.env` ke repository GitHub.

## Database

Database menggunakan Supabase untuk menyimpan data:

* User/Profile
* Barang
* Kategori Barang
* Paket Barang
* Peminjaman
* Detail Peminjaman
* Pengembalian
* Laporan Kerusakan
* Laporan Kehilangan
* Chat

## Git Workflow

Sebelum mulai mengerjakan fitur:

```bash
git pull origin main
```

Buat branch baru:

```bash
git checkout -b feature/nama-fitur
```

Setelah selesai:

```bash
git add .
git commit -m "feat: menambahkan nama fitur"
git push origin feature/nama-fitur
```

Kemudian buat Pull Request untuk menggabungkan branch ke `main`.

## Developer

Project ini dibuat untuk kebutuhan pengembangan sistem peminjaman barang.
