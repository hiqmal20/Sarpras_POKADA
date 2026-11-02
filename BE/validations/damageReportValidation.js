const Joi = require('joi');

// Admin membuat laporan manual
const createDamageReportSchema = Joi.object({
  user_id: Joi.string().uuid().optional(),
  item_id: Joi.string().uuid().empty('').default(null).allow(null),
  package_id: Joi.string().uuid().empty('').default(null).allow(null),
  borrowing_id: Joi.string().uuid().empty('').default(null).allow(null),

  title: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Judul laporan wajib diisi',
    'string.min': 'Judul minimal 3 karakter'
  }),
  description: Joi.string().allow('', null),
  damage_description: Joi.string().allow('', null),
  image_url: Joi.string().allow('', null),
  photo_url: Joi.string().allow('', null),

  report_type: Joi.string()
    .valid('Kerusakan', 'Kehilangan', 'Cacat Fungsi')
    .default('Kerusakan')
    .messages({
      'any.only': 'Tipe laporan harus salah satu dari: Kerusakan, Kehilangan, Cacat Fungsi'
    }),

  damage_type: Joi.string()
    .valid('per_item', 'per_package')
    .messages({
      'any.only': 'Tipe kerusakan harus: per_item atau per_package'
    }),

  item_condition: Joi.string()
    .valid('Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang')
    .allow(null, '')
    .messages({
      'any.only': 'Kondisi barang harus: Baik, Rusak Ringan, Rusak Berat, atau Hilang'
    }),

  // Denda — diisi manual oleh admin, tidak otomatis
  fine_amount: Joi.number().min(0).default(0).messages({
    'number.min': 'Nominal denda tidak boleh negatif'
  }),
  fine_reason: Joi.string().allow('', null)
});

// Update laporan (status, denda, kondisi item)
const updateDamageReportSchema = Joi.object({
  status: Joi.string()
    .valid('Menunggu Review', 'Sedang Diperbaiki', 'Selesai', 'Ditolak')
    .messages({
      'any.only': 'Status harus: Menunggu Review, Sedang Diperbaiki, Selesai, atau Ditolak'
    }),
  admin_note: Joi.string().allow('', null),
  image_url: Joi.string().allow('', null).optional(),
  photo_url: Joi.string().allow('', null).optional(),

  // Denda bisa diubah kapan saja oleh admin
  fine_amount: Joi.number().min(0).messages({
    'number.min': 'Nominal denda tidak boleh negatif'
  }),
  fine_reason: Joi.string().allow('', null),
  fine_status: Joi.string()
    .valid('Tidak Ada Denda', 'Belum Dibayar', 'Sudah Dibayar')
    .messages({
      'any.only': 'Status denda harus: Tidak Ada Denda, Belum Dibayar, atau Sudah Dibayar'
    }),

  item_condition: Joi.string()
    .valid('Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang')
    .allow(null, '')
}).min(1).messages({
  'object.min': 'Minimal satu field harus diisi untuk update'
});

module.exports = {
  createDamageReportSchema,
  updateDamageReportSchema,
  // backward compat
  updateDamageReportStatusSchema: updateDamageReportSchema
};
