#!/usr/bin/env node

const mongoose = require('mongoose');
const SuperAdminService = require('./services/superAdminService');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 
                  process.env.DATABASE_URL ||
                  process.env.MONGODB_URL ||
                  'mongodb://localhost:27017/librechat';

const testSuperAdminFunctionality = async () => {
  try {
    console.log('🧪 Starting Super Admin Tests...\n');
    
    // Connect to database
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Check environment variables
    console.log('\n📋 Test 1: Environment Variables');
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!email || !password) {
      console.log('❌ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set');
      return;
    } else {
      console.log('✅ Environment variables are set');
      console.log(`   Email: ${email}`);
    }
    
    // Test 2: Check super admin exists
    console.log('\n📋 Test 2: Super Admin Existence');
    let superAdmin = await User.findOne({ isSuperAdmin: true });
    
    if (!superAdmin) {
      console.log('⚠️  No super admin found, creating one...');
      await SuperAdminService.ensureSuperAdminExists();
      superAdmin = await User.findOne({ isSuperAdmin: true });
    }
    
    if (superAdmin) {
      console.log('✅ Super admin exists');
      console.log(`   ID: ${superAdmin._id}`);
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   Is Super Admin: ${superAdmin.isSuperAdmin}`);
    } else {
      console.log('❌ Failed to create super admin');
      return;
    }
    
    // Test 3: Check credential sync
    console.log('\n📋 Test 3: Credential Synchronization');
    const status = await SuperAdminService.getSuperAdminStatus();
    console.log('✅ Status check completed');
    console.log(`   Email matches: ${status.emailMatches}`);
    console.log(`   Last updated: ${status.lastUpdated}`);
    
    // Test 4: Try to delete super admin (should fail)
    console.log('\n📋 Test 4: Deletion Protection');
    try {
      await User.findOneAndDelete({ isSuperAdmin: true });
      console.log('❌ Super admin deletion should have failed');
    } catch (error) {
      console.log('✅ Super admin deletion properly blocked');
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 5: Check role protection
    console.log('\n📋 Test 5: Role Protection');
    try {
      await User.findByIdAndUpdate(superAdmin._id, { role: 'USER', isSuperAdmin: false });
      const updatedAdmin = await User.findById(superAdmin._id);
      
      if (updatedAdmin.role === 'SUPER_ADMIN' && updatedAdmin.isSuperAdmin) {
        console.log('✅ Role protection working - changes were blocked');
      } else {
        console.log('❌ Role protection failed - changes were applied');
      }
    } catch (error) {
      console.log('✅ Role protection working - update blocked');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the tests
testSuperAdminFunctionality();
