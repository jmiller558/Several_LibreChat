const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    parentMessageId: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system', 'tool'],
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
    },
    model: {
        type: String,
        default: null
    },
    endpoint: {
        type: String,
        default: null,
        index: true
    },
    endpointType: {
        type: String,
        default: null
    },
    finish_reason: {
        type: String,
        default: null
    },
    tokenCount: {
        type: Number,
        default: 0
    },
    promptTokens: {
        type: Number,
        default: 0
    },
    completionTokens: {
        type: Number,
        default: 0
    },
    totalTokens: {
        type: Number,
        default: 0
    },
    isCreatedByUser: {
        type: Boolean,
        default: true
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    children: [{
        type: String
    }],
    error: {
        type: Boolean,
        default: false
    },
    unfinished: {
        type: Boolean,
        default: false
    },
    cancelled: {
        type: Boolean,
        default: false
    },
    responseTime: {
        type: Number,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    files: [{
        file_id: String,
        filename: String,
        type: String,
        size: Number,
        preview: String
    }],
    tools: [{
        type: mongoose.Schema.Types.Mixed
    }],
    toolCalls: [{
        type: mongoose.Schema.Types.Mixed
    }],
    plugin: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true,
    collection: 'messages'
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ role: 1 });
messageSchema.index({ endpoint: 1 });
messageSchema.index({ model: 1 });
messageSchema.index({ parentMessageId: 1 });

// Static method for message statistics
messageSchema.statics.getStats = async function() {
    const total = await this.countDocuments();
    const userMessages = await this.countDocuments({ role: 'user' });
    const assistantMessages = await this.countDocuments({ role: 'assistant' });
    const systemMessages = await this.countDocuments({ role: 'system' });
    const errorMessages = await this.countDocuments({ error: true });
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newToday = await this.countDocuments({ createdAt: { $gte: today } });
    const newThisWeek = await this.countDocuments({ createdAt: { $gte: weekAgo } });
    const newThisMonth = await this.countDocuments({ createdAt: { $gte: monthAgo } });
    
    // Token statistics
    const tokenStats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalTokens: { $sum: '$totalTokens' },
                avgTokens: { $avg: '$totalTokens' },
                maxTokens: { $max: '$totalTokens' }
            }
        }
    ]);
    
    // Messages by model
    const byModel = await this.aggregate([
        { $match: { model: { $ne: null } } },
        { $group: { _id: '$model', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    
    // Messages by endpoint
    const byEndpoint = await this.aggregate([
        { $match: { endpoint: { $ne: null } } },
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    
    return {
        total,
        userMessages,
        assistantMessages,
        systemMessages,
        errorMessages,
        newToday,
        newThisWeek,
        newThisMonth,
        errorRate: total > 0 ? Math.round((errorMessages / total) * 100) : 0,
        tokens: tokenStats.length > 0 ? {
            total: tokenStats[0].totalTokens || 0,
            average: Math.round(tokenStats[0].avgTokens) || 0,
            max: tokenStats[0].maxTokens || 0
        } : { total: 0, average: 0, max: 0 },
        byModel: byModel.slice(0, 10),
        byEndpoint: byEndpoint.slice(0, 10)
    };
};

// Static method to get user message stats
messageSchema.statics.getUserStats = async function(userId) {
    const total = await this.countDocuments({ user: userId });
    const userMessages = await this.countDocuments({ user: userId, role: 'user' });
    const assistantMessages = await this.countDocuments({ user: userId, role: 'assistant' });
    const errorMessages = await this.countDocuments({ user: userId, error: true });
    
    const tokenStats = await this.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalTokens: { $sum: '$totalTokens' },
                avgTokens: { $avg: '$totalTokens' }
            }
        }
    ]);
    
    return {
        total,
        userMessages,
        assistantMessages,
        errorMessages,
        errorRate: total > 0 ? Math.round((errorMessages / total) * 100) : 0,
        tokens: tokenStats.length > 0 ? {
            total: tokenStats[0].totalTokens || 0,
            average: Math.round(tokenStats[0].avgTokens) || 0
        } : { total: 0, average: 0 }
    };
};

module.exports = mongoose.model('Message', messageSchema);
