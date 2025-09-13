const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Import models
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Import middleware
const { verifyAdmin, protectSuperAdmin } = require('../middleware/adminProtection');

// Middleware to verify admin token
const verifyAdminLegacy = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users with pagination
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -refreshToken -totpSecret')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role with super admin protection
router.put('/users/:userId/role', verifyAdmin, protectSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent non-super-admins from creating admins
    if (role === 'ADMIN' && !req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admin can create admin users' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password -refreshToken -totpSecret');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban/unban user with super admin protection
router.post('/users/:userId/ban', verifyAdmin, protectSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isSuperAdmin) {
      return res.status(403).json({ error: 'Super admin cannot be banned' });
    }

    // Toggle ban status
    const banned = !user.banned;
    const updateData = { banned };
    if (banned) {
      updateData.bannedAt = new Date();
      updateData.bannedBy = req.user.id;
    }

    await User.findByIdAndUpdate(req.params.userId, updateData);

    res.json({ 
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      banned 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user with super admin protection
router.delete('/users/:userId', verifyAdmin, protectSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isSuperAdmin) {
      return res.status(403).json({ error: 'Super admin cannot be deleted' });
    }

    // Delete user's conversations and messages
    await Conversation.deleteMany({ user: req.params.userId });
    await Message.deleteMany({ user: req.params.userId });
    await User.findByIdAndDelete(req.params.userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.message === 'Super admin cannot be deleted') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Change super admin endpoint (only accessible by current super admin)
router.post('/change-super-admin', verifyAdmin, async (req, res) => {
  try {
    // Verify the requester is the current super admin
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Only the current super admin can change super admin credentials' 
      });
    }

    const { newEmail, newPassword, currentPassword } = req.body;

    if (!newEmail || !newPassword || !currentPassword) {
      return res.status(400).json({ 
        error: 'New email, new password, and current password are required' 
      });
    }

    // Verify current password
    const currentSuperAdmin = await User.findById(req.user.id);
    const isValidPassword = await bcrypt.compare(currentPassword, currentSuperAdmin.password);
    
    if (!isValidPassword) {
      return res.status(400).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Check if new email is already taken by another user
    const existingUser = await User.findOne({ 
      email: newEmail, 
      _id: { $ne: currentSuperAdmin._id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email is already in use by another user' 
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update super admin credentials
    await User.findByIdAndUpdate(currentSuperAdmin._id, {
      email: newEmail,
      password: hashedNewPassword,
      passwordChangedAt: new Date()
    });

    // Log the change
    console.log(`Super admin credentials changed from ${currentSuperAdmin.email} to ${newEmail} at ${new Date()}`);

    res.json({
      message: 'Super admin credentials updated successfully',
      newEmail: newEmail,
      warning: 'Please update your environment variables (SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD) to match these new credentials'
    });

  } catch (error) {
    console.error('Error changing super admin:', error);
    res.status(500).json({ error: 'Failed to change super admin credentials' });
  }
});

// Get comprehensive statistics
router.get('/statistics', verifyAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalMessages = await db.collection('messages').countDocuments();
    const totalConversations = await db.collection('conversations').countDocuments();
    
    // User statistics
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: sevenDaysAgo } });
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const adminUsers = await User.countDocuments({ role: 'ADMIN' });
    const superAdminUsers = await User.countDocuments({ role: 'SUPER_ADMIN' });
    const bannedUsers = await User.countDocuments({ banned: true });
    const twoFactorUsers = await User.countDocuments({ twoFactorEnabled: true });
    const recentLogins = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });

    // Growth calculations
    const usersLastMonth = await User.countDocuments({ createdAt: { $lt: lastMonth } });
    const messagesLastMonth = await db.collection('messages').countDocuments({ 
      createdAt: { $lt: lastMonth } 
    });
    const conversationsLastMonth = await db.collection('conversations').countDocuments({ 
      createdAt: { $lt: lastMonth } 
    });

    const userGrowth = usersLastMonth > 0 ? ((totalUsers - usersLastMonth) / usersLastMonth * 100).toFixed(1) : 0;
    const messageGrowth = messagesLastMonth > 0 ? ((totalMessages - messagesLastMonth) / messagesLastMonth * 100).toFixed(1) : 0;
    const conversationGrowth = conversationsLastMonth > 0 ? ((totalConversations - conversationsLastMonth) / conversationsLastMonth * 100).toFixed(1) : 0;

    // User growth data for chart (last 30 days)
    const userGrowthData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const count = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      userGrowthData.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Message activity data for chart (last 7 days)
    const messageActivityData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const count = await db.collection('messages').countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      messageActivityData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count
      });
    }

    // Performance metrics
    const avgMessagesPerUser = totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : 0;
    const avgConversationsPerUser = totalUsers > 0 ? (totalConversations / totalUsers).toFixed(1) : 0;

    // Database size (simplified calculation)
    const collections = await db.admin().listCollections().toArray();
    let totalSize = 0;
    for (const collection of collections) {
      try {
        const stats = await db.collection(collection.name).stats();
        totalSize += stats.size || 0;
      } catch (error) {
        // Skip if collection stats not available
      }
    }

    const statistics = {
      overview: {
        totalUsers,
        totalMessages,
        totalConversations,
        activeUsers
      },
      growth: {
        userGrowth: parseFloat(userGrowth),
        messageGrowth: parseFloat(messageGrowth),
        conversationGrowth: parseFloat(conversationGrowth),
        activeGrowth: 0 // Calculate weekly active growth if needed
      },
      users: {
        registered: totalUsers,
        verified: verifiedUsers,
        admin: adminUsers,
        superAdmin: superAdminUsers,
        banned: bannedUsers,
        twoFactor: twoFactorUsers,
        recentLogins
      },
      performance: {
        avgMessagesPerUser: parseFloat(avgMessagesPerUser),
        avgConversationsPerUser: parseFloat(avgConversationsPerUser),
        peakHour: '14:00', // This would need actual analysis
        databaseSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        storageUsed: `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`,
        uptime: process.uptime()
      },
      charts: {
        userGrowth: userGrowthData,
        messageActivity: messageActivityData
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Export statistics report
router.get('/statistics/export', async (req, res) => {
  try {
    const stats = await router.routes.find(route => route.path === '/statistics').stack[0].handle(req, res);
    
    // Create CSV format
    const csvData = [
      'Metric,Value',
      `Total Users,${stats.overview.totalUsers}`,
      `Total Messages,${stats.overview.totalMessages}`,
      `Total Conversations,${stats.overview.totalConversations}`,
      `Active Users,${stats.overview.activeUsers}`,
      `Verified Users,${stats.users.verified}`,
      `Admin Users,${stats.users.admin}`,
      `Banned Users,${stats.users.banned}`,
      `2FA Enabled Users,${stats.users.twoFactor}`,
      `Average Messages per User,${stats.performance.avgMessagesPerUser}`,
      `Average Conversations per User,${stats.performance.avgConversationsPerUser}`,
      `Database Size,${stats.performance.databaseSize}`,
      `Storage Used,${stats.performance.storageUsed}`,
      `Report Generated,${new Date().toISOString()}`
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=statistics_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting statistics:', error);
    res.status(500).json({ error: 'Failed to export statistics' });
  }
});

// Create new user
router.post('/users/create', async (req, res) => {
  try {
    const { name, email, password, role, emailVerified } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'USER',
      emailVerified: emailVerified !== undefined ? emailVerified : true,
      provider: 'local'
    });

    await newUser.save();

    // Log the admin activity
    if (req.logActivity) {
      await req.logActivity(
        'user_created',
        `Created new user: ${email}`,
        req.user._id,
        req.user.email,
        newUser._id,
        email,
        { role: newUser.role, emailVerified: newUser.emailVerified },
        req
      );
    }

    res.json({ 
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get system stats (existing endpoint)
router.get('/stats', async (req, res) => {

  try {
    const totalUsers = await User.countDocuments();
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      updatedAt: { $gte: thirtyDaysAgo }
    });

    // Banned users count
    const bannedUsers = await User.countDocuments({ banned: true });
    
    // Admin users count
    const adminUsers = await User.countDocuments({ role: 'ADMIN' });

    // User growth statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: thisWeek }
    });
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thisMonth }
    });

    // Security metrics
    const unverifiedUsers = await User.countDocuments({ emailVerified: false });
    const usersWithTwoFactor = await User.countDocuments({ twoFactorEnabled: true });

    res.json({
      overview: {
        totalUsers,
        totalConversations,
        totalMessages,
        activeUsers,
        bannedUsers,
        adminUsers
      },
      userGrowth: {
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth
      },
      security: {
        unverifiedUsers,
        usersWithTwoFactor,
        verificationRate: totalUsers > 0 ? ((totalUsers - unverifiedUsers) / totalUsers * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk user operations
router.post('/users/bulk', verifyAdmin, async (req, res) => {
  try {
    const { action, userIds, data } = req.body;
    
    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    let result;
    switch (action) {
      case 'ban':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { banned: true, bannedAt: new Date(), bannedBy: req.user._id }
        );
        break;
      case 'unban':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { banned: false, $unset: { bannedAt: 1, bannedBy: 1 } }
        );
        break;
      case 'verify':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { emailVerified: true }
        );
        break;
      case 'role':
        if (!data?.role || !['USER', 'ADMIN'].includes(data.role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { role: data.role }
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ 
      message: `Bulk ${action} completed successfully`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User activity logs
router.get('/users/:userId/activity', verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Get recent conversations
    const conversations = await Conversation.find({ user: userId })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email');

    // Get recent messages count
    const recentMessages = await Message.countDocuments({
      user: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      conversations,
      metrics: {
        totalConversations: await Conversation.countDocuments({ user: userId }),
        totalMessages: await Message.countDocuments({ user: userId }),
        recentMessages
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User export functionality
router.get('/users/export', verifyAdmin, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const users = await User.find({})
      .select('-password -refreshToken -totpSecret')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      const csv = [
        'ID,Name,Email,Username,Role,Email Verified,Banned,Created At,Updated At',
        ...users.map(user => 
          `${user._id},${user.name || ''},${user.email},${user.username || ''},${user.role},${user.emailVerified},${user.banned || false},${user.createdAt},${user.updatedAt}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv);
    } else {
      res.json(users);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security audit log
router.get('/security/audit', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Get recently banned users
    const recentBans = await User.find({ banned: true })
      .sort({ bannedAt: -1 })
      .limit(10)
      .select('name email bannedAt bannedBy');

    // Get recent admin role changes
    const recentAdmins = await User.find({ role: 'ADMIN' })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('name email role createdAt updatedAt');

    // Get unverified users
    const unverifiedUsers = await User.find({ emailVerified: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name email createdAt');

    res.json({
      recentBans,
      recentAdmins,
      unverifiedUsers,
      summary: {
        totalBanned: await User.countDocuments({ banned: true }),
        totalAdmins: await User.countDocuments({ role: 'ADMIN' }),
        totalUnverified: await User.countDocuments({ emailVerified: false })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database operations
router.get('/database/info', verifyAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    
    res.json({
      database: stats,
      collections: collections.map(col => col.name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
