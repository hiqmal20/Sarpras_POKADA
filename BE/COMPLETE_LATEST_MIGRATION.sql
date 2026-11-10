-- ==============================================================================
-- SARPRAS POKADA - COMPLETE LATEST DATABASE MIGRATION
-- Gabungan schema utama dan seluruh migration terbaru.
-- Jalankan seluruh file ini di Supabase SQL Editor.
-- ==============================================================================


-- >>> SOURCE: BE/COMPLETE_SCHEMA.sql

-- ==============================================================================
-- SARPRAS POKADA: COMPLETE MASTER DATABASE SCHEMA
-- Jalankan skrip ini sekali di Supabase Dashboard â†’ SQL Editor
-- File ini aman dijalankan pada database baru maupun database yang sudah ada.
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABEL USERS (Profil Pengguna & Staf)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_induk TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Mahasiswa' CHECK (role IN ('Admin', 'Petugas', 'Mahasiswa', 'Dosen', 'Staff')),
  no_hp TEXT DEFAULT '',
  foto TEXT,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif', 'Ditangguhkan')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nomor_induk ON public.users(nomor_induk);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen);

-- ==============================================================================
-- 2. TABEL CATEGORIES (Kategori Barang)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABEL ITEMS (Aset / Barang Sarpras)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  item_code TEXT UNIQUE,
  brand TEXT DEFAULT '',
  description TEXT DEFAULT '',
  stock INT NOT NULL DEFAULT 0,
  available_stock INT NOT NULL DEFAULT 0,
  condition TEXT DEFAULT 'Baik',
  location TEXT DEFAULT '',
  image_url TEXT,
  status TEXT DEFAULT 'Tersedia',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_item_code ON public.items(item_code);

-- ==============================================================================
-- 4. TABEL PACKAGES (Paket Barang)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  package_code TEXT UNIQUE,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  status TEXT DEFAULT 'Tersedia',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.packages_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_items_pkg ON public.packages_items(package_id);
CREATE INDEX IF NOT EXISTS idx_packages_items_item ON public.packages_items(item_id);

