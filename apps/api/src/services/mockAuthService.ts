// Mock Auth Service for development
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class MockAuthService {
  private jwtSecret = process.env.JWT_SECRET || "mock-jwt-secret";

  async register(userData: any) {
    try {
      // Mock user registration
      const _hashedPassword = await bcrypt.hash(userData.password, 10);

      const mockUser = {
        id: `user_${Date.now()}`,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        userType: userData.userType,
        identityVerified: false,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`Mock: Registered user ${mockUser.id}`);
      return {
        success: true,
        data: mockUser,
        message: "User registered successfully",
      };
    } catch (error) {
      console.error("Mock registration error:", error);
      return {
        success: false,
        error: {
          code: "REGISTRATION_ERROR",
          message: "Failed to register user",
        },
      };
    }
  }

  async login(email: string, _password: string) {
    try {
      // Mock login - in real implementation, this would check database
      const mockUser = {
        id: `user_${Date.now()}`,
        email,
        firstName: "Mock",
        lastName: "User",
        phone: "71234567",
        userType: "CUSTOMER",
        identityVerified: true,
        emailVerified: true,
      };

      // Mock password check (always succeeds for development)
      const token = jwt.sign(
        {
          id: mockUser.id,
          email: mockUser.email,
          userType: mockUser.userType,
        },
        this.jwtSecret,
        { expiresIn: "24h" },
      );

      console.log(`Mock: User ${email} logged in`);
      return {
        success: true,
        data: {
          user: mockUser,
          token,
        },
        message: "Login successful",
      };
    } catch (error) {
      console.error("Mock login error:", error);
      return {
        success: false,
        error: {
          code: "LOGIN_ERROR",
          message: "Invalid credentials",
        },
      };
    }
  }

  async requestPasswordReset(email: string) {
    try {
      console.log(`Mock: Password reset requested for ${email}`);
      return {
        success: true,
        message: "Password reset email sent",
      };
    } catch (error) {
      console.error("Mock password reset error:", error);
      return {
        success: false,
        error: {
          code: "PASSWORD_RESET_ERROR",
          message: "Failed to request password reset",
        },
      };
    }
  }

  async confirmPasswordReset(token: string, _newPassword: string) {
    try {
      console.log(`Mock: Password reset confirmed for token ${token}`);
      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      console.error("Mock password reset confirm error:", error);
      return {
        success: false,
        error: {
          code: "PASSWORD_RESET_CONFIRM_ERROR",
          message: "Failed to confirm password reset",
        },
      };
    }
  }

  async verifyEmail(token: string) {
    try {
      console.log(`Mock: Email verified for token ${token}`);
      return {
        success: true,
        message: "Email verified successfully",
      };
    } catch (error) {
      console.error("Mock email verification error:", error);
      return {
        success: false,
        error: {
          code: "EMAIL_VERIFICATION_ERROR",
          message: "Failed to verify email",
        },
      };
    }
  }

  async changePassword(
    userId: string,
    _currentPassword: string,
    _newPassword: string,
  ) {
    try {
      console.log(`Mock: Password changed for user ${userId}`);
      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Mock change password error:", error);
      return {
        success: false,
        error: {
          code: "PASSWORD_CHANGE_ERROR",
          message: "Failed to change password",
        },
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      console.log(`Mock: Verification email resent to ${email}`);
      return {
        success: true,
        message: "Verification email resent",
      };
    } catch (error) {
      console.error("Mock resend verification email error:", error);
      return {
        success: false,
        error: {
          code: "EMAIL_RESEND_ERROR",
          message: "Failed to resend verification email",
        },
      };
    }
  }
}

export const authService = new MockAuthService();
