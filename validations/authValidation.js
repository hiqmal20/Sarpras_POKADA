const Joi = require('joi');
const { ALL_ROLES } = require('../constants/roles');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Nama lengkap wajib diisi',
    'string.min': 'Nama minimal harus 3 karakter'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.empty': 'Email wajib diisi',
    'string.email': 'Format email tidak valid'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password wajib diisi',
    'string.min': 'Password minimal harus 6 karakter'
  }),
  role: Joi.string().valid(...ALL_ROLES).default('Mahasiswa'),
  no_hp: Joi.string().allow('', null),
  foto: Joi.string().uri().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    'string.empty': 'Email wajib diisi',
    'string.email': 'Format email tidak valid'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password wajib diisi'
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
