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

// Mock navigation (works even if the package isn't installed in test env)
try {
  // If module exists, provide a functional mock
  require.resolve('@react-navigation/native');
  jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: jest.fn(),
  }));
} catch (_) {
  // If module does not exist, register a virtual mock to satisfy imports
  jest.mock(
    '@react-navigation/native',
    () => ({
      useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        dispatch: jest.fn(),
      }),
      useRoute: () => ({ params: {} }),
      useFocusEffect: jest.fn(),
    }),
    { virtual: true }
  );
}
