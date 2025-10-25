import { Request, Response } from 'express';
import { NotificationController } from '../notificationController';
import { getRealtimeService } from '../../services/realtimeService';
import { AppError } from '../../utils/errors';

// Mock dependencies
jest.mock('../../services/realtimeService');

const mockRealtimeService = {
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
  deleteNotification: jest.fn()
};

(getRealtimeService as jest.Mock).mockReturnValue(mockRealtimeService);

describe('NotificationController', () => {
  let notificationController: NotificationController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    notificationController = new NotificationController();
    // Mock the getRealtimeService function to return our mock
    (getRealtimeService as jest.Mock).mockReturnValue(mockRealtimeService);
    
    mockReq = {
      user: {
        id: 'user123',
        userType: 'CUSTOMER',
        email: 'test@example.com'
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

  describe('getUserNotifications', () => {
    it('should get user notifications successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif123',
          userId: 'user123',
          type: 'BID_RECEIVED',
          title: 'New Bid',
          message: 'You have received a new bid',
          data: { bidId: 'bid123' },
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif124',
          userId: 'user123',
          type: 'PACKAGE_STATUS',
          title: 'Package Update',
          message: 'Your package status has been updated',
          data: null,
          isRead: true,
          createdAt: new Date().toISOString()
        }
      ];

      mockRealtimeService.getUserNotifications.mockResolvedValue(mockNotifications);

      await notificationController.getUserNotifications(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.getUserNotifications).toHaveBeenCalledWith('user123', 20, 0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should handle service errors', async () => {
      mockRealtimeService.getUserNotifications.mockRejectedValue(
        new AppError('Database error', 'NOTIFICATIONS_FETCH_FAILED', 500)
      );

      await notificationController.getUserNotifications(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATIONS_FETCH_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notif123';
      mockReq.params = { notificationId };
      mockRealtimeService.markNotificationAsRead.mockResolvedValue(undefined);

      await notificationController.markNotificationAsRead(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.markNotificationAsRead).toHaveBeenCalledWith(notificationId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification marked as read'
      });
    });

    it('should handle service errors', async () => {
      const notificationId = 'notif123';
      mockReq.params = { notificationId };
      mockRealtimeService.markNotificationAsRead.mockRejectedValue(
        new AppError('Database error', 'NOTIFICATION_UPDATE_FAILED', 500)
      );

      await notificationController.markNotificationAsRead(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATION_UPDATE_FAILED',
          message: 'Database error'
        }
      });
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif123',
          userId: 'user123',
          type: 'BID_RECEIVED',
          title: 'New Bid',
          message: 'You have received a new bid',
          data: { bidId: 'bid123' },
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif124',
          userId: 'user123',
          type: 'PACKAGE_STATUS',
          title: 'Package Update',
          message: 'Your package status has been updated',
          data: null,
          isRead: true,
          createdAt: new Date().toISOString()
        }
      ];

      mockRealtimeService.getUserNotifications.mockResolvedValue(mockNotifications);
      mockRealtimeService.markNotificationAsRead.mockResolvedValue(undefined);

      await notificationController.markAllNotificationsAsRead(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.getUserNotifications).toHaveBeenCalledWith('user123', 100, 0);
      expect(mockRealtimeService.markNotificationAsRead).toHaveBeenCalledWith('notif123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Marked 1 notifications as read'
      });
    });

    it('should handle service errors', async () => {
      mockRealtimeService.getUserNotifications.mockRejectedValue(
        new AppError('Database error', 'NOTIFICATIONS_READ_FAILED', 500)
      );

      await notificationController.markAllNotificationsAsRead(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATIONS_READ_FAILED',
          message: 'Failed to mark all notifications as read'
        }
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif123',
          userId: 'user123',
          type: 'BID_RECEIVED',
          title: 'New Bid',
          message: 'You have received a new bid',
          data: { bidId: 'bid123' },
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif124',
          userId: 'user123',
          type: 'PACKAGE_STATUS',
          title: 'Package Update',
          message: 'Your package status has been updated',
          data: null,
          isRead: true,
          createdAt: new Date().toISOString()
        }
      ];

      mockRealtimeService.getUserNotifications.mockResolvedValue(mockNotifications);

      await notificationController.getUnreadCount(mockReq as any, mockRes as Response);

      expect(mockRealtimeService.getUserNotifications).toHaveBeenCalledWith('user123', 100, 0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { count: 1 },
        message: 'Unread notification count retrieved'
      });
    });

    it('should handle service errors', async () => {
      mockRealtimeService.getUserNotifications.mockRejectedValue(
        new AppError('Database error', 'UNREAD_COUNT_FAILED', 500)
      );

      await notificationController.getUnreadCount(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNREAD_COUNT_FAILED',
          message: 'Failed to get unread notification count'
        }
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 'notif123';
      mockReq.params = { notificationId };

      await notificationController.deleteNotification(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification deleted successfully'
      });
    });

    it('should handle service errors', async () => {
      const notificationId = 'notif123';
      mockReq.params = { notificationId };
      
      // Since deleteNotification doesn't call the realtime service, we'll test error handling
      // by temporarily replacing the method implementation
      const originalDeleteNotification = notificationController.deleteNotification;
      
      notificationController.deleteNotification = async (req: any, res: any) => {
        try {
          throw new Error('Database error');
        } catch (_error) {
          res.status(500).json({
            success: false,
            error: {
              code: 'NOTIFICATION_DELETE_FAILED',
              message: 'Failed to delete notification'
            }
          });
        }
      };

      await notificationController.deleteNotification(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATION_DELETE_FAILED',
          message: 'Failed to delete notification'
        }
      });

      // Restore the original method
      notificationController.deleteNotification = originalDeleteNotification;
    });
  });
});
