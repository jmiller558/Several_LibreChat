const express = require('express');
const SuperAdminService = require('../services/superAdminService');
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

// General health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
