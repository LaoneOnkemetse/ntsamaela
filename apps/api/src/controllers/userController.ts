import { Response } from "express";
import { getPrismaClient } from "@database/index";
import { AuthenticatedRequest } from "@shared/types";
import s3UploadService from "../services/s3UploadService";
import { AppError } from "../utils/AppError";

export class UserController {
  /**
   * Upload or update user profile picture
   */
  async uploadProfilePicture(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "Profile picture file is required",
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

      // Get current user to check for existing profile picture
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUrl: true },
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

      // Upload new profile picture to S3
      const uploadResult = await s3UploadService.uploadProfilePicture(
        file,
        userId,
      );

      // Delete old profile picture from S3 if it exists
      if (user.profilePictureUrl) {
        try {
          // Extract key from URL
          const oldKey = user.profilePictureUrl
            .split(".com/")[1]
            ?.split("?")[0];
          if (oldKey) {
            await s3UploadService.deleteImage(oldKey);
          }
        } catch (deleteError) {
          // Log error but don't fail the upload
          console.error("Failed to delete old profile picture:", deleteError);
        }
      }

      // Update user profile picture URL in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profilePictureUrl: uploadResult.url,
        },
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

      res.status(200).json({
        success: true,
        data: {
          profilePictureUrl: uploadResult.url,
          user: updatedUser,
        },
        message: "Profile picture uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);

      if (error instanceof AppError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "PROFILE_PICTURE_UPLOAD_ERROR",
          message: "Failed to upload profile picture",
        },
      });
    }
  }

  /**
   * Delete user profile picture
   */
  async deleteProfilePicture(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUrl: true },
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

      if (!user.profilePictureUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_PROFILE_PICTURE",
            message: "No profile picture to delete",
          },
        });
      }

      // Delete profile picture from S3
      try {
        const key = user.profilePictureUrl.split(".com/")[1]?.split("?")[0];
        if (key) {
          await s3UploadService.deleteImage(key);
        }
      } catch (deleteError) {
        // Log error but continue with database update
        console.error("Failed to delete profile picture from S3:", deleteError);
      }

      // Update user to remove profile picture URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profilePictureUrl: null,
        },
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

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser,
        },
        message: "Profile picture deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting profile picture:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "PROFILE_PICTURE_DELETE_ERROR",
          message: "Failed to delete profile picture",
        },
      });
    }
  }

  /**
   * Get user profile with profile picture
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

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
          driverProfile: {
            select: {
              id: true,
              licensePlate: true,
              vehicleType: true,
              vehicleCapacity: true,
              rating: true,
              totalDeliveries: true,
              active: true,
            },
          },
          wallet: {
            select: {
              id: true,
              availableBalance: true,
              reservedBalance: true,
              currency: true,
            },
          },
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
    } catch (error: any) {
      console.error("Error getting user profile:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "PROFILE_FETCH_ERROR",
          message: "Failed to fetch user profile",
        },
      });
    }
  }
}
