const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllUsers = async ({ role, status, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,no_hp.ilike.%${search}%`);
  }

  query = query.range(offset, offset + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    users: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findUserById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Pengguna tidak ditemukan', 404);
  }

  return data;
};

exports.createUserProfile = async ({ id, name, email, role = 'Mahasiswa', no_hp = '', foto = null, status = 'Aktif' }) => {
  const payload = {
    ...(id && { id }),
    name,
    email,
    role,
    no_hp,
    foto,
    status,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateUserProfile = async (id, { name, role, no_hp, foto, status }) => {
  const updatePayload = {
    update_at: new Date().toISOString()
  };

  if (name !== undefined) updatePayload.name = name;
  if (role !== undefined) updatePayload.role = role;
  if (no_hp !== undefined) updatePayload.no_hp = no_hp;
  if (foto !== undefined) updatePayload.foto = foto;
  if (status !== undefined) updatePayload.status = status;

  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Gagal memperbarui profil pengguna', 404);
  }

  return data;
};

exports.deleteUser = async (id) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
