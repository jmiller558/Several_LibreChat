const mongoose = require('mongoose');

// Use the same User schema as LibreChat main app
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: function() {
            return this.provider === 'local';
        }
    },
    avatar: {
        type: String,
        default: null
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'github', 'discord', 'openid'],
        default: 'local'
    },
    providerId: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER',
        index: true
    },
    banned: {
        type: Boolean,
        default: false,
        index: true
    },
    bannedAt: {
        type: Date,
        default: null
    },
    bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    backupCodes: [{
        type: String
    }],
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokenExpiry: {
        type: Date,
        default: null
    },
    passwordChangedAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    verificationToken: {
        type: String,
        default: null
    },
    verificationTokenExpires: {
        type: Date,
        default: null
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        marketingEmails: {
            type: Boolean,
            default: false
        },
        securityAlerts: {
            type: Boolean,
            default: true
        }
    },
    plugins: [{
        type: String
    }],
    termsAccepted: {
        type: Boolean,
        default: false
    },
    personalization: {
        memories: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ banned: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Static method to find admin users
userSchema.statics.findAdmins = function() {
    return this.find({ role: 'ADMIN' }).sort({ createdAt: -1 });
};

// Static method to find banned users
userSchema.statics.findBanned = function() {
    return this.find({ banned: true }).sort({ bannedAt: -1 });
};

// Static method for user statistics
userSchema.statics.getStats = async function() {
    const total = await this.countDocuments();
    const admins = await this.countDocuments({ role: 'ADMIN' });
    const banned = await this.countDocuments({ banned: true });
    const verified = await this.countDocuments({ emailVerified: true });
    const twoFactor = await this.countDocuments({ twoFactorEnabled: true });
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newToday = await this.countDocuments({ createdAt: { $gte: today } });
    const newThisWeek = await this.countDocuments({ createdAt: { $gte: weekAgo } });
    const newThisMonth = await this.countDocuments({ createdAt: { $gte: monthAgo } });
    
    const activeLastWeek = await this.countDocuments({ lastLogin: { $gte: weekAgo } });
    
    return {
        total,
        admins,
        banned,
        verified,
        twoFactor,
        newToday,
        newThisWeek,
        newThisMonth,
        activeLastWeek,
        verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0
    };
};

module.exports = mongoose.model('User', userSchema);
