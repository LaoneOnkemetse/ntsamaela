import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getPrismaClient } from "@database/index";
import { RegisterRequest } from "@shared/types";
import { sendOtp } from "./smsService";
import { sendAccountRecoveryEmail } from "./emailService";

export class AuthService {
  async register(userData: RegisterRequest) {
    try {
      const { email, password, firstName, lastName, phone, userType } =
        userData;

      console.log("📝 Starting user registration:", { email, phone, userType });

      let prismaClient;
      try {
        prismaClient = getPrismaClient();
        if (!prismaClient) {
          console.error(
            "❌ CRITICAL: Prisma client is null during registration",
          );
          throw new Error("Database client not available");
        }
        console.log("✅ Prisma client obtained for registration");
      } catch (prismaError: any) {
        console.error("❌ CRITICAL: Failed to get Prisma client:", prismaError);
        console.error("❌ Error message:", prismaError?.message);
        throw new Error(
          `Database connection failed: ${prismaError?.message || "Unknown error"}`,
        );
      }

      // Check if user already exists by email or phone
      console.log("🔍 Checking if user exists by email...");
      const existingUserByEmail = await prismaClient.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        console.log("❌ User already exists with email:", email);
        return {
          success: false,
          error: {
            code: "USER_EXISTS",
            message: "User with this email already exists",
          },
        };
      }

      console.log("🔍 Checking if user exists by phone...");
      const existingUserByPhone = await prismaClient.user.findUnique({
        where: { phone },
      });

      if (existingUserByPhone) {
        console.log("❌ User already exists with phone:", phone);
        return {
          success: false,
          error: {
            code: "PHONE_EXISTS",
            message: "User with this phone number already exists",
          },
        };
      }

      console.log("✅ No existing user found, proceeding with registration");

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate SMS OTP for phone verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user (phone not verified yet)
      console.log("📝 Creating user in database...");
      let user;
      try {
        user = await prismaClient.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            phone,
            userType,
            identityVerified: false,
            phoneVerified: false,
            phoneVerificationOtp: otp,
            phoneVerificationExpires: otpExpiresAt,
            emailVerified: true, // Email is kept for account recovery only
          },
        });
        console.log("✅ User created successfully:", user.id);
      } catch (dbError: any) {
        console.error("❌ Database error creating user:", dbError);
        console.error("❌ Error code:", dbError?.code);
        console.error("❌ Error message:", dbError?.message);
        throw dbError;
      }

      // Create wallet for user
      console.log("📝 Creating wallet for user...");
      try {
        await prismaClient.wallet.create({
          data: {
            userId: user.id,
            availableBalance: 0,
            reservedBalance: 0,
          },
        });
        console.log("✅ Wallet created successfully");
      } catch (walletError: any) {
        console.error("❌ Error creating wallet:", walletError);
        // Don't fail registration if wallet creation fails, but log it
      }

      // Create driver profile if user is a driver
      if (userType === "DRIVER") {
        console.log("📝 Creating driver profile...");
        try {
          await prismaClient.driver.create({
            data: {
              userId: user.id,
              active: true,
            },
          });
          console.log("✅ Driver profile created successfully");
        } catch (driverError: any) {
          console.error("❌ Error creating driver profile:", driverError);
          // Don't fail registration if driver profile creation fails, but log it
        }
      }

      // Send SMS OTP (non-blocking)
      console.log("📱 Sending SMS OTP to:", phone);
      sendOtp(phone, otp, "registration")
        .then((result) => {
          if (result.success) {
            console.log("✅ SMS OTP sent successfully");
          } else {
            console.error("❌ SMS OTP sending failed:", result.error);
          }
        })
        .catch((error) => {
          console.error(
            "❌ Failed to send SMS OTP during registration:",
            error,
          );
          console.error("❌ SMS Error details:", error.message);
          // Don't fail registration if SMS fails, but log it
        });

      // Generate JWT token (user can use app but phone must be verified for some features)
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
            profilePictureUrl: user.profilePictureUrl,
            identityVerified: user.identityVerified,
            phoneVerified: user.phoneVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          token,
          requiresPhoneVerification: true,
        },
      };
    } catch (_error: any) {
      console.error("❌ Registration error:", _error);
      console.error("❌ Error name:", _error?.name);
      console.error("❌ Error message:", _error?.message);
      console.error("❌ Error code:", _error?.code);
      console.error("❌ Error stack:", _error?.stack);
      return {
        success: false,
        error: {
          code: "REGISTRATION_ERROR",
          message: _error.message || "Failed to register user",
        },
      };
    }
  }

  async login(email: string, password: string) {
    try {
      const prismaClient = getPrismaClient();

      // Find user
      const user = await prismaClient.user.findUnique({
        where: { email },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        };
      }

      // Verify password
      if (!password || !user.passwordHash) {
        console.log(
          `❌ Password validation failed: Missing password or passwordHash`,
        );
        return {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        console.log(
          `❌ Password validation failed: Password does not match for user ${email}`,
        );
        return {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        };
      }

      console.log(`✅ Password validated successfully for user: ${email}`);

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
            profilePictureUrl: user.profilePictureUrl,
            identityVerified: user.identityVerified,
            phoneVerified: user.phoneVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          token,
        },
      };
    } catch (_error: any) {
      console.error("❌ AuthService.login error:", _error);
      console.error("❌ Error name:", _error?.name);
      console.error("❌ Error message:", _error?.message);
      console.error("❌ Error code:", _error?.code);
      return {
        success: false,
        error: {
          code: "LOGIN_ERROR",
          message: _error.message || "Login failed",
        },
      };
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const prismaClient = getPrismaClient();

      const user = await prismaClient.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message:
            "If an account with this email exists, a reset link has been sent",
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: expiresAt,
        },
      });

      // Send password reset email
      const emailResult = await sendAccountRecoveryEmail(email, resetToken);
      if (!emailResult.success) {
        console.error(
          "Failed to send password reset email:",
          emailResult.error,
        );
        // Still return success as token is generated, but log the error
      }

      return {
        success: true,
        message: "If the email exists, a reset link has been sent",
      };
    } catch (_error: any) {
      return {
        success: false,
        error: { code: "RESET_REQUEST_ERROR", message: _error.message },
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    // Implementation for password reset
    try {
      const prismaClient = getPrismaClient();

      // Verify token and update password
      const user = await prismaClient.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "INVALID_RESET_TOKEN",
            message: "Invalid reset token",
          },
        };
      }

      // Check if token has expired
      if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        return {
          success: false,
          error: {
            code: "EXPIRED_RESET_TOKEN",
            message: "Reset token has expired",
          },
        };
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return { success: true, message: "Password reset successfully" };
    } catch (_error) {
      return {
        success: false,
        error: { code: "RESET_ERROR", message: "Failed to reset password" },
      };
    }
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    return this.resetPassword(token, newPassword);
  }

  private generateToken(user: any): string {
    const payload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
    };

    const secret = process.env.JWT_SECRET || "your-secret-key";
    const options: jwt.SignOptions = { expiresIn: "7d" };

    return jwt.sign(payload, secret, options);
  }

  async verifyPhone(phone: string, otp: string) {
    try {
      const prismaClient = getPrismaClient();

      const user = await prismaClient.user.findUnique({
        where: { phone },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        };
      }

      if (user.phoneVerified) {
        return {
          success: false,
          error: {
            code: "PHONE_ALREADY_VERIFIED",
            message: "Phone number already verified",
          },
        };
      }

      // Check if OTP matches and is not expired
      if (user.phoneVerificationOtp !== otp) {
        return {
          success: false,
          error: {
            code: "INVALID_OTP",
            message: "Invalid verification code",
          },
        };
      }

      if (
        !user.phoneVerificationExpires ||
        user.phoneVerificationExpires < new Date()
      ) {
        return {
          success: false,
          error: {
            code: "OTP_EXPIRED",
            message: "Verification code has expired",
          },
        };
      }

      // Verify phone
      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          phoneVerificationOtp: null,
          phoneVerificationExpires: null,
        },
      });

      return { success: true, message: "Phone number verified successfully" };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "VERIFICATION_ERROR",
          message: "Failed to verify phone number",
        },
      };
    }
  }

  async resendPhoneVerificationOtp(phone: string) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { phone },
      });

      if (!user) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        };
      }

      if (user.phoneVerified) {
        return {
          success: false,
          error: {
            code: "PHONE_ALREADY_VERIFIED",
            message: "Phone number already verified",
          },
        };
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          phoneVerificationOtp: otp,
          phoneVerificationExpires: expiresAt,
        },
      });

      // Send OTP via SMS
      const smsResult = await sendOtp(phone, otp, "registration");
      if (!smsResult.success) {
        console.error("Failed to send SMS OTP:", smsResult.error);
        // Still return success as OTP is generated, but log the error
      }

      return { success: true, message: "Verification code sent to your phone" };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "SMS_ERROR",
          message: "Failed to send verification code",
        },
      };
    }
  }

  /**
   * Account Recovery - Used when user loses their phone
   * Sends recovery link to email address
   */
  async requestAccountRecovery(email: string) {
    try {
      const prismaClient = getPrismaClient();

      const user = await prismaClient.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message:
            "If an account with this email exists, a recovery link has been sent",
        };
      }

      // Generate recovery token
      const recoveryToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store recovery token in database
      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          accountRecoveryToken: recoveryToken,
          accountRecoveryExpires: expiresAt,
        },
      });

      // Send account recovery email
      const emailResult = await sendAccountRecoveryEmail(
        user.email,
        recoveryToken,
      );
      if (!emailResult.success) {
        console.error(
          "Failed to send account recovery email:",
          emailResult.error,
        );
        // Still return success as token is generated, but log the error
      }

      return {
        success: true,
        message: "If the email exists, a recovery link has been sent",
      };
    } catch (_error: any) {
      return {
        success: false,
        error: { code: "RECOVERY_REQUEST_ERROR", message: _error.message },
      };
    }
  }

  async confirmAccountRecovery(token: string, newPhone?: string) {
    try {
      const prismaClient = getPrismaClient();

      const user = await prismaClient.user.findFirst({
        where: { accountRecoveryToken: token },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "INVALID_RECOVERY_TOKEN",
            message: "Invalid recovery token",
          },
        };
      }

      // Check if token has expired
      if (
        user.accountRecoveryExpires &&
        user.accountRecoveryExpires < new Date()
      ) {
        return {
          success: false,
          error: {
            code: "EXPIRED_RECOVERY_TOKEN",
            message: "Recovery token has expired",
          },
        };
      }

      // Update phone if provided
      const updateData: any = {
        accountRecoveryToken: null,
        accountRecoveryExpires: null,
        phoneVerified: false, // Require re-verification of new phone
      };

      if (newPhone) {
        // Check if new phone is already in use
        const existingUser = await prismaClient.user.findUnique({
          where: { phone: newPhone },
        });

        if (existingUser && existingUser.id !== user.id) {
          return {
            success: false,
            error: {
              code: "PHONE_ALREADY_IN_USE",
              message: "This phone number is already registered",
            },
          };
        }

        updateData.phone = newPhone;
        // Generate new OTP for phone verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        updateData.phoneVerificationOtp = otp;
        updateData.phoneVerificationExpires = new Date(
          Date.now() + 10 * 60 * 1000,
        );

        // Send OTP to new phone
        sendOtp(newPhone, otp, "registration").catch((error) => {
          console.error("Failed to send OTP to new phone:", error);
        });
      }

      await prismaClient.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return {
        success: true,
        message: newPhone
          ? "Account recovered. Please verify your new phone number."
          : "Account recovery confirmed",
      };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "RECOVERY_ERROR",
          message: "Failed to recover account",
        },
      };
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        };
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Current password is incorrect",
          },
        };
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await prismaClient.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return { success: true, message: "Password changed successfully" };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "CHANGE_PASSWORD_ERROR",
          message: "Failed to change password",
        },
      };
    }
  }

  async hasPermission(userId: string, requiredRoles: string[]) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
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
      const secret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (_error) {
      return null;
    }
  }

  async logout(_token: string) {
    // For JWT, logout is typically handled client-side by removing the token
    // In a more sophisticated setup, you might maintain a blacklist of tokens
    return { success: true, message: "Logged out successfully" };
  }

  async verifyEmail(token: string) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findFirst({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "INVALID_VERIFICATION_TOKEN",
            message: "Invalid verification token",
          },
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          error: {
            code: "EMAIL_ALREADY_VERIFIED",
            message: "Email is already verified",
          },
        };
      }

      if (
        user.emailVerificationExpires &&
        user.emailVerificationExpires < new Date()
      ) {
        return {
          success: false,
          error: {
            code: "VERIFICATION_TOKEN_EXPIRED",
            message: "Verification token has expired",
          },
        };
      }

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      return {
        success: true,
        message: "Email verified successfully",
      };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "VERIFICATION_ERROR",
          message: "Failed to verify email",
        },
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const prismaClient = getPrismaClient();
      const user = await prismaClient.user.findUnique({
        where: { email },
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          error: {
            code: "EMAIL_ALREADY_VERIFIED",
            message: "Email is already verified",
          },
        };
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpires: expiresAt,
        },
      });

      // Send verification email (non-blocking)
      sendAccountRecoveryEmail(email, verificationToken)
        .then((result) => {
          if (result.success) {
            console.log("✅ Verification email sent successfully");
          } else {
            console.error(
              "❌ Failed to send verification email:",
              result.error,
            );
          }
        })
        .catch((error) => {
          console.error("❌ Error sending verification email:", error);
        });

      return {
        success: true,
        message: "Verification email sent",
      };
    } catch (_error) {
      return {
        success: false,
        error: {
          code: "EMAIL_SEND_ERROR",
          message: "Failed to resend verification email",
        },
      };
    }
  }
}

export const authService = new AuthService();
