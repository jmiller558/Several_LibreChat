# Railway Deployment Guide - Fixing Notion MCP Server 401 Error

## Problem
The Notion MCP server is returning a 401 Unauthorized error because the `NOTION_API_KEY` environment variable is not properly configured in your Railway deployment.

## Solution Steps

### 1. Get Your Notion Integration Token

1. Go to [Notion Developers](https://developers.notion.com/)
2. Click "My integrations" or "New integration"
3. Create a new integration with these settings:
   - **Name**: LibreChat Integration (or any name you prefer)
   - **Associated workspace**: Select your Notion workspace
   - **Type**: Internal
4. Copy the "Internal Integration Token" (starts with `secret_`)

### 2. Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Navigate to the **"Variables"** tab
3. Add the following environment variable:
   - **Key**: `NOTION_API_KEY`
   - **Value**: `secret_your_notion_token_here` (paste your actual token)

### 3. Additional Required Environment Variables for Railway

Make sure these environment variables are also set in Railway:

```env
# Required for LibreChat
CONFIG_PATH=/app/librechat.yaml
NODE_ENV=production
HOST=0.0.0.0
PORT=3080

# Database (if using Railway's database services)
MONGO_URI=your_mongodb_connection_string

# Optional but recommended
MEILI_MASTER_KEY=your_meilisearch_master_key
```

### 4. Grant Notion Integration Permissions

1. In Notion, go to any page or database you want LibreChat to access
2. Click the "..." menu → "Add connections"
3. Select your LibreChat integration
4. Grant appropriate permissions:
   - **Read content**
   - **Update content** 
   - **Insert content** (if you want to create new pages)

### 5. Deploy and Test

1. After setting the environment variables, Railway will automatically redeploy
2. Wait for the deployment to complete
3. Test the Notion MCP server connection in LibreChat

## Verification

To verify the fix worked:

1. Open LibreChat in your browser
2. Go to the MCP servers section in settings
3. Check if the Notion server shows as "Connected"
4. Try using a Notion-related tool in a conversation

## Alternative: Per-User Configuration

If you prefer per-user Notion access instead of system-wide:

1. Remove the `NOTION_API_KEY` from Railway environment variables
2. Users can set their individual Notion tokens in LibreChat:
   - Go to MCP Server settings
   - Configure "Notion Integration Token" for their account
   - Each user uses their own Notion integration

## Troubleshooting

- **Still getting 401?** Double-check the token format (should start with `secret_`)
- **Token not working?** Verify the integration has permissions to access your Notion pages
- **Server not starting?** Check Railway logs for any other missing environment variables

## Files Modified

- `railway.json` - Railway deployment configuration
- `.dockerignore` - Updated to include necessary config files
- `librechat.yaml` - Already configured with Notion MCP server

The configuration in your `librechat.yaml` is correct and will automatically use the `NOTION_API_KEY` environment variable once it's set in Railway.
