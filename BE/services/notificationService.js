const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

let _hasExtendedColumns = null;
async function hasExtendedColumns() {
  if (_hasExtendedColumns !== null) return _hasExtendedColumns;
  try {
    const { error } = await supabase.from('notifications').select('action_url').limit(1);
    _hasExtendedColumns = !error;
  } catch {
    _hasExtendedColumns = false;
  }
  return _hasExtendedColumns;
}

function resolveActionUrl(notif, role = 'Mahasiswa') {
  const isAdmin = ['Admin', 'Petugas'].includes(role);

  // Jika action_url sudah tersimpan di database
  if (notif.action_url && typeof notif.action_url === 'string' && notif.action_url.trim()) {
    const url = notif.action_url.trim();
    if (isAdmin && url.startsWith('/user/')) {
      if (url.includes('riwayat_peminjaman')) {
        const code = (url.match(/code=([^&]+)/) || [])[1];
        if (url.includes('tab=damage')) return code ? `/admin/rekap_laporan?search=${code}` : '/admin/rekap_laporan';
        if (url.includes('tab=returned')) return code ? `/admin/pengembalian?search=${code}` : '/admin/pengembalian';
        return code ? `/admin/manajemen_peminjaman?search=${code}` : '/admin/manajemen_peminjaman';
      }
      if (url.includes('/user/messages')) return '/admin/messages';
      return '/admin/dashboard_admin';
    }
    if (!isAdmin && url.startsWith('/admin/')) {
      if (url.includes('manajemen_peminjaman')) {
        const code = (url.match(/(?:code|search)=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?code=${code}` : '/user/riwayat_peminjaman';
      }
      if (url.includes('pengembalian')) {
        const code = (url.match(/search=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?tab=returned&code=${code}` : '/user/riwayat_peminjaman?tab=returned';
      }
      if (url.includes('rekap_laporan')) {
        const code = (url.match(/search=([^&]+)/) || [])[1];
        return code ? `/user/riwayat_peminjaman?tab=damage&code=${code}` : '/user/riwayat_peminjaman?tab=damage';
      }
      if (url.includes('/admin/messages')) return '/user/messages';
      return '/user/dashboard';
    }
    return url;
  }

  // Fallback pintar: Parsing kode unik dari teks title / message
  const combined = `${notif.title || ''} ${notif.message || ''}`;
  const borrowCodeMatch = combined.match(/(PJ-\d{8}-[A-Z0-9]+|PJ-[A-Z0-9-]+)/i);
  const damageCodeMatch = combined.match(/((?:ITM|PKG|LPR)-\d{8}-[A-Z0-9]+|(?:ITM|PKG|LPR)-[A-Z0-9-]+)/i);
  const type = (notif.type || '').toLowerCase();

  if (type === 'peminjaman' || type === 'borrowing') {
    const code = borrowCodeMatch ? borrowCodeMatch[1] : '';
    return isAdmin
      ? (code ? `/admin/manajemen_peminjaman?search=${encodeURIComponent(code)}` : '/admin/manajemen_peminjaman')
      : (code ? `/user/riwayat_peminjaman?code=${encodeURIComponent(code)}` : '/user/riwayat_peminjaman');
  }

  if (type === 'pengembalian' || type === 'return') {
    const code = borrowCodeMatch ? borrowCodeMatch[1] : '';
    return isAdmin
      ? (code ? `/admin/pengembalian?search=${encodeURIComponent(code)}` : '/admin/pengembalian')
      : (code ? `/user/riwayat_peminjaman?tab=returned&code=${encodeURIComponent(code)}` : '/user/riwayat_peminjaman?tab=returned');
  }

  if (type === 'laporan' || type === 'kerusakan' || type === 'damage') {
    const code = damageCodeMatch ? damageCodeMatch[1] : '';
    return isAdmin
      ? (code ? `/admin/rekap_laporan?search=${encodeURIComponent(code)}` : '/admin/rekap_laporan')
      : (code ? `/user/riwayat_peminjaman?tab=damage&code=${encodeURIComponent(code)}` : '/user/riwayat_peminjaman?tab=damage');
  }

  if (type === 'chat' || type === 'pesan' || type === 'message') {
    return isAdmin ? '/admin/messages' : '/user/messages';
  }

  return isAdmin ? '/admin/dashboard_admin' : '/user/dashboard';
}

exports.resolveActionUrl = resolveActionUrl;

exports.findAllNotifications = async ({ user_id, user_role, is_read, limit = 50 }) => {
  if (!user_id) {
    throw new AppError('Parameter user_id wajib disertakan', 400);
  }

  let role = user_role;
  if (!role) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user_id)
      .single();
    role = userProfile?.role || 'Mahasiswa';
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

  const formattedNotifications = (data || []).map((notif) => ({
    ...notif,
    action_url: resolveActionUrl(notif, role)
  }));

  return {
    notifications: formattedNotifications,
    total: formattedNotifications.length,
    unreadCount: unreadCount || 0
  };
};

exports.notifyAdmins = async ({
  title,
  message,
  type = 'sistem',
  action_url,
  reference_id,
  reference_type
}) => {
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id, role')
      .in('role', ['Admin', 'Petugas']);

    if (admins && admins.length > 0) {
      const now = new Date().toISOString();
      const extended = await hasExtendedColumns();

      const payload = admins.map(a => {
        const item = {
          user_id: a.id,
          title,
          message,
          type,
          is_read: false,
          created_at: now
        };

        if (extended) {
          item.action_url = action_url || resolveActionUrl({ title, message, type }, a.role || 'Admin');
          if (reference_id) item.reference_id = String(reference_id);
          if (reference_type) item.reference_type = reference_type;
        }

        return item;
      });

      await supabase.from('notifications').insert(payload);
    }
  } catch (err) {
    console.error('Gagal mengirim notifikasi ke admin:', err);
  }
};

exports.createNotification = async ({
  user_id,
  title,
  message,
  type = 'sistem',
  action_url,
  reference_id,
  reference_type
}) => {
  const extended = await hasExtendedColumns();
  const payload = {
    user_id,
    title,
    message,
    type,
    is_read: false,
    created_at: new Date().toISOString()
  };

  if (extended) {
    if (action_url) payload.action_url = action_url;
    if (reference_id) payload.reference_id = String(reference_id);
    if (reference_type) payload.reference_type = reference_type;
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    action_url: data.action_url || action_url || resolveActionUrl(data, 'Mahasiswa')
  };
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

