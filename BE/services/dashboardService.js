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

    // Laporan kerusakan (lengkap untuk klasifikasi status)
    supabase
      .from('damage_reports')
      .select('id, status, fine_status'),

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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
  ]);

  // Laporan kerusakan dikelompokkan sesuai dengan halaman Rekap Laporan
  const damageReports = damageResult.data || [];
  let damageReviewCount = 0;      // Menunggu Review
  let damageRepairCount = 0;      // Sedang Diperbaiki / Dalam Pemeliharaan
  let damageResolvedCount = 0;    // Selesai

  damageReports.forEach(r => {
    const rawStatus = (r.status || '').toLowerCase();
    const fineStatus = r.fine_status || '';
    const isResolved = rawStatus.includes('selesai') || rawStatus === 'resolved' || fineStatus === 'Sudah Dibayar';

    if (isResolved) {
      damageResolvedCount++;
    } else if (
      rawStatus.includes('perbaik') ||
      rawStatus.includes('proses') ||
      rawStatus === 'in_progress' ||
      rawStatus === 'sedang diperbaiki'
    ) {
      damageRepairCount++;
    } else {
      damageReviewCount++;
    }
  });

  // Hitung statistik barang (total jenis & total fisik unit barang)
  const items = itemsResult.data || [];
  const totalItemTypes = itemsResult.count || 0;
  const totalUnits = items.reduce((acc, i) => acc + (Number(i.stock) || 0), 0);
  const rawAvailable = items.reduce((acc, i) => acc + (Number(i.available_stock !== undefined && i.available_stock !== null ? i.available_stock : i.stock) || 0), 0);

  // Status Pemeliharaan & Rusak diambil dari data barang dan laporan teknisi aktif
  const itemsUnderMaintenance = items.filter(i => i.status === 'Dalam Pemeliharaan').reduce((acc, i) => acc + (Number(i.stock) || 0), 0);
  const itemsDamaged = items.filter(i => i.status === 'Rusak' || i.condition === 'Rusak Berat').reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

  const maintenanceUnits = Math.max(itemsUnderMaintenance, damageRepairCount);
  const damagedUnits = Math.max(itemsDamaged, damageReviewCount);

  // Unit yang sedang dipinjam (total unit fisik - tersedia - dalam pemeliharaan - rusak)
  const activeBorrowingsCount = borrowingsResult.count || 0;
  const borrowedUnits = Math.max(activeBorrowingsCount, Math.max(0, totalUnits - rawAvailable - maintenanceUnits - damagedUnits));
  const availableUnits = Math.max(0, totalUnits - borrowedUnits - maintenanceUnits - damagedUnits);
  const damagedLightUnits = items.filter(i => i.condition === 'Rusak Ringan').reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

  // Hitung distribusi kategori untuk visualisasi Pie Chart
  const categories = categoriesResult.data || [];
  const categoryDistribution = categories.map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id);
    return {
      id: cat.id,
      name: cat.name,
      count: catItems.length,
      totalUnits: catItems.reduce((acc, i) => acc + (Number(i.stock) || 0), 0)
    };
  }).filter(c => c.count > 0 || c.totalUnits > 0);

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
      rusak: damagedUnits,
      rusakRingan: damagedLightUnits
    },
    categoryDistribution,
    borrowings: {
      aktif: borrowingsResult.count || 0,
      pending: pendingResult.count || 0,
      terlambat: overdueResult.count || 0,
      dikembalikan: returnsResult.count || 0
    },
    laporanKerusakan: {
      menungguReview: damageReviewCount,
      sedangDiperbaiki: damageRepairCount,
      selesai: damageResolvedCount,
      total: damageReports.length
    },
    users: {
      totalAktif: usersResult.count || 0
    },
    recentBorrowings,
    recentActivities: (notificationsResult.data || []).map((act) => {
      const { resolveActionUrl } = require('./notificationService');
      return {
        ...act,
        action_url: resolveActionUrl(act, 'Admin')
      };
    })
  };
};
