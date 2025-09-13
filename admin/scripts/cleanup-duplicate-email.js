#!/usr/bin/env node

/**
 * Universal duplicate email cleanup script
 * Use this to fix duplicate email errors for any email address
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model (assuming it exists in the parent directory)
const User = require('../api/models/User'); // Adjust path as needed

const MONGO_URI = process.env.MONGO_URI || 
                  process.env.DATABASE_URL ||
                  process.env.MONGODB_URL ||
                  'mongodb://localhost:27017/librechat';

async function cleanupDuplicateEmail(targetEmail = null) {
  try {
    console.log('🔧 Starting universal duplicate email cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📦 Connected to MongoDB');

    // Use environment variable if no specific email provided
    const emailToClean = targetEmail || process.env.SUPER_ADMIN_EMAIL;
    
    if (!emailToClean) {
      console.log('🔍 No specific email provided, checking for ALL duplicate emails...');
      return await cleanupAllDuplicateEmails();
    }

    console.log(`🔍 Cleaning up duplicates for: ${emailToClean}`);
    
    // Find all users with this email
    const duplicateUsers = await User.find({ email: emailToClean }).sort({ createdAt: 1 });
    
    console.log(`Found ${duplicateUsers.length} users with email: ${emailToClean}`);
    
    if (duplicateUsers.length <= 1) {
      console.log('✅ No duplicates found for this email');
      return { duplicates: 0, email: emailToClean };
    }

    // Keep the best candidate (prefer super admin, then oldest)
    let userToKeep = duplicateUsers.find(user => user.isSuperAdmin);
    if (!userToKeep) {
      userToKeep = duplicateUsers[0]; // Keep oldest
    }

    const usersToRemove = duplicateUsers.filter(
      user => user._id.toString() !== userToKeep._id.toString()
    );
    
    console.log(`📝 Keeping user: ${userToKeep._id} (created: ${userToKeep.createdAt})`);
    console.log(`🗑️  Removing ${usersToRemove.length} duplicate users:`);
    
    for (const user of usersToRemove) {
      console.log(`   - ${user._id} (created: ${user.createdAt})`);
    }

    // Remove duplicates
    const deleteResult = await User.deleteMany({
      email: emailToClean,
      _id: { $in: usersToRemove.map(u => u._id) }
    });
    
    console.log(`✅ Removed ${deleteResult.deletedCount} duplicate users`);
    
    // Promote the remaining user to super admin if this is the target admin email
    if (emailToClean === process.env.SUPER_ADMIN_EMAIL) {
      const updateResult = await User.findByIdAndUpdate(
        userToKeep._id,
        { 
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (updateResult) {
        console.log(`✅ Promoted remaining user to super admin: ${updateResult.role}`);
      }
    }
    
    console.log('🎉 Duplicate email cleanup completed successfully!');
    return { duplicates: deleteResult.deletedCount, email: emailToClean, kept: userToKeep._id };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    
    if (error.code === 11000) {
      console.error('❌ Duplicate key error still exists. Manual intervention may be required.');
    }
    
    throw error;
  }
}

async function cleanupAllDuplicateEmails() {
  try {
    console.log('🔍 Finding all duplicate emails in the database...');
    
    // Aggregate to find emails with more than one user
    const duplicateEmails = await User.aggregate([
      {
        $group: {
          _id: '$email',
          count: { $sum: 1 },
          users: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Found ${duplicateEmails.length} emails with duplicates`);

    if (duplicateEmails.length === 0) {
      console.log('✅ No duplicate emails found in the database');
      return { totalDuplicatesRemoved: 0, emailsProcessed: 0 };
    }

    let totalDuplicatesRemoved = 0;

    for (const emailGroup of duplicateEmails) {
      const email = emailGroup._id;
      const users = emailGroup.users;
      
      console.log(`\n🔧 Processing ${users.length} duplicates for: ${email}`);
      
      // Keep the best candidate (prefer super admin, then oldest)
      let userToKeep = users.find(user => user.isSuperAdmin);
      if (!userToKeep) {
        userToKeep = users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      }

      const usersToRemove = users.filter(
        user => user._id.toString() !== userToKeep._id.toString()
      );

      console.log(`📝 Keeping: ${userToKeep._id} (${userToKeep.role || 'USER'})`);
      console.log(`🗑️  Removing ${usersToRemove.length} duplicates`);

      // Remove duplicates
      const deleteResult = await User.deleteMany({
        _id: { $in: usersToRemove.map(u => u._id) }
      });

      totalDuplicatesRemoved += deleteResult.deletedCount;
      console.log(`✅ Removed ${deleteResult.deletedCount} duplicates for ${email}`);
    }

    console.log(`\n🎉 All duplicate cleanup completed!`);
    console.log(`📊 Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`📊 Emails processed: ${duplicateEmails.length}`);

    return { 
      totalDuplicatesRemoved, 
      emailsProcessed: duplicateEmails.length,
      emails: duplicateEmails.map(e => e._id)
    };

  } catch (error) {
    console.error('❌ Error during all duplicates cleanup:', error);
    throw error;
  }
}

async function main() {
  try {
    // Check command line arguments
    const targetEmail = process.argv[2];
    
    if (targetEmail) {
      console.log(`🎯 Targeting specific email: ${targetEmail}`);
      await cleanupDuplicateEmail(targetEmail);
    } else {
      console.log('🌐 Running universal cleanup (all duplicates)');
      await cleanupDuplicateEmail();
    }
    
  } catch (error) {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
    console.log('✅ Cleanup script completed');
    process.exit(0);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { cleanupDuplicateEmail, cleanupAllDuplicateEmails };
