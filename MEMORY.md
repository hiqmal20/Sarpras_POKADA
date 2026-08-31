# MEMORY - SARPRAS POKADA Frontend

## Project Overview
- Nama: SARPRAS POKADA (Sarana Prasarana - Peminjaman Online Kampus Daring)
- Tipe: Aplikasi peminjaman sarana prasarana kampus
- Stack FE: Next.js 16.3.3, React 19, TypeScript 5, Tailwind CSS v4
- Stack BE: Express.js 5, Supabase (PostgreSQL), Joi, Helmet, node-cron
- Dependencies FE: lucide-react, xlsx
- Path alias: `@/*` -> `./*`
- Backend URL: `http://localhost:5000/api`
- Auth: Supabase Auth (JWT Bearer token)

## Backend API Summary
Base URL: `http://localhost:5000/api`
Response format: `{ status: "success"|"fail"|"error", message, data?, errors? }`

### Endpoints
- `/api/auth` - register, login, me, logout
- `/api/users` - CRUD user (Admin only list/delete)
- `/api/categories` - CRUD kategori sarpras
- `/api/items` - CRUD barang/aset (search, filter, pagination)
- `/api/packages` - CRUD paket bundling sarpras
- `/api/borrowings` - Ajukan & kelola peminjaman (auto-code PJ-xxx)
- `/api/returns` - Proses pengembalian barang
- `/api/damage-reports` - Laporan kerusakan/kehilangan
- `/api/chats` - Live chat konsultasi
- `/api/notifications` - Notifikasi sistem
- `/api/dashboard` - Dashboard stats

### Roles (dari BE)
Mahasiswa, Dosen, Staff, Petugas, Admin

### Status Constants (dari BE)
- Borrowing: Pending, Disetujui, Ditolak, Dipinjam, Dikembalikan, Dibatalkan
- Item Condition: Baik, Rusak Ringan, Rusak Berat
- Item Status: Tersedia, Dipinjam, Dalam Pemeliharaan
- Damage Report: Menunggu Review, Sedang Diperbaiki, Selesai, Ditolak
- User Status: Aktif, Nonaktif, Pending

## Struktur FE Saat Ini
```
app/
  page.tsx              # Default Next.js page (belum dimodifikasi)
  layout.tsx            # Root layout, Geist font
  globals.css           # Tailwind v4 import, CSS variables
  landingpage/page.tsx  # Landing page utama (selesai)
  auth/
    login/page.tsx      # Kosong
    register/page.tsx   # Kosong
  api/
    auth/
      login/route.ts    # Kosong
      register/route.ts # Kosong
```

## Keputusan Arsitektur
- Menggunakan App Router (Next.js)
- Font: Geist Sans & Geist Mono
- Warna utama: Blue-600 (primary), tema light/dark via CSS variables
- Bahasa UI: Indonesia
- Mobile-first responsive design
- FE sebagai client, BE terpisah di Express.js port 5000
- Auth via Supabase JWT, simpan token di httpOnly cookie
- Skills installed: frontend-design, caveman, shadcn, ai-sdk (di .agents/skills/)

## Catatan Percakapan

### Session 1
- Landing page dibuat presisi sesuai screenshot Figma: warna konsisten `#0785BC` di seluruh komponen (navbar, tombol, cards, footer, banner, border, icon badges).
- Fitur navigasi diperbaiki:
  - ScrollSpy otomatis via `IntersectionObserver` agar indikator underline bergerak dinamis mengikuti posisi scroll.
  - Smooth animated underline dengan scale-x & transition CSS.
  - Klik nav item langsung smooth scrolling dengan kompensasi offset header (-80px).
  - Transisi accordion FAQ halus tanpa patah-patah via CSS Grid (`grid-rows-[0fr]` -> `grid-rows-[1fr]`).
  - Mobile menu drawer slide-in transisi halus.
- Remote image domain `images.unsplash.com` dikonfigurasi di `next.config.ts`.
- Package `@supabase/supabase-js` diinstall di FE.
- Dibuat `lib/db.js`: Client Supabase yang terhubung langsung ke database Postgres Supabase POKADA.
- Dibuat `lib/api.tsx`: API client lengkap yang mencakup 11 modul endpoint backend Express.js (auth, users, categories, items, packages, borrowings, returns, damage-reports, chats, notifications, dashboard) + auth token management.
- File `.env.local` dibuat untuk frontend.
- File konfigurasi: AGENTS.md, MEMORY.md, SKILLS.md, DESIGN.md, PROMPT.md sinkron dengan BE Express.js 5 + Supabase.
- Skills dari skills.sh diinstall: frontend-design, caveman, shadcn, ai-sdk.

## Yang Belum Dikerjakan
- [ ] Install & setup shadcn/ui
- [ ] Install zod untuk validasi
- [ ] Halaman login & register (connect ke /api/auth)
- [ ] Dashboard admin (connect ke /api/dashboard)
- [ ] Dashboard user (mahasiswa/dosen)
- [ ] CRUD kategori (connect ke /api/categories)
- [ ] CRUD sarana/items (connect ke /api/items)
- [ ] CRUD paket sarpras (connect ke /api/packages)
- [ ] Peminjaman (connect ke /api/borrowings)
- [ ] Pengembalian (connect ke /api/returns)
- [ ] Laporan kerusakan (connect ke /api/damage-reports)
- [ ] Live chat (connect ke /api/chats)
- [ ] Notifikasi (connect ke /api/notifications)
- [ ] Manajemen user (connect ke /api/users)
- [ ] Laporan & export Excel (xlsx)

## Konvensi Kode
- Komponen: PascalCase
- File page: `page.tsx` di folder route
- API route: `route.ts` di `app/api/` (proxy ke BE)
- "use client" hanya jika butuh interaktivitas
- Tailwind utility classes, tanpa CSS modules
- Lucide icons untuk iconography
