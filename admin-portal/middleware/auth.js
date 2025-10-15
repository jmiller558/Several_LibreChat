const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token || 
                     req.query.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-portal-secret-key');
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password -refreshToken');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid. User not found.' 
            });
        }

        // Check if user is banned
        if (user.banned) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account is banned.' 
            });
        }

        // Check if user is admin
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required.' 
            });
        }

        // Add user info to request
        req.user = {
            userId: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token has expired.' 
            });
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error.' 
        });
    }
};

module.exports = auth;
