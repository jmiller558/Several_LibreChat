const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['user_banned', 'user_unbanned', 'role_changed', 'user_deleted', 'login_attempt', 'bulk_action', 'data_export']
  },
  description: {
    type: String,
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetUserEmail: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ adminId: 1, timestamp: -1 });
activityLogSchema.index({ type: 1, timestamp: -1 });

// Static method to create log entry
activityLogSchema.statics.createLog = function(data) {
  return this.create(data);
};

// Static method to get recent activities
activityLogSchema.statics.getRecentActivities = function(limit = 50) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('adminId', 'name email')
    .populate('targetUserId', 'name email');
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
