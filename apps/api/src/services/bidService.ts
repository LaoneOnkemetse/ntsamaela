import { getPrismaClient } from "@database/index";
import { AppError } from "../utils/errors";
import { getRealtimeService } from "./realtimeService";
import {
  CreateBidRequest,
  UpdateBidRequest,
  BidFilters,
  Bid,
  // BidStatus,
  BidWithCommission,
  CommissionCalculation,
  BidAcceptanceRequest,
  BidRejectionRequest,
} from "@ntsamaela/shared/types";

export interface BidWithRelations {
  id: string;
  packageId: string;
  driverId: string;
  tripId?: string;
  amount: number;
  status: string;
  message?: string;
  bidLatitude?: number | null;
  bidLongitude?: number | null;
  bidLocationName?: string | null;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    userId: string;
    licensePlate?: string;
    vehicleType?: string;
    carDescription?: string;
    carPhotoUrl?: string;
    locationName?: string;
    rating: number;
    totalDeliveries: number;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      profilePictureUrl?: string;
    };
  };
  package?: {
    id: string;
    customerId: string;
    description: string;
    pickupAddress: string;
    deliveryAddress: string;
    priceOffered: number;
    status: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  trip?: {
    id: string;
    startAddress: string;
    endAddress: string;
    departureTime: string;
    availableCapacity: string;
    status: string;
  };
}

