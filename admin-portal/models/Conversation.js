const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Conversation',
        maxlength: 255
    },
    model: {
        type: String,
        required: false,
        default: null
    },
    chatGptLabel: {
        type: String,
        default: null
    },
    promptPrefix: {
        type: String,
        default: null
    },
    temperature: {
        type: Number,
        default: 1
    },
    topP: {
        type: Number,
        default: 1
    },
    topK: {
        type: Number,
        default: 0
    },
    context: {
        type: String,
        default: null
    },
    top_p: {
        type: Number,
        default: 1
    },
    frequency_penalty: {
        type: Number,
        default: 0
    },
    presence_penalty: {
        type: Number,
        default: 0
    },
    maxOutputTokens: {
        type: Number,
        default: null
    },
    systemMessage: {
        type: String,
        default: null
    },
    modelLabel: {
        type: String,
        default: null
    },
    examples: [{
        input: { type: mongoose.Schema.Types.Mixed },
        output: { type: mongoose.Schema.Types.Mixed }
    }],
    agentOptions: {
        agent: { type: String, default: null },
        skipCompletion: { type: Boolean, default: false },
        model: { type: String, default: null },
        temperature: { type: Number, default: null }
    },
    endpoint: {
        type: String,
        required: false,
        default: null
    },
    endpointType: {
        type: String,
        default: null
    },
    archived: {
        type: Boolean,
        default: false,
        index: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    messageCount: {
        type: Number,
        default: 0
    },
    tokenCount: {
        type: Number,
        default: 0
    },
    lastMessage: {
        type: Date,
        default: null,
        index: true
    },
    isShared: {
        type: Boolean,
        default: false
    },
    shareId: {
        type: String,
        default: null,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'conversations'
});

// Indexes for performance
conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ user: 1, archived: 1, updatedAt: -1 });
conversationSchema.index({ conversationId: 1 });
conversationSchema.index({ lastMessage: -1 });
conversationSchema.index({ endpoint: 1 });

// Static method for conversation statistics
conversationSchema.statics.getStats = async function() {
    const total = await this.countDocuments();
    const archived = await this.countDocuments({ archived: true });
    const shared = await this.countDocuments({ isShared: true });
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newToday = await this.countDocuments({ createdAt: { $gte: today } });
    const newThisWeek = await this.countDocuments({ createdAt: { $gte: weekAgo } });
    const newThisMonth = await this.countDocuments({ createdAt: { $gte: monthAgo } });
    
    const activeThisWeek = await this.countDocuments({ lastMessage: { $gte: weekAgo } });
    
    // Get average messages per conversation
    const avgMessages = await this.aggregate([
        { $group: { _id: null, avgMessages: { $avg: '$messageCount' } } }
    ]);
    
    // Get conversations by endpoint
    const byEndpoint = await this.aggregate([
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    
    return {
        total,
        archived,
        shared,
        newToday,
        newThisWeek,
        newThisMonth,
        activeThisWeek,
        averageMessages: avgMessages.length > 0 ? Math.round(avgMessages[0].avgMessages) : 0,
        byEndpoint: byEndpoint.slice(0, 10) // Top 10 endpoints
    };
};

// Static method to get user conversation stats
conversationSchema.statics.getUserStats = async function(userId) {
    const total = await this.countDocuments({ user: userId });
    const archived = await this.countDocuments({ user: userId, archived: true });
    const shared = await this.countDocuments({ user: userId, isShared: true });
    
    const totalMessages = await this.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]);
    
    return {
        conversations: total,
        archived,
        shared,
        totalMessages: totalMessages.length > 0 ? totalMessages[0].total : 0
    };
};

module.exports = mongoose.model('Conversation', conversationSchema);
