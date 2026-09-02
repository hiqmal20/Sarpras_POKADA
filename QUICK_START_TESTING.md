# ⚡ Quick Start - Testing Backend dengan Thunder Client

## 🎯 Copy-Paste Ready Requests

Base URL: **`http://localhost:5000`**

---

## 1️⃣ REGISTER - Buat Akun Baru

### **Register Mahasiswa**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

Body:
{
  "nomor_induk": "2021010001",
  "name": "Ahmad Zaki Ali",
  "email": "zaki@gmail.com",
  "password": "Mahasiswa123",
  "role": "Mahasiswa",
  "no_hp": "081234567890"
}
```

### **Register Petugas**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

Body:
{
  "nomor_induk": "PET001",
  "name": "Rina Wati",
  "email": "rina.petugas@gmail.com",
  "password": "Petugas123",
  "role": "Petugas",
  "no_hp": "081234567895"
}
```

### **Register Admin**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

Body:
{
  "nomor_induk": "ADM001",
  "name": "Admin POKADA",
  "email": "admin@gmail.com",
  "password": "Admin123",
  "role": "Admin",
  "no_hp": "081234567898"
}
```

---

## 2️⃣ LOGIN - Masuk ke Akun

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

Body:
{
  "email": "zaki@gmail.com",
  "nomor_induk": "2021010001",
  "password": "Mahasiswa123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login berhasil!",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOi...",  ← COPY TOKEN INI
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600
  }
}
```

**⚠️ PENTING:** Copy token dari response, akan dipakai untuk request berikutnya!

---

## 3️⃣ GET PROFILE - Lihat Profil Sendiri

```
GET http://localhost:5000/api/auth/me
Authorization: Bearer {paste_token_di_sini}
```

---

## 4️⃣ UPLOAD FOTO PROFIL

```
POST http://localhost:5000/api/users/{user_id}/photo
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body (Form):
- Field name: photo
- Field type: File
- Value: [pilih file gambar dari komputer]
```

**Catatan:** Ganti `{user_id}` dengan id dari response login

---

## 5️⃣ LIHAT DAFTAR ITEMS (Barang)

```
GET http://localhost:5000/api/items
Authorization: Bearer {token}
```

**Dengan filter:**
```
GET http://localhost:5000/api/items?status=Tersedia&search=mic
Authorization: Bearer {token}
```

---

## 6️⃣ LIHAT DETAIL ITEM

```
GET http://localhost:5000/api/items/{item_id}
Authorization: Bearer {token}
```

**Response:** Detail barang + statistik + riwayat peminjaman + daftar package

---

## 7️⃣ AJUKAN PEMINJAMAN

```
POST http://localhost:5000/api/borrowings
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "user_id": "{user_id_dari_login}",
  "purpose": "Untuk presentasi kelas",
  "items": [
    {
      "item_id": "{id_barang}",
      "quantity": 1,
      "condition_before": "Baik",
      "note": ""
    }
  ]
}
```

**Catatan:** 
- Ambil `item_id` dari endpoint GET /api/items
- Status awal: **Pending** (menunggu approval admin)

---

## 8️⃣ LIHAT DAFTAR PEMINJAMAN

**Semua peminjaman (Admin/Petugas):**
```
GET http://localhost:5000/api/borrowings
Authorization: Bearer {token_admin}
```

**Peminjaman user sendiri:**
```
GET http://localhost:5000/api/borrowings?user_id={user_id}
Authorization: Bearer {token}
```

---

## 9️⃣ UPDATE STATUS PEMINJAMAN (Admin/Petugas Only)

```
PATCH http://localhost:5000/api/borrowings/{borrowing_id}/status
Authorization: Bearer {token_admin}
Content-Type: application/json

Body:
{
  "status": "Disetujui",
  "admin_note": "Peminjaman disetujui"
}
```

**Status flow:**
- `Pending` → `Disetujui` → `Dipinjam` → `Dikembalikan`
- Atau: `Pending` → `Ditolak` / `Dibatalkan`

---

## 🔟 DASHBOARD STATS (Admin/Petugas Only)

```
GET http://localhost:5000/api/dashboard/stats
Authorization: Bearer {token_admin}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "items": {
      "total": 50,
      "tersedia": 35,
      "dipinjam": 10,
      "rusak": 5
    },
    "borrowings": {
      "aktif": 10,
      "pending": 5,
      "dikembalikanBulanIni": 20
    },
    "damageReports": { ... },
    "users": { ... },
    "recentBorrowings": [ ... ]
  }
}
```

---

## 1️⃣1️⃣ REFRESH TOKEN

