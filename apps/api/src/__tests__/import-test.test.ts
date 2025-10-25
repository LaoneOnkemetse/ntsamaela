// Simple test to verify database import works
import { initializePrisma, getPrismaClient } from '@database/index';

describe('Database Import Test', () => {
  it('should import initializePrisma function', () => {
    expect(typeof initializePrisma).toBe('function');
  });

  it('should import getPrismaClient function', () => {
    expect(typeof getPrismaClient).toBe('function');
  });

  it('should call initializePrisma without error', () => {
    expect(() => initializePrisma()).not.toThrow();
  });
});
