import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initializePrisma } from '@database/index';

// Load environment variables
config();

// Set JWT secret for tests
process.env.JWT_SECRET = 'test-secret-key-for-wallet-tests';

// Initialize Prisma client after environment variables are loaded
initializePrisma();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Import and mount wallet routes
import walletRoutes from '../../routes/wallet';
app.use('/api/wallet', walletRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

export { app };
