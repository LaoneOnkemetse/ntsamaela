import { Request, Response } from 'express';
import bidService from '../services/bidService';
import matchingService from '../services/matchingService';
import { AppError } from '../utils/errors';
import {
  CreateBidRequest,
  UpdateBidRequest,
  BidFilters,
  BidAcceptanceRequest,
  BidRejectionRequest,
  ApiResponse,
  PaginatedResponse,
  AuthenticatedRequest,
  Bid
} from '@ntsamaela/shared/types';

class BidController {
  async createBid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const bidData: CreateBidRequest = {
        ...req.body,
        driverId: req.user?.id
      };

      const bid = await bidService.createBid(bidData);

      const response: ApiResponse = {
        success: true,
        data: bid,
        message: 'Bid created successfully'
      };

      res.status(201).json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_CREATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to create bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getBids(req: Request, res: Response): Promise<void> {
    try {
      const filters: BidFilters = {
        packageId: req.query.packageId as string,
        driverId: req.query.driverId as string,
        tripId: req.query.tripId as string,
        status: req.query.status as any,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof BidFilters] === undefined) {
          delete filters[key as keyof BidFilters];
        }
      });

      const result = await bidService.getBids(filters);

      const response: PaginatedResponse<Bid> = {
        success: true,
        data: result.bids as any,
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch bids'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getBidById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bid = await bidService.getBidById(id);

      const response: ApiResponse = {
        success: true,
        data: bid
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async updateBid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateBidRequest = req.body;
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const bid = await bidService.updateBid(id, updateData, driverId);

      const response: ApiResponse = {
        success: true,
        data: bid,
        message: 'Bid updated successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_UPDATE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to update bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async acceptBid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const acceptanceData: BidAcceptanceRequest = {
        ...req.body,
        customerId: req.user?.id
      };

      if (!acceptanceData.customerId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const bid = await bidService.acceptBid(acceptanceData);

      const response: ApiResponse = {
        success: true,
        data: bid,
        message: 'Bid accepted successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_ACCEPTANCE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to accept bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async rejectBid(req: Request, res: Response): Promise<void> {
    try {
      const rejectionData: BidRejectionRequest = req.body;

      const bid = await bidService.rejectBid(rejectionData);

      const response: ApiResponse = {
        success: true,
        data: bid,
        message: 'Bid rejected successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_REJECTION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to reject bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async cancelBid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const bid = await bidService.cancelBid(id, driverId);

      const response: ApiResponse = {
        success: true,
        data: bid,
        message: 'Bid cancelled successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_CANCELLATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to cancel bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getMyBids(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const filters: BidFilters = {
        driverId,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof BidFilters] === undefined) {
          delete filters[key as keyof BidFilters];
        }
      });

      const result = await bidService.getBidsByDriver(driverId, filters);

      const response: PaginatedResponse<Bid> = {
        success: true,
        data: result.bids as any,
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch bids'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getBidsByDriver(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const filters: BidFilters = {
        driverId: userId,
        status: req.query.status as any,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await bidService.getBids(filters);
      res.json(result);
    } catch (_error) {
      console.error('Bid error:', _error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getBidsByPackage(req: Request, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const filters: BidFilters = {
        packageId,
        status: req.query.status as any,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof BidFilters] === undefined) {
          delete filters[key as keyof BidFilters];
        }
      });

      const result = await bidService.getBidsByPackage(packageId, filters);

      const response: PaginatedResponse<Bid> = {
        success: true,
        data: result.bids as any,
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch bids for package'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getPendingBids(req: Request, res: Response): Promise<void> {
    try {
      const filters: BidFilters = {
        status: 'PENDING',
        driverId: req.query.driverId as string,
        packageId: req.query.packageId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof BidFilters] === undefined) {
          delete filters[key as keyof BidFilters];
        }
      });

      const result = await bidService.getPendingBids(filters);

      const response: PaginatedResponse<Bid> = {
        success: true,
        data: result.bids as any,
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BID_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch pending bids'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getRecommendedBid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const result = await matchingService.getRecommendedBids(packageId);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'RECOMMENDATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to get recommended bid'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async calculateCommission(req: Request, res: Response): Promise<void> {
    try {
      const { amount } = req.body;

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('Valid amount is required', 'VALIDATION_ERROR', 400);
      }

      const commission = bidService.calculateCommission(amount);

      const response: ApiResponse = {
        success: true,
        data: commission
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'COMMISSION_CALCULATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to calculate commission'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async preAuthorizeCommission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { driverId, tripId, commissionAmount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      if (userId !== driverId) {
        throw new AppError('Cannot pre-authorize commission for another driver', 'UNAUTHORIZED', 403);
      }

      const reservation = await bidService.preAuthorizeCommission(driverId, tripId, commissionAmount);

      const response: ApiResponse = {
        success: true,
        data: reservation,
        message: 'Commission pre-authorized successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'COMMISSION_AUTHORIZATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to pre-authorize commission'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async confirmCommissionReservation(req: Request, res: Response): Promise<void> {
    try {
      const { reservationId } = req.params;

      await bidService.confirmCommissionReservation(reservationId);

      const response: ApiResponse = {
        success: true,
        message: 'Commission reservation confirmed successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'COMMISSION_CONFIRMATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to confirm commission reservation'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async releaseCommissionReservation(req: Request, res: Response): Promise<void> {
    try {
      const { reservationId } = req.params;

      await bidService.releaseCommissionReservation(reservationId);

      const response: ApiResponse = {
        success: true,
        message: 'Commission reservation released successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'COMMISSION_RELEASE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to release commission reservation'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getRecommendedBids(req: Request, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;

      const recommendations = await matchingService.getRecommendedBids(packageId);

      const response: ApiResponse = {
        success: true,
        data: recommendations
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'RECOMMENDATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to get recommended bids'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }
}

export default new BidController();
