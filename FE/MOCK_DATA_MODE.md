# 🎭 Mock Data Mode - SARPRAS POKADA

Aplikasi ini berjalan dalam **Mock Data Mode** untuk development dan demo purposes.

## 📋 Apa itu Mock Data?

Mock data adalah data dummy/contoh yang hardcoded di dalam aplikasi untuk simulasi tanpa perlu koneksi ke backend API atau database real.

## ✅ Keuntungan Mock Data Mode:

1. ✅ **Tidak perlu backend** - Frontend bisa berjalan standalone
2. ✅ **Tidak perlu database** - Semua data sudah hardcoded
3. ✅ **Cepat untuk development** - Tidak perlu setup kompleks
4. ✅ **Perfect untuk demo** - Data konsisten dan predictable
5. ✅ **Easy deployment** - Deploy frontend saja tanpa backend

## 🎯 Mock Data di Setiap Halaman:

### 1. **Dashboard Admin** (`/admin/dashboard_admin`)
- Total Aset: 12,450
- Peminjaman Aktif: 3,892
- Persetujuan Tertunda: 145
- Laporan Kerusakan: 28
- Trend chart dengan data weekly
- Activity log 4 activities
- Pending approvals: 3 items

### 2. **Manage Users** (`/admin/manajemen_user`)
- Total Users: 124
- Active Admins: 8
- Inactive Accounts: 3
- Sample users:
  - Sarah Jenkins (Admin, Active)
  - Michael Chen (User, Active)
  - Amanda Lee (User, Inactive)

### 3. **Manajemen Peminjaman** (`/admin/manajemen_peminjaman`)
- Perlu Divalidasi: 12
- Sedang Dipinjam: 45
- Terlambat: 3
- Sample borrowings:
  - MacBook Pro M2 (Pending)
  - Proyektor Epson G500 (Active)
  - Lensa Canon 50mm (Overdue)

### 4. **Pengembalian** (`/admin/pengembalian`)
- Menunggu Pengembalian: 24
- Terlambat: 5
- Dikembalikan Hari Ini: 12
- Sample returns:
  - Projector Epson EB-X51 (Overdue, Rp 50.000)
  - Kamera Canon 90D (Due Today)
  - Logitech Presenter R400 (Active)

### 5. **Rekap Laporan** (`/admin/rekap_laporan`)
- Total Laporan: 124
- Menunggu Perbaikan: 18
- Selesai Diperbaiki: 106
- Sample reports:
  - Proyektor Epson (Pending)
  - Kamera Canon 90D (In Progress)
  - Laptop Thinkpad T14 (Resolved)

### 6. **Kategori Barang** (`/admin/kategori_barang`)
- Total Categories: 8
- Sample categories:
  - Electronics (245 items)
  - Office Supplies (189 items)
  - Furniture (67 items)

## 🔧 Konfigurasi:

### File `.env.local`:
```env
# Mock Data Mode Enabled
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### File `lib/api.tsx`:
- `USE_MOCK_DATA` flag untuk detect mock mode
- `apiFetch()` function returns "fail" status di mock mode
- Setiap halaman punya fallback ke mock data

## 🚀 Cara Menjalankan:

```bash
cd "d:\project pkl pokada\project-fe\my-app"
npm install
npm run dev
```

Buka browser: `http://localhost:3000`

## 📝 Struktur Mock Data:

Setiap halaman punya konstanta mock data:

```typescript
// Example di manajemen_user/page.tsx
const mockUsers: User[] = [
  { 
    id: "1", 
    full_name: "Sarah Jenkins", 
    email: "sarah.j@company.com", 
    department: "IT Support",  
    role: "admin", 
    status: "active"   
  },
  // ... more users
];
```

## 🔄 Cara Kerja Fallback:

```typescript
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const res = await api.users.getAll({ page, limit: PAGE_SIZE });
    
    if (res.status === "success") {
      // Use real data from API
      setUsers(res.data);
    } else {
      // Fallback to mock data (ALWAYS in mock mode)
      setUsers(mockUsers);
      setTotal(124);
    }
    
    setLoading(false);
  }
  fetchData();
}, [page]);
```

## 🎨 Fitur yang Bekerja dengan Mock Data:

### ✅ Fully Functional:
- ✅ Navigation antar halaman
- ✅ Search (filter mock data)
- ✅ Pagination (simulate pagination)
- ✅ Filter by status/role
- ✅ Sorting
- ✅ UI animations
- ✅ Responsive layout
- ✅ All visualizations

### ⚠️ Simulated (Tidak Persist):
- ⚠️ Create new item (hanya update state, tidak save)
- ⚠️ Update item (hanya update state, tidak save)
- ⚠️ Delete item (hanya update state, tidak save)
- ⚠️ Login (mock authentication, tidak real)

### ❌ Tidak Bekerja:
- ❌ Real-time updates
- ❌ Data persistence (refresh = reset)
- ❌ Multi-user collaboration
- ❌ File upload/download
- ❌ Email notifications

## 🔀 Switch ke Real Backend (Future):

Jika nanti ingin connect ke backend real:

1. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_USE_MOCK_DATA=false
   NEXT_PUBLIC_API_URL=http://your-backend-url/api
   ```

2. **Restart frontend:**
   ```bash
   npm run dev
   ```

3. **Setup CORS di backend**

4. **Test connection**

## 📦 Deploy Frontend Only:

Karena mock data mode, bisa deploy frontend saja:

### Deploy ke Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy ke Netlify:

```bash
# Build
npm run build

# Upload folder "out" atau ".next" ke Netlify
```

## 🎯 Use Cases Mock Data Mode:

1. **Development** - Develop UI tanpa backend dependency
2. **Demo/Presentation** - Show fitur tanpa setup kompleks
3. **Testing** - Test UI logic dengan data konsisten
4. **Prototyping** - Quick prototype sebelum backend ready
5. **Training** - Training user dengan data dummy

## 📊 Mock Data Statistik:

| Halaman | Mock Items | Total Count |
|---------|------------|-------------|
| Users | 3 | 124 |
| Borrowings | 3 | 45 |
| Returns | 3 | 24 |
| Damage Reports | 3 | 124 |
| Categories | 8 | 8 |
| Dashboard Stats | 4 cards | - |

## 🔐 Mock Authentication:

Login tidak memerlukan credentials real. Bisa login dengan email apapun:
- Tidak validate password
- Tidak check database
- Generate mock token
- Redirect ke dashboard

## ⚡ Performance:

Mock data mode = **SANGAT CEPAT**:
- ✅ Tidak ada network latency
- ✅ Tidak ada database query time
- ✅ Instant response
- ✅ Tidak ada loading delay (bisa simulate jika perlu)

## 🎓 Best Practices:

1. **Keep mock data realistic** - Gunakan data yang realistic untuk demo
2. **Maintain consistency** - Mock data harus konsisten antar halaman
3. **Update regularly** - Update mock data jika ada perubahan struktur
4. **Document well** - Document mock data structure untuk team
5. **Easy switch** - Mudah switch antara mock dan real data

## 📞 Support:

Jika perlu bantuan atau ingin upgrade ke real backend, dokumentasi tersedia di `MIGRATION_GUIDE.md`

---

**Mode:** Mock Data Only 🎭
**Status:** Production Ready for Demo
**Last Updated:** $(Get-Date -Format "yyyy-MM-dd")
