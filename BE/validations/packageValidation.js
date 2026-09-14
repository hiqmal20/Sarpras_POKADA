const Joi = require('joi');

const createPackageSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Nama paket wajib diisi'
  }),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  status: Joi.string().valid('Aktif', 'Nonaktif', 'Non-Aktif', 'Tidak Aktif').default('Aktif'),
  items: Joi.array().items(
    Joi.object({
      item_id: Joi.string().uuid().allow('', null),
      code: Joi.string().allow('', null),
      name: Joi.string().allow('', null),
      quantity: Joi.number().integer().min(1).default(1)
    }).or('item_id', 'code')
  ).default([])
});

const updatePackageSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  status: Joi.string().valid('Aktif', 'Nonaktif', 'Non-Aktif', 'Tidak Aktif'),
  items: Joi.array().items(
    Joi.object({
      item_id: Joi.string().uuid().allow('', null),
      code: Joi.string().allow('', null),
      name: Joi.string().allow('', null),
      quantity: Joi.number().integer().min(1).default(1)
    }).or('item_id', 'code')
  )
});

module.exports = {
  createPackageSchema,
  updatePackageSchema
};
