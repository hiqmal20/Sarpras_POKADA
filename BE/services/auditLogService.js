const supabase = require('../config/supabaseClient');
const { sanitizeSearch } = require('../utils/sanitizeSearch');

/**
 * Mencatat log audit ke tabel audit_logs secara asinkron tanpa memblokir alur utama.
 *
 * @param {object} params
 * @param {string} [params.userId] - UUID pengguna (opsional jika req disediakan)
 * @param {string} [params.userEmail] - Email pengguna (opsional jika req disediakan)
 * @param {string} [params.userRole] - Role pengguna (opsional jika req disediakan)
 * @param {string} params.action - Nama aksi (misal: LOGIN, CREATE_BORROWING, DELETE_ITEM)
 * @param {string} params.entityType - Tipe entitas (misal: auth, borrowings, items, users)
 * @param {string} [params.entityId] - ID entitas terkait
 * @param {object} [params.details] - Metadata tambahan
 * @param {import('express').Request} [params.req] - Objek Express request
 */
const recordLog = async ({
  userId,
  userEmail,
  userRole,
  action,
  entityType,
  entityId = null,
  details = {},
  req = null
}) => {
  try {
    const finalUserId = userId || (req && req.user ? req.user.id : null);
    const finalEmail = userEmail || (req && req.user ? req.user.email : null);
    const finalRole = userRole || (req && req.user ? req.user.role : null);

    let ipAddress = '';
    let userAgent = '';

    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '');
      userAgent = req.headers['user-agent'] || '';
    }

    const payload = {
      user_id: finalUserId,
      action: String(action || 'UNKNOWN'),
      // Schema live memakai kolom entity (bukan entity_type/user_email/user_role).
      entity: String(entityType || 'general'),
      entity_id: entityId ? String(entityId) : null,
      details: typeof details === 'object' && details !== null ? details : { raw: details },
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) {
      // Jika tabel belum dibuat via migration, hanya catat ke log server agar app tidak crash
      console.warn('[AuditLog] Notice: audit_logs insert failed (migration mungkin belum dieksekusi):', error.message);
    }
  } catch (err) {
    console.error('[AuditLog] Error recording log:', err.message);
  }
};

/**
 * Mengambil daftar riwayat audit log dengan filter dan pagination (Admin only).
 */
const findAllLogs = async ({
  user_id,
  action,
  entity_type,
  start_date,
  end_date,
  search,
  page = 1,
  limit = 20
}) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (action) query = query.eq('action', action);
  if (entity_type) query = query.eq('entity', entity_type);
  if (start_date) query = query.gte('created_at', start_date);
  if (end_date) query = query.lte('created_at', end_date);

  if (search) {
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) {
      query = query.or(`action.ilike.%${safeSearch}%,entity.ilike.%${safeSearch}%`);
    }
  }

  query = query.range(offset, offset + limitNum - 1);

  const { data, count, error } = await query;
  if (error) {
    if (error.code === 'PGRST205' || String(error.message || '').includes('audit_logs')) {
      return {
        logs: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        notice: 'Tabel audit_logs belum dibuat di database Supabase.'
      };
    }
    throw error;
  }

  return {
    logs: data || [],
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil((count || 0) / limitNum)
  };
};

module.exports = {
  recordLog,
  findAllLogs
};
