const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllReports = async ({ user_id, item_id, status, report_type, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('damage_reports')
    .select(`
      *,
      users (id, name, email, no_hp, role),
      items (id, name, code, image_url, condition),
      borrowings (id, borrow_code)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (item_id) query = query.eq('item_id', item_id);
  if (status) query = query.eq('status', status);
  if (report_type) query = query.eq('report_type', report_type);

  query = query.range(offset, offset + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    reports: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findReportById = async (id) => {
  const { data, error } = await supabase
    .from('damage_reports')
    .select(`
      *,
      users (id, name, email, no_hp, role),
      items (*),
      borrowings (*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Laporan kerusakan tidak ditemukan', 404);
  }

  return data;
};

exports.createNewReport = async ({ user_id, item_id, borrowing_id, title, description = '', image_url = null, report_type = 'Kerusakan' }) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('damage_reports')
    .insert([{
      user_id,
      item_id: item_id || null,
      borrowing_id: borrowing_id || null,
      title,
      description,
      image_url,
      report_type,
      status: 'Menunggu Review',
      created_at: now,
      update_at: now
    }])
    .select()
    .single();

  if (error) throw error;

  // Jika menyertakan item_id, ubah kondisi item
  if (item_id) {
    await supabase
      .from('items')
      .update({
        condition: 'Rusak Ringan',
        update_at: now
      })
      .eq('id', item_id);
  }

  return data;
};

exports.updateStatus = async (id, { status, admin_note }) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('damage_reports')
    .update({
      ...(status !== undefined && { status }),
      ...(admin_note !== undefined && { admin_note }),
      update_at: now
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Gagal memperbarui status laporan', 404);
  }

  // Kirim notifikasi ke pelapor
  await supabase.from('notifications').insert([{
    user_id: data.user_id,
    title: `Status Laporan: ${data.title}`,
    message: `Laporan Anda telah diperbarui menjadi "${status}". ${admin_note ? `Catatan: ${admin_note}` : ''}`,
    type: 'laporan',
    is_read: false,
    created_at: now
  }]);

  return data;
};
