import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['numeric', 'date', 'boolean', 'string'],
      required: true
    },
    sampleValues: [{ type: String }],
    uniqueCount: { type: Number, default: 0 },
    missingCount: { type: Number, default: 0 },
    isConstant: { type: Boolean, default: false },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    mean: { type: Number, default: null },
    median: { type: Number, default: null }
  },
  { _id: false }
);

const qualityIssueSchema = new mongoose.Schema(
  {
    severity: {
      type: String,
      enum: ['Critical', 'Warning', 'Info'],
      default: 'Info'
    },
    title: { type: String, required: true },
    column: { type: String, default: 'Dataset-wide' },
    affectedCount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    recommendation: { type: String, default: '' }
  },
  { _id: false }
);

const datasetSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Dataset name is required'],
      trim: true,
      maxlength: [120, 'Dataset name cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    sourceType: {
      type: String,
      enum: ['upload', 'built-in-sample', 'cleaned-derived'],
      default: 'upload'
    },
    schemaInfo: [columnSchema],
    rowCount: {
      type: Number,
      required: true,
      min: 0
    },
    columnCount: {
      type: Number,
      required: true,
      min: 1
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0
    },
    qualitySummary: {
      score: { type: Number, default: 100 },
      status: { type: String, default: 'High' }, // High, Medium, Low
      missingCells: { type: Number, default: 0 },
      missingPct: { type: Number, default: 0 },
      duplicateRows: { type: Number, default: 0 },
      outlierCount: { type: Number, default: 0 },
      issues: [qualityIssueSchema]
    },
    isPublicSample: {
      type: Boolean,
      default: false,
      index: true
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

datasetSchema.index({ ownerId: 1, createdAt: -1 });

export const Dataset = mongoose.model('Dataset', datasetSchema);
