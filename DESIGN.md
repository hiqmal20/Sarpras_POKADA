# DESIGN - SARPRAS POKADA

> **PENTING**: UI/UX design di dokumen ini HANYA boleh diubah berdasarkan screenshot Figma yang dikirimkan oleh user. Jangan berasumsi atau membuat layout/desain sendiri.

## Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.3.3 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Validasi | Zod |
| Form | react-hook-form + zod |
| Icons | lucide-react |
| Export | xlsx |
| Font | Geist Sans, Geist Mono |
| Backend | Express.js 5 + Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT Bearer) |

## Backend Integration
- Base URL: `http://localhost:5000/api`
- Auth header: `Authorization: Bearer <access_token>`
- Response format: `{ status: "success"|"fail"|"error", message, data?, errors? }`

## Data Types (Sync dengan Database Supabase)
```typescript
type Role = "Mahasiswa" | "Dosen" | "Staff" | "Petugas" | "Admin"
type UserStatus = "Aktif" | "Nonaktif" | "Pending"
type ItemCondition = "Baik" | "Rusak Ringan" | "Rusak Berat"
type ItemStatus = "Tersedia" | "Dipinjam" | "Dalam Pemeliharaan"
type BorrowingStatus = "Pending" | "Disetujui" | "Ditolak" | "Dipinjam" | "Dikembalikan" | "Dibatalkan"
type DamageReportStatus = "Menunggu Review" | "Sedang Diperbaiki" | "Selesai" | "Ditolak"

type User = {
  id: string
  email: string
  full_name: string
  nim_nip?: string
  phone?: string
  role: Role
  status: UserStatus
  avatar_url?: string
  created_at: string
}

type Category = {
  id: string
  name: string
  description?: string
  created_at: string
}

type Item = {
  id: string
  code: string
  name: string
  category_id: string
  description?: string
  total_stock: number
  available_stock: number
  location?: string
  condition: ItemCondition
  status: ItemStatus
  image_url?: string
  created_at: string
  category?: Category
}

type Package = {
  id: string
  name: string
  description?: string
  created_at: string
  items?: {
    id: string
    package_id: string
    item_id: string
    quantity: number
    item?: Item
  }[]
}

type Borrowing = {
  id: string
  code: string
  user_id: string
  borrow_date: string
  return_date: string
  purpose: string
  status: BorrowingStatus
  admin_notes?: string
  created_at: string
  user?: User
  items?: {
    id: string
    borrowing_id: string
    item_id: string
    quantity: number
    item?: Item
  }[]
}

type Return = {
  id: string
  borrowing_id: string
  returned_by: string
  return_date: string
  notes?: string
  created_at: string
  borrowing?: Borrowing
}

type DamageReport = {
  id: string
  user_id: string
  borrowing_id?: string
  item_id?: string
  description: string
  photo_url?: string
  status: DamageReportStatus
  admin_notes?: string
  created_at: string
}

type Chat = {
  id: string
  user_id: string
  subject?: string
  created_at: string
}

type ChatMessage = {
  id: string
  chat_id: string
  sender_id: string
  message: string
  attachment_url?: string
  is_read: boolean
  created_at: string
}

type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}
```

## Figma Design Specs
*(Bagian ini akan diisi sesuai screenshot Figma dari user)*

### Halaman yang Tersedia:
- [x] Landing Page (`app/landingpage/page.tsx`) - Selesai
- [ ] Login (`app/auth/login/page.tsx`) - Menunggu Figma
- [ ] Register (`app/auth/register/page.tsx`) - Menunggu Figma
- [ ] Dashboard Admin - Menunggu Figma
- [ ] Dashboard User - Menunggu Figma
- [ ] Katalog Barang / Items - Menunggu Figma
- [ ] Detail Barang - Menunggu Figma
- [ ] Form Peminjaman - Menunggu Figma
- [ ] Riwayat Peminjaman - Menunggu Figma
- [ ] Pengembalian - Menunggu Figma
- [ ] Laporan Kerusakan - Menunggu Figma
- [ ] Live Chat - Menunggu Figma
- [ ] Notifikasi - Menunggu Figma
- [ ] Manajemen User (Admin) - Menunggu Figma
- [ ] Laporan & Export - Menunggu Figma
