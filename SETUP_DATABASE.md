# Setup Database Connection - SARPRAS POKADA

## 📋 Prerequisites

1. **Backend API** sudah berjalan dengan controllers lengkap ✅
2. **Supabase Database** sudah setup ✅
3. **Frontend Next.js** (folder ini)

## 🔧 Konfigurasi

### 1. Port Configuration

**PENTING:** Backend dan Frontend harus berjalan di port berbeda!

- **Frontend (Next.js)**: `http://localhost:3000`
- **Backend (Express/Node)**: `http://localhost:5000` atau port lain

### 2. Environment Variables

File `.env.local` sudah dibuat dengan konfigurasi:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Jika backend Anda di port lain**, ubah sesuai port backend Anda.

### 3. Update Backend Port (Jika Perlu)

Buka file backend Anda (biasanya `index.js`, `server.js`, atau `app.js`), pastikan:

```javascript
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 🚀 Cara Menjalankan

### Step 1: Jalankan Backend
```bash
cd path/to/backend
npm install
npm start
# atau
node index.js
```

Backend harus menampilkan: `Server running on port 5000` (atau port lain)

### Step 2: Jalankan Frontend
```bash
cd "d:\project pkl pokada\project-fe\my-app"
npm install
npm run dev
```

Frontend akan berjalan di: `http://localhost:3000`

## 🧪 Test Connection

### 1. Test Backend API

Buka browser atau Postman, test endpoint:
- `GET http://localhost:5000/api/users`
- `GET http://localhost:5000/api/categories`
- `GET http://localhost:5000/api/items`

Harus return response seperti:
```json
{
  "status": "success",
  "message": "Data retrieved successfully",
  "data": [...],
  "total": 10
}
```

### 2. Test Frontend Connection

1. Buka `http://localhost:3000`
2. Login ke admin panel
3. Buka halaman **Manage Users** atau **Manajemen Peminjaman**
4. **Jika koneksi sukses**: Data real dari database akan muncul
5. **Jika koneksi gagal**: Mock data akan ditampilkan (fallback)

## 🔍 Troubleshooting

### Problem 1: Frontend tidak bisa connect ke Backend

**Symptoms:** Data tetap menampilkan mock data, bukan data real

**Solutions:**

1. **Check Backend Running:**
   ```bash
   # Pastikan backend berjalan
   curl http://localhost:5000/api/users
   ```

2. **Check CORS:** Backend harus allow request dari `http://localhost:3000`
   
   Tambahkan di backend (`index.js` atau `server.js`):
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true
   }));
   ```

3. **Restart Frontend:** Setelah update `.env.local`, restart Next.js
   ```bash
   # Ctrl+C untuk stop, lalu
   npm run dev
   ```

### Problem 2: Port sudah digunakan

**Error:** `Port 5000 is already in use`

**Solutions:**
- Ganti port di backend ke port lain (misal 5001, 3001, 8000)
- Update `.env.local` dengan port baru
- Restart frontend

### Problem 3: API Response Format Tidak Sesuai

Frontend expect response format:
```json
{
  "status": "success",
  "message": "...",
  "data": [...],
  "total": 100
}
```

Jika backend return format berbeda, update `lib/api.tsx`

## 📊 Backend Controllers yang Tersedia

Berdasarkan screenshot, backend Anda punya:

✅ `authController.js` - Login, Register, Profile
✅ `userController.js` - CRUD Users
✅ `categoryController.js` - CRUD Categories
✅ `itemController.js` - CRUD Items
✅ `borrowingController.js` - Borrowings Management
✅ `returnController.js` - Returns Management
✅ `damageReportController.js` - Damage Reports
✅ `chatController.js` - Chat/Messages
✅ `notificationController.js` - Notifications
✅ `dashboardController.js` - Dashboard Stats
✅ `packageController.js` - Package Management

## 📝 Next Steps

1. ✅ Pastikan backend berjalan di port 5000
2. ✅ Test API endpoints dengan Postman/curl
3. ✅ Setup CORS di backend
4. ✅ Run frontend (`npm run dev`)
5. ✅ Test login dan lihat data real muncul

## 🔐 Authentication Flow

1. User login di `/auth/login`
2. Backend return `{ user, token }`
3. Token disimpan di `localStorage`
4. Semua request ke API include header: `Authorization: Bearer {token}`
5. Backend verify token untuk authorize request

Token sudah di-handle otomatis di `lib/api.tsx`:
```typescript
const token = getAuthToken();
if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}
```

## 📞 Support

Jika ada masalah koneksi:
1. Check console browser (F12) untuk error messages
2. Check terminal backend untuk error logs
3. Check terminal frontend untuk warnings
4. Pastikan Supabase database connection di backend sudah benar

---

**Status:** Ready to connect! 🚀
**Last Updated:** $(date)
