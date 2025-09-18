const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AdminService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.retryQueue = new Map();
    this.maxRetries = 3;
    this.syncIntervalMs = 10000; // 10 seconds
    this.checkInterval = null;
    this.lastKnownCredentials = this.getCurrentCredentials();
  }

  // =================================
  // CORE UTILITY FUNCTIONS
  // =================================

  /**
   * Hash password with bcrypt
   * @param {string} password - Plain text password
   * @param {number} saltRounds - Salt rounds for hashing
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password, saltRounds = 12) {
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain password with hashed password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} Match result
   */
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validate and get environment variables
   * @returns {Object|null} Environment variables or null if not set
   */
  static validateEnvironmentVariables() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!email || !password) {
      console.warn('SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in environment variables');
      return null;
    }
    
    return { email, password };
  }

  /**
   * Generate user name from email
   * @param {string} email - Email address
   * @returns {string} Generated name
   */
  static generateNameFromEmail(email) {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Super Administrator';
  }

  /**
   * Find user by email with optional exclusion
   * @param {string} email - Email to search for
   * @param {string} excludeId - User ID to exclude from search
   * @returns {Promise<Object|null>} User object or null
   */
  static async findUserByEmail(email, excludeId = null) {
    const query = { email };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await User.findOne(query);
  }

  /**
   * Find the current super admin
   * @returns {Promise<Object|null>} Super admin user or null
   */
  static async findSuperAdmin() {
    return await User.findOne({ isSuperAdmin: true });
  }

  /**
   * Find all super admins
   * @returns {Promise<Array>} Array of super admin users
   */
  static async findAllSuperAdmins() {
    return await User.find({ isSuperAdmin: true });
  }

  // =================================
  // USER MANAGEMENT FUNCTIONS
  // =================================

  /**
   * Update user with super admin data
   * @param {string} userId - User ID to update
   * @param {string} email - New email
   * @param {string} password - New password
   * @param {boolean} isNewUser - Whether this is a new user
   * @returns {Promise<Object>} Updated user
   */
  static async updateUserWithSuperAdminData(userId, email, password, isNewUser = false) {
    const hashedPassword = await this.hashPassword(password);
    const updateData = {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      emailVerified: true,
      passwordChangedAt: new Date()
    };

    if (isNewUser) {
      updateData.email = email;
      updateData.name = this.generateNameFromEmail(email);
    }

    return await User.findByIdAndUpdate(userId, updateData, { runValidators: true });
  }

  /**
   * Create new super admin user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} Created user
   */
  static async createSuperAdminUser(email, password) {
    const hashedPassword = await this.hashPassword(password);
    
    return await User.create({
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      name: this.generateNameFromEmail(email),
      emailVerified: true,
      passwordChangedAt: new Date()
    });
  }

  /**
   * Demote user from super admin status
   * @param {string} userId - User ID to demote
   * @param {string} newRole - New role to assign
   * @returns {Promise<Object>} Updated user
   */
  static async demoteFromSuperAdmin(userId, newRole = 'ADMIN') {
    return await User.findByIdAndUpdate(userId, {
      isSuperAdmin: false,
      role: newRole
    });
  }

  /**
   * Convert existing user to super admin
   * @param {Object} existingUser - Existing user object
   * @param {string} newEmail - New email
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Conversion result
   */
  static async handleUserConversion(existingUser, newEmail, newPassword) {
    console.log(`🔄 Converting existing user ${newEmail} to super admin`);
    
    await this.updateUserWithSuperAdminData(existingUser._id, newEmail, newPassword);
    
    console.log(`✅ Converted user ${newEmail} to super admin`);
    return { converted: true, email: newEmail };
  }

  /**
   * Create new super admin
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} Creation result
   */
  static async handleSuperAdminCreation(email, password) {
    console.log(`🆕 Creating new super admin: ${email}`);
    
    await this.createSuperAdminUser(email, password);
    
    console.log('✅ New super admin created successfully');
    return { created: true, email };
  }

  /**
   * Update existing super admin
   * @param {Object} superAdmin - Current super admin
   * @param {string} newEmail - New email
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  static async handleSuperAdminUpdate(superAdmin, newEmail, newPassword) {
    let needsUpdate = false;
    const updates = {};

    // Check email change
    if (superAdmin.email !== newEmail) {
      const conflictingUser = await this.findUserByEmail(newEmail, superAdmin._id);
      
      if (conflictingUser) {
        console.log(`⚠️ Email ${newEmail} is already taken. Converting that user to super admin...`);
        
        // Demote current super admin
        await this.demoteFromSuperAdmin(superAdmin._id);
        
        // Convert the conflicting user to super admin
        await this.updateUserWithSuperAdminData(conflictingUser._id, newEmail, newPassword);
        
        console.log(`✅ Converted user ${newEmail} to super admin`);
        return { converted: true, email: newEmail };
      } else {
        updates.email = newEmail;
        needsUpdate = true;
        console.log('Super admin email will be updated');
      }
    }

    // Check password change
    const passwordMatch = await this.comparePassword(newPassword, superAdmin.password);
    if (!passwordMatch) {
      updates.password = await this.hashPassword(newPassword);
      updates.passwordChangedAt = new Date();
      needsUpdate = true;
      console.log('Super admin password will be updated');
    }

    // Apply updates if needed
    if (needsUpdate) {
      await User.findByIdAndUpdate(superAdmin._id, updates, { runValidators: true });
      console.log('✅ Super admin credentials updated successfully');
      return { updated: true, changes: Object.keys(updates) };
    } else {
      console.log('Super admin credentials are up to date');
      return { updated: false };
    }
  }

  // =================================
  // SUPER ADMIN MANAGEMENT
  // =================================

  /**
   * Update super admin credentials with retry logic
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<Object>} Update result
   */
  static async updateSuperAdminCredentials(retryCount = 0) {
    const MAX_RETRIES = 3;
    
    try {
      const envVars = this.validateEnvironmentVariables();
      if (!envVars) {
        return { status: 'skipped', reason: 'Environment variables not set' };
      }

      const { email: newEmail, password: newPassword } = envVars;
      const existingSuperAdmin = await this.findSuperAdmin();
      
      if (existingSuperAdmin) {
        return await this.handleSuperAdminUpdate(existingSuperAdmin, newEmail, newPassword);
      } else {
        // Check if user with env email exists
        const existingUser = await this.findUserByEmail(newEmail);
        
        if (existingUser) {
          return await this.handleUserConversion(existingUser, newEmail, newPassword);
        } else {
          return await this.handleSuperAdminCreation(newEmail, newPassword);
        }
      }
      
    } catch (error) {
      console.error('Error updating super admin credentials:', error);
      
      // Handle duplicate key errors with retry logic
      if (error.code === 11000 && retryCount < MAX_RETRIES) {
        console.log(`🔧 Duplicate key error detected, attempting cleanup (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        try {
          await this.cleanupDuplicateEmails();
          return await this.updateSuperAdminCredentials(retryCount + 1);
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError);
          throw cleanupError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Clean up duplicate email entries
   * @returns {Promise<void>}
   */
  static async cleanupDuplicateEmails() {
    try {
      const envVars = this.validateEnvironmentVariables();
      if (!envVars) return;
      
      const { email: envEmail } = envVars;
      const usersWithEmail = await User.find({ email: envEmail });
      
      if (usersWithEmail.length > 1) {
        console.log(`🧹 Found ${usersWithEmail.length} users with email ${envEmail}, cleaning up...`);
        
        // Keep the super admin, or the first one if none is super admin
        let keepUser = usersWithEmail.find(user => user.isSuperAdmin) || usersWithEmail[0];
        
        // Remove duplicates
        const deletePromises = usersWithEmail
          .filter(user => user._id.toString() !== keepUser._id.toString())
          .map(async (user) => {
            console.log(`🗑️ Removing duplicate user: ${user._id}`);
            return await User.findByIdAndDelete(user._id);
          });
        
        await Promise.all(deletePromises);
        console.log(`✅ Kept user: ${keepUser.email} (${keepUser._id})`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicate emails:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate super admins
   * @returns {Promise<Object|null>} Remaining super admin
   */
  static async cleanupDuplicateSuperAdmins() {
    try {
      const superAdmins = await this.findAllSuperAdmins();
      
      if (superAdmins.length <= 1) {
        return superAdmins[0] || null;
      }

      console.log(`⚠️ Found ${superAdmins.length} super admins, cleaning up...`);
      
      const envVars = this.validateEnvironmentVariables();
      let keepSuperAdmin = null;
      
      // Try to find the one matching environment email
      if (envVars?.email) {
        keepSuperAdmin = superAdmins.find(admin => admin.email === envVars.email);
      }
      
      // If no match, keep the first one
      if (!keepSuperAdmin) {
        keepSuperAdmin = superAdmins[0];
      }
      
      // Demote others
      const demotePromises = superAdmins
        .filter(admin => admin._id.toString() !== keepSuperAdmin._id.toString())
        .map(async (admin) => {
          await this.demoteFromSuperAdmin(admin._id);
          console.log(`🔄 Removed super admin status from ${admin.email}`);
        });
      
      await Promise.all(demotePromises);
      console.log(`✅ Kept super admin: ${keepSuperAdmin.email}`);
      return keepSuperAdmin;
      
    } catch (error) {
      console.error('❌ Error cleaning up duplicate super admins:', error);
      throw error;
    }
  }

  /**
   * Ensure super admin exists on startup
   * @returns {Promise<void>}
   */
  static async ensureSuperAdminExists() {
    try {
      const envVars = this.validateEnvironmentVariables();
      if (!envVars) {
        console.warn('Super admin environment variables not set');
        return;
      }

      const existingSuperAdmin = await this.findSuperAdmin();
      
      if (!existingSuperAdmin) {
        await this.createSuperAdminUser(envVars.email, envVars.password);
        console.log('✅ Super admin created on startup');
      }
    } catch (error) {
      console.error('Error ensuring super admin exists:', error);
    }
  }

  /**
   * Determine system status
   * @param {Object} superAdmin - Super admin object
   * @param {string} envEmail - Environment email
   * @param {boolean} envSet - Whether environment variables are set
   * @returns {string} System status
   */
  static determineSystemStatus(superAdmin, envEmail, envSet) {
    if (!envSet) return 'ENV_VARS_NOT_SET';
    if (!superAdmin) return 'NO_SUPER_ADMIN';
    if (superAdmin.email !== envEmail) return 'EMAIL_MISMATCH';
    return 'SYNCHRONIZED';
  }

  /**
   * Get super admin status
   * @returns {Promise<Object>} Status information
   */
  static async getSuperAdminStatus() {
    try {
      const superAdmin = await User.findOne({ isSuperAdmin: true }).select('email createdAt updatedAt');
      const envVars = this.validateEnvironmentVariables();
      const envSet = !!envVars;
      
      return {
        exists: !!superAdmin,
        email: superAdmin?.email,
        envEmail: envVars?.email,
        emailMatches: superAdmin?.email === envVars?.email,
        lastUpdated: superAdmin?.updatedAt,
        environmentVariablesSet: envSet,
        systemStatus: this.determineSystemStatus(superAdmin, envVars?.email, envSet)
      };
    } catch (error) {
      console.error('Error getting super admin status:', error);
      return { error: error.message };
    }
  }

  /**
   * Get system summary
   * @returns {Promise<Object>} System summary
   */
  static async getSystemSummary() {
    try {
      const allSuperAdmins = await User.find({ isSuperAdmin: true }).select('email createdAt updatedAt lastLogin');
      const envVars = this.validateEnvironmentVariables();
      const envSet = !!envVars;
      
      return {
        environmentEmail: envVars?.email,
        environmentVariablesSet: envSet,
        currentSuperAdmins: allSuperAdmins.map(admin => ({
          email: admin.email,
          id: admin._id,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          lastLogin: admin.lastLogin
        })),
        totalSuperAdmins: allSuperAdmins.length,
        isInSync: allSuperAdmins.length === 1 && allSuperAdmins[0].email === envVars?.email,
        systemStatus: this.determineSystemStatus(allSuperAdmins[0], envVars?.email, envSet),
        needsCleanup: allSuperAdmins.length > 1
      };
    } catch (error) {
      console.error('Error getting system summary:', error);
      throw error;
    }
  }

  /**
   * Get all super admins
   * @returns {Promise<Array>} Array of super admins
   */
  static async getAllSuperAdmins() {
    try {
      return await User.find({ isSuperAdmin: true }).select('email createdAt updatedAt lastLogin role');
    } catch (error) {
      console.error('Error getting all super admins:', error);
      throw error;
    }
  }

  /**
   * Promote existing user to super admin
   * @param {string} email - User email
   * @param {string} password - New password (optional)
   * @returns {Promise<Object>} Promoted user
   */
  static async promoteExistingUserToSuperAdmin(email, password = null) {
    try {
      const existingUser = await this.findUserByEmail(email);
      
      if (!existingUser) {
        throw new Error(`User with email ${email} not found`);
      }

      const currentSuperAdmin = await this.findSuperAdmin();
      
      if (currentSuperAdmin && currentSuperAdmin._id.toString() !== existingUser._id.toString()) {
        await this.demoteFromSuperAdmin(currentSuperAdmin._id, 
          currentSuperAdmin.role === 'SUPER_ADMIN' ? 'ADMIN' : currentSuperAdmin.role);
        console.log(`🔄 Demoted ${currentSuperAdmin.email} from super admin to admin`);
      }

      // Use password from parameter or environment
      const finalPassword = password || process.env.SUPER_ADMIN_PASSWORD;
      if (!finalPassword) {
        throw new Error('No password provided and SUPER_ADMIN_PASSWORD not set');
      }

      await this.updateUserWithSuperAdminData(existingUser._id, email, finalPassword);

      console.log(`✅ Successfully promoted ${email} to super admin`);
      return await User.findById(existingUser._id);

    } catch (error) {
      console.error(`❌ Error promoting user ${email} to super admin:`, error);
      throw error;
    }
  }

  // =================================
  // REAL-TIME SYNC FUNCTIONALITY
  // =================================

  /**
   * Handle sync operation results
   * @param {Object} result - Result from sync operation
   */
  handleSyncResult(result) {
    if (!result) {
      console.log('⏭️ Sync skipped: No super admin environment variables set');
      return;
    }
    
    const handlers = {
      success: () => console.log('✅ Instant sync check completed successfully'),
      skipped: (r) => console.log('⏭️ Sync skipped:', r.reason),
      error: (r) => console.error('❌ Sync error:', r.error),
      converted: (r) => console.log('✅ User successfully converted to super admin:', r.email),
      created: () => console.log('✅ New super admin created successfully'),
      updated: (r) => console.log('✅ Super admin updated:', r.changes?.join(', ') || 'credentials'),
      default: () => console.log('✅ Instant sync check completed')
    };

    const handler = handlers[result.status] || 
                   (result.converted ? handlers.converted : 
                   (result.created ? handlers.created :
                   (result.updated ? handlers.updated : handlers.default)));
    
    handler(result);
  }

  /**
   * Handle sync errors
   * @param {Error} error - Error object
   * @param {string} operation - Operation name
   */
  async handleSyncError(error, operation = 'sync') {
    console.error(`Error during ${operation}:`, error);
    
    // Handle specific duplicate email errors
    if (error.code === 11000 && error.keyPattern?.email) {
      console.log('Duplicate email detected, initiating cleanup...');
      await this.handleDuplicateEmailError(error);
    }
  }

  /**
   * Start real-time sync service
   */
  startRealTimeSync() {
    if (this.isRunning) {
      console.log('Real-time sync service is already running');
      return;
    }

    console.log('Starting real-time sync service with 10-second intervals');
    this.isRunning = true;
    
    // Run immediately on start
    this.performSyncCheck();
    
    // Set up periodic checks
    this.syncInterval = setInterval(() => {
      this.performSyncCheck();
    }, this.syncIntervalMs);
  }

  /**
   * Stop real-time sync service
   */
  stopRealTimeSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Real-time sync service stopped');
  }

  /**
   * Perform sync check
   */
  async performSyncCheck() {
    try {
      console.log('Checking for instant super admin changes...');
      const result = await AdminService.updateSuperAdminCredentials();
      this.handleSyncResult(result);
    } catch (error) {
      await this.handleSyncError(error, 'instant sync check');
    }
  }

  /**
   * Check for instant changes
   */
  async checkForInstantChanges() {
    return this.performSyncCheck();
  }

  /**
   * Handle duplicate email errors
   * @param {Error} error - Error object
   */
  async handleDuplicateEmailError(error) {
    try {
      console.log('Handling duplicate email error...');
      
      // Use cleanup methods
      await AdminService.cleanupDuplicateEmails();
      
      console.log('✅ Duplicate email cleanup completed');
      
      // Retry the sync operation after cleanup
      console.log('🔄 Retrying sync after cleanup...');
      const result = await AdminService.updateSuperAdminCredentials();
      this.handleSyncResult(result);
      
    } catch (cleanupError) {
      console.error('Error during duplicate email cleanup:', cleanupError);
    }
  }

  /**
   * Clean up all duplicates
   */
  async cleanupAllDuplicates() {
    try {
      console.log('Starting cleanup of all duplicate emails...');
      await AdminService.cleanupDuplicateSuperAdmins();
      console.log('Duplicate cleanup completed');
      return { success: true, message: 'All duplicates cleaned up' };
    } catch (error) {
      console.error('Error during duplicate cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync service status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncIntervalMs,
      retryQueueSize: 0,
      lastSync: new Date()
    };
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow() {
    console.log('Forcing immediate sync...');
    await this.performSyncCheck();
    return this.getSyncStatus();
  }

  // =================================
  // CREDENTIAL SYNC FUNCTIONALITY
  // =================================

  /**
   * Get current environment credentials
   * @returns {Object} Current credentials
   */
  getCurrentCredentials() {
    return {
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD
    };
  }

  /**
   * Detect credential changes
   * @returns {Object} Changes detected
   */
  detectCredentialChanges() {
    const current = this.getCurrentCredentials();
    const changes = {
      emailChanged: this.lastKnownCredentials.email !== current.email,
      passwordChanged: this.lastKnownCredentials.password !== current.password,
      anyChanged: false
    };
    
    changes.anyChanged = changes.emailChanged || changes.passwordChanged;
    
    return { changes, current };
  }

  /**
   * Update tracked credentials
   * @param {Object} credentials - New credentials to track
   */
  updateTrackedCredentials(credentials) {
    this.lastKnownCredentials = { ...credentials };
  }

  /**
   * Handle credential sync result
   * @param {Object} result - Sync result
   * @param {Object} changes - Changes detected
   */
  handleCredentialSyncResult(result, changes) {
    if (result) {
      const changeTypes = [];
      if (changes.emailChanged) changeTypes.push('email');
      if (changes.passwordChanged) changeTypes.push('password');
      
      console.log(`✅ Super admin credentials updated: ${changeTypes.join(', ')}`);
    }
  }

  /**
   * Start periodic credential check
   * @param {number} intervalMinutes - Check interval in minutes
   */
  async startPeriodicCredentialCheck(intervalMinutes = 5) {
    console.log(`Starting super admin credential sync every ${intervalMinutes} minutes`);
    
    // Initial check
    await this.performCredentialCheck();
    
    // Set up periodic check
    this.checkInterval = setInterval(async () => {
      await this.performCredentialCheck();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Perform credential check
   */
  async performCredentialCheck() {
    try {
      const { changes, current } = this.detectCredentialChanges();
      
      if (changes.anyChanged) {
        console.log('Environment variables changed, updating super admin...');
        const result = await AdminService.updateSuperAdminCredentials();
        
        // Update our tracking variables
        this.updateTrackedCredentials(current);
        this.handleCredentialSyncResult(result, changes);
        
        return result;
      }
      
    } catch (error) {
      console.error('Error in credential sync check:', error);
      throw error;
    }
  }

  /**
   * Check and update credentials
   */
  async checkAndUpdateCredentials() {
    return this.performCredentialCheck();
  }
  
  /**
   * Stop periodic credential check
   */
  stopPeriodicCredentialCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped super admin credential sync');
    }
  }

  /**
   * Get credential sync status
   */
  getCredentialStatus() {
    const current = this.getCurrentCredentials();
    const { changes } = this.detectCredentialChanges();
    
    return {
      isRunning: !!this.checkInterval,
      currentCredentials: {
        email: current.email,
        passwordSet: !!current.password
      },
      lastKnownCredentials: {
        email: this.lastKnownCredentials.email,
        passwordSet: !!this.lastKnownCredentials.password
      },
      pendingChanges: changes.anyChanged,
      changeDetails: changes
    };
  }

  /**
   * Force immediate credential check
   */
  async forceCredentialCheck() {
    console.log('Forcing immediate credential check...');
    const result = await this.performCredentialCheck();
    return {
      result,
      status: this.getCredentialStatus()
    };
  }

  // =================================
  // COMPREHENSIVE SERVICE METHODS
  // =================================

  /**
   * Initialize all admin services
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Admin Service...');
      
      // Ensure super admin exists
      await AdminService.ensureSuperAdminExists();
      
      // Start real-time sync
      this.startRealTimeSync();
      
      // Start credential sync
      await this.startPeriodicCredentialCheck();
      
      console.log('✅ Admin Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Admin Service:', error);
      throw error;
    }
  }

  /**
   * Shutdown all admin services
   */
  shutdown() {
    console.log('🛑 Shutting down Admin Service...');
    
    this.stopRealTimeSync();
    this.stopPeriodicCredentialCheck();
    
    console.log('✅ Admin Service shutdown complete');
  }

  /**
   * Get comprehensive status
   */
  async getComprehensiveStatus() {
    try {
      const [superAdminStatus, systemSummary, syncStatus, credentialStatus] = await Promise.all([
        AdminService.getSuperAdminStatus(),
        AdminService.getSystemSummary(),
        this.getSyncStatus(),
        this.getCredentialStatus()
      ]);

      return {
        superAdmin: superAdminStatus,
        system: systemSummary,
        realTimeSync: syncStatus,
        credentialSync: credentialStatus,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting comprehensive status:', error);
      return { error: error.message };
    }
  }

  /**
   * Perform full system maintenance
   */
  async performMaintenance() {
    try {
      console.log('🔧 Starting system maintenance...');
      
      const results = {
        duplicateCleanup: await this.cleanupAllDuplicates(),
        credentialSync: await this.forceCredentialCheck(),
        realTimeSync: await this.forceSyncNow(),
        timestamp: new Date()
      };
      
      console.log('✅ System maintenance completed');
      return results;
    } catch (error) {
      console.error('❌ Error during system maintenance:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const adminService = new AdminService();

// Export both the class and the instance
module.exports = AdminService;
module.exports.instance = adminService;
