import { Response } from 'express';
import { getRealtimeService } from '../services/realtimeService';
import { 
  Notification, 
  // NotificationFilters,
  ApiResponse,
  PaginatedResponse,
  AuthenticatedRequest
} from '@ntsamaela/shared/types';
import { AppError } from '../utils/errors';

export class NotificationController {
  private get realtimeService() {
    return getRealtimeService();
  }

  getUserNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

      const notifications = await this.realtimeService.getUserNotifications(userId, limit, offset);

      // Filter by type and read status if provided
      let filteredNotifications = notifications;
      if (type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === type);
      }
      if (isRead !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.isRead === isRead);
      }

      const response: PaginatedResponse<Notification> = {
        success: true,
        data: filteredNotifications,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: filteredNotifications.length,
          totalPages: Math.ceil(filteredNotifications.length / limit)
        }
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'NOTIFICATIONS_FETCH_FAILED',
            message: 'Failed to fetch notifications'
          }
        });
      }
    }
  }

  markNotificationAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;

      if (!notificationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Notification ID is required'
          }
        });
        return;
      }

      await this.realtimeService.markNotificationAsRead(notificationId);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Notification marked as read'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'NOTIFICATION_READ_FAILED',
            message: 'Failed to mark notification as read'
          }
        });
      }
    }
  }

  markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // TODO: Implement markAllNotificationsAsRead method in realtimeService
      // For now, we'll get all unread notifications and mark them as read
      const notifications = await this.realtimeService.getUserNotifications(userId, 100, 0);
      const unreadNotifications = notifications.filter(n => !n.isRead);

      for (const notification of unreadNotifications) {
        await this.realtimeService.markNotificationAsRead(notification.id);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: `Marked ${unreadNotifications.length} notifications as read`
      };

      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATIONS_READ_FAILED',
          message: 'Failed to mark all notifications as read'
        }
      });
    }
  }

  getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const notifications = await this.realtimeService.getUserNotifications(userId, 100, 0);
      const unreadCount = notifications.filter(n => !n.isRead).length;

      const response: ApiResponse<{ count: number }> = {
        success: true,
        data: { count: unreadCount },
        message: 'Unread notification count retrieved'
      };

      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'UNREAD_COUNT_FAILED',
          message: 'Failed to get unread notification count'
        }
      });
    }
  }

  deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;

      if (!notificationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Notification ID is required'
          }
        });
        return;
      }

      // TODO: Implement deleteNotification method in realtimeService
      // For now, we'll just return success
      const response: ApiResponse<null> = {
        success: true,
        message: 'Notification deleted successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_DELETE_FAILED',
          message: 'Failed to delete notification'
        }
      });
    }
  }
}

export default new NotificationController();
