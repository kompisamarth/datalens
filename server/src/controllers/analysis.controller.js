import { SavedAnalysis } from '../models/SavedAnalysis.js';
import { Dataset } from '../models/Dataset.js';
import { DatasetRow } from '../models/DatasetRow.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ChartService } from '../services/chart.service.js';
import { ExportService } from '../services/export.service.js';

export class AnalysisController {
  /**
   * List saved analyses for current user.
   */
  static async listAnalyses(req, res, next) {
    try {
      const userId = req.session.userId;
      const { datasetId, search = '', sort = 'newest' } = req.query;

      const query = { ownerId: userId };
      if (datasetId) query.datasetId = datasetId;
      if (search.trim()) query.title = { $regex: search.trim(), $options: 'i' };

      let sortOptions = { updatedAt: -1 };
      if (sort === 'oldest') sortOptions = { updatedAt: 1 };
      if (sort === 'title') sortOptions = { title: 1 };

      const analyses = await SavedAnalysis.find(query)
        .populate('datasetId', 'name rowCount columnCount qualitySummary')
        .sort(sortOptions)
        .lean();

      res.status(200).json({
        success: true,
        data: analyses
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save new analytical configuration.
   */
  static async createAnalysis(req, res, next) {
    try {
      const userId = req.session.userId;
      const {
        datasetId,
        title,
        description = '',
        chartType,
        xAxisColumn,
        yAxisColumn = '',
        aggregation = 'none',
        groupByColumn = '',
        filterRules = [],
        chartConfig = {},
        summaryInsights = []
      } = req.body;

      if (!datasetId || !title || !chartType || !xAxisColumn) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Dataset, Title, Chart Type, and X-Axis are required to save an analysis.'
          }
        });
      }

      // Check dataset ownership
      const dataset = await Dataset.findOne({ _id: datasetId, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Selected dataset does not exist or access denied.' }
        });
      }

      const analysis = await SavedAnalysis.create({
        ownerId: userId,
        datasetId,
        title: title.trim(),
        description: description.trim(),
        chartType,
        xAxisColumn,
        yAxisColumn,
        aggregation,
        groupByColumn,
        filterRules,
        chartConfig,
        summaryInsights
      });

      await ActivityLog.create({
        ownerId: userId,
        action: 'ANALYSIS_CREATE',
        targetType: 'analysis',
        targetId: analysis._id.toString(),
        details: { title: analysis.title, chartType: analysis.chartType }
      });

      res.status(201).json({
        success: true,
        message: 'Analysis saved successfully.',
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single saved analysis by ID.
   */
  static async getAnalysisById(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const analysis = await SavedAnalysis.findOne({ _id: id, ownerId: userId }).populate(
        'datasetId',
        'name schemaInfo rowCount columnCount qualitySummary'
      );

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found or access denied.' }
        });
      }

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update saved analysis configuration.
   */
  static async updateAnalysis(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      const {
        title,
        description,
        chartType,
        xAxisColumn,
        yAxisColumn,
        aggregation,
        groupByColumn,
        filterRules,
        chartConfig,
        summaryInsights
      } = req.body;

      const analysis = await SavedAnalysis.findOne({ _id: id, ownerId: userId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found or access denied.' }
        });
      }

      if (title && title.trim()) analysis.title = title.trim();
      if (description !== undefined) analysis.description = description.trim();
      if (chartType) analysis.chartType = chartType;
      if (xAxisColumn) analysis.xAxisColumn = xAxisColumn;
      if (yAxisColumn !== undefined) analysis.yAxisColumn = yAxisColumn;
      if (aggregation) analysis.aggregation = aggregation;
      if (groupByColumn !== undefined) analysis.groupByColumn = groupByColumn;
      if (Array.isArray(filterRules)) analysis.filterRules = filterRules;
      if (chartConfig) analysis.chartConfig = chartConfig;
      if (Array.isArray(summaryInsights)) analysis.summaryInsights = summaryInsights;

      await analysis.save();

      await ActivityLog.create({
        ownerId: userId,
        action: 'ANALYSIS_UPDATE',
        targetType: 'analysis',
        targetId: analysis._id.toString(),
        details: { title: analysis.title }
      });

      res.status(200).json({
        success: true,
        message: 'Analysis updated successfully.',
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete saved analysis.
   */
  static async deleteAnalysis(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const analysis = await SavedAnalysis.findOne({ _id: id, ownerId: userId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found or access denied.' }
        });
      }

      await SavedAnalysis.deleteOne({ _id: id, ownerId: userId });

      await ActivityLog.create({
        ownerId: userId,
        action: 'ANALYSIS_DELETE',
        targetType: 'analysis',
        targetId: id,
        details: { title: analysis.title }
      });

      res.status(200).json({
        success: true,
        message: 'Analysis deleted successfully.',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate existing saved analysis.
   */
  static async duplicateAnalysis(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const original = await SavedAnalysis.findOne({ _id: id, ownerId: userId });
      if (!original) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found or access denied.' }
        });
      }

      const duplicate = await SavedAnalysis.create({
        ownerId: userId,
        datasetId: original.datasetId,
        title: `${original.title} (Copy)`,
        description: original.description,
        chartType: original.chartType,
        xAxisColumn: original.xAxisColumn,
        yAxisColumn: original.yAxisColumn,
        aggregation: original.aggregation,
        groupByColumn: original.groupByColumn,
        filterRules: original.filterRules,
        chartConfig: original.chartConfig,
        summaryInsights: original.summaryInsights
      });

      await ActivityLog.create({
        ownerId: userId,
        action: 'ANALYSIS_DUPLICATE',
        targetType: 'analysis',
        targetId: duplicate._id.toString(),
        details: { originalId: id, newTitle: duplicate.title }
      });

      res.status(201).json({
        success: true,
        message: 'Analysis duplicated successfully.',
        data: duplicate
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compute live chart aggregation without saving.
   */
  static async computeChartData(req, res, next) {
    try {
      const userId = req.session.userId;
      const {
        datasetId,
        chartType = 'bar',
        xAxisColumn,
        yAxisColumn = '',
        aggregation = 'sum',
        groupByColumn = '',
        filterRules = []
      } = req.body;

      if (!datasetId || !xAxisColumn) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Dataset and X-Axis are required.' }
        });
      }

      const dataset = await Dataset.findOne({ _id: datasetId, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      const rowDocs = await DatasetRow.find({ datasetId }).lean();
      const rawRows = rowDocs.map(d => d.rowData);

      const chartData = ChartService.buildChartData(rawRows, {
        chartType,
        xAxisColumn,
        yAxisColumn,
        aggregation,
        groupByColumn,
        filterRules
      });

      res.status(200).json({
        success: true,
        data: chartData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analysis as standalone HTML report.
   */
  static async exportReport(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const analysis = await SavedAnalysis.findOne({ _id: id, ownerId: userId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found.' }
        });
      }

      const dataset = await Dataset.findOne({ _id: analysis.datasetId, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Referenced dataset was not found.' }
        });
      }

      const rowDocs = await DatasetRow.find({ datasetId: dataset._id }).lean();
      const rawRows = rowDocs.map(d => d.rowData);

      const chartData = ChartService.buildChartData(rawRows, {
        chartType: analysis.chartType,
        xAxisColumn: analysis.xAxisColumn,
        yAxisColumn: analysis.yAxisColumn,
        aggregation: analysis.aggregation,
        groupByColumn: analysis.groupByColumn,
        filterRules: analysis.filterRules
      });

      const htmlContent = ExportService.generateHtmlReport(analysis, dataset, chartData);
      const safeFilename = `${analysis.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_report.html`;

      await ActivityLog.create({
        ownerId: userId,
        action: 'REPORT_EXPORT',
        targetType: 'report',
        targetId: analysis._id.toString(),
        details: { title: analysis.title }
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.status(200).send(htmlContent);
    } catch (error) {
      next(error);
    }
  }
}
