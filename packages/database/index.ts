// Mock Prisma client when disabled
let prisma: any = null;

// Function to create Prisma client with proper environment variables
function createPrismaClient() {
  if (process.env.NODE_ENV !== 'test') {
    console.log('Creating Prisma client...');
    console.log('DISABLE_PRISMA:', process.env.DISABLE_PRISMA);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('Full DATABASE_URL:', process.env.DATABASE_URL);
  }
  
  if (process.env.DISABLE_PRISMA === 'true') {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Prisma client disabled by environment variable');
    }
    return null;
  }

  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found, Prisma client will be null');
    return null;
  }

  try {
    if (process.env.DISABLE_PRISMA === 'true') {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Prisma client disabled by environment variable');
      }
      return null;
    }

    const { PrismaClient } = require('@prisma/client');
    if (process.env.NODE_ENV !== 'test') {
      console.log('PrismaClient imported successfully');
    }
    
    // Global Prisma client instance
    const globalForPrisma = globalThis as unknown as {
      prisma: typeof PrismaClient | undefined;
    };

    const client = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
    if (process.env.NODE_ENV !== 'test') {
      console.log('Prisma client created successfully');
    }
    return client;
  } catch (error) {
    console.warn('Prisma client disabled due to error:', error);
    return null;
  }
}

// Initialize Prisma client (will be called explicitly after env vars are loaded)
// prisma = createPrismaClient();

// Function to reinitialize Prisma client with new environment variables
export function initializePrisma() {
  if (process.env.NODE_ENV !== 'test') {
    console.log('=== INITIALIZING PRISMA CLIENT ===');
  }
  prisma = createPrismaClient();
  if (process.env.NODE_ENV !== 'test') {
    console.log('Prisma client initialized:', !!prisma);
    console.log('Prisma client type:', typeof prisma);
    console.log('=== PRISMA INITIALIZATION COMPLETE ===');
  }
  return prisma;
}

// Export the prisma client
export { prisma };

// Export a function to get the current prisma client
export function getPrismaClient() {
  // Always return mock client for development
  if (process.env.DISABLE_PRISMA === 'true' || !prisma) {
    console.warn('Using mock database client for development');
    return {
      user: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      package: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      trip: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      driver: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      bid: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      wallet: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      transaction: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      chatRoom: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      chatMessage: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      notification: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      packageTracking: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      verification: { 
        findMany: () => Promise.resolve([]), 
        findUnique: () => Promise.resolve(null),
        create: () => Promise.resolve({}), 
        update: () => Promise.resolve({}), 
        delete: () => Promise.resolve({}) 
      },
      $transaction: (fn: any) => Promise.resolve(fn({})),
      $disconnect: () => Promise.resolve()
    } as any;
  }
  return prisma;
}

// Export types (only if Prisma is available)
try {
  if (process.env.DISABLE_PRISMA !== 'true') {
    const types = require('@prisma/client');
    Object.keys(types).forEach(key => {
      if (key !== 'PrismaClient') {
        exports[key] = types[key];
      }
    });
  }
} catch (error) {
  console.warn('Prisma types disabled due to error:', error);
}

// Database connection helper
export async function connectDatabase() {
  try {
    if (prisma) {
      await prisma.$connect();
      console.log('Database connected successfully');
    } else {
      console.log('Database connection skipped - Prisma disabled');
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Database disconnection helper
export async function disconnectDatabase() {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('Database disconnected successfully');
    } else {
      console.log('Database disconnection skipped - Prisma disabled');
    }
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
}


