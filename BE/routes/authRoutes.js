const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');
const { registerSchema, loginSchema } = require('../validations/authValidation');
const { updateUserSchema } = require('../validations/userValidation');

// Public routes (no auth required)
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);

// Protected routes
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, validateRequest(updateUserSchema), authController.updateProfile);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
