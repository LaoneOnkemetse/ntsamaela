import { Request, Response } from "express";
import { getPrismaClient } from "@database/index";
import { AuthenticatedRequest } from "@shared/types";
import cloudStorageService from "../services/cloudStorageService";
import { getRealtimeService } from "../services/realtimeService";

export class DriverController {
  async createDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { carRegistration, carDescription, vehicleType, vehicleCapacity } =
        req.body;
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
          carDescription: carDescription,
          carPhotoUrl: carPhotoUrl,
          vehicleType: vehicleType || "CAR",
          vehicleCapacity: vehicleCapacity || "MEDIUM",
          active: true,
          rating: 0,
          totalDeliveries: 0,
        },
      });

      res.status(201).json({
        success: true,
        data: driverProfile,
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

  async updateActiveStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "active must be a boolean",
          },
        });
      }

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

      const updatedDriver = await prisma.driver.update({
        where: { userId },
        data: { active },
      });

      res.status(200).json({
        success: true,
        data: updatedDriver,
        message: active
          ? "You are now visible to customers"
          : "You are now hidden from customers",
      });
    } catch (_error: any) {
      console.error("Error updating driver active status:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_ACTIVE_UPDATE_ERROR",
          message: "Failed to update active status",
        },
      });
    }
  }

  async updateDriverProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { carRegistration, carDescription, vehicleType, vehicleCapacity } =
        req.body;
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

      let carPhotoUrl = existingDriver.carPhotoUrl; // Keep existing if no new photo
      if (file) {
        try {
          const uploadResult = await cloudStorageService.uploadPackageImage(
            file,
            userId,
            `driver-car-${Date.now()}`,
          );
          carPhotoUrl = uploadResult.url;
        } catch (uploadErr: any) {
          console.error("Car photo upload failed:", uploadErr);
          return res.status(400).json({
            success: false,
            error: {
              code: "CAR_PHOTO_UPLOAD_FAILED",
              message:
                uploadErr?.message ||
                "Car photo upload failed. Use a JPEG or PNG under 10MB.",
            },
          });
        }
      }

      const updatedDriver = await prisma.driver.update({
        where: { userId },
        data: {
          ...(typeof carRegistration === "string" && carRegistration.trim()
            ? { licensePlate: carRegistration.trim() }
            : {}),
          ...(typeof carDescription === "string" && carDescription.trim()
            ? { carDescription: carDescription.trim() }
            : {}),
          carPhotoUrl,
          vehicleType: vehicleType || existingDriver.vehicleType,
          vehicleCapacity: vehicleCapacity || existingDriver.vehicleCapacity,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedDriver,
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

  async updateLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { latitude, longitude } = req.body;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "latitude and longitude are required numbers",
          },
        });
      }

      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      // Resolve location name via Google Geocoding (non-blocking, best-effort)
      let locationName: string | null = null;
      try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const geoResp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&result_type=locality|sublocality|administrative_area_level_2`,
          );
          const geoData = await geoResp.json();
          if (geoData.results && geoData.results.length > 0) {
            const components = geoData.results[0].address_components || [];
            const locality = components.find((c: any) =>
              c.types.includes("locality"),
            );
            const sublocality = components.find((c: any) =>
              c.types.includes("sublocality"),
            );
            const admin2 = components.find((c: any) =>
              c.types.includes("administrative_area_level_2"),
            );
            locationName =
              locality?.long_name ||
              sublocality?.long_name ||
              admin2?.long_name ||
              geoData.results[0].formatted_address?.split(",")[0] ||
              null;
          }
        }
      } catch {
        // geocoding failed, not critical
      }

      const driver = await prisma.driver.update({
        where: { userId },
        data: {
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastLocationAt: new Date(),
          ...(locationName ? { locationName } : {}),
        },
      });

      // Feed live GPS into package tracking for active deliveries
      try {
        const activeBids = await prisma.bid.findMany({
          where: {
            driverId: driver.id,
            status: "ACCEPTED",
            package: {
              status: {
                in: ["ACCEPTED", "IN_TRANSIT", "IN_PROGRESS", "PICKED_UP"],
              },
            },
          },
          select: { packageId: true },
          take: 10,
        });

        if (activeBids.length > 0) {
          const realtime = getRealtimeService();
          const locationLabel =
            locationName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          for (const bid of activeBids) {
            try {
              if (realtime?.createTrackingUpdate) {
                await realtime.createTrackingUpdate(
                  bid.packageId,
                  "LOCATION_UPDATE",
                  locationLabel,
                  latitude,
                  longitude,
                  "Driver GPS update",
                );
              } else {
                await prisma.packageTracking.create({
                  data: {
                    packageId: bid.packageId,
                    status: "LOCATION_UPDATE",
                    location: locationLabel,
                    latitude,
                    longitude,
                    notes: "Driver GPS update",
                  },
                });
              }
              const payload = {
                packageId: bid.packageId,
                latitude,
                longitude,
                location: locationLabel,
                timestamp: new Date().toISOString(),
              };
              // Emit both event names for client compatibility
              realtime?.emitToRoom?.(
                `package:${bid.packageId}`,
                "package:location:update",
                payload,
              );
              realtime?.emitToRoom?.(
                `package:${bid.packageId}`,
                "package:location:updated",
                payload,
              );
            } catch (trackErr) {
              console.warn(
                "Package tracking update from driver GPS failed:",
                (trackErr as Error)?.message,
              );
            }
          }
        }
      } catch (activeErr) {
        console.warn(
          "Active delivery location sync failed:",
          (activeErr as Error)?.message,
        );
      }

      res.status(200).json({ success: true });
    } catch (_error: any) {
      console.error("Error updating driver location:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "LOCATION_UPDATE_ERROR",
          message: "Failed to update location",
        },
      });
    }
  }

  async getAllDrivers(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, verified } = req.query;

      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const whereClause: any = { active: true };
      if (verified === "true") {
        whereClause.user = { identityVerified: true };
      }

      const drivers = await prisma.driver.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          licensePlate: true,
          vehicleType: true,
          vehicleCapacity: true,
          carDescription: true,
          carPhotoUrl: true,
          rating: true,
          totalDeliveries: true,
          active: true,
          lastLatitude: true,
          lastLongitude: true,
          lastLocationAt: true,
          locationName: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              profilePictureUrl: true,
              identityVerified: true,
            },
          },
        },
        take: parseInt(limit as string) || 20,
        skip: parseInt(offset as string) || 0,
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
          message: _error?.message || "Failed to get drivers",
        },
      });
    }
  }

  async getDriverById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const driver = await prisma.driver.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          licensePlate: true,
          vehicleType: true,
          vehicleCapacity: true,
          carDescription: true,
          carPhotoUrl: true,
          rating: true,
          totalDeliveries: true,
          active: true,
          locationName: true,
          lastLatitude: true,
          lastLongitude: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              profilePictureUrl: true,
              identityVerified: true,
            },
          },
        },
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          error: { code: "DRIVER_NOT_FOUND", message: "Driver not found" },
        });
      }

      res.status(200).json({ success: true, data: driver });
    } catch (_error: any) {
      console.error("Error getting driver:", _error);
      res.status(500).json({
        success: false,
        error: {
          code: "DRIVER_FETCH_ERROR",
          message: _error?.message || "Failed to get driver",
        },
      });
    }
  }
}
