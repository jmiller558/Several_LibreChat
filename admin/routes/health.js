const express = require('express');
const SuperAdminService = require('../services/superAdminService');
const realTimeSyncService = require('../services/realTimeSyncService');
const { verifySuperAdmin } = require('../middleware/adminProtection');
const router = express.Router();

// Health check for super admin status
router.get('/super-admin-status', async (req, res) => {
  try {
    const status = await SuperAdminService.getSuperAdminStatus();
    const realTimeStatus = realTimeSyncService.getStatus();
    
    res.json({
      ...status,
      syncMode: realTimeStatus.syncMode,
      syncInterval: realTimeStatus.syncInterval,
      isRealTimeMonitoring: realTimeStatus.isMonitoring
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check super admin status' });
  }
});

// Manual super admin sync endpoint (only for super admin)
router.post('/sync-super-admin', verifySuperAdmin, async (req, res) => {
  try {
    const result = await SuperAdminService.updateSuperAdminCredentials();
    
    res.json({
      message: 'Super admin sync completed',
      result
    });
    
  } catch (error) {
    console.error('Manual super admin sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Instant sync endpoint - triggers immediate check
router.post('/sync-super-admin-instant', verifySuperAdmin, async (req, res) => {
  try {
    console.log('🚨 Manual instant sync triggered...');
    
    // Force immediate check
    const result = await realTimeSyncService.checkForInstantChanges();
    
    res.json({
      message: 'Instant sync completed',
      result: result || { message: 'No changes detected' },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Manual instant sync error:', error);
    res.status(500).json({ error: 'Instant sync failed' });
  }
});

// Force environment variable re-read and instant sync
router.post('/force-env-sync', verifySuperAdmin, async (req, res) => {
  try {
    console.log('🔄 Forcing environment variable sync...');
    
    // Force re-read environment variables and check
    const result = await realTimeSyncService.forceInstantCheck();
    
    res.json({
      message: 'Environment variables re-read and super admin synced instantly',
      result: result || { message: 'No changes needed' },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Force env sync error:', error);
    res.status(500).json({ error: 'Force sync failed' });
  }
});

// General health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug super admin endpoint (temporary for troubleshooting)
router.get('/debug-super-admin', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all super admins
    const superAdmins = await User.find({ isSuperAdmin: true }).select('email role isSuperAdmin createdAt');
    
    // Get environment variables
    const envVars = {
      email: process.env.SUPER_ADMIN_EMAIL,
      passwordSet: !!process.env.SUPER_ADMIN_PASSWORD,
      mongoUri: process.env.MONGO_URI ? '[SET]' : process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'
    };
    
    // Check for mismatch
    const hasValidSuperAdmin = superAdmins.length > 0 && 
                              superAdmins[0].email === envVars.email;
    
    res.json({
      databaseSuperAdmins: superAdmins,
      environmentVariables: envVars,
      status: {
        superAdminExists: superAdmins.length > 0,
        credentialsMatch: hasValidSuperAdmin,
        needsFix: !hasValidSuperAdmin
      },
      recommendations: hasValidSuperAdmin ? 
        ['✅ Super admin is properly configured'] : 
        ['❌ Run npm run fix-super-admin to resolve issues']
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      recommendation: 'Check database connection and try again'
    });
  }
});

module.exports = router;
