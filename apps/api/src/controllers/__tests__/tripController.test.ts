import { Request, Response } from 'express';
import tripController from '../tripController';
import tripService from '../../services/tripService';
import { AppError } from '../../utils/errors';

// Get the mocked service
const mockTripService = tripService as jest.Mocked<typeof tripService>;

// Mock the TripService
jest.mock('../../services/tripService', () => ({
  __esModule: true,
  default: {
    createTrip: jest.fn(),
    getTrips: jest.fn(),
    getTripById: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    getTripsByDriver: jest.fn(),
    getAvailableTrips: jest.fn(),
    searchTrips: jest.fn(),
  }
}));

describe('TripController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'driver-123', role: 'DRIVER' }
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

  describe('createTrip', () => {
    it('should create a trip successfully', async () => {
      const tripData = {
        origin: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
        destination: { latitude: 40.7589, longitude: -73.9851, address: 'Times Square, NY' },
        departureTime: new Date('2024-01-15T10:00:00Z'),
        capacity: 'SMALL',
        price: 50.00,
        description: 'Trip to Times Square'
      };

      mockRequest.body = tripData;
      const createdTrip = { id: 'trip-123', ...tripData, status: 'SCHEDULED' };
      mockTripService.createTrip.mockResolvedValue(createdTrip);

      await tripController.createTrip(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.createTrip).toHaveBeenCalledWith({
        ...tripData,
        driverId: 'driver-123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdTrip,
        message: 'Trip created successfully'
      });
    });

    it('should handle validation errors', async () => {
      const tripData = {
        origin: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 40.7589, longitude: -73.9851 },
        departureTime: new Date('2020-01-01'), // Invalid: past date
        capacity: 'INVALID', // Invalid capacity
        price: -10 // Invalid: negative price
      };

      mockRequest.body = tripData;
      mockTripService.createTrip.mockRejectedValue(
        new AppError('Validation failed', 'VALIDATION_ERROR', 400)
      );

      await tripController.createTrip(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });
    });

    it('should handle driver not verified error', async () => {
      const tripData = {
        origin: { latitude: 40.7128, longitude: -74.0060 },
        destination: { latitude: 40.7589, longitude: -73.9851 },
        departureTime: new Date('2024-01-15T10:00:00Z'),
        capacity: 'SMALL',
        price: 50.00
      };

      mockRequest.body = tripData;
      mockTripService.createTrip.mockRejectedValue(
        new AppError('Driver not verified', 'DRIVER_NOT_VERIFIED', 403)
      );

      await tripController.createTrip(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DRIVER_NOT_VERIFIED',
          message: 'Driver not verified'
        }
      });
    });
  });

  describe('getTrips', () => {
    it('should get trips with default filters', async () => {
      const trips = [
        { id: 'trip-1', origin: { address: 'NYC' }, status: 'SCHEDULED' },
        { id: 'trip-2', origin: { address: 'LA' }, status: 'ACTIVE' }
      ];

      mockTripService.getTrips.mockResolvedValue({ trips, total: trips.length });

      await tripController.getTrips(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.getTrips).toHaveBeenCalledWith({
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trips,
        pagination: {
          page: 1,
          limit: 20,
          total: trips.length,
          totalPages: 1
        }
      });
    });

    it('should get trips with custom filters', async () => {
      const filters = {
        status: 'SCHEDULED',
        capacity: 'LARGE'
      };

      mockRequest.query = filters;
      const trips = [{ id: 'trip-1', status: 'SCHEDULED', capacity: 'LARGE' }];
      mockTripService.getTrips.mockResolvedValue({ trips, total: trips.length });

      await tripController.getTrips(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.getTrips).toHaveBeenCalledWith({
        ...filters,
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trips,
        pagination: {
          page: 1,
          limit: 20,
          total: trips.length,
          totalPages: 1
        }
      });
    });

    it('should handle service errors', async () => {
      mockTripService.getTrips.mockRejectedValue(
        new AppError('Database error', 'TRIP_FETCH_FAILED', 500)
      );

      await tripController.getTrips(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TRIP_FETCH_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('getTripById', () => {
    it('should get trip by ID successfully', async () => {
      const tripId = 'trip-123';
      const tripData = {
        id: tripId,
        origin: { address: 'NYC' },
        destination: { address: 'LA' },
        status: 'SCHEDULED'
      };

      mockRequest.params = { id: tripId };
      mockTripService.getTripById.mockResolvedValue(tripData);

      await tripController.getTripById(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.getTripById).toHaveBeenCalledWith(tripId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: tripData
      });
    });

    it('should handle trip not found', async () => {
      const tripId = 'non-existent';
      mockRequest.params = { id: tripId };
      mockTripService.getTripById.mockRejectedValue(
        new AppError('Trip not found', 'NOT_FOUND', 404)
      );

      await tripController.getTripById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Trip not found',
          code: 'NOT_FOUND'
        }
      });
    });
  });

  describe('updateTrip', () => {
    it('should update trip successfully', async () => {
      const tripId = 'trip-123';
      const updateData = {
        departureTime: new Date('2024-01-16T10:00:00Z'),
        price: 60.00,
        description: 'Updated trip description'
      };

      const updatedTrip = {
        id: tripId,
        ...updateData,
        status: 'SCHEDULED'
      };

      mockRequest.params = { id: tripId };
      mockRequest.body = updateData;
      mockTripService.updateTrip.mockResolvedValue(updatedTrip);

      await tripController.updateTrip(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.updateTrip).toHaveBeenCalledWith(
        tripId,
        updateData,
        'driver-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedTrip,
        message: 'Trip updated successfully'
      });
    });

    it('should handle unauthorized access', async () => {
      const tripId = 'trip-123';
      const updateData = { price: 60.00 };

      mockRequest.params = { id: tripId };
      mockRequest.body = updateData;
      mockTripService.updateTrip.mockRejectedValue(
        new AppError('Unauthorized', 'UNAUTHORIZED', 403)
      );

      await tripController.updateTrip(mockRequest as Request, mockResponse as Response);

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

  describe('deleteTrip', () => {
    it('should delete trip successfully', async () => {
      const tripId = 'trip-123';
      mockRequest.params = { id: tripId };
      mockTripService.deleteTrip.mockResolvedValue(undefined);

      await tripController.deleteTrip(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.deleteTrip).toHaveBeenCalledWith(
        tripId,
        'driver-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Trip deleted successfully'
      });
    });

    it('should handle trip with accepted bids', async () => {
      const tripId = 'trip-123';
      mockRequest.params = { id: tripId };
      mockTripService.deleteTrip.mockRejectedValue(
        new AppError('Cannot delete trip with accepted bids', 'BAD_REQUEST', 400)
      );

      await tripController.deleteTrip(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Cannot delete trip with accepted bids',
          code: 'BAD_REQUEST'
        }
      });
    });
  });

  describe('getTripsByDriver', () => {
    it('should get trips by driver successfully', async () => {
      const driverId = 'driver-123';
      const trips = [
        { id: 'trip-1', driverId, status: 'SCHEDULED' },
        { id: 'trip-2', driverId, status: 'ACTIVE' }
      ];

      mockRequest.params = { driverId };
      mockTripService.getTripsByDriver.mockResolvedValue({ trips, total: trips.length });

      await tripController.getTripsByDriver(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.getTripsByDriver).toHaveBeenCalledWith(driverId, {
        driverId: driverId,
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trips,
        pagination: {
          page: 1,
          limit: 20,
          total: trips.length,
          totalPages: 1
        }
      });
    });

    it('should handle driver not found', async () => {
      const driverId = 'non-existent';
      mockRequest.params = { driverId };
      mockRequest.user = { id: 'admin-123', role: 'ADMIN' }; // Set as admin to bypass access control
      mockTripService.getTripsByDriver.mockRejectedValue(
        new AppError('Driver not found', 'NOT_FOUND', 404)
      );

      await tripController.getTripsByDriver(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Driver not found',
          code: 'NOT_FOUND'
        }
      });
    });
  });

  describe('getAvailableTrips', () => {
    it('should get available trips successfully', async () => {
      const trips = [
        { id: 'trip-1', status: 'SCHEDULED', capacity: 'SMALL' },
        { id: 'trip-2', status: 'SCHEDULED', capacity: 'LARGE' }
      ];

      mockTripService.getAvailableTrips.mockResolvedValue({ trips, total: trips.length });

      await tripController.getAvailableTrips(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.getAvailableTrips).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trips,
        pagination: {
          page: 1,
          limit: 20,
          total: trips.length,
          totalPages: 1
        }
      });
    });

    it('should handle no available trips', async () => {
      mockTripService.getAvailableTrips.mockResolvedValue({ trips: [], total: 0 });

      await tripController.getAvailableTrips(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      });
    });
  });

  describe('searchTrips', () => {
    it('should search trips successfully', async () => {
      const trips = [
        { id: 'trip-1', origin: { address: 'New York' }, destination: { address: 'Los Angeles' } }
      ];

      mockRequest.query = { origin: 'New York', destination: 'Los Angeles' };
      mockTripService.searchTrips.mockResolvedValue(trips);

      await tripController.searchTrips(mockRequest as Request, mockResponse as Response);

      expect(mockTripService.searchTrips).toHaveBeenCalledWith({
        origin: 'New York',
        destination: 'Los Angeles',
        status: 'SCHEDULED',
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trips
      });
    });

    it('should handle empty search results', async () => {
      mockRequest.query = { origin: 'Nowhere', destination: 'Nowhere' };
      mockTripService.searchTrips.mockResolvedValue([]);

      await tripController.searchTrips(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });
  });

});
