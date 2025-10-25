import express from 'express';
import BidController from '../controllers/bidController';
import { requireAuth } from '../middleware/auth';
import { requireUserType } from '../middleware/userTypeMiddleware';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();
const bidController = BidController;

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

// Bid CRUD routes
router.post(
  '/',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    body('packageId').notEmpty().withMessage('Package ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid bid amount is required'),
    body('message').optional().isString().withMessage('Message must be a string'),
    body('tripId').optional().isString().withMessage('Trip ID must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.createBid(req, res)
);

router.get(
  '/',
  requireAuth,
  (req: any, res: any) => bidController.getBids(req, res)
);

router.get(
  '/pending',
  requireAuth,
  (req, res) => bidController.getPendingBids(req, res)
);

router.get(
  '/my-bids',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  (req, res) => bidController.getMyBids(req, res)
);

router.get(
  '/package/:packageId',
  requireAuth,
  (req, res) => bidController.getBidsByPackage(req, res)
);

router.get(
  '/:id',
  requireAuth,
  [
    param('id').notEmpty().withMessage('Valid bid ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.getBidById(req, res)
);

router.put(
  '/:id',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    param('id').notEmpty().withMessage('Valid bid ID is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Valid bid amount is required'),
    body('message').optional().isString().withMessage('Message must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.updateBid(req, res)
);

router.delete(
  '/:id',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    param('id').notEmpty().withMessage('Valid bid ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.cancelBid(req, res)
);

// Bid management routes
router.post(
  '/accept',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN']),
  [
    body('bidId').notEmpty().withMessage('Bid ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.acceptBid(req, res)
);

router.post(
  '/reject',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN']),
  [
    body('bidId').notEmpty().withMessage('Bid ID is required'),
    body('reason').optional().isString().withMessage('Rejection reason must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.rejectBid(req, res)
);

// Utility routes
router.get(
  '/recommendations/package/:packageId',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    param('packageId').notEmpty().withMessage('Valid package ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.getRecommendedBid(req, res)
);

router.post(
  '/calculate-commission',
  requireAuth,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => bidController.calculateCommission(req, res)
);

export default router;
