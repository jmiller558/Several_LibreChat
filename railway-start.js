const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LibreChat with Railway deployment...');

// Determine if admin portal should be started
const startAdmin = process.env.START_ADMIN_PORTAL === 'true' || process.env.ADMIN_ENABLED === 'true';

// Start LibreChat main service
console.log('🎯 Starting LibreChat main application...');
const librechat = spawn('npm', ['run', 'backend'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env }
});

let admin;

// Start Admin Portal if enabled
if (startAdmin) {
  console.log('📊 Starting Admin Portal...');
  admin = spawn('npm', ['run', 'admin:start'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });

  admin.on('error', (err) => {
    console.error('❌ Admin portal failed to start:', err);
  });

  admin.on('close', (code) => {
    console.log(`📊 Admin portal exited with code ${code}`);
  });
}

librechat.on('error', (err) => {
  console.error('❌ LibreChat failed to start:', err);
  process.exit(1);
});

librechat.on('close', (code) => {
  console.log(`🎯 LibreChat exited with code ${code}`);
  if (admin) admin.kill('SIGTERM');
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  librechat.kill('SIGTERM');
  if (admin) admin.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  librechat.kill('SIGINT');
  if (admin) admin.kill('SIGINT');
});
