import { Router } from 'express';
import { param, query } from 'express-validator';
import { NotificationController } from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const notificationController = new NotificationController();

// Validation rules
const validateNotificationId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Notification ID is required')
];

const validateNotificationFilters = [
  query('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),
  
  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

// Routes
router.get(
  '/',
  requireAuth,
  validateNotificationFilters,
  validateRequest,
  notificationController.getUserNotifications.bind(notificationController)
);

router.get(
  '/unread-count',
  requireAuth,
  notificationController.getUnreadCount.bind(notificationController)
);

router.put(
  '/:id/read',
  requireAuth,
  validateNotificationId,
  validateRequest,
  notificationController.markAsRead.bind(notificationController)
);

router.put(
  '/mark-all-read',
  requireAuth,
  notificationController.markAllAsRead.bind(notificationController)
);

router.delete(
  '/:id',
  requireAuth,
  validateNotificationId,
  validateRequest,
  notificationController.deleteNotification.bind(notificationController)
);

export default router;
