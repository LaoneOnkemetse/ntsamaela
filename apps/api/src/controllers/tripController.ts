import { Request, Response } from 'express';
import tripService from '../services/tripService';
import matchingService from '../services/matchingService';
import { AppError } from '../utils/errors';
import {
  CreateTripRequest,
  UpdateTripRequest,
  TripFilters,
  MatchingCriteria,
  ApiResponse,
  PaginatedResponse,
  AuthenticatedRequest,
  Trip
} from '@ntsamaela/shared/types';

class TripController {
  async createTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tripData: CreateTripRequest = {
        ...req.body,
        driverId: req.user?.id
      };

      const trip = await tripService.createTrip(tripData);

      const response: ApiResponse = {
        success: true,
        data: trip,
        message: 'Trip created successfully'
      };

      res.status(201).json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_CREATION_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to create trip'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getTrips(req: Request, res: Response): Promise<void> {
    try {
      const filters: TripFilters = {
        driverId: req.query.driverId as string,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        startLat: req.query.startLat ? parseFloat(req.query.startLat as string) : undefined,
        startLng: req.query.startLng ? parseFloat(req.query.startLng as string) : undefined,
        endLat: req.query.endLat ? parseFloat(req.query.endLat as string) : undefined,
        endLng: req.query.endLng ? parseFloat(req.query.endLng as string) : undefined,
        radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
        capacity: req.query.capacity as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TripFilters] === undefined) {
          delete filters[key as keyof TripFilters];
        }
      });

      const result = await tripService.getTrips(filters);

      const response: PaginatedResponse<Trip> = {
        success: true,
        data: result.trips as any,
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
          code: _error instanceof AppError ? _error.code : 'TRIP_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch trips'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getTripsByDriver(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;
      const authenticatedUser = (req as any).user;

      // Access control: Users can only access their own trips, unless they're admin
      if (authenticatedUser.role !== 'ADMIN' && authenticatedUser.id !== driverId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied. You can only access your own trips.'
          }
        });
        return;
      }

      const filters: TripFilters = {
        driverId: driverId,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TripFilters] === undefined) {
          delete filters[key as keyof TripFilters];
        }
      });

      const result = await tripService.getTripsByDriver(driverId, filters);

      const response: PaginatedResponse<Trip> = {
        success: true,
        data: result.trips as any,
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
          code: _error instanceof AppError ? _error.code : 'TRIP_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch trips'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getTripById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const trip = await tripService.getTripById(id);

      const response: ApiResponse = {
        success: true,
        data: trip
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch trip'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async updateTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateTripRequest = req.body;
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const trip = await tripService.updateTrip(id, updateData, driverId);

      const response: ApiResponse = {
        success: true,
        data: trip,
        message: 'Trip updated successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_UPDATE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to update trip'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async deleteTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      await tripService.deleteTrip(id, driverId);

      const response: ApiResponse = {
        success: true,
        message: 'Trip deleted successfully'
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_DELETE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to delete trip'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getMyTrips(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const driverId = req.user?.id;

      if (!driverId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const filters: TripFilters = {
        driverId,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TripFilters] === undefined) {
          delete filters[key as keyof TripFilters];
        }
      });

      const result = await tripService.getTripsByDriver(driverId, filters);

      const response: PaginatedResponse<Trip> = {
        success: true,
        data: result.trips as any,
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
          code: _error instanceof AppError ? _error.code : 'TRIP_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch trips'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getAvailableTrips(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: TripFilters = {
        status: 'SCHEDULED' as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        startLat: req.query.startLat ? parseFloat(req.query.startLat as string) : undefined,
        startLng: req.query.startLng ? parseFloat(req.query.startLng as string) : undefined,
        endLat: req.query.endLat ? parseFloat(req.query.endLat as string) : undefined,
        endLng: req.query.endLng ? parseFloat(req.query.endLng as string) : undefined,
        radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
        capacity: req.query.capacity as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TripFilters] === undefined) {
          delete filters[key as keyof TripFilters];
        }
      });

      const result = await tripService.getAvailableTrips(filters);

      const response: PaginatedResponse<Trip> = {
        success: true,
        data: result.trips as any,
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
          code: _error instanceof AppError ? _error.code : 'TRIP_FETCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to fetch available trips'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async findMatchesForPackage(req: Request, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const criteria: MatchingCriteria = {
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
        timeWindow: req.query.timeWindow ? parseFloat(req.query.timeWindow as string) : undefined,
        minMatchScore: req.query.minMatchScore ? parseFloat(req.query.minMatchScore as string) : undefined,
        capacityRequired: req.query.capacityRequired as any,
        driverRating: req.query.driverRating ? parseFloat(req.query.driverRating as string) : undefined
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof MatchingCriteria] === undefined) {
          delete criteria[key as keyof MatchingCriteria];
        }
      });

      const result = await matchingService.findMatchesForPackage(packageId, criteria);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'MATCHING_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to find matches'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async findMatchesForTrip(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      const criteria: MatchingCriteria = {
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
        timeWindow: req.query.timeWindow ? parseFloat(req.query.timeWindow as string) : undefined,
        minMatchScore: req.query.minMatchScore ? parseFloat(req.query.minMatchScore as string) : undefined,
        capacityRequired: req.query.capacityRequired as any,
        driverRating: req.query.driverRating ? parseFloat(req.query.driverRating as string) : undefined
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof MatchingCriteria] === undefined) {
          delete criteria[key as keyof MatchingCriteria];
        }
      });

      const result = await matchingService.findMatchesForTrip(tripId, criteria);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'MATCHING_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to find matches'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async searchTrips(req: Request, res: Response): Promise<void> {
    try {
      const filters: TripFilters = {
        origin: req.query.origin as string,
        destination: req.query.destination as string,
        departureDate: req.query.departureDate as string,
        capacity: req.query.capacity as any,
        status: 'SCHEDULED',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TripFilters] === undefined) {
          delete filters[key as keyof TripFilters];
        }
      });

      const result = await tripService.searchTrips(filters);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_SEARCH_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to search trips'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async getOptimalMatches(req: Request, res: Response): Promise<void> {
    try {
      const criteria: MatchingCriteria = {
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
        timeWindow: req.query.timeWindow ? parseFloat(req.query.timeWindow as string) : undefined,
        minMatchScore: req.query.minMatchScore ? parseFloat(req.query.minMatchScore as string) : undefined,
        capacityRequired: req.query.capacityRequired as any,
        driverRating: req.query.driverRating ? parseFloat(req.query.driverRating as string) : undefined
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof MatchingCriteria] === undefined) {
          delete criteria[key as keyof MatchingCriteria];
        }
      });

      const result = await matchingService.findOptimalMatches(criteria);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'MATCHING_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to find optimal matches'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async findOptimalMatchesWithML(req: Request, res: Response): Promise<void> {
    try {
      const criteria: MatchingCriteria = {
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
        timeWindow: req.query.timeWindow ? parseFloat(req.query.timeWindow as string) : undefined,
        minMatchScore: req.query.minMatchScore ? parseFloat(req.query.minMatchScore as string) : undefined,
        capacityRequired: req.query.capacityRequired as any,
        driverRating: req.query.driverRating ? parseFloat(req.query.driverRating as string) : undefined
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof MatchingCriteria] === undefined) {
          delete criteria[key as keyof MatchingCriteria];
        }
      });

      const result = await matchingService.findOptimalMatchesWithML(criteria);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'MATCHING_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to find optimal matches with ML'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }
}

export default new TripController();
