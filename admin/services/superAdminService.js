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
          updates.email = newEmail;
          needsUpdate = true;
          console.log('Super admin email will be updated');
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
          // Temporarily disable the pre-hook protection for super admin updates
          await User.findByIdAndUpdate(existingSuperAdmin._id, updates, { runValidators: true });
          console.log('Super admin credentials updated successfully');
          return { updated: true, changes: Object.keys(updates) };
        } else {
          console.log('Super admin credentials are up to date');
          return { updated: false };
        }
        
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
      
    } catch (error) {
      console.error('Error updating super admin credentials:', error);
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
      
      return {
        exists: !!superAdmin,
        email: superAdmin?.email,
        envEmail: envEmail,
        emailMatches: superAdmin?.email === envEmail,
        lastUpdated: superAdmin?.updatedAt
      };
    } catch (error) {
      console.error('Error getting super admin status:', error);
      return { error: error.message };
    }
  }
}

module.exports = SuperAdminService;
