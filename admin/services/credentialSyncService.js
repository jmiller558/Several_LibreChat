const SuperAdminService = require('./superAdminService');

class CredentialSyncService {
  constructor() {
    this.checkInterval = null;
    this.lastKnownEmail = process.env.SUPER_ADMIN_EMAIL;
    this.lastKnownPassword = process.env.SUPER_ADMIN_PASSWORD;
  }
  
  async startPeriodicCheck(intervalMinutes = 5) {
    console.log(`Starting super admin credential sync every ${intervalMinutes} minutes`);
    
    // Initial check
    await this.checkAndUpdateCredentials();
    
    // Set up periodic check
    this.checkInterval = setInterval(async () => {
      await this.checkAndUpdateCredentials();
    }, intervalMinutes * 60 * 1000);
  }
  
  async checkAndUpdateCredentials() {
    try {
      const currentEmail = process.env.SUPER_ADMIN_EMAIL;
      const currentPassword = process.env.SUPER_ADMIN_PASSWORD;
      
      // Check if environment variables changed
      const emailChanged = this.lastKnownEmail !== currentEmail;
      const passwordChanged = this.lastKnownPassword !== currentPassword;
      
      if (emailChanged || passwordChanged) {
        console.log('Environment variables changed, updating super admin...');
        const result = await SuperAdminService.updateSuperAdminCredentials();
        
        // Update our tracking variables
        this.lastKnownEmail = currentEmail;
        this.lastKnownPassword = currentPassword;
        
        return result;
      }
      
    } catch (error) {
      console.error('Error in credential sync check:', error);
    }
  }
  
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped super admin credential sync');
    }
  }
}

module.exports = new CredentialSyncService();
