# 🔐 Login Guide - SARPRAS POKADA

## 🎭 Mock Authentication Mode

Aplikasi menggunakan **mock authentication** tanpa koneksi ke backend.

---

## 📋 Cara Login:

### Opsi 1: Gunakan Akun Mock (Rekomendasi)

Ada 2 akun mock yang sudah disediakan:

#### **Admin Account:**
```
Email/Nomor Induk: admin@pokada.com ATAU ADM001
Password: admin123
Role: Admin
```

#### **User Account:**
```
Email/Nomor Induk: user@pokada.com ATAU USR001
Password: user123
Role: User
```

### Opsi 2: Gunakan Kredensial Apapun (Fallback)

Karena mode demo, Anda bisa login dengan **email dan password apapun**:
- Masukkan email/nomor induk apapun
- Masukkan password apapun
- Otomatis login sebagai Admin

---

## 🚀 Step-by-Step Login:

1. **Buka halaman login:**
   ```
   http://localhost:3000/auth/login
   ```

2. **Isi form login:**
   - **Email atau Nomor Induk:** Pilih salah satu dari akun mock atau isi bebas
   - **Password:** Isi sesuai akun mock atau isi bebas

3. **Klik tombol "Masuk"**

4. **Redirect otomatis:**
   - **Admin role** → `/admin/dashboard_admin`
   - **User role** → `/user/dashboard` (jika ada)

---

## 🎯 Fitur Mock Authentication:

### ✅ Yang Bekerja:
- ✅ Login dengan akun mock
- ✅ Login dengan kredensial bebas (fallback)
- ✅ Generate mock token
- ✅ Save user data ke localStorage
- ✅ Redirect based on role
- ✅ Simulate loading delay (500ms)
- ✅ Token persist di localStorage

### ⚠️ Yang Disimulasi:
- ⚠️ Password validation (tidak dicek ke database)
- ⚠️ Token expiration (token tidak expire)
- ⚠️ Session management (tidak ada real session)

### ❌ Yang Tidak Ada:
- ❌ Real database validation
- ❌ Password hashing
- ❌ Email verification
- ❌ Forgot password
- ❌ Two-factor authentication

---

## 💾 Data yang Disimpan:

Setelah login, data disimpan di **localStorage**:

```javascript
// Token
localStorage.setItem('token', 'mock-token-1234567890');

// User data
localStorage.setItem('user', JSON.stringify({
  id: "ADM001",
  email: "admin@pokada.com",
  nomor_induk: "ADM001",
  full_name: "Admin POKADA",
  role: "admin"
}));
```

---

## 🔄 Logout:

Logout akan menghapus data dari localStorage:

```javascript
localStorage.removeItem('token');
localStorage.removeItem('user');
```

---

## 🎨 UI Features:

### Demo Info Box
Halaman login menampilkan info box dengan credentials demo:
- Background biru muda
- Menampilkan akun Admin dan User
- Note bahwa bisa login dengan kredensial apapun

### Loading State
- Button disabled saat loading
- Text berubah jadi "Memproses..."
- Simulate 500ms delay

### Error Handling
- Error message display (merah)
- Catch dan display error dengan graceful

---

## 🧪 Testing Login:

### Test 1: Login dengan Admin Mock
```
Email: admin@pokada.com
Password: admin123
Expected: Redirect ke /admin/dashboard_admin
```

### Test 2: Login dengan Nomor Induk
```
Email: ADM001
Password: admin123
Expected: Redirect ke /admin/dashboard_admin
```

### Test 3: Login dengan User Mock
```
Email: user@pokada.com
Password: user123
Expected: Redirect ke /user/dashboard
```

### Test 4: Login dengan Kredensial Bebas
```
Email: test@test.com
Password: anything
Expected: Redirect ke /admin/dashboard_admin (fallback)
```

---

## 🔐 Security Note:

**⚠️ PENTING:** Ini adalah mock authentication untuk **demo/development only**!

**Jangan gunakan di production karena:**
- ❌ Tidak ada validasi password real
- ❌ Tidak ada protection terhadap brute force
- ❌ Tidak ada encryption
- ❌ Token tidak secure
- ❌ Siapapun bisa login

**Untuk production:**
- ✅ Implement real backend authentication
- ✅ Use bcrypt/argon2 untuk password hashing
- ✅ Use JWT atau session-based auth
- ✅ Implement HTTPS
- ✅ Add rate limiting
- ✅ Add CSRF protection

---

## 🛠️ Troubleshooting:

### Problem: Tidak bisa login

**Check:**
1. ☐ Frontend running? (`npm run dev`)
2. ☐ Browser console ada error? (F12 → Console)
3. ☐ localStorage accessible? (F12 → Application → Local Storage)

**Fix:**
- Clear browser cache
- Clear localStorage: `localStorage.clear()`
- Restart frontend

### Problem: Redirect tidak bekerja

**Check:**
1. ☐ Browser console error?
2. ☐ Router working?

**Fix:**
- Hard refresh browser (Ctrl+Shift+R)
- Check route exists

### Problem: Token tidak save

**Check:**
1. ☐ localStorage enabled di browser?
2. ☐ Private/incognito mode? (localStorage mungkin disabled)

**Fix:**
- Use normal browser mode
- Enable localStorage di browser settings

---

## 📝 Code Example:

```typescript
// Mock users
const MOCK_USERS = [
  {
    email: "admin@pokada.com",
    nomor_induk: "ADM001",
    password: "admin123",
    role: "admin",
    name: "Admin POKADA"
  }
];

// Login handler
const handleLogin = async (e) => {
  e.preventDefault();
  
  // Find user
  const user = MOCK_USERS.find(u => 
    u.email === identifier && 
    u.password === password
  );

  if (user) {
    // Generate mock token
    const token = `mock-token-${Date.now()}`;
    
    // Save to localStorage
    setAuthToken(token);
    setCurrentUser(user);
    
    // Redirect
    router.push('/admin/dashboard_admin');
  }
};
```

---

## 🎓 Best Practices:

1. **Clear localStorage setelah development** untuk test fresh state
2. **Use demo credentials** untuk consistency dalam demo
3. **Don't share mock credentials** sebagai "real" credentials
4. **Document login credentials** di README untuk team
5. **Add visual indicator** bahwa ini mock mode (sudah ada info box)

---

## 📞 Support:

Jika ada masalah login:
1. Check browser console (F12)
2. Clear localStorage
3. Restart frontend
4. Check `app/auth/login/page.tsx` untuk logic

---

**Mode:** Mock Authentication 🎭  
**Status:** Ready to Use  
**Last Updated:** 2024