```
POST http://localhost:5000/api/auth/refresh
Content-Type: application/json

Body:
{
  "refreshToken": "{refresh_token_dari_login}"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Token berhasil diperbarui",
  "data": {
    "token": "eyJhbGciOi...",  ← TOKEN BARU
    "expiresIn": 3600
  }
}
```

---

## 1️⃣2️⃣ LOGOUT

```
POST http://localhost:5000/api/auth/logout
Authorization: Bearer {token}
```

---

## 📚 Daftar Endpoint Lengkap

### **Auth**
- `POST /api/auth/register` - Register akun baru (public)
- `POST /api/auth/login` - Login (public)
- `POST /api/auth/refresh` - Refresh token (public)
- `GET /api/auth/me` - Profile sendiri (protected)
- `POST /api/auth/logout` - Logout (protected)

### **Users**
- `GET /api/users` - List users (protected)
- `GET /api/users/:id` - Detail user (protected)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `POST /api/users/:id/photo` - Upload foto (user sendiri atau Admin)
- `POST /api/users/import` - Import CSV (Admin only)

### **Items**
- `GET /api/items` - List items (protected)
- `GET /api/items/:id` - Detail item + stats (protected)
- `POST /api/items` - Create item (Admin/Petugas)
- `PUT /api/items/:id` - Update item (Admin/Petugas)
- `DELETE /api/items/:id` - Delete item (Admin/Petugas)

### **Categories**
- `GET /api/categories` - List categories (protected)
- `GET /api/categories/:id` - Detail category (protected)
- `POST /api/categories` - Create category (Admin/Petugas)
- `PUT /api/categories/:id` - Update category (Admin/Petugas)
- `DELETE /api/categories/:id` - Delete category (Admin/Petugas)

### **Packages**
- `GET /api/packages` - List packages (dengan auto availability check)
- `GET /api/packages/:id` - Detail package (protected)
- `POST /api/packages` - Create package (Admin/Petugas)
- `PUT /api/packages/:id` - Update package (Admin/Petugas)
- `DELETE /api/packages/:id` - Delete package (Admin/Petugas)

### **Borrowings**
- `GET /api/borrowings` - List borrowings (protected)
- `GET /api/borrowings/:id` - Detail borrowing (protected)
- `POST /api/borrowings` - Create borrowing request (protected)
- `PATCH /api/borrowings/:id/status` - Update status (Admin/Petugas)

### **Returns**
- `POST /api/returns` - Process return (Admin/Petugas)
- `GET /api/returns` - List returns (protected)

### **Damage Reports**
- `GET /api/damage-reports` - List reports (protected)
- `GET /api/damage-reports/:id` - Detail report (protected)
- `POST /api/damage-reports` - Create report (protected)
- `PATCH /api/damage-reports/:id/status` - Update status (Admin/Petugas)

### **Chats**
- `GET /api/chats` - List chats (protected)
- `POST /api/chats` - Create chat (protected)
- `GET /api/chats/:id/messages` - Chat messages (protected)
- `POST /api/chats/:id/messages` - Send message (protected)

### **Notifications**
- `GET /api/notifications` - User notifications (protected)
- `PATCH /api/notifications/:id/read` - Mark as read (protected)

### **Dashboard**
- `GET /api/dashboard/stats` - Dashboard statistics (Admin/Petugas only)

---

## 🔐 Authorization Header Format

Semua protected endpoints butuh header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token expired setelah **2 jam**. Gunakan refresh token untuk perpanjang.

---

## ✅ Testing Checklist

### **Basic Flow:**
- [ ] Register akun Mahasiswa
- [ ] Login dengan akun tersebut
- [ ] Get profile (`/api/auth/me`)
- [ ] Upload foto profil
- [ ] Lihat daftar items
- [ ] Ajukan peminjaman

### **Admin Flow:**
- [ ] Register akun Admin
- [ ] Login sebagai Admin
- [ ] Lihat dashboard stats
- [ ] Approve/reject peminjaman
- [ ] Create item baru
- [ ] Import users dari CSV
- [ ] Upload foto untuk user lain

### **Token Management:**
- [ ] Token valid untuk 2 jam
- [ ] Refresh token berhasil
- [ ] Token expired ditolak (401)
- [ ] Logout berhasil

---

## 💡 Pro Tips

1. **Gunakan Collections di Thunder Client** untuk menyimpan request
2. **Set Environment Variable** untuk token agar tidak perlu copy-paste terus
3. **Save Response** untuk mendapatkan ID yang diperlukan request berikutnya
4. **Test dengan berbagai role** (Mahasiswa, Petugas, Admin) untuk validasi RBAC
5. **Gunakan `test-accounts.json`** untuk data akun testing siap pakai

---

Selamat testing! 🚀
