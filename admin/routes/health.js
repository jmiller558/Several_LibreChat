const express = require('express');
const SuperAdminService = require('../services/superAdminService');
const realTimeSyncService = require('../services/realTimeSyncService');
const { verifySuperAdmin } = require('../middleware/adminProtection');
const router = express.Router();

// Health check for super admin status
router.get('/super-admin-status', async (req, res) => {
  try {
    const status = await SuperAdminService.getSuperAdminStatus();
    res.json(status);
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

// Real-time sync service status
router.get('/sync-status', verifySuperAdmin, async (req, res) => {
  try {
    const status = realTimeSyncService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Force immediate sync
router.post('/force-sync', verifySuperAdmin, async (req, res) => {
  try {
    const result = await realTimeSyncService.forceSyncNow();
    res.json({
      message: 'Immediate sync completed',
      status: result
    });
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({ error: 'Force sync failed' });
  }
});

// Clean up duplicate emails
router.post('/cleanup-duplicates', verifySuperAdmin, async (req, res) => {
  try {
    const result = await realTimeSyncService.cleanupAllDuplicates();
    
    if (result.success) {
      res.json({
        message: 'Duplicate cleanup completed successfully',
        result
      });
    } else {
      res.status(500).json({
        error: 'Duplicate cleanup failed',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Start real-time sync service
router.post('/start-sync', verifySuperAdmin, async (req, res) => {
  try {
    realTimeSyncService.start();
    res.json({
      message: 'Real-time sync service started',
      status: realTimeSyncService.getStatus()
    });
  } catch (error) {
    console.error('Start sync error:', error);
    res.status(500).json({ error: 'Failed to start sync service' });
  }
});

// Stop real-time sync service
router.post('/stop-sync', verifySuperAdmin, async (req, res) => {
  try {
    realTimeSyncService.stop();
    res.json({
      message: 'Real-time sync service stopped',
      status: realTimeSyncService.getStatus()
    });
  } catch (error) {
    console.error('Stop sync error:', error);
    res.status(500).json({ error: 'Failed to stop sync service' });
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

// Get system summary
router.get('/super-admin-summary', verifySuperAdmin, async (req, res) => {
  try {
    const summary = await SuperAdminService.getSystemSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting system summary:', error);
    res.status(500).json({ error: 'Failed to get system summary' });
  }
});

// Promote existing user to super admin
router.post('/promote-user-to-super-admin', verifySuperAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!password) {
      return res.status(400).json({ error: 'SUPER_ADMIN_PASSWORD environment variable not set' });
    }

    const result = await SuperAdminService.promoteExistingUserToSuperAdmin(email, password);

    res.json({
      message: `Successfully promoted ${email} to super admin`,
      superAdmin: {
        email: result.email,
        id: result._id,
        promotedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error promoting user to super admin:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to promote user to super admin' });
    }
  }
});

module.exports = router;
