const supabase = require('../config/supabaseClient');

exports.getStats = async () => {
  const [
    itemsResult,
    categoriesResult,
    borrowingsResult,
    pendingResult,
    overdueResult,
    returnsResult,
    damageResult,
    usersResult,
    recentBorrowingsResult,
    notificationsResult
  ] = await Promise.all([
    // Total & stok barang
    supabase
      .from('items')
      .select('id, category_id, status, condition, stock, available_stock', { count: 'exact' }),

    // Daftar kategori untuk pie chart
    supabase
      .from('categories')
      .select('id, name'),

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

    // Peminjaman yang sudah dikembalikan
    supabase
      .from('borrowings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Dikembalikan'),

    // Laporan kerusakan aktif (belum selesai)
    supabase
      .from('damage_reports')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'Selesai'),

    // Total user aktif
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Aktif'),

    // 5 peminjaman terbaru dengan relasi items
    supabase
      .from('borrowings')
      .select(`
        id, borrow_code, status, borrow_date, purpose, created_at,
        users (id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(5),

    // Aktivitas / notifikasi sistem terbaru
    supabase
      .from('notifications')
      .select('id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .limit(6)
  ]);

  // Hitung statistik barang (total jenis & total fisik unit barang)
  const items = itemsResult.data || [];
  const totalItemTypes = itemsResult.count || 0;
  const totalUnits = items.reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

  // Laporan kerusakan aktif (belum selesai)
  const activeDamageReportsCount = damageResult.count || 0;
  const damagedUnitsFromItems = items.filter(i => i.condition !== 'Baik').reduce((acc, i) => acc + (Number(i.stock) || 0), 0);
  const damagedUnits = Math.max(damagedUnitsFromItems, activeDamageReportsCount);

  const rawAvailable = items.reduce((acc, i) => acc + (Number(i.available_stock) || 0), 0);
  const availableUnits = Math.max(0, rawAvailable - (damagedUnitsFromItems === 0 && activeDamageReportsCount > 0 ? activeDamageReportsCount : 0));
  const borrowedUnits = items.reduce((acc, i) => acc + Math.max(0, (Number(i.stock) || 0) - (Number(i.available_stock) || 0)), 0);
  const maintenanceUnits = items.filter(i => i.status === 'Dalam Pemeliharaan').reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

  // Hitung distribusi kategori untuk visualisasi Pie Chart
  const categories = categoriesResult.data || [];
  const categoryDistribution = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    count: items.filter(i => i.category_id === cat.id).length
  })).filter(c => c.count > 0);

  // Ambil item details untuk recent borrowings
  const recentBorrowings = recentBorrowingsResult.data || [];
  if (recentBorrowings.length > 0) {
    const borrowIds = recentBorrowings.map(b => b.id);
    const { data: bItems } = await supabase
      .from('borrowings_items')
      .select('borrowing_id, quantity, items:items!borrowings_items_item_id_fkey(name, code)')
      .in('borrowing_id', borrowIds);

    if (bItems) {
      const itemsMap = {};
      bItems.forEach(bi => {
        if (!itemsMap[bi.borrowing_id]) itemsMap[bi.borrowing_id] = [];
        itemsMap[bi.borrowing_id].push(bi);
      });
      recentBorrowings.forEach(b => {
        b.items = itemsMap[b.id] || [];
      });
    }
  }

  return {
    items: {
      total: totalUnits > 0 ? totalUnits : totalItemTypes,
      totalTypes: totalItemTypes,
      totalUnits,
      tersedia: availableUnits,
      dipinjam: borrowedUnits,
      dalamPemeliharaan: maintenanceUnits,
      rusak: damagedUnits
    },
    categoryDistribution,
    borrowings: {
      aktif: borrowingsResult.count || 0,
      pending: pendingResult.count || 0,
      terlambat: overdueResult.count || 0,
      dikembalikan: returnsResult.count || 0
    },
    laporanKerusakan: {
      menungguReview: damageResult.count || 0
    },
    users: {
      totalAktif: usersResult.count || 0
    },
    recentBorrowings,
    recentActivities: notificationsResult.data || []
  };
};
