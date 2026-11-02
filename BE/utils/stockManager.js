const supabase = require('../config/supabaseClient');
const AppError = require('./appError');

/**
 * Mengurangi stok barang secara aman (bebas race condition).
 * Menggunakan PostgreSQL RPC row-lock jika fungsi terpasang di database,
 * atau Optimistic Concurrency Control (OCC) dengan retry jika belum terpasang.
 *
 * @param {string} itemId - UUID barang
 * @param {number} quantity - Jumlah yang dipinjam
 * @returns {Promise<object>} Item terupdate
 */
const decrementStock = async (itemId, quantity) => {
  const qty = Number(quantity);
  if (qty <= 0) return;

  // 1. Coba atomic RPC dengan Postgres FOR UPDATE
  const { data: rpcData, error: rpcError } = await supabase.rpc('decrement_item_stock', {
    p_item_id: itemId,
    p_quantity: qty
  });

  if (!rpcError) {
    return rpcData;
  }

  const isFunctionMissing =
    rpcError.code === 'PGRST202' ||
    String(rpcError.message || '').includes('decrement_item_stock') ||
    rpcError.code === '42883';

  if (!isFunctionMissing) {
    throw new AppError(rpcError.message || 'Gagal mengurangi stok barang', 400);
  }

  // 2. Fallback: Optimistic Concurrency Control (OCC) dengan retry loop
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { data: currentItem, error: readError } = await supabase
      .from('items')
      .select('id, name, stock, available_stock, status')
      .eq('id', itemId)
      .single();

    if (readError || !currentItem) {
      throw new AppError(`Barang dengan ID ${itemId} tidak ditemukan`, 404);
    }

    if (currentItem.status !== 'Tersedia') {
      throw new AppError(`Barang "${currentItem.name}" sedang tidak tersedia (status: ${currentItem.status})`, 400);
    }

    if (Number(currentItem.available_stock || 0) < qty) {
      throw new AppError(`Stok tidak mencukupi untuk "${currentItem.name}". Tersedia: ${currentItem.available_stock}, Diminta: ${qty}`, 400);
    }

    const nextStock = Number(currentItem.available_stock) - qty;
    const nextStatus = nextStock === 0 ? 'Stok Kosong' : currentItem.status;

    const { data: updated, error: updateError } = await supabase
      .from('items')
      .update({
        available_stock: nextStock,
        status: nextStatus
      })
      .eq('id', itemId)
      .eq('available_stock', currentItem.available_stock)
      .gte('available_stock', qty)
      .select('id, name, available_stock, status')
      .maybeSingle();

    if (updateError) {
      throw new AppError(`Gagal memperbarui stok: ${updateError.message}`, 500);
    }

    if (updated) {
      return updated;
    }

    // Konflik konkurensi terdeteksi: baris telah diubah oleh request lain secara bersamaan
    if (attempt === MAX_RETRIES) {
      throw new AppError(`Terjadi konflik konkurensi: Stok "${currentItem.name}" telah diubah oleh transaksi lain. Silakan coba kembali.`, 409);
    }
  }
};

/**
 * Menambah / mengembalikan stok barang secara aman (bebas race condition).
 *
 * @param {string} itemId - UUID barang
 * @param {number} quantity - Jumlah yang dikembalikan
 * @returns {Promise<object>} Item terupdate
 */
const incrementStock = async (itemId, quantity) => {
  const qty = Number(quantity);
  if (qty <= 0) return;

  const { data: rpcData, error: rpcError } = await supabase.rpc('increment_item_stock', {
    p_item_id: itemId,
    p_quantity: qty
  });

  if (!rpcError) {
    return rpcData;
  }

  const isFunctionMissing =
    rpcError.code === 'PGRST202' ||
    String(rpcError.message || '').includes('increment_item_stock') ||
    rpcError.code === '42883';

  if (!isFunctionMissing) {
    throw new AppError(rpcError.message || 'Gagal menambah stok barang', 400);
  }

  // Fallback: OCC
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { data: currentItem, error: readError } = await supabase
      .from('items')
      .select('id, name, stock, available_stock, status')
      .eq('id', itemId)
      .single();

    if (readError || !currentItem) return null;

    const restoredStock = Math.min(Number(currentItem.stock || 0), Number(currentItem.available_stock || 0) + qty);
    const nextStatus = (currentItem.status === 'Stok Kosong' && restoredStock > 0) ? 'Tersedia' : currentItem.status;

    const { data: updated } = await supabase
      .from('items')
      .update({
        available_stock: restoredStock,
        status: nextStatus
      })
      .eq('id', itemId)
      .eq('available_stock', currentItem.available_stock)
      .select('id, name, available_stock, status')
      .maybeSingle();

    if (updated || attempt === MAX_RETRIES) {
      return updated;
    }
  }
};

const adjustPackageStock = async (packageId, quantity, direction) => {
  const qty = Number(quantity);
  if (!packageId || !Number.isInteger(qty) || qty < 1) return null;
  const rpcName = direction === 'decrement' ? 'decrement_package_stock' : 'increment_package_stock';
  const { data, error } = await supabase.rpc(rpcName, { p_package_id: packageId, p_quantity: qty });
  if (error) throw new AppError(error.message || 'Gagal memperbarui stok paket', 400);
  return data;
};

const decrementPackageStock = (packageId, quantity) => adjustPackageStock(packageId, quantity, 'decrement');
const incrementPackageStock = (packageId, quantity) => adjustPackageStock(packageId, quantity, 'increment');

module.exports = {
  decrementStock,
  incrementStock,
  decrementPackageStock,
  incrementPackageStock
};
