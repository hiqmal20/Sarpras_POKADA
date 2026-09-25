const Joi = require('joi');

const createReturnRequestSchema = Joi.object({
  borrowing_id: Joi.string().uuid().required(),
  planned_return_date: Joi.date().iso().required(),
  condition: Joi.string().valid('Baik', 'Rusak Ringan', 'Rusak Berat').default('Baik'),
  note: Joi.string().allow('', null).default('')
});

const updateReturnRequestSchema = Joi.object({
  status: Joi.string().valid('Menunggu Verifikasi', 'Disetujui', 'Ditolak').required(),
  admin_note: Joi.string().allow('', null).default('')
});

module.exports = { createReturnRequestSchema, updateReturnRequestSchema };
