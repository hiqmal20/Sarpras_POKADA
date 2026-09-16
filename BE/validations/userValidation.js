const Joi = require('joi');
const { ALL_ROLES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/status');

const createUserSchema = Joi.object({
  nomor_induk: Joi.string().trim().min(3).max(50).required().messages({
    'string.empty': 'Nomor Induk (NIM / NIP / ID Staff) wajib diisi'
  }),
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Nama lengkap wajib diisi'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.empty': 'Email wajib diisi',
    'string.email': 'Format email tidak valid'
  }),
  password: Joi.string().min(8).max(128).optional().messages({
    'string.min': 'Password minimal 8 karakter'
  }),
  role: Joi.string().valid(...ALL_ROLES).default('Mahasiswa'),
  no_hp: Joi.string().allow('', null),
  foto: Joi.string().uri().allow('', null),
  status: Joi.string().valid(...Object.values(USER_STATUS)).default('Aktif')
});

const updateUserSchema = Joi.object({
  nomor_induk: Joi.string().trim().min(3).max(50),
  name: Joi.string().trim().min(3).max(100),
  email: Joi.string().email().trim().allow('', null),
  role: Joi.string().valid(...ALL_ROLES),
  no_hp: Joi.string().allow('', null),
  foto: Joi.string().allow('', null),
  status: Joi.string().valid(...Object.values(USER_STATUS))
});

module.exports = {
  createUserSchema,
  updateUserSchema
};
