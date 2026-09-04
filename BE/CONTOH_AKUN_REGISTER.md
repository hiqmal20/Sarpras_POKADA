# 📝 Contoh Akun untuk Testing Register

## 🚀 Endpoint Register

```
POST http://localhost:5000/api/auth/register
```

**Akses:** Public (tidak perlu login)

---

## 📋 Field yang Diperlukan

| Field | Required | Validasi | Contoh |
|-------|----------|----------|--------|
| `nomor_induk` | ✅ Ya | Min 3, Max 50 karakter | "2021010001" |
| `name` | ✅ Ya | Min 3, Max 100 karakter | "Ahmad Zaki Ali" |
| `email` | ✅ Ya | Format email valid | "zaki@gmail.com" |
| `password` | ✅ Ya | Min 8 karakter, harus ada: huruf besar, kecil, angka | "Pokada123" |
| `role` | ❌ Tidak | Default: "Mahasiswa", Valid: Admin, Petugas, Mahasiswa | "Mahasiswa" |
| `no_hp` | ❌ Tidak | Optional | "081234567890" |
| `foto` | ❌ Tidak | Optional (URL) | null |

---

## ✅ Contoh Akun untuk Testing

### **1. Mahasiswa 1**
```json
{
  "nomor_induk": "2021010001",
  "name": "Ahmad Zaki Ali",
  "email": "zaki@gmail.com",
  "password": "Mahasiswa123",
  "role": "Mahasiswa",
  "no_hp": "081234567890"
}
```

### **2. Mahasiswa 2**
```json
{
  "nomor_induk": "2021010002",
  "name": "Siti Nurhaliza",
  "email": "siti@gmail.com",
  "password": "Mahasiswa123",
  "role": "Mahasiswa",
  "no_hp": "081234567891"
}
```

### **3. Mahasiswa 3**
```json
{
  "nomor_induk": "2021010003",
  "name": "Budi Santoso",
  "email": "budi@gmail.com",
  "password": "Mahasiswa123",
  "role": "Mahasiswa",
  "no_hp": "081234567892"
}
```

### **4. Petugas 1**
```json
{
  "nomor_induk": "PET001",
  "name": "Rina Wati",
  "email": "rina@gmail.com",
  "password": "Petugas123",
  "role": "Petugas",
  "no_hp": "081234567893"
}
```

### **5. Petugas 2**
```json
{
  "nomor_induk": "PET002",
  "name": "Agus Setiawan",
  "email": "agus@gmail.com",
  "password": "Petugas123",
  "role": "Petugas",
  "no_hp": "081234567894"
}
```

### **6. Admin 1**
```json
{
  "nomor_induk": "ADM001",
  "name": "Dewi Admin",
  "email": "admin@gmail.com",
  "password": "Admin123",
  "role": "Admin",
  "no_hp": "081234567895"
}
```

### **7. Admin 2**
```json
{
  "nomor_induk": "ADM002",
  "name": "Hendra Super Admin",
  "email": "superadmin@gmail.com",
  "password": "SuperAdmin123",
  "role": "Admin",
  "no_hp": "081234567896"
}
```

---

## 🧪 Cara Testing di Thunder Client

### **Step 1: Register Akun Baru**

```
POST http://localhost:5000/api/auth/register

Headers:
Content-Type: application/json

Body (JSON):
{
  "nomor_induk": "2021010001",
  "name": "Ahmad Zaki Ali",
  "email": "zaki@gmail.com",
  "password": "Mahasiswa123",
  "role": "Mahasiswa",
  "no_hp": "081234567890"
}
```

### **Response Success:**
```json
{
  "status": "success",
  "message": "Registrasi berhasil! Akun telah terdaftar.",
  "data": {
    "user": {
      "id": "uuid-generated",
      "nomor_induk": "2021010001",
      "name": "Ahmad Zaki Ali",
      "email": "zaki@gmail.com",
      "role": "Mahasiswa",
      "no_hp": "081234567890",
      "foto": null,
      "status": "Aktif",
      "created_at": "2026-09-02T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### **Step 2: Login dengan Akun yang Sudah Dibuat**

```
POST http://localhost:5000/api/auth/login

Headers:
Content-Type: application/json

