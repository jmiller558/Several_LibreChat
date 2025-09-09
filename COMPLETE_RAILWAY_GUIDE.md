# Complete Railway Deployment Guide for LibreChat with Admin Portal

This comprehensive guide will help you deploy LibreChat with the integrated Admin Portal on Railway.

## Prerequisites

1. A Railway account
2. API keys for AI providers (OpenAI, Anthropic, etc.)
3. MongoDB database (Railway provides MongoDB addon)

## Required Environment Variables

Set these environment variables in your Railway project:

### Core LibreChat Variables
```bash
# App Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3080
DOMAIN_CLIENT=https://your-app-name.railway.app
DOMAIN_SERVER=https://your-app-name.railway.app

# Database (use Railway MongoDB addon or external MongoDB)
MONGO_URI=${{MongoDB.MONGO_URL}}
# OR if using external MongoDB:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/librechat

# Security Keys (generate secure random strings)
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here
CREDS_KEY=your-32-character-encryption-key-here
CREDS_IV=your-16-character-iv-here

# Session Secret
SESSION_SECRET=your-session-secret-here

# AI Provider API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Optional: Speech services
TTS_API_KEY=your-tts-api-key-here
STT_API_KEY=your-stt-api-key-here

# Optional: Notion MCP integration
NOTION_API_KEY=secret_your-notion-integration-token-here
```

### Admin Portal Variables
```bash
# Admin Portal Configuration
ADMIN_PORT=4000
ADMIN_JWT_SECRET=your-admin-jwt-secret-different-from-main
```

### OAuth Configuration (Optional)
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

## Deployment Steps

### 1. Prepare Your Repository
```bash
# Clone your repository
git clone https://github.com/jmiller558/Several_LibreChat.git
cd Several_LibreChat

# Make sure all admin portal files are integrated (already done)
```

### 2. Set up Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your LibreChat repository
5. Choose the `railway-deployment-with-mcp` branch

### 3. Add MongoDB Database

1. In your Railway project dashboard
2. Click "New" → "Database" → "Add MongoDB"
3. Railway will automatically set the `MONGO_URL` environment variable

### 4. Configure Environment Variables

In Railway project settings → Variables, add all the required environment variables listed above.

### 5. Configure Build and Start Commands

Railway should automatically detect your package.json, but you can override:

**Build Command:**
```bash
npm install && npm run frontend
```

**Start Command:**
```bash
npm run backend
```

### 6. Deploy Admin Portal (Optional Separate Service)

If you want the admin portal as a separate service:

1. In Railway, click "New" → "Empty Service"
2. Connect the same GitHub repo
3. Set the **Root Directory** to `/admin`
4. Set environment variables for admin portal
5. Use start command: `npm start`

## Post-Deployment Setup

### 1. Create Admin User
```bash
# SSH into your Railway deployment or use Railway's built-in terminal
npm run admin:create
```

### 2. Access Your Application
- Main LibreChat: `https://your-app-name.railway.app`
- Admin Portal: `https://your-admin-app-name.railway.app` (if separate service)

### 3. Verify Configuration
- Test AI provider connections
- Test file uploads
- Test MCP servers (if configured)
- Test admin portal login

## Security Considerations

1. **Strong Secrets**: Generate strong, unique secrets for all JWT and encryption keys
2. **Environment Variables**: Never commit secrets to your repository
3. **HTTPS**: Railway provides HTTPS by default
4. **Rate Limiting**: Consider enabling rate limiting in production
5. **CORS**: Configure CORS properly for your domain

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGO_URI environment variable
   - Ensure MongoDB service is running
   - Verify connection string format

2. **API Keys Not Working**
   - Double-check API key format
   - Ensure keys have proper permissions
   - Check for typos in environment variable names

3. **Build Failures**
   - Check build logs in Railway dashboard
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

4. **Admin Portal Can't Connect**
   - Verify admin portal environment variables
   - Check if admin service is running
   - Ensure database connectivity

### Getting Help

- Check Railway logs for detailed error messages
- Review LibreChat documentation
- Check GitHub issues for similar problems

## Environment Variables Checklist

Copy this checklist to ensure you've set all required variables:

```bash
□ NODE_ENV=production
□ HOST=0.0.0.0
□ PORT=3080
□ DOMAIN_CLIENT=https://your-app-name.railway.app
□ DOMAIN_SERVER=https://your-app-name.railway.app
□ MONGO_URI=${{MongoDB.MONGO_URL}}
□ JWT_SECRET=your-jwt-secret
□ JWT_REFRESH_SECRET=your-refresh-secret
□ CREDS_KEY=your-encryption-key
□ CREDS_IV=your-iv
□ SESSION_SECRET=your-session-secret
□ OPENAI_API_KEY=sk-your-openai-key
□ ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
□ ADMIN_PORT=4000
□ ADMIN_JWT_SECRET=your-admin-jwt-secret
```

## Admin Portal Features

The integrated admin portal provides:

- User management (create, ban, delete users)
- Balance management (set user balances)
- System monitoring
- Configuration management
- Usage statistics

Access the admin portal at `/admin` or deploy as a separate service for better security isolation.
