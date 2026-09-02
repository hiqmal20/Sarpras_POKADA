const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllReports = async ({ user_id, item_id, status, report_type, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('damage_reports')
    .select(`
      *,
      users (id, name, nomor_induk, email, no_hp, role, foto),
      items (id, name, code, image_url, condition, status),
      borrowings (id, borrow_code, purpose, borrow_date, status)
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
      users (id, name, nomor_induk, email, no_hp, role, foto),
      items (id, name, code, image_url, condition, status, stock, available_stock),
      borrowings (id, borrow_code, purpose, borrow_date, status)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Laporan kerusakan tidak ditemukan', 404);
  }

  return data;
};

/**
 * Admin membuat laporan kerusakan/kehilangan secara manual.
 * Admin juga bisa langsung memasukkan nominal denda.
 */
exports.createNewReport = async ({
  user_id,
  item_id,
  borrowing_id,
  title,
  description = '',
  image_url = null,
  report_type = 'Kerusakan',
  // Field denda — diisi manual oleh admin
  fine_amount = 0,
  fine_reason = '',
  // Kondisi item baru setelah kejadian
  item_condition = null
}) => {
  const now = new Date().toISOString();

  // Validasi: item harus ada jika item_id diberikan
  if (item_id) {
    const { data: itemCheck } = await supabase
      .from('items')
      .select('id, name, condition, status')
      .eq('id', item_id)
      .single();

    if (!itemCheck) {
      throw new AppError('Barang tidak ditemukan', 404);
    }
  }

  // Validasi: peminjaman harus ada jika borrowing_id diberikan
  if (borrowing_id) {
    const { data: borrowingCheck } = await supabase
      .from('borrowings')
      .select('id, borrow_code')
      .eq('id', borrowing_id)
      .single();

    if (!borrowingCheck) {
      throw new AppError('Data peminjaman tidak ditemukan', 404);
    }
  }

  const { data, error } = await supabase
    .from('damage_reports')
    .insert([{
      user_id,
      item_id: item_id || null,
      borrowing_id: borrowing_id || null,
      title,
      description,
      image_url,
      report_type,         // 'Kerusakan' | 'Kehilangan' | 'Cacat Fungsi'
      status: 'Menunggu Review',
      fine_amount: Number(fine_amount) || 0,   // nominal denda (Rp)
      fine_reason: fine_reason || '',           // alasan pengenaan denda
      fine_status: fine_amount > 0 ? 'Belum Dibayar' : 'Tidak Ada Denda',
      created_at: now,
      update_at: now
    }])
    .select()
    .single();

  if (error) throw error;

  // Update kondisi item jika ada
  if (item_id) {
    const newCondition = item_condition ||
      (report_type === 'Kehilangan' ? 'Hilang' :
       report_type === 'Kerusakan' ? 'Rusak Ringan' : 'Rusak Berat');

    await supabase
      .from('items')
      .update({
        condition: newCondition,
        // Jika hilang, kurangi stok tersedia
        ...(report_type === 'Kehilangan' && {
          available_stock: supabase.rpc ? undefined : undefined
        }),
        update_at: now
      })
      .eq('id', item_id);

    // Jika kehilangan, kurangi available_stock
    if (report_type === 'Kehilangan') {
      const { data: currentItem } = await supabase
        .from('items')
        .select('available_stock')
        .eq('id', item_id)
        .single();

      if (currentItem && currentItem.available_stock > 0) {
        await supabase
          .from('items')
          .update({ available_stock: currentItem.available_stock - 1 })
          .eq('id', item_id);
      }
    }
  }

  // Kirim notifikasi ke user yang bersangkutan
  if (user_id) {
    const fineMsg = fine_amount > 0
      ? ` Denda yang dikenakan: Rp ${Number(fine_amount).toLocaleString('id-ID')}. Alasan: ${fine_reason}`
      : '';

    await supabase.from('notifications').insert([{
      user_id,
      title: `Laporan ${report_type}: ${title}`,
      message: `Admin telah mencatat laporan ${report_type.toLowerCase()} untuk Anda.${fineMsg} Silakan hubungi admin untuk informasi lebih lanjut.`,
      type: 'laporan',
      is_read: false,
      created_at: now
    }]);
  }

  return exports.findReportById(data.id);
};

/**
 * Update status laporan dan/atau denda (oleh Admin/Petugas).
 * Admin bisa ubah nominal denda kapan saja.
 */
exports.updateReport = async (id, {
  status,
  admin_note,
  fine_amount,
  fine_reason,
  fine_status,
  item_condition
}) => {
  const now = new Date().toISOString();

  // Ambil data laporan saat ini
  const { data: current, error: fetchError } = await supabase
    .from('damage_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    throw new AppError('Laporan tidak ditemukan', 404);
  }

  const updatePayload = { update_at: now };

  if (status !== undefined) updatePayload.status = status;
  if (admin_note !== undefined) updatePayload.admin_note = admin_note;
  if (fine_amount !== undefined) {
    updatePayload.fine_amount = Number(fine_amount);
    // Jika denda diubah, auto-set fine_status jika belum ada
    if (fine_status === undefined) {
      updatePayload.fine_status = Number(fine_amount) > 0 ? 'Belum Dibayar' : 'Tidak Ada Denda';
    }
  }
  if (fine_reason !== undefined) updatePayload.fine_reason = fine_reason;
  if (fine_status !== undefined) updatePayload.fine_status = fine_status;

  const { data, error } = await supabase
    .from('damage_reports')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update kondisi item jika diminta
  if (item_condition && current.item_id) {
    await supabase
      .from('items')
      .update({ condition: item_condition, update_at: now })
      .eq('id', current.item_id);
  }

  // Notifikasi ke user
  if (current.user_id) {
    let msg = `Status laporan "${current.title}" diperbarui menjadi "${status || current.status}".`;
    if (fine_amount !== undefined) {
      msg += ` Denda: Rp ${Number(fine_amount).toLocaleString('id-ID')}.`;
    }
    if (fine_status) {
      msg += ` Status denda: ${fine_status}.`;
    }
    if (admin_note) {
      msg += ` Catatan: ${admin_note}`;
    }

    await supabase.from('notifications').insert([{
      user_id: current.user_id,
      title: `Update Laporan: ${current.title}`,
      message: msg,
      type: 'laporan',
      is_read: false,
      created_at: now
    }]);
  }

  return exports.findReportById(id);
};
