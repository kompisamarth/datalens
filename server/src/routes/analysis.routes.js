import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All analysis endpoints require authentication
router.use(requireAuth);

router.get('/', AnalysisController.listAnalyses);
router.post('/', AnalysisController.createAnalysis);
router.post('/chart-data', AnalysisController.computeChartData);

router.get('/:id', AnalysisController.getAnalysisById);
router.patch('/:id', AnalysisController.updateAnalysis);
router.delete('/:id', AnalysisController.deleteAnalysis);
router.post('/:id/duplicate', AnalysisController.duplicateAnalysis);
router.get('/:id/export', AnalysisController.exportReport);

export default router;
