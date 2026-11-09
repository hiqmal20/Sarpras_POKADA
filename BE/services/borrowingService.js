const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { sanitizeSearch } = require('../utils/sanitizeSearch');
const { decrementStock, incrementStock, decrementPackageStock } = require('../utils/stockManager');

const normalizeQuantity = (value, itemId) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError(`Jumlah barang untuk item ${itemId} harus berupa bilangan bulat minimal 1`, 400);
  }
  return quantity;
};

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
      planned_return_date,
      actual_return_date,
      purpose,
      package_id,
      packages (id, name, packages_items (item_id, quantity)),
      status,
      admin_note,
      created_at,
      users (id, name, nomor_induk, email, no_hp, role, foto)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (status) query = query.eq('status', status);
  if (search) {
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) {
      query = query.or(`borrow_code.ilike.%${safeSearch}%,purpose.ilike.%${safeSearch}%`);
    }
  }

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
        items:items!borrowings_items_item_id_fkey (id, name, code:item_code, image_url, condition, status)
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
      items:items!borrowings_items_item_id_fkey (id, name, code:item_code, image_url, condition, status)
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

exports.createBorrowingRequest = async ({ user_id, package_id, package_quantity = 1, purpose, items, borrow_date, return_date, planned_return_date }) => {
  // Validasi: satu siswa hanya boleh punya satu peminjaman aktif
  const ACTIVE_STATUSES = ['Pending', 'Disetujui', 'Dipinjam', 'Terlambat'];
  const { data: activeBorrowing, error: activeCheckError } = await supabase
    .from('borrowings')
    .select('id, borrow_code, status')
    .eq('user_id', user_id)
    .in('status', ACTIVE_STATUSES)
    .maybeSingle();

  if (activeCheckError) throw activeCheckError;
  if (activeBorrowing) {
    throw new AppError(
      `Anda masih memiliki peminjaman aktif (${activeBorrowing.borrow_code} - Status: ${activeBorrowing.status}). Selesaikan pengembalian terlebih dahulu sebelum mengajukan peminjaman baru.`,
      409
    );
  }

  // Satu transaksi boleh berisi beberapa jenis barang dan quantity berbeda.
  // Pembatasan yang berlaku adalah satu peminjaman aktif per siswa,
  // sehingga siswa tidak dapat membuat transaksi baru sebelum transaksi ini selesai.
  const uniqueItemIds = [...new Set(items.map(i => i.item_id))];
  if (uniqueItemIds.length !== items.length) {
    throw new AppError(
      'Jenis barang yang sama hanya boleh dicantumkan satu kali dengan quantity yang sesuai.',
      400
    );
  }

  // Paket adalah virtual: komponen paket harus dialokasikan sebagai stok fisik item.
  // Gabungkan komponen paket dengan barang tambahan agar setiap unit hanya dihitung sekali.
  let allocationItems = Array.isArray(items) ? [...items] : [];
  if (package_id) {
    const { data: packageComponents, error: packageError } = await supabase
      .from('packages_items')
      .select('item_id, quantity, items (id, name)')
      .eq('package_id', package_id);
    if (packageError) throw packageError;
    if (!packageComponents || packageComponents.length === 0) {
      throw new AppError('Paket tidak memiliki komponen yang valid', 400);
    }
    const packageQty = normalizeQuantity(package_quantity, package_id);
    const totals = new Map();
    for (const component of packageComponents) {
      totals.set(component.item_id, (totals.get(component.item_id) || 0) + Number(component.quantity || 1) * packageQty);
    }
    for (const extra of allocationItems) {
      const qty = normalizeQuantity(extra.quantity, extra.item_id);
      totals.set(extra.item_id, (totals.get(extra.item_id) || 0) + qty);
    }
    allocationItems = [...totals.entries()].map(([item_id, quantity]) => ({ item_id, quantity }));
  }

  // Validasi ketersediaan stok fisik seluruh item (komponen + tambahan).
  for (const item of allocationItems) {
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

    const requestedQty = normalizeQuantity(item.quantity, item.item_id);
    if (itemData.available_stock < requestedQty) {
      throw new AppError(`Stok tidak mencukupi untuk "${itemData.name}". Tersedia: ${itemData.available_stock}, Diminta: ${requestedQty}`, 400);
    }
  }

  const borrowCode = generateBorrowCode();
  const now = new Date().toISOString();
  const targetReturnDate = planned_return_date || return_date || null;

  // Insert peminjaman
  const { data: newBorrowing, error: borrowError } = await supabase
    .from('borrowings')
    .insert([{
      user_id,
      borrow_code: borrowCode,
      borrow_date: borrow_date || now,
      planned_return_date: targetReturnDate,
      package_id: package_id || null,
      package_quantity: package_id ? normalizeQuantity(package_quantity, package_id) : 1,
      purpose,
      status: 'Pending',
      created_at: now
    }])
    .select()
    .single();

  if (borrowError) throw borrowError;

  const stockAdjustments = [];
  try {
    // Insert detail alokasi fisik & kurangi stok item secara atomic/OCC.
    const borrowingItemsPayload = [];
    for (const item of allocationItems) {
      const qty = normalizeQuantity(item.quantity, item.item_id);

      borrowingItemsPayload.push({
        borrowing_id: newBorrowing.id,
        item_id: item.item_id,
        quantity: qty,
        condition_before: item.condition_before || 'Baik',
        note: item.note || ''
      });

      await decrementStock(item.item_id, qty);
      stockAdjustments.push({ item_id: item.item_id, qty });
    }

    const { error: insertItemsError } = await supabase
      .from('borrowings_items')
      .insert(borrowingItemsPayload);

    if (insertItemsError) throw insertItemsError;
  } catch (err) {
    for (const adj of stockAdjustments) {
      try {
        await incrementStock(adj.item_id, adj.qty);
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
    Pending: ['Disetujui', 'Dipinjam', 'Ditolak', 'Dibatalkan'],
    Disetujui: ['Dipinjam', 'Dibatalkan', 'Ditolak', 'Dikembalikan'],
    Dipinjam: ['Dikembalikan', 'Dibatalkan'],
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
      await incrementStock(bItem.item_id, bItem.quantity);
    }
  }

  const updatePayload = {
    status,
    ...(admin_note !== undefined && { admin_note })
  };
  if (status === 'Dikembalikan' && !currentBorrowing.actual_return_date) {
    updatePayload.actual_return_date = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from('borrowings')
    .update(updatePayload)
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
