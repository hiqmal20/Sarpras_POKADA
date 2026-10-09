const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { sanitizeSearch } = require('../utils/sanitizeSearch');

/**
 * Generate unique report code dengan prefix ITM- atau PKG-
 * Format: ITM-YYYYMMDD-XXXX atau PKG-YYYYMMDD-XXXX
 */
const generateReportCode = (damageType) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = damageType === 'per_package' ? 'PKG' : 'ITM';
  return `${prefix}-${dateStr}-${randomStr}`;
};

exports.findAllReports = async ({ user_id, item_id, status, report_type, damage_type, fine_status, start_date, end_date, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('damage_reports')
    .select(`
      *,
      users (id, name, nomor_induk, email, no_hp, role, foto),
      items (id, name, code, image_url, condition, status),
      packages (id, name, status),
      borrowings (id, borrow_code, purpose, borrow_date, status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id && user_id !== 'undefined') query = query.eq('user_id', user_id);
  if (item_id && item_id !== 'undefined') query = query.eq('item_id', item_id);
  if (status && status !== 'undefined' && status !== 'null' && status !== 'all') query = query.eq('status', status);
  if (report_type && report_type !== 'undefined' && report_type !== 'all') query = query.eq('report_type', report_type);
  if (damage_type && damage_type !== 'undefined' && damage_type !== 'all') query = query.eq('damage_type', damage_type); // Filter: per_item | per_package
  if (start_date) query = query.gte('created_at', start_date);
  if (end_date) query = query.lte('created_at', end_date);
  if (search) {
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) {
      query = query.or(`report_code.ilike.%${safeSearch}%,title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }
  }
  if (fine_status && fine_status !== 'undefined' && fine_status !== 'all') {
    if (fine_status === 'Belum Dibayar' || fine_status === 'unpaid') {
      query = query.eq('fine_status', 'Belum Dibayar').gt('fine_amount', 0);
    } else if (fine_status === 'Sudah Dibayar' || fine_status === 'paid') {
      query = query.eq('fine_status', 'Sudah Dibayar').gt('fine_amount', 0);
    } else {
      query = query.eq('fine_status', fine_status);
    }
  }

  query = query.range(offset, offset + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  // Hitung summary status murni dari seluruh database untuk user/admin
  let countQuery = supabase.from('damage_reports').select('status, fine_amount, fine_status');
  if (user_id) countQuery = countQuery.eq('user_id', user_id);
  const { data: allStatuses } = await countQuery;

  let pendingCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let totalFine = 0;
  let unpaidFine = 0;

  (allStatuses || []).forEach((r) => {
    const st = (r.status || '').toLowerCase();
    if (st.includes('selesai') || st === 'resolved') {
      resolvedCount++;
    } else if (
      st.includes('perbaik') ||
      st.includes('proses') ||
      st === 'sedang diperbaiki' ||
      st === 'in_progress'
    ) {
      inProgressCount++;
    } else {
      pendingCount++;
    }

    const fine = Number(r.fine_amount) || 0;
    totalFine += fine;
    if (r.fine_status === 'Belum Dibayar' && fine > 0) unpaidFine += fine;
  });

  return {
    reports: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    counts: {
      pending: pendingCount,
      in_progress: inProgressCount,
      resolved: resolvedCount,
      total: (allStatuses || []).length,
      totalFine,
      unpaidFine,
      paidFineCount: (allStatuses || []).filter(r => (r.fine_status === 'Sudah Dibayar' || (r.status || '').toLowerCase().includes('selesai')) && Number(r.fine_amount) > 0).length,
      unpaidFineCount: (allStatuses || []).filter(r => r.fine_status === 'Belum Dibayar' && Number(r.fine_amount) > 0).length
    }
  };
};

/**
 * Detail laporan kerusakan dengan info lengkap
 */
exports.findReportById = async (id) => {
  const { data, error } = await supabase
    .from('damage_reports')
    .select(`
      *,
      users (id, name, nomor_induk, email, no_hp, role, foto),
      items (id, name, code, image_url, condition, status, stock, available_stock, category_id, categories (id, name)),
      packages (id, name, status),
      borrowings (id, borrow_code, purpose, borrow_date, status, actual_return_date)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Laporan kerusakan tidak ditemukan', 404);
  }

  // Jika ada borrowing_id, ambil detail items yang dipinjam
  if (data.borrowing_id) {
    const { data: borrowedItems } = await supabase
      .from('borrowings_items')
      .select(`
        id,
        quantity,
        condition_before,
        condition_after,
        note,
        items (id, name, code, image_url, condition, status)
      `)
      .eq('borrowing_id', data.borrowing_id);

    data.borrowed_items = borrowedItems || [];
  }

  // Jika damage_type = per_package, ambil info package
  if (data.damage_type === 'per_package' && data.borrowing_id) {
    // Cek apakah peminjaman ini dari package
    const { data: borrowing } = await supabase
      .from('borrowings')
      .select('id, borrow_code')
      .eq('id', data.borrowing_id)
      .single();

    if (borrowing) {
      // Ambil semua items dalam peminjaman ini
      const { data: allItems } = await supabase
        .from('borrowings_items')
        .select('item_id, items (id, name, code)')
        .eq('borrowing_id', data.borrowing_id);

      data.package_info = {
        total_items: allItems?.length || 0,
        items_list: allItems || []
      };
    }
  }

  return data;
};

/**
 * Admin membuat laporan kerusakan/kehilangan secara manual.
 * Admin juga bisa langsung memasukkan nominal denda.
 */
exports.createNewReport = async ({
  user_id,
  item_id,
  package_id,       // NEW: jika kerusakan pada package
  borrowing_id,
  title,
  description = '',
  image_url = null,
  report_type = 'Kerusakan',
  damage_type,      // NEW: 'per_item' | 'per_package'
  // Field denda — diisi manual oleh admin
  fine_amount = 0,
  fine_reason = '',
  // Kondisi item baru setelah kejadian
  item_condition = null
}) => {
  const now = new Date().toISOString();

  // Auto-detect damage_type jika tidak diisi
  if (!damage_type) {
    damage_type = package_id ? 'per_package' : 'per_item';
  }

  // Generate report code dengan prefix sesuai damage_type
  const reportCode = generateReportCode(damage_type);

  // Validasi: item harus ada jika item_id diberikan
  if (item_id) {
    const { data: itemCheck } = await supabase
      .from('items')
      .select('id, name, condition, status')
      .eq('id', item_id)
      .single();

    if (!itemCheck) {
      throw new AppError('Barang tidak ditemukan', 404);
    }
  }

  // Validasi: package harus ada jika package_id diberikan
  if (package_id) {
    const { data: packageCheck } = await supabase
      .from('packages')
      .select('id, name, status')
      .eq('id', package_id)
      .single();

    if (!packageCheck) {
      throw new AppError('Package tidak ditemukan', 404);
    }
  }

  // Validasi: peminjaman harus ada jika borrowing_id diberikan
  if (borrowing_id) {
    const { data: borrowingCheck } = await supabase
      .from('borrowings')
      .select('id, borrow_code')
      .eq('id', borrowing_id)
      .single();

    if (!borrowingCheck) {
      throw new AppError('Data peminjaman tidak ditemukan', 404);
    }
  }

  const { data, error } = await supabase
    .from('damage_reports')
    .insert([{
      report_code: reportCode,  // ITM-20260902-ABCD atau PKG-20260902-ABCD
      user_id,
      item_id: item_id || null,
      package_id: package_id || null,  // NEW
      borrowing_id: borrowing_id || null,
      title,
      description,
      image_url,
      report_type,         // 'Kerusakan' | 'Kehilangan' | 'Cacat Fungsi'
      damage_type,         // 'per_item' | 'per_package'
      status: 'Menunggu Review',
      fine_amount: Number(fine_amount) || 0,
      fine_reason: fine_reason || '',
      fine_status: fine_amount > 0 ? 'Belum Dibayar' : 'Tidak Ada Denda',
      created_at: now,
      update_at: now
    }])
    .select()
    .single();

  if (error) throw error;

  // Update kondisi & stok item jika ada
  if (item_id && damage_type === 'per_item') {
    const newCondition = item_condition ||
      (report_type === 'Kehilangan' ? 'Hilang' :
       report_type === 'Kerusakan' ? 'Rusak Ringan' : 'Rusak Berat');

    const { data: currentItem } = await supabase
      .from('items')
      .select('available_stock, stock, status')
      .eq('id', item_id)
      .single();

    if (currentItem) {
      const curAvail = currentItem.available_stock !== undefined && currentItem.available_stock !== null
        ? Number(currentItem.available_stock)
        : Number(currentItem.stock || 0);
      const newAvail = Math.max(0, curAvail - 1);
      // Status barang tetap Tersedia jika sisa stok masih ada (> 0).
      // Hanya menjadi 'Dalam Pemeliharaan' jika seluruh unit habis (newAvail === 0).
      const newStatus = newAvail === 0 ? 'Dalam Pemeliharaan' : 'Tersedia';

      await supabase
        .from('items')
        .update({
          condition: newCondition,
          available_stock: newAvail,
          status: newStatus,
          update_at: now
        })
        .eq('id', item_id);
    }
  }

  // Jika package rusak, update kondisi semua item di package & set status package Dalam Pemeliharaan
  if (package_id && damage_type === 'per_package') {
    await supabase
      .from('packages')
      .update({ status: 'Dalam Pemeliharaan', updated_at: now })
      .eq('id', package_id);

    const { data: packageItems } = await supabase
      .from('packages_items')
      .select('item_id, quantity')
      .eq('package_id', package_id);

    if (packageItems && packageItems.length > 0) {
      const newCondition = item_condition || 'Rusak Ringan';
      for (const pi of packageItems) {
        const { data: curItem } = await supabase
          .from('items')
          .select('available_stock, stock')
          .eq('id', pi.item_id)
          .single();

        if (curItem) {
          const curAvail = Number(curItem.available_stock ?? curItem.stock ?? 0);
          const deductQty = Number(pi.quantity) || 1;
          const newAvail = Math.max(0, curAvail - deductQty);
          await supabase
            .from('items')
            .update({
              condition: newCondition,
              available_stock: newAvail,
              update_at: now
            })
            .eq('id', pi.item_id);
        }
      }
    }
  }

  // Kirim notifikasi ke user yang bersangkutan
  const notifService = require('./notificationService');
  if (user_id) {
    const typeLabel = damage_type === 'per_package' ? 'Package' : 'Item';
    const fineMsg = fine_amount > 0
      ? ` Denda yang dikenakan: Rp ${Number(fine_amount).toLocaleString('id-ID')}. Alasan: ${fine_reason}`
      : '';

    try {
      await notifService.createNotification({
        user_id,
        title: `Laporan ${report_type} (${typeLabel}): ${title}`,
        message: `Admin telah mencatat laporan ${report_type.toLowerCase()} untuk Anda. Kode laporan: ${reportCode}.${fineMsg} Silakan hubungi admin untuk informasi lebih lanjut.`,
        type: 'laporan',
        action_url: `/user/riwayat_peminjaman?tab=damage&code=${encodeURIComponent(reportCode)}`,
        reference_id: data.id,
        reference_type: 'damage_report'
      });
    } catch (err) {
      console.error('Gagal kirim notif laporan ke user:', err);
    }
  }

  // Notifikasi ke seluruh Admin / Petugas
  try {
    const { data: reporterUser } = await supabase.from('users').select('name').eq('id', user_id).single();
    const reporterName = reporterUser?.name || 'User';
    await notifService.notifyAdmins({
      title: 'Laporan Kerusakan Baru',
      message: `${reporterName} melaporkan kerusakan barang: "${title}" (Kode: ${reportCode}).`,
      type: 'laporan',
      action_url: `/admin/rekap_laporan?search=${encodeURIComponent(reportCode)}`,
      reference_id: data.id,
      reference_type: 'damage_report'
    });
  } catch (err) {
    console.error('Gagal broadcast notif kerusakan ke admin:', err);
  }

  return exports.findReportById(data.id);
};

/**
 * Update status laporan dan/atau denda (oleh Admin/Petugas).
 * Admin bisa ubah nominal denda kapan saja.
 */
exports.updateReport = async (id, {
  status,
  admin_note,
  fine_amount,
  fine_reason,
  fine_status,
  item_condition
}) => {
  const now = new Date().toISOString();

  // Ambil data laporan saat ini
  const { data: current, error: fetchError } = await supabase
    .from('damage_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    throw new AppError('Laporan tidak ditemukan', 404);
  }

  const updatePayload = { update_at: now };

  if (status !== undefined) updatePayload.status = status;
  if (admin_note !== undefined) updatePayload.admin_note = admin_note;
  if (fine_amount !== undefined) {
    updatePayload.fine_amount = Number(fine_amount);
    // Jika denda diubah, auto-set fine_status jika belum ada
    if (fine_status === undefined) {
      updatePayload.fine_status = Number(fine_amount) > 0 ? 'Belum Dibayar' : 'Tidak Ada Denda';
    }
  }
  if (fine_reason !== undefined) updatePayload.fine_reason = fine_reason;
  if (fine_status !== undefined) updatePayload.fine_status = fine_status;

  // Aturan: Jika denda sudah dibayar (atau diset Selesai), laporan langsung berstatus Selesai
  if (updatePayload.fine_status === 'Sudah Dibayar') {
    updatePayload.status = 'Selesai';
  } else if (updatePayload.status === 'Selesai' && updatePayload.fine_status === 'Belum Dibayar') {
    updatePayload.fine_status = 'Sudah Dibayar';
  }

  const { data, error } = await supabase
    .from('damage_reports')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update status barang/paket sesuai status perbaikan laporan
  const newReportStatus = updatePayload.status || current.status;
  if (newReportStatus === 'Sedang Diperbaiki') {
    if (current.item_id) {
      const { data: itm } = await supabase
        .from('items')
        .select('available_stock, stock')
        .eq('id', current.item_id)
        .single();
      if (itm) {
        const avail = Number(itm.available_stock ?? itm.stock ?? 0);
        const itemStatus = avail === 0 ? 'Dalam Pemeliharaan' : 'Tersedia';
        await supabase
          .from('items')
          .update({ status: itemStatus, update_at: now })
          .eq('id', current.item_id);
      }
    }
    if (current.package_id) {
      await supabase
        .from('packages')
        .update({ status: 'Dalam Pemeliharaan', updated_at: now })
        .eq('id', current.package_id);
    }
  } else if (newReportStatus === 'Selesai') {
    // Perbaikan selesai: pulihkan stok dan status menjadi Tersedia/Aktif
    if (current.item_id) {
      const { data: itm } = await supabase
        .from('items')
        .select('available_stock, stock')
        .eq('id', current.item_id)
        .single();
      if (itm) {
        const restoredAvail = Math.min(Number(itm.stock || 0), Number(itm.available_stock || 0) + 1);
        await supabase
          .from('items')
          .update({
            available_stock: restoredAvail,
            status: restoredAvail > 0 ? 'Tersedia' : 'Stok Kosong',
            condition: item_condition || 'Baik',
            update_at: now
          })
          .eq('id', current.item_id);
      }
    }
    if (current.package_id) {
      await supabase
        .from('packages')
        .update({ status: 'Aktif', updated_at: now })
        .eq('id', current.package_id);

      const { data: pkgItems } = await supabase
        .from('packages_items')
        .select('item_id, quantity')
        .eq('package_id', current.package_id);

      if (pkgItems) {
        for (const pi of pkgItems) {
          const { data: itm } = await supabase
            .from('items')
            .select('available_stock, stock')
            .eq('id', pi.item_id)
            .single();
          if (itm) {
            const addQty = Number(pi.quantity) || 1;
            const restored = Math.min(Number(itm.stock || 0), Number(itm.available_stock || 0) + addQty);
            await supabase
              .from('items')
              .update({
                available_stock: restored,
                status: restored > 0 ? 'Tersedia' : 'Stok Kosong',
                condition: 'Baik',
                update_at: now
              })
              .eq('id', pi.item_id);
          }
        }
      }
    }
  } else if (item_condition && current.item_id) {
    await supabase
      .from('items')
      .update({ condition: item_condition, update_at: now })
      .eq('id', current.item_id);
  }

  // Notifikasi ke user
  if (current.user_id) {
    let msg = `Status laporan "${current.title}" diperbarui menjadi "${status || current.status}".`;
    if (fine_amount !== undefined) {
      msg += ` Denda: Rp ${Number(fine_amount).toLocaleString('id-ID')}.`;
    }
    if (fine_status) {
      msg += ` Status denda: ${fine_status}.`;
    }
    if (admin_note) {
      msg += ` Catatan: ${admin_note}`;
    }

    try {
      const notifService = require('./notificationService');
      await notifService.createNotification({
        user_id: current.user_id,
        title: `Update Laporan: ${current.title}`,
        message: msg,
        type: 'laporan',
        action_url: `/user/riwayat_peminjaman?tab=damage&code=${encodeURIComponent(current.report_code || '')}`,
        reference_id: id,
        reference_type: 'damage_report'
      });
    } catch (err) {
      console.error('Gagal kirim update laporan ke user:', err);
    }
  }

  return exports.findReportById(id);
};
