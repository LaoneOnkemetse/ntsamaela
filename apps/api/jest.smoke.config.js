module.exports = {
  displayName: 'Smoke Tests',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/smoke.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-simple.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/$1',
    '^@database/(.*)$': '<rootDir>/../../packages/database/$1',
    '^@testing/(.*)$': '<rootDir>/../../packages/testing/$1',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 10000,
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
};
