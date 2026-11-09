const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { sanitizeSearch } = require('../utils/sanitizeSearch');
const { incrementStock, decrementStock, incrementPackageStock } = require('../utils/stockManager');

exports.findAllReturns = async ({ user_id, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const borrowingsRelation = user_id ? 'borrowings!inner' : 'borrowings';
  let query = supabase
    .from('returns')
    .select(`
      *,
      borrowings:${borrowingsRelation} (
        id,
        borrow_code,
        purpose,
        borrow_date,
        planned_return_date,
        actual_return_date,
        user_id,
        users (id, name, email, no_hp)
      ),
      receiver:users!returns_received_by_fkey (id, name, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) {
    query = query.eq('borrowings.user_id', user_id);
  }

  if (search) {
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) {
      query = query.or(`receiver_notes.ilike.%${safeSearch}%`);
    }
  }

  const { data: returns, count, error } = await query.range(offset, offset + Number(limit) - 1);

  if (error) throw error;

  const borrowingIds = (returns || []).map((r) => r.borrowing_id).filter(Boolean);
  let itemsMap = {};
  if (borrowingIds.length > 0) {
    const { data: bItems } = await supabase
      .from('borrowings_items')
      .select('*, items:items!borrowings_items_item_id_fkey(id, name, code:item_code, image_url)')
      .in('borrowing_id', borrowingIds);

    if (bItems) {
      bItems.forEach((item) => {
        if (!itemsMap[item.borrowing_id]) itemsMap[item.borrowing_id] = [];
        itemsMap[item.borrowing_id].push(item);
      });
    }
  }

  const enrichedReturns = (returns || []).map((r) => ({
    ...r,
    borrowing_items: itemsMap[r.borrowing_id] || []
  }));

  return {
    returns: enrichedReturns,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findReturnById = async (id) => {
  const { data: returnData, error } = await supabase
    .from('returns')
    .select(`
      *,
      borrowings (
        *,
        users (id, name, email, no_hp)
      ),
      receiver:users!returns_received_by_fkey (id, name, role)
    `)
    .eq('id', id)
    .single();

  if (error || !returnData) {
    throw new AppError('Data pengembalian tidak ditemukan', 404);
  }

  // Ambil item dari borrowings_items
  if (returnData.borrowing_id) {
    const { data: bItems } = await supabase
      .from('borrowings_items')
      .select('*, items:items!borrowings_items_item_id_fkey(*)')
      .eq('borrowing_id', returnData.borrowing_id);

    returnData.borrowing_items = bItems || [];
  }

  return returnData;
};

exports.createReturnRecord = async ({ borrowing_id, received_by, return_date = new Date().toISOString(), condition = 'Baik', note = '', items_condition = [], damage_description = '', fine_amount = 0, fine_reason = '' }, options = {}) => {
  // 1. Cek peminjaman
  const { data: borrowing, error: bError } = await supabase
    .from('borrowings')
    .select('*')
    .eq('id', borrowing_id)
    .single();

  if (bError || !borrowing) {
    throw new AppError('Data peminjaman tidak ditemukan', 404);
  }

  if (options?.requester && !['Admin', 'Petugas'].includes(options.requester.role) && borrowing.user_id !== options.requester.id) {
    throw new AppError('Akses ditolak: bukan peminjaman milik Anda', 403);
  }

  if (borrowing.status === 'Dikembalikan') {
    throw new AppError('Peminjaman ini sudah tercatat dikembalikan', 400);
  }

  const { data: existingReturn, error: existingReturnError } = await supabase
    .from('returns')
    .select('id')
    .eq('borrowing_id', borrowing_id)
    .maybeSingle();
  if (existingReturnError) throw existingReturnError;
  if (existingReturn) {
    throw new AppError('Pengembalian untuk peminjaman ini sudah diproses', 409);
  }

  if (!['Disetujui', 'Dipinjam'].includes(borrowing.status)) {
    throw new AppError(`Pengembalian hanya bisa diproses untuk status Disetujui/Dipinjam (saat ini: ${borrowing.status})`, 400);
  }

  const now = new Date().toISOString();
  let returnData = null;
  let bItems = null; // Di-hoist agar bisa dipakai di luar try block (untuk laporan kerusakan)
  const restoredStock = [];

  try {
    // 2. Insert returns
    const { data: inserted, error: retError } = await supabase
      .from('returns')
      .insert([{
        borrowing_id,
        received_by: received_by || null,
        return_date,
        condition,
        note: [note, damage_description, Number(fine_amount) > 0 ? `Denda: Rp ${Number(fine_amount).toLocaleString('id-ID')}. ${fine_reason}` : ''].filter(Boolean).join(' '),
        created_at: now
      }])
      .select()
      .single();

    if (retError) throw retError;
    returnData = inserted;

    // Update status borrowing menjadi Dikembalikan
    const { error: borrowUpdateError } = await supabase
      .from('borrowings')
      .update({
        status: 'Dikembalikan',
        actual_return_date: return_date
      })
      .eq('id', borrowing_id);

    if (borrowUpdateError) throw borrowUpdateError;

    // 4. Pulihkan stok fisik item & update kondisi barang.
    // Paket virtual tidak memiliki stok terpisah.
    const { data: bItemsResult } = await supabase
      .from('borrowings_items')
      .select('*, items:items!borrowings_items_item_id_fkey(id, name, item_code)')
      .eq('borrowing_id', borrowing_id);
    bItems = bItemsResult;

    if (bItems && bItems.length > 0) {
      for (const bItem of bItems) {
        // Cari kondisi spesifik untuk item ini dari items_condition yang dikirim FE
        const specificCond = (items_condition || []).find(c => c.borrowings_item_id === bItem.id);

        // Tentukan kondisi akhir item ini:
        // - Jika ada specificCond → pakai condition_after dari sana
        // - Jika tidak ada specificCond → pakai kondisi global (condition)
        const itemConditionAfter = specificCond?.condition_after || condition;

        // Update condition_after & note di borrowings_items (selalu, untuk semua item)
        const { error: condError } = await supabase
          .from('borrowings_items')
          .update({
            condition_after: itemConditionAfter,
            note: specificCond?.note || bItem.note || ''
          })
          .eq('id', bItem.id);
        if (condError) throw condError;

        // Hitung qty yang benar-benar bisa dikembalikan (tidak melebihi sisa yang belum dikembalikan)
        const requestedReturnQty = Number(specificCond?.quantity_returned || bItem.quantity || 0);
        const actualReturnedQty = Math.min(
          requestedReturnQty,
          Number(bItem.quantity || 0) - Number(bItem.quantity_returned || 0)
        );

        // Stok HANYA dikembalikan jika kondisi item = "Baik"
        // Item rusak/hilang TIDAK dikembalikan ke stok
        if (itemConditionAfter === 'Baik') {
          await incrementStock(bItem.item_id, actualReturnedQty);
          restoredStock.push({ item_id: bItem.item_id, quantity: actualReturnedQty });
        }
        // Item rusak/hilang: stok tetap tidak bertambah, namun quantity_returned tetap dicatat
        // agar sistem tahu item sudah diproses pengembaliannya

        const { error: returnedQtyError } = await supabase
          .from('borrowings_items')
          .update({
            quantity_returned: Math.min(
              Number(bItem.quantity || 0),
              Number(bItem.quantity_returned || 0) + actualReturnedQty
            )
          })
          .eq('id', bItem.id);
        if (returnedQtyError) throw returnedQtyError;
      }
    }
  } catch (err) {
    try {
      // Balikkan stok yang sudah berhasil dipulihkan sebelum error terjadi.
      for (const restored of restoredStock.reverse()) {
        if (restored.quantity > 0) {
          await decrementStock(restored.item_id, restored.quantity);
        }
      }
      if (returnData?.id) {
        await supabase.from('returns').delete().eq('id', returnData.id);
      }
      await supabase.from('borrowings').update({ status: borrowing.status, actual_return_date: borrowing.actual_return_date || null }).eq('id', borrowing_id);
    } catch (_) { /* best effort rollback */ }
    throw err instanceof AppError ? err : new AppError(`Gagal memproses pengembalian: ${err.message}`, 500);
  }

  // Simpan laporan kerusakan/kehilangan melalui modul yang sama agar riwayat terhubung.
  // Jika ada items_condition, buat laporan per item yang rusak/hilang.
  try {
    const damageReportService = require('./damageReportService');

    // Kumpulkan item yang kondisinya bukan "Baik" dari items_condition
    const damagedItems = (items_condition || []).filter(ic => ic.condition_after && ic.condition_after !== 'Baik');

    if (damagedItems.length > 0) {
      // Susun deskripsi dengan nama item yang sebenarnya (dari bItems yang sudah di-query)
      const bItemsData = bItems || [];
      const descParts = damagedItems.map(ic => {
        const matchedBItem = bItemsData.find(b => b.id === ic.borrowings_item_id);
        const itemName = matchedBItem?.items?.name || `Item ID: ${ic.borrowings_item_id}`;
        return `${itemName} → ${ic.condition_after}${ic.damage_description ? `: ${ic.damage_description}` : ''}${ic.note ? ` (${ic.note})` : ''}`;
      });

      const totalFineFromItems = damagedItems.reduce((sum, ic) => sum + Number(ic.fine_amount || 0), 0);
      const fineReasonParts = damagedItems
        .filter(ic => Number(ic.fine_amount || 0) > 0 && ic.fine_reason)
        .map(ic => {
          const matchedBItem = bItemsData.find(b => b.id === ic.borrowings_item_id);
          const itemName = matchedBItem?.items?.name || ic.borrowings_item_id;
          return `[${itemName}] ${ic.fine_reason}`;
        });

      const conditionPriority = { 'Baik': 0, 'Rusak Ringan': 1, 'Rusak Berat': 2, 'Hilang': 3 };
      const worstCondition = damagedItems.reduce((worst, ic) => {
        return (conditionPriority[ic.condition_after] || 0) > (conditionPriority[worst] || 0)
          ? ic.condition_after : worst;
      }, 'Rusak Ringan');

      await damageReportService.createDamageReport({
        user_id: borrowing.user_id,
        borrowing_id,
        title: worstCondition === 'Hilang' ? 'Laporan kehilangan saat pengembalian' : 'Laporan kerusakan saat pengembalian',
        description: damage_description || descParts.join(' | ') || `${damagedItems.length} barang dikembalikan dengan kondisi tidak baik`,
        report_type: worstCondition === 'Hilang' ? 'Kehilangan' : 'Kerusakan',
        damage_type: borrowing.package_id ? 'per_package' : 'per_item',
        fine_amount: totalFineFromItems > 0 ? totalFineFromItems : (Number(fine_amount) || 0),
        fine_reason: fineReasonParts.join(' | ') || fine_reason || damagedItems.map(ic => ic.fine_reason).filter(Boolean).join(' | ') || ''
      });
    } else if (condition !== 'Baik' && (damage_description || Number(fine_amount) > 0)) {
      // Fallback: laporan global jika tidak ada items_condition tapi kondisi global bukan Baik
      await damageReportService.createDamageReport({
        user_id: borrowing.user_id,
        borrowing_id,
        title: condition === 'Hilang' ? 'Laporan kehilangan saat pengembalian' : 'Laporan kerusakan saat pengembalian',
        description: damage_description || note || condition,
        report_type: condition === 'Hilang' ? 'Kehilangan' : 'Kerusakan',
        damage_type: borrowing.package_id ? 'per_package' : 'per_item',
        fine_amount: Number(fine_amount) || 0,
        fine_reason: fine_reason || ''
      });
    }
  } catch (reportError) {
    console.error('Gagal membuat laporan kondisi pengembalian:', reportError);
  }

  // 5. Notifikasi ke user peminjam
  await supabase.from('notifications').insert([{
    user_id: borrowing.user_id,
    title: 'Pengembalian Berhasil',
    message: `Peminjaman dengan kode ${borrowing.borrow_code} telah resmi diterima kembali. Terima kasih!`,
    type: 'pengembalian',
    is_read: false,
    created_at: now
  }]);

  // Notifikasi ke seluruh Admin / Petugas
  try {
    const notifService = require('./notificationService');
    const { data: borrowerUser } = await supabase.from('users').select('name').eq('id', borrowing.user_id).single();
    const borrowerName = borrowerUser?.name || 'User';
    await notifService.notifyAdmins({
      title: 'Barang Telah Dikembalikan',
      message: `${borrowerName} telah mengembalikan barang untuk peminjaman ${borrowing.borrow_code}. Kondisi: ${condition}.${note ? ` Catatan: ${note}` : ''}`,
      type: 'pengembalian'
    });
  } catch (err) {
    console.error('Gagal broadcast notif pengembalian ke admin:', err);
  }

  return returnData;
};
