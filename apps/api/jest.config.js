module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/$1',
    '^@database/(.*)$': '<rootDir>/../../packages/database/index.js',
    '^@testing/(.*)$': '<rootDir>/../../packages/testing/$1',
  },
  // Use manual mocks for missing modules
  moduleDirectories: ['node_modules', '<rootDir>/src/services/__tests__/__mocks__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  extensionsToTreatAsEsm: [],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  modulePathIgnorePatterns: ['node_modules'],
  // Allow manual mocks for missing modules
  automock: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/index.ts',
  ],
  coverageDirectory: '<rootDir>/../../coverage/api',
  testTimeout: 10000,
  verbose: true,
};