class BidService {
  private prisma: any;
  private readonly COMMISSION_PERCENTAGE = 0.3; // 30% commission

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
      if (!this.prisma) {
        throw new Error("Database client not available");
      }
    }
    return this.prisma;
  }

  private async resolveDriverRecordId(userId: string): Promise<string> {
    const driver = await this.getPrisma().driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) {
      throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
    }
    return driver.id;
  }

  async createBid(bidData: CreateBidRequest): Promise<BidWithCommission> {
    try {
      // Validate required fields
      this.validateBidData(bidData);

      // Check if package exists and is available for bidding
      const package_ = await this.getPrisma().package.findUnique({
        where: { id: bidData.packageId },
        include: { customer: true },
      });

      if (!package_) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      if (package_.status !== "PENDING") {
        throw new AppError(
          "Package is not available for bidding",
          "PACKAGE_NOT_AVAILABLE",
          400,
        );
      }

      // Check if driver exists and is verified
      const driver = await this.getPrisma().driver.findUnique({
        where: { userId: bidData.driverId },
        include: { user: true },
      });

      if (!driver) {
        throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
      }

      if (!driver.user.identityVerified) {
        throw new AppError(
          "Driver must be verified to place bids",
          "DRIVER_NOT_VERIFIED",
          403,
        );
      }

      // Check if driver is not bidding on their own package
      if (package_.customerId === driver.userId) {
        throw new AppError(
          "Cannot bid on your own package",
          "INVALID_BID",
          400,
        );
      }

      // Check if trip exists and belongs to driver (if tripId provided)
      if (bidData.tripId) {
        const trip = await this.getPrisma().trip.findUnique({
          where: { id: bidData.tripId },
        });

        if (!trip) {
          throw new AppError("Trip not found", "TRIP_NOT_FOUND", 404);
        }

        if (trip.driverId !== bidData.driverId) {
          throw new AppError(
            "Trip does not belong to driver",
            "INVALID_TRIP",
            400,
          );
        }

        if (trip.status !== "SCHEDULED") {
          throw new AppError(
            "Trip is not available for bidding",
            "TRIP_NOT_AVAILABLE",
            400,
          );
        }
      }

      // Check if driver already has an open bid on this package
      const existingBid = await this.getPrisma().bid.findFirst({
        where: {
          packageId: bidData.packageId,
          driverId: driver.id,
          status: { in: ["PENDING", "CUSTOMER_COUNTER", "DRIVER_COUNTER"] },
        },
      });

      if (existingBid) {
        throw new AppError(
          "Driver already has a pending bid on this package",
          "DUPLICATE_BID",
          400,
        );
      }

      // Calculate commission
      const commission = this.calculateCommission(bidData.amount);

      // Prefer live location from the client; fall back to driver's last known location
      const toNum = (v: unknown) => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
          return Number(v);
        }
        return null;
      };
      let bidLatitude =
        toNum((bidData as any).bidLatitude) ?? driver.lastLatitude ?? null;
      let bidLongitude =
        toNum((bidData as any).bidLongitude) ?? driver.lastLongitude ?? null;
      let bidLocationName =
        typeof (bidData as any).bidLocationName === "string" &&
        (bidData as any).bidLocationName
          ? (bidData as any).bidLocationName
          : (driver.locationName ?? null);

      if (bidLatitude != null && bidLongitude != null && !bidLocationName) {
        try {
          const apiKey =
            process.env.GOOGLE_MAPS_API_KEY ||
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const geoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bidLatitude},${bidLongitude}&key=${apiKey}`,
            );
            const geoData: any = await geoRes.json();
            if (geoData.status === "OK" && geoData.results?.[0]) {
              bidLocationName =
                geoData.results[0].formatted_address?.split(",")[0] ||
                geoData.results[0].formatted_address ||
                null;
            }
          }
        } catch {
          // non-fatal
        }
        if (!bidLocationName) {
          bidLocationName = `${Number(bidLatitude).toFixed(4)}, ${Number(bidLongitude).toFixed(4)}`;
        }
      }

      // Keep driver last-known location fresh when bidding
      if (bidLatitude != null && bidLongitude != null) {
        try {
          await this.getPrisma().driver.update({
            where: { id: driver.id },
            data: {
              lastLatitude: bidLatitude,
              lastLongitude: bidLongitude,
              lastLocationAt: new Date(),
              ...(bidLocationName ? { locationName: bidLocationName } : {}),
            },
          });
        } catch {
          // non-fatal
        }
      }

      // Create bid — snapshot driver's location at bid time
      const newBid = await this.getPrisma().bid.create({
        data: {
          packageId: bidData.packageId,
          driverId: driver.id,
          tripId: bidData.tripId,
          amount: bidData.amount,
          message: bidData.message,
          status: "PENDING",
          offerFrom: "DRIVER",
          bidLatitude,
          bidLongitude,
          bidLocationName,
        },
      });

      const formattedBid = {
        ...this.formatBid(newBid),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee,
      };

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidReceived(
            bidData.packageId,
            formattedBid,
          );
        }
      } catch (notificationError) {
        console.error("Failed to send bid notification:", notificationError);
        // Don't fail the bid creation if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to create bid", "BID_CREATION_FAILED", 500);
    }
  }

  async getBids(
    filters: BidFilters = {},
  ): Promise<{ bids: BidWithRelations[]; total: number }> {
    try {
      const {
        packageId,
        driverId,
        tripId,
        status,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
      } = filters;

      // Build where clause
      const where: any = {};

      if (packageId) {
        where.packageId = packageId;
      }

      if (driverId) {
        where.driverId = driverId;
      }

      if (tripId) {
        where.tripId = tripId;
      }

      if (status) {
        where.status = status;
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {};
        if (minAmount !== undefined) {
          where.amount.gte = minAmount;
        }
        if (maxAmount !== undefined) {
          where.amount.lte = maxAmount;
        }
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // Get bids with relations
      const [bids, total] = await Promise.all([
        this.getPrisma().bid.findMany({
          where,
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    profilePictureUrl: true,
                  },
                },
              },
            },
            package: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            trip: {
              select: {
                id: true,
                startAddress: true,
                endAddress: true,
                departureTime: true,
                availableCapacity: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        this.getPrisma().bid.count({ where }),
      ]);

      return {
        bids: bids.map((bid: any) => this.formatBidWithRelations(bid)),
        total,
      };
    } catch (_error) {
      throw new AppError("Failed to fetch bids", "BID_FETCH_FAILED", 500);
    }
  }

  async getBidById(bidId: string): Promise<BidWithRelations> {
    try {
      const bid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
          package: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          trip: {
            select: {
              id: true,
              startAddress: true,
              endAddress: true,
              departureTime: true,
              availableCapacity: true,
              status: true,
            },
          },
        },
      });

      if (!bid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      return this.formatBidWithRelations(bid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to fetch bid", "BID_FETCH_FAILED", 500);
    }
  }

  async updateBid(
    bidId: string,
    updateData: UpdateBidRequest,
    userId: string,
  ): Promise<Bid> {
    try {
      const driverRecordId = await this.resolveDriverRecordId(userId);

      // Check if bid exists and belongs to driver
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
      });

      if (!existingBid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      if (existingBid.driverId !== driverRecordId) {
        throw new AppError(
          "Unauthorized to update this bid",
          "UNAUTHORIZED",
          403,
        );
      }

      if (
        !["PENDING", "DRIVER_COUNTER", "CUSTOMER_COUNTER"].includes(
          (existingBid.status || "").toUpperCase(),
        )
      ) {
        throw new AppError("Can only update open bids", "BID_NOT_PENDING", 400);
      }

      const nextAmount =
        typeof updateData.amount === "number"
          ? updateData.amount
          : existingBid.amount;

      // Driver counter / update replaces the active offer in place
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: {
          amount: nextAmount,
          message:
            updateData.message ||
            `Driver counter: P${nextAmount} (awaiting customer)`,
          status: "DRIVER_COUNTER",
          offerFrom: "DRIVER",
          updatedAt: new Date(),
        },
        include: {
          driver: { include: { user: true } },
          package: { include: { customer: true } },
        },
      });

      try {
        const realtimeService = getRealtimeService();
        if (realtimeService && updatedBid.package) {
          await realtimeService.notifyBidReceived(
            updatedBid.packageId,
            this.formatBidWithRelations({ ...updatedBid, trip: null }),
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send bid update notification:",
          notificationError,
        );
      }

      return this.formatBid(updatedBid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to update bid", "BID_UPDATE_FAILED", 500);
    }
  }

  async acceptBid(
    acceptanceData: BidAcceptanceRequest,
  ): Promise<BidWithCommission> {
    try {
      const {
        bidId,
        customerId,
        commissionAmount: _commissionAmount,
      } = acceptanceData;

      // Check if bid exists
      const bid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: {
          package: true,
          driver: true,
        },
      });

      if (!bid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      const status = (bid.status || "").toUpperCase();
      const offerFrom = (bid.offerFrom || "DRIVER").toUpperCase();
      const isCustomerCounter =
        status === "CUSTOMER_COUNTER" || offerFrom === "CUSTOMER";

      if (isCustomerCounter) {
        // Driver accepts the customer's separate counter offer
        const driverRecordId = await this.resolveDriverRecordId(customerId);
        const isDriver =
          bid.driverId === driverRecordId || bid.driver?.userId === customerId;
        if (!isDriver) {
          if (bid.package.customerId === customerId) {
            throw new AppError(
              "Waiting for the driver to accept your counter offer",
              "AWAITING_DRIVER",
              400,
            );
          }
          throw new AppError(
            "Unauthorized to accept this counter offer",
            "UNAUTHORIZED",
            403,
          );
        }
      } else {
        if (!["PENDING", "DRIVER_COUNTER"].includes(status)) {
          throw new AppError("Bid is not pending", "BID_NOT_PENDING", 400);
        }

        // Check if customer owns the package
        if (bid.package.customerId !== customerId) {
          throw new AppError(
            "Unauthorized to accept this bid",
            "UNAUTHORIZED",
            403,
          );
        }
      }

      // Check if package is still available
      if (bid.package.status !== "PENDING") {
        throw new AppError(
          "Package is no longer available",
          "PACKAGE_NOT_AVAILABLE",
          400,
        );
      }

      // Use transaction to ensure atomicity
      const result = await this.getPrisma().$transaction(
        async (prisma: any) => {
          // Update bid status to accepted
          const updatedBid = await prisma.bid.update({
            where: { id: bidId },
            data: { status: "ACCEPTED" },
          });

          // Update package status to accepted
          await prisma.package.update({
            where: { id: bid.packageId },
            data: {
              status: "ACCEPTED",
              priceOffered: bid.amount,
            },
          });

          // Reject all other open bids/counters for this package
          await prisma.bid.updateMany({
            where: {
              packageId: bid.packageId,
              id: { not: bidId },
              status: {
                in: ["PENDING", "CUSTOMER_COUNTER", "DRIVER_COUNTER"],
              },
            },
            data: { status: "REJECTED" },
          });

          // If bid is associated with a trip, update trip status
          if (bid.tripId) {
            await prisma.trip.update({
              where: { id: bid.tripId },
              data: { status: "IN_PROGRESS" },
            });
          }

          return updatedBid;
        },
      );

      const commission = this.calculateCommission(bid.amount);

      const formattedBid = {
        ...this.formatBid(result),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee,
      };

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidAccepted(
            bid.packageId,
            bidId,
            bid.driver.userId,
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send bid acceptance notification:",
          notificationError,
        );
        // Don't fail the bid acceptance if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to accept bid", "BID_ACCEPTANCE_FAILED", 500);
    }
  }

  async rejectBid(rejectionData: BidRejectionRequest): Promise<Bid> {
    try {
      const { bidId, reason } = rejectionData;

      // Check if bid exists
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: { driver: { select: { userId: true } } },
      });

      if (!existingBid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      if (existingBid.status !== "PENDING") {
        throw new AppError("Bid is not pending", "BID_NOT_PENDING", 400);
      }

      // Update bid status to rejected
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: {
          status: "REJECTED",
          message: reason
            ? `${existingBid.message || ""}\nRejection reason: ${reason}`.trim()
            : existingBid.message,
        },
      });

      const formattedBid = this.formatBid(updatedBid);

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidRejected(
            existingBid.packageId,
            bidId,
            existingBid.driver?.userId || existingBid.driverId,
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send bid rejection notification:",
          notificationError,
        );
        // Don't fail the bid rejection if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to reject bid", "BID_REJECTION_FAILED", 500);
    }
  }

  async cancelBid(bidId: string, userId: string): Promise<Bid> {
    try {
      const driverRecordId = await this.resolveDriverRecordId(userId);

      // Check if bid exists and belongs to driver
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
      });

      if (!existingBid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      if (existingBid.driverId !== driverRecordId) {
        throw new AppError(
          "Unauthorized to cancel this bid",
          "UNAUTHORIZED",
          403,
        );
      }

      if (existingBid.status !== "PENDING") {
        throw new AppError(
          "Can only cancel pending bids",
          "BID_NOT_PENDING",
          400,
        );
      }

      // Update bid status to cancelled
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: { status: "CANCELLED" },
      });

      return this.formatBid(updatedBid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to cancel bid",
        "BID_CANCELLATION_FAILED",
        500,
      );
    }
  }

  async getBidsByDriver(
    userId: string,
    filters: BidFilters = {},
  ): Promise<{ bids: BidWithRelations[]; total: number }> {
    const driverRecordId = await this.resolveDriverRecordId(userId);
    return this.getBids({ ...filters, driverId: driverRecordId });
  }

  async getBidsByPackage(
    packageId: string,
    filters: BidFilters = {},
  ): Promise<{ bids: BidWithRelations[]; total: number }> {
    return this.getBids({ ...filters, packageId });
  }

  async getPendingBids(
    filters: BidFilters = {},
  ): Promise<{ bids: BidWithRelations[]; total: number }> {
    return this.getBids({ ...filters, status: "PENDING" });
  }

  async getRecommendedBid(
    packageId: string,
  ): Promise<{ recommendedAmount: number; reasoning: string }> {
    try {
      const package_ = await this.getPrisma().package.findUnique({
        where: { id: packageId },
        include: {
          bids: {
            where: { status: "PENDING" },
            orderBy: { amount: "asc" },
            take: 5,
          },
        },
      });

      if (!package_) {
        throw new AppError("Package not found", "PACKAGE_NOT_FOUND", 404);
      }

      // Calculate recommended bid based on:
      // 1. Package price offered
      // 2. Average of existing bids
      // 3. Distance and urgency
      const priceOffered = package_.priceOffered;
      const existingBids = package_.bids || [];

      let recommendedAmount = priceOffered * 0.9; // Start at 90% of offered price

      if (existingBids.length > 0) {
        const averageBid =
          existingBids.reduce((sum: number, bid: any) => sum + bid.amount, 0) /
          existingBids.length;
        const minBid = Math.min(...existingBids.map((bid: any) => bid.amount));
        // Recommend slightly below average but above minimum
        recommendedAmount = Math.max(minBid * 1.05, averageBid * 0.95);
      }

      // Adjust based on urgency
      if (package_.urgency === "URGENT") {
        recommendedAmount = recommendedAmount * 1.1; // 10% premium for urgent
      }

      // Round to 2 decimal places
      recommendedAmount = Math.round(recommendedAmount * 100) / 100;

      const reasoning =
        existingBids.length > 0
          ? `Based on ${existingBids.length} existing bids, recommended amount is ${recommendedAmount.toFixed(2)}`
          : `Based on package price of ${priceOffered}, recommended amount is ${recommendedAmount.toFixed(2)}`;

      return {
        recommendedAmount,
        reasoning,
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to get recommended bid",
        "RECOMMENDED_BID_FAILED",
        500,
      );
    }
  }

  async counterBid(
    bidId: string,
    newAmount: number,
    userId: string,
  ): Promise<BidWithCommission> {
    try {
      const driverRecordId = await this.resolveDriverRecordId(userId);

      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: { package: true },
      });

      if (!existingBid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      if (existingBid.driverId !== driverRecordId) {
        throw new AppError(
          "Unauthorized to modify this bid",
          "UNAUTHORIZED",
          403,
        );
      }

      if (
        existingBid.status !== "PENDING" &&
        existingBid.status !== "CUSTOMER_COUNTER" &&
        existingBid.status !== "DRIVER_COUNTER"
      ) {
        throw new AppError("Bid is not pending", "BID_NOT_PENDING", 400);
      }

      if (newAmount <= 0) {
        throw new AppError(
          "Bid amount must be greater than 0",
          "INVALID_AMOUNT",
          400,
        );
      }

      // Driver counter replaces the active offer in place
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: {
          amount: newAmount,
          status: "DRIVER_COUNTER",
          offerFrom: "DRIVER",
          message: `Driver counter: P${newAmount} (awaiting customer)`,
          updatedAt: new Date(),
        },
        include: {
          driver: {
            include: { user: true },
          },
          package: {
            include: { customer: true },
          },
          trip: true,
        },
      });

      const commission = this.calculateCommission(newAmount);

      const formattedBid = {
        ...this.formatBid(updatedBid),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee,
      };

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidReceived(
            existingBid.packageId,
            formattedBid,
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send counter bid notification:",
          notificationError,
        );
      }

      return formattedBid;
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to counter bid", "COUNTER_BID_FAILED", 500);
    }
  }

  async customerCounterOffer(
    bidId: string,
    newAmount: number,
    customerId: string,
  ): Promise<BidWithCommission> {
    try {
      const bid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: {
          package: true,
          driver: { include: { user: true } },
        },
      });

      if (!bid) {
        throw new AppError("Bid not found", "BID_NOT_FOUND", 404);
      }

      if (bid.package.customerId !== customerId) {
        throw new AppError(
          "Unauthorized to counter this bid",
          "UNAUTHORIZED",
          403,
        );
      }

      const status = (bid.status || "").toUpperCase();
      const openStatuses = ["PENDING", "DRIVER_COUNTER", "CUSTOMER_COUNTER"];
      if (!openStatuses.includes(status)) {
        throw new AppError(
          "This bid is no longer open for counter offers",
          "BID_NOT_PENDING",
          400,
        );
      }

      if (newAmount <= 0) {
        throw new AppError(
          "Counter amount must be greater than 0",
          "INVALID_AMOUNT",
          400,
        );
      }

      // Replace the active bid in place — one open offer per driver/package
      const counterBid = await this.getPrisma().bid.update({
        where: { id: bid.id },
        data: {
          amount: newAmount,
          status: "CUSTOMER_COUNTER",
          offerFrom: "CUSTOMER",
          message: `Customer counter: P${newAmount} (awaiting driver)`,
          updatedAt: new Date(),
        },
        include: {
          driver: { include: { user: true } },
          package: { include: { customer: true } },
        },
      });

      // Close any leftover duplicate open bids for same driver/package
      await this.getPrisma().bid.updateMany({
        where: {
          packageId: bid.packageId,
          driverId: bid.driverId,
          id: { not: bid.id },
          status: { in: openStatuses },
        },
        data: { status: "REJECTED" },
      });

      const commission = this.calculateCommission(newAmount);
      const formattedBid = {
        ...this.formatBid(counterBid),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee,
      };

      try {
        const realtimeService = getRealtimeService();
        if (realtimeService && bid.driver?.userId) {
          await realtimeService.notifyCustomerCounterOffer(
            bid.packageId,
            counterBid.id,
            bid.driver.userId,
            newAmount,
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send customer counter notification:",
          notificationError,
        );
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to submit counter offer",
        "CUSTOMER_COUNTER_FAILED",
        500,
      );
    }
  }

  // Commission calculation methods
  calculateCommission(amount: number): CommissionCalculation {
    const commissionAmount =
      Math.floor(amount * this.COMMISSION_PERCENTAGE * 100) / 100; // Floor to 2 decimal places
    const driverEarnings = Math.floor((amount - commissionAmount) * 100) / 100;
    const platformFee = commissionAmount;

    return {
      tripAmount: amount,
      commissionPercentage: this.COMMISSION_PERCENTAGE,
      commissionAmount,
      driverEarnings,
      platformFee,
    };
  }

  // Commission pre-authorization methods
  async preAuthorizeCommission(
    driverId: string,
    tripId: string | undefined,
    commissionAmount: number,
  ): Promise<{ id: string; status: string }> {
    try {
      // Check if driver has sufficient wallet balance
      const wallet = await this.getPrisma().wallet.findUnique({
        where: { userId: driverId },
      });

      if (!wallet) {
        throw new AppError("Driver wallet not found", "WALLET_NOT_FOUND", 404);
      }

      const totalReserved = wallet.reservedBalance + commissionAmount;
      if (totalReserved > wallet.availableBalance) {
        throw new AppError(
          "Insufficient wallet balance for commission",
          "INSUFFICIENT_BALANCE",
          400,
        );
      }

      // Create commission reservation
      const reservation = await this.getPrisma().commissionReservation.create({
        data: {
          driverId,
          tripId: tripId || "temp",
          amount: commissionAmount,
          percentage: this.COMMISSION_PERCENTAGE * 100,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Update wallet reserved balance
      await this.getPrisma().wallet.update({
        where: { userId: driverId },
        data: {
          reservedBalance: {
            increment: commissionAmount,
          },
        },
      });

      return {
        id: reservation.id,
        status: reservation.status,
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to pre-authorize commission",
        "COMMISSION_AUTHORIZATION_FAILED",
        500,
      );
    }
  }

  async confirmCommissionReservation(reservationId: string): Promise<void> {
    try {
      const reservation =
        await this.getPrisma().commissionReservation.findUnique({
          where: { id: reservationId },
        });

      if (!reservation) {
        throw new AppError(
          "Commission reservation not found",
          "RESERVATION_NOT_FOUND",
          404,
        );
      }

      if (reservation.status !== "PENDING") {
        throw new AppError(
          "Commission reservation is not pending",
          "INVALID_RESERVATION_STATUS",
          400,
        );
      }

      // Update reservation status
      await this.getPrisma().commissionReservation.update({
        where: { id: reservationId },
        data: { status: "CONFIRMED" },
      });

      // Move funds from reserved to platform fee
      await this.getPrisma().wallet.update({
        where: { userId: reservation.driverId },
        data: {
          reservedBalance: {
            decrement: reservation.amount,
          },
        },
      });

      // Create transaction record
      await this.getPrisma().transaction.create({
        data: {
          userId: reservation.driverId,
          type: "COMMISSION",
          amount: reservation.amount,
          status: "COMPLETED",
          description: `Commission payment for trip ${reservation.tripId}`,
          reference: reservationId,
        },
      });
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to confirm commission reservation",
        "COMMISSION_CONFIRMATION_FAILED",
        500,
      );
    }
  }

  async releaseCommissionReservation(reservationId: string): Promise<void> {
    try {
      const reservation =
        await this.getPrisma().commissionReservation.findUnique({
          where: { id: reservationId },
        });

      if (!reservation) {
        throw new AppError(
          "Commission reservation not found",
          "RESERVATION_NOT_FOUND",
          404,
        );
      }

      if (reservation.status === "RELEASED") {
        return; // Already released
      }

      // Update reservation status
      await this.getPrisma().commissionReservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED" },
      });

      // Release reserved funds back to available balance
      await this.getPrisma().wallet.update({
        where: { userId: reservation.driverId },
        data: {
          reservedBalance: {
            decrement: reservation.amount,
          },
        },
      });
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to release commission reservation",
        "COMMISSION_RELEASE_FAILED",
        500,
      );
    }
  }

  async cleanupExpiredReservations(): Promise<number> {
    try {
      const expiredReservations =
        await this.getPrisma().commissionReservation.findMany({
          where: {
            status: "PENDING",
            expiresAt: {
              lt: new Date(),
            },
          },
        });

      let cleanedCount = 0;
      for (const reservation of expiredReservations) {
        await this.releaseCommissionReservation(reservation.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (_error: any) {
      console.error("Failed to cleanup expired reservations:", _error);
      return 0;
    }
  }

  // Private helper methods
  private validateBidData(bidData: CreateBidRequest): void {
    if (!bidData.packageId) {
      throw new AppError("Package ID is required", "VALIDATION_ERROR", 400);
    }

    if (!bidData.driverId) {
      throw new AppError("Driver ID is required", "VALIDATION_ERROR", 400);
    }

    if (typeof bidData.amount !== "number" || bidData.amount <= 0) {
      throw new AppError(
        "Valid bid amount is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    if (bidData.amount < 1) {
      throw new AppError(
        "Bid amount must be at least $1",
        "VALIDATION_ERROR",
        400,
      );
    }

    if (bidData.amount > 10000) {
      throw new AppError(
        "Bid amount cannot exceed $10,000",
        "VALIDATION_ERROR",
        400,
      );
    }
  }

  private formatBid(bid: any): Bid {
    return {
      id: bid.id,
      packageId: bid.packageId,
      driverId: bid.driverId,
      tripId: bid.tripId,
      amount: bid.amount,
      status: bid.status,
      message: bid.message,
      parentBidId: bid.parentBidId ?? null,
      offerFrom: bid.offerFrom ?? "DRIVER",
      bidLatitude: bid.bidLatitude ?? null,
      bidLongitude: bid.bidLongitude ?? null,
      bidLocationName: bid.bidLocationName ?? null,
      createdAt: bid.createdAt.toISOString(),
      updatedAt: bid.updatedAt.toISOString(),
    };
  }

  private formatBidWithRelations(bid: any): BidWithRelations {
    return {
      ...this.formatBid(bid),
      driver: bid.driver
        ? {
            id: bid.driver.id,
            userId: bid.driver.userId,
            licensePlate: bid.driver.licensePlate,
            vehicleType: bid.driver.vehicleType,
            carDescription: bid.driver.carDescription,
            carPhotoUrl: bid.driver.carPhotoUrl,
            rating: bid.driver.rating,
            totalDeliveries: bid.driver.totalDeliveries,
            locationName: bid.driver.locationName,
            user: bid.driver.user
              ? {
                  id: bid.driver.user.id,
                  firstName: bid.driver.user.firstName,
                  lastName: bid.driver.user.lastName,
                  phone: bid.driver.user.phone,
                  profilePictureUrl: bid.driver.user.profilePictureUrl,
                }
              : undefined,
          }
        : undefined,
      package: bid.package
        ? {
            id: bid.package.id,
            customerId: bid.package.customerId,
            description: bid.package.description,
            pickupAddress: bid.package.pickupAddress,
            deliveryAddress: bid.package.deliveryAddress,
            priceOffered: bid.package.priceOffered,
            status: bid.package.status,
            customer: bid.package.customer
              ? {
                  id: bid.package.customer.id,
                  firstName: bid.package.customer.firstName,
                  lastName: bid.package.customer.lastName,
                  phone: bid.package.customer.phone,
                }
              : undefined,
          }
        : undefined,
      trip: bid.trip
        ? {
            id: bid.trip.id,
            startAddress: bid.trip.startAddress,
            endAddress: bid.trip.endAddress,
            departureTime: bid.trip.departureTime.toISOString(),
            availableCapacity: bid.trip.availableCapacity,
            status: bid.trip.status,
          }
        : undefined,
    };
  }
}

// Export singleton instance
let bidServiceInstance: BidService | null = null;

export function getBidService(): BidService {
  if (!bidServiceInstance) {
    bidServiceInstance = new BidService();
  }
  return bidServiceInstance;
}

export default getBidService();
