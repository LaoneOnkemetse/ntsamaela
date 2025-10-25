import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createMockUser } from './mockData';

// Authentication test utilities
export class TestAuth {
  private static readonly TEST_SECRET = 'test-jwt-secret';

  // Generate test JWT token
  static generateTestToken(payload: any = {}) {
    const defaultPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    };

    return jwt.sign(
      { ...defaultPayload, ...payload },
      this.TEST_SECRET,
      { expiresIn: '1h' }
    );
  }

  // Verify test JWT token
  static verifyTestToken(token: string) {
    try {
      return jwt.verify(token, this.TEST_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Generate test password hash
  static async generateTestPasswordHash(password: string = 'testpassword123') {
    return bcrypt.hash(password, 10);
  }

  // Verify test password
  static async verifyTestPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  // Create test user with authentication data
  static createTestUserWithAuth(userData?: Partial<any>) {
    const user = createMockUser(userData);
    const token = this.generateTestToken({ userId: user.id, email: user.email });
    
    return {
      user,
      token,
      password: 'testpassword123',
      passwordHash: '$2b$10$test.hash.for.testing',
    };
  }

  // Create test authentication headers
  static createAuthHeaders(token?: string) {
    const authToken = token || this.generateTestToken();
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Create test request with authentication
  static createAuthenticatedRequest(request: any, token?: string) {
    const authToken = token || this.generateTestToken();
    return request.set('Authorization', `Bearer ${authToken}`);
  }

  // Mock authentication middleware
  static mockAuthMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7);
    const decoded = this.verifyTestToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  }

  // Mock admin authentication middleware
  static mockAdminAuthMiddleware(req: any, res: any, next: any) {
    this.mockAuthMiddleware(req, res, (err?: any) => {
      if (err) return next(err);
      
      // Add admin check logic here if needed
      req.user.isAdmin = true;
      next();
    });
  }

  // Create test session data
  static createTestSession(userId: string, userData?: Partial<any>) {
    return {
      userId,
      user: createMockUser({ id: userId, ...userData }),
      token: this.generateTestToken({ userId }),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  // Validate authentication response
  static validateAuthResponse(response: any) {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.token).toBeDefined();
    expect(typeof response.body.data.token).toBe('string');
  }

  // Validate authentication error response
  static validateAuthErrorResponse(response: any, expectedCode?: string) {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBeDefined();
    
    if (expectedCode) {
      expect(response.body.error.code).toBe(expectedCode);
    }
  }

  // Test authentication scenarios
  static getAuthTestScenarios() {
    return {
      validToken: {
        description: 'Valid authentication token',
        token: this.generateTestToken(),
        expectedStatus: 200,
      },
      invalidToken: {
        description: 'Invalid authentication token',
        token: 'invalid-token',
        expectedStatus: 401,
      },
      expiredToken: {
        description: 'Expired authentication token',
        token: jwt.sign(
          { userId: 'test', exp: Math.floor(Date.now() / 1000) - 3600 },
          this.TEST_SECRET
        ),
        expectedStatus: 401,
      },
      missingToken: {
        description: 'Missing authentication token',
        token: undefined,
        expectedStatus: 401,
      },
      malformedToken: {
        description: 'Malformed authentication token',
        token: 'Bearer invalid-token',
        expectedStatus: 401,
      },
    };
  }
}

// Authentication test helpers for different user types
export const createCustomerAuth = () => {
  return TestAuth.createTestUserWithAuth({ userType: 'CUSTOMER' });
};

export const createDriverAuth = () => {
  return TestAuth.createTestUserWithAuth({ userType: 'DRIVER' });
};

export const createAdminAuth = () => {
  return TestAuth.createTestUserWithAuth({ userType: 'CUSTOMER' }); // Admin is customer type
};

// Authentication test utilities for API testing
export const withAuth = (request: any, authData?: any) => {
  const auth = authData || createCustomerAuth();
  return TestAuth.createAuthenticatedRequest(request, auth.token);
};

export const withCustomerAuth = (request: any) => {
  return withAuth(request, createCustomerAuth());
};

export const withDriverAuth = (request: any) => {
  return withAuth(request, createDriverAuth());
};

export const withAdminAuth = (request: any) => {
  return withAuth(request, createAdminAuth());
};

// Authentication assertion helpers
export const expectAuthenticated = (response: any) => {
  expect(response.status).not.toBe(401);
  expect(response.body.error?.code).not.toBe('UNAUTHORIZED');
};

export const expectUnauthorized = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body.error?.code).toBe('UNAUTHORIZED');
};

export const expectForbidden = (response: any) => {
  expect(response.status).toBe(403);
  expect(response.body.error?.code).toBe('FORBIDDEN');
};

// Role-based access control test helpers
export const testRoleAccess = async (
  request: any,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
) => {
  const scenarios = [
    {
      name: 'Customer access',
      auth: createCustomerAuth(),
      expectedStatus: 200,
    },
    {
      name: 'Driver access',
      auth: createDriverAuth(),
      expectedStatus: 200,
    },
    {
      name: 'Admin access',
      auth: createAdminAuth(),
      expectedStatus: 200,
    },
    {
      name: 'No authentication',
      auth: null,
      expectedStatus: 401,
    },
  ];

  for (const scenario of scenarios) {
    it(`should handle ${scenario.name}`, async () => {
      let req = request(method, endpoint);
      
      if (scenario.auth) {
        req = TestAuth.createAuthenticatedRequest(req, scenario.auth.token);
      }
      
      if (data) {
        req = req.send(data);
      }

      const response = await req;
      expect(response.status).toBe(scenario.expectedStatus);
    });
  }
};
