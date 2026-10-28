import mongoose from 'mongoose';

const datasetRowSchema = new mongoose.Schema(
  {
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rowIndex: {
      type: Number,
      required: true,
      min: 0
    },
    rowData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: false
  }
);

datasetRowSchema.index({ datasetId: 1, rowIndex: 1 });
datasetRowSchema.index({ datasetId: 1, ownerId: 1 });

export const DatasetRow = mongoose.model('DatasetRow', datasetRowSchema);
