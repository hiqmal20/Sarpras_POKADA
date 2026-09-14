const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllReturns = async ({ page = 1, limit = 20, status, search, start_date, end_date }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('returns')
    .select(`
      *,
      borrowings (
        id,
        borrow_code,
        purpose,
        borrow_date,
        actual_return_date,
        status,
        users (id, name, email, nomor_induk, no_hp, role, foto)
      ),
      receiver:users!returns_received_by_fkey (id, name, role, foto)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (start_date) query = query.gte('return_date', start_date);
  if (end_date) query = query.lte('return_date', end_date);

  query = query.range(offset, offset + Number(limit) - 1);

  const { data: returns, count, error } = await query;

  if (error) throw error;

  const borrowingIds = (returns || []).map((r) => r.borrowing_id).filter(Boolean);
  let itemsMap = {};
  if (borrowingIds.length > 0) {
    const { data: bItems } = await supabase
      .from('borrowings_items')
      .select('*, items:items!borrowings_items_item_id_fkey(id, name, code, image_url)')
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
        users (id, name, email, no_hp, role, foto)
      ),
      receiver:users!returns_received_by_fkey (id, name, role, foto)
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

exports.createReturnRecord = async ({ borrowing_id, received_by, return_date = new Date().toISOString(), condition = 'Baik', note = '', items_condition = [] }) => {
  // 1. Cek peminjaman
  const { data: borrowing, error: bError } = await supabase
    .from('borrowings')
    .select('*')
    .eq('id', borrowing_id)
    .single();

  if (bError || !borrowing) {
    throw new AppError('Data peminjaman tidak ditemukan', 404);
  }

  if (borrowing.status === 'Dikembalikan') {
    throw new AppError('Peminjaman ini sudah tercatat dikembalikan', 400);
  }

  const now = new Date().toISOString();

  // 2. Insert returns
  const { data: returnData, error: retError } = await supabase
    .from('returns')
    .insert([{
      borrowing_id,
      received_by: received_by || null,
      return_date,
      condition,
      note,
      created_at: now
    }])
    .select()
    .single();

  if (retError) throw retError;

  // Update status borrowing menjadi Dikembalikan
  await supabase
    .from('borrowings')
    .update({
      status: 'Dikembalikan',
      actual_return_date: return_date
    })
    .eq('id', borrowing_id);

  // 4. Pulihkan stok & update kondisi barang
  const { data: bItems } = await supabase
    .from('borrowings_items')
    .select('*')
    .eq('borrowing_id', borrowing_id);

  if (bItems && bItems.length > 0) {
    for (const bItem of bItems) {
      const specificCond = items_condition.find(c => c.borrowings_item_id === bItem.id);
      if (specificCond) {
        await supabase
          .from('borrowings_items')
          .update({
            condition_after: specificCond.condition_after || condition,
            note: specificCond.note || bItem.note
          })
          .eq('id', bItem.id);
      }

      const { data: itemData } = await supabase
        .from('items')
        .select('available_stock, stock')
        .eq('id', bItem.item_id)
        .single();

      if (itemData) {
        const restoredStock = Math.min(itemData.stock, itemData.available_stock + bItem.quantity);
        await supabase
          .from('items')
          .update({
            available_stock: restoredStock,
            update_at: now
          })
          .eq('id', bItem.item_id);
      }
    }
  }

  // 5. Notifikasi ke user peminjam
  const notifService = require('./notificationService');
  try {
    await notifService.createNotification({
      user_id: borrowing.user_id,
      title: 'Pengembalian Berhasil',
      message: `Peminjaman dengan kode ${borrowing.borrow_code} telah resmi diterima kembali. Terima kasih!`,
      type: 'pengembalian',
      action_url: `/user/riwayat_peminjaman?tab=returned&code=${encodeURIComponent(borrowing.borrow_code)}`,
      reference_id: returnData.id,
      reference_type: 'return'
    });
  } catch (err) {
    console.error('Gagal kirim notif pengembalian ke user:', err);
  }

  // Notifikasi ke seluruh Admin / Petugas
  try {
    const { data: borrowerUser } = await supabase.from('users').select('name').eq('id', borrowing.user_id).single();
    const borrowerName = borrowerUser?.name || 'User';
    await notifService.notifyAdmins({
      title: 'Barang Telah Dikembalikan',
      message: `${borrowerName} telah mengembalikan barang untuk peminjaman ${borrowing.borrow_code}. Kondisi: ${condition}.${note ? ` Catatan: ${note}` : ''}`,
      type: 'pengembalian',
      action_url: `/admin/pengembalian?search=${encodeURIComponent(borrowing.borrow_code)}`,
      reference_id: returnData.id,
      reference_type: 'return'
    });
  } catch (err) {
    console.error('Gagal broadcast notif pengembalian ke admin:', err);
  }

  return returnData;
};