Body (JSON):
{
  "email": "zaki@gmail.com",
  "nomor_induk": "2021010001",
  "password": "Mahasiswa123"
}
```

### **Response Success:**
```json
{
  "status": "success",
  "message": "Login berhasil!",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Ahmad Zaki Ali",
      "email": "zaki@gmail.com",
      "role": "Mahasiswa",
      ...
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600
  }
}
```

---

## ❌ Contoh Error Validasi

### **Error 1: Email sudah terdaftar**
```json
{
  "status": "fail",
  "message": "Email sudah terdaftar"
}
```

### **Error 2: Nomor Induk sudah terdaftar**
```json
{
  "status": "fail",
  "message": "Nomor Induk sudah terdaftar"
}
```

### **Error 3: Password tidak valid**
```json
{
  "status": "fail",
  "message": "Password harus mengandung huruf kecil, huruf besar, dan angka"
}
```

**Contoh password yang SALAH:**
- ❌ `mahasiswa123` (tidak ada huruf besar)
- ❌ `MAHASISWA123` (tidak ada huruf kecil)
- ❌ `Mahasiswa` (tidak ada angka)
- ❌ `Mhs123` (kurang dari 8 karakter)

**Contoh password yang BENAR:**
- ✅ `Mahasiswa123`
- ✅ `Pokada2024`
- ✅ `Admin123`
- ✅ `Password1`

### **Error 4: Email tidak valid**
```json
{
  "status": "fail",
  "message": "Format email tidak valid"
}
```

**Contoh email yang SALAH:**
- ❌ `zaki` (bukan email)
- ❌ `zaki@` (tidak lengkap)
- ❌ `@gmail.com` (tidak lengkap)

**Contoh email yang BENAR:**
- ✅ `zaki@gmail.com`
- ✅ `admin@gmail.com`
- ✅ `user123@yahoo.com`

---

## 🔄 Testing Flow Lengkap

### **1. Register Akun Mahasiswa**
```
POST /api/auth/register
Body: (lihat contoh Mahasiswa 1 di atas)
```

### **2. Login dengan Akun Tersebut**
```
POST /api/auth/login
Body: email + nomor_induk + password
```

### **3. Upload Foto Profil**
```
POST /api/users/{user_id}/photo
Headers: Authorization: Bearer {token}
Body: multipart/form-data dengan field "photo"
```

### **4. Lihat Profil Sendiri**
```
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

### **5. Ajukan Peminjaman**
```
POST /api/borrowings
Headers: Authorization: Bearer {token}
Body: { user_id, purpose, items: [...] }
```

---

## 📊 Daftar Role dan Hak Akses

| Role | Hak Akses |
|------|-----------|
| **Mahasiswa** | - Lihat items & packages<br>- Ajukan peminjaman<br>- Lihat & update profil sendiri<br>- Upload foto sendiri<br>- Chat dengan admin |
| **Petugas** | - Semua akses Mahasiswa<br>- Lihat semua peminjaman<br>- Update status peminjaman<br>- Kelola damage reports<br>- Lihat dashboard stats |
| **Admin** | - Semua akses Petugas<br>- Kelola users (CRUD)<br>- Kelola items (CRUD)<br>- Kelola categories (CRUD)<br>- Kelola packages (CRUD)<br>- Import CSV users<br>- Upload foto semua user |

---

## 💡 Tips Testing

1. **Register beberapa akun** dengan role berbeda (Mahasiswa, Petugas, Admin)
2. **Gunakan email yang valid** (format @gmail.com, bukan @mail.com)
3. **Password harus kuat:** min 8 karakter + huruf besar + kecil + angka
4. **Nomor induk harus unik** per akun
5. **Email harus unik** per akun
6. Setelah register, **langsung bisa login** dengan kredensial yang sama
7. Token dari register/login **berlaku 2 jam**

---

## 🔧 Troubleshooting

**Q: Error "email rate limit exceeded"**  
A: Terlalu banyak request dalam waktu singkat. Tunggu beberapa saat (rate limiter)

**Q: Error "Email sudah terdaftar"**  
A: Gunakan email lain, atau hapus user tersebut dari database

**Q: Error "User not found" saat login**  
A: Pastikan email DAN nomor_induk yang diinput benar (keduanya wajib)

**Q: Token expired setelah 2 jam**  
A: Gunakan refresh token untuk mendapatkan token baru tanpa login ulang:
```
POST /api/auth/refresh
Body: { "refreshToken": "eyJhbG..." }
```

---

## ✅ Checklist Testing Register

- [ ] Register dengan role Mahasiswa berhasil
- [ ] Register dengan role Petugas berhasil
- [ ] Register dengan role Admin berhasil
- [ ] Email duplikat ditolak
- [ ] Nomor induk duplikat ditolak
- [ ] Password lemah ditolak
- [ ] Email tidak valid ditolak
- [ ] Login dengan akun yang baru dibuat berhasil
- [ ] Token dari register bisa digunakan untuk akses endpoint protected
- [ ] Refresh token berhasil generate token baru

---

Selamat mencoba! 🚀
