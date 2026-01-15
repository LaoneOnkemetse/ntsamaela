import { config } from 'dotenv';
import { app, server, PORT } from './app';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables (Railway provides these automatically)
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  config({ path: '../../.env' });
}

// All middleware and routes are already configured in app.ts
// Prisma is already initialized in app.ts

// Ensure admin user exists on startup
async function ensureAdminUser() {
  try {
    const prisma = new PrismaClient();
    const ADMIN_EMAIL = 'Plutonium94@ntsamaela.com';
    const ADMIN_PASSWORD = 'pLuto@.*123hash';
    const ADMIN_FIRST_NAME = 'Plutonium';
    const ADMIN_LAST_NAME = 'Administrator';
    const ADMIN_PHONE = '+26771234567';

    console.log('🔐 Ensuring permanent admin user exists...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash: passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        phone: ADMIN_PHONE,
        userType: 'ADMIN',
        identityVerified: true,
        emailVerified: true,
      },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        phone: ADMIN_PHONE,
        userType: 'ADMIN',
        identityVerified: true,
        emailVerified: true,
      },
    });

    console.log('✅ Admin user ensured:', ADMIN_EMAIL);
    await prisma.$disconnect();
  } catch (error) {
    console.error('⚠️  Failed to ensure admin user:', error);
    // Don't exit - server should still start
  }
}

// Run admin user seeding before starting server
ensureAdminUser();

// Add error handlers
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server - listen on 0.0.0.0 to accept connections from outside container
try {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🔗 API base: http://0.0.0.0:${PORT}/api`);
    console.log(`🔌 Socket.IO enabled for real-time features`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

    switch (error.code) {
      case 'EACCES':
        console.error(`❌ ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`❌ ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

export default app;



