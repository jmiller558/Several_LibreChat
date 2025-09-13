# Super Admin Setup for LibreChat Admin Portal

This guide explains how to set up and manage the Super Admin functionality in the LibreChat Admin Portal.

## Features

- **Immutable Super Admin**: Super admin cannot be deleted by any user
- **Environment Variable Sync**: Super admin credentials automatically sync with Railway environment variables
- **Role Protection**: Only super admin can create new admin users
- **Automatic Updates**: Credentials update when environment variables change
- **Database Protection**: Mongoose pre-hooks prevent unauthorized modifications

## Environment Variables

Set these in your Railway deployment:

```env
SUPER_ADMIN_EMAIL=your-super-admin@example.com
SUPER_ADMIN_PASSWORD=your-secure-password
```

## Automatic Setup

The super admin is automatically created when the server starts if:
1. Environment variables are set
2. No super admin exists in the database

## Manual Setup

If you need to manually create or update the super admin:

```bash
# Run the creation script
npm run create-super-admin

# Or directly
node create-super-admin.js
```

## API Endpoints

### Health Check
```http
GET /api/health/super-admin-status
```
Returns the current super admin status and whether credentials match environment variables.

### Manual Sync (Super Admin Only)
```http
POST /api/health/sync-super-admin
Authorization: Bearer <super-admin-token>
```
Manually triggers credential synchronization.

## Automatic Credential Updates

The system automatically checks for environment variable changes every 5 minutes and updates the super admin credentials accordingly:

- **Email Changes**: Updates the super admin email
- **Password Changes**: Updates the super admin password hash
- **Logging**: All changes are logged to the console

## Protection Features

### Database Level
- Mongoose pre-hooks prevent super admin deletion
- Role changes to super admin are blocked

### API Level
- Super admin cannot be banned
- Super admin cannot be deleted via API
- Only super admin can modify super admin account
- Only super admin can create new admin users

### Middleware Protection
- `protectSuperAdmin` middleware on all user modification routes
- `verifySuperAdmin` middleware for super admin only endpoints

## Role Hierarchy

1. **SUPER_ADMIN** - Full system access, cannot be deleted
2. **ADMIN** - Can manage users but cannot create admins
3. **USER** - Standard user access

## Troubleshooting

### Super Admin Not Created
1. Check environment variables are set correctly
2. Check database connection
3. Run manual creation script
4. Check server logs for errors

### Credentials Not Updating
1. Verify environment variables changed in Railway
2. Wait up to 5 minutes for automatic sync
3. Use manual sync endpoint
4. Check server logs for sync errors

### Access Issues
1. Verify super admin email/password match environment variables
2. Check JWT token is valid
3. Ensure super admin exists in database

## Security Considerations

1. **Strong Passwords**: Use complex passwords for super admin
2. **Environment Security**: Protect Railway environment variable access
3. **Token Management**: Tokens expire in 24 hours
4. **Access Logging**: All login attempts are logged with IP addresses

## Development

For local development, create a `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/librechat
SUPER_ADMIN_EMAIL=admin@localhost
SUPER_ADMIN_PASSWORD=secure-dev-password
JWT_SECRET=your-jwt-secret
```

## Production Deployment

1. Set environment variables in Railway
2. Deploy the application
3. Super admin will be created automatically
4. Use health check endpoint to verify setup

## Files Modified

- `models/User.js` - Added super admin fields and protection
- `services/superAdminService.js` - Core super admin logic
- `services/credentialSyncService.js` - Automatic credential sync
- `middleware/adminProtection.js` - Protection middleware
- `routes/auth.js` - Updated authentication
- `routes/admin.js` - Added super admin protection
- `routes/health.js` - Health check endpoints
- `server.js` - Service initialization
- `create-super-admin.js` - Manual creation script
