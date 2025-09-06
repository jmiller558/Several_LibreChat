const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all users with pagination and filtering
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const search = req.query.search || '';
        const role = req.query.role || '';
        const status = req.query.status || '';
        
        // Build filter query
        let filter = {};
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role && role !== 'all') {
            filter.role = role.toUpperCase();
        }
        
        if (status && status !== 'all') {
            if (status === 'banned') {
                filter.banned = true;
            } else if (status === 'active') {
                filter.banned = false;
            } else if (status === 'verified') {
                filter.emailVerified = true;
            } else if (status === 'unverified') {
                filter.emailVerified = false;
            }
        }
        
        // Get users with pagination
        const users = await User.find(filter)
            .select('-password -refreshToken -twoFactorSecret -backupCodes')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Get total count for pagination
        const total = await User.countDocuments(filter);
        
        // Add conversation and message counts for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const conversationCount = await Conversation.countDocuments({ user: user._id });
            const messageCount = await Message.countDocuments({ user: user._id });
            
            return {
                ...user,
                conversationCount,
                messageCount
            };
        }));
        
        res.json({
            success: true,
            data: {
                users: usersWithStats,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -refreshToken -twoFactorSecret -backupCodes')
            .lean();
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Get user statistics
        const conversationStats = await Conversation.getUserStats(user._id);
        const messageStats = await Message.getUserStats(user._id);
        
        res.json({
            success: true,
            data: {
                user,
                stats: {
                    ...conversationStats,
                    ...messageStats
                }
            }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Create new user
router.post('/', auth, async (req, res) => {
    try {
        const { name, email, password, role = 'USER' } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and password are required' 
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters long' 
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role.toUpperCase(),
            emailVerified: true, // Admin created users are pre-verified
            provider: 'local'
        });
        
        await user.save();
        
        // Return user without sensitive data
        const userData = user.toObject();
        delete userData.password;
        delete userData.refreshToken;
        delete userData.twoFactorSecret;
        delete userData.backupCodes;
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { user: userData }
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Update user
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, email, role, emailVerified } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Prevent admin from demoting themselves
        if (user._id.toString() === req.user.userId && role && role !== 'ADMIN') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot change your own admin role' 
            });
        }
        
        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(), 
                _id: { $ne: user._id } 
            });
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email is already taken by another user' 
                });
            }
        }
        
        // Update fields
        if (name) user.name = name.trim();
        if (email) user.email = email.toLowerCase().trim();
        if (role) user.role = role.toUpperCase();
        if (typeof emailVerified === 'boolean') user.emailVerified = emailVerified;
        
        await user.save();
        
        // Return updated user without sensitive data
        const userData = user.toObject();
        delete userData.password;
        delete userData.refreshToken;
        delete userData.twoFactorSecret;
        delete userData.backupCodes;
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: { user: userData }
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Make user admin
router.post('/:id/make-admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (user.role === 'ADMIN') {
            return res.status(400).json({ 
                success: false, 
                message: 'User is already an admin' 
            });
        }
        
        user.role = 'ADMIN';
        await user.save();
        
        res.json({
            success: true,
            message: `${user.name} has been made an admin`,
            data: { 
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
        
    } catch (error) {
        console.error('Make admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Remove admin privileges
router.post('/:id/remove-admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Prevent admin from removing their own admin privileges
        if (user._id.toString() === req.user.userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot remove your own admin privileges' 
            });
        }
        
        if (user.role !== 'ADMIN') {
            return res.status(400).json({ 
                success: false, 
                message: 'User is not an admin' 
            });
        }
        
        user.role = 'USER';
        await user.save();
        
        res.json({
            success: true,
            message: `Admin privileges removed from ${user.name}`,
            data: { 
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
        
    } catch (error) {
        console.error('Remove admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Ban user
router.post('/:id/ban', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Prevent admin from banning themselves
        if (user._id.toString() === req.user.userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot ban yourself' 
            });
        }
        
        if (user.banned) {
            return res.status(400).json({ 
                success: false, 
                message: 'User is already banned' 
            });
        }
        
        user.banned = true;
        user.bannedAt = new Date();
        user.bannedBy = req.user.userId;
        user.refreshToken = null; // Invalidate refresh token
        user.refreshTokenExpiry = null;
        
        await user.save();
        
        res.json({
            success: true,
            message: `${user.name} has been banned`,
            data: { 
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    banned: user.banned,
                    bannedAt: user.bannedAt
                }
            }
        });
        
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Unban user
router.post('/:id/unban', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (!user.banned) {
            return res.status(400).json({ 
                success: false, 
                message: 'User is not banned' 
            });
        }
        
        user.banned = false;
        user.bannedAt = null;
        user.bannedBy = null;
        user.loginAttempts = 0; // Reset login attempts
        user.lockUntil = null;   // Remove any locks
        
        await user.save();
        
        res.json({
            success: true,
            message: `${user.name} has been unbanned`,
            data: { 
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    banned: user.banned
                }
            }
        });
        
    } catch (error) {
        console.error('Unban user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Delete user
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user.userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete yourself' 
            });
        }
        
        const userName = user.name;
        const userEmail = user.email;
        
        // Delete user's conversations and messages
        await Promise.all([
            Conversation.deleteMany({ user: user._id }),
            Message.deleteMany({ user: user._id }),
            User.findByIdAndDelete(user._id)
        ]);
        
        res.json({
            success: true,
            message: `User ${userName} (${userEmail}) and all associated data have been deleted`
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Reset user password
router.post('/:id/reset-password', auth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 8 characters long' 
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        user.password = hashedPassword;
        user.passwordChangedAt = new Date();
        user.refreshToken = null; // Invalidate refresh token
        user.refreshTokenExpiry = null;
        user.loginAttempts = 0; // Reset login attempts
        user.lockUntil = null;   // Remove any locks
        
        await user.save();
        
        res.json({
            success: true,
            message: `Password reset for ${user.name}`
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
