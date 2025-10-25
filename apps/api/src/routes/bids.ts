import { Router } from 'express';
import { body } from 'express-validator';
import BidController from '../controllers/bidController';
import { validateRequest } from '../middleware/validateRequest';
import { sanitizeInput } from '../middleware/sanitization';
import { requireAuth, requireUserType, requireVerifiedUser } from '../middleware/auth';

const router = Router();
const bidController = BidController;

// Validation rules
const createBidValidation = [
  body('packageId').notEmpty().withMessage('Package ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid bid amount is required'),
  body('message').optional().isString().withMessage('Message must be a string')
];

// Routes
router.post('/', requireAuth, requireUserType(['DRIVER']), requireVerifiedUser, sanitizeInput, createBidValidation, validateRequest, bidController.createBid);
router.get('/', requireAuth, bidController.getBids);
router.get('/pending', requireAuth, bidController.getPendingBids);
router.get('/my-bids', requireAuth, requireUserType(['DRIVER']), bidController.getBidsByDriver);
router.get('/package/:packageId', requireAuth, bidController.getBidsByPackage);
router.get('/:id', requireAuth, bidController.getBidById);
router.put('/:id', requireAuth, requireUserType(['DRIVER']), bidController.updateBid);
router.put('/:id/accept', requireAuth, requireUserType(['CUSTOMER']), bidController.acceptBid);
router.put('/:id/reject', requireAuth, requireUserType(['CUSTOMER']), bidController.rejectBid);
router.delete('/:id', requireAuth, requireUserType(['DRIVER']), bidController.cancelBid);

// Commission management routes
router.post('/calculate-commission', requireAuth, bidController.calculateCommission);
router.post('/pre-authorize', requireAuth, requireUserType(['DRIVER']), bidController.preAuthorizeCommission);
router.post('/confirm-commission/:reservationId', requireAuth, bidController.confirmCommissionReservation);
router.post('/release-commission/:reservationId', requireAuth, bidController.releaseCommissionReservation);
router.get('/recommendations/package/:packageId', requireAuth, bidController.getRecommendedBids);

export default router;


