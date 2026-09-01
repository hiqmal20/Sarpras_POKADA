# ✅ Checklist: Menghubungkan Frontend ke Database

## 🎯 Goal
Menghubungkan frontend Next.js dengan backend API yang terhubung ke Supabase

---

## Step 1: Persiapan Backend ⚙️

### ☐ 1.1 Pastikan Backend Berjalan

```bash
# Buka folder backend
cd path/to/your/backend

# Jalankan backend
npm start
# atau
node index.js
```

**Expected Output:**
```
Server running on port 5000
Connected to Supabase
```

### ☐ 1.2 Check Port Backend

Backend HARUS di port **BERBEDA** dari frontend:
- ✅ Frontend: `http://localhost:3000` (Next.js default)
- ✅ Backend: `http://localhost:5000` (atau 3001, 8000, dll)

**Cek file backend** (`index.js` atau `server.js`):
```javascript
const PORT = process.env.PORT || 5000; // Pastikan bukan 3000!
```

### ☐ 1.3 Setup CORS di Backend

Backend harus allow request dari frontend. **Tambahkan di backend:**

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));
```

Jika belum install cors:
```bash
npm install cors
```

### ☐ 1.4 Test Backend API

Buka browser atau Postman, test:

```
GET http://localhost:5000/api/users
GET http://localhost:5000/api/categories
GET http://localhost:5000/api/borrowings
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "1",
      "full_name": "John Doe",
      "email": "john@example.com",
      ...
    }
  ],
  "total": 10
}
```

---

## Step 2: Konfigurasi Frontend 🖥️

### ☐ 2.1 Update .env.local (SUDAH DILAKUKAN ✅)

File `.env.local` sudah dibuat dengan:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**⚠️ IMPORTANT:** Jika backend Anda di port LAIN (bukan 5000), update file ini!

### ☐ 2.2 Restart Frontend

Setelah update `.env.local`, **WAJIB restart** frontend:

```bash
# Stop server (Ctrl+C di terminal)
# Lalu jalankan lagi:
npm run dev
```

### ☐ 2.3 Check Environment Variable Loaded

Buka `lib/api.tsx` dan cek console log (temporary):

Tambahkan di awal file:
```typescript
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL);
```

Buka browser, tekan F12 (Developer Tools), cek Console tab.
Harus muncul: `API Base URL: http://localhost:5000/api`

---

## Step 3: Test Connection 🧪

### ☐ 3.1 Jalankan Kedua Server

**Terminal 1 - Backend:**
```bash
cd path/to/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd "d:\project pkl pokada\project-fe\my-app"
npm run dev
```

### ☐ 3.2 Test Login

1. Buka `http://localhost:3000/auth/login`
2. Login dengan akun yang ada di database
3. Check browser console (F12) untuk error

**Expected:** 
- ✅ Login berhasil
- ✅ Redirect ke dashboard
- ✅ Token tersimpan di localStorage

### ☐ 3.3 Test Data Real di Halaman Admin

Buka halaman-halaman ini dan cek apakah data real muncul:

1. **Manage Users:** `http://localhost:3000/admin/manajemen_user`
   - ✅ Tampil daftar user dari database
   - ✅ Total users sesuai database
   - ✅ Search berfungsi

2. **Manajemen Peminjaman:** `http://localhost:3000/admin/manajemen_peminjaman`
   - ✅ Tampil data peminjaman dari database
   - ✅ Filter by status berfungsi

3. **Kategori Barang:** `http://localhost:3000/admin/kategori_barang`
   - ✅ Tampil categories dari database

4. **Dashboard:** `http://localhost:3000/admin/dashboard_admin`
   - ✅ Stats angka sesuai data real
   - ✅ Chart menampilkan data real

---

## Step 4: Troubleshooting 🔧

### ❌ Problem: Data masih mock, bukan real

**Check:**
1. ☐ Backend running? (cek terminal backend)
2. ☐ Port benar di `.env.local`?
3. ☐ Sudah restart frontend setelah update `.env.local`?
4. ☐ CORS di-enable di backend?

**Debug:**
```javascript
// Buka browser console (F12), cek error:
// - CORS error? → Setup CORS di backend
// - 404 error? → Check API URL dan routes
// - 500 error? → Check backend logs
```

### ❌ Problem: CORS Error

**Error di console:**
```
Access to fetch at 'http://localhost:5000/api/users' from origin 
'http://localhost:3000' has been blocked by CORS policy
```

**Fix:** Add CORS to backend:
```javascript
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' }));
```

### ❌ Problem: Port 5000 already in use

**Solutions:**

**Option A:** Kill process di port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

**Option B:** Ganti port backend
```javascript
// Di backend
const PORT = process.env.PORT || 5001; // Ganti ke 5001

// Update .env.local frontend
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### ❌ Problem: Token Invalid / Unauthorized

**Check:**
1. ☐ Token tersimpan di localStorage? (F12 → Application → Local Storage)
2. ☐ Token format benar? Harus: `Bearer {token}`
3. ☐ Token belum expired?

**Fix:**
- Logout dan login ulang
- Clear localStorage: `localStorage.clear()`

---

## Step 5: Verify Success ✅

### Checklist Sukses:

- ☐ Backend running tanpa error
- ☐ Frontend running tanpa error  
- ☐ Login berhasil dengan akun database
- ☐ **Halaman Manage Users menampilkan data REAL** (bukan mock)
- ☐ **Total users sesuai jumlah di database** (bukan hardcoded 124)
- ☐ **Search bar berfungsi** (search di database)
- ☐ **Pagination berfungsi** (fetch page baru dari database)
- ☐ Console browser tanpa error CORS atau 404

---

## 📊 Status Indicators

### Data REAL (✅ Sukses):
```
Showing 1 to 10 of 156 entries  ← Angka real dari database
```

### Data MOCK (❌ Masih mock):
```
Showing 1 to 10 of 124 entries  ← Hardcoded 124 = mock data
```

---

## 🎉 Next Steps After Success

Setelah koneksi berhasil:

1. ☐ Test semua CRUD operations:
   - Create new user
   - Update user
   - Delete user
   - etc

2. ☐ Test semua halaman admin lainnya

3. ☐ Deploy ke production:
   - Update `NEXT_PUBLIC_API_URL` ke production URL
   - Deploy backend ke hosting (Heroku, Railway, Render, dll)
   - Deploy frontend ke Vercel

---

## 📞 Need Help?

Jika masih ada masalah:

1. **Check browser console** (F12 → Console tab)
2. **Check backend terminal** untuk error logs
3. **Check Network tab** (F12 → Network) untuk inspect API requests

**Common Issues:**
- CORS error → Setup CORS di backend
- 404 error → Check API routes
- 401 error → Token invalid/expired
- 500 error → Backend/database error

---

**Dibuat:** $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Status:** Ready to test! 🚀
