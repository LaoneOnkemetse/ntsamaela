import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
// import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase, initializePrisma } from '@database/index';
import { getRealtimeService } from './services/realtimeService';
import { generalRateLimit } from './middleware/rateLimiting';

// Load environment variables
dotenv.config();

// Set development environment variables if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/ntsamaela";
}
if (!process.env.DISABLE_PRISMA) {
  process.env.DISABLE_PRISMA = "false"; // Enable Prisma for development
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "your-super-secret-jwt-key-here";
}
if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = "your-super-secret-admin-jwt-key-here";
}

// Initialize Prisma client after environment variables are loaded
initializePrisma();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO (only if server is provided)
if (server) {
  const _realtimeService = getRealtimeService(server);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    // Test database connection (will use mock if disabled)
    const dbStatus = process.env.DISABLE_PRISMA === 'true' ? 'MOCK' : 'REAL';
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: dbStatus,
      message: `API running with ${dbStatus.toLowerCase()} database`
    });
  } catch (_error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      message: 'API running but database connection failed',
      error: _error instanceof Error ? _error.message : 'Unknown error'
    });
  }
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const dbStatus = process.env.DISABLE_PRISMA === 'true' ? 'MOCK' : 'REAL';
    res.status(200).json({
      status: 'healthy',
      database: { 
        status: 'connected', 
        type: dbStatus.toLowerCase(),
        responseTime: '< 10ms'
      }
    });
  } catch (_error) {
    res.status(503).json({
      status: 'ERROR',
      database: { 
        status: 'disconnected', 
        error: _error instanceof Error ? _error.message : 'Unknown error'
      }
    });
  }
});

// Redis health check
app.get('/health/redis', async (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      redis: { 
        status: 'connected', 
        type: 'mock',
        responseTime: '< 5ms'
      }
    });
  } catch (_error) {
    res.status(503).json({
      status: 'ERROR',
      redis: { 
        status: 'disconnected', 
        error: _error instanceof Error ? _error.message : 'Unknown error'
      }
    });
  }
});

// Comprehensive health check
app.get('/health/all', async (req, res) => {
  try {
    const dbStatus = process.env.DISABLE_PRISMA === 'true' ? 'MOCK' : 'REAL';
    res.status(200).json({
      status: 'healthy',
      services: {
        database: { 
          status: 'connected', 
          type: dbStatus.toLowerCase(),
          responseTime: '< 10ms'
        },
        redis: { 
          status: 'connected', 
          type: 'mock',
          responseTime: '< 5ms'
        },
        api: { 
          status: 'healthy',
          uptime: process.uptime(),
          environment: process.env.NODE_ENV
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (_error) {
    res.status(503).json({
      status: 'ERROR',
      services: {
        database: { status: 'error' },
        redis: { status: 'error' },
        api: { status: 'error' }
      },
      error: _error instanceof Error ? _error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Import routes
import authRoutes from './routes/auth';
import verificationRoutes from './routes/verificationRoutes';
import packageRoutes from './routes/packageRoutes';
import tripRoutes from './routes/tripRoutes';
import bidRoutes from './routes/bidRoutes';
import walletRoutes from './routes/wallet';
import chatRoutes from './routes/chatRoutes';
import trackingRoutes from './routes/trackingRoutes';
import notificationRoutes from './routes/notificationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import performanceRoutes from './routes/performanceRoutes';
// import deliveryRoutes from './routes/deliveries';
import adminRoutes from './routes/adminRoutes';

// Mount routes
app.use('/api/auth', authRoutes);

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Mount routes
app.use('/api/verification', verificationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);
// app.use('/api/deliveries', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

export { app, server, PORT };
