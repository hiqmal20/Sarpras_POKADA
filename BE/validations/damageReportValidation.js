const Joi = require('joi');

// Admin atau User membuat laporan kerusakan
const createDamageReportSchema = Joi.object({
  user_id: Joi.string().uuid().allow(null, '').messages({
    'string.base': 'user_id harus berupa string UUID'
  }),
  item_id: Joi.string().uuid().allow(null, ''),
  package_id: Joi.string().uuid().allow(null, ''),
  borrowing_id: Joi.string().uuid().allow(null, ''),

  title: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Judul laporan wajib diisi',
    'string.min': 'Judul minimal 3 karakter'
  }),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),

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
