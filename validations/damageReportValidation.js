const Joi = require('joi');

const createDamageReportSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'string.empty': 'user_id wajib diisi'
  }),
  item_id: Joi.string().uuid().allow(null),
  borrowing_id: Joi.string().uuid().allow(null),
  title: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Judul laporan wajib diisi'
  }),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  report_type: Joi.string().valid('Kerusakan', 'Kehilangan', 'Cacat Fungsi').default('Kerusakan')
});

const updateDamageReportStatusSchema = Joi.object({
  status: Joi.string().valid('Menunggu Review', 'Sedang Diperbaiki', 'Selesai', 'Ditolak').required().messages({
    'string.empty': 'Status wajib diisi'
  }),
  admin_note: Joi.string().allow('', null)
});

module.exports = {
  createDamageReportSchema,
  updateDamageReportStatusSchema
};
