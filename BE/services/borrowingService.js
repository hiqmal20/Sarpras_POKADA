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
      id,
      borrow_code,
      borrow_date,
      actual_return_date,
      purpose,
      status,
      admin_note,
      created_at,
      users (id, name, nomor_induk, email, no_hp, role, foto)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`borrow_code.ilike.%${search}%,purpose.ilike.%${search}%`);

  query = query.range(offset, offset + Number(limit) - 1);

  const { data: borrowings, count, error } = await query;
  if (error) throw error;

  const borrowingIds = borrowings.map(b => b.id);
  let itemsMap = {};

  if (borrowingIds.length > 0) {
    const { data: bItems, error: bItemsError } = await supabase
      .from('borrowings_items')
      .select(`
        *,
        items:items!borrowings_items_item_id_fkey (id, name, code, image_url, condition, status)
      `)
      .in('borrowing_id', borrowingIds);

    if (!bItemsError && bItems) {
      bItems.forEach(item => {
        if (!itemsMap[item.borrowing_id]) itemsMap[item.borrowing_id] = [];
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
      items:items!borrowings_items_item_id_fkey (id, name, code, image_url, condition, status)
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

exports.createBorrowingRequest = async ({ user_id, purpose, items, borrow_date }) => {
  // Validasi ketersediaan stok
  for (const item of items) {
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('id, name, available_stock, status')
      .eq('id', item.item_id)
      .single();

    if (itemError || !itemData) {
      throw new AppError(`Barang dengan ID ${item.item_id} tidak ditemukan`, 404);
    }

    if (itemData.status !== 'Tersedia') {
      throw new AppError(`Barang "${itemData.name}" sedang tidak tersedia (status: ${itemData.status})`, 400);
    }

    const requestedQty = Number(item.quantity) || 1;
    if (itemData.available_stock < requestedQty) {
      throw new AppError(`Stok tidak mencukupi untuk "${itemData.name}". Tersedia: ${itemData.available_stock}, Diminta: ${requestedQty}`, 400);
    }
  }

  const borrowCode = generateBorrowCode();
  const now = new Date().toISOString();

  // Insert peminjaman — tanpa borrow_date & planned_return_date
  const { data: newBorrowing, error: borrowError } = await supabase
    .from('borrowings')
    .insert([{
      user_id,
      borrow_code: borrowCode,
      borrow_date: borrow_date || now,
      purpose,
      status: 'Pending',
      created_at: now
    }])
    .select()
    .single();

  if (borrowError) throw borrowError;

  const stockAdjustments = [];
  try {
    // Insert items & kurangi stok
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

      const { data: currentItem, error: stockReadError } = await supabase
        .from('items')
        .select('available_stock')
        .eq('id', item.item_id)
        .single();

      if (stockReadError || !currentItem) {
        throw new AppError(`Gagal membaca stok barang ${item.item_id}`, 500);
      }

      const newStock = Math.max(0, currentItem.available_stock - qty);
      const { error: stockUpdateError } = await supabase
        .from('items')
        .update({ available_stock: newStock })
        .eq('id', item.item_id);

      if (stockUpdateError) {
        throw new AppError(`Gagal mengurangi stok barang: ${stockUpdateError.message}`, 500);
      }
      stockAdjustments.push({ item_id: item.item_id, qty });
    }

    const { error: insertItemsError } = await supabase
      .from('borrowings_items')
      .insert(borrowingItemsPayload);

    if (insertItemsError) throw insertItemsError;
  } catch (err) {
    for (const adj of stockAdjustments) {
      try {
        const { data: currentItem } = await supabase
          .from('items')
          .select('available_stock')
          .eq('id', adj.item_id)
          .single();
        if (currentItem) {
          await supabase
            .from('items')
            .update({ available_stock: currentItem.available_stock + adj.qty })
            .eq('id', adj.item_id);
        }
      } catch (_) { /* best effort rollback */ }
    }
    try {
      await supabase.from('borrowings_items').delete().eq('borrowing_id', newBorrowing.id);
      await supabase.from('borrowings').delete().eq('id', newBorrowing.id);
    } catch (_) { /* best effort rollback */ }
    throw err instanceof AppError ? err : new AppError(`Gagal membuat peminjaman: ${err.message}`, 500);
  }

  // Notifikasi ke User peminjam
  await supabase.from('notifications').insert([{
    user_id,
    title: 'Pengajuan Peminjaman Diterima',
    message: `Pengajuan peminjaman dengan kode ${borrowCode} sedang menunggu persetujuan admin.`,
    type: 'peminjaman',
    is_read: false,
    created_at: now
  }]);

  // Notifikasi ke seluruh Admin / Petugas
  try {
    const notifService = require('./notificationService');
    const { data: borrowerUser } = await supabase.from('users').select('name').eq('id', user_id).single();
    const borrowerName = borrowerUser?.name || 'User';
    await notifService.notifyAdmins({
      title: 'Pengajuan Peminjaman Baru',
      message: `${borrowerName} mengajukan peminjaman baru (${borrowCode}) untuk "${purpose || 'keperluan kampus'}".`,
      type: 'peminjaman'
    });
  } catch (err) {
    console.error('Gagal broadcast notif peminjaman ke admin:', err);
  }

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

  const allowedTransitions = {
    Pending: ['Disetujui', 'Ditolak', 'Dibatalkan'],
    Disetujui: ['Dipinjam', 'Dibatalkan', 'Ditolak'],
    Dipinjam: ['Dikembalikan'],
    Ditolak: [],
    Dibatalkan: [],
    Dikembalikan: []
  };

  const allowedNext = allowedTransitions[currentBorrowing.status] || [];
  if (!allowedNext.includes(status)) {
    throw new AppError(`Transisi status ${currentBorrowing.status} -> ${status} tidak diizinkan`, 400);
  }

  const { data: bItems } = await supabase
    .from('borrowings_items')
    .select('*')
    .eq('borrowing_id', id);

  // Jika dibatalkan/ditolak, pulihkan stok
  const isCancelling = ['Ditolak', 'Dibatalkan'].includes(status) &&
    !['Ditolak', 'Dibatalkan', 'Dikembalikan'].includes(currentBorrowing.status);

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
          .update({ available_stock: itemData.available_stock + bItem.quantity })
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

  // Notifikasi
  await supabase.from('notifications').insert([{
    user_id: currentBorrowing.user_id,
    title: `Status Peminjaman: ${status}`,
    message: `Peminjaman ${currentBorrowing.borrow_code} statusnya telah diperbarui menjadi "${status}".${admin_note ? ` Catatan: ${admin_note}` : ''}`,
    type: 'peminjaman',
    is_read: false,
    created_at: new Date().toISOString()
  }]);

  return updated;
};
