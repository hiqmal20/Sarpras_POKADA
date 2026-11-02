const Joi = require('joi');

const createReturnSchema = Joi.object({
  borrowing_id: Joi.string().uuid().required().messages({
    'string.empty': 'borrowing_id wajib diisi'
  }),
  received_by: Joi.string().uuid().allow(null),
  return_date: Joi.date().iso().default(() => new Date().toISOString()),
  condition: Joi.string().valid('Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang').default('Baik'),
  damage_description: Joi.string().allow('', null),
  fine_amount: Joi.number().integer().min(0).default(0),
  fine_reason: Joi.string().allow('', null),
  note: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  items_condition: Joi.array().items(
    Joi.object({
      borrowings_item_id: Joi.string().uuid().required(),
      condition_after: Joi.string().valid('Baik', 'Rusak Ringan', 'Rusak Berat').default('Baik'),
      note: Joi.string().allow('', null)
    })
  ).default([])
});

module.exports = {
  createReturnSchema
};
