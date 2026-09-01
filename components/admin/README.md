# Admin Components

Komponen reusable untuk halaman admin SARPRAS POKADA dengan desain sederhana dan clean.

## Struktur Folder

```
components/admin/
├── AdminLayout.tsx   # Layout wrapper utama
├── Sidebar.tsx       # Sidebar navigasi (fixed width)
├── Navbar.tsx        # Top navbar dengan notifications
├── index.ts          # Export barrel file
└── README.md         # Dokumentasi ini
```

## Cara Penggunaan

### 1. Import AdminLayout

```tsx
import { AdminLayout } from "@/components/admin";

export default function YourAdminPage() {
  return (
    <AdminLayout>
      {/* Konten halaman Anda di sini */}
      <div>
        <h1>Dashboard</h1>
        {/* ... */}
      </div>
    </AdminLayout>
  );
}
```

### 2. Features

#### Sidebar
- ✅ Fixed width 256px (w-64)
- ✅ White background dengan border
- ✅ Auto-highlight active page berdasarkan pathname
- ✅ Navigasi lengkap ke semua halaman admin
- ✅ User info di bagian bawah dengan avatar
- ✅ Logo SARPRAS POKADA di header
- ✅ Sticky positioning
- ✅ Active state dengan background biru

#### Navbar
- ✅ Simple top bar dengan notifikasi
- ✅ Notification bell dengan badge indicator
- ✅ Settings button
- ✅ User avatar
- ✅ White background

#### AdminLayout
- ✅ Flex layout (sidebar + content area)
- ✅ Sidebar fixed 256px
- ✅ Main content mengambil sisa ruang
- ✅ Gray-50 background
- ✅ Proper spacing dan overflow handling

## Design System

### Colors
- **Primary**: `#0785BC` (brand blue)
- **Background**: `bg-gray-50`
- **Sidebar**: `bg-white`
- **Active State**: `bg-[#0785BC] text-white`
- **Hover**: `bg-gray-50`
- **Border**: `border-gray-200`

### Typography
- **Header**: Bold, `text-[#0785BC]`
- **Nav Items**: `text-sm font-medium`
- **Active**: `font-medium text-white`

### Spacing
- Sidebar width: `w-64` (256px)
- Navbar height: `h-16` (64px)
- Content padding: `p-6`

## Customization

### Menambah Menu Sidebar

Edit file `Sidebar.tsx`:

```tsx
const navItems = [
  { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/new_page", label: "Halaman Baru", icon: YourIcon },
  // ... tambahkan item baru
];
```

### Mengubah User Info

Edit bagian footer di `Sidebar.tsx`:

```tsx
<div className="px-4 py-4 border-t border-gray-100">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-full bg-gray-200">
      {/* Avatar */}
    </div>
    <div>
      <p className="text-sm font-semibold">Your Name</p>
      <p className="text-xs text-gray-500">Your Role</p>
    </div>
  </div>
</div>
```

## Pages yang Sudah Menggunakan

- ✅ `/admin/manajemen_peminjaman`

## Todo: Pages yang Perlu Diupdate

- [ ] `/admin/dashboard_admin`
- [ ] `/admin/pengembalian`
- [ ] `/admin/manajemen_user`
- [ ] `/admin/rekap_laporan`
- [ ] `/admin/kategori_barang`

## Migration Guide

Untuk mengubah halaman existing:

1. **Hapus** sidebar dan navbar code dari halaman
2. **Import** AdminLayout: `import { AdminLayout } from "@/components/admin";`
3. **Wrap** konten dengan `<AdminLayout>`
4. **Hapus** unused imports
5. **Test** navigasi dan styling

### Before
```tsx
export default function Page() {
  return (
    <div className="flex min-h-screen">
      <aside>{/* Sidebar code */}</aside>
      <main>
        <header>{/* Navbar code */}</header>
        <div>{/* Your content */}</div>
      </main>
    </div>
  );
}
```

### After
```tsx
import { AdminLayout } from "@/components/admin";

export default function Page() {
  return (
    <AdminLayout>
      {/* Your content only */}
    </AdminLayout>
  );
}
```

## Benefits

- ✅ **DRY**: Tidak perlu copy-paste sidebar & navbar
- ✅ **Consistent**: Semua halaman admin punya layout yang sama
- ✅ **Maintainable**: Update sidebar/navbar di satu tempat
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Clean Design**: Mengikuti design system SARPRAS POKADA
- ✅ **Simple**: Tidak ada kompleksitas collapse/expand yang tidak perlu

