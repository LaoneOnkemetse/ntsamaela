import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import chatController from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';
import { requireUserType } from '../middleware/roleAuth';

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

// Create chat room
router.post(
  '/',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER']),
  [
    body('packageId').notEmpty().withMessage('Package ID is required'),
    body('driverId').optional().isString().withMessage('Driver ID must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => chatController.createChatRoom(req, res)
);

// Get chat rooms for user
router.get(
  '/',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER']),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  (req: any, res: any) => chatController.getChatRooms(req, res)
);

// Get chat messages
router.get(
  '/:chatRoomId/messages',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER']),
  [
    param('chatRoomId').notEmpty().withMessage('Chat room ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  (req: any, res: any) => chatController.getChatMessages(req, res)
);

// Send message
router.post(
  '/:chatRoomId/messages',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER']),
  [
    param('chatRoomId').notEmpty().withMessage('Chat room ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('messageType').optional().isIn(['TEXT', 'IMAGE', 'FILE']).withMessage('Invalid message type')
  ],
  handleValidationErrors,
  (req: any, res: any) => chatController.sendMessage(req, res)
);

// Mark message as read
router.put(
  '/messages/:messageId/read',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER']),
  [
    param('messageId').notEmpty().withMessage('Message ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => chatController.markMessageAsRead(req, res)
);

export default router;