-- ==============================================================================
-- 5. TABEL BORROWINGS & BORROWINGS_ITEMS (Transaksi Peminjaman)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  borrow_date DATE DEFAULT CURRENT_DATE,
  planned_return_date DATE NOT NULL,
  actual_return_date DATE,
  purpose TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  rejection_reason TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.borrowings_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES public.borrowings(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  condition_before TEXT DEFAULT 'Baik',
  condition_after TEXT,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON public.borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON public.borrowings(status);
CREATE INDEX IF NOT EXISTS idx_borrowings_code ON public.borrowings(borrow_code);
CREATE INDEX IF NOT EXISTS idx_borrowings_items_bid ON public.borrowings_items(borrowing_id);

-- ==============================================================================
-- 6. TABEL RETURNS (Riwayat Pengembalian Fisik)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES public.borrowings(id) ON DELETE CASCADE,
  received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  condition TEXT DEFAULT 'Baik',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_borrowing_id ON public.returns(borrowing_id);

-- ==============================================================================
-- 7. TABEL RETURN_REQUESTS (Pengajuan Pengembalian oleh User)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES public.borrowings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  planned_return_date DATE NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Baik' CHECK (condition IN ('Baik','Rusak Ringan','Rusak Berat')),
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi' CHECK (status IN ('Menunggu Verifikasi','Disetujui','Ditolak')),
  admin_note TEXT DEFAULT '',
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_borrowing ON public.return_requests(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);

-- ==============================================================================
-- 8. TABEL DAMAGE_REPORTS (Laporan Kerusakan / Kehilangan Barang / Paket)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  borrowing_id UUID REFERENCES public.borrowings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  report_type TEXT DEFAULT 'Kerusakan' CHECK (report_type IN ('Kerusakan', 'Kehilangan', 'Cacat Fungsi')),
  damage_type TEXT DEFAULT 'per_item' CHECK (damage_type IN ('per_item', 'per_package')),
  status TEXT DEFAULT 'Menunggu Review',
  fine_amount BIGINT DEFAULT 0,
  fine_reason TEXT DEFAULT '',
  fine_status TEXT DEFAULT 'Tidak Ada Denda' CHECK (fine_status IN ('Tidak Ada Denda', 'Belum Dibayar', 'Sudah Dibayar')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  update_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_damage_reports_user ON public.damage_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_damage_type ON public.damage_reports(damage_type);
CREATE INDEX IF NOT EXISTS idx_damage_reports_report_code ON public.damage_reports(report_code);

-- ==============================================================================
-- 9. TABEL CHATS & CHAT_MESSAGES (Pesan & Fitur Reply WhatsApp Style)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_admin_id ON public.chats(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_message_id);

-- ==============================================================================
-- 10. TABEL NOTIFICATIONS (Notifikasi Transaksi & Navigasi Direct Link)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON public.notifications(reference_type, reference_id);

-- ==============================================================================
-- 11. TABEL AUDIT_LOGS (Pencatatan Aktivitas Keamanan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kompatibilitas untuk database yang sudah memiliki audit_logs versi lama
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- <<< END SOURCE: BE/COMPLETE_SCHEMA.sql

-- >>> SOURCE: BE/SUPABASE_MIGRATION.sql

-- ============================================================
-- MIGRATION: Tambah kolom denda ke tabel damage_reports
-- Jalankan ini di Supabase Dashboard â†’ SQL Editor
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




-- <<< END SOURCE: BE/SUPABASE_MIGRATION.sql

-- >>> SOURCE: BE/STOCK_VIRTUAL_BUNDLING_MIGRATION.sql

-- Virtual Bundling Stock Migration
-- Safe, non-destructive migration for Supabase/PostgreSQL.
-- Run the AUDIT section first. Do not run the enforcement section until audit is clean.

BEGIN;

-- ============================================================================
-- 1. AUDIT ONLY (run these SELECT statements separately before this migration)
-- ============================================================================
-- Negative or impossible item stock:
-- SELECT id, name, stock, available_stock
-- FROM public.items
-- WHERE stock < 0 OR available_stock < 0 OR available_stock > stock;
--
-- Duplicate components in one package:
-- SELECT package_id, item_id, COUNT(*) AS duplicate_rows
-- FROM public.packages_items
-- GROUP BY package_id, item_id
-- HAVING COUNT(*) > 1;
--
-- Invalid borrowing quantities:
-- SELECT id, borrowing_id, item_id, quantity, quantity_returned
-- FROM public.borrowings_items
-- WHERE quantity <= 0
--    OR quantity_returned < 0
--    OR quantity_returned > quantity;
--
-- Packages whose legacy stock differs from component-derived stock:
-- SELECT p.id, p.name, p.stock_available AS legacy_stock,
--        MIN(FLOOR(i.available_stock::numeric / NULLIF(pi.quantity, 0))) AS derived_stock
-- FROM public.packages p
-- JOIN public.packages_items pi ON pi.package_id = p.id
-- JOIN public.items i ON i.id = pi.item_id
-- GROUP BY p.id, p.name, p.stock_available;

-- ============================================================================
-- 2. Compatibility columns: keep them for old data, but mark as deprecated.
-- They are NOT a source of truth and must not be updated by application code.
-- ============================================================================
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS stock_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_borrowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_available integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.packages.stock_total IS
  'DEPRECATED: virtual package stock; calculate from items.available_stock.';
COMMENT ON COLUMN public.packages.stock_borrowed IS
  'DEPRECATED: virtual package stock; do not update manually.';
COMMENT ON COLUMN public.packages.stock_available IS
  'DEPRECATED: virtual package stock; do not use for availability decisions.';

-- Required for partial returns and idempotent return processing.
ALTER TABLE public.borrowings
  ADD COLUMN IF NOT EXISTS package_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.borrowings_items
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0;

-- ============================================================================
-- 3. Database invariants. NOT VALID prevents a migration failure on legacy rows.
-- After cleaning legacy data, run the VALIDATE statements in section 6.
-- ============================================================================
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_stock_nonnegative;
ALTER TABLE public.items
  ADD CONSTRAINT items_stock_nonnegative
  CHECK (stock >= 0 AND available_stock >= 0 AND available_stock <= stock)
  NOT VALID;

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_positive;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_positive
  CHECK (quantity > 0)
  NOT VALID;

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_returned_valid;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_returned_valid
  CHECK (quantity_returned >= 0 AND quantity_returned <= quantity)
  NOT VALID;

ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_package_quantity_positive;
ALTER TABLE public.borrowings
  ADD CONSTRAINT borrowings_package_quantity_positive
  CHECK (package_quantity > 0)
  NOT VALID;

-- Prevent zero/negative package component quantities.
ALTER TABLE public.packages_items
  DROP CONSTRAINT IF EXISTS packages_items_quantity_positive;
ALTER TABLE public.packages_items
  ADD CONSTRAINT packages_items_quantity_positive
  CHECK (quantity > 0)
  NOT VALID;

-- ============================================================================
-- 4. Canonical package availability function.
-- This reads physical item availability only; it never reads package stock.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_virtual_package_stock(p_package_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(MIN(FLOOR(i.available_stock::numeric / NULLIF(pi.quantity, 0)))::integer, 0)
  FROM public.packages_items pi
  JOIN public.items i ON i.id = pi.item_id
  WHERE pi.package_id = p_package_id
    AND i.status NOT IN ('Dalam Pemeliharaan', 'Nonaktif', 'Non-Aktif', 'Stok Rusak');
$$;

-- Convenient read model for admin/user catalog. It does not create a second stock.
CREATE OR REPLACE VIEW public.virtual_package_availability AS
SELECT
  p.id AS package_id,
  p.name,
  p.package_code,
  public.get_virtual_package_stock(p.id) AS available_stock,
  (public.get_virtual_package_stock(p.id) > 0) AS is_available
FROM public.packages p;

-- ============================================================================
-- 5. Indexes for package stock recalculation and transaction lookups.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_packages_items_item_package
  ON public.packages_items(item_id, package_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_items_item_borrowing
  ON public.borrowings_items(item_id, borrowing_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_items_active_return
  ON public.borrowings_items(borrowing_id, quantity_returned);

-- Do NOT create a unique package/item index until the duplicate audit is clean.
-- Then run:
-- CREATE UNIQUE INDEX uq_packages_items_package_item
--   ON public.packages_items(package_id, item_id);

-- Do not grant broad access. Existing RLS policies remain unchanged.
COMMIT;

-- ============================================================================
-- 6. Run only after fixing audit results
-- ============================================================================
-- ALTER TABLE public.items VALIDATE CONSTRAINT items_stock_nonnegative;
-- ALTER TABLE public.borrowings_items VALIDATE CONSTRAINT borrowings_items_quantity_positive;
-- ALTER TABLE public.borrowings_items VALIDATE CONSTRAINT borrowings_items_quantity_returned_valid;
-- ALTER TABLE public.borrowings VALIDATE CONSTRAINT borrowings_package_quantity_positive;
-- ALTER TABLE public.packages_items VALIDATE CONSTRAINT packages_items_quantity_positive;
-- CREATE UNIQUE INDEX uq_packages_items_package_item
--   ON public.packages_items(package_id, item_id);

-- <<< END SOURCE: BE/STOCK_VIRTUAL_BUNDLING_MIGRATION.sql

-- >>> SOURCE: BE/SARPRAS_STOCK_QUANTITY_MIGRATION.sql

-- Safe migration: quantity, item stock invariants, package stock, and active borrowing guard.
-- Review and run in Supabase SQL editor. No destructive operations.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS stock_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_borrowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_available integer NOT NULL DEFAULT 0;

ALTER TABLE public.borrowings
  ADD COLUMN IF NOT EXISTS package_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.borrowings_items
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0;

UPDATE public.borrowings_items
SET quantity = 1
WHERE quantity IS NULL OR quantity < 1;

UPDATE public.borrowings_items
SET quantity_returned = CASE
  WHEN b.status = 'Dikembalikan' THEN quantity
  ELSE LEAST(quantity_returned, quantity)
END
FROM public.borrowings b
WHERE b.id = borrowing_id;

-- Initialize package stock from the current component-derived availability only
-- when package stock has never been configured.
UPDATE public.packages p
SET stock_total = COALESCE(src.stock_total, 0),
    stock_available = COALESCE(src.stock_available, 0),
    stock_borrowed = GREATEST(COALESCE(src.stock_total, 0) - COALESCE(src.stock_available, 0), 0)
FROM (
  SELECT pi.package_id,
         MIN(FLOOR(COALESCE(i.stock, 0)::numeric / GREATEST(pi.quantity, 1)))::integer AS stock_total,
         MIN(FLOOR(COALESCE(i.available_stock, 0)::numeric / GREATEST(pi.quantity, 1)))::integer AS stock_available
  FROM public.packages_items pi
  JOIN public.items i ON i.id = pi.item_id
  GROUP BY pi.package_id
) src
WHERE p.id = src.package_id AND p.stock_total = 0;

ALTER TABLE public.borrowings
  DROP CONSTRAINT IF EXISTS borrowings_package_quantity_positive;
ALTER TABLE public.borrowings
  ADD CONSTRAINT borrowings_package_quantity_positive CHECK (package_quantity > 0);

ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_positive;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE public.borrowings_items
  DROP CONSTRAINT IF EXISTS borrowings_items_quantity_returned_valid;
ALTER TABLE public.borrowings_items
  ADD CONSTRAINT borrowings_items_quantity_returned_valid CHECK (quantity_returned >= 0 AND quantity_returned <= quantity);
ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_stock_nonnegative;
ALTER TABLE public.packages
  ADD CONSTRAINT packages_stock_nonnegative CHECK (stock_total >= 0 AND stock_borrowed >= 0 AND stock_available >= 0 AND stock_borrowed + stock_available = stock_total);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_borrowing_per_user
ON public.borrowings (user_id)
WHERE status IN ('Pending', 'Disetujui', 'Dipinjam', 'Terlambat');

-- Atomic item stock functions used by the existing stockManager.
CREATE OR REPLACE FUNCTION public.decrement_item_stock(p_item_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r items;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity harus positif'; END IF;
  UPDATE items SET available_stock = available_stock - p_quantity,
    status = CASE WHEN available_stock - p_quantity = 0 THEN 'Stok Kosong' ELSE status END,
    update_at = NOW()
  WHERE id = p_item_id AND available_stock >= p_quantity AND status IN ('Tersedia','Stok Kosong')
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok item tidak mencukupi atau item tidak tersedia'; END IF;
  RETURN jsonb_build_object('id', r.id, 'available_stock', r.available_stock, 'status', r.status);
END; $$;

CREATE OR REPLACE FUNCTION public.increment_item_stock(p_item_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r items;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity harus positif'; END IF;
  UPDATE items SET available_stock = LEAST(stock, available_stock + p_quantity),
    status = CASE WHEN LEAST(stock, available_stock + p_quantity) > 0 AND status = 'Stok Kosong' THEN 'Tersedia' ELSE status END,
    update_at = NOW()
  WHERE id = p_item_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item tidak ditemukan'; END IF;
  RETURN jsonb_build_object('id', r.id, 'available_stock', r.available_stock, 'status', r.status);
END; $$;

REVOKE ALL ON FUNCTION public.decrement_item_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_item_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_item_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_item_stock(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decrement_package_stock(p_package_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r packages;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity paket harus positif'; END IF;
  UPDATE packages SET stock_available = stock_available - p_quantity,
    stock_borrowed = stock_borrowed + p_quantity
  WHERE id = p_package_id AND stock_available >= p_quantity
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok paket tidak mencukupi atau paket tidak tersedia'; END IF;
  RETURN jsonb_build_object('id', r.id, 'stock_available', r.stock_available, 'stock_borrowed', r.stock_borrowed);
END; $$;

CREATE OR REPLACE FUNCTION public.increment_package_stock(p_package_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r packages;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity paket harus positif'; END IF;
  UPDATE packages SET stock_available = LEAST(stock_total, stock_available + p_quantity),
    stock_borrowed = GREATEST(0, stock_borrowed - p_quantity)
  WHERE id = p_package_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paket tidak ditemukan'; END IF;
  RETURN jsonb_build_object('id', r.id, 'stock_available', r.stock_available, 'stock_borrowed', r.stock_borrowed);
END; $$;

REVOKE ALL ON FUNCTION public.decrement_package_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_package_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_package_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_package_stock(uuid, integer) TO authenticated, service_role;

-- <<< END SOURCE: BE/SARPRAS_STOCK_QUANTITY_MIGRATION.sql

-- >>> SOURCE: BE/RETURN_REQUESTS_MIGRATION.sql

-- Jalankan di Supabase SQL Editor.
-- Pengajuan user tidak mengubah stok/status peminjaman.
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null references public.borrowings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  planned_return_date date not null,
  condition text not null default 'Baik',
  note text default '',
  status text not null default 'Menunggu Verifikasi',
  admin_note text default '',
  verified_by uuid references public.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint return_requests_condition_check check (condition in ('Baik','Rusak Ringan','Rusak Berat')),
  constraint return_requests_status_check check (status in ('Menunggu Verifikasi','Disetujui','Ditolak'))
);
create index if not exists return_requests_borrowing_idx on public.return_requests(borrowing_id);
create index if not exists return_requests_user_idx on public.return_requests(user_id);
create index if not exists return_requests_status_idx on public.return_requests(status);

-- <<< END SOURCE: BE/RETURN_REQUESTS_MIGRATION.sql

-- >>> SOURCE: BE/CHAT_REPLY_MIGRATION.sql

-- ============================================================
-- MIGRATION: Fitur Reply Pesan Chat (Sarpras POKADA)
-- Jalankan ini di Supabase Dashboard â†’ SQL Editor
-- ============================================================

-- 1. Tambah kolom reply_to_message_id ke tabel chat_messages
-- Referensikan ke tabel chat_messages(id) dengan ON DELETE SET NULL
-- agar apabila pesan asli yang dibalas dihapus, pesan balasan
-- TIDAK terhapus, melainkan nilai reply_to_message_id menjadi NULL.
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- 2. Buat index pada reply_to_message_id untuk mempercepat pencarian relasi reply
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_message_id
ON chat_messages(reply_to_message_id);

-- 3. (Opsional) Verifikasi kolom pada tabel chat_messages
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'chat_messages'
-- ORDER BY ordinal_position;

-- <<< END SOURCE: BE/CHAT_REPLY_MIGRATION.sql
