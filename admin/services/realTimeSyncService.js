const SuperAdminService = require('./superAdminService');

class RealTimeSyncService {
  constructor() {
    this.previousEnvValues = {
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD
    };
    this.isMonitoring = false;
    this.monitorInterval = null;
  }

  startRealTimeMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('⚡ Starting real-time super admin credential monitoring (10 second intervals)...');
    
    // Check every 10 seconds for instant updates
    this.monitorInterval = setInterval(async () => {
      await this.checkForInstantChanges();
    }, 10000); // 10 seconds for near-instant sync
    
    // Also check on process events
    this.setupProcessEventListeners();
  }

  async checkForInstantChanges() {
    try {
      const currentEmail = process.env.SUPER_ADMIN_EMAIL;
      const currentPassword = process.env.SUPER_ADMIN_PASSWORD;
      
      const emailChanged = this.previousEnvValues.email !== currentEmail;
      const passwordChanged = this.previousEnvValues.password !== currentPassword;
      
      if (emailChanged || passwordChanged) {
        console.log('🚨 Environment variables changed! Updating super admin instantly...');
        console.log(`   Email changed: ${emailChanged ? 'Yes' : 'No'}`);
        console.log(`   Password changed: ${passwordChanged ? 'Yes' : 'No'}`);
        
        const result = await SuperAdminService.updateSuperAdminCredentials();
        
        // Update tracking values
        this.previousEnvValues.email = currentEmail;
        this.previousEnvValues.password = currentPassword;
        
        console.log('✅ Super admin credentials updated instantly!', result);
        
        // Emit event for real-time frontend updates
        this.notifyFrontend();
        
        return result;
      }
    } catch (error) {
      console.error('❌ Error in real-time sync:', error);
    }
  }

  async forceInstantCheck() {
    console.log('🔄 Forcing instant credential check...');
    
    // Force re-read environment variables
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    // Update our tracking values to force a comparison
    this.previousEnvValues = {
      email: 'force-check-trigger',
      password: 'force-check-trigger'
    };
    
    // Run the instant check
    const result = await this.checkForInstantChanges();
    
    // Reset tracking values to current env vars
    this.previousEnvValues = {
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD
    };
    
    return result;
  }

  setupProcessEventListeners() {
    // Listen for specific environment variable changes (if supported by hosting)
    process.on('SIGHUP', async () => {
      console.log('📡 Received SIGHUP - checking for env var changes...');
      await this.checkForInstantChanges();
    });
  }

  notifyFrontend() {
    // If you have WebSocket or Server-Sent Events, notify frontend here
    console.log('📢 Frontend will be notified of super admin changes on next status check...');
  }

  stopRealTimeMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('🛑 Stopped real-time super admin monitoring');
    }
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      syncMode: 'REAL_TIME',
      syncInterval: '10 seconds',
      lastKnownEmail: this.previousEnvValues.email,
      currentEnvEmail: process.env.SUPER_ADMIN_EMAIL
    };
  }
}

module.exports = new RealTimeSyncService();
