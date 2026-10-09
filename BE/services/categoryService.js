const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { sanitizeSearch } = require('../utils/sanitizeSearch');

exports.findAllCategories = async ({ search }) => {
  let query = supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) query = query.ilike('name', `%${safeSearch}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
};

exports.findCategoryById = async (id) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Kategori tidak ditemukan', 404);
  }

  return data;
};

exports.createNewCategory = async ({ name, description }) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, description }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateExistingCategory = async (id, { name, description }) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name, description })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Gagal memperbarui, kategori tidak ditemukan', 404);
  }

  return data;
};

exports.deleteExistingCategory = async (id) => {
  const { count, error: countError } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) throw countError;

  if (count > 0) {
    throw new AppError(`Kategori tidak dapat dihapus karena masih digunakan oleh ${count} barang/sarpras`, 400);
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
