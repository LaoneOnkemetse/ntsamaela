import { getPrismaClient } from '@database/index';
import { AppError } from '../utils/errors';
import { getRealtimeService } from './realtimeService';
import {
  CreateBidRequest,
  UpdateBidRequest,
  BidFilters,
  Bid,
  // BidStatus,
  BidWithCommission,
  CommissionCalculation,
  BidAcceptanceRequest,
  BidRejectionRequest
} from '@ntsamaela/shared/types';

export interface BidWithRelations {
  id: string;
  packageId: string;
  driverId: string;
  tripId?: string;
  amount: number;
  status: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    userId: string;
    licensePlate?: string;
    vehicleType?: string;
    rating: number;
    totalDeliveries: number;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
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
  private readonly COMMISSION_PERCENTAGE = 0.30; // 30% commission

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  async createBid(bidData: CreateBidRequest): Promise<BidWithCommission> {
    try {
      // Validate required fields
      this.validateBidData(bidData);

      // Check if package exists and is available for bidding
      const package_ = await this.getPrisma().package.findUnique({
        where: { id: bidData.packageId },
        include: { customer: true }
      });

      if (!package_) {
        throw new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404);
      }

      if (package_.status !== 'PENDING') {
        throw new AppError('Package is not available for bidding', 'PACKAGE_NOT_AVAILABLE', 400);
      }

      // Check if driver exists and is verified
      const driver = await this.getPrisma().driver.findUnique({
        where: { userId: bidData.driverId },
        include: { user: true }
      });

      if (!driver) {
        throw new AppError('Driver not found', 'DRIVER_NOT_FOUND', 404);
      }

      if (!driver.user.identityVerified) {
        throw new AppError('Driver must be verified to place bids', 'DRIVER_NOT_VERIFIED', 403);
      }

      // Check if driver is not bidding on their own package
      if (package_.customerId === driver.userId) {
        throw new AppError('Cannot bid on your own package', 'INVALID_BID', 400);
      }

      // Check if trip exists and belongs to driver (if tripId provided)
      if (bidData.tripId) {
        const trip = await this.getPrisma().trip.findUnique({
          where: { id: bidData.tripId }
        });

        if (!trip) {
          throw new AppError('Trip not found', 'TRIP_NOT_FOUND', 404);
        }

        if (trip.driverId !== bidData.driverId) {
          throw new AppError('Trip does not belong to driver', 'INVALID_TRIP', 400);
        }

        if (trip.status !== 'SCHEDULED') {
          throw new AppError('Trip is not available for bidding', 'TRIP_NOT_AVAILABLE', 400);
        }
      }

      // Check if driver already has a pending bid on this package
      const existingBid = await this.getPrisma().bid.findFirst({
        where: {
          packageId: bidData.packageId,
          driverId: driver.id,
          status: 'PENDING'
        }
      });

      if (existingBid) {
        throw new AppError('Driver already has a pending bid on this package', 'DUPLICATE_BID', 400);
      }

      // Calculate commission
      const commission = this.calculateCommission(bidData.amount);

      // Create bid
      const newBid = await this.getPrisma().bid.create({
        data: {
          packageId: bidData.packageId,
          driverId: driver.id,
          tripId: bidData.tripId,
          amount: bidData.amount,
          message: bidData.message,
          status: 'PENDING'
        }
      });

      const formattedBid = {
        ...this.formatBid(newBid),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee
      };

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidReceived(bidData.packageId, formattedBid);
        }
      } catch (notificationError) {
        console.error('Failed to send bid notification:', notificationError);
        // Don't fail the bid creation if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to create bid', 'BID_CREATION_FAILED', 500);
    }
  }

  async getBids(filters: BidFilters = {}): Promise<{ bids: BidWithRelations[]; total: number }> {
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
        offset = 0
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
                    phone: true
                  }
                }
              }
            },
            package: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            },
            trip: {
              select: {
                id: true,
                startAddress: true,
                endAddress: true,
                departureTime: true,
                availableCapacity: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.getPrisma().bid.count({ where })
      ]);

      return {
        bids: bids.map((bid: any) => this.formatBidWithRelations(bid)),
        total
      };
    } catch (_error) {
      throw new AppError('Failed to fetch bids', 'BID_FETCH_FAILED', 500);
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
                  phone: true
                }
              }
            }
          },
          package: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          trip: {
            select: {
              id: true,
              startAddress: true,
              endAddress: true,
              departureTime: true,
              availableCapacity: true,
              status: true
            }
          }
        }
      });

      if (!bid) {
        throw new AppError('Bid not found', 'BID_NOT_FOUND', 404);
      }

      return this.formatBidWithRelations(bid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to fetch bid', 'BID_FETCH_FAILED', 500);
    }
  }

  async updateBid(bidId: string, updateData: UpdateBidRequest, driverId: string): Promise<Bid> {
    try {
      // Check if bid exists and belongs to driver
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId }
      });

      if (!existingBid) {
        throw new AppError('Bid not found', 'BID_NOT_FOUND', 404);
      }

      if (existingBid.driverId !== driverId) {
        throw new AppError('Unauthorized to update this bid', 'UNAUTHORIZED', 403);
      }

      if (existingBid.status !== 'PENDING') {
        throw new AppError('Can only update pending bids', 'BID_NOT_PENDING', 400);
      }

      // Update bid
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: updateData
      });

      return this.formatBid(updatedBid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to update bid', 'BID_UPDATE_FAILED', 500);
    }
  }

  async acceptBid(acceptanceData: BidAcceptanceRequest): Promise<BidWithCommission> {
    try {
      const { bidId, customerId, commissionAmount: _commissionAmount } = acceptanceData;

      // Check if bid exists
      const bid = await this.getPrisma().bid.findUnique({
        where: { id: bidId },
        include: {
          package: true,
          driver: true
        }
      });

      if (!bid) {
        throw new AppError('Bid not found', 'BID_NOT_FOUND', 404);
      }

      if (bid.status !== 'PENDING') {
        throw new AppError('Bid is not pending', 'BID_NOT_PENDING', 400);
      }

      // Check if customer owns the package
      if (bid.package.customerId !== customerId) {
        throw new AppError('Unauthorized to accept this bid', 'UNAUTHORIZED', 403);
      }

      // Check if package is still available
      if (bid.package.status !== 'PENDING') {
        throw new AppError('Package is no longer available', 'PACKAGE_NOT_AVAILABLE', 400);
      }

      // Use transaction to ensure atomicity
      const result = await this.getPrisma().$transaction(async (prisma: any) => {
        // Update bid status to accepted
        const updatedBid = await prisma.bid.update({
          where: { id: bidId },
          data: { status: 'ACCEPTED' }
        });

        // Update package status to accepted
        await prisma.package.update({
          where: { id: bid.packageId },
          data: { status: 'ACCEPTED' }
        });

        // Reject all other pending bids for this package
        await prisma.bid.updateMany({
          where: {
            packageId: bid.packageId,
            id: { not: bidId },
            status: 'PENDING'
          },
          data: { status: 'REJECTED' }
        });

        // If bid is associated with a trip, update trip status
        if (bid.tripId) {
          await prisma.trip.update({
            where: { id: bid.tripId },
            data: { status: 'IN_PROGRESS' }
          });
        }

        return updatedBid;
      });

      const commission = this.calculateCommission(bid.amount);

      const formattedBid = {
        ...this.formatBid(result),
        commissionAmount: commission.commissionAmount,
        driverEarnings: commission.driverEarnings,
        platformFee: commission.platformFee
      };

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidAccepted(bid.packageId, bidId, bid.driverId);
        }
      } catch (notificationError) {
        console.error('Failed to send bid acceptance notification:', notificationError);
        // Don't fail the bid acceptance if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to accept bid', 'BID_ACCEPTANCE_FAILED', 500);
    }
  }

  async rejectBid(rejectionData: BidRejectionRequest): Promise<Bid> {
    try {
      const { bidId, reason } = rejectionData;

      // Check if bid exists
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId }
      });

      if (!existingBid) {
        throw new AppError('Bid not found', 'BID_NOT_FOUND', 404);
      }

      if (existingBid.status !== 'PENDING') {
        throw new AppError('Bid is not pending', 'BID_NOT_PENDING', 400);
      }

      // Update bid status to rejected
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: { 
          status: 'REJECTED',
          message: reason ? `${existingBid.message || ''}\nRejection reason: ${reason}`.trim() : existingBid.message
        }
      });

      const formattedBid = this.formatBid(updatedBid);

      // Send real-time notification
      try {
        const realtimeService = getRealtimeService();
        if (realtimeService) {
          await realtimeService.notifyBidRejected(existingBid.packageId, bidId, existingBid.driverId);
        }
      } catch (notificationError) {
        console.error('Failed to send bid rejection notification:', notificationError);
        // Don't fail the bid rejection if notification fails
      }

      return formattedBid;
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to reject bid', 'BID_REJECTION_FAILED', 500);
    }
  }

  async cancelBid(bidId: string, driverId: string): Promise<Bid> {
    try {
      // Check if bid exists and belongs to driver
      const existingBid = await this.getPrisma().bid.findUnique({
        where: { id: bidId }
      });

      if (!existingBid) {
        throw new AppError('Bid not found', 'BID_NOT_FOUND', 404);
      }

      if (existingBid.driverId !== driverId) {
        throw new AppError('Unauthorized to cancel this bid', 'UNAUTHORIZED', 403);
      }

      if (existingBid.status !== 'PENDING') {
        throw new AppError('Can only cancel pending bids', 'BID_NOT_PENDING', 400);
      }

      // Update bid status to cancelled
      const updatedBid = await this.getPrisma().bid.update({
        where: { id: bidId },
        data: { status: 'CANCELLED' }
      });

      return this.formatBid(updatedBid);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to cancel bid', 'BID_CANCELLATION_FAILED', 500);
    }
  }

  async getBidsByDriver(driverId: string, filters: BidFilters = {}): Promise<{ bids: BidWithRelations[]; total: number }> {
    return this.getBids({ ...filters, driverId });
  }

  async getBidsByPackage(packageId: string, filters: BidFilters = {}): Promise<{ bids: BidWithRelations[]; total: number }> {
    return this.getBids({ ...filters, packageId });
  }

  async getPendingBids(filters: BidFilters = {}): Promise<{ bids: BidWithRelations[]; total: number }> {
    return this.getBids({ ...filters, status: 'PENDING' });
  }

  // Commission calculation methods
  calculateCommission(amount: number): CommissionCalculation {
    const commissionAmount = Math.floor(amount * this.COMMISSION_PERCENTAGE * 100) / 100; // Floor to 2 decimal places
    const driverEarnings = Math.floor((amount - commissionAmount) * 100) / 100;
    const platformFee = commissionAmount;

    return {
      tripAmount: amount,
      commissionPercentage: this.COMMISSION_PERCENTAGE,
      commissionAmount,
      driverEarnings,
      platformFee
    };
  }

  // Commission pre-authorization methods
  async preAuthorizeCommission(
    driverId: string,
    tripId: string | undefined,
    commissionAmount: number
  ): Promise<{ id: string; status: string }> {
    try {
      // Check if driver has sufficient wallet balance
      const wallet = await this.getPrisma().wallet.findUnique({
        where: { userId: driverId }
      });

      if (!wallet) {
        throw new AppError('Driver wallet not found', 'WALLET_NOT_FOUND', 404);
      }

      const totalReserved = wallet.reservedBalance + commissionAmount;
      if (totalReserved > wallet.availableBalance) {
        throw new AppError('Insufficient wallet balance for commission', 'INSUFFICIENT_BALANCE', 400);
      }

      // Create commission reservation
      const reservation = await this.getPrisma().commissionReservation.create({
        data: {
          driverId,
          tripId: tripId || 'temp',
          amount: commissionAmount,
          percentage: this.COMMISSION_PERCENTAGE * 100,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Update wallet reserved balance
      await this.getPrisma().wallet.update({
        where: { userId: driverId },
        data: {
          reservedBalance: {
            increment: commissionAmount
          }
        }
      });

      return {
        id: reservation.id,
        status: reservation.status
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to pre-authorize commission', 'COMMISSION_AUTHORIZATION_FAILED', 500);
    }
  }

  async confirmCommissionReservation(reservationId: string): Promise<void> {
    try {
      const reservation = await this.getPrisma().commissionReservation.findUnique({
        where: { id: reservationId }
      });

      if (!reservation) {
        throw new AppError('Commission reservation not found', 'RESERVATION_NOT_FOUND', 404);
      }

      if (reservation.status !== 'PENDING') {
        throw new AppError('Commission reservation is not pending', 'INVALID_RESERVATION_STATUS', 400);
      }

      // Update reservation status
      await this.getPrisma().commissionReservation.update({
        where: { id: reservationId },
        data: { status: 'CONFIRMED' }
      });

      // Move funds from reserved to platform fee
      await this.getPrisma().wallet.update({
        where: { userId: reservation.driverId },
        data: {
          reservedBalance: {
            decrement: reservation.amount
          }
        }
      });

      // Create transaction record
      await this.getPrisma().transaction.create({
        data: {
          userId: reservation.driverId,
          type: 'COMMISSION',
          amount: reservation.amount,
          status: 'COMPLETED',
          description: `Commission payment for trip ${reservation.tripId}`,
          reference: reservationId
        }
      });
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to confirm commission reservation', 'COMMISSION_CONFIRMATION_FAILED', 500);
    }
  }

  async releaseCommissionReservation(reservationId: string): Promise<void> {
    try {
      const reservation = await this.getPrisma().commissionReservation.findUnique({
        where: { id: reservationId }
      });

      if (!reservation) {
        throw new AppError('Commission reservation not found', 'RESERVATION_NOT_FOUND', 404);
      }

      if (reservation.status === 'RELEASED') {
        return; // Already released
      }

      // Update reservation status
      await this.getPrisma().commissionReservation.update({
        where: { id: reservationId },
        data: { status: 'RELEASED' }
      });

      // Release reserved funds back to available balance
      await this.getPrisma().wallet.update({
        where: { userId: reservation.driverId },
        data: {
          reservedBalance: {
            decrement: reservation.amount
          }
        }
      });
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to release commission reservation', 'COMMISSION_RELEASE_FAILED', 500);
    }
  }

  async cleanupExpiredReservations(): Promise<number> {
    try {
      const expiredReservations = await this.getPrisma().commissionReservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: new Date()
          }
        }
      });

      let cleanedCount = 0;
      for (const reservation of expiredReservations) {
        await this.releaseCommissionReservation(reservation.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (_error: any) {
      console.error('Failed to cleanup expired reservations:', _error);
      return 0;
    }
  }

  // Private helper methods
  private validateBidData(bidData: CreateBidRequest): void {
    if (!bidData.packageId) {
      throw new AppError('Package ID is required', 'VALIDATION_ERROR', 400);
    }

    if (!bidData.driverId) {
      throw new AppError('Driver ID is required', 'VALIDATION_ERROR', 400);
    }

    if (typeof bidData.amount !== 'number' || bidData.amount <= 0) {
      throw new AppError('Valid bid amount is required', 'VALIDATION_ERROR', 400);
    }

    if (bidData.amount < 1) {
      throw new AppError('Bid amount must be at least $1', 'VALIDATION_ERROR', 400);
    }

    if (bidData.amount > 10000) {
      throw new AppError('Bid amount cannot exceed $10,000', 'VALIDATION_ERROR', 400);
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
      createdAt: bid.createdAt.toISOString(),
      updatedAt: bid.updatedAt.toISOString()
    };
  }

  private formatBidWithRelations(bid: any): BidWithRelations {
    return {
      ...this.formatBid(bid),
      driver: bid.driver ? {
        id: bid.driver.id,
        userId: bid.driver.userId,
        licensePlate: bid.driver.licensePlate,
        vehicleType: bid.driver.vehicleType,
        rating: bid.driver.rating,
        totalDeliveries: bid.driver.totalDeliveries,
        user: bid.driver.user ? {
          id: bid.driver.user.id,
          firstName: bid.driver.user.firstName,
          lastName: bid.driver.user.lastName,
          phone: bid.driver.user.phone
        } : undefined
      } : undefined,
      package: bid.package ? {
        id: bid.package.id,
        customerId: bid.package.customerId,
        description: bid.package.description,
        pickupAddress: bid.package.pickupAddress,
        deliveryAddress: bid.package.deliveryAddress,
        priceOffered: bid.package.priceOffered,
        status: bid.package.status,
        customer: bid.package.customer ? {
          id: bid.package.customer.id,
          firstName: bid.package.customer.firstName,
          lastName: bid.package.customer.lastName,
          phone: bid.package.customer.phone
        } : undefined
      } : undefined,
      trip: bid.trip ? {
        id: bid.trip.id,
        startAddress: bid.trip.startAddress,
        endAddress: bid.trip.endAddress,
        departureTime: bid.trip.departureTime.toISOString(),
        availableCapacity: bid.trip.availableCapacity,
        status: bid.trip.status
      } : undefined
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
