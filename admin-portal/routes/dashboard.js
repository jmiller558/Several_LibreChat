const express = require('express');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
    try {
        // Get statistics from all models
        const [userStats, conversationStats, messageStats] = await Promise.all([
            User.getStats(),
            Conversation.getStats(),
            Message.getStats()
        ]);

        // System health metrics
        const systemStats = {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform
        };

        res.json({
            success: true,
            data: {
                users: userStats,
                conversations: conversationStats,
                messages: messageStats,
                system: systemStats,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get recent activity
router.get('/recent-activity', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get recent users
        const recentUsers = await User.find()
            .select('name email role createdAt avatar')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Get recent conversations
        const recentConversations = await Conversation.find()
            .populate('user', 'name email')
            .select('title user createdAt model endpoint messageCount')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Get recent messages
        const recentMessages = await Message.find()
            .populate('user', 'name email')
            .select('user role text createdAt model endpoint tokenCount')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                recentUsers,
                recentConversations,
                recentMessages
            }
        });

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get user growth data for charts
router.get('/user-growth', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Fill in missing days with 0
        const growthData = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            
            const existing = userGrowth.find(item => 
                item._id.year === date.getFullYear() &&
                item._id.month === date.getMonth() + 1 &&
                item._id.day === date.getDate()
            );
            
            growthData.push({
                date: date.toISOString().split('T')[0],
                count: existing ? existing.count : 0
            });
        }

        res.json({
            success: true,
            data: growthData
        });

    } catch (error) {
        console.error('User growth error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get message activity data for charts
router.get('/message-activity', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const messageActivity = await Message.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Process data for chart
        const chartData = {};
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateKey = date.toISOString().split('T')[0];
            
            chartData[dateKey] = {
                date: dateKey,
                user: 0,
                assistant: 0,
                system: 0,
                total: 0
            };
        }

        messageActivity.forEach(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            const dateKey = date.toISOString().split('T')[0];
            
            if (chartData[dateKey]) {
                chartData[dateKey][item._id.role] = item.count;
                chartData[dateKey].total += item.count;
            }
        });

        res.json({
            success: true,
            data: Object.values(chartData)
        });

    } catch (error) {
        console.error('Message activity error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get popular models
router.get('/popular-models', auth, async (req, res) => {
    try {
        const popularModels = await Message.aggregate([
            {
                $match: {
                    model: { $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$model',
                    count: { $sum: 1 },
                    totalTokens: { $sum: '$totalTokens' },
                    avgTokens: { $avg: '$totalTokens' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    model: '$_id',
                    count: 1,
                    totalTokens: 1,
                    avgTokens: { $round: ['$avgTokens', 0] },
                    _id: 0
                }
            }
        ]);

        res.json({
            success: true,
            data: popularModels
        });

    } catch (error) {
        console.error('Popular models error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get endpoint usage
router.get('/endpoint-usage', auth, async (req, res) => {
    try {
        const endpointUsage = await Conversation.aggregate([
            {
                $match: {
                    endpoint: { $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$endpoint',
                    conversations: { $sum: 1 },
                    totalMessages: { $sum: '$messageCount' },
                    avgMessages: { $avg: '$messageCount' }
                }
            },
            {
                $sort: { conversations: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    endpoint: '$_id',
                    conversations: 1,
                    totalMessages: 1,
                    avgMessages: { $round: ['$avgMessages', 1] },
                    _id: 0
                }
            }
        ]);

        res.json({
            success: true,
            data: endpointUsage
        });

    } catch (error) {
        console.error('Endpoint usage error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get system health
router.get('/health', auth, async (req, res) => {
    try {
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        // Database connection check
        const dbConnected = require('mongoose').connection.readyState === 1;
        
        // Basic performance metrics
        const health = {
            status: 'healthy',
            uptime: {
                seconds: Math.floor(uptime),
                formatted: formatUptime(uptime)
            },
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
            },
            database: {
                connected: dbConnected,
                status: dbConnected ? 'connected' : 'disconnected'
            },
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch
            },
            timestamp: new Date()
        };

        // Determine overall status
        if (!dbConnected) {
            health.status = 'unhealthy';
        } else if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
            health.status = 'warning';
        }

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            data: {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date()
            }
        });
    }
});

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

module.exports = router;
