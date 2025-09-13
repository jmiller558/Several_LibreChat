#!/usr/bin/env node

const mongoose = require('mongoose');
const SuperAdminService = require('./services/superAdminService');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 
                  process.env.DATABASE_URL ||
                  process.env.MONGODB_URL ||
                  'mongodb://localhost:27017/librechat';

const createSuperAdmin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!superAdminEmail || !superAdminPassword) {
      console.error('❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment variables');
      console.log('Set them in your Railway deployment settings or .env file:');
      console.log('SUPER_ADMIN_EMAIL=your-admin@example.com');
      console.log('SUPER_ADMIN_PASSWORD=your-secure-password');
      process.exit(1);
    }
    
    console.log('🔧 Creating/updating super admin...');
    const result = await SuperAdminService.updateSuperAdminCredentials();
    
    if (result.created) {
      console.log('✅ Super admin created successfully!');
      console.log(`📧 Email: ${superAdminEmail}`);
    } else if (result.updated) {
      console.log('✅ Super admin credentials updated successfully!');
      console.log(`📧 Email: ${superAdminEmail}`);
      console.log(`🔄 Updated fields: ${result.changes.join(', ')}`);
    } else {
      console.log('ℹ️  Super admin credentials are already up to date');
      console.log(`📧 Email: ${superAdminEmail}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
createSuperAdmin();
