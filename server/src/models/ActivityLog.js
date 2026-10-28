import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTER',
        'USER_LOGIN',
        'USER_LOGOUT',
        'DATASET_UPLOAD',
        'DATASET_SAMPLE_LOAD',
        'DATASET_CLEAN',
        'DATASET_UPDATE',
        'DATASET_DELETE',
        'ANALYSIS_CREATE',
        'ANALYSIS_UPDATE',
        'ANALYSIS_DELETE',
        'ANALYSIS_DUPLICATE',
        'REPORT_EXPORT'
      ]
    },
    targetType: {
      type: String,
      required: true,
      enum: ['user', 'dataset', 'analysis', 'report']
    },
    targetId: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: '90d' } // 90 days TTL
    }
  },
  {
    timestamps: false
  }
);

activityLogSchema.index({ ownerId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
