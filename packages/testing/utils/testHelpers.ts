import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function for React components
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

// Test data generators
export const generateTestId = (prefix: string = 'test'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateTestEmail = (): string => {
  return `test-${Date.now()}@example.com`;
};

export const generateTestPhone = (): string => {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
};

// Async test helpers
export const waitForElementToBeRemoved = (element: Element): Promise<void> => {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

// Mock function helpers
export const createMockFunction = <T extends (...args: any[]) => any>(
  returnValue?: ReturnType<T>
) => {
  return jest.fn().mockReturnValue(returnValue);
};

// Test environment helpers
export const setupTestEnvironment = () => {
  // Set up any global test environment configurations
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ntsamaela_test';
};

export const cleanupTestEnvironment = () => {
  // Clean up any test environment configurations
  jest.clearAllMocks();
  jest.clearAllTimers();
};
