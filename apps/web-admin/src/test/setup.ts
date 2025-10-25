import '@testing-library/jest-dom';

// Set up test environment
beforeAll(() => {
  // Set up any global test environment configurations
  // NODE_ENV is read-only, so we'll set other test environment variables
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ntsamaela_test';
});

// Clean up after each test
afterEach(() => {
  // Clean up any test environment configurations
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test configuration
jest.setTimeout(10000);

// Mock Next.js
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    defaultLocale: 'en',
    domainLocales: [],
    isPreview: false,
    route: '/',
    asPath: '/',
    query: {},
    pathname: '/',
    basePath: '',
    locale: 'en',
    locales: ['en'],
  }),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return {
      type: 'a',
      props: { href, ...props, children }
    };
  };
});

jest.mock('next/image', () => {
  return ({ src, alt, ...props }: any) => {
    return {
      type: 'img',
      props: { src, alt, ...props }
    };
  };
});

// Mock Material-UI
jest.mock('@mui/material', () => {
  const MUI = jest.requireActual('@mui/material');
  return {
    ...MUI,
    useTheme: () => ({
      palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
        background: { default: '#ffffff', paper: '#ffffff' },
        text: { primary: '#000000', secondary: '#666666' },
      },
      typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
      },
      spacing: (factor: number) => `${8 * factor}px`,
    }),
  };
});

// Mock react-query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';

// Global test utilities
(global as any).testUtils = {
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  generateTestEmail: () => `test-${Date.now()}@example.com`,
  generateTestPhone: () => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  mockRouter: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    defaultLocale: 'en',
    domainLocales: [],
    isPreview: false,
    route: '/',
    asPath: '/',
    query: {},
    pathname: '/',
    basePath: '',
    locale: 'en',
    locales: ['en'],
  },
};
