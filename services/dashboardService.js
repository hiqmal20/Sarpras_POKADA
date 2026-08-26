const supabase = require('../config/supabaseClient');

exports.getStats = async () => {
  // Jalankan semua query secara paralel untuk efisiensi
  const [
    itemsResult,
    borrowingsResult,
    pendingResult,
    overdueResult,
    returnsResult,
    damageResult,
    usersResult,
    recentBorrowingsResult
  ] = await Promise.all([
    // Total & stok barang
    supabase
      .from('items')
      .select('id, status, condition', { count: 'exact' }),

    // Total peminjaman aktif (status Dipinjam)
    supabase
      .from('borrowings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Dipinjam'),

    // Peminjaman pending (menunggu persetujuan)
    supabase
      .from('borrowings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending'),

    // Peminjaman terlambat
    supabase
      .from('borrowings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Terlambat'),

    // Total pengembalian bulan ini
    supabase
      .from('returns')
      .select('id', { count: 'exact', head: true })
      .gte('return_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    // Laporan kerusakan menunggu review
    supabase
      .from('damage_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Menunggu Review'),

    // Total user aktif
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Aktif'),

    // 5 peminjaman terbaru
    supabase
      .from('borrowings')
      .select(`
        id, borrow_code, status, borrow_date, planned_return_date,
        users (id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  // Hitung statistik barang
  const items = itemsResult.data || [];
  const totalItems = itemsResult.count || 0;
  const availableItems = items.filter(i => i.status === 'Tersedia').length;
  const borrowedItems = items.filter(i => i.status === 'Dipinjam').length;
  const maintenanceItems = items.filter(i => i.status === 'Dalam Pemeliharaan').length;
  const damagedItems = items.filter(i => i.condition !== 'Baik').length;

  return {
    items: {
      total: totalItems,
      tersedia: availableItems,
      dipinjam: borrowedItems,
      dalamPemeliharaan: maintenanceItems,
      rusak: damagedItems
    },
    borrowings: {
      aktif: borrowingsResult.count || 0,
      pending: pendingResult.count || 0,
      terlambat: overdueResult.count || 0,
      pengembalianBulanIni: returnsResult.count || 0
    },
    laporanKerusakan: {
      menungguReview: damageResult.count || 0
    },
    users: {
      totalAktif: usersResult.count || 0
    },
    recentBorrowings: recentBorrowingsResult.data || []
  };
};
