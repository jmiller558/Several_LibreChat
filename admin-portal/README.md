# LibreChat Admin Portal

A standalone admin portal for managing LibreChat users and system statistics.

## Features

- User Management (create, edit, ban/unban users)
- System Statistics and Analytics
- Security Dashboard
- Database Management
- Real-time Charts and Monitoring

## Deployment on Railway

1. **Environment Variables:**
   Set these in Railway's environment variables:
   - `MONGO_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Secret for JWT token signing
   - `PORT` - Railway will set this automatically

2. **Database:**
   Make sure your MongoDB instance is accessible from Railway.

3. **First Admin User:**
   Run `npm run create-admin` locally or set these env vars:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD` 
   - `ADMIN_NAME`

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```

## Create Admin User

```bash
npm run create-admin
```

## Port

Default port is 4000, but Railway will override with its own PORT env variable.
