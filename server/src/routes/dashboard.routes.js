import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', requireAuth, DashboardController.getSummary);

export default router;
