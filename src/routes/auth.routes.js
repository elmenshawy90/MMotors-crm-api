import express from 'express';
import authController from '../controllers/auth.controller.js';
import { validateRegister, validateLogin, validateChangePassword, validateUpdateProfile, validateRefreshToken } from '../validators/auth.validator.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/security.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authRateLimiter, validateRegister, authController.register);
router.post('/login', authRateLimiter, validateLogin, authController.login);
router.post('/refresh-token', authRateLimiter, validateRefreshToken, authController.refreshToken);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validateUpdateProfile, authController.updateProfile);
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

// Users management — admin/super_admin only
router.get('/users', authenticate, authorize(['admin', 'super_admin']), authController.getAllUsers);
router.get('/users/:id', authenticate, authorize(['admin', 'super_admin']), authController.getUserById);
router.put('/users/:id', authenticate, authorize(['admin', 'super_admin']), authController.updateUser);
router.delete('/users/:id', authenticate, authorize(['super_admin']), authController.deleteUser);

export default router;
