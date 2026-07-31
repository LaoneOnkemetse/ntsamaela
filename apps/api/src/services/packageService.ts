import { getPrismaClient } from "@database/index";
import { AppError } from "../utils/AppError";
import { getRealtimeService } from "./realtimeService";
import { PackageStatus, PackageSize } from "@shared/types";

export interface CreatePackageRequest {
  customerId: string;
  description: string;
  imageUrl?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  priceOffered: number;
  size?: PackageSize;
  weight?: number;
  requestedDriverId?: string;
}

export interface PackageFilters {
  status?: PackageStatus;
  minPrice?: number;
  maxPrice?: number;
  size?: PackageSize;
  customerId?: string;
  search?: string;
  weight?: number;
  minWeight?: number;
  maxWeight?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "priceOffered" | "weight" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface UpdatePackageStatusRequest {
  status: PackageStatus;
  notes?: string;
}

class PackageService {
  private prisma: any;

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
      if (!this.prisma) {
        throw new Error("Database client not available");
      }
    }
    return this.prisma;
  }

  async createPackage(packageData: CreatePackageRequest) {
    try {
      // Validate required fields
      this.validatePackageData(packageData);

      // Check if customer exists
      const customer = await this.getPrisma().user.findUnique({
        where: { id: packageData.customerId },
      });

      if (!customer) {
        throw new AppError("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      }

      // Create package
      const newPackage = await this.getPrisma().package.create({
        data: {
          customerId: packageData.customerId,
          description: packageData.description.trim(),
          imageUrl: packageData.imageUrl,
          pickupAddress: packageData.pickupAddress,
          pickupLat: packageData.pickupLat,
          pickupLng: packageData.pickupLng,
          deliveryAddress: packageData.deliveryAddress,
          deliveryLat: packageData.deliveryLat,
          deliveryLng: packageData.deliveryLng,
          priceOffered: packageData.priceOffered,
          size: packageData.size,
          weight: packageData.weight,
          status: "PENDING",
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Notify drivers about the new package
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyNewPackageAvailable(
            newPackage,
            packageData.requestedDriverId,
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send new package notification:",
          notificationError,
        );
      }

      return {
        success: true,
        data: newPackage,
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to create package",
        "PACKAGE_CREATION_ERROR",
        500,
      );
    }
  }

  async getPackages(filters: PackageFilters = {}) {
    try {
      const {
        status,
        minPrice,
        maxPrice,
        size,
        customerId,
        search,
        weight,
        minWeight,
        maxWeight,
        dateFrom,
        dateTo,
        sortBy = "createdAt",
        sortOrder = "desc",
        limit = 20,
        offset = 0,
      } = filters;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.priceOffered = {};
        if (minPrice !== undefined) {
          where.priceOffered.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.priceOffered.lte = maxPrice;
        }
      }

      if (size) {
        where.size = size;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      // Weight filtering
      if (weight !== undefined) {
        where.weight = weight;
      } else if (minWeight !== undefined || maxWeight !== undefined) {
        where.weight = {};
        if (minWeight !== undefined) {
          where.weight.gte = minWeight;
        }
        if (maxWeight !== undefined) {
          where.weight.lte = maxWeight;
        }
      }

      // Date range filtering
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: "insensitive" } },
          { pickupAddress: { contains: search, mode: "insensitive" } },
          { deliveryAddress: { contains: search, mode: "insensitive" } },
        ];
      }

      // Get packages with pagination
      const [packages, total] = await Promise.all([
        this.getPrisma().package.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            bids: {
              include: {
                driver: {
                  select: {
                    id: true,
                    userId: true,
                    licensePlate: true,
                    vehicleType: true,
                    carDescription: true,
                    carPhotoUrl: true,
                    rating: true,
                    totalDeliveries: true,
                    locationName: true,
                    lastLatitude: true,
                    lastLongitude: true,
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        profilePictureUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
        }),
        this.getPrisma().package.count({ where }),
      ]);

      return {
        success: true,
        data: {
          packages,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      };
    } catch (_error: any) {
      throw new AppError(
        "Failed to fetch packages",
        "PACKAGE_FETCH_ERROR",
        500,
      );
    }
  }

  async getPackageById(packageId: string) {
    try {
      const packageData = await this.getPrisma().package.findUnique({
        where: { id: packageId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          bids: {
            include: {
              driver: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                      profilePictureUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!packageData) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      return {
        success: true,
        data: packageData,
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to fetch package", "PACKAGE_FETCH_ERROR", 500);
    }
  }

  async updatePackage(packageId: string, updateData: any, userId: string) {
    try {
      const existingPackage = await this.getPrisma().package.findUnique({
        where: { id: packageId },
      });

      if (!existingPackage) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      // Check if user has permission to update this package
      if (existingPackage.customerId !== userId) {
        throw new AppError(
          "Unauthorized to update this package",
          "UNAUTHORIZED",
          403,
        );
      }

      const updatedPackage = await this.getPrisma().package.update({
        where: { id: packageId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: updatedPackage,
      };
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to update package",
        "PACKAGE_UPDATE_ERROR",
        500,
      );
    }
  }

  async updatePackageStatus(
    packageId: string,
    updateData: UpdatePackageStatusRequest,
  ) {
    try {
      const { status, notes } = updateData;

      // Validate status transition
      const existingPackage = await this.getPrisma().package.findUnique({
        where: { id: packageId },
      });

      if (!existingPackage) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      // Validate status transition
      this.validateStatusTransition(existingPackage.status, status);

      // Update package status
      const updatedPackage = await this.getPrisma().package.update({
        where: { id: packageId },
        data: {
          status,
          updatedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Create tracking update
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.createTrackingUpdate(
            packageId,
            status,
            undefined, // location
            undefined, // latitude
            undefined, // longitude
            notes,
          );
        }
      } catch (trackingError) {
        console.error("Failed to create tracking update:", trackingError);
        // Don't fail the package update if tracking fails
      }

      return {
        success: true,
        data: updatedPackage,
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to update package status",
        "PACKAGE_UPDATE_ERROR",
        500,
      );
    }
  }

  async deletePackage(packageId: string, userId: string) {
    try {
      const packageData = await this.getPrisma().package.findUnique({
        where: { id: packageId },
      });

      if (!packageData) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      // Check if user is the owner or admin
      const user = await this.getPrisma().user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError("User not found", "USER_NOT_FOUND", 404);
      }

      if (packageData.customerId !== userId && user.userType !== "ADMIN") {
        throw new AppError(
          "Unauthorized to delete this package",
          "UNAUTHORIZED",
          403,
        );
      }

      // Check if package can be deleted (only if no bids or pending status)
      if (packageData.status !== "PENDING") {
        throw new AppError(
          "Cannot delete package with status other than PENDING",
          "INVALID_STATUS",
          400,
        );
      }

      // Delete package
      await this.getPrisma().package.delete({
        where: { id: packageId },
      });

      return {
        success: true,
        message: "Package deleted successfully",
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to delete package",
        "PACKAGE_DELETE_ERROR",
        500,
      );
    }
  }

  private validatePackageData(data: CreatePackageRequest) {
    if (!data.description || !data.description.trim()) {
      throw new AppError("Description is required", "INVALID_DESCRIPTION", 400);
    }

    if (!data.pickupAddress || !data.pickupAddress.trim()) {
      throw new AppError(
        "Pickup address is required",
        "INVALID_PICKUP_ADDRESS",
        400,
      );
    }

    if (!data.deliveryAddress || !data.deliveryAddress.trim()) {
      throw new AppError(
        "Delivery address is required",
        "INVALID_DELIVERY_ADDRESS",
        400,
      );
    }

    if (data.priceOffered <= 0) {
      throw new AppError(
        "Price offered must be greater than 0",
        "INVALID_PRICE",
        400,
      );
    }

    if (data.priceOffered > 10000) {
      throw new AppError(
        "Price offered cannot exceed $10,000",
        "INVALID_PRICE",
        400,
      );
    }

    // Validate coordinates
    if (data.pickupLat < -90 || data.pickupLat > 90) {
      throw new AppError("Invalid pickup latitude", "INVALID_COORDINATES", 400);
    }

    if (data.pickupLng < -180 || data.pickupLng > 180) {
      throw new AppError(
        "Invalid pickup longitude",
        "INVALID_COORDINATES",
        400,
      );
    }

    if (data.deliveryLat < -90 || data.deliveryLat > 90) {
      throw new AppError(
        "Invalid delivery latitude",
        "INVALID_COORDINATES",
        400,
      );
    }

    if (data.deliveryLng < -180 || data.deliveryLng > 180) {
      throw new AppError(
        "Invalid delivery longitude",
        "INVALID_COORDINATES",
        400,
      );
    }

    // Validate weight if provided
    if (data.weight !== undefined && (data.weight <= 0 || data.weight > 1000)) {
      throw new AppError(
        "Weight must be between 0 and 1000 kg",
        "INVALID_WEIGHT",
        400,
      );
    }

    // Validate size if provided
    if (
      data.size &&
      !["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"].includes(data.size)
    ) {
      throw new AppError("Invalid package size", "INVALID_SIZE", 400);
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: { [key: string]: string[] } = {
      PENDING: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["IN_TRANSIT", "CANCELLED"],
      IN_TRANSIT: ["DELIVERED", "FAILED", "CANCELLED"],
      DELIVERED: [],
      FAILED: ["PENDING", "CANCELLED"],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        "INVALID_STATUS_TRANSITION",
        400,
      );
    }
  }

  /**
   * Cancel an ACCEPTED or IN_TRANSIT package. Canceller pays a 10% fee
   * of the accepted bid amount (or priceOffered fallback).
   */
  async cancelPackageWithFee(
    packageId: string,
    userId: string,
    userType: string,
  ) {
    const pkg = await this.getPrisma().package.findUnique({
      where: { id: packageId },
      include: {
        bids: {
          where: { status: "ACCEPTED" },
          include: { driver: true },
          take: 1,
        },
      },
    });

    if (!pkg) {
      throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
    }

    const status = (pkg.status || "").toUpperCase();
    if (
      status !== "ACCEPTED" &&
      status !== "IN_TRANSIT" &&
      status !== "IN_PROGRESS"
    ) {
      throw new AppError(
        "Only accepted or in-transit packages can be cancelled with a fee",
        "INVALID_CANCEL_STATUS",
        400,
      );
    }

    const acceptedBid = pkg.bids?.[0];
    const isCustomer = pkg.customerId === userId;
    const isAssignedDriver =
      acceptedBid?.driver?.userId === userId ||
      acceptedBid?.driverId === userId;
    const isAdmin = (userType || "").toUpperCase() === "ADMIN";

    if (!isCustomer && !isAssignedDriver && !isAdmin) {
      throw new AppError(
        "Only the customer or assigned driver can cancel this package",
        "UNAUTHORIZED",
        403,
      );
    }

    // Drivers may only cancel before collection (ACCEPTED), not after pickup
    if (isAssignedDriver && !isCustomer && !isAdmin && status !== "ACCEPTED") {
      throw new AppError(
        "Drivers can only cancel before the package is collected",
        "DRIVER_CANCEL_AFTER_PICKUP",
        400,
      );
    }

    const baseAmount = acceptedBid?.amount || pkg.priceOffered || 0;
    const fee = Math.round(baseAmount * 0.1 * 100) / 100;
    const cancellerRole = isAdmin
      ? "ADMIN"
      : isCustomer
        ? "CUSTOMER"
        : "DRIVER";

    if (fee > 0 && !isAdmin) {
      const wallet = await this.getPrisma().wallet.findUnique({
        where: { userId },
      });
      if (!wallet || wallet.availableBalance < fee) {
        throw new AppError(
          `Insufficient wallet balance to cover the 10% cancellation fee (P ${fee.toFixed(2)})`,
          "INSUFFICIENT_CANCEL_FEE",
          400,
        );
      }

      await this.getPrisma().$transaction([
        this.getPrisma().wallet.update({
          where: { userId },
          data: { availableBalance: { decrement: fee } },
        }),
        this.getPrisma().transaction.create({
          data: {
            userId,
            type: "CANCELLATION_FEE",
            amount: fee,
            status: "COMPLETED",
            description: `10% cancellation fee for package ${packageId.slice(-6).toUpperCase()}`,
            reference: `CXL-${Date.now()}`,
            metadata: JSON.stringify({
              packageId,
              baseAmount,
              feePercent: 10,
              cancelledBy: cancellerRole,
            }),
          },
        }),
        this.getPrisma().package.update({
          where: { id: packageId },
          data: { status: "CANCELLED" },
        }),
        this.getPrisma().bid.updateMany({
          where: {
            packageId,
            status: { in: ["ACCEPTED", "PENDING"] },
          },
          data: { status: "CANCELLED" },
        }),
      ]);
    } else {
      await this.getPrisma().$transaction([
        this.getPrisma().package.update({
          where: { id: packageId },
          data: { status: "CANCELLED" },
        }),
        this.getPrisma().bid.updateMany({
          where: {
            packageId,
            status: { in: ["ACCEPTED", "PENDING"] },
          },
          data: { status: "CANCELLED" },
        }),
      ]);
    }

    try {
      const realtimeService = getRealtimeService();
      if (realtimeService) {
        await realtimeService.createTrackingUpdate(
          packageId,
          "CANCELLED",
          undefined,
          undefined,
          undefined,
          `Cancelled by ${cancellerRole.toLowerCase()} (fee P ${fee.toFixed(2)})`,
        );
      }
    } catch {
      // non-fatal
    }

    return {
      success: true,
      data: {
        packageId,
        status: "CANCELLED",
        fee,
        cancelledBy: cancellerRole,
        baseAmount,
      },
      message:
        `Package cancelled. ${fee > 0 ? `A 10% fee of P ${fee.toFixed(2)} was charged.` : ""}`.trim(),
    };
  }

  async searchPackages(searchQuery: string, filters: PackageFilters = {}) {
    try {
      const searchFilters = {
        ...filters,
        search: searchQuery,
      };

      return await this.getPackages(searchFilters);
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to search packages", "SEARCH_ERROR", 500);
    }
  }

  async searchPackagesByLocation(
    lat: number,
    lng: number,
    radiusKm: number = 10,
    filters: PackageFilters = {},
  ) {
    try {
      // Calculate bounding box for the search radius
      const earthRadius = 6371; // Earth's radius in kilometers
      const latDelta = (radiusKm / earthRadius) * (180 / Math.PI);
      const lngDelta =
        ((radiusKm / earthRadius) * (180 / Math.PI)) /
        Math.cos((lat * Math.PI) / 180);

      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLng = lng - lngDelta;
      const maxLng = lng + lngDelta;

      // Build where clause with location bounds
      const where: any = {
        ...this.buildWhereClause(filters),
        OR: [
          // Search in pickup location
          {
            pickupLat: { gte: minLat, lte: maxLat },
            pickupLng: { gte: minLng, lte: maxLng },
          },
          // Search in delivery location
          {
            deliveryLat: { gte: minLat, lte: maxLat },
            deliveryLng: { gte: minLng, lte: maxLng },
          },
        ],
      };

      const [packages, total] = await Promise.all([
        this.getPrisma().package.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            bids: {
              include: {
                driver: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: filters.limit || 20,
          skip: filters.offset || 0,
        }),
        this.getPrisma().package.count({ where }),
      ]);

      return {
        success: true,
        data: {
          packages,
          pagination: {
            total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore: (filters.offset || 0) + (filters.limit || 20) < total,
          },
        },
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to search packages by location",
        "LOCATION_SEARCH_ERROR",
        500,
      );
    }
  }

  private buildWhereClause(filters: PackageFilters): any {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.priceOffered = {};
      if (filters.minPrice !== undefined) {
        where.priceOffered.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.priceOffered.lte = filters.maxPrice;
      }
    }

    if (filters.size) {
      where.size = filters.size;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.weight !== undefined) {
      where.weight = filters.weight;
    } else if (
      filters.minWeight !== undefined ||
      filters.maxWeight !== undefined
    ) {
      where.weight = {};
      if (filters.minWeight !== undefined) {
        where.weight.gte = filters.minWeight;
      }
      if (filters.maxWeight !== undefined) {
        where.weight.lte = filters.maxWeight;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { pickupAddress: { contains: filters.search, mode: "insensitive" } },
        { deliveryAddress: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }
}

// Export singleton instance
let packageServiceInstance: PackageService | null = null;

export function getPackageService(): PackageService {
  if (!packageServiceInstance) {
    packageServiceInstance = new PackageService();
  }
  return packageServiceInstance;
}

export default getPackageService();
