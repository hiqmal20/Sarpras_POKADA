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

-- Update existing rows agar fine_status tidak NULL
UPDATE damage_reports
SET fine_status = 'Tidak Ada Denda'
WHERE fine_status IS NULL;

-- ============================================================
-- Verifikasi: lihat struktur tabel setelah migration
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'damage_reports'
-- ORDER BY ordinal_position;
