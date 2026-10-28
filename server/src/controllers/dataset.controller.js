import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Dataset } from '../models/Dataset.js';
import { DatasetRow } from '../models/DatasetRow.js';
import { SavedAnalysis } from '../models/SavedAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { CsvService } from '../services/csv.service.js';
import { QualityService } from '../services/quality.service.js';
import { InsightService } from '../services/insight.service.js';
import { ChartService } from '../services/chart.service.js';
import { ExportService } from '../services/export.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatasetController {
  /**
   * List datasets for logged-in user with search, filter, and sorting.
   */
  static async listDatasets(req, res, next) {
    try {
      const userId = req.session.userId;
      const {
        search = '',
        sort = 'newest',
        sourceType = '',
        page = 1,
        limit = 10
      } = req.query;

      const query = { ownerId: userId };

      if (search.trim()) {
        query.name = { $regex: search.trim(), $options: 'i' };
      }

      if (sourceType) {
        query.sourceType = sourceType;
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'oldest') sortOptions = { createdAt: 1 };
      if (sort === 'name') sortOptions = { name: 1 };
      if (sort === 'score') sortOptions = { 'qualitySummary.score': -1 };
      if (sort === 'rows') sortOptions = { rowCount: -1 };

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
      const skip = (pageNum - 1) * limitNum;

      const [datasets, total] = await Promise.all([
        Dataset.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .select('-__v'),
        Dataset.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          datasets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload and process new CSV dataset.
   */
  static async createDataset(req, res, next) {
    try {
      const userId = req.session.userId;

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE_UPLOADED', message: 'Please select a valid CSV file to upload.' }
        });
      }

      const { name, description = '' } = req.body;
      const originalFilename = req.file.originalname || 'dataset.csv';
      const datasetName = name && name.trim() ? name.trim() : originalFilename.replace(/\.csv$/i, '');

      const maxRows = parseInt(process.env.MAX_ROW_COUNT, 10) || 10000;

      // 1. Parse CSV
      const { headers, rows } = await CsvService.parseCsvBuffer(req.file.buffer, maxRows);

      // 2. Infer Schema
      const schemaInfo = CsvService.inferSchema(headers, rows);

      // 3. Cast Typed Values
      const typedRows = CsvService.castRowValues(rows, schemaInfo);

      // 4. Audit Data Quality
      const qualitySummary = QualityService.auditDataset(typedRows, schemaInfo);

      // 5. Save Dataset Record
      const dataset = await Dataset.create({
        ownerId: userId,
        name: datasetName,
        description: description.trim(),
        originalFilename,
        sourceType: 'upload',
        schemaInfo,
        rowCount: typedRows.length,
        columnCount: headers.length,
        fileSizeBytes: req.file.buffer.length,
        qualitySummary,
        isPublicSample: false,
        version: 1
      });

      // 6. Batch Insert Rows
      const rowDocs = typedRows.map((rowData, index) => ({
        datasetId: dataset._id,
        ownerId: userId,
        rowIndex: index,
        rowData
      }));

      await DatasetRow.insertMany(rowDocs, { ordered: false });

      // 7. Audit Log
      await ActivityLog.create({
        ownerId: userId,
        action: 'DATASET_UPLOAD',
        targetType: 'dataset',
        targetId: dataset._id.toString(),
        details: { name: dataset.name, rowCount: dataset.rowCount }
      });

      res.status(201).json({
        success: true,
        message: 'Dataset imported and profiled successfully.',
        data: dataset
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Seed/clone the COVID-19 sample dataset into the authenticated user's workspace.
   */
  static async loadSampleDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const csvPath = path.join(__dirname, '../seed/covid-sample.csv');

      if (!fs.existsSync(csvPath)) {
        return res.status(500).json({
          success: false,
          error: { code: 'SAMPLE_FILE_MISSING', message: 'Sample dataset file is not available on server.' }
        });
      }

      const csvBuffer = fs.readFileSync(csvPath);
      const { headers, rows } = await CsvService.parseCsvBuffer(csvBuffer, 10000);
      const schemaInfo = CsvService.inferSchema(headers, rows);
      const typedRows = CsvService.castRowValues(rows, schemaInfo);
      const qualitySummary = QualityService.auditDataset(typedRows, schemaInfo);

      const dataset = await Dataset.create({
        ownerId: userId,
        name: 'COVID-19 Global Benchmark (2020)',
        description:
          'Verified archival dataset tracking historical COVID-19 waves across 4 world regions (March-August 2020). Sourced from WHO / Our World in Data open repositories.',
        originalFilename: 'covid-sample.csv',
        sourceType: 'built-in-sample',
        schemaInfo,
        rowCount: typedRows.length,
        columnCount: headers.length,
        fileSizeBytes: csvBuffer.length,
        qualitySummary,
        isPublicSample: false,
        version: 1
      });

      const rowDocs = typedRows.map((rowData, index) => ({
        datasetId: dataset._id,
        ownerId: userId,
        rowIndex: index,
        rowData
      }));

      await DatasetRow.insertMany(rowDocs, { ordered: false });

      await ActivityLog.create({
        ownerId: userId,
        action: 'DATASET_SAMPLE_LOAD',
        targetType: 'dataset',
        targetId: dataset._id.toString(),
        details: { name: dataset.name, rowCount: dataset.rowCount }
      });

      res.status(201).json({
        success: true,
        message: 'Sample COVID-19 dataset added to your workspace.',
        data: dataset
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single dataset metadata by ID with ownership verification.
   */
  static async getDatasetById(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found or access denied.' }
        });
      }

      res.status(200).json({ success: true, data: dataset });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dataset name and description.
   */
  static async updateDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_NAME', message: 'Dataset name cannot be empty.' }
        });
      }

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found or access denied.' }
        });
      }

      dataset.name = name.trim();
      if (description !== undefined) dataset.description = description.trim();
      await dataset.save();

      await ActivityLog.create({
        ownerId: userId,
        action: 'DATASET_UPDATE',
        targetType: 'dataset',
        targetId: dataset._id.toString(),
        details: { name: dataset.name }
      });

      res.status(200).json({
        success: true,
        message: 'Dataset updated successfully.',
        data: dataset
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete dataset with cascading cleanup of rows and saved analyses.
   */
  static async deleteDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found or access denied.' }
        });
      }

      // Cascading deletions
      const [rowsDeleted, analysesDeleted] = await Promise.all([
        DatasetRow.deleteMany({ datasetId: id }),
        SavedAnalysis.deleteMany({ datasetId: id }),
        Dataset.deleteOne({ _id: id, ownerId: userId })
      ]);

      await ActivityLog.create({
        ownerId: userId,
        action: 'DATASET_DELETE',
        targetType: 'dataset',
        targetId: id,
        details: {
          name: dataset.name,
          rowsRemoved: rowsDeleted.deletedCount,
          analysesRemoved: analysesDeleted.deletedCount
        }
      });

      res.status(200).json({
        success: true,
        message: 'Dataset and associated analyses deleted successfully.',
        data: {
          deletedDatasetId: id,
          rowsRemoved: rowsDeleted.deletedCount,
          analysesRemoved: analysesDeleted.deletedCount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview paginated dataset records with searching and column sorting.
   */
  static async previewDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      const {
        page = 1,
        limit = 25,
        search = '',
        sortCol = '',
        sortDir = 'asc'
      } = req.query;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found or access denied.' }
        });
      }

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

      // Fetch all rows for in-memory searching/sorting within bounded dataset
      const allRowDocs = await DatasetRow.find({ datasetId: id })
        .sort({ rowIndex: 1 })
        .lean();

      let rows = allRowDocs.map(d => ({
        rowIndex: d.rowIndex,
        rowData: d.rowData
      }));

      // Search across row data fields
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        rows = rows.filter(r => {
          return Object.values(r.rowData).some(val => {
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(term);
          });
        });
      }

      // Column sorting
      if (sortCol) {
        const isNumeric = dataset.schemaInfo.some(c => c.name === sortCol && c.type === 'numeric');
        const dir = sortDir === 'desc' ? -1 : 1;

        rows.sort((a, b) => {
          const valA = a.rowData[sortCol];
          const valB = b.rowData[sortCol];

          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          if (isNumeric) {
            return (Number(valA) - Number(valB)) * dir;
          }
          return String(valA).localeCompare(String(valB)) * dir;
        });
      }

      const totalRows = rows.length;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedRows = rows.slice(startIndex, startIndex + limitNum);

      res.status(200).json({
        success: true,
        data: {
          rows: paginatedRows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalRows,
            totalPages: Math.ceil(totalRows / limitNum) || 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Quality Intelligence Report for dataset.
   */
  static async getQualityReport(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      res.status(200).json({
        success: true,
        data: dataset.qualitySummary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate automatic insights and statistical summaries.
   */
  static async getInsights(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      const rowDocs = await DatasetRow.find({ datasetId: id })
        .sort({ rowIndex: 1 })
        .lean();

      const rawRows = rowDocs.map(d => d.rowData);
      const insights = InsightService.generateInsights(rawRows, dataset.schemaInfo);

      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get smart chart recommendations for dataset.
   */
  static async getRecommendations(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      const recommendations = ChartService.recommendCharts(dataset.schemaInfo);

      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute cleaning transformation (dedup, drop columns, impute, filter).
   */
  static async cleanDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      const {
        removeDuplicates = false,
        dropColumns = [],
        imputeMissing = [],
        filterRules = [],
        createNewDataset = false,
        newDatasetName = ''
      } = req.body;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      const rowDocs = await DatasetRow.find({ datasetId: id })
        .sort({ rowIndex: 1 })
        .lean();

      const rawRows = rowDocs.map(d => d.rowData);

      // Execute clean operations
      const { cleanedRows, stats } = QualityService.cleanDataset(rawRows, dataset.schemaInfo, {
        removeDuplicates,
        dropColumns,
        imputeMissing,
        filterRules
      });

      // Filter remaining headers
      const remainingHeaders =
        cleanedRows.length > 0
          ? Object.keys(cleanedRows[0])
          : dataset.schemaInfo.map(c => c.name).filter(n => !dropColumns.includes(n));
      const newSchemaInfo = CsvService.inferSchema(remainingHeaders, cleanedRows);
      const newQualitySummary = QualityService.auditDataset(cleanedRows, newSchemaInfo);

      if (createNewDataset) {
        const nameToUse = newDatasetName.trim() || `${dataset.name} (Cleaned)`;

        const newDataset = await Dataset.create({
          ownerId: userId,
          name: nameToUse,
          description: `Derived cleaned version of "${dataset.name}". Transformations: ${JSON.stringify(stats)}`,
          originalFilename: dataset.originalFilename,
          sourceType: 'cleaned-derived',
          schemaInfo: newSchemaInfo,
          rowCount: cleanedRows.length,
          columnCount: remainingHeaders.length,
          fileSizeBytes: dataset.fileSizeBytes,
          qualitySummary: newQualitySummary,
          isPublicSample: false,
          version: 1
        });

        const newRowDocs = cleanedRows.map((rowData, index) => ({
          datasetId: newDataset._id,
          ownerId: userId,
          rowIndex: index,
          rowData
        }));

        if (newRowDocs.length > 0) {
          await DatasetRow.insertMany(newRowDocs, { ordered: false });
        }

        await ActivityLog.create({
          ownerId: userId,
          action: 'DATASET_CLEAN',
          targetType: 'dataset',
          targetId: newDataset._id.toString(),
          details: { parentId: id, stats }
        });

        return res.status(201).json({
          success: true,
          message: 'Cleaned dataset created successfully.',
          data: { dataset: newDataset, stats }
        });
      } else {
        // In-place dataset update
        await DatasetRow.deleteMany({ datasetId: id });

        const updatedRowDocs = cleanedRows.map((rowData, index) => ({
          datasetId: dataset._id,
          ownerId: userId,
          rowIndex: index,
          rowData
        }));

        if (updatedRowDocs.length > 0) {
          await DatasetRow.insertMany(updatedRowDocs, { ordered: false });
        }

        dataset.schemaInfo = newSchemaInfo;
        dataset.rowCount = cleanedRows.length;
        dataset.columnCount = remainingHeaders.length;
        dataset.qualitySummary = newQualitySummary;
        dataset.version += 1;
        await dataset.save();

        await ActivityLog.create({
          ownerId: userId,
          action: 'DATASET_CLEAN',
          targetType: 'dataset',
          targetId: dataset._id.toString(),
          details: { stats }
        });

        return res.status(200).json({
          success: true,
          message: 'Dataset updated with cleaned records.',
          data: { dataset, stats }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export dataset as safe CSV with formula-injection prevention.
   */
  static async exportDataset(req, res, next) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const dataset = await Dataset.findOne({ _id: id, ownerId: userId });
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found.' }
        });
      }

      const rowDocs = await DatasetRow.find({ datasetId: id })
        .sort({ rowIndex: 1 })
        .lean();

      const rawRows = rowDocs.map(d => d.rowData);
      const columns = dataset.schemaInfo.map(c => c.name);

      const csvContent = ExportService.generateCsv(columns, rawRows);
      const safeFilename = `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
