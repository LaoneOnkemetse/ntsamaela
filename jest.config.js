module.exports = {
  projects: [
    // API tests
    {
      displayName: 'API',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/apps/api/**/*.test.ts', '<rootDir>/apps/api/**/*.spec.ts'],
      preset: 'ts-jest',
      setupFilesAfterEnv: ['<rootDir>/apps/api/src/test/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/apps/api/src/$1',
        '^@shared/(.*)$': '<rootDir>/packages/shared/$1',
        '^@database/(.*)$': '<rootDir>/packages/database/dist/$1',
        '^@testing/(.*)$': '<rootDir>/packages/testing/$1',
      },
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      collectCoverageFrom: [
        'apps/api/src/**/*.ts',
        '!apps/api/src/**/*.d.ts',
        '!apps/api/src/test/**',
        '!apps/api/src/index.ts',
      ],
      coverageDirectory: '<rootDir>/coverage/api',
    },
            // Mobile tests
            {
              displayName: 'Mobile',
              testEnvironment: 'jsdom',
              testMatch: ['<rootDir>/apps/mobile/**/*.test.{ts,tsx,js,jsx}', '<rootDir>/apps/mobile/**/*.spec.{ts,tsx,js,jsx}'],
              setupFiles: ['<rootDir>/apps/mobile/__mocks__/react-native.js'],
              setupFilesAfterEnv: ['<rootDir>/apps/mobile/jest.setup.bypass.js'],
              moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/apps/mobile/src/$1',
                '^@shared/(.*)$': '<rootDir>/packages/shared/$1',
                '^@testing/(.*)$': '<rootDir>/packages/testing/$1',
                '^react-native$': '<rootDir>/apps/mobile/__mocks__/react-native.js',
              },
              transform: {
                '^.+\\.tsx?$': 'ts-jest',
                '^.+\\.js$': ['babel-jest', { configFile: './babel.config.jest.js' }],
              },
              transformIgnorePatterns: [
                'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@react-native-community|@react-native-async-storage|react-native-vector-icons|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|expo|expo-.*|@expo/.*)/)',
              ],
              collectCoverageFrom: [
                'apps/mobile/**/*.{js,jsx,ts,tsx}',
                '!apps/mobile/**/*.d.ts',
                '!apps/mobile/**/__tests__/**',
                '!apps/mobile/**/__mocks__/**',
                '!apps/mobile/**/node_modules/**',
                '!apps/mobile/**/*.test.*',
                '!apps/mobile/**/*.spec.*',
                '!apps/mobile/index.js',
                '!apps/mobile/babel.config.js',
                '!apps/mobile/jest.setup.bypass.js',
              ],
              coverageDirectory: '<rootDir>/coverage/mobile',
              coverageThreshold: {
                global: {
                  branches: 0,
                  functions: 0,
                  lines: 0,
                  statements: 0,
                },
              },
            },
    // Web Admin tests
    {
      displayName: 'Web Admin',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/apps/web-admin/**/*.test.ts', '<rootDir>/apps/web-admin/**/*.test.tsx', '<rootDir>/apps/web-admin/**/*.spec.ts', '<rootDir>/apps/web-admin/**/*.spec.tsx'],
      setupFilesAfterEnv: ['<rootDir>/apps/web-admin/src/test/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/apps/web-admin/src/$1',
        '^@shared/(.*)$': '<rootDir>/packages/shared/$1',
        '^@testing/(.*)$': '<rootDir>/packages/testing/$1',
      },
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
      },
      collectCoverageFrom: [
        'apps/web-admin/src/**/*.{ts,tsx}',
        '!apps/web-admin/src/**/*.d.ts',
        '!apps/web-admin/src/test/**',
        '!apps/web-admin/src/pages/_app.tsx',
        '!apps/web-admin/src/pages/_document.tsx',
      ],
      coverageDirectory: '<rootDir>/coverage/web-admin',
    },
    // Shared package tests
    {
      displayName: 'Shared',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/shared/**/*.test.ts', '<rootDir>/packages/shared/**/*.spec.ts'],
      moduleNameMapper: {
        '^@testing/(.*)$': '<rootDir>/packages/testing/$1',
      },
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      collectCoverageFrom: [
        'packages/shared/src/**/*.ts',
        '!packages/shared/src/**/*.d.ts',
        '!packages/shared/src/test/**',
      ],
      coverageDirectory: '<rootDir>/coverage/shared',
    },
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  testTimeout: 10000,
  verbose: true,
};


