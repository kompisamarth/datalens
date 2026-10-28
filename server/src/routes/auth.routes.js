import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authRateLimiter } from '../config/security.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', requireAuth, AuthController.logout);
router.get('/me', AuthController.getCurrentUser);
router.get('/csrf', AuthController.getCsrfToken);

export default router;
