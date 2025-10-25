// Simple test setup for smoke tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_JWT_SECRET = 'test-admin-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ntsamaela_test';
process.env.DISABLE_PRISMA = 'true';
process.env.PORT = '3001';

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('AWS SDK')) {
    return; // Suppress AWS SDK warnings
  }
  originalWarn.apply(console, args);
};

// Set test timeout
jest.setTimeout(10000);
