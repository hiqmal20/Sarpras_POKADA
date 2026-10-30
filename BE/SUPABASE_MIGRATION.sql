-- ============================================================
-- MIGRATION: Tambah kolom denda ke tabel damage_reports
-- Jalankan ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- Pastikan tabel damage_reports sudah ada (buat jika belum ada)
CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  item_id UUID,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT,
  report_type TEXT DEFAULT 'Kerusakan',
  status TEXT DEFAULT 'Menunggu Review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- Kompatibilitas Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL DEFAULT 'UNKNOWN',
  entity TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity TEXT;

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

-- Pastikan tabel notifications sudah ada
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Pastikan tabel users sudah ada
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_induk TEXT UNIQUE,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'Mahasiswa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom last_seen untuk mencatat riwayat terakhir online user/admin
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Index untuk performa query status user
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- ============================================================
-- NEW MIGRATION: Atomic Stock Management (Cegah Race Condition)
-- ============================================================

-- 1. Fungsi pengurangan stok secara atomic dengan Row-Level Lock (FOR UPDATE)
CREATE OR REPLACE FUNCTION decrement_item_stock(p_item_id UUID, p_quantity INT)
RETURNS jsonb AS $$
DECLARE
  v_item record;
BEGIN
  -- Kunci baris spesifik ini selama transaksi untuk mencegah double booking / race condition
  SELECT id, name, stock, available_stock, status
  INTO v_item
  FROM items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang dengan ID % tidak ditemukan', p_item_id;
  END IF;

  IF v_item.status <> 'Tersedia' THEN
    RAISE EXCEPTION 'Barang "%" sedang tidak tersedia (status: %)', v_item.name, v_item.status;
  END IF;

  IF v_item.available_stock < p_quantity THEN
    RAISE EXCEPTION 'Stok tidak mencukupi untuk "%". Tersedia: %, Diminta: %', v_item.name, v_item.available_stock, p_quantity;
  END IF;

  UPDATE items
  SET
    available_stock = available_stock - p_quantity,
    status = CASE WHEN available_stock - p_quantity = 0 THEN 'Stok Kosong' ELSE status END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fungsi penambahan / pemulihan stok secara atomic
CREATE OR REPLACE FUNCTION increment_item_stock(p_item_id UUID, p_quantity INT)
RETURNS jsonb AS $$
DECLARE
  v_item record;
BEGIN
  SELECT id, stock, available_stock, status
  INTO v_item
  FROM items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang dengan ID % tidak ditemukan', p_item_id;
  END IF;

  UPDATE items
  SET
    available_stock = LEAST(stock, available_stock + p_quantity),
    status = CASE WHEN status = 'Stok Kosong' AND LEAST(stock, available_stock + p_quantity) > 0 THEN 'Tersedia' ELSE status END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NEW MIGRATION: Tabel Audit Log (Audit Trail Keamanan & Aktivitas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index audit logs untuk filter & pencarian cepat
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Aktifkan RLS di audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: service_role punya akses penuh, user biasa tidak dapat memodifikasi audit log
DROP POLICY IF EXISTS "service_role_all_audit_logs" ON public.audit_logs;
CREATE POLICY "service_role_all_audit_logs" ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);



