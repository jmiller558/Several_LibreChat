const User = require('../models/User');

// Middleware to prevent super admin deletion/modification
const protectSuperAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId) {
      const targetUser = await User.findById(userId);
      
      if (targetUser && targetUser.isSuperAdmin) {
        // For DELETE operations - completely prevent super admin deletion
        if (req.method === 'DELETE') {
          return res.status(403).json({
            error: 'Super admin cannot be deleted'
          });
        }
        
        // For PUT/PATCH operations - only allow super admin to modify themselves
        if (['PUT', 'PATCH'].includes(req.method)) {
          if (req.user.id !== userId && !req.user.isSuperAdmin) {
            return res.status(403).json({
              error: 'Super admin can only be modified by themselves'
            });
          }
          
          // Prevent role/isSuperAdmin field changes
          if (req.body.role || req.body.hasOwnProperty('isSuperAdmin')) {
            delete req.body.role;
            delete req.body.isSuperAdmin;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Super admin protection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Enhanced admin verification middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
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

// Super admin only middleware
const verifySuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isSuperAdmin) {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { 
  protectSuperAdmin, 
  verifyAdmin, 
  verifySuperAdmin 
};
