import { Router } from 'express';
import { DatasetController } from '../controllers/dataset.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadCsv } from '../middleware/upload.middleware.js';

const router = Router();

// All dataset routes require authentication
router.use(requireAuth);

router.get('/', DatasetController.listDatasets);
router.post('/', uploadCsv.single('file'), DatasetController.createDataset);
router.post('/sample', DatasetController.loadSampleDataset);

router.get('/:id', DatasetController.getDatasetById);
router.patch('/:id', DatasetController.updateDataset);
router.delete('/:id', DatasetController.deleteDataset);

router.get('/:id/preview', DatasetController.previewDataset);
router.get('/:id/quality', DatasetController.getQualityReport);
router.get('/:id/insights', DatasetController.getInsights);
router.get('/:id/recommendations', DatasetController.getRecommendations);
router.post('/:id/clean', DatasetController.cleanDataset);
router.get('/:id/export', DatasetController.exportDataset);

export default router;
