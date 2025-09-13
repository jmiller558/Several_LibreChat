# Railway Deployment Guide - LibreChat Admin Portal

## Quick Deployment Steps

### 1. Environment Variables (Set in Railway Dashboard)

```env
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-super-secure-jwt-secret-key-here
SUPER_ADMIN_EMAIL=your-admin@example.com
SUPER_ADMIN_PASSWORD=your-secure-admin-password
```

### 2. Deploy Process

1. **Connect Repository**: Link your GitHub repo to Railway
2. **Set Environment Variables**: Add all variables above in Railway dashboard
3. **Deploy**: Railway will automatically detect the Dockerfile and deploy

### 3. Verification Steps

After deployment, verify your admin portal:

1. **Health Check**: Visit `https://your-app.railway.app/health`
2. **Super Admin Status**: Check `https://your-app.railway.app/api/health/super-admin-status`
3. **Login**: Access admin portal with your SUPER_ADMIN_EMAIL and password

## Environment Variable Details

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `4000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | JWT signing secret | `your-super-secure-random-string` |
| `SUPER_ADMIN_EMAIL` | Super admin email | `admin@yourcompany.com` |
| `SUPER_ADMIN_PASSWORD` | Super admin password | `YourSecurePassword123!` |

## Features After Deployment

✅ **Automatic Super Admin Creation**: Created on first startup  
✅ **Credential Synchronization**: Updates when env vars change  
✅ **Health Monitoring**: Built-in health checks for Railway  
✅ **Security**: Non-root Docker user, rate limiting  
✅ **Database Protection**: Super admin cannot be deleted  
✅ **API Protection**: Middleware prevents unauthorized changes  

## Post-Deployment Configuration

### Updating Super Admin Credentials

1. Update `SUPER_ADMIN_EMAIL` or `SUPER_ADMIN_PASSWORD` in Railway dashboard
2. Wait up to 5 minutes for automatic sync
3. Or trigger manual sync: `POST /api/health/sync-super-admin` (super admin only)

### Creating Additional Admins

1. Login as super admin
2. Navigate to user management
3. Promote users to `ADMIN` role (only super admin can do this)

## Troubleshooting

### Super Admin Not Created
```bash
# Check logs in Railway dashboard for:
❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set
```
**Solution**: Verify environment variables are set correctly

### Connection Issues
```bash
# Check logs for:
❌ MongoDB connection error
```
**Solution**: Verify `MONGO_URI` is correct and database is accessible

### Health Check Failures
```bash
# Visit: https://your-app.railway.app/health
```
Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "memory": {...},
  "version": "1.0.0"
}
```

## Security Considerations

1. **Strong Passwords**: Use complex passwords for super admin
2. **Environment Security**: Limit access to Railway dashboard
3. **Regular Updates**: Keep dependencies updated
4. **Monitoring**: Monitor health endpoints regularly

## Railway Features Used

- **Dockerfile Builder**: Optimized container builds
- **Health Checks**: Automatic health monitoring
- **Environment Variables**: Secure configuration management
- **Automatic Restarts**: Service reliability
- **Log Aggregation**: Centralized logging

## Super Admin API Endpoints

- `GET /health` - Docker health check
- `GET /api/health/health` - General health
- `GET /api/health/super-admin-status` - Super admin status
- `POST /api/health/sync-super-admin` - Manual credential sync
- `POST /api/auth/login` - Admin authentication
- `GET /api/admin/users` - User management

Your LibreChat Admin Portal is now production-ready on Railway! 🚀
