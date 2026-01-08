import { config } from 'dotenv';
import { initializePrisma } from '@database/index';
import { app, server, PORT } from './app';

// Load environment variables (Railway provides these automatically)
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  config({ path: '../../.env' });
}

// Initialize Prisma client after environment variables are loaded
initializePrisma();

// All middleware and routes are already configured in app.ts

// Start server - listen on 0.0.0.0 to accept connections from outside container
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 API base: http://0.0.0.0:${PORT}/api`);
  console.log(`🔌 Socket.IO enabled for real-time features`);
});

export default app;



