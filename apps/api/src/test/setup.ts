import '@testing-library/jest-dom';

// Set up test environment
beforeAll(() => {
  // Set up any global test environment configurations
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ntsamaela_test';
  process.env.DISABLE_PRISMA = 'true'; // Use mock database for tests
  
  // Suppress AWS SDK v2 deprecation warning in tests
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('AWS SDK for JavaScript (v2)')) {
      return; // Suppress AWS SDK v2 deprecation warning
    }
    originalWarn.apply(console, args);
  };
});

// Clean up after each test
afterEach(() => {
  // Clean up any test environment configurations
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test configuration
jest.setTimeout(10000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_JWT_SECRET = 'test-admin-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ntsamaela_test';
process.env.PORT = '3001';

// Mock external services
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock email service
jest.mock('@/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock SMS service
jest.mock('@/services/smsService', () => ({
  sendSms: jest.fn().mockResolvedValue({ success: true }),
  sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock payment service
jest.mock('@/services/paymentService', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'txn_123' }),
  refundPayment: jest.fn().mockResolvedValue({ success: true }),
  getPaymentStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
}));

// Mock file upload service
jest.mock('@/services/fileUploadService', () => ({
  uploadImage: jest.fn().mockResolvedValue({ url: 'https://example.com/uploaded.jpg' }),
  deleteImage: jest.fn().mockResolvedValue({ success: true }),
}));

// Global test utilities
(global as { testUtils?: unknown }).testUtils = {
  // Add any global test utilities here
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  generateTestEmail: () => `test-${Date.now()}@example.com`,
  generateTestPhone: () => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
};
