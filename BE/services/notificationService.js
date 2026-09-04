const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllNotifications = async ({ user_id, is_read, limit = 50 }) => {
  if (!user_id) {
    throw new AppError('Parameter user_id wajib disertakan', 400);
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (is_read !== undefined) {
    query = query.eq('is_read', is_read === 'true');
  }

  const { data, error } = await query;
  if (error) throw error;

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .eq('is_read', false);

  return {
    notifications: data,
    total: data.length,
    unreadCount: unreadCount || 0
  };
};

exports.notifyAdmins = async ({ title, message, type = 'sistem' }) => {
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['Admin', 'Petugas']);

    if (admins && admins.length > 0) {
      const now = new Date().toISOString();
      const payload = admins.map(a => ({
        user_id: a.id,
        title,
        message,
        type,
        is_read: false,
        created_at: now
      }));
      await supabase.from('notifications').insert(payload);
    }
  } catch (err) {
    console.error('Gagal mengirim notifikasi ke admin:', err);
  }
};

exports.createNotification = async ({ user_id, title, message, type = 'sistem' }) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.markAsRead = async (id, userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Notifikasi tidak ditemukan atau bukan milik Anda', 404);
  }

  return data;
};

exports.markAllAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return true;
};

exports.deleteNotification = async (id, userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Notifikasi tidak ditemukan atau bukan milik Anda', 404);
  }

  return true;
};
