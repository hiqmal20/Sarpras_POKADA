const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

const generateBorrowCode = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PJ-${dateStr}-${randomStr}`;
};

exports.findAllBorrowings = async ({ user_id, status, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('borrowings')
    .select(`
      *,
      users (id, name, email, no_hp, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`borrow_code.ilike.%${search}%,purpose.ilike.%${search}%`);

  query = query.range(offset, offset + Number(limit) - 1);

  const { data: borrowings, count, error } = await query;
  if (error) throw error;

  // Pasang relasi item secara aman
  const borrowingIds = borrowings.map(b => b.id);
  let itemsMap = {};

  if (borrowingIds.length > 0) {
    const { data: bItems, error: bItemsError } = await supabase
      .from('borrowings_items')
      .select(`
        *,
        items (id, name, code, image_url, condition, status)
      `)
      .in('borrowing_id', borrowingIds);

    if (!bItemsError && bItems) {
      bItems.forEach(item => {
        if (!itemsMap[item.borrowing_id]) {
          itemsMap[item.borrowing_id] = [];
        }
        itemsMap[item.borrowing_id].push(item);
      });
    }
  }

  const result = borrowings.map(b => ({
    ...b,
    borrowings_items: itemsMap[b.id] || []
  }));

  return {
    borrowings: result,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findBorrowingById = async (id) => {
  const { data: borrowing, error } = await supabase
    .from('borrowings')
    .select(`
      *,
      users (id, name, email, no_hp, role)
    `)
    .eq('id', id)
    .single();

  if (error || !borrowing) {
    throw new AppError('Data peminjaman tidak ditemukan', 404);
  }

  const { data: bItems } = await supabase
    .from('borrowings_items')
    .select(`
      *,
      items (id, name, code, image_url, condition, status)
    `)
    .eq('borrowing_id', id);

  const { data: returnData } = await supabase
    .from('returns')
    .select('*')
    .eq('borrowing_id', id)
    .maybeSingle();

  return {
    ...borrowing,
    borrowings_items: bItems || [],
    returns: returnData || null
  };
};

exports.createBorrowingRequest = async ({ user_id, borrow_date, planned_return_date, purpose, items }) => {
  // 1. Validasi ketersediaan stok
  for (const item of items) {
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('id, name, available_stock')
      .eq('id', item.item_id)
      .single();

    if (itemError || !itemData) {
      throw new AppError(`Barang dengan ID ${item.item_id} tidak ditemukan`, 404);
    }

    const requestedQty = Number(item.quantity) || 1;
    if (itemData.available_stock < requestedQty) {
      throw new AppError(`Stok tidak mencukupi untuk "${itemData.name}". Tersedia: ${itemData.available_stock}, Diminta: ${requestedQty}`, 400);
    }
  }

  const borrowCode = generateBorrowCode();
  const now = new Date().toISOString();

  // 2. Insert peminjaman
  const { data: newBorrowing, error: borrowError } = await supabase
    .from('borrowings')
    .insert([{
      user_id,
      borrow_code: borrowCode,
      borrow_date,
      planned_return_date,
      purpose,
      status: 'Pending',
      created_at: now
    }])
    .select()
    .single();

  if (borrowError) throw borrowError;

  // 3. Insert items & potong stok
  const borrowingItemsPayload = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 1;

    borrowingItemsPayload.push({
      borrowing_id: newBorrowing.id,
      item_id: item.item_id,
      quantity: qty,
      condition_before: item.condition_before || 'Baik',
      note: item.note || ''
    });

    const { data: currentItem } = await supabase
      .from('items')
      .select('available_stock')
      .eq('id', item.item_id)
      .single();

    if (currentItem) {
      const newStock = Math.max(0, currentItem.available_stock - qty);
      await supabase
        .from('items')
        .update({ available_stock: newStock, update_at: now })
        .eq('id', item.item_id);
    }
  }

  const { error: insertItemsError } = await supabase
    .from('borrowings_items')
    .insert(borrowingItemsPayload);

  if (insertItemsError) throw insertItemsError;

  // 4. Notifikasi
  await supabase.from('notifications').insert([{
    user_id,
    title: 'Pengajuan Peminjaman Diterima',
    message: `Pengajuan peminjaman dengan kode ${borrowCode} sedang menunggu persetujuan admin.`,
    type: 'peminjaman',
    is_read: false,
    created_at: now
  }]);

  return exports.findBorrowingById(newBorrowing.id);
};

exports.updateStatus = async (id, { status, admin_note }) => {
  const { data: currentBorrowing, error: fetchError } = await supabase
    .from('borrowings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentBorrowing) {
    throw new AppError('Data peminjaman tidak ditemukan', 404);
  }

  const { data: bItems } = await supabase
    .from('borrowings_items')
    .select('*')
    .eq('id', id);

  // Jika dibatalkan/ditolak, pulihkan stok
  const isCancelling = ['Ditolak', 'Dibatalkan'].includes(status) && !['Ditolak', 'Dibatalkan', 'Selesai'].includes(currentBorrowing.status);

  if (isCancelling && bItems) {
    for (const bItem of bItems) {
      const { data: itemData } = await supabase
        .from('items')
        .select('available_stock')
        .eq('id', bItem.item_id)
        .single();

      if (itemData) {
        await supabase
          .from('items')
          .update({
            available_stock: itemData.available_stock + bItem.quantity,
            update_at: new Date().toISOString()
          })
          .eq('id', bItem.item_id);
      }
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('borrowings')
    .update({
      status,
      ...(admin_note !== undefined && { admin_note })
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Notifikasi status
  await supabase.from('notifications').insert([{
    user_id: currentBorrowing.user_id,
    title: `Status Peminjaman: ${status}`,
    message: `Peminjaman ${currentBorrowing.borrow_code} statusnya telah diperbarui menjadi "${status}". ${admin_note ? `Catatan: ${admin_note}` : ''}`,
    type: 'peminjaman',
    is_read: false,
    created_at: new Date().toISOString()
  }]);

  return updated;
};
