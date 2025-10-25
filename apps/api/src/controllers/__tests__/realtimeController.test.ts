import { Request, Response } from 'express';
import RealtimeController from '../realtimeController';
import { getRealtimeService } from '../../services/realtimeService';
import { AppError } from '../../utils/errors';

// Mock the real-time service
jest.mock('../../services/realtimeService');
const mockRealtimeService = {
  startLiveTracking: jest.fn(),
  stopLiveTracking: jest.fn(),
  sendNotification: jest.fn(),
  notifyPackageStatusUpdate: jest.fn(),
  notifyDeliveryStarted: jest.fn(),
  notifyDeliveryCompleted: jest.fn(),
  notifyDeliveryFailed: jest.fn(),
  notifyTripStatusUpdate: jest.fn(),
  getConnectedUsers: jest.fn(),
  getConnectionCount: jest.fn(),
  isUserConnected: jest.fn(),
  io: {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
  }
};

(getRealtimeService as jest.Mock).mockReturnValue(mockRealtimeService);

describe('RealtimeController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {};
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      })
    };
    jest.clearAllMocks();
    
    // Reset the mock implementation
    (mockResponse.status as jest.Mock).mockReturnThis();
    (mockResponse.json as jest.Mock).mockImplementation((result) => {
      responseObject = result;
      return mockResponse;
    });
  });

  describe('startLiveTracking', () => {
    it('should start live tracking successfully', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: { id: 'user-123' }
      };

      await RealtimeController.startLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.startLiveTracking).toHaveBeenCalledWith('package-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Live tracking started successfully',
        data: { packageId: 'package-123', userId: 'user-123' }
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.message).toBe('Live tracking started successfully');
    });

    it('should return error if user not authenticated', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: undefined
      };

      await RealtimeController.startLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseObject.success).toBe(false);
      expect(responseObject.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle service errors', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: { id: 'user-123' }
      };

      mockRealtimeService.startLiveTracking.mockRejectedValue(new Error('Service error'));

      await RealtimeController.startLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject.success).toBe(false);
      expect(responseObject.error.code).toBe('LIVE_TRACKING_START_FAILED');
    });
  });

  describe('stopLiveTracking', () => {
    it('should stop live tracking successfully', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: { id: 'user-123' }
      };

      await RealtimeController.stopLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.stopLiveTracking).toHaveBeenCalledWith('package-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Live tracking stopped successfully',
        data: { packageId: 'package-123', userId: 'user-123' }
      });
      expect(responseObject.success).toBe(true);
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      mockRequest = {
        body: {
          userId: 'user-123',
          type: 'DELIVERY_UPDATE',
          title: 'Package Update',
          message: 'Your package has been delivered',
          data: { packageId: 'package-123' }
        }
      };

      await RealtimeController.sendNotification(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeService.sendNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'DELIVERY_UPDATE',
        title: 'Package Update',
        message: 'Your package has been delivered',
        data: { packageId: 'package-123' }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification sent successfully',
        data: {
          userId: 'user-123',
          type: 'DELIVERY_UPDATE',
          title: 'Package Update',
          message: 'Your package has been delivered',
          data: { packageId: 'package-123' }
        }
      });
      expect(responseObject.success).toBe(true);
    });
  });

  describe('updatePackageStatus', () => {
    it('should update package status successfully', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        body: { status: 'DELIVERED', location: '123 Main St' },
        user: { id: 'user-123' }
      };

      await RealtimeController.updatePackageStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyPackageStatusUpdate).toHaveBeenCalledWith(
        'package-123',
        'DELIVERED',
        '123 Main St'
      );
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should notify delivery started', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        body: { status: 'STARTED' },
        user: { id: 'driver-123' }
      };

      await RealtimeController.updateDeliveryStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyDeliveryStarted).toHaveBeenCalledWith('package-123', 'driver-123');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should notify delivery completed', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        body: { status: 'COMPLETED', location: '123 Main St' },
        user: { id: 'driver-123' }
      };

      await RealtimeController.updateDeliveryStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyDeliveryCompleted).toHaveBeenCalledWith(
        'package-123',
        'driver-123'
      );
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should notify delivery failed', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        body: { status: 'FAILED', notes: 'Address not found' },
        user: { id: 'driver-123' }
      };

      await RealtimeController.updateDeliveryStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyDeliveryFailed).toHaveBeenCalledWith(
        'package-123',
        'driver-123',
        'Address not found'
      );
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle other status updates', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        body: { status: 'IN_TRANSIT', location: '456 Oak Ave' },
        user: { id: 'driver-123' }
      };

      await RealtimeController.updateDeliveryStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyPackageStatusUpdate).toHaveBeenCalledWith(
        'package-123',
        'IN_TRANSIT',
        '456 Oak Ave'
      );
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('updateTripStatus', () => {
    it('should update trip status successfully', async () => {
      mockRequest = {
        params: { tripId: 'trip-123' },
        body: { status: 'IN_PROGRESS' },
        user: { id: 'driver-123' }
      };

      await RealtimeController.updateTripStatus(mockRequest as any, mockResponse as Response);

      expect(mockRealtimeService.notifyTripStatusUpdate).toHaveBeenCalledWith('trip-123', 'IN_PROGRESS');
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      mockRealtimeService.getConnectedUsers.mockReturnValue(['user-1', 'user-2', 'user-3']);
      mockRealtimeService.getConnectionCount.mockReturnValue(3);

      await RealtimeController.getConnectionStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.connectedUsers).toEqual(['user-1', 'user-2', 'user-3']);
      expect(responseObject.data.connectionCount).toBe(3);
    });
  });

  describe('checkUserConnection', () => {
    it('should check if user is connected', async () => {
      mockRequest = {
        params: { userId: 'user-123' }
      };

      mockRealtimeService.isUserConnected.mockReturnValue(true);

      await RealtimeController.checkUserConnection(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeService.isUserConnected).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.isConnected).toBe(true);
    });
  });

  describe('broadcastMessage', () => {
    it('should broadcast message to all users', async () => {
      mockRequest = {
        body: {
          event: 'system_announcement',
          message: 'System maintenance scheduled',
          data: { maintenanceTime: '2024-01-01T00:00:00Z' }
        }
      };

      mockRealtimeService.getConnectionCount.mockReturnValue(5);

      await RealtimeController.broadcastMessage(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeService.io.emit).toHaveBeenCalledWith('system_announcement', {
        message: 'System maintenance scheduled',
        data: { maintenanceTime: '2024-01-01T00:00:00Z' },
        timestamp: expect.any(String)
      });
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.recipients).toBe(5);
    });

    it('should use default event if not provided', async () => {
      mockRequest = {
        body: {
          message: 'Default broadcast'
        }
      };

      await RealtimeController.broadcastMessage(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeService.io.emit).toHaveBeenCalledWith('broadcast', {
        message: 'Default broadcast',
        data: undefined,
        timestamp: expect.any(String)
      });
    });
  });

  describe('sendMessageToUser', () => {
    it('should send message to specific user', async () => {
      mockRequest = {
        params: { userId: 'user-123' },
        body: {
          event: 'direct_message',
          message: 'Hello from admin',
          data: { priority: 'high' }
        }
      };

      mockRealtimeService.isUserConnected.mockReturnValue(true);

      await RealtimeController.sendMessageToUser(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeService.io.to).toHaveBeenCalledWith('user:user-123');
      expect(mockRealtimeService.io.emit).toHaveBeenCalledWith('direct_message', {
        message: 'Hello from admin',
        data: { priority: 'high' },
        timestamp: expect.any(String)
      });
      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.isConnected).toBe(true);
    });

    it('should handle disconnected user', async () => {
      mockRequest = {
        params: { userId: 'user-123' },
        body: {
          message: 'Hello from admin'
        }
      };

      mockRealtimeService.isUserConnected.mockReturnValue(false);

      await RealtimeController.sendMessageToUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseObject.data.isConnected).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle AppError correctly', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: { id: 'user-123' }
      };

      const appError = new AppError('Custom error', 'CUSTOM_ERROR', 400);
      mockRealtimeService.startLiveTracking.mockRejectedValue(appError);

      await RealtimeController.startLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.success).toBe(false);
      expect(responseObject.error.code).toBe('CUSTOM_ERROR');
      expect(responseObject.error.message).toBe('Custom error');
    });

    it('should handle unexpected errors', async () => {
      mockRequest = {
        params: { packageId: 'package-123' },
        user: { id: 'user-123' }
      };

      mockRealtimeService.startLiveTracking.mockRejectedValue(new Error('Unexpected error'));

      await RealtimeController.startLiveTracking(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject.success).toBe(false);
      expect(responseObject.error.code).toBe('LIVE_TRACKING_START_FAILED');
    });
  });
});
