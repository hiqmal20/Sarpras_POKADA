# Migration Guide: Update Admin Pages to Use AdminLayout

## ✅ Sudah Selesai

- [x] `/admin/manajemen_peminjaman`
- [x] `/admin/kategori_barang`

## 📝 Belum Selesai

- [ ] `/admin/dashboard_admin`
- [ ] `/admin/manajemen_user`
- [ ] `/admin/pengembalian`
- [ ] `/admin/rekap_laporan`

## 🔧 Langkah-langkah Migration

### 1. Buka file page yang ingin diupdate

Contoh: `app/admin/manajemen_user/page.tsx`

### 2. Hapus import yang tidak diperlukan

**Hapus:**
```tsx
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  Users,
  AlertTriangle,
  Tag,
  Bell,
  Settings,
  // ... icon navbar & sidebar lainnya
} from "lucide-react";
```

**Tambahkan:**
```tsx
import { AdminLayout } from "@/components/admin";
```

### 3. Hapus definisi navItems

Hapus ini:
```tsx
const navItems = [
  { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
  // ...
];
```

### 4. Hapus Sidebar JSX

Cari dan hapus seluruh block `<aside>` dengan class `w-56 shrink-0 bg-white`:

```tsx
{/* ── Sidebar ── */}
<aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between sticky top-0 h-screen">
  {/* ... seluruh isi sidebar ... */}
</aside>
```

### 5. Hapus Navbar/Topbar JSX

Cari dan hapus `<header>` dengan class `bg-white border-b`:

```tsx
{/* Topbar */}
<header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center gap-3 sticky top-0 z-10">
  {/* ... seluruh isi topbar ... */}
</header>
```

### 6. Update return statement

**Before:**
```tsx
return (
  <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
    {/* ── Sidebar ── */}
    <aside>...</aside>

    {/* ── Main ── */}
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <header>...</header>

      <div className="p-8">
        {/* Konten halaman */}
      </div>
    </main>
  </div>
);
```

**After:**
```tsx
return (
  <AdminLayout>
    <div className="space-y-6">
      {/* Konten halaman langsung di sini */}
    </div>
  </AdminLayout>
);
```

### 7. Pindahkan konten ke dalam AdminLayout

Ambil semua konten yang ada di dalam `<div className="p-8">` dan pindahkan ke dalam `<AdminLayout>`.

### 8. Update search bar (jika ada)

Jika halaman memiliki search bar di topbar, pindahkan ke dalam konten halaman:

```tsx
<div className="relative max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
  <input
    type="text"
    placeholder="Cari..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
  />
</div>
```

## 📋 Checklist untuk Setiap Halaman

- [ ] Import `AdminLayout` dari `@/components/admin`
- [ ] Hapus import yang tidak diperlukan (Link, icon navbar/sidebar)
- [ ] Hapus `navItems` constant
- [ ] Hapus `<aside>` (sidebar)
- [ ] Hapus `<header>` (topbar)
- [ ] Wrap konten dengan `<AdminLayout>`
- [ ] Pindahkan search bar ke dalam konten (jika ada)
- [ ] Update grid responsif jika perlu (`grid-cols-3` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- [ ] Test halaman di browser
- [ ] Verify tidak ada TypeScript errors

## 🎯 Contoh Lengkap

Lihat file berikut sebagai referensi:
- ✅ `app/admin/manajemen_peminjaman/page.tsx`
- ✅ `app/admin/kategori_barang/page.tsx`

## 🚨 Common Issues

### Issue: "AdminLayout is not defined"
**Solution:** Pastikan import statement benar:
```tsx
import { AdminLayout } from "@/components/admin";
```

### Issue: Layout terlihat berbeda
**Solution:** Pastikan tidak ada wrapper `<div className="flex min-h-screen">` di luar `<AdminLayout>`

### Issue: Grid tidak responsif
**Solution:** Update grid classes:
```tsx
// Before
<div className="grid grid-cols-3 gap-5">

// After  
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
```

## 💡 Tips

1. **Work incrementally**: Update satu halaman dalam satu waktu
2. **Test immediately**: Test setiap halaman setelah migration
3. **Keep backup**: Jika perlu, backup file original sebelum migration
4. **Use pattern matching**: Semua halaman admin punya struktur yang mirip

## ✨ Benefits Setelah Migration

- ✅ Konsisten di semua halaman
- ✅ Mudah maintain (update sidebar/navbar di 1 tempat)
- ✅ Code lebih bersih dan fokus ke logic halaman
- ✅ Responsive by default
- ✅ Type-safe dengan TypeScript
