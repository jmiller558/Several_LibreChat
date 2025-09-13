const SuperAdminService = require('./superAdminService');

class RealTimeSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.retryQueue = new Map(); // Store failed operations for retry
    this.maxRetries = 3;
    this.syncIntervalMs = 10000; // 10 seconds for instant sync
  }

  start() {
    if (this.isRunning) {
      console.log('Real-time sync service is already running');
      return;
    }

    console.log('Starting real-time sync service with 10-second intervals');
    this.isRunning = true;
    
    // Run immediately on start
    this.checkForInstantChanges();
    
    // Set up periodic checks
    this.syncInterval = setInterval(() => {
      this.checkForInstantChanges();
    }, this.syncIntervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Real-time sync service stopped');
  }

  async checkForInstantChanges() {
    try {
      console.log('Checking for instant super admin changes...');
      
      // Simply call the existing super admin credential update method
      // This will handle all the logic for promoting users, creating new ones, etc.
      const result = await SuperAdminService.updateSuperAdminCredentials();
      
      // Handle different response formats
      if (!result) {
        console.log('⏭️ Sync skipped: No super admin environment variables set');
        return;
      }
      
      if (result.status === 'success') {
        console.log('✅ Instant sync check completed successfully');
      } else if (result.status === 'skipped') {
        console.log('⏭️ Sync skipped:', result.reason);
      } else if (result.status === 'error') {
        console.error('❌ Sync error:', result.error);
      } else if (result.converted) {
        console.log('✅ User successfully converted to super admin:', result.email);
      } else if (result.created) {
        console.log('✅ New super admin created successfully');
      } else {
        console.log('✅ Instant sync check completed');
      }

    } catch (error) {
      console.error('Error during instant sync check:', error);
      
      // Handle specific duplicate email errors
      if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
        console.log('Duplicate email detected, initiating cleanup...');
        await this.handleDuplicateEmailError(error);
      }
    }
  }

  async getPendingChanges() {
    // Simplified: just return empty array since we're handling everything in checkForInstantChanges
    return [];
  }

  async handleDuplicateEmailError(error, change = null) {
    try {
      console.log('Handling duplicate email error...');
      
      // Use SuperAdminService cleanup methods
      await SuperAdminService.cleanupDuplicateEmails();
      
      console.log('✅ Duplicate email cleanup completed');
      
      // Retry the sync operation after cleanup
      console.log('🔄 Retrying sync after cleanup...');
      await SuperAdminService.updateSuperAdminCredentials();
      
    } catch (cleanupError) {
      console.error('Error during duplicate email cleanup:', cleanupError);
    }
  }

  // Clean up all duplicate emails
  async cleanupAllDuplicates() {
    try {
      console.log('Starting cleanup of all duplicate emails...');
      await SuperAdminService.cleanupDuplicateSuperAdmins();
      console.log('Duplicate cleanup completed');
      return { success: true, message: 'All duplicates cleaned up' };
    } catch (error) {
      console.error('Error during duplicate cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  // Health check method
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncIntervalMs,
      retryQueueSize: 0, // Simplified - no retry queue needed
      lastSync: new Date()
    };
  }

  // Force immediate sync
  async forceSyncNow() {
    console.log('Forcing immediate sync...');
    await this.checkForInstantChanges();
    return this.getStatus();
  }
}

// Create singleton instance
const realTimeSyncService = new RealTimeSyncService();

module.exports = realTimeSyncService;
