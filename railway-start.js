const { spawn } = require('child_process');

console.log('🚀 Starting Several Chat Production Server...');

// Start LibreChat main service
console.log('🎯 Starting LibreChat main application...');
const librechat = spawn('npm', ['run', 'backend'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'production' }
});

// Start Admin Portal if enabled
let admin = null;
if (process.env.START_ADMIN_PORTAL === 'true') {
  console.log('� Starting Admin Portal...');
  admin = spawn('npm', ['run', 'admin:start'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  admin.on('error', (err) => {
    console.error('❌ Admin portal failed to start:', err);
  });

  admin.on('exit', (code) => {
    console.log(`� Admin portal exited with code ${code}`);
  });
}

// Handle LibreChat process
librechat.on('error', (err) => {
  console.error('❌ LibreChat failed to start:', err);
  process.exit(1);
});

librechat.on('exit', (code) => {
  console.log(`🚀 LibreChat exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
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
