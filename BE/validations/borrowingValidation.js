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
  user_id: Joi.string().uuid().optional(),
  purpose: Joi.string().trim().min(3).required().messages({
    'string.empty': 'Tujuan peminjaman wajib diisi'
  }),
  borrow_date: Joi.date().iso().optional(),
  return_date: Joi.date().iso().optional(),
  planned_return_date: Joi.date().iso().optional(),
  items: Joi.array().items(borrowingItemSchema).min(1).required().messages({
    'array.min': 'Minimal harus meminjam 1 barang'
  })
});

const updateBorrowingStatusSchema = Joi.object({
  // Status Terlambat dihapus karena tidak relevan tanpa deadline
  status: Joi.string().valid('Pending', 'Disetujui', 'Ditolak', 'Dipinjam', 'Dikembalikan', 'Dibatalkan').required().messages({
    'string.empty': 'Status wajib diisi'
  }),
  admin_note: Joi.string().allow('', null),
  admin_notes: Joi.string().allow('', null)
});

module.exports = {
  createBorrowingSchema,
  updateBorrowingStatusSchema
};
