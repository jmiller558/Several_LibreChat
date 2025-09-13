const bcrypt = require('bcryptjs');
const User = require('../models/User');

class SuperAdminService {
  static async updateSuperAdminCredentials() {
    try {
      const newEmail = process.env.SUPER_ADMIN_EMAIL;
      const newPassword = process.env.SUPER_ADMIN_PASSWORD;
      
      if (!newEmail || !newPassword) {
        console.warn('SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in environment variables');
        return;
      }
      
      // Find existing super admin
      const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
      
      if (existingSuperAdmin) {
        let needsUpdate = false;
        const updates = {};
        
        // Check if email changed
        if (existingSuperAdmin.email !== newEmail) {
          // Check if the new email is already taken by another user
          const existingUser = await User.findOne({ 
            email: newEmail, 
            _id: { $ne: existingSuperAdmin._id } 
          });
          
          if (existingUser) {
            console.log(`⚠️ Email ${newEmail} is already taken by another user. Converting that user to super admin...`);
            
            // Remove super admin status from current super admin
            await User.findByIdAndUpdate(existingSuperAdmin._id, {
              isSuperAdmin: false,
              role: 'ADMIN'
            });
            
            // Convert the existing user to super admin
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            await User.findByIdAndUpdate(existingUser._id, {
              password: hashedPassword,
              role: 'SUPER_ADMIN',
              isSuperAdmin: true,
              emailVerified: true,
              passwordChangedAt: new Date()
            });
            
            console.log(`✅ Converted user ${newEmail} to super admin`);
            return { converted: true, email: newEmail };
          } else {
            updates.email = newEmail;
            needsUpdate = true;
            console.log('Super admin email will be updated');
          }
        }
        
        // Check if password changed (compare with hash)
        const passwordMatch = await bcrypt.compare(newPassword, existingSuperAdmin.password);
        if (!passwordMatch) {
          const saltRounds = 12;
          updates.password = await bcrypt.hash(newPassword, saltRounds);
          updates.passwordChangedAt = new Date();
          needsUpdate = true;
          console.log('Super admin password will be updated');
        }
        
        // Update if changes detected
        if (needsUpdate) {
          await User.findByIdAndUpdate(existingSuperAdmin._id, updates, { runValidators: true });
          console.log('Super admin credentials updated successfully');
          return { updated: true, changes: Object.keys(updates) };
        } else {
          console.log('Super admin credentials are up to date');
          return { updated: false };
        }
        
      } else {
        // Check if user with env email exists first
        const existingUser = await User.findOne({ email: newEmail });
        
        if (existingUser) {
          console.log(`🔄 Converting existing user ${newEmail} to super admin`);
          
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
          await User.findByIdAndUpdate(existingUser._id, {
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            emailVerified: true,
            passwordChangedAt: new Date()
          });
          
          console.log(`✅ Converted user ${newEmail} to super admin`);
          return { converted: true, email: newEmail };
        } else {
          // Create new super admin if none exists
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
          
          await User.create({
            email: newEmail,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            name: 'Super Administrator',
            emailVerified: true,
            passwordChangedAt: new Date()
          });
          
          console.log('New super admin created');
          return { created: true };
        }
      }
      
    } catch (error) {
      console.error('Error updating super admin credentials:', error);
      
      // If it's a duplicate key error, try to fix it
      if (error.code === 11000) {
        console.log('🔧 Duplicate key error detected, attempting cleanup...');
        try {
          await this.cleanupDuplicateEmails();
          // Retry the operation
          return await this.updateSuperAdminCredentials();
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError);
          throw cleanupError;
        }
      }
      
      throw error;
    }
  }

  static async cleanupDuplicateEmails() {
    try {
      const envEmail = process.env.SUPER_ADMIN_EMAIL;
      if (!envEmail) return;
      
      // Find all users with the same email
      const usersWithEmail = await User.find({ email: envEmail });
      
      if (usersWithEmail.length > 1) {
        console.log(`🧹 Found ${usersWithEmail.length} users with email ${envEmail}, cleaning up...`);
        
        // Keep the one that should be super admin, or the first one
        let keepUser = usersWithEmail.find(user => user.isSuperAdmin);
        if (!keepUser) {
          keepUser = usersWithEmail[0];
        }
        
        // Remove duplicates
        for (const user of usersWithEmail) {
          if (user._id.toString() !== keepUser._id.toString()) {
            console.log(`🗑️ Removing duplicate user: ${user._id}`);
            await User.findByIdAndDelete(user._id);
          }
        }
        
        console.log(`✅ Kept user: ${keepUser.email} (${keepUser._id})`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicate emails:', error);
      throw error;
    }
  }

  static async cleanupDuplicateSuperAdmins() {
    try {
      // Find all users with isSuperAdmin: true
      const superAdmins = await User.find({ isSuperAdmin: true });
      
      if (superAdmins.length > 1) {
        console.log(`⚠️ Found ${superAdmins.length} super admins, cleaning up...`);
        
        const envEmail = process.env.SUPER_ADMIN_EMAIL;
        let keepSuperAdmin = null;
        
        // Try to find the one matching environment email
        if (envEmail) {
          keepSuperAdmin = superAdmins.find(admin => admin.email === envEmail);
        }
        
        // If no match, keep the first one
        if (!keepSuperAdmin) {
          keepSuperAdmin = superAdmins[0];
        }
        
        // Remove super admin status from others
        for (const admin of superAdmins) {
          if (admin._id.toString() !== keepSuperAdmin._id.toString()) {
            await User.findByIdAndUpdate(admin._id, {
              isSuperAdmin: false,
              role: 'ADMIN'
            });
            console.log(`🔄 Removed super admin status from ${admin.email}`);
          }
        }
        
        console.log(`✅ Kept super admin: ${keepSuperAdmin.email}`);
        return keepSuperAdmin;
      }
      
      return superAdmins[0] || null;
      
    } catch (error) {
      console.error('❌ Error cleaning up duplicate super admins:', error);
      throw error;
    }
  }
  
  static async ensureSuperAdminExists() {
    try {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
      
      if (!superAdminEmail || !superAdminPassword) {
        console.warn('Super admin environment variables not set');
        return;
      }
      
      const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
      
      if (!existingSuperAdmin) {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);
        
        await User.create({
          email: superAdminEmail,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          name: 'Super Administrator',
          emailVerified: true,
          passwordChangedAt: new Date()
        });
        
        console.log('Super admin created on startup');
      }
    } catch (error) {
      console.error('Error ensuring super admin exists:', error);
    }
  }
  
  static async getSuperAdminStatus() {
    try {
      const superAdmin = await User.findOne({ isSuperAdmin: true }).select('email createdAt updatedAt');
      const envEmail = process.env.SUPER_ADMIN_EMAIL;
      const envSet = !!(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD);
      
      return {
        exists: !!superAdmin,
        email: superAdmin?.email,
        envEmail: envEmail,
        emailMatches: superAdmin?.email === envEmail,
        lastUpdated: superAdmin?.updatedAt,
        environmentVariablesSet: envSet,
        systemStatus: this.determineSystemStatus(superAdmin, envEmail, envSet)
      };
    } catch (error) {
      console.error('Error getting super admin status:', error);
      return { error: error.message };
    }
  }

  static determineSystemStatus(superAdmin, envEmail, envSet) {
    if (!envSet) return 'ENV_VARS_NOT_SET';
    if (!superAdmin) return 'NO_SUPER_ADMIN';
    if (superAdmin.email !== envEmail) return 'EMAIL_MISMATCH';
    return 'SYNCHRONIZED';
  }

  static async getSystemSummary() {
    try {
      const allSuperAdmins = await User.find({ isSuperAdmin: true }).select('email createdAt updatedAt lastLogin');
      const envEmail = process.env.SUPER_ADMIN_EMAIL;
      const envSet = !!(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD);
      
      return {
        environmentEmail: envEmail,
        environmentVariablesSet: envSet,
        currentSuperAdmins: allSuperAdmins.map(admin => ({
          email: admin.email,
          id: admin._id,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          lastLogin: admin.lastLogin
        })),
        totalSuperAdmins: allSuperAdmins.length,
        isInSync: allSuperAdmins.length === 1 && allSuperAdmins[0].email === envEmail,
        systemStatus: this.determineSystemStatus(allSuperAdmins[0], envEmail, envSet),
        needsCleanup: allSuperAdmins.length > 1
      };
    } catch (error) {
      console.error('Error getting system summary:', error);
      throw error;
    }
  }

  static async getAllSuperAdmins() {
    try {
      return await User.find({ isSuperAdmin: true }).select('email createdAt updatedAt lastLogin role');
    } catch (error) {
      console.error('Error getting all super admins:', error);
      throw error;
    }
  }

  static generateNameFromEmail(email) {
    // Generate a reasonable name from email
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Super Administrator';
  }

  static async promoteExistingUserToSuperAdmin(email, password = null) {
    try {
      // Find the existing user
      const existingUser = await User.findOne({ email: email });
      
      if (!existingUser) {
        throw new Error(`User with email ${email} not found`);
      }

      // Check if there's already a super admin
      const currentSuperAdmin = await User.findOne({ isSuperAdmin: true });
      
      if (currentSuperAdmin && currentSuperAdmin._id.toString() !== existingUser._id.toString()) {
        // Demote current super admin
        await User.findByIdAndUpdate(currentSuperAdmin._id, {
          isSuperAdmin: false,
          role: currentSuperAdmin.role === 'SUPER_ADMIN' ? 'ADMIN' : currentSuperAdmin.role
        });
        console.log(`🔄 Demoted ${currentSuperAdmin.email} from super admin to admin`);
      }

      // Promote existing user to super admin
      const updateData = {
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        emailVerified: true
      };

      // Update password if provided
      if (password) {
        const saltRounds = 12;
        updateData.password = await bcrypt.hash(password, saltRounds);
        updateData.passwordChangedAt = new Date();
      }
      
      await User.findByIdAndUpdate(existingUser._id, updateData);

      console.log(`✅ Successfully promoted ${email} to super admin`);
      return await User.findById(existingUser._id);

    } catch (error) {
      console.error(`❌ Error promoting user ${email} to super admin:`, error);
      throw error;
    }
  }
}

module.exports = SuperAdminService;
