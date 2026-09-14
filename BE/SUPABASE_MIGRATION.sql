-- ============================================================
-- MIGRATION: Tambah kolom denda ke tabel damage_reports
-- Jalankan ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- Tambah kolom fine_amount (nominal denda dalam Rupiah)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS fine_amount BIGINT DEFAULT 0;

-- Tambah kolom fine_reason (alasan pengenaan denda)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS fine_reason TEXT DEFAULT '';

-- Tambah kolom fine_status (status pembayaran denda)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS fine_status TEXT DEFAULT 'Tidak Ada Denda'
  CHECK (fine_status IN ('Tidak Ada Denda', 'Belum Dibayar', 'Sudah Dibayar'));

-- Tambah kolom admin_note jika belum ada
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT '';

-- ============================================================
-- NEW: Tambah kolom report_code (ITM- atau PKG-)
-- ============================================================

-- Tambah kolom report_code (unique code untuk laporan)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS report_code TEXT UNIQUE;

-- Tambah kolom damage_type (per_item atau per_package)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS damage_type TEXT DEFAULT 'per_item'
  CHECK (damage_type IN ('per_item', 'per_package'));

-- Tambah kolom package_id (jika kerusakan pada package)
ALTER TABLE damage_reports
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;

-- Create index untuk performance
CREATE INDEX IF NOT EXISTS idx_damage_reports_damage_type ON damage_reports(damage_type);
CREATE INDEX IF NOT EXISTS idx_damage_reports_report_code ON damage_reports(report_code);

-- ============================================================
-- Update existing rows
-- ============================================================

-- Set fine_status default untuk existing rows
UPDATE damage_reports
SET fine_status = 'Tidak Ada Denda'
WHERE fine_status IS NULL;

-- Set damage_type default untuk existing rows
UPDATE damage_reports
SET damage_type = 'per_item'
WHERE damage_type IS NULL;

-- Generate report_code untuk existing rows (optional - bisa skip jika tidak ada data lama)
-- UPDATE damage_reports
-- SET report_code = CONCAT('ITM-', TO_CHAR(created_at, 'YYYYMMDD'), '-', UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)))
-- WHERE report_code IS NULL AND damage_type = 'per_item';

-- ============================================================
-- Verifikasi: lihat struktur tabel setelah migration
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'damage_reports'
-- ORDER BY ordinal_position;

-- ============================================================
-- NEW MIGRATION: Shortcut Direct Link / Redirect di Notifications
-- ============================================================

-- Tambah kolom action_url untuk menyimpan shortcut direct URL tujuan
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Tambah kolom reference_id (UUID atau Kode dokumen transaksi terkait)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Tambah kolom reference_type ('borrowing', 'return', 'damage_report', 'chat', 'system')
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS reference_type TEXT;

-- Buat index untuk pencarian cepat berdasarkan relasi transaksi
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- ============================================================
-- NEW MIGRATION: Status Last Seen & Online di Tabel Users
-- ============================================================

-- Tambah kolom last_seen untuk mencatat riwayat terakhir online user/admin
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Index untuk performa query status user
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);


