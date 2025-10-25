import { Request, Response } from 'express';
import BidController from '../bidController';
import bidService from '../../services/bidService';
import { AppError } from '../../utils/errors';

jest.mock('../../services/bidService', () => ({
  __esModule: true,
  default: {
    createBid: jest.fn(),
    getBids: jest.fn(),
    getBidById: jest.fn(),
    updateBid: jest.fn(),
    deleteBid: jest.fn(),
    acceptBid: jest.fn(),
    rejectBid: jest.fn(),
    getBidsByPackage: jest.fn(),
    getBidsByDriver: jest.fn(),
    getBidAnalytics: jest.fn()
  }
}));

describe('BidController', () => {
  let bidController: BidController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    bidController = BidController;
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'driver-123', userType: 'DRIVER' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBid', () => {
    it('should create a bid successfully', async () => {
      const bidData = {
        packageId: 'package-123',
        amount: 35.00,
        message: 'I can deliver this package safely',
        estimatedDeliveryTime: new Date('2024-01-16T14:00:00Z')
      };

      mockRequest.body = bidData;
      const createdBid = { id: 'bid-123', ...bidData, status: 'PENDING' };
      (bidService.createBid as jest.Mock).mockResolvedValue(createdBid);

      await bidController.createBid(mockRequest as Request, mockResponse as Response);

      expect(bidService.createBid).toHaveBeenCalledWith({
        ...bidData,
        driverId: 'driver-123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdBid,
        message: 'Bid created successfully'
      });
    });

    it('should handle validation errors', async () => {
      const bidData = {
        packageId: 'package-123',
        amount: -10, // Invalid: negative amount
        message: '', // Invalid: empty message
        estimatedDeliveryTime: new Date('2020-01-01') // Invalid: past date
      };

      mockRequest.body = bidData;
      (bidService.createBid as jest.Mock).mockRejectedValue(
        new AppError('Validation failed', 'VALIDATION_ERROR', 400)
      );

      await bidController.createBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should handle package not found', async () => {
      const bidData = {
        packageId: 'non-existent',
        amount: 35.00,
        message: 'I can deliver this package'
      };

      mockRequest.body = bidData;
      (bidService.createBid as jest.Mock).mockRejectedValue(
        new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404)
      );

      await bidController.createBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Package not found',
          code: 'PACKAGE_NOT_FOUND'
        }
      });
    });

    it('should handle driver not verified', async () => {
      const bidData = {
        packageId: 'package-123',
        amount: 35.00,
        message: 'I can deliver this package'
      };

      mockRequest.body = bidData;
      (bidService.createBid as jest.Mock).mockRejectedValue(
        new AppError('Driver not verified', 'DRIVER_NOT_VERIFIED', 403)
      );

      await bidController.createBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Driver not verified',
          code: 'DRIVER_NOT_VERIFIED'
        }
      });
    });
  });

  describe('getBids', () => {
    it('should get bids with default filters', async () => {
      const bids = [
        { id: 'bid-1', packageId: 'package-1', amount: 30.00, status: 'PENDING' },
        { id: 'bid-2', packageId: 'package-2', amount: 40.00, status: 'ACCEPTED' }
      ];

      (bidService.getBids as jest.Mock).mockResolvedValue({ bids, total: bids.length });

      await bidController.getBids(mockRequest as Request, mockResponse as Response);

      expect(bidService.getBids).toHaveBeenCalledWith({
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: bids,
        pagination: {
          page: 1,
          limit: 20,
          total: bids.length,
          totalPages: 1
        }
      });
    });

    it('should get bids with custom filters', async () => {
      const filters = {
        status: 'PENDING',
        minAmount: 20,
        maxAmount: 50,
        packageId: 'package-123'
      };

      mockRequest.query = filters;
      const bids = [{ id: 'bid-1', packageId: 'package-123', amount: 35.00, status: 'PENDING' }];
      (bidService.getBids as jest.Mock).mockResolvedValue({ bids, total: bids.length });

      await bidController.getBids(mockRequest as Request, mockResponse as Response);

      expect(bidService.getBids).toHaveBeenCalledWith({
        ...filters,
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: bids,
        pagination: {
          page: 1,
          limit: 20,
          total: bids.length,
          totalPages: 1
        }
      });
    });

    it('should handle service errors', async () => {
      (bidService.getBids as jest.Mock).mockRejectedValue(
        new AppError('Failed to fetch bids', 'BID_FETCH_FAILED', 500)
      );

      await bidController.getBids(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to fetch bids',
          code: 'BID_FETCH_FAILED'
        }
      });
    });
  });

  describe('getBidById', () => {
    it('should get bid by ID successfully', async () => {
      const bidId = 'bid-123';
      const bidData = {
        id: bidId,
        packageId: 'package-123',
        amount: 35.00,
        status: 'PENDING'
      };

      mockRequest.params = { id: bidId };
      (bidService.getBidById as jest.Mock).mockResolvedValue(bidData);

      await bidController.getBidById(mockRequest as Request, mockResponse as Response);

      expect(bidService.getBidById).toHaveBeenCalledWith(bidId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: bidData
      });
    });

    it('should handle bid not found', async () => {
      const bidId = 'non-existent';
      mockRequest.params = { id: bidId };
      (bidService.getBidById as jest.Mock).mockRejectedValue(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );

      await bidController.getBidById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bid not found',
          code: 'BID_NOT_FOUND'
        }
      });
    });
  });

  describe('updateBid', () => {
    it('should update bid successfully', async () => {
      const bidId = 'bid-123';
      const updateData = {
        amount: 40.00,
        message: 'Updated bid message',
        estimatedDeliveryTime: new Date('2024-01-17T15:00:00Z')
      };

      const updatedBid = {
        id: bidId,
        ...updateData,
        status: 'PENDING'
      };

      mockRequest.params = { id: bidId };
      mockRequest.body = updateData;
      (bidService.updateBid as jest.Mock).mockResolvedValue(updatedBid);

      await bidController.updateBid(mockRequest as Request, mockResponse as Response);

      expect(bidService.updateBid).toHaveBeenCalledWith(
        bidId,
        updateData,
        'driver-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedBid,
        message: 'Bid updated successfully'
      });
    });

    it('should handle unauthorized access', async () => {
      const bidId = 'bid-123';
      const updateData = { amount: 40.00 };

      mockRequest.params = { id: bidId };
      mockRequest.body = updateData;
      (bidService.updateBid as jest.Mock).mockRejectedValue(
        new AppError('Unauthorized', 'UNAUTHORIZED', 403)
      );

      await bidController.updateBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should handle bid already accepted', async () => {
      const bidId = 'bid-123';
      const updateData = { amount: 40.00 };

      mockRequest.params = { id: bidId };
      mockRequest.body = updateData;
      (bidService.updateBid as jest.Mock).mockRejectedValue(
        new AppError('Cannot update accepted bid', 'BID_ALREADY_ACCEPTED', 400)
      );

      await bidController.updateBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Cannot update accepted bid',
          code: 'BID_ALREADY_ACCEPTED'
        }
      });
    });
  });


  describe('acceptBid', () => {
    it('should accept bid successfully', async () => {
      const bidId = 'bid-123';
      const acceptedBid = {
        id: bidId,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      };

      mockRequest.body = { bidId };
      (bidService.acceptBid as jest.Mock).mockResolvedValue(acceptedBid);

      await bidController.acceptBid(mockRequest as Request, mockResponse as Response);

      expect(bidService.acceptBid).toHaveBeenCalledWith({ bidId, customerId: 'driver-123' });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: acceptedBid,
        message: 'Bid accepted successfully'
      });
    });

    it('should handle bid not found', async () => {
      const bidId = 'non-existent';
      mockRequest.body = { bidId };
      (bidService.acceptBid as jest.Mock).mockRejectedValue(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );

      await bidController.acceptBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bid not found',
          code: 'BID_NOT_FOUND'
        }
      });
    });

    it('should handle unauthorized access', async () => {
      const bidId = 'bid-123';
      mockRequest.body = { bidId };
      (bidService.acceptBid as jest.Mock).mockRejectedValue(
        new AppError('Unauthorized', 'UNAUTHORIZED', 403)
      );

      await bidController.acceptBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('rejectBid', () => {
    it('should reject bid successfully', async () => {
      const bidId = 'bid-123';
      const rejectionReason = 'Price too high';
      const rejectedBid = {
        id: bidId,
        status: 'REJECTED',
        rejectionReason,
        rejectedAt: new Date()
      };

      mockRequest.body = { bidId, rejectionReason };
      (bidService.rejectBid as jest.Mock).mockResolvedValue(rejectedBid);

      await bidController.rejectBid(mockRequest as Request, mockResponse as Response);

      expect(bidService.rejectBid).toHaveBeenCalledWith({ bidId, rejectionReason });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: rejectedBid,
        message: 'Bid rejected successfully'
      });
    });

    it('should handle bid not found', async () => {
      const bidId = 'non-existent';
      mockRequest.body = { bidId, rejectionReason: 'Price too high' };
      (bidService.rejectBid as jest.Mock).mockRejectedValue(
        new AppError('Bid not found', 'BID_NOT_FOUND', 404)
      );

      await bidController.rejectBid(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bid not found',
          code: 'BID_NOT_FOUND'
        }
      });
    });
  });



});
