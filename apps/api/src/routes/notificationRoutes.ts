import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import notificationController from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

// Get user notifications
router.get(
  '/',
  requireAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('type').optional().isIn(['BID_RECEIVED', 'BID_ACCEPTED', 'BID_REJECTED', 'PACKAGE_STATUS', 'DELIVERY_UPDATE', 'CHAT_MESSAGE']).withMessage('Invalid notification type'),
    query('isRead').optional().isBoolean().withMessage('isRead must be a boolean')
  ],
  handleValidationErrors,
  (req: any, res: any) => notificationController.getUserNotifications(req, res)
);

// Get unread notification count
router.get(
  '/unread-count',
  requireAuth,
  (req: any, res: any) => notificationController.getUnreadCount(req, res)
);

// Mark notification as read
router.put(
  '/:notificationId/read',
  requireAuth,
  [
    param('notificationId').notEmpty().withMessage('Notification ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => notificationController.markNotificationAsRead(req, res)
);

// Mark all notifications as read
router.put(
  '/read-all',
  requireAuth,
  (req: any, res: any) => notificationController.markAllNotificationsAsRead(req, res)
);

// Delete notification
router.delete(
  '/:notificationId',
  requireAuth,
  [
    param('notificationId').notEmpty().withMessage('Notification ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => notificationController.deleteNotification(req, res)
);

export default router;
