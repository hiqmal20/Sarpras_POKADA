const Joi = require('joi');

const borrowingItemSchema = Joi.object({
  item_id: Joi.string().uuid().required().messages({
    'string.empty': 'item_id wajib diisi'
  }),
  quantity: Joi.number().integer().min(1).default(1),
  condition_before: Joi.string().default('Baik'),
  note: Joi.string().allow('', null)
});

const createBorrowingSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'string.empty': 'user_id wajib diisi'
  }),
  borrow_date: Joi.date().iso().required().messages({
    'date.base': 'Format tanggal peminjaman tidak valid (gunakan format ISO/YYYY-MM-DD)'
  }),
  planned_return_date: Joi.date().iso().greater(Joi.ref('borrow_date')).required().messages({
    'date.greater': 'Tanggal estimasi pengembalian harus setelah tanggal peminjaman'
  }),
  purpose: Joi.string().trim().min(3).required().messages({
    'string.empty': 'Tujuan peminjaman wajib diisi'
  }),
  items: Joi.array().items(borrowingItemSchema).min(1).required().messages({
    'array.min': 'Minimal harus meminjam 1 barang'
  })
});

const updateBorrowingStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Disetujui', 'Ditolak', 'Dipinjam', 'Selesai', 'Terlambat', 'Dibatalkan').required().messages({
    'string.empty': 'Status wajib diisi'
  }),
  admin_note: Joi.string().allow('', null)
});

module.exports = {
  createBorrowingSchema,
  updateBorrowingStatusSchema
};
