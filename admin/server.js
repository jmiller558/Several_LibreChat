const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import services
const SuperAdminService = require('./services/superAdminService');
const credentialSyncService = require('./services/credentialSyncService');
const realTimeSyncService = require('./services/realTimeSyncService');

const app = express();
const PORT = process.env.PORT || process.env.ADMIN_PORT || 4000;

// Connect to MongoDB - Railway compatible
const MONGO_URI = process.env.MONGO_URI || 
                  process.env.DATABASE_URL ||
                  process.env.MONGODB_URL ||
                  'mongodb://localhost:27017/librechat';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('📦 Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

// Serve the admin portal HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch all other routes and send index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`🚀 LibreChat Admin Portal running on http://localhost:${PORT}`);
  
  try {
    // Ensure super admin exists on startup
    await SuperAdminService.ensureSuperAdminExists();
    
    // Start periodic credential sync (checks every 5 minutes) - legacy support
    await credentialSyncService.startPeriodicCheck(5);
    
    // Start real-time sync service (checks every 10 seconds)
    realTimeSyncService.start();
    
    console.log('✅ Super admin services initialized with real-time sync');
  } catch (error) {
    console.error('❌ Error initializing super admin services:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  credentialSyncService.stopPeriodicCheck();
  realTimeSyncService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  credentialSyncService.stopPeriodicCheck();
  realTimeSyncService.stop();
  process.exit(0);
});
