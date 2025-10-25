import { Request, Response } from 'express';
import { getRealtimeService } from '../services/realtimeService';
import { AppError } from '../utils/errors';
import {
  ApiResponse,
  AuthenticatedRequest,
  CreateNotificationRequest
} from '@ntsamaela/shared/types';

class RealtimeController {
  // Live tracking endpoints
  async startLiveTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const realtimeService = getRealtimeService();
      await realtimeService.startLiveTracking(packageId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Live tracking started successfully',
        data: { packageId, userId }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'LIVE_TRACKING_START_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to start live tracking'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  async stopLiveTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const realtimeService = getRealtimeService();
      await realtimeService.stopLiveTracking(packageId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Live tracking stopped successfully',
        data: { packageId, userId }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'LIVE_TRACKING_STOP_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to stop live tracking'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Notification endpoints
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationData: CreateNotificationRequest = req.body;

      const realtimeService = getRealtimeService();
      await realtimeService.sendNotification(notificationData);

      const response: ApiResponse = {
        success: true,
        message: 'Notification sent successfully',
        data: notificationData
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'NOTIFICATION_SEND_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to send notification'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Package status update endpoint
  async updatePackageStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const { status, location } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const realtimeService = getRealtimeService();
      await realtimeService.notifyPackageStatusUpdate(packageId, status, location);

      const response: ApiResponse = {
        success: true,
        message: 'Package status updated successfully',
        data: { packageId, status, location }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'PACKAGE_STATUS_UPDATE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to update package status'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Delivery status update endpoint
  async updateDeliveryStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { packageId } = req.params;
      const { status, location, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const realtimeService = getRealtimeService();

      switch (status) {
        case 'STARTED':
          await realtimeService.notifyDeliveryStarted(packageId, userId);
          break;
        case 'COMPLETED':
          await realtimeService.notifyDeliveryCompleted(packageId, userId);
          break;
        case 'FAILED':
          await realtimeService.notifyDeliveryFailed(packageId, userId, notes || 'Delivery failed');
          break;
        default:
          await realtimeService.notifyPackageStatusUpdate(packageId, status, location);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Delivery status updated successfully',
        data: { packageId, status, location, notes }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'DELIVERY_STATUS_UPDATE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to update delivery status'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Trip status update endpoint
  async updateTripStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User ID not found', 'UNAUTHORIZED', 401);
      }

      const realtimeService = getRealtimeService();
      await realtimeService.notifyTripStatusUpdate(tripId, status);

      const response: ApiResponse = {
        success: true,
        message: 'Trip status updated successfully',
        data: { tripId, status }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'TRIP_STATUS_UPDATE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to update trip status'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Connection status endpoint
  async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const realtimeService = getRealtimeService();
      const connectedUsers = realtimeService.getConnectedUsers();
      const connectionCount = realtimeService.getConnectionCount();

      const response: ApiResponse = {
        success: true,
        data: {
          connectedUsers,
          connectionCount,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'CONNECTION_STATUS_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to get connection status'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Check if user is connected
  async checkUserConnection(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const realtimeService = getRealtimeService();
      const isConnected = realtimeService.isUserConnected(userId);

      const response: ApiResponse = {
        success: true,
        data: {
          userId,
          isConnected,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'USER_CONNECTION_CHECK_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to check user connection'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Broadcast message to all connected users
  async broadcastMessage(req: Request, res: Response): Promise<void> {
    try {
      const { event, data, message } = req.body;

      const realtimeService = getRealtimeService();
      const io = (realtimeService as any).io;
      
      io.emit(event || 'broadcast', {
        message: message || 'System broadcast',
        data,
        timestamp: new Date().toISOString()
      });

      const response: ApiResponse = {
        success: true,
        message: 'Broadcast sent successfully',
        data: { event, recipients: realtimeService.getConnectionCount() }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'BROADCAST_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to send broadcast'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }

  // Send message to specific user
  async sendMessageToUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { event, data, message } = req.body;

      const realtimeService = getRealtimeService();
      const io = (realtimeService as any).io;
      
      io.to(`user:${userId}`).emit(event || 'message', {
        message: message || 'Direct message',
        data,
        timestamp: new Date().toISOString()
      });

      const response: ApiResponse = {
        success: true,
        message: 'Message sent successfully',
        data: { userId, event, isConnected: realtimeService.isUserConnected(userId) }
      };

      res.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: _error instanceof AppError ? _error.code : 'USER_MESSAGE_FAILED',
          message: _error instanceof AppError ? _error.message : 'Failed to send message to user'
        }
      };

      res.status(_error instanceof AppError ? _error.statusCode : 500).json(response);
    }
  }
}

export default new RealtimeController();
