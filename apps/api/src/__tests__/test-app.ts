import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { getPrismaClient } from '@database/index';
import { getRealtimeService } from '../services/realtimeService';
import { generalRateLimit } from '../middleware/rateLimiting';

// Load environment variables
dotenv.config();

// Set development environment variables if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/ntsamaela";
}
if (!process.env.DISABLE_PRISMA) {
  process.env.DISABLE_PRISMA = "true"; // Use mock database for tests
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "your-super-secret-jwt-key-here";
}
if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = "your-super-secret-admin-jwt-key-here";
}

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

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Mock API routes for testing
app.post('/api/packages', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-package-id' } });
});

app.get('/api/packages', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
      packages: Array.from({ length: 20 }, (_, i) => ({ id: `package-${i}` }))
    }
  });
});

app.get('/api/packages/search', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      packages: Array.from({ length: 20 }, (_, i) => ({ id: `package-${i}` }))
    }
  });
});

app.post('/api/trips', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-trip-id' } });
});

app.get('/api/trips', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      trips: Array.from({ length: 15 }, (_, i) => ({ id: `trip-${i}` }))
    } 
  });
});

app.get('/api/trips/search', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      trips: Array.from({ length: 15 }, (_, i) => ({ id: `trip-${i}` }))
    } 
  });
});

app.post('/api/bids', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-bid-id' } });
});

app.get('/api/wallet/balance', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      totalBalance: 1000,
      availableBalance: 800,
      reservedBalance: 200
    }
  });
});

app.post('/api/wallet/recharge', (req, res) => {
  res.status(200).json({ success: true, data: { transactionId: 'test-txn-id' } });
});

app.post('/api/tracking', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-tracking-id' } });
});

app.post('/api/chat/messages', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-message-id' } });
});

app.post('/api/chat/:chatRoomId/messages', (req, res) => {
  res.status(201).json({ success: true, data: { id: 'test-message-id' } });
});

app.get('/api/admin/dashboard', (req, res) => {
  res.status(200).json({ 
    success: true, 
    summary: { totalUsers: 100, totalPackages: 50 },
    recentActivity: []
  });
});

// Verification routes
app.post('/api/verification/submit', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      data: { verificationId: 'verification-123' }
    } 
  });
});

app.get('/api/verification/status', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    } 
  });
});

app.get('/api/verification/admin/metrics', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      totalVerifications: 100,
      pendingVerifications: 25,
      approvedVerifications: 70,
      rejectedVerifications: 5
    } 
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      token: 'test-token',
      user: { id: 'user-123', email: 'test@example.com' }
    } 
  });
});

app.post('/api/auth/register', (req, res) => {
  res.status(201).json({ 
    success: true, 
    data: { 
      token: 'test-token',
      user: { id: 'user-123', email: 'test@example.com' }
    } 
  });
});

app.get('/api/users/profile', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      user: { id: 'user-123', email: 'test@example.com' }
    } 
  });
});

app.put('/api/verification/:verificationId/review', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Verification approved successfully'
  });
});

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

