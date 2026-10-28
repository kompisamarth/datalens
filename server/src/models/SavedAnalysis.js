import mongoose from 'mongoose';

const filterRuleSchema = new mongoose.Schema(
  {
    column: { type: String, required: true },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
      required: true
    },
    value: { type: String, default: '' }
  },
  { _id: false }
);

const summaryInsightSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, default: 'insight' } // insight, warning, trend, correlation
  },
  { _id: false }
);

const savedAnalysisSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Analysis title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    chartType: {
      type: String,
      enum: ['line', 'bar', 'doughnut', 'pie', 'scatter', 'histogram'],
      required: [true, 'Chart type is required']
    },
    xAxisColumn: {
      type: String,
      required: [true, 'X-axis dimension is required']
    },
    yAxisColumn: {
      type: String,
      default: ''
    },
    aggregation: {
      type: String,
      enum: ['sum', 'average', 'count', 'min', 'max', 'none'],
      default: 'none'
    },
    groupByColumn: {
      type: String,
      default: ''
    },
    filterRules: [filterRuleSchema],
    chartConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    summaryInsights: [summaryInsightSchema]
  },
  {
    timestamps: true
  }
);

savedAnalysisSchema.index({ ownerId: 1, updatedAt: -1 });

export const SavedAnalysis = mongoose.model('SavedAnalysis', savedAnalysisSchema);
