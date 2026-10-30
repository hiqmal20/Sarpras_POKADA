-- ==============================================================================
-- SARPRAS POKADA: COMPLETE MASTER DATABASE SCHEMA
-- Jalankan skrip ini sekali di Supabase Dashboard → SQL Editor
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
