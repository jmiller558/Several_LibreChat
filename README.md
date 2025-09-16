# LibreChat

<p align="center">
  <img src="client/public/assets/logo.svg" height="256" alt="LibreChat Logo">
</p>

<p align="center">
  <strong>Enhanced AI-Powered Conversational Platform</strong>
</p>

<p align="center">
  <a href="https://discord.librechat.ai">
    <img src="https://img.shields.io/discord/1086345563026489514?label=&logo=discord&style=for-the-badge&logoWidth=20&logoColor=white&labelColor=000000&color=blueviolet" alt="Discord">
  </a>
  <a href="https://docs.librechat.ai">
    <img src="https://img.shields.io/badge/DOCS-blue.svg?style=for-the-badge&logo=read-the-docs&logoColor=white&labelColor=000000&logoWidth=20" alt="Documentation">
  </a>
  <img src="https://img.shields.io/badge/VERSION-v0.8.0--rc3-green.svg?style=for-the-badge" alt="Version">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Installation](#️-installation)
- [🐳 Docker Deployment](#-docker-deployment)
- [⚙️ Configuration](#️-configuration)
- [🔧 Development](#-development)
- [🎯 Usage](#-usage)
- [📚 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🆘 Support](#-support)

---

## Overview

LibreChat is a comprehensive, open-source AI conversation platform that provides a unified interface for multiple AI models and services. Built with modern web technologies, it offers a ChatGPT-like experience while supporting various AI providers including OpenAI, Anthropic, Google, Azure, and custom endpoints.

This enhanced version includes advanced features like multi-user support, conversation management, plugin system, and extensive customization options.

---

## ✨ Key Features

### 🤖 **Multi-AI Provider Support**
- **OpenAI**: GPT-3.5, GPT-4, GPT-4 Turbo, DALL-E
- **Anthropic**: Claude 3 (Haiku, Sonnet, Opus), Claude 2
- **Google**: Gemini Pro, PaLM 2
- **Azure OpenAI**: All OpenAI models via Azure
- **Custom Endpoints**: Support for any OpenAI-compatible API
- **Local Models**: Ollama, LocalAI, and other local deployments

### 🎨 **Advanced User Interface**
- **Modern Design**: Responsive, intuitive ChatGPT-inspired interface
- **Dark/Light Themes**: Customizable appearance
- **Multi-language Support**: Internationalization (i18n) ready
- **Real-time Updates**: Live conversation updates
- **Mobile Responsive**: Optimized for all devices

### 💬 **Conversation Management**
- **Multi-session Support**: Handle multiple conversations simultaneously
- **Message History**: Persistent conversation storage
- **Export/Import**: Backup and restore conversations
- **Search Functionality**: Find messages across all conversations
- **Conversation Sharing**: Share conversations with other users

### 🔧 **Advanced Capabilities**
- **Plugin System**: Extensible architecture for custom plugins
- **File Uploads**: Support for documents, images, and various file types
- **Code Execution**: Built-in code interpreter with sandboxed execution
- **Web Search**: Integrated search capabilities
- **Speech-to-Text**: Voice input support
- **Text-to-Speech**: Audio output functionality

### 👥 **Multi-User Features**
- **User Authentication**: Secure login with multiple providers
- **Role-based Access**: Admin, user, and guest roles
- **Usage Tracking**: Monitor API usage and costs
- **Rate Limiting**: Configurable usage limits
- **User Management**: Administrative tools for user control

### 🛡️ **Security & Privacy**
- **Data Encryption**: Secure data storage and transmission
- **Privacy Controls**: Configurable data retention policies
- **Audit Logging**: Comprehensive activity tracking
- **Content Moderation**: Built-in content filtering
- **GDPR Compliance**: Privacy regulation compliance features

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or 20.x
- **MongoDB** 4.4+
- **Redis** (optional, for caching)
- **Docker** (for containerized deployment)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/danny-avila/LibreChat.git
cd LibreChat

# Copy environment file
cp .env.example .env

# Edit your environment variables
nano .env

# Start with Docker Compose
docker compose up -d
```

### Option 2: Manual Installation

```bash
# Clone and install dependencies
git clone https://github.com/danny-avila/LibreChat.git
cd LibreChat
npm ci

# Build the application
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run frontend

# Start the application
npm run backend
```

Access the application at `http://localhost:3080`

---

## 🛠️ Installation

### System Requirements

- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 10GB free space minimum
- **CPU**: 2+ cores recommended
- **OS**: Linux, macOS, or Windows with WSL2

### Detailed Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/danny-avila/LibreChat.git
   cd LibreChat
   ```

2. **Install Dependencies**
   ```bash
   npm ci
   ```

3. **Build Components**
   ```bash
   # Build data provider
   npm run build:data-provider
   
   # Build data schemas
   npm run build:data-schemas
   
   # Build API package
   npm run build:api
   
   # Build client package
   npm run build:client-package
   
   # Build frontend
   npm run frontend
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Setup Database**
   ```bash
   # Ensure MongoDB is running
   # The application will create necessary collections automatically
   ```

6. **Start the Application**
   ```bash
   # Development mode
   npm run backend:dev
   npm run frontend:dev
   
   # Production mode
   npm run backend
   ```

---

## 🐳 Docker Deployment

### Using Docker Compose

The project includes comprehensive Docker configurations for easy deployment:

```bash
# Standard deployment
docker compose up -d

# Deployed/production configuration
npm run start:deployed

# Stop deployment
npm run stop:deployed
```

### Environment Variables

Key environment variables for Docker deployment:

```env
# Core Configuration
PORT=3080
HOST=0.0.0.0
MONGO_URI=mongodb://mongodb:27017/LibreChat

# AI Provider APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Authentication
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Optional Services
REDIS_URI=redis://redis:6379
MEILISEARCH_HOST=http://meilisearch:7700
RAG_API_URL=http://rag_api:8000
```

### Custom Docker Override

Create a `docker-compose.override.yml` for custom configurations:

```yaml
services:
  api:
    environment:
      - CUSTOM_ENV_VAR=value
    volumes:
      - ./custom-config:/app/custom-config
```

---

## ⚙️ Configuration

### LibreChat Configuration (`librechat.yaml`)

The main configuration file supports extensive customization:

```yaml
# Configuration version
version: 1.2.1

# Enable caching
cache: true

# File storage strategies
fileStrategy:
  avatar: "local"      # User avatars
  image: "local"       # Chat images
  document: "local"    # Document uploads

# Custom endpoints
endpoints:
  custom:
    - name: "Local Ollama"
      apiKey: "not-needed"
      baseURL: "http://localhost:11434/v1"
      models:
        default: ["llama2", "codellama"]

# Authentication providers
registration:
  socialLogins: ["google", "github", "discord"]
```

### Available Scripts

The project includes numerous utility scripts:

```bash
# User Management
npm run create-user          # Create a new user
npm run list-users           # List all users
npm run ban-user             # Ban a user
npm run delete-user          # Delete a user
npm run reset-password       # Reset user password

# Data Management
npm run add-balance          # Add balance to user
npm run set-balance          # Set user balance
npm run list-balances        # List user balances
npm run user-stats           # Get user statistics

# System Maintenance
npm run update               # Update dependencies
npm run update:deployed      # Update deployed instance
npm run reset-meili-sync     # Reset search index
npm run backend:stop         # Stop backend server
```

---

## 🔧 Development

### Development Environment Setup

1. **Install Development Dependencies**
   ```bash
   npm install
   npm run build:data-provider
   npm run build:data-schemas
   npm run build:api
   ```

2. **Start Development Servers**
   ```bash
   # Backend (API server)
   npm run backend:dev
   
   # Frontend (React development server)
   npm run frontend:dev
   ```

3. **Development URLs**
   - Frontend: `http://localhost:3090`
   - Backend API: `http://localhost:3080`
   - MongoDB: `mongodb://localhost:27017`

### Project Structure

```
LibreChat/
├── api/                     # Backend API server
│   ├── app/                # Core application logic
│   ├── config/             # Configuration files
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   └── server/             # Server setup
├── client/                 # Frontend React application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── dist/              # Built frontend
├── packages/              # Shared packages
│   ├── data-provider/     # Data layer abstraction
│   ├── data-schemas/      # Shared data schemas
│   └── api/               # API utilities
├── admin/                 # Admin panel
├── config/                # Configuration scripts
├── e2e/                   # End-to-end tests
├── redis-config/          # Redis configurations
└── utils/                 # Utility scripts
```

### Code Quality Tools

- **ESLint**: Code linting with custom configuration
- **Prettier**: Code formatting
- **TypeScript**: Type checking for enhanced development
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing

---

## 🎯 Usage

### Basic Usage

1. **Access the Application**
   - Navigate to `http://localhost:3080`
   - Create an account or log in

2. **Start a Conversation**
   - Select an AI model from the dropdown
   - Type your message and press Enter
   - View AI responses in real-time

3. **Advanced Features**
   - Upload files for analysis
   - Use voice input/output
   - Switch between models mid-conversation
   - Save and share conversations

### API Usage

LibreChat provides a comprehensive REST API:

```javascript
// Example: Send a message
const response = await fetch('/api/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    text: 'Hello, AI!',
    conversationId: 'conv-123',
    model: 'gpt-4'
  })
});
```

### Plugin Development

Create custom plugins to extend functionality:

```javascript
// Example plugin structure
export const customPlugin = {
  name: 'Custom Plugin',
  version: '1.0.0',
  description: 'A custom plugin example',
  
  async execute(context) {
    // Plugin logic here
    return result;
  }
};
```

---

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Conversation Endpoints

- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Message Endpoints

- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

### File Endpoints

- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Delete file

### Admin Endpoints

- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# API tests
npm run test:api

# Client tests
npm run test:client

# End-to-end tests
npm run e2e

# Run tests with coverage
npm run test:coverage
```

### Test Configuration

- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: Supertest for API testing
- **E2E Tests**: Playwright for browser automation
- **Test Database**: Separate MongoDB instance for testing

### Writing Tests

```javascript
// Example unit test
describe('Message Service', () => {
  test('should create a new message', async () => {
    const message = await messageService.create({
      text: 'Test message',
      conversationId: 'test-conv'
    });
    
    expect(message.text).toBe('Test message');
    expect(message.conversationId).toBe('test-conv');
  });
});
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Development Workflow

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/LibreChat.git
   cd LibreChat
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Set Up Development Environment**
   ```bash
   npm ci
   npm run build:data-provider
   npm run build:data-schemas
   npm run build:api
   ```

4. **Make Changes and Test**
   ```bash
   npm run test
   npm run e2e
   ```

5. **Submit Pull Request**
   - Follow our PR template
   - Include tests for new features
   - Update documentation as needed

### Code Standards

- **Code Style**: Follow ESLint configuration
- **Commits**: Use conventional commit messages
- **Documentation**: Update relevant documentation
- **Tests**: Maintain test coverage above 80%

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🌍 Translations and localization
- 🧪 Test coverage expansion
- 🎨 UI/UX improvements

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **React**: MIT License
- **Node.js**: MIT License
- **MongoDB**: Server Side Public License
- **Redis**: BSD License

---

## 🆘 Support

### Getting Help

- **📖 Documentation**: [docs.librechat.ai](https://docs.librechat.ai)
- **💬 Discord Community**: [discord.librechat.ai](https://discord.librechat.ai)
- **🐛 GitHub Issues**: [Report bugs and request features](https://github.com/danny-avila/LibreChat/issues)
- **📧 Email Support**: support@librechat.ai

### Troubleshooting

#### Common Issues

1. **Installation Problems**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   systemctl status mongod
   
   # Restart MongoDB
   systemctl restart mongod
   ```

3. **Port Conflicts**
   ```bash
   # Check what's using port 3080
   lsof -i :3080
   
   # Kill process if needed
   kill -9 <PID>
   ```

#### Performance Optimization

- **Memory Usage**: Monitor with `npm run user-stats`
- **Database Optimization**: Regular index maintenance
- **Caching**: Enable Redis for better performance
- **Load Balancing**: Use reverse proxy for production

### Community Guidelines

- Be respectful and inclusive
- Search existing issues before creating new ones
- Provide detailed bug reports with reproducible steps
- Follow our code of conduct in all interactions

---

<p align="center">
  <strong>Made with ❤️ by the LibreChat Community</strong>
</p>

<p align="center">
  <a href="https://github.com/danny-avila/LibreChat/stargazers">⭐ Star us on GitHub</a> •
  <a href="https://discord.librechat.ai">💬 Join our Discord</a> •
  <a href="https://docs.librechat.ai">📖 Read the Docs</a>
</p>
