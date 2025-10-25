import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '@database/index';
import { RegisterRequest } from '@shared/types';

export class AuthService {
  async register(userData: RegisterRequest) {
    try {
      const { email, password, firstName, lastName, phone, userType } = userData;
      const prismaClient = getPrismaClient();

      // Check if user already exists
      const existingUser = await prismaClient.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return { success: false, error: { code: 'USER_EXISTS', message: 'User already exists' } };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prismaClient.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          userType,
          identityVerified: false,
          emailVerified: false
        }
      });

      // Create wallet for user
      await prismaClient.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          reservedBalance: 0
        }
      });

      // Create driver profile if user is a driver
      if (userType === 'DRIVER') {
        await prismaClient.driver.create({
          data: {
            userId: user.id,
            active: true
          }
        });
      }

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            userType: user.userType,
            identityVerified: user.identityVerified,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
          },
          token
        }
      };
    } catch (_error: any) {
      return { success: false, error: { code: 'REGISTRATION_ERROR', message: _error.message } };
    }
  }

  async login(email: string, password: string) {
    try {
      const prismaClient = getPrismaClient();
      
      // Find user
      const user = await prismaClient.user.findUnique({
        where: { email }
      });

      if (!user) {
        return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } };
      }

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            userType: user.userType,
            identityVerified: user.identityVerified,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
          },
          token
        }
      };
    } catch (_error: any) {
      return { success: false, error: { code: 'LOGIN_ERROR', message: _error.message } };
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const prismaClient = getPrismaClient();
      
      const user = await prismaClient.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists or not
        return { success: true, message: 'If an account with this email exists, a password reset link has been sent' };
      }

      // In a real implementation, you would:
      // 1. Generate a reset token
      // 2. Store it in the database with expiration
      // 3. Send email with reset link
      // For now, we'll just return success
      
      return { success: true, message: 'If the email exists, a reset link has been sent' };
    } catch (_error: any) {
      return { success: false, error: { code: 'RESET_REQUEST_ERROR', message: _error.message } };
    }
  }


  async resetPassword(token: string, newPassword: string) {
    // Implementation for password reset
    try {
      const prismaClient = getPrismaClient();
      
      // Verify token and update password
      const user = await prismaClient.user.findFirst({
        where: { passwordResetToken: token }
      });

      if (!user) {
        return { success: false, error: { code: 'INVALID_RESET_TOKEN', message: 'Invalid reset token' } };
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      return { success: true, message: 'Password reset successfully' };
    } catch (_error) {
      return { success: false, error: { code: 'RESET_ERROR', message: 'Failed to reset password' } };
    }
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    return this.resetPassword(token, newPassword);
  }

  private generateToken(user: any): string {
    const payload = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const options: jwt.SignOptions = { expiresIn: '7d' };

    return jwt.sign(payload, secret, options);
  }

  async verifyEmail(token: string) {
    try {
      const prismaClient = getPrismaClient();
      
      const user = await prismaClient.user.findFirst({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        return { success: false, error: { code: 'INVALID_VERIFICATION_TOKEN', message: 'Invalid verification token' } };
      }

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });

      return { success: true, message: 'Email verified successfully' };
    } catch (_error) {
      return { success: false, error: { code: 'VERIFICATION_ERROR', message: 'Failed to verify email' } };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { email }
      });

      if (!user) {
        return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
      }

      if (user.emailVerified) {
        return { success: false, error: { code: 'EMAIL_ALREADY_VERIFIED', message: 'Email already verified' } };
      }

      // Generate new verification token
      const verificationToken = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpires: expiresAt
        }
      });

      // TODO: Send email with verification link
      return { success: true, message: 'Verification email sent' };
    } catch (_error) {
      return { success: false, error: { code: 'EMAIL_ERROR', message: 'Failed to send verification email' } };
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return { success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } };
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await prismaClient.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (_error) {
      return { success: false, error: { code: 'CHANGE_PASSWORD_ERROR', message: 'Failed to change password' } };
    }
  }

  async hasPermission(userId: string, requiredRoles: string[]) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return false;
      }

      return requiredRoles.includes(user.userType);
    } catch (_error) {
      return false;
    }
  }

  verifyToken(token: string) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (_error) {
      return null;
    }
  }

  async logout(_token: string) {
    // For JWT, logout is typically handled client-side by removing the token
    // In a more sophisticated setup, you might maintain a blacklist of tokens
    return { success: true, message: 'Logged out successfully' };
  }
}

export const authService = new AuthService();


