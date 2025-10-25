import { Router } from 'express';
import { body } from 'express-validator';
import RealtimeController from '../controllers/realtimeController';
import { requireAuth, requireUserType } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const realtimeController = RealtimeController;

// Validation rules
const notificationValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('type').notEmpty().withMessage('Notification type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required')
];

const statusUpdateValidation = [
  body('status').notEmpty().withMessage('Status is required')
];

const broadcastValidation = [
  body('message').notEmpty().withMessage('Message is required')
];

// Live tracking routes
router.post('/tracking/package/:packageId/start', requireAuth, realtimeController.startLiveTracking);
router.post('/tracking/package/:packageId/stop', requireAuth, realtimeController.stopLiveTracking);

// Notification routes
router.post('/notifications/send', notificationValidation, validateRequest, realtimeController.sendNotification);

// Package status routes
router.put('/package/:packageId/status', requireAuth, statusUpdateValidation, validateRequest, realtimeController.updatePackageStatus);

// Delivery status routes
router.put('/delivery/:packageId/status', requireAuth, requireUserType(['DRIVER']), statusUpdateValidation, validateRequest, realtimeController.updateDeliveryStatus);

// Trip status routes
router.put('/trip/:tripId/status', requireAuth, requireUserType(['DRIVER']), statusUpdateValidation, validateRequest, realtimeController.updateTripStatus);

// Connection management routes
router.get('/connections/status', realtimeController.getConnectionStatus);
router.get('/connections/user/:userId', realtimeController.checkUserConnection);

// Broadcasting routes
router.post('/broadcast', broadcastValidation, validateRequest, realtimeController.broadcastMessage);
router.post('/user/:userId/message', broadcastValidation, validateRequest, realtimeController.sendMessageToUser);

export default router;
