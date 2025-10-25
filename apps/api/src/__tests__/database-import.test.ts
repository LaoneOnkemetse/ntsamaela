// Test database import directly
import { initializePrisma, getPrismaClient } from '@database/index';

describe('Database Import Test', () => {
  test('should import initializePrisma function', () => {
    expect(typeof initializePrisma).toBe('function');
  });

  test('should import getPrismaClient function', () => {
    expect(typeof getPrismaClient).toBe('function');
  });

  test('should call initializePrisma without error', () => {
    expect(() => {
      initializePrisma();
    }).not.toThrow();
  });
});
