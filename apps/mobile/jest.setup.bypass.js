// Jest setup for mobile app
// Note: @testing-library/jest-native is deprecated, using built-in matchers

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

// Mock React Native modules that might cause issues
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Note: React Navigation is not used in this app (custom navigation system)
// No need to mock it
