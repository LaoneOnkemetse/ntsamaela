import { Request, Response } from 'express';
import { TrackingController } from '../trackingController';
import { getRealtimeService } from '../../services/realtimeService';
import { AppError } from '../../utils/errors';

// Mock dependencies
jest.mock('../../services/realtimeService');

const mockRealtimeService = {
  createTrackingUpdate: jest.fn(),
  getPackageTracking: jest.fn(),
  notifyDeliveryStarted: jest.fn(),
  notifyDeliveryCompleted: jest.fn(),
  emitToRoom: jest.fn()
};

(getRealtimeService as jest.Mock).mockReturnValue(mockRealtimeService);

describe('TrackingController', () => {
  let trackingController: TrackingController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    trackingController = new TrackingController();
    // Mock the getRealtimeService function to return our mock
    (getRealtimeService as jest.Mock).mockReturnValue(mockRealtimeService);
    
    mockReq = {
      user: {
        id: 'driver123',
        userType: 'DRIVER',
        email: 'driver@example.com'
      },
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('createTrackingUpdate', () => {
    it('should create tracking update successfully', async () => {
      const trackingData = {
        packageId: 'package123',
        status: 'IN_TRANSIT',
        location: 'Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        notes: 'Package picked up'
      };

      const mockTracking = {
        id: 'track123',
        packageId: 'package123',
        status: 'IN_TRANSIT',
        location: 'Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date().toISOString(),
        notes: 'Package picked up'
      };

      mockReq.body = trackingData;
      mockRealtimeService.createTrackingUpdate.mockResolvedValue(mockTracking);

      await trackingController.createTrackingUpdate(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.createTrackingUpdate).toHaveBeenCalledWith(
        'package123',
        'IN_TRANSIT',
        'Downtown',
        40.7128,
        -74.0060,
        'Package picked up'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTracking,
        message: 'Tracking update created successfully'
      });
    });

    it('should return error when package ID is missing', async () => {
      mockReq.body = { status: 'IN_TRANSIT' };

      await trackingController.createTrackingUpdate(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Package ID and status are required'
        }
      });
    });

    it('should return error when status is missing', async () => {
      mockReq.body = { packageId: 'package123' };

      await trackingController.createTrackingUpdate(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Package ID and status are required'
        }
      });
    });

    it('should handle service errors', async () => {
      const trackingData = {
        packageId: 'package123',
        status: 'IN_TRANSIT'
      };

      mockReq.body = trackingData;
      mockRealtimeService.createTrackingUpdate.mockRejectedValue(
        new AppError('Database error', 'TRACKING_UPDATE_FAILED', 500)
      );

      await trackingController.createTrackingUpdate(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TRACKING_UPDATE_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('getPackageTracking', () => {
    it('should get package tracking successfully', async () => {
      const mockTracking = [
        {
          id: 'track123',
          packageId: 'package123',
          status: 'PICKED_UP',
          location: 'Pickup location',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date().toISOString(),
          notes: 'Package picked up'
        }
      ];

      mockReq.params = { packageId: 'package123' };
      mockRealtimeService.getPackageTracking.mockResolvedValue(mockTracking);

      await trackingController.getPackageTracking(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.getPackageTracking).toHaveBeenCalledWith('package123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTracking,
        message: 'Package tracking retrieved successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { packageId: 'package123' };
      mockRealtimeService.getPackageTracking.mockRejectedValue(
        new AppError('Database error', 'TRACKING_FETCH_FAILED', 500)
      );

      await trackingController.getPackageTracking(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TRACKING_FETCH_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('updatePackageLocation', () => {
    it('should update package location successfully', async () => {
      const locationData = {
        location: 'New location',
        latitude: 40.7589,
        longitude: -73.9851,
        notes: 'Updated location'
      };

      const mockTracking = {
        id: 'track123',
        packageId: 'package123',
        status: 'IN_TRANSIT',
        location: 'New location',
        latitude: 40.7589,
        longitude: -73.9851,
        timestamp: new Date().toISOString(),
        notes: 'Updated location'
      };

      mockReq.params = { packageId: 'package123' };
      mockReq.body = locationData;
      mockRealtimeService.createTrackingUpdate.mockResolvedValue(mockTracking);

      await trackingController.updatePackageLocation(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.createTrackingUpdate).toHaveBeenCalledWith(
        'package123',
        'LOCATION_UPDATE',
        'New location',
        40.7589,
        -73.9851,
        'Location updated'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTracking,
        message: 'Package location updated successfully'
      });
    });

    it('should handle service errors', async () => {
      const locationData = {
        location: 'New location',
        latitude: 40.7589,
        longitude: -73.9851
      };

      mockReq.params = { packageId: 'package123' };
      mockReq.body = locationData;
      mockRealtimeService.createTrackingUpdate.mockRejectedValue(
        new AppError('Database error', 'LOCATION_UPDATE_FAILED', 500)
      );

      await trackingController.updatePackageLocation(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'LOCATION_UPDATE_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('startDelivery', () => {
    it('should start delivery successfully', async () => {
      const mockTracking = {
        id: 'track123',
        packageId: 'package123',
        status: 'IN_TRANSIT',
        location: 'Delivery started',
        timestamp: new Date().toISOString(),
        notes: 'Driver has started the delivery'
      };

      mockReq.params = { packageId: 'package123' };
      mockRealtimeService.createTrackingUpdate.mockResolvedValue(mockTracking);
      mockRealtimeService.notifyDeliveryStarted.mockResolvedValue(undefined);

      await trackingController.startDelivery(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.createTrackingUpdate).toHaveBeenCalledWith(
        'package123',
        'IN_TRANSIT',
        'Delivery started',
        undefined,
        undefined,
        'Driver has started the delivery'
      );
      expect(mockRealtimeService.notifyDeliveryStarted).toHaveBeenCalledWith('package123', 'driver123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTracking,
        message: 'Delivery started successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { packageId: 'package123' };
      mockRealtimeService.createTrackingUpdate.mockRejectedValue(
        new AppError('Database error', 'DELIVERY_START_FAILED', 500)
      );

      await trackingController.startDelivery(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DELIVERY_START_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('completeDelivery', () => {
    it('should complete delivery successfully', async () => {
      const deliveryData = {
        notes: 'Package delivered successfully'
      };

      const mockTracking = {
        id: 'track123',
        packageId: 'package123',
        status: 'DELIVERED',
        location: 'Delivery completed',
        timestamp: new Date().toISOString(),
        notes: 'Package delivered successfully'
      };

      mockReq.params = { packageId: 'package123' };
      mockReq.body = deliveryData;
      mockRealtimeService.createTrackingUpdate.mockResolvedValue(mockTracking);
      mockRealtimeService.notifyDeliveryCompleted.mockResolvedValue(undefined);

      await trackingController.completeDelivery(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.createTrackingUpdate).toHaveBeenCalledWith(
        'package123',
        'DELIVERED',
        'Package delivered',
        undefined,
        undefined,
        'Package has been successfully delivered'
      );
      expect(mockRealtimeService.notifyDeliveryCompleted).toHaveBeenCalledWith('package123', 'driver123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTracking,
        message: 'Delivery completed successfully'
      });
    });

    it('should handle service errors', async () => {
      const deliveryData = {
        notes: 'Package delivered successfully'
      };

      mockReq.params = { packageId: 'package123' };
      mockReq.body = deliveryData;
      mockRealtimeService.createTrackingUpdate.mockRejectedValue(
        new AppError('Database error', 'DELIVERY_COMPLETE_FAILED', 500)
      );

      await trackingController.completeDelivery(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DELIVERY_COMPLETE_FAILED',
          message: 'Database error'
        }
      });
    });
  });
});
