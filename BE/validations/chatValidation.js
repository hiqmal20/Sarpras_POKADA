const Joi = require('joi');
const { UUID_REGEX } = require('../middleware/validateUuid');

const sendMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Isi pesan wajib diisi',
    'string.max': 'Pesan maksimal 5000 karakter',
    'any.required': 'Isi pesan wajib diisi'
  }),
  attachment_url: Joi.string().uri({ scheme: ['https'] }).allow('', null).messages({
    'string.uri': 'URL lampiran harus berupa tautan HTTPS yang valid'
  }),
  reply_to_message_id: Joi.string().pattern(UUID_REGEX).allow(null, '').messages({
    'string.pattern.base': 'reply_to_message_id harus berupa UUID yang valid'
  }),
  tempId: Joi.string().allow(null, '')
});

const createChatSchema = Joi.object({
  subject: Joi.string().trim().max(255).allow('', null),
  initial_message: Joi.string().trim().max(5000).allow('', null),
  admin_id: Joi.string().pattern(UUID_REGEX).allow(null, ''),
  user_id: Joi.string().pattern(UUID_REGEX).allow(null, ''),
  attachment_url: Joi.string().uri({ scheme: ['https'] }).allow('', null)
});

const updateMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Isi pesan wajib diisi',
    'string.max': 'Pesan maksimal 5000 karakter',
    'any.required': 'Isi pesan wajib diisi'
  })
});

const updateChatStatusSchema = Joi.object({
  status: Joi.string().valid('Open', 'Closed').required().messages({
    'any.only': 'Status chat harus Open atau Closed',
    'any.required': 'Status chat wajib diisi'
  })
});

module.exports = {
  sendMessageSchema,
  createChatSchema,
  updateMessageSchema,
  updateChatStatusSchema
};
