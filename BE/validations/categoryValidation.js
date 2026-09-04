const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Nama kategori wajib diisi'
  }),
  description: Joi.string().allow('', null)
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().allow('', null)
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
