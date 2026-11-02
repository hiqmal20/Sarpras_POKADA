const Joi = require('joi');
const { ALL_ROLES } = require('../constants/roles');

const PUBLIC_ROLES = ['Mahasiswa', 'Dosen', 'Staff'];

const registerSchema = Joi.object({
  nomor_induk: Joi.string().trim().min(3).max(50).required().messages({
    'string.empty': 'Nomor Induk (NIM / NIP / ID Staff) wajib diisi',
    'string.min': 'Nomor Induk minimal 3 karakter',
    'string.max': 'Nomor Induk maksimal 50 karakter'
  }),
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Nama lengkap wajib diisi',
    'string.min': 'Nama minimal harus 3 karakter'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.empty': 'Email wajib diisi',
    'string.email': 'Format email tidak valid'
  }),
  password: Joi.string().min(8).max(128).pattern(/[a-z]/, 'lowercase').pattern(/[A-Z]/, 'uppercase').pattern(/[0-9]/, 'number').required().messages({
    'string.empty': 'Password wajib diisi',
    'string.min': 'Password minimal harus 8 karakter',
    'string.max': 'Password maksimal 128 karakter',
    'string.pattern.name': 'Password harus mengandung huruf kecil, huruf besar, dan angka'
  }),
  role: Joi.string().valid(...PUBLIC_ROLES).default('Mahasiswa').optional().allow('', null),
  no_hp: Joi.string().allow('', null),
  foto: Joi.string().uri().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().trim().required(),
  nomor_induk: Joi.string().trim().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).pattern(/[a-z]/, 'lowercase').pattern(/[A-Z]/, 'uppercase').pattern(/[0-9]/, 'number').required().messages({
    'string.min': 'Password baru minimal harus 8 karakter',
    'string.pattern.name': 'Password baru harus mengandung huruf kecil, huruf besar, dan angka'
  })
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
