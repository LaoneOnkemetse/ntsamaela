import { setupTestDatabase, cleanupTestDatabase } from './database';
import { mockAWS } from './aws';

beforeAll(async () => {
  // Set test environment variables
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  Object.defineProperty(process.env, 'JWT_SECRET', { value: 'test-jwt-secret', writable: true });
  Object.defineProperty(process.env, 'DATABASE_URL', { value: 'postgresql://test:test@localhost:5432/ntsamaela_test', writable: true });
  
  // Setup mocks
  mockAWS();
  
  // Setup test database
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

beforeEach(async () => {
  // Clean up data before each test
  await setupTestDatabase();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
