# Several Chat - Production Deployment Guide

## 🚀 Project Overview
Several Chat is an enterprise-grade conversational AI platform with LibreChat core and integrated Admin Portal, optimized for Railway deployment.

## 📁 Project Structure
```
/
├── admin/                    # Admin Portal (React + Express)
│   ├── Dockerfile           # Admin container config
│   ├── package.json         # Admin dependencies
│   ├── server.js            # Admin server
│   └── routes/              # Admin API routes
├── api/                     # LibreChat API
├── client/                  # LibreChat Frontend
├── config/                  # Configuration scripts
├── packages/                # Core packages
├── Dockerfile               # Main LibreChat container
├── librechat.yaml          # Main configuration
├── package.json            # Root dependencies & scripts
└── railway-start.js        # Production startup script
```

## 🌐 Railway Deployment

### Environment Variables
Set these in Railway dashboard:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `JWT_SECRET` - Random 32+ character string
- `JWT_REFRESH_SECRET` - Random 32+ character string
- `CREDS_KEY` - 32-character encryption key
- `CREDS_IV` - 16-character initialization vector

**Optional:**
- `START_ADMIN_PORTAL=true` - Enable admin portal
- `NOTION_API_KEY` - For Notion MCP integration
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

### Deployment Commands
```bash
# Deploy LibreChat only
npm start

# Deploy with Admin Portal
START_ADMIN_PORTAL=true npm start

# Admin Portal only (separate service)
cd admin && npm start
```

## 🔧 Admin Portal Features
- User management (create, ban, delete users)
- System analytics and monitoring
- Content moderation tools
- API usage tracking
- System configuration

## 🛠️ Available Scripts
```bash
# User Management
npm run invite-user          # Invite new users
npm run list-users          # List all users
npm run reset-password      # Reset user password
npm run ban-user            # Ban users
npm run delete-user         # Delete users

# Admin Portal
npm run admin:start         # Start admin portal
npm run admin:create        # Create admin user
npm run admin:install       # Install admin dependencies

# Development
npm run backend:dev         # Development server
npm run frontend:dev        # Development frontend
npm run admin:dev           # Development admin portal
```

## 🔐 Security Notes
- All API keys are encrypted at rest
- JWT tokens for secure authentication
- Role-based access control
- Input validation and sanitization

## 📊 Core Features
- Multi-model AI support (OpenAI, Anthropic, Ollama)
- File uploads (images, PDFs, documents)
- Real-time chat with WebSockets
- Conversation memory and context
- Speech-to-text and text-to-speech
- Advanced search with MeiliSearch
- Plugin system and custom endpoints

## 🚀 Production Checklist
- [ ] Set all required environment variables
- [ ] Configure librechat.yaml for your needs
- [ ] Create admin user after deployment
- [ ] Test both LibreChat and Admin Portal
- [ ] Monitor logs for any issues

## 📞 Support
For issues, check logs in Railway dashboard or review the configuration files.
