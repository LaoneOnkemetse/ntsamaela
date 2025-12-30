import { Router } from 'express';
import { body, param } from 'express-validator';
import { BidController } from '../controllers/bidController';
import { requireAuth } from '../middleware/auth';
import { requireUserType } from '../middleware/userTypeMiddleware';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const bidController = new BidController();

// Validation rules
const validateCreateBid = [
  body('packageId').isString().withMessage('Package ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('message').optional().isString().withMessage('Message must be a string'),
  body('tripId').optional().isString().withMessage('Trip ID must be a string')
];

const validateCounterBid = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('message').optional().isString().withMessage('Message must be a string')
];

const validateBidId = [
  param('id').isString().withMessage('Bid ID is required')
];

// Routes
router.post(
  '/',
  requireAuth,
  requireUserType(['DRIVER']),
  validateCreateBid,
  validateRequest,
  bidController.createBid.bind(bidController)
);

router.get(
  '/package/:packageId',
  requireAuth,
  bidController.getBidsByPackage.bind(bidController)
);

router.get(
  '/my-bids',
  requireAuth,
  requireUserType(['DRIVER']),
  bidController.getMyBids.bind(bidController)
);

router.put(
  '/:id/accept',
  requireAuth,
  requireUserType(['CUSTOMER']),
  validateBidId,
  validateRequest,
  bidController.acceptBid.bind(bidController)
);

router.put(
  '/:id/reject',
  requireAuth,
  requireUserType(['CUSTOMER']),
  validateBidId,
  validateRequest,
  bidController.rejectBid.bind(bidController)
);

router.post(
  '/:id/counter',
  requireAuth,
  requireUserType(['CUSTOMER']),
  validateBidId,
  validateCounterBid,
  validateRequest,
  bidController.counterBid.bind(bidController)
);

router.delete(
  '/:id',
  requireAuth,
  requireUserType(['DRIVER']),
  validateBidId,
  validateRequest,
  bidController.deleteBid.bind(bidController)
);

export default router;