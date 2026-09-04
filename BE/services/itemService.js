const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllItems = async ({ category_id, status, condition, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('items')
    .select('*, categories (id, name, description)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (category_id) query = query.eq('category_id', category_id);
  if (status) query = query.eq('status', status);
  if (condition) query = query.eq('condition', condition);
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);

  query = query.range(offset, offset + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findItemById = async (id) => {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories (id, name, description)')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Barang / Aset tidak ditemukan', 404);
  }

  // Ambil riwayat peminjaman barang ini (5 terakhir)
  const { data: borrowingHistory } = await supabase
    .from('borrowings_items')
    .select(`
      id, quantity, condition_before, condition_after, note,
      borrowings (id, borrow_code, borrow_date, status, users (id, name, email))
    `)
    .eq('item_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Hitung total peminjaman
  const { count: totalBorrowings } = await supabase
    .from('borrowings_items')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id);

  // Cek barang ini ada di package apa saja
  const { data: inPackages } = await supabase
    .from('packages_items')
    .select(`
      id, quantity,
      packages (id, name, status, image_url)
    `)
    .eq('item_id', id);

  // Hitung peminjaman aktif (status Dipinjam)
  const { count: activeBorrowings } = await supabase
    .from('borrowings_items')
    .select('borrowings!inner(id, status)', { count: 'exact', head: true })
    .eq('item_id', id)
    .eq('borrowings.status', 'Dipinjam');

  return {
    ...data,
    statistics: {
      total_borrowings: totalBorrowings || 0,
      active_borrowings: activeBorrowings || 0,
      usage_percentage: data.stock > 0 ? Math.round(((data.stock - data.available_stock) / data.stock) * 100) : 0
    },
    recent_borrowings: borrowingHistory || [],
    in_packages: (inPackages || []).map(p => ({
      package_id: p.packages?.id,
      package_name: p.packages?.name,
      package_status: p.packages?.status,
      quantity_in_package: p.quantity
    }))
  };
};

exports.createNewItem = async (payload) => {
  const { code, stock = 0, available_stock } = payload;

  // Cek duplikasi kode barang
  const { data: existingCode } = await supabase
    .from('items')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existingCode) {
    throw new AppError(`Kode barang "${code}" sudah digunakan. Gunakan kode lain.`, 400);
  }

  const now = new Date().toISOString();
  const finalAvailableStock = available_stock !== undefined ? available_stock : stock;

  const { data, error } = await supabase
    .from('items')
    .insert([{
      ...payload,
      stock: Number(stock),
      available_stock: Number(finalAvailableStock),
      created_at: now,
      update_at: now
    }])
    .select('*, categories (id, name)')
    .single();

  if (error) throw error;

  return data;
};

exports.updateExistingItem = async (id, payload) => {
  const updateData = {
    ...payload,
    update_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .select('*, categories (id, name)')
    .single();

  if (error || !data) {
    throw new AppError('Gagal memperbarui, barang tidak ditemukan', 404);
  }

  return data;
};

exports.deleteExistingItem = async (id) => {
  // Cek relasi packages_items
  const { count: pkgCount } = await supabase
    .from('packages_items')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id);

  if (pkgCount > 0) {
    throw new AppError('Barang tidak dapat dihapus karena terdaftar dalam Paket Sarpras', 400);
  }

  // Cek relasi borrowings_items
  const { count: borrowCount } = await supabase
    .from('borrowings_items')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id);

  if (borrowCount > 0) {
    throw new AppError('Barang tidak dapat dihapus karena memiliki riwayat peminjaman', 400);
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return true;
};
