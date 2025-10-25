import bidService from '../bidService';
import { getPrismaClient } from '@database/index';
import { AppError } from '../../utils/errors';
import { CreateBidRequest, UpdateBidRequest, BidFilters, BidAcceptanceRequest, BidRejectionRequest } from '@ntsamaela/shared/types';

// Mock the database
const mockPrisma = {
  bid: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  package: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  driver: {
    findUnique: jest.fn()
  },
  trip: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

describe('BidService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBid', () => {
    const validBidData: CreateBidRequest = {
      packageId: 'package123',
      driverId: 'driver123',
      amount: 50.00,
      message: 'I can deliver this package'
    };

    it('should create a bid successfully', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'PENDING',
        customerId: 'customer123'
      };

      const mockDriver = {
        id: 'driver123',
        userId: 'driver-user123',
        user: { identityVerified: true }
      };

      const mockBid = {
        id: 'bid123',
        ...validBidData,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.bid.findFirst.mockResolvedValue(null);
      mockPrisma.bid.create.mockResolvedValue(mockBid);

      const result = await bidService.createBid(validBidData);

      expect(mockPrisma.package.findUnique).toHaveBeenCalledWith({
        where: { id: validBidData.packageId },
        include: { customer: true }
      });
      expect(mockPrisma.driver.findUnique).toHaveBeenCalledWith({
        where: { userId: validBidData.driverId },
        include: { user: true }
      });
      expect(mockPrisma.bid.create).toHaveBeenCalledWith({
        data: {
          packageId: validBidData.packageId,
          driverId: validBidData.driverId,
          tripId: validBidData.tripId,
          amount: validBidData.amount,
          message: validBidData.message,
          status: 'PENDING'
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'bid123',
        packageId: 'package123',
        driverId: 'driver123',
        amount: 50.00,
        status: 'PENDING',
        commissionAmount: 15.00, // 30% of 50
        driverEarnings: 35.00
      }));
    });

    it('should throw error if package not found', async () => {
      mockPrisma.package.findUnique.mockResolvedValue(null);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404)
      );
    });

    it('should throw error if package not available', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'ACCEPTED',
        customerId: 'customer123'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Package is not available for bidding', 'PACKAGE_NOT_AVAILABLE', 400)
      );
    });

    it('should throw error if driver not found', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'PENDING',
        customerId: 'customer123'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.driver.findUnique.mockResolvedValue(null);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Driver not found', 'DRIVER_NOT_FOUND', 404)
      );
    });

    it('should throw error if driver not verified', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'PENDING',
        customerId: 'customer123'
      };

      const mockDriver = {
        id: 'driver123',
        userId: 'driver-user123',
        user: { identityVerified: false }
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Driver must be verified to place bids', 'DRIVER_NOT_VERIFIED', 403)
      );
    });

    it('should throw error if driver bidding on own package', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'PENDING',
        customerId: 'driver-user123' // Same as driver's userId
      };

      const mockDriver = {
        id: 'driver123',
        userId: 'driver-user123',
        user: { identityVerified: true }
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Cannot bid on your own package', 'INVALID_BID', 400)
      );
    });

    it('should throw error for duplicate bid', async () => {
      const mockPackage = {
        id: 'package123',
        status: 'PENDING',
        customerId: 'customer123'
      };

      const mockDriver = {
        id: 'driver123',
        userId: 'driver-user123',
        user: { identityVerified: true }
      };

      const existingBid = {
        id: 'existing-bid',
        status: 'PENDING'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.bid.findFirst.mockResolvedValue(existingBid);

      await expect(bidService.createBid(validBidData)).rejects.toThrow(
        new AppError('Driver already has a pending bid on this package', 'DUPLICATE_BID', 400)
      );
    });

    it('should validate bid amount', async () => {
      const invalidBidData = {
        ...validBidData,
        amount: 0
      };

      await expect(bidService.createBid(invalidBidData)).rejects.toThrow(
        new AppError('Valid bid amount is required', 'VALIDATION_ERROR', 400)
      );
    });

    it('should validate bid amount range', async () => {
      const invalidBidData = {
        ...validBidData,
        amount: 15000 // Exceeds max
      };

      await expect(bidService.createBid(invalidBidData)).rejects.toThrow(
        new AppError('Bid amount cannot exceed $10,000', 'VALIDATION_ERROR', 400)
      );
    });
  });

  describe('getBids', () => {
    it('should return bids with default filters', async () => {
      const mockBids = [
        {
          id: 'bid1',
          packageId: 'package1',
          driverId: 'driver1',
          amount: 50,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.bid.findMany.mockResolvedValue(mockBids);
      mockPrisma.bid.count.mockResolvedValue(1);

      const result = await bidService.getBids();

      expect(result.bids).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const filters: BidFilters = {
        packageId: 'package123',
        status: 'PENDING',
        minAmount: 10,
        maxAmount: 100
      };

      mockPrisma.bid.findMany.mockResolvedValue([]);
      mockPrisma.bid.count.mockResolvedValue(0);

      await bidService.getBids(filters);

      expect(mockPrisma.bid.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package123',
          status: 'PENDING',
          amount: {
            gte: 10,
            lte: 100
          }
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });
    });
  });

  describe('getBidById', () => {
    it('should return bid by ID', async () => {
      const mockBid = {
        id: 'bid123',
        packageId: 'package123',
        driverId: 'driver123',
        amount: 50,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.bid.findUnique.mockResolvedValue(mockBid);

      const result = await bidService.getBidById('bid123');

      expect(mockPrisma.bid.findUnique).toHaveBeenCalledWith({
        where: { id: 'bid123' },
        include: expect.any(Object)
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'bid123',
        packageId: 'package123'
      }));
    });

    it('should throw error if bid not found', async () => {
      mockPrisma.bid.findUnique.mockResolvedValue(null);

      await expect(bidService.getBidById('nonexistent')).rejects.toThrow(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );
    });
  });

  describe('updateBid', () => {
    const updateData: UpdateBidRequest = {
      amount: 60.00,
      message: 'Updated bid message'
    };

    it('should update bid successfully', async () => {
      const existingBid = {
        id: 'bid123',
        driverId: 'driver123',
        status: 'PENDING'
      };

      const updatedBid = {
        ...existingBid,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);
      mockPrisma.bid.update.mockResolvedValue(updatedBid);

      const result = await bidService.updateBid('bid123', updateData, 'driver123');

      expect(mockPrisma.bid.findUnique).toHaveBeenCalledWith({
        where: { id: 'bid123' }
      });
      expect(mockPrisma.bid.update).toHaveBeenCalledWith({
        where: { id: 'bid123' },
        data: updateData
      });
      expect(result.amount).toBe(60.00);
    });

    it('should throw error if bid not found', async () => {
      mockPrisma.bid.findUnique.mockResolvedValue(null);

      await expect(bidService.updateBid('nonexistent', updateData, 'driver123')).rejects.toThrow(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );
    });

    it('should throw error if unauthorized', async () => {
      const existingBid = {
        id: 'bid123',
        driverId: 'different-driver',
        status: 'PENDING'
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);

      await expect(bidService.updateBid('bid123', updateData, 'driver123')).rejects.toThrow(
        new AppError('Unauthorized to update this bid', 'UNAUTHORIZED', 403)
      );
    });

    it('should throw error if bid not pending', async () => {
      const existingBid = {
        id: 'bid123',
        driverId: 'driver123',
        status: 'ACCEPTED'
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);

      await expect(bidService.updateBid('bid123', updateData, 'driver123')).rejects.toThrow(
        new AppError('Can only update pending bids', 'BID_NOT_PENDING', 400)
      );
    });
  });

  describe('acceptBid', () => {
    const acceptanceData: BidAcceptanceRequest = {
      bidId: 'bid123',
      customerId: 'customer123',
      commissionAmount: 15.00
    };

    it('should accept bid successfully', async () => {
      const mockBid = {
        id: 'bid123',
        packageId: 'package123',
        driverId: 'driver123',
        tripId: 'trip123',
        amount: 50,
        status: 'PENDING'
      };

      const mockPackage = {
        id: 'package123',
        customerId: 'customer123',
        status: 'PENDING'
      };

      const mockDriver = {
        id: 'driver123'
      };

      const updatedBid = {
        ...mockBid,
        status: 'ACCEPTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.bid.findUnique.mockResolvedValue({
        ...mockBid,
        package: mockPackage,
        driver: mockDriver,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      mockPrisma.bid.update.mockResolvedValue(updatedBid);
      mockPrisma.package.update.mockResolvedValue({});
      mockPrisma.bid.updateMany.mockResolvedValue({});
      mockPrisma.trip.update.mockResolvedValue({});

      const result = await bidService.acceptBid(acceptanceData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'bid123',
        status: 'ACCEPTED',
        commissionAmount: 15.00,
        driverEarnings: 35.00
      }));
    });

    it('should throw error if bid not found', async () => {
      mockPrisma.bid.findUnique.mockResolvedValue(null);

      await expect(bidService.acceptBid(acceptanceData)).rejects.toThrow(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );
    });

    it('should throw error if bid not pending', async () => {
      const mockBid = {
        id: 'bid123',
        status: 'ACCEPTED'
      };

      mockPrisma.bid.findUnique.mockResolvedValue(mockBid);

      await expect(bidService.acceptBid(acceptanceData)).rejects.toThrow(
        new AppError('Bid is not pending', 'BID_NOT_PENDING', 400)
      );
    });

    it('should throw error if unauthorized', async () => {
      const mockBid = {
        id: 'bid123',
        status: 'PENDING',
        package: {
          customerId: 'different-customer'
        }
      };

      mockPrisma.bid.findUnique.mockResolvedValue(mockBid);

      await expect(bidService.acceptBid(acceptanceData)).rejects.toThrow(
        new AppError('Unauthorized to accept this bid', 'UNAUTHORIZED', 403)
      );
    });
  });

  describe('rejectBid', () => {
    const rejectionData: BidRejectionRequest = {
      bidId: 'bid123',
      reason: 'Price too high'
    };

    it('should reject bid successfully', async () => {
      const existingBid = {
        id: 'bid123',
        status: 'PENDING',
        message: 'Original message'
      };

      const updatedBid = {
        ...existingBid,
        status: 'REJECTED',
        message: 'Original message\nRejection reason: Price too high',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);
      mockPrisma.bid.update.mockResolvedValue(updatedBid);

      const result = await bidService.rejectBid(rejectionData);

      expect(mockPrisma.bid.update).toHaveBeenCalledWith({
        where: { id: 'bid123' },
        data: {
          status: 'REJECTED',
          message: 'Original message\nRejection reason: Price too high'
        }
      });
      expect(result.status).toBe('REJECTED');
    });

    it('should throw error if bid not found', async () => {
      mockPrisma.bid.findUnique.mockResolvedValue(null);

      await expect(bidService.rejectBid(rejectionData)).rejects.toThrow(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );
    });

    it('should throw error if bid not pending', async () => {
      const existingBid = {
        id: 'bid123',
        status: 'ACCEPTED'
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);

      await expect(bidService.rejectBid(rejectionData)).rejects.toThrow(
        new AppError('Bid is not pending', 'BID_NOT_PENDING', 400)
      );
    });
  });

  describe('cancelBid', () => {
    it('should cancel bid successfully', async () => {
      const existingBid = {
        id: 'bid123',
        driverId: 'driver123',
        status: 'PENDING'
      };

      const updatedBid = {
        ...existingBid,
        status: 'CANCELLED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);
      mockPrisma.bid.update.mockResolvedValue(updatedBid);

      const result = await bidService.cancelBid('bid123', 'driver123');

      expect(mockPrisma.bid.update).toHaveBeenCalledWith({
        where: { id: 'bid123' },
        data: { status: 'CANCELLED' }
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if unauthorized', async () => {
      const existingBid = {
        id: 'bid123',
        driverId: 'different-driver',
        status: 'PENDING'
      };

      mockPrisma.bid.findUnique.mockResolvedValue(existingBid);

      await expect(bidService.cancelBid('bid123', 'driver123')).rejects.toThrow(
        new AppError('Unauthorized to cancel this bid', 'UNAUTHORIZED', 403)
      );
    });
  });

  describe('calculateCommission', () => {
    it('should calculate 30% commission correctly', () => {
      const result = bidService.calculateCommission(100);

      expect(result).toEqual({
        tripAmount: 100,
        commissionPercentage: 0.30,
        commissionAmount: 30.00,
        driverEarnings: 70.00,
        platformFee: 30.00
      });
    });

    it('should handle decimal amounts correctly', () => {
      const result = bidService.calculateCommission(33.33);

      expect(result.commissionAmount).toBe(9.99); // Floored to 2 decimal places
      expect(result.driverEarnings).toBe(23.33);
    });

    it('should handle edge case amounts', () => {
      const result = bidService.calculateCommission(0.01);

      expect(result.commissionAmount).toBe(0.00); // Floored
      expect(result.driverEarnings).toBe(0.01);
    });
  });

  describe('getBidsByDriver', () => {
    it('should return bids for specific driver', async () => {
      const filters: BidFilters = { status: 'PENDING' };
      
      mockPrisma.bid.findMany.mockResolvedValue([]);
      mockPrisma.bid.count.mockResolvedValue(0);

      await bidService.getBidsByDriver('driver123', filters);

      expect(mockPrisma.bid.findMany).toHaveBeenCalledWith({
        where: {
          driverId: 'driver123',
          status: 'PENDING'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });
    });
  });

  describe('getBidsByPackage', () => {
    it('should return bids for specific package', async () => {
      const filters: BidFilters = { status: 'PENDING' };
      
      mockPrisma.bid.findMany.mockResolvedValue([]);
      mockPrisma.bid.count.mockResolvedValue(0);

      await bidService.getBidsByPackage('package123', filters);

      expect(mockPrisma.bid.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package123',
          status: 'PENDING'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });
    });
  });

  describe('getPendingBids', () => {
    it('should return only pending bids', async () => {
      mockPrisma.bid.findMany.mockResolvedValue([]);
      mockPrisma.bid.count.mockResolvedValue(0);

      await bidService.getPendingBids();

      expect(mockPrisma.bid.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });
    });
  });
});
