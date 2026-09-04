# 📋 Laporan Kerusakan - Fitur Enhanced

## 🎯 Fitur Baru

### ✅ Yang Sudah Ditambahkan:

1. **Report Code dengan Prefix**
   - `ITM-YYYYMMDD-XXXX` untuk kerusakan per item
   - `PKG-YYYYMMDD-XXXX` untuk kerusakan per package

2. **Filter by Damage Type**
   - `per_item` - Kerusakan pada item satuan
   - `per_package` - Kerusakan pada seluruh package

3. **Detail Laporan Lengkap**
   - Info user peminjam
   - Detail item/package yang rusak
   - Riwayat peminjaman
   - Items yang dipinjam
   - Info denda

4. **Auto-Generate Unique Code**
   - Otomatis generate saat create laporan
   - Unique per laporan

---

## 📡 API Endpoints

### **1. GET List Laporan dengan Filter**

```
GET /api/damage-reports?damage_type=per_item
GET /api/damage-reports?damage_type=per_package
```

**Query Parameters:**
- `damage_type` - Filter: `per_item` | `per_package`
- `status` - Filter: `Menunggu Review` | `Sedang Diperbaiki` | `Selesai` | `Ditolak`
- `report_type` - Filter: `Kerusakan` | `Kehilangan` | `Cacat Fungsi`
- `user_id` - Filter by user
- `item_id` - Filter by item
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "status": "success",
  "message": "Data laporan kerusakan/kehilangan berhasil dimuat",
  "data": [
    {
      "id": "uuid",
      "report_code": "ITM-20260902-ABCD",
      "damage_type": "per_item",
      "title": "Mic Wireless Rusak",
      "report_type": "Kerusakan",
      "status": "Menunggu Review",
      "fine_amount": 150000,
      "fine_status": "Belum Dibayar",
      "users": {
        "name": "Ahmad Zaki",
        "email": "zaki@gmail.com"
      },
      "items": {
        "name": "Mic Wireless",
        "code": "MIC-001"
      },
      "borrowings": {
        "borrow_code": "PJ-20260902-XYZ1"
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### **2. GET Detail Laporan**

```
GET /api/damage-reports/:id
```

**Response (Per Item):**
```json
{
  "status": "success",
  "message": "Detail laporan berhasil dimuat",
  "data": {
    "id": "uuid",
    "report_code": "ITM-20260902-ABCD",
    "damage_type": "per_item",
    "title": "Mic Wireless Rusak",
    "description": "Mic ditemukan dalam kondisi pecah setelah dikembalikan",
    "report_type": "Kerusakan",
    "status": "Menunggu Review",
    "image_url": "https://...",
    
    "fine_amount": 150000,
    "fine_reason": "Kerusakan akibat kelalaian peminjam",
    "fine_status": "Belum Dibayar",
    
    "item_condition": "Rusak Berat",
    "admin_note": "",
    
    "created_at": "2026-09-02T10:00:00Z",
    "update_at": "2026-09-02T10:00:00Z",
    
    "users": {
      "id": "uuid",
      "name": "Ahmad Zaki",
      "nomor_induk": "2021010001",
      "email": "zaki@gmail.com",
      "no_hp": "081234567890",
      "role": "Mahasiswa",
      "foto": "https://..."
    },
    
    "items": {
      "id": "uuid",
      "name": "Mic Wireless",
      "code": "MIC-001",
      "image_url": "https://...",
      "condition": "Rusak Berat",
      "status": "Tidak Tersedia",
      "stock": 5,
      "available_stock": 3,
      "category_id": "uuid",
      "categories": {
        "id": "uuid",
        "name": "Audio"
      }
    },
    
    "borrowings": {
      "id": "uuid",
      "borrow_code": "PJ-20260902-XYZ1",
      "purpose": "Presentasi kelas",
      "borrow_date": "2026-09-01T08:00:00Z",
      "status": "Dikembalikan",
      "actual_return_date": "2026-09-02T09:00:00Z"
    },
    
    "borrowed_items": [
      {
        "id": "uuid",
        "quantity": 1,
        "condition_before": "Baik",
        "condition_after": "Rusak Berat",
        "note": "Mic pecah",
        "items": {
          "id": "uuid",
          "name": "Mic Wireless",
          "code": "MIC-001",
          "image_url": "https://..."
        }
      }
    ]
  }
}
```

**Response (Per Package):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "report_code": "PKG-20260902-WXYZ",
    "damage_type": "per_package",
    "title": "Paket Presentasi Hilang",
    "report_type": "Kehilangan",
    "status": "Selesai",
    
    "fine_amount": 500000,
    "fine_reason": "Biaya penggantian seluruh package",
    "fine_status": "Sudah Dibayar",
    
    "package_info": {
      "total_items": 3,
      "items_list": [
        {
          "item_id": "uuid1",
          "items": {
            "id": "uuid1",
            "name": "Mic Wireless",
            "code": "MIC-001"
          }
        },
        {
          "item_id": "uuid2",
          "items": {
            "id": "uuid2",
            "name": "Remote Presenter",
            "code": "REM-001"
          }
        },
        {
          "item_id": "uuid3",
          "items": {
            "id": "uuid3",
            "name": "Kabel HDMI",
            "code": "CBL-001"
          }
        }
      ]
    },
    
    "borrowed_items": [
      /* All items in the package */
    ]
  }
}
```

---

### **3. POST Create Laporan (Admin Only)**

```
POST /api/damage-reports
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (Per Item):**
```json
{
  "user_id": "uuid-user-peminjam",
  "item_id": "uuid-item",
  "borrowing_id": "uuid-peminjaman",
  "damage_type": "per_item",
  
  "title": "Mic Wireless Rusak",
  "description": "Mic ditemukan dalam kondisi pecah setelah dikembalikan",
  "report_type": "Kerusakan",
  "item_condition": "Rusak Berat",
  
  "fine_amount": 150000,
  "fine_reason": "Kerusakan akibat kelalaian peminjam"
}
```

**Body (Per Package):**
```json
{
  "user_id": "uuid-user-peminjam",
  "package_id": "uuid-package",
  "borrowing_id": "uuid-peminjaman",
  "damage_type": "per_package",
  
  "title": "Paket Presentasi Hilang",
  "description": "Seluruh paket tidak dikembalikan",
  "report_type": "Kehilangan",
  
  "fine_amount": 500000,
  "fine_reason": "Biaya penggantian seluruh package"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Laporan kerusakan/kehilangan berhasil dibuat",
  "data": {
    "id": "uuid",
    "report_code": "ITM-20260902-ABCD",  // ← Auto-generated
    "damage_type": "per_item",
    /* ... full detail ... */
  }
}
```

---

### **4. PATCH Update Laporan (Admin Only)**

```
PATCH /api/damage-reports/:id
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "Selesai",
  "fine_amount": 200000,
  "fine_reason": "Biaya perbaikan + penggantian komponen",
  "fine_status": "Sudah Dibayar",
  "item_condition": "Rusak Berat",
  "admin_note": "Denda sudah dilunasi tanggal 5 Sept 2026"
}
```

---

## 🗂️ Report Code Format

### **Per Item:**
```
ITM-20260902-ABCD
│   │        │
│   │        └─ Random 4 chars (uppercase)
│   └─ Date YYYYMMDD
└─ Prefix: ITM
```

### **Per Package:**
```
PKG-20260902-WXYZ
│   │        │
│   │        └─ Random 4 chars (uppercase)
│   └─ Date YYYYMMDD
└─ Prefix: PKG
```

---

## 🔍 Filter Examples

### **1. Lihat semua kerusakan per item:**
```
GET /api/damage-reports?damage_type=per_item
```

### **2. Lihat semua kerusakan per package:**
```
GET /api/damage-reports?damage_type=per_package
```

### **3. Lihat kerusakan item yang pending:**
```
GET /api/damage-reports?damage_type=per_item&status=Menunggu Review
```

### **4. Lihat kehilangan package:**
```
GET /api/damage-reports?damage_type=per_package&report_type=Kehilangan
```

### **5. Lihat laporan user tertentu:**
```
GET /api/damage-reports?user_id=uuid-user
```

---

## 📊 Damage Type Logic

### **Per Item (damage_type = per_item):**
- 1 item rusak/hilang
- Hanya item tersebut yang kondisinya berubah
- Report code: `ITM-YYYYMMDD-XXXX`
- Field: `item_id` diisi, `package_id` null

### **Per Package (damage_type = per_package):**
- Seluruh package rusak/hilang
- SEMUA item dalam package kondisinya berubah
- Report code: `PKG-YYYYMMDD-XXXX`
- Field: `package_id` diisi, `item_id` bisa null atau salah satu item

---

## 🗄️ Database Schema (New Columns)

```sql
ALTER TABLE damage_reports ADD COLUMN report_code TEXT UNIQUE;
ALTER TABLE damage_reports ADD COLUMN damage_type TEXT DEFAULT 'per_item' 
  CHECK (damage_type IN ('per_item', 'per_package'));
ALTER TABLE damage_reports ADD COLUMN package_id UUID REFERENCES packages(id);
```

---

## ⚙️ Migration Steps

1. **Jalankan SQL di Supabase Dashboard → SQL Editor:**
   - Copy semua isi file `SUPABASE_MIGRATION.sql`
   - Paste & Run

2. **Restart Backend Server:**
   ```bash
   npm run dev
   ```

3. **Test Endpoints:**
   - Create laporan per item
   - Create laporan per package
   - Filter by damage_type
   - Get detail

---

## ✅ Testing Checklist

- [ ] Create laporan per item → report_code = `ITM-...`
- [ ] Create laporan per package → report_code = `PKG-...`
- [ ] Filter `?damage_type=per_item` berfungsi
- [ ] Filter `?damage_type=per_package` berfungsi
- [ ] Detail laporan per item tampil lengkap
- [ ] Detail laporan per package tampil `package_info`
- [ ] Report code unique (tidak duplikat)
- [ ] Kondisi item ter-update saat create laporan
- [ ] Notifikasi terkirim ke user

---

Fitur enhanced sudah siap! 🚀
