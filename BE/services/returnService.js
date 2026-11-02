const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { sanitizeSearch } = require('../utils/sanitizeSearch');
const { incrementStock, incrementPackageStock } = require('../utils/stockManager');

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

    // 4. Pulihkan stok & update kondisi barang
    if (borrowing.package_id) {
      await incrementPackageStock(borrowing.package_id, borrowing.package_quantity || 1);
    }
    const { data: bItems } = await supabase
      .from('borrowings_items')
      .select('*')
      .eq('borrowing_id', borrowing_id);

    if (bItems && bItems.length > 0) {
      for (const bItem of bItems) {
        const specificCond = (items_condition || []).find(c => c.borrowings_item_id === bItem.id);
        if (specificCond) {
          const { error: condError } = await supabase
            .from('borrowings_items')
            .update({
              condition_after: specificCond.condition_after || condition,
              note: specificCond.note || bItem.note
            })
            .eq('id', bItem.id);
          if (condError) throw condError;
        }

        // Untuk paket, stok unit paket dipulihkan sekali di atas; komponen tidak dihitung ganda.
        if (!borrowing.package_id) {
          await incrementStock(bItem.item_id, bItem.quantity);
        }
        const returnedQty = Number(bItem.quantity_returned || 0) + Number(bItem.quantity || 0);
        const { error: returnedQtyError } = await supabase
          .from('borrowings_items')
          .update({ quantity_returned: Math.min(returnedQty, Number(bItem.quantity || 0)) })
          .eq('id', bItem.id);
        if (returnedQtyError) throw returnedQtyError;
      }
    }
  } catch (err) {
    try {
      if (returnData?.id) {
        await supabase.from('returns').delete().eq('id', returnData.id);
      }
      await supabase.from('borrowings').update({ status: borrowing.status, actual_return_date: borrowing.actual_return_date || null }).eq('id', borrowing_id);
    } catch (_) { /* best effort rollback */ }
    throw err instanceof AppError ? err : new AppError(`Gagal memproses pengembalian: ${err.message}`, 500);
  }

  // Simpan laporan kerusakan/kehilangan melalui modul yang sama agar riwayat terhubung.
  if (condition !== 'Baik' && (damage_description || Number(fine_amount) > 0)) {
    try {
      const damageReportService = require('./damageReportService');
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
    } catch (reportError) {
      console.error('Gagal membuat laporan kondisi pengembalian:', reportError);
    }
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
