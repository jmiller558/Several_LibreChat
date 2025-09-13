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
      
      // Check for pending super admin updates
      const pendingChanges = await this.getPendingChanges();
      
      if (pendingChanges.length > 0) {
        console.log(`Processing ${pendingChanges.length} pending changes`);
        
        for (const change of pendingChanges) {
          await this.processChange(change);
        }
      }

      // Process retry queue
      await this.processRetryQueue();

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
    // This would typically check a pending changes table or queue
    // For now, we'll simulate checking for super admin credential updates
    try {
      const superAdmins = await SuperAdminService.getAllSuperAdmins();
      
      // Check if any super admins need credential sync
      const pendingChanges = [];
      
      for (const admin of superAdmins) {
        if (admin.needsSync || admin.pendingCredentialUpdate) {
          pendingChanges.push({
            type: 'credential_update',
            adminId: admin._id,
            email: admin.email,
            data: admin
          });
        }
      }
      
      return pendingChanges;
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  }

  async processChange(change) {
    try {
      console.log(`Processing change: ${change.type} for ${change.email}`);
      
      switch (change.type) {
        case 'credential_update':
          await this.processCredentialUpdate(change);
          break;
        case 'super_admin_promotion':
          await this.processSuperAdminPromotion(change);
          break;
        case 'super_admin_demotion':
          await this.processSuperAdminDemotion(change);
          break;
        default:
          console.log(`Unknown change type: ${change.type}`);
      }
      
      // Remove from retry queue if successful
      this.retryQueue.delete(change.email);
      
    } catch (error) {
      console.error(`Error processing change for ${change.email}:`, error);
      
      // Handle duplicate email errors specifically
      if (error.code === 11000) {
        await this.handleDuplicateEmailError(error, change);
      } else {
        await this.addToRetryQueue(change, error);
      }
    }
  }

  async processCredentialUpdate(change) {
    try {
      // Use SuperAdminService to update credentials with duplicate handling
      await SuperAdminService.updateSuperAdminCredentials(
        change.email,
        change.data.password || 'defaultPassword123',
        change.data.role || 'SUPER_ADMIN'
      );
      
      console.log(`Successfully updated credentials for ${change.email}`);
    } catch (error) {
      if (error.code === 11000) {
        // Let the duplicate handler deal with this
        throw error;
      }
      throw new Error(`Failed to update credentials: ${error.message}`);
    }
  }

  async processSuperAdminPromotion(change) {
    try {
      await SuperAdminService.promoteSuperAdmin(change.email, change.data.role);
      console.log(`Successfully promoted ${change.email} to super admin`);
    } catch (error) {
      throw new Error(`Failed to promote super admin: ${error.message}`);
    }
  }

  async processSuperAdminDemotion(change) {
    try {
      await SuperAdminService.demoteSuperAdmin(change.email);
      console.log(`Successfully demoted ${change.email} from super admin`);
    } catch (error) {
      throw new Error(`Failed to demote super admin: ${error.message}`);
    }
  }

  async handleDuplicateEmailError(error, change = null) {
    try {
      console.log('Handling duplicate email error...');
      
      // Extract email from error or change
      let duplicateEmail = null;
      
      if (change && change.email) {
        duplicateEmail = change.email;
      } else if (error.keyValue && error.keyValue.email) {
        duplicateEmail = error.keyValue.email;
      }
      
      if (!duplicateEmail) {
        console.error('Could not extract email from duplicate error');
        return;
      }
      
      console.log(`Cleaning up duplicate email: ${duplicateEmail}`);
      
      // Use SuperAdminService cleanup methods
      await SuperAdminService.cleanupDuplicateEmails(duplicateEmail);
      
      // If this was part of a change operation, retry it
      if (change) {
        console.log(`Retrying operation for ${duplicateEmail} after cleanup`);
        
        // Wait a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry the original operation
        await this.processChange(change);
      }
      
    } catch (cleanupError) {
      console.error('Error during duplicate email cleanup:', cleanupError);
      
      // Add to retry queue if cleanup fails
      if (change) {
        await this.addToRetryQueue(change, cleanupError);
      }
    }
  }

  async addToRetryQueue(change, error) {
    const retryKey = change.email || change.adminId;
    
    if (this.retryQueue.has(retryKey)) {
      const retryInfo = this.retryQueue.get(retryKey);
      retryInfo.attempts += 1;
      retryInfo.lastError = error.message;
      
      if (retryInfo.attempts >= this.maxRetries) {
        console.error(`Max retries exceeded for ${retryKey}, removing from queue`);
        this.retryQueue.delete(retryKey);
        return;
      }
    } else {
      this.retryQueue.set(retryKey, {
        change,
        attempts: 1,
        lastError: error.message,
        firstAttempt: new Date()
      });
    }
    
    console.log(`Added ${retryKey} to retry queue (attempt ${this.retryQueue.get(retryKey).attempts})`);
  }

  async processRetryQueue() {
    if (this.retryQueue.size === 0) return;
    
    console.log(`Processing retry queue with ${this.retryQueue.size} items`);
    
    for (const [key, retryInfo] of this.retryQueue.entries()) {
      try {
        // Add exponential backoff delay
        const backoffDelay = Math.pow(2, retryInfo.attempts - 1) * 1000; // 1s, 2s, 4s
        const timeSinceLastAttempt = Date.now() - retryInfo.firstAttempt.getTime();
        
        if (timeSinceLastAttempt < backoffDelay) {
          continue; // Not ready to retry yet
        }
        
        console.log(`Retrying operation for ${key} (attempt ${retryInfo.attempts})`);
        await this.processChange(retryInfo.change);
        
        // If successful, it will be removed from queue in processChange
        
      } catch (error) {
        console.error(`Retry failed for ${key}:`, error);
        await this.addToRetryQueue(retryInfo.change, error);
      }
    }
  }

  // Health check method
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncIntervalMs,
      retryQueueSize: this.retryQueue.size,
      retryQueue: Array.from(this.retryQueue.entries()).map(([key, info]) => ({
        key,
        attempts: info.attempts,
        lastError: info.lastError,
        firstAttempt: info.firstAttempt
      }))
    };
  }

  // Force immediate sync
  async forceSyncNow() {
    console.log('Forcing immediate sync...');
    await this.checkForInstantChanges();
    return this.getStatus();
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
}

// Create singleton instance
const realTimeSyncService = new RealTimeSyncService();

module.exports = realTimeSyncService;
