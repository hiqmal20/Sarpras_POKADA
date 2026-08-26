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

Buat file `.env` berdasarkan `.env.example`, kemudian masukkan konfigurasi yang diperlukan.

Jalankan project dalam mode development:

```bash
npm run dev
```

## Struktur Project

```text
project/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── constants/
│   ├── controller/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validations/
│   ├── .env.example
│   ├── .gitignore
│   ├── PROJECT_DOCUMENTATION.md
│   ├── README.md
│   ├── app.js
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

## Struktur Backend

```text
backend/
│
├── config/
│   └── Konfigurasi aplikasi dan koneksi yang diperlukan
│
├── constants/
│   └── Konstanta yang digunakan dalam aplikasi
│
├── controller/
│   └── Menangani request dan response dari setiap fitur
│
├── middleware/
│   └── Middleware untuk autentikasi, validasi, dan kebutuhan lainnya
│
├── routes/
│   └── Mendefinisikan endpoint API
│
├── services/
│   └── Berisi business logic aplikasi
│
├── utils/
│   └── Fungsi-fungsi helper yang digunakan kembali
│
├── validations/
│   └── Validasi data request
│
├── .env.example
├── .gitignore
├── PROJECT_DOCUMENTATION.md
├── README.md
├── app.js
├── package.json
└── package-lock.json
```

## Environment Variables

Gunakan `.env.example` sebagai referensi untuk membuat file `.env`.

Contoh:

```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

Jangan memasukkan file `.env` ke repository GitHub karena dapat berisi informasi rahasia.

## Database

Database menggunakan Supabase dengan PostgreSQL untuk menyimpan data:

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

Developer

Project Sarpras POKADA dikembangkan sebagai sistem informasi sarana dan prasarana untuk mendukung proses peminjaman dan pengelolaan barang.

License

Project ini dibuat untuk kebutuhan pengembangan dan pembelajaran.
