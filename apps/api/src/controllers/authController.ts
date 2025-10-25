import { Request, Response } from 'express';
import { prisma } from '@database/index';
import { authService } from '../services/authService';
import { AuthenticatedRequest, LoginRequest, RegisterRequest, PasswordResetRequest, PasswordResetConfirmRequest } from '@shared/types';
import { resetLoginAttempts } from '../middleware/rateLimiting';

export class AuthController {
  async register(req: Request<{}, {}, RegisterRequest>, res: Response) {
    try {
      const { email, password, firstName, lastName, phone, userType } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        userType
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'User registered successfully. Please check your email to verify your account.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: _error.message
        }
      });
    }
  }

  async login(req: Request<{}, {}, LoginRequest>, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      if (result.success) {
        resetLoginAttempts(req);
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: _error.message
        }
      });
    }
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          userType: true,
          identityVerified: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_RETRIEVAL_ERROR',
          message: _error.message
        }
      });
    }
  }

  async requestPasswordReset(req: Request<{}, {}, PasswordResetRequest>, res: Response) {
    try {
      const { email } = req.body;

      const result = await authService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: _error.message
        }
      });
    }
  }

  async confirmPasswordReset(req: Request<{}, {}, PasswordResetConfirmRequest>, res: Response) {
    try {
      const { token, newPassword } = req.body;

      const result = await authService.confirmPasswordReset(token, newPassword);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password has been reset successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_CONFIRM_ERROR',
          message: _error.message
        }
      });
    }
  }

  async verifyEmail(req: Request<{ token?: string }, {}, { token?: string }>, res: Response) {
    try {
      const token = req.params.token || req.body.token;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Token is required'
          }
        });
      }

      const result = await authService.verifyEmail(token);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_ERROR',
          message: _error.message
        }
      });
    }
  }

  // Additional methods to match route expectations
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: _error.message
        }
      });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password changed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_ERROR',
          message: _error.message
        }
      });
    }
  }

  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const result = await authService.resendVerificationEmail(email);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification email has been resent'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_RESEND_ERROR',
          message: _error.message
        }
      });
    }
  }

  async createDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userType = req.user!.userType;

      if (userType !== 'DRIVER') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_TYPE',
            message: 'Only drivers can create driver profiles'
          }
        });
      }

      // Check if driver profile already exists
      const existingDriver = await prisma.driver.findUnique({
        where: { userId }
      });

      if (existingDriver) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DRIVER_PROFILE_EXISTS',
            message: 'Driver profile already exists'
          }
        });
      }

      // Create driver profile
      const driverProfile = await prisma.driver.create({
        data: {
          userId,
          active: true
        }
      });

      res.status(201).json({
        success: true,
        data: driverProfile
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DRIVER_PROFILE_CREATION_ERROR',
          message: _error.message
        }
      });
    }
  }
}


