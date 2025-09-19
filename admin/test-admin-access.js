/**
 * Test file to verify admin access control fixes
 */

const User = require('../models/User');
const { validateAdminProtection, validateRoleAssignment } = require('../utils/routeHelpers');

// Mock users for testing
const superAdmin = {
  _id: 'super1',
  role: 'SUPER_ADMIN',
  isSuperAdmin: true,
  email: 'super@test.com'
};

const regularAdmin = {
  _id: 'admin1',
  role: 'ADMIN',
  isSuperAdmin: false,
  email: 'admin@test.com'
};

const regularUser = {
  _id: 'user1',
  role: 'USER',
  isSuperAdmin: false,
  email: 'user@test.com'
};

const adminUser = {
  _id: 'admin2',
  role: 'ADMIN',
  isSuperAdmin: false,
  email: 'admin2@test.com'
};

/**
 * Test admin protection validation
 */
function testAdminProtection() {
  console.log('Testing admin protection validation...');

  try {
    // Test 1: Super admin should be able to delete admin users
    console.log('Test 1: Super admin deleting admin user...');
    validateAdminProtection(adminUser, superAdmin, { operation: 'delete' });
    console.log('✅ Test 1 passed: Super admin can delete admin users');
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
  }

  try {
    // Test 2: Regular admin should NOT be able to delete other admin users
    console.log('Test 2: Regular admin trying to delete another admin...');
    validateAdminProtection(adminUser, regularAdmin, { operation: 'delete' });
    console.log('❌ Test 2 failed: Regular admin should not be able to delete other admins');
  } catch (error) {
    console.log('✅ Test 2 passed:', error.message);
  }

  try {
    // Test 3: Regular admin should be able to delete regular users
    console.log('Test 3: Regular admin deleting regular user...');
    validateAdminProtection(regularUser, regularAdmin, { operation: 'delete' });
    console.log('✅ Test 3 passed: Regular admin can delete regular users');
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
  }

  try {
    // Test 4: Regular admin should NOT be able to modify super admin
    console.log('Test 4: Regular admin trying to modify super admin...');
    validateAdminProtection(superAdmin, regularAdmin, { operation: 'modify' });
    console.log('❌ Test 4 failed: Regular admin should not be able to modify super admin');
  } catch (error) {
    console.log('✅ Test 4 passed:', error.message);
  }
}

/**
 * Test role assignment validation
 */
function testRoleAssignment() {
  console.log('\nTesting role assignment validation...');

  try {
    // Test 1: Regular admin should NOT be able to create admin users
    console.log('Test 1: Regular admin trying to create admin user...');
    validateRoleAssignment('ADMIN', regularAdmin);
    console.log('❌ Test 1 failed: Regular admin should not be able to create admin users');
  } catch (error) {
    console.log('✅ Test 1 passed:', error.message);
  }

  try {
    // Test 2: Super admin should be able to create admin users
    console.log('Test 2: Super admin creating admin user...');
    validateRoleAssignment('ADMIN', superAdmin);
    console.log('✅ Test 2 passed: Super admin can create admin users');
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message);
  }

  try {
    // Test 3: Regular admin should be able to create regular users
    console.log('Test 3: Regular admin creating regular user...');
    validateRoleAssignment('USER', regularAdmin);
    console.log('✅ Test 3 passed: Regular admin can create regular users');
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
  }

  try {
    // Test 4: Regular admin should NOT be able to create super admin users
    console.log('Test 4: Regular admin trying to create super admin...');
    validateRoleAssignment('SUPER_ADMIN', regularAdmin);
    console.log('❌ Test 4 failed: Regular admin should not be able to create super admin users');
  } catch (error) {
    console.log('✅ Test 4 passed:', error.message);
  }
}

// Run tests
console.log('=== ADMIN ACCESS CONTROL TESTS ===\n');
testAdminProtection();
testRoleAssignment();
console.log('\n=== TESTS COMPLETED ===');

module.exports = {
  testAdminProtection,
  testRoleAssignment
};
