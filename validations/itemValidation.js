const Joi = require('joi');

const createItemSchema = Joi.object({
  category_id: Joi.string().uuid().allow(null, ''),
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Nama barang wajib diisi'
  }),
  code: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Kode barang wajib diisi'
  }),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  stock: Joi.number().integer().min(0).default(0),
  available_stock: Joi.number().integer().min(0).allow(null),
  condition: Joi.string().valid('Baik', 'Rusak Ringan', 'Rusak Berat').default('Baik'),
  status: Joi.string().valid('Tersedia', 'Dipinjam', 'Dalam Pemeliharaan').default('Tersedia')
});

const updateItemSchema = Joi.object({
  category_id: Joi.string().uuid().allow(null, ''),
  name: Joi.string().trim().min(2).max(150),
  code: Joi.string().trim().min(2).max(50),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  stock: Joi.number().integer().min(0),
  available_stock: Joi.number().integer().min(0),
  condition: Joi.string().valid('Baik', 'Rusak Ringan', 'Rusak Berat'),
  status: Joi.string().valid('Tersedia', 'Dipinjam', 'Dalam Pemeliharaan')
});

module.exports = {
  createItemSchema,
  updateItemSchema
};
