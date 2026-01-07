import { Request, Response } from "express";
import { getPrismaClient } from "@database/index";
import { authService } from "../services/authService";
import {
  AuthenticatedRequest,
  LoginRequest,
  RegisterRequest,
} from "@shared/types";
import { resetLoginAttempts } from "../middleware/rateLimiting";

export class AuthController {
  async register(req: Request<{}, {}, RegisterRequest>, res: Response) {
    try {
      const { email, password, firstName, lastName, phone, userType } =
        req.body;

      console.log("📝 Registration request received:", {
        email,
        phone,
        userType,
      });

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        userType,
      });

      if (result.success) {
        console.log("✅ Registration successful for:", email);
        res.status(201).json({
          success: true,
          data: result.data,
          message:
            "User registered successfully. Please check your phone for the verification code.",
        });
      } else {
        console.log(
          "❌ Registration failed:",
          result.error?.code,
          result.error?.message,
        );
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      console.error("❌ Registration controller error:", _error);
      console.error("❌ Error name:", _error?.name);
      console.error("❌ Error message:", _error?.message);
      console.error("❌ Error stack:", _error?.stack);
      res.status(500).json({
        success: false,
        error: {
          code: "REGISTRATION_ERROR",
          message: _error.message || "Failed to register user",
        },
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
          code: "LOGIN_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async loginWithPhone(
    req: Request<{}, {}, { phone: string; password: string }>,
    res: Response,
  ) {
    try {
      const { phone, password } = req.body;

      // Normalize phone number format - handle both with and without + prefix
      let normalizedPhone = phone.trim();
      // If phone doesn't start with +, try to add it for Botswana (+267)
      if (!normalizedPhone.startsWith("+")) {
        // If it starts with 267, add +
        if (normalizedPhone.startsWith("267")) {
          normalizedPhone = "+" + normalizedPhone;
        } else if (normalizedPhone.length === 8) {
          // If it's 8 digits, assume Botswana and add +267
          normalizedPhone = "+267" + normalizedPhone;
        }
      }

      // Get Prisma client
      let prisma;
      try {
        prisma = getPrismaClient();
        if (!prisma) {
          console.error("❌ CRITICAL: Prisma client is null or undefined");
          throw new Error("Database client not available");
        }

        // Check if we're using mock client (shouldn't happen in production)
        if (process.env.DISABLE_PRISMA === "true") {
          console.warn(
            "⚠️ WARNING: Using mock database client - login will not work with real data",
          );
        }

        console.log("✅ Prisma client obtained, type:", typeof prisma);
        console.log(
          "✅ Prisma client has user.findFirst:",
          typeof prisma.user?.findFirst === "function",
        );
      } catch (prismaError: any) {
        console.error("❌ CRITICAL: Failed to get Prisma client:", prismaError);
        console.error("❌ Error message:", prismaError?.message);
        throw new Error(
          `Database connection failed: ${prismaError?.message || "Unknown error"}`,
        );
      }

      // Try to find user by phone number (try both formats)
      let user;
      try {
        console.log(`🔍 Searching for user with phone: ${normalizedPhone}`);
        user = await prisma.user.findFirst({
          where: { phone: normalizedPhone },
        });
        console.log(
          `🔍 Query result:`,
          user ? `Found user ${user.id}` : "No user found",
        );
      } catch (dbError: any) {
        console.error("❌ Database query error:", dbError);
        console.error("❌ Error name:", dbError?.name);
        console.error("❌ Error message:", dbError?.message);
        console.error("❌ Error code:", dbError?.code);
        throw dbError; // Re-throw to be caught by outer catch
      }

      // If not found, try the original format
      if (!user) {
        user = await prisma.user.findFirst({
          where: { phone: phone.trim() },
        });
      }

      // If still not found, try without + prefix
      if (!user && normalizedPhone.startsWith("+")) {
        user = await prisma.user.findFirst({
          where: { phone: normalizedPhone.substring(1) },
        });
      }

      if (!user) {
        console.log(
          `❌ Login attempt failed: User not found for phone ${normalizedPhone}`,
        );
        return res.status(401).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "This phone number is not registered to any account",
          },
        });
      }

      console.log(`🔍 Found user: ${user.email}, validating password...`);
      let result;
      try {
        result = await authService.login(user.email, password);
        console.log(
          `🔍 AuthService.login result:`,
          result.success ? "SUCCESS" : "FAILED",
        );
      } catch (authError: any) {
        console.error("❌ AuthService.login error:", authError);
        console.error("❌ Error name:", authError?.name);
        console.error("❌ Error message:", authError?.message);
        throw authError; // Re-throw to be caught by outer catch
      }

      if (result.success) {
        console.log(`✅ Login successful for user: ${user.email}`);
        resetLoginAttempts(req);
        res.status(200).json(result);
      } else {
        console.log(
          `❌ Login failed for user: ${user.email}, reason: ${result.error?.message || "Invalid password"}`,
        );
        // Return specific error for wrong password
        res.status(401).json({
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Incorrect password. Please try again.",
          },
        });
      }
    } catch (_error: any) {
      console.error("❌ Login with phone error:", _error);
      console.error("❌ Error name:", _error?.name);
      console.error("❌ Error message:", _error?.message);
      console.error("❌ Error stack:", _error?.stack);

      // Check if it's a database connection error
      if (
        _error.message &&
        (_error.message.includes("Can't reach database server") ||
          _error.message.includes("P1001") || // Prisma connection error code
          _error.message.includes("connect ECONNREFUSED") ||
          _error.message.includes("Database client not available"))
      ) {
        console.error("❌ Database connection error detected");
        return res.status(503).json({
          success: false,
          error: {
            code: "DATABASE_CONNECTION_ERROR",
            message: "Service temporarily unavailable. Please try again later.",
          },
        });
      }

      // Check if it's a Prisma query error
      if (_error.code && _error.code.startsWith("P")) {
        console.error("❌ Prisma error detected:", _error.code);
        return res.status(500).json({
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to sign in. Please try again.",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "LOGIN_ERROR",
          message: "Unable to sign in. Please try again.",
        },
      });
    }
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

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
          profilePictureUrl: true,
          identityVerified: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "USER_RETRIEVAL_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async requestPasswordReset(
    req: Request<{}, {}, { phone: string }>,
    res: Response,
  ) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PHONE",
            message: "Phone number is required",
          },
        });
      }

      const result = await authService.requestPasswordReset(phone);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async confirmPasswordReset(
    req: Request<{}, {}, { phone: string; otp: string; newPassword: string }>,
    res: Response,
  ) {
    try {
      const { phone, otp, newPassword } = req.body;

      if (!phone || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "Phone number, OTP, and new password are required",
          },
        });
      }

      // Verify OTP matches the password reset token
      const result = await authService.resetPassword(otp, newPassword);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Password has been reset successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_CONFIRM_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async verifyPhone(
    req: Request<{}, {}, { phone: string; otp: string }>,
    res: Response,
  ) {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "Phone number and OTP are required",
          },
        });
      }

      const result = await authService.verifyPhone(phone, otp);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Phone number verified successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "PHONE_VERIFICATION_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async resendPhoneVerificationOtp(
    req: Request<{}, {}, { phone: string }>,
    res: Response,
  ) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PHONE",
            message: "Phone number is required",
          },
        });
      }

      const result = await authService.resendPhoneVerificationOtp(phone);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "RESEND_OTP_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async requestAccountRecovery(
    req: Request<{}, {}, { email: string }>,
    res: Response,
  ) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_EMAIL",
            message: "Email is required",
          },
        });
      }

      const result = await authService.requestAccountRecovery(email);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "ACCOUNT_RECOVERY_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async confirmAccountRecovery(
    req: Request<{}, {}, { token: string; newPhone?: string }>,
    res: Response,
  ) {
    try {
      const { token, newPhone } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Recovery token is required",
          },
        });
      }

      const result = await authService.confirmAccountRecovery(token, newPhone);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "ACCOUNT_RECOVERY_CONFIRM_ERROR",
          message: _error.message,
        },
      });
    }
  }

  // Additional methods to match route expectations
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "LOGOUT_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Password changed successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (_error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_CHANGE_ERROR",
          message: _error.message,
        },
      });
    }
  }

  async createDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userType = req.user!.userType;

      if (userType !== "DRIVER") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_USER_TYPE",
            message: "Only drivers can create driver profiles",
          },
        });
      }

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      // Check if driver profile already exists
      const existingDriver = await prisma.driver.findUnique({
        where: { userId },
      });

      if (existingDriver) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DRIVER_PROFILE_EXISTS",
            message: "Driver profile already exists",
          },
        });
      }

      // Create driver profile
      const driverProfile = await prisma.driver.create({
        data: {
          userId,
          active: true,
        },
      });

      res.status(201).json({
        success: true,
        data: driverProfile,
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_PROFILE_CREATION_ERROR",
          message: _error.message,
        },
      });
    }
  }
}
