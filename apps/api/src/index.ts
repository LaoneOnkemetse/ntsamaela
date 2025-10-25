import { config } from 'dotenv';
import { initializePrisma } from '@database/index';
import { app, server, PORT } from './app';

// Load environment variables from root directory
config({ path: '../../.env' });

// Initialize Prisma client after environment variables are loaded
initializePrisma();

// All middleware and routes are already configured in app.ts

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO enabled for real-time features`);
});

export default app;



