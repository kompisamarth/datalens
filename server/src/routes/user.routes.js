import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.patch('/profile', UserController.updateProfile);
router.patch('/password', UserController.updatePassword);
router.delete('/account', UserController.deleteAccount);

export default router;
