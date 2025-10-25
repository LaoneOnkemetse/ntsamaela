# Ntsamaela Testing Guide

This document provides a comprehensive guide to testing the Ntsamaela platform, including unit tests, integration tests, E2E tests, and CI/CD pipeline.

## 📋 Table of Contents

- [Testing Overview](#testing-overview)
- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [CI/CD Pipeline](#cicd-pipeline)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Testing Overview

The Ntsamaela platform implements a comprehensive testing strategy with multiple layers:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components and services
- **E2E Tests**: Test complete user workflows across applications
- **Performance Tests**: Test application performance under load
- **Security Tests**: Test for vulnerabilities and security issues

## 🛠️ Testing Stack

### Core Testing Tools
- **Jest**: Primary testing framework for unit and integration tests
- **Supertest**: HTTP assertion library for API testing
- **Detox**: E2E testing framework for React Native
- **Cypress**: E2E testing framework for web applications
- **Testing Library**: Utilities for testing React components

### Testing Utilities
- **@testing/utils**: Shared testing utilities and helpers
- **Mock Data**: Comprehensive mock data generators
- **Test Database**: Database utilities for integration tests
- **Test Auth**: Authentication testing utilities

## 📁 Test Structure

```
ntsamaela/
├── jest.config.js                 # Root Jest configuration
├── packages/
│   └── testing/                   # Shared testing utilities
│       ├── utils/
│       │   ├── testHelpers.ts     # General test helpers
│       │   ├── apiHelpers.ts      # API testing helpers
│       │   ├── mockData.ts        # Mock data generators
│       │   ├── testDatabase.ts    # Database testing utilities
│       │   └── testAuth.ts        # Authentication testing utilities
│       └── index.ts               # Main exports
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── test/
│   │           ├── setup.ts       # API test setup
│   │           └── auth.test.ts   # Sample API tests
│   ├── mobile/
│   │   ├── src/
│   │   │   └── test/
│   │   │       ├── setup.ts       # Mobile test setup
│   │   │       └── components/    # Component tests
│   │   ├── e2e/                   # Detox E2E tests
│   │   │   ├── config.json
│   │   │   ├── init.js
│   │   │   └── auth.e2e.js
│   │   └── .detoxrc.js
│   └── web-admin/
│       └── src/
│           └── test/
│               ├── setup.ts       # Web admin test setup
│               └── components/    # Component tests
└── .github/
    └── workflows/
        └── ci.yml                 # GitHub Actions CI/CD
```

## 🚀 Running Tests

### Quick Start
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Application-Specific Tests
```bash
# API tests
npm run test:api

# Mobile app tests
npm run test:mobile

# Web admin tests
npm run test:web-admin

# Shared package tests
npm run test:shared
```

### Integration Tests
```bash
# All integration tests
npm run test:integration

# API integration tests
npm run test:integration:api

# Database integration tests
npm run test:integration:database
```

### E2E Tests
```bash
# Mobile E2E tests
npm run test:e2e:mobile

# Web admin E2E tests
npm run test:e2e:web-admin

# All E2E tests
npm run test:e2e
```

### Performance Tests
```bash
# API performance tests
npm run test:performance:api

# Web admin performance tests
npm run test:performance:web-admin

# All performance tests
npm run test:performance
```

### Security Tests
```bash
# Security audit
npm run security:audit

# Security scan
npm run test:security
```

## ✍️ Writing Tests

### Unit Tests

#### API Service Test Example
```typescript
import { authService } from '@/services/authService';
import { createMockUser } from '@testing/utils/mockData';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      userType: 'CUSTOMER' as const,
    };

    const result = await authService.register(userData);

    expect(result.success).toBe(true);
    expect(result.data.user.email).toBe(userData.email);
    expect(result.data.token).toBeDefined();
  });
});
```

#### React Component Test Example
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginScreen from '@/screens/auth/LoginScreen';

describe('LoginScreen', () => {
  it('should render login form correctly', () => {
    render(<LoginScreen />);

    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('should handle form submission', async () => {
    const mockLogin = jest.fn();
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Login'));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### Integration Tests

#### API Integration Test Example
```typescript
import request from 'supertest';
import { app } from '../index';
import { ApiTestHelper, expectSuccessResponse } from '@testing/utils/apiHelpers';

describe('Authentication API Integration', () => {
  let apiHelper: ApiTestHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper(app);
  });

  it('should register and login user', async () => {
    // Register user
    const registerResponse = await apiHelper.register({
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      userType: 'CUSTOMER',
    });

    expectSuccessResponse(registerResponse);

    // Login user
    const loginResponse = await apiHelper.login('test@example.com', 'testpassword123');

    expectSuccessResponse(loginResponse);
    expect(loginResponse.body.data.token).toBeDefined();
  });
});
```

### E2E Tests

#### Detox E2E Test Example
```javascript
describe('Authentication E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login successfully', async () => {
    await element(by.placeholder('Email')).typeText('test@example.com');
    await element(by.placeholder('Password')).typeText('testpassword123');
    await element(by.text('Login')).tap();
    
    await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(5000);
  });
});
```

## 🛠️ Test Utilities

### Mock Data Generators
```typescript
import { 
  createMockUser, 
  createMockPackage, 
  createMockTrip,
  createMockApiResponse 
} from '@testing/utils/mockData';

// Create mock user
const user = createMockUser({
  email: 'custom@example.com',
  userType: 'DRIVER',
});

// Create mock package
const package_ = createMockPackage({
  description: 'Custom package',
  priceOffered: 100,
});

// Create mock API response
const response = createMockApiResponse(user, true, 'Success');
```

### Database Testing Utilities
```typescript
import { TestDatabase, withTestDatabase } from '@testing/utils/testDatabase';

// Using test database helper
const testDb = new TestDatabase();
await testDb.connect();
await testDb.clean();

const user = await testDb.createTestUser();
const package_ = await testDb.createTestPackage(user.id);

await testDb.cleanup();
await testDb.disconnect();

// Using withTestDatabase wrapper
await withTestDatabase(async (db) => {
  const user = await db.createTestUser();
  const package_ = await db.createTestPackage(user.id);
  
  // Run tests...
});
```

### Authentication Testing Utilities
```typescript
import { TestAuth, createCustomerAuth, withAuth } from '@testing/utils/testAuth';

// Generate test token
const token = TestAuth.generateTestToken({ userId: 'test-user' });

// Create authenticated request
const authData = createCustomerAuth();
const request = withAuth(supertest(app), authData);

// Test authentication scenarios
const scenarios = TestAuth.getAuthTestScenarios();
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Lint and Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Jest tests for all applications
3. **Integration Tests**: API and database integration tests
4. **E2E Tests**: Detox for mobile, Cypress for web
5. **Security Tests**: Vulnerability scanning
6. **Performance Tests**: Load testing
7. **Build**: Application builds
8. **Deploy**: Staging and production deployments

### Pipeline Stages

```yaml
# Example workflow stages
jobs:
  lint: # Code quality checks
  unit-tests: # Unit tests with coverage
  integration-tests: # Integration tests with database
  api-tests: # API tests with running server
  mobile-e2e-ios: # iOS E2E tests
  mobile-e2e-android: # Android E2E tests
  web-admin-e2e: # Web admin E2E tests
  security-tests: # Security scanning
  performance-tests: # Performance testing
  build: # Application builds
  deploy-staging: # Staging deployment
  deploy-production: # Production deployment
```

## 📊 Test Coverage

### Coverage Targets
- **Overall**: 80% minimum
- **Business Logic**: 90% minimum
- **Critical Paths**: 95% minimum

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 🎯 Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** and isolated
5. **Use meaningful assertions** with clear error messages

### Test Data Management
1. **Use mock data generators** for consistent test data
2. **Clean up test data** after each test
3. **Use test databases** for integration tests
4. **Avoid hardcoded test data** in test files

### Performance Considerations
1. **Mock external services** in unit tests
2. **Use test databases** for integration tests
3. **Run E2E tests in parallel** when possible
4. **Optimize test setup** and teardown

### Security Testing
1. **Test authentication** and authorization
2. **Validate input sanitization**
3. **Test for common vulnerabilities**
4. **Use security scanning tools**

## 🔧 Troubleshooting

### Common Issues

#### Test Database Connection
```bash
# Ensure PostgreSQL is running
sudo service postgresql start

# Create test database
createdb ntsamaela_test

# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ntsamaela_test"
```

#### Detox E2E Tests
```bash
# Install Detox CLI
npm install -g detox-cli

# Build app for testing
cd apps/mobile
npx detox build --configuration ios.sim.debug

# Run E2E tests
npx detox test --configuration ios.sim.debug
```

#### Jest Configuration Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npx jest --verbose

# Debug Jest configuration
npx jest --showConfig
```

### Debugging Tests

#### Debug Unit Tests
```bash
# Run specific test file
npm test -- auth.test.ts

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.ts
```

#### Debug E2E Tests
```bash
# Run Detox in debug mode
npx detox test --configuration ios.sim.debug --loglevel trace

# Use Detox debugger
npx detox test --configuration ios.sim.debug --debug-synchronization 200
```

### Performance Optimization

#### Test Execution Time
```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Use Jest cache
npm test -- --cache

# Run only changed tests
npm test -- --onlyChanged
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

When adding new tests:

1. **Follow existing patterns** and conventions
2. **Add appropriate test coverage** for new features
3. **Update documentation** if needed
4. **Ensure tests pass** in CI/CD pipeline
5. **Add integration tests** for new API endpoints
6. **Add E2E tests** for new user workflows

For questions or issues with testing, please refer to the project's issue tracker or documentation.
