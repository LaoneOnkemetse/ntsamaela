import { Request, Response } from "express";
import { getPrismaClient } from "@database/index";
import { AuthenticatedRequest } from "@shared/types";
import cloudStorageService from "../services/cloudStorageService";

export class DriverController {
  async createDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { carRegistration, vehicleType, vehicleCapacity } = req.body;
      const file = req.file;

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

      let carPhotoUrl = null;
      if (file) {
        const uploadResult = await cloudStorageService.uploadPackageImage(
          file,
          userId,
          `driver-car-${Date.now()}`,
        );
        carPhotoUrl = uploadResult.url;
      }

      // Create driver profile
      const driverProfile = await prisma.driver.create({
        data: {
          userId,
          licensePlate: carRegistration,
          vehicleType: vehicleType || "CAR",
          vehicleCapacity: vehicleCapacity || "MEDIUM",
          active: true,
          rating: 0,
          totalDeliveries: 0,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...driverProfile,
          carPhotoUrl,
        },
        message: "Driver profile created successfully",
      });
    } catch (_error: any) {
      console.error("Error creating driver profile:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_PROFILE_CREATION_ERROR",
          message: "Failed to create driver profile",
        },
      });
    }
  }

  async getDriverProfile(req: AuthenticatedRequest, res: Response) {
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

      const driverProfile = await prisma.driver.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              identityVerified: true,
            },
          },
        },
      });

      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DRIVER_PROFILE_NOT_FOUND",
            message: "Driver profile not found",
          },
        });
      }

      res.status(200).json({
        success: true,
        data: driverProfile,
      });
    } catch (_error: any) {
      console.error("Error getting driver profile:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_PROFILE_ERROR",
          message: "Failed to get driver profile",
        },
      });
    }
  }

  async updateDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { carRegistration, vehicleType, vehicleCapacity } = req.body;
      const file = req.file;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const existingDriver = await prisma.driver.findUnique({
        where: { userId },
      });

      if (!existingDriver) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DRIVER_PROFILE_NOT_FOUND",
            message: "Driver profile not found",
          },
        });
      }

      let carPhotoUrl = existingDriver.licensePlate; // Keep existing if no new photo
      if (file) {
        const uploadResult = await cloudStorageService.uploadPackageImage(
          file,
          userId,
          `driver-car-${Date.now()}`,
        );
        carPhotoUrl = uploadResult.url;
      }

      const updatedDriver = await prisma.driver.update({
        where: { userId },
        data: {
          licensePlate: carRegistration,
          vehicleType: vehicleType || existingDriver.vehicleType,
          vehicleCapacity: vehicleCapacity || existingDriver.vehicleCapacity,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          ...updatedDriver,
          carPhotoUrl,
        },
        message: "Driver profile updated successfully",
      });
    } catch (_error: any) {
      console.error("Error updating driver profile:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_PROFILE_UPDATE_ERROR",
          message: "Failed to update driver profile",
        },
      });
    }
  }

  async getAllDrivers(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, verified = true } = req.query;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const drivers = await prisma.driver.findMany({
        where: {
          active: true,
          ...(verified === "true" && {
            user: {
              identityVerified: true,
            },
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              identityVerified: true,
            },
          },
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: {
          rating: "desc",
        },
      });

      res.status(200).json({
        success: true,
        data: drivers,
      });
    } catch (_error: any) {
      console.error("Error getting all drivers:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVERS_FETCH_ERROR",
          message: "Failed to get drivers",
        },
      });
    }
  }
}
