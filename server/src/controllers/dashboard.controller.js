import { Dataset } from '../models/Dataset.js';
import { SavedAnalysis } from '../models/SavedAnalysis.js';

export class DashboardController {
  /**
   * Get personalized dashboard metrics, quality averages, and recent items.
   */
  static async getSummary(req, res, next) {
    try {
      const userId = req.session.userId;

      // Parallel queries for metrics
      const [totalDatasets, totalAnalyses, datasets, recentAnalyses] = await Promise.all([
        Dataset.countDocuments({ ownerId: userId }),
        SavedAnalysis.countDocuments({ ownerId: userId }),
        Dataset.find({ ownerId: userId })
          .select('name rowCount columnCount qualitySummary fileSizeBytes createdAt sourceType')
          .sort({ createdAt: -1 }),
        SavedAnalysis.find({ ownerId: userId })
          .select('title chartType datasetId createdAt updatedAt')
          .populate('datasetId', 'name')
          .sort({ updatedAt: -1 })
          .limit(5)
      ]);

      // Calculate aggregate stats
      let totalRows = 0;
      let totalQualityScore = 0;

      datasets.forEach(d => {
        totalRows += d.rowCount || 0;
        totalQualityScore += (d.qualitySummary && d.qualitySummary.score !== undefined) ? d.qualitySummary.score : 100;
      });

      const avgQualityScore =
        totalDatasets > 0 ? Number((totalQualityScore / totalDatasets).toFixed(1)) : 100;

      res.status(200).json({
        success: true,
        data: {
          totalDatasets,
          totalAnalyses,
          avgQualityScore,
          totalRows,
          recentDatasets: datasets.slice(0, 5),
          recentAnalyses
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
