const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createReturnRequestSchema, updateReturnRequestSchema } = require('../validations/returnRequestValidation');

router.param('id', uuidParamHandler);
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('return_requests').select('*, borrowings(id, borrow_code, purpose, status, planned_return_date, user_id)').order('created_at', { ascending: false });
    if (!['Admin', 'Petugas'].includes(req.user.role)) query = query.eq('user_id', req.user.id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ status: 'success', data: data || [], total: (data || []).length });
  } catch (err) {
    if (err?.code === 'PGRST205' || String(err?.message || '').includes("return_requests")) {
      return res.status(503).json({
        status: 'fail',
        message: 'Fitur pengajuan pengembalian belum diaktifkan di database. Jalankan BE/RETURN_REQUESTS_MIGRATION.sql di Supabase SQL Editor.'
      });
    }
    next(err);
  }
});

router.post('/', validateRequest(createReturnRequestSchema), async (req, res, next) => {
  try {
    const { data: borrowing, error: borrowError } = await supabase.from('borrowings').select('id, user_id, status').eq('id', req.body.borrowing_id).single();
    if (borrowError || !borrowing) return res.status(404).json({ status: 'fail', message: 'Peminjaman tidak ditemukan.' });
    if (borrowing.user_id !== req.user.id) return res.status(403).json({ status: 'fail', message: 'Peminjaman bukan milik Anda.' });
    if (!['Dipinjam', 'Disetujui'].includes(borrowing.status)) return res.status(400).json({ status: 'fail', message: 'Peminjaman belum dapat diajukan untuk pengembalian.' });
    const { data: existing } = await supabase.from('return_requests').select('id, status').eq('borrowing_id', req.body.borrowing_id).in('status', ['Menunggu Verifikasi', 'Disetujui']).maybeSingle();
    if (existing) return res.status(409).json({ status: 'fail', message: 'Permintaan pengembalian sudah diajukan.' });
    const { data, error } = await supabase.from('return_requests').insert([{ ...req.body, user_id: req.user.id, status: 'Menunggu Verifikasi' }]).select().single();
    if (error) throw error;
    // Emit real-time event ke admin
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('return_request_created', { returnRequest: data });
    }
    res.status(201).json({ status: 'success', message: 'Permintaan pengembalian dikirim dan menunggu verifikasi petugas.', data });
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateReturnRequestSchema), async (req, res, next) => {
  try {
    const { data: request, error: readError } = await supabase.from('return_requests').select('*').eq('id', req.params.id).single();
    if (readError || !request) return res.status(404).json({ status: 'fail', message: 'Permintaan pengembalian tidak ditemukan.' });
    const { data, error } = await supabase.from('return_requests').update({ status: req.body.status, admin_note: req.body.admin_note || '', verified_by: req.user.id, verified_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    // Emit real-time event ke admin dan user terkait
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('return_request_updated', { returnRequest: data });
      if (request.user_id) {
        io.to(String(request.user_id)).emit('return_request_updated', { returnRequest: data });
      }
    }
    res.json({ status: 'success', message: 'Status permintaan pengembalian diperbarui.', data });
  } catch (err) { next(err); }
});

module.exports = router;
