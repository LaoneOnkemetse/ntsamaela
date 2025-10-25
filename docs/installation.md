# Installation Guide

This guide will help you set up the Ntsamaela development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **PostgreSQL** 13.0 or higher
- **Redis** 6.0 or higher
- **Git** 2.0 or higher
- **Docker** and **Docker Compose** (optional, for containerized development)

### Platform-Specific Prerequisites

#### macOS
```bash
# Install Homebrew if you haven't already
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install PostgreSQL
brew install postgresql
brew services start postgresql

# Install Redis
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows
1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
3. Install Redis from [redis.io](https://redis.io/download) or use WSL2

## Installation Methods

### Method 1: Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ntsamaela.git
   cd ntsamaela
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install API dependencies
   cd apps/api && npm install && cd ..
   
   # Install mobile app dependencies
   cd apps/mobile && npm install && cd ..
   
   # Install admin dashboard dependencies
   cd apps/web-admin && npm install && cd ..
   
   # Install shared package dependencies
   cd packages/shared && npm install && cd ..
   
   # Install database package dependencies
   cd packages/database && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the environment file with your configuration
   nano .env
   ```

4. **Set up the database**
   ```bash
   # Create the database
   createdb ntsamaela
   createdb ntsamaela_test
   
   # Generate Prisma client
   npm run db:generate
   
   # Push the database schema
   npm run db:push
   
   # Seed the database (optional)
   npm run db:seed
   ```

5. **Start the development servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individual services
   npm run dev:api      # API server on http://localhost:3000
   npm run dev:mobile   # Mobile app on http://localhost:19000
   npm run dev:admin    # Admin dashboard on http://localhost:3001
   ```

### Method 2: Docker Installation (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ntsamaela.git
   cd ntsamaela
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   # Build and start all services
   docker-compose up --build
   
   # Or run in detached mode
   docker-compose up -d --build
   ```

4. **Access the services**
   - API: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - Mobile App: http://localhost:19000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Method 3: Using Make (Convenience)

1. **Clone and setup**
   ```bash
   git clone https://github.com/your-org/ntsamaela.git
   cd ntsamaela
   make setup
   ```

2. **Start development**
   ```bash
   make dev
   ```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ntsamaela"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ntsamaela_test"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# AWS Configuration (for document storage and AI services)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="ntsamaela-documents"

# Google Cloud Configuration (for OCR)
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project"
GOOGLE_CLOUD_KEY_FILE="path/to/service-account-key.json"

# Firebase Configuration (for notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# Payment Configuration
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
PAYSTACK_SECRET_KEY="sk_test_your-paystack-secret-key"

# Google Maps Configuration
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Application Configuration
NODE_ENV="development"
PORT="3000"
```

### Optional Environment Variables

```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# File Upload Configuration
MAX_FILE_SIZE="5242880"
UPLOAD_PATH="./uploads"

# Verification Configuration
VERIFICATION_AUTO_APPROVE_THRESHOLD="25"
VERIFICATION_MANUAL_REVIEW_THRESHOLD="75"
VERIFICATION_AUTO_REJECT_THRESHOLD="100"

# Commission Configuration
COMMISSION_RATE="0.30"
```

## Database Setup

### PostgreSQL Setup

1. **Create databases**
   ```sql
   CREATE DATABASE ntsamaela;
   CREATE DATABASE ntsamaela_test;
   ```

2. **Create user (optional)**
   ```sql
   CREATE USER ntsamaela_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE ntsamaela TO ntsamaela_user;
   GRANT ALL PRIVILEGES ON DATABASE ntsamaela_test TO ntsamaela_user;
   ```

3. **Run migrations**
   ```bash
   npm run db:generate
   npm run db:push
   ```

### Redis Setup

Redis is used for caching and real-time features. Make sure it's running:

```bash
# Start Redis
redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

## Mobile App Setup

### iOS Development

1. **Install Xcode** (macOS only)
   - Download from the Mac App Store
   - Install Xcode Command Line Tools: `xcode-select --install`

2. **Install iOS Simulator**
   - Open Xcode
   - Go to Xcode > Preferences > Components
   - Download iOS Simulator

3. **Install CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

### Android Development

1. **Install Android Studio**
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK and build tools

2. **Set up environment variables**
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **Create Android Virtual Device (AVD)**
   - Open Android Studio
   - Go to Tools > AVD Manager
   - Create a new virtual device

## Verification

After installation, verify everything is working:

1. **Check API health**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check database connection**
   ```bash
   npm run db:studio
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Check mobile app**
   - Open http://localhost:19000 in your browser
   - Scan QR code with Expo Go app

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database connection failed**
   - Check PostgreSQL is running
   - Verify connection string in `.env`
   - Check firewall settings

3. **Node modules issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Mobile app not loading**
   - Check Expo CLI is installed: `npm install -g @expo/cli`
   - Clear Expo cache: `expo r -c`
   - Restart Metro bundler

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Search existing issues in the repository
3. Create a new issue with detailed information
4. Contact the development team

## Next Steps

After successful installation:

1. Read the [Quick Start Guide](./quick-start.md)
2. Review the [Development Workflow](./development-workflow.md)
3. Check the [API Documentation](./api.md)
4. Explore the [Mobile App Guide](./mobile-app.md)

---

**Last Updated**: $(date)
**Version**: 1.0.0













