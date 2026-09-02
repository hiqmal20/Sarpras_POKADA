const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllReturns = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const { data: returns, count, error } = await supabase
    .from('returns')
    .select(`
      *,
      borrowings (
        id,
        borrow_code,
        purpose,
        borrow_date,
        users (id, name, email, no_hp)
      ),
      receiver:users!returns_received_by_fkey (id, name, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (error) throw error;

  return {
    returns,
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
      .select('*, items(*)')
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

  // 5. Notifikasi
  await supabase.from('notifications').insert([{
    user_id: borrowing.user_id,
    title: 'Pengembalian Berhasil',
    message: `Peminjaman dengan kode ${borrowing.borrow_code} telah resmi diterima kembali. Terima kasih!`,
    type: 'pengembalian',
    is_read: false,
    created_at: now
  }]);

  return returnData;
};
