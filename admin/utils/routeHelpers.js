/**
 * Shared utility functions for admin routes
 * Consolidates repeated logic for user operations and validation
 */

const User = require('../models/User');

// =================================
// SHARED VALIDATION FUNCTIONS
// =================================

/**
 * Shared user existence validation
 * @param {string} userId - User ID to check
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
async function validateUserExists(userId, options = {}) {
  const { selectFields = '-password -refreshToken -totpSecret' } = options;
  
  const user = await User.findById(userId).select(selectFields);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Shared admin protection validation
 * @param {Object} targetUser - User being operated on
 * @param {Object} currentUser - User performing the operation
 * @param {Object} options - Validation options
 * @returns {void} Throws error if validation fails
 */
function validateAdminProtection(targetUser, currentUser, options = {}) {
  const { operation = 'modify', allowSelfModification = false } = options;
  
  // Prevent operations on super admin by non-super admin
  if (targetUser.isSuperAdmin && !currentUser.isSuperAdmin) {
    throw new Error('Super admin cannot be modified by regular admin');
  }
  
  // Prevent regular admins from modifying other admins (but allow super admins to delete admins)
  if (targetUser.role === 'ADMIN' && !currentUser.isSuperAdmin) {
    if (!allowSelfModification || targetUser._id.toString() !== currentUser._id.toString()) {
      throw new Error('Admin users can only be managed by super admins');
    }
  }
}

/**
 * Shared role validation
 * @param {string} newRole - Role being assigned
 * @param {Object} currentUser - User performing the operation
 * @returns {void} Throws error if validation fails
 */
function validateRoleAssignment(newRole, currentUser) {
  // Only super admin can create other admins
  if (newRole === 'ADMIN' && !currentUser.isSuperAdmin) {
    throw new Error('Only super admin can create admin users');
  }
  
  // Only super admin can create super admins
  if (newRole === 'SUPER_ADMIN' && !currentUser.isSuperAdmin) {
    throw new Error('Only super admin can create super admin users');
  }
}

// =================================
// SHARED USER OPERATIONS
// =================================

/**
 * Shared user update operation with validation
 * @param {string} userId - User ID to update
 * @param {Object} updateData - Data to update
 * @param {Object} currentUser - User performing the operation
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated user
 */
async function performUserUpdate(userId, updateData, currentUser, options = {}) {
  const { validatePermissions = true, selectFields = '-password -refreshToken -totpSecret' } = options;
  
  // Validate user exists
  const existingUser = await validateUserExists(userId);
  
  // Validate permissions if required
  if (validatePermissions) {
    validateAdminProtection(existingUser, currentUser, { operation: 'update' });
    
    // If role is being changed, validate role assignment
    if (updateData.role) {
      validateRoleAssignment(updateData.role, currentUser);
    }
  }
  
  // Perform update
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  ).select(selectFields);
  
  return updatedUser;
}

/**
 * Shared user deletion operation with validation
 * @param {string} userId - User ID to delete
 * @param {Object} currentUser - User performing the operation
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>} Deletion result
 */
async function performUserDeletion(userId, currentUser, options = {}) {
  const { validatePermissions = true } = options;
  
  // Validate user exists
  const existingUser = await validateUserExists(userId);
  
  // Validate permissions if required
  if (validatePermissions) {
    validateAdminProtection(existingUser, currentUser, { operation: 'delete' });
  }
  
  // Perform deletion
  await User.findByIdAndDelete(userId);
  
  return { success: true, deletedUserId: userId };
}

/**
 * Shared user ban/unban operation with validation
 * @param {string} userId - User ID to ban/unban
 * @param {boolean} banned - Ban status
 * @param {Object} currentUser - User performing the operation
 * @param {Object} options - Ban options
 * @returns {Promise<Object>} Updated user
 */
async function performUserBanOperation(userId, banned, currentUser, options = {}) {
  const { validatePermissions = true, reason = null } = options;
  
  // Validate user exists
  const existingUser = await validateUserExists(userId);
  
  // Validate permissions if required
  if (validatePermissions) {
    validateAdminProtection(existingUser, currentUser, { operation: banned ? 'ban' : 'unban' });
  }
  
  // Prepare update data
  const updateData = { 
    banned,
    ...(banned && { bannedAt: new Date() }),
    ...(banned && reason && { banReason: reason }),
    ...(!banned && { bannedAt: null, banReason: null })
  };
  
  // Perform update
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  ).select('-password -refreshToken -totpSecret');
  
  return updatedUser;
}

// =================================
// ERROR HANDLING WRAPPER
// =================================

/**
 * Wrap route handler with error handling
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Route error:', error);
      
      // Handle known error types
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('cannot be') || error.message.includes('Only')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Default error response
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };
}

// =================================
// RESPONSE HELPERS
// =================================

/**
 * Send standardized success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
function sendSuccessResponse(res, data = null, message = 'Success', statusCode = 200) {
  const response = { success: true, message };
  
  if (data !== null) {
    if (Array.isArray(data)) {
      response.data = data;
      response.count = data.length;
    } else {
      response.data = data;
    }
  }
  
  res.status(statusCode).json(response);
}

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 */
function sendErrorResponse(res, message = 'Error', statusCode = 500, details = null) {
  const response = { success: false, error: message };
  
  if (details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

module.exports = {
  // Validation functions
  validateUserExists,
  validateAdminProtection,
  validateRoleAssignment,
  
  // User operations
  performUserUpdate,
  performUserDeletion,
  performUserBanOperation,
  
  // Utility functions
  withErrorHandling,
  sendSuccessResponse,
  sendErrorResponse
};
