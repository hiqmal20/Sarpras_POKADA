# 📸 Panduan Upload Foto Profil User

## ✅ Fitur yang Sudah Ditambahkan

User sekarang bisa menambahkan foto profil sendiri, dan Admin bisa melihat foto tersebut untuk mengidentifikasi user.

---

## 📋 Tentang Database

**TIDAK PERLU PERUBAHAN DATABASE!** ✅

Kolom `foto` sudah ada di tabel `users` dengan tipe `TEXT` yang bisa menyimpan URL foto dari Supabase Storage.

Struktur tabel users:
```sql
users (
  id UUID PRIMARY KEY,
  nomor_induk TEXT,
  name TEXT,
  email TEXT,
  role TEXT,
  no_hp TEXT,
  foto TEXT,        -- ✅ Sudah ada, menyimpan URL foto
  status TEXT,
  created_at TIMESTAMP,
  update_at TIMESTAMP
)
```

---

## 🚀 Endpoint Baru

### **Upload Foto Profil**
```
POST /api/users/:id/photo
```

**Authorization:** 
- User bisa upload foto **sendiri**
- Admin bisa upload foto untuk **siapa saja**

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `photo` (file) - File gambar (JPEG, PNG, GIF, WEBP)

**Validasi:**
- Format: JPEG, JPG, PNG, GIF, WEBP
- Ukuran maksimal: **5MB**
- Field name harus: `photo`

---

## 🧪 Testing di Thunder Client

### **1. Login Dulu**
```
POST http://localhost:5000/api/auth/login

Body (JSON):
{
  "email": "user@gmail.com",
  "password": "User@123"
}

Response:
{
  "status": "success",
  "data": {
    "user": { "id": "uuid-user", ... },
    "token": "eyJhbG..."
  }
}
```

### **2. Upload Foto Profil (User Upload Sendiri)**
```
POST http://localhost:5000/api/users/{user_id}/photo

Headers:
Authorization: Bearer {token_dari_login}

Body (Form):
- Type: multipart/form-data
- Field name: photo
- Field type: File
- Value: [pilih file gambar dari komputer]

Response Success:
{
  "status": "success",
  "message": "Foto profil berhasil diunggah",
  "data": {
    "id": "uuid",
    "name": "Ahmad Zaki",
    "email": "zaki@gmail.com",
    "foto": "https://ffvaemxzopqtsckdhdpq.supabase.co/storage/v1/object/public/sarpras-assets/profile-photos/uuid-1234567890.jpg",
    ...
  }
}
```

### **3. Lihat Hasil Upload**
```
GET http://localhost:5000/api/users/{user_id}

Headers:
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Ahmad Zaki",
    "foto": "https://...supabase.co/.../profile-photos/uuid-123.jpg",
    ...
  }
}
```

**Foto bisa langsung diakses di browser dengan URL dari field `foto`**

---

## 🔒 Aturan Akses

| Role       | Bisa Upload Foto Sendiri | Bisa Upload Foto User Lain |
|------------|--------------------------|----------------------------|
| Mahasiswa  | ✅ Ya                     | ❌ Tidak                    |
| Petugas    | ✅ Ya                     | ❌ Tidak                    |
| Admin      | ✅ Ya                     | ✅ Ya                       |

**Contoh Skenario:**
- User A (Mahasiswa) dengan id `abc-123` bisa upload foto ke `/api/users/abc-123/photo` ✅
- User A (Mahasiswa) **TIDAK BISA** upload foto ke `/api/users/xyz-456/photo` (user lain) ❌
- Admin bisa upload foto untuk semua user ✅

---

## 📦 File yang Diubah

1. ✅ `middleware/uploadMiddleware.js` - Tambah filter untuk gambar
2. ✅ `services/userService.js` - Tambah fungsi `uploadProfilePhoto()`
3. ✅ `controller/userController.js` - Tambah controller `uploadPhoto()`
4. ✅ `routes/userRoutes.js` - Tambah route `POST /:id/photo`
5. ✅ `middleware/errorHandler.js` - Update error handling untuk gambar

---

## ⚙️ Setup Supabase Storage

**PENTING:** Sebelum testing, pastikan bucket storage sudah dibuat!

### Langkah Setup di Supabase Dashboard:

1. **Buka Supabase Dashboard** → Project Anda
2. **Storage** (sidebar kiri)
3. **Create new bucket:**
   - Name: `sarpras-assets`
   - Public bucket: **✅ CENTANG** (agar foto bisa diakses public)
   - Click **Create bucket**

4. **Set Policies (Security):**
   ```sql
   -- Policy untuk INSERT (upload)
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'sarpras-assets');

   -- Policy untuk SELECT (read/public access)
   CREATE POLICY "Public can view photos"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'sarpras-assets');

   -- Policy untuk UPDATE (replace)
   CREATE POLICY "Users can update their photos"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'sarpras-assets');
   ```

5. **Selesai!** Sekarang endpoint upload foto siap digunakan.

---

## 🎯 Cara Kerja

1. User mengirim foto melalui endpoint `POST /api/users/:id/photo`
2. Middleware `uploadImage` validasi format dan ukuran file
3. File disimpan ke **Supabase Storage** bucket `sarpras-assets/profile-photos/`
4. Nama file: `{user_id}-{timestamp}.{ext}` (contoh: `abc123-1234567890.jpg`)
5. Dapatkan public URL dari Supabase Storage
6. Update kolom `foto` di tabel `users` dengan URL tersebut
7. Return data user yang sudah ter-update

---

## 💡 Tips Frontend

### Tampilkan Foto di UI:
```javascript
// Jika foto ada, tampilkan. Jika tidak, tampilkan default avatar
const avatarUrl = user.foto || '/assets/default-avatar.png';

<img src={avatarUrl} alt={user.name} />
```

### Upload Foto dari React:
```javascript
const handleUploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`/api/users/${userId}/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  if (result.status === 'success') {
    console.log('Foto berhasil diupload:', result.data.foto);
  }
};
```

---

## ❌ Error Handling

| Error | Status | Penyebab | Solusi |
|-------|--------|----------|--------|
| File foto wajib diunggah | 400 | Field `photo` kosong | Pastikan field name = `photo` |
| Hanya file gambar yang diizinkan | 400 | Format file bukan gambar | Upload JPEG/PNG/GIF/WEBP |
| Ukuran file terlalu besar | 400 | File > 5MB | Kompres gambar dulu |
| Anda tidak memiliki izin | 403 | User coba upload foto user lain | User hanya bisa upload foto sendiri |
| Gagal mengunggah foto | 500 | Error di Supabase Storage | Cek bucket sudah dibuat & public |

---

## ✅ Checklist Testing

- [ ] Bucket `sarpras-assets` sudah dibuat di Supabase Storage
- [ ] Bucket sudah di-set **public**
- [ ] Policies sudah ditambahkan
- [ ] User bisa upload foto sendiri (Mahasiswa/Petugas)
- [ ] Admin bisa upload foto untuk user lain
- [ ] Format gambar tervalidasi (JPEG, PNG, GIF, WEBP)
- [ ] File size tervalidasi (max 5MB)
- [ ] URL foto bisa diakses di browser
- [ ] Field `foto` di database ter-update dengan URL yang benar
- [ ] Endpoint `GET /api/users/:id` menampilkan URL foto

---

Selamat! Fitur upload foto profil sudah siap digunakan! 🎉
