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
