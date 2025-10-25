import { authService } from '../authService';

// Mock dependencies
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn()
  },
  wallet: {
    create: jest.fn()
  },
  driver: {
    create: jest.fn()
  }
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../emailService', () => ({
  sendEmail: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn()
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn()
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      userType: 'CUSTOMER'
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        userType: 'CUSTOMER',
        identityVerified: false,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { sendEmail } = require('../emailService');
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const jwt = require('jsonwebtoken');

      // Clear previous mocks
      jest.clearAllMocks();
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      crypto.randomBytes.mockReturnValue(Buffer.from('mock-token'));
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.wallet.create.mockResolvedValue({ id: 'wallet-123', userId: 'user-123', balance: 0 });
      sendEmail.mockResolvedValue({ success: true });
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.register(mockUserData);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(mockUserData.email);
      expect(result.data?.token).toBeDefined();
    });

    it('should return error if user already exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.register(mockUserData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_EXISTS');
    });

    it('should handle registration errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await authService.register(mockUserData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_ERROR');
    });
  });

  describe('login', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        userType: 'CUSTOMER',
        identityVerified: false,
        emailVerified: true,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');

      // Clear previous mocks
      jest.clearAllMocks();
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(mockCredentials.email);
      expect(result.data?.token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const result = await authService.login(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should login successfully even if email not verified', async () => {
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: false,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        userType: 'CUSTOMER',
        identityVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(mockCredentials.email);
      expect(result.data?.token).toBeDefined();
    });
  });


  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      const { sendEmail } = require('../emailService');
      const crypto = require('crypto');

      prisma.user.findUnique.mockResolvedValue(mockUser);
      crypto.randomBytes.mockReturnValue(Buffer.from('reset-token'));
      prisma.user.update.mockResolvedValue(mockUser);
      sendEmail.mockResolvedValue({ success: true });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists, a reset link has been sent');
    });

    it('should return success even if user not found (security)', async () => {
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account with this email exists');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      const bcrypt = require('bcryptjs');

      prisma.user.findFirst.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await authService.resetPassword('valid-token', 'newPassword123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset successfully');
    });

    it('should return error for invalid token', async () => {
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await authService.resetPassword('invalid-token', 'newPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await authService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email verified successfully');
    });

    it('should return error for invalid token', async () => {
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await authService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: false
      };
      const { getPrismaClient } = require('@database/index');
      const prisma = getPrismaClient();
      const { sendEmail } = require('../emailService');
      const crypto = require('crypto');

      prisma.user.findUnique.mockResolvedValue(mockUser);
      crypto.randomBytes.mockReturnValue(Buffer.from('new-token'));
      prisma.user.update.mockResolvedValue(mockUser);
      sendEmail.mockResolvedValue({ success: true });

      const result = await authService.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verification email sent');
    });

    it('should return error if user not found', async () => {
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.resendVerificationEmail('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should return error if email already verified', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      };
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMAIL_ALREADY_VERIFIED');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'current-hashed-password'
      };
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();
      const bcrypt = require('bcryptjs');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await authService.changePassword('user-123', 'currentPassword', 'newPassword123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password changed successfully');
    });

    it('should return error for invalid current password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'current-hashed-password'
      };
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();
      const bcrypt = require('bcryptjs');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const result = await authService.changePassword('user-123', 'wrongPassword', 'newPassword123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PASSWORD');
    });
  });

  describe('hasPermission', () => {
    it('should return true for user with required permission', async () => {
      const mockUser = { id: 'user-123', userType: 'ADMIN' };
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.hasPermission('user-123', ['ADMIN', 'DRIVER']);

      expect(result).toBe(true);
    });

    it('should return false for user without required permission', async () => {
      const mockUser = { id: 'user-123', userType: 'ADMIN' };
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.hasPermission('user-123', ['CUSTOMER']);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const { getPrismaClient } = require('@database/index');
      const mockPrisma = getPrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.hasPermission('user-123', ['ADMIN']);

      expect(result).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'CUSTOMER',
        iat: 1234567890,
        exp: 1234567890
      };
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await authService.logout('token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
