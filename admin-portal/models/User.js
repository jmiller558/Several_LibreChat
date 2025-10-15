const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    required: false,
  },
  provider: {
    type: String,
    required: true,
    default: 'local',
  },
  role: {
    type: String,
    default: 'USER',
  },
  banned: {
    type: Boolean,
    default: false,
  },
  bannedAt: {
    type: Date,
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  bannedReason: {
    type: String,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  lastLoginIP: {
    type: String,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
  },
  backupCodes: [{
    type: String,
  }],
  passwordChangedAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  refreshToken: [{
    type: String,
  }],
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    marketingEmails: {
      type: Boolean,
      default: false,
    },
    securityAlerts: {
      type: Boolean,
      default: true,
    },
  },
  metadata: {
    registrationIP: String,
    userAgent: String,
    source: String,
  },
}, { timestamps: true });

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Index for security queries
userSchema.index({ banned: 1, role: 1 });
userSchema.index({ emailVerified: 1 });
userSchema.index({ lastLogin: 1 });

module.exports = mongoose.model('User', userSchema);
