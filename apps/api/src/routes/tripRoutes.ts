import express, { Request, Response } from 'express';
import TripController from '../controllers/tripController';
import { requireAuth } from '../middleware/auth';
import { requireUserType } from '../middleware/userTypeMiddleware';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();
const tripController = TripController;

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



// Trip CRUD routes
router.post(
  '/',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    body('startAddress').notEmpty().withMessage('Start address is required'),
    body('startLat').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude is required'),
    body('startLng').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude is required'),
    body('endAddress').notEmpty().withMessage('End address is required'),
    body('endLat').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude is required'),
    body('endLng').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude is required'),
    body('departureTime').isISO8601().withMessage('Valid departure time is required'),
    body('availableCapacity').isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).withMessage('Valid capacity is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.createTrip(req, res)
);

router.get(
  '/',
  requireAuth,
  (req: any, res: any) => tripController.getTrips(req, res)
);

router.get(
  '/available',
  requireAuth,
  (req, res) => tripController.getAvailableTrips(req, res)
);

router.get(
  '/search',
  requireAuth,
  [
    query('origin').optional().isString().withMessage('Origin must be a string'),
    query('destination').optional().isString().withMessage('Destination must be a string'),
    query('departureDate').optional().isISO8601().withMessage('Departure date must be valid'),
    query('capacity').optional().isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).withMessage('Valid capacity is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => tripController.searchTrips(req, res)
);

router.get(
  '/my-trips',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  (req, res) => tripController.getMyTrips(req, res)
);

router.get(
  '/driver/:driverId',
  requireAuth,
  [
    param('driverId').isUUID().withMessage('Valid driver ID is required')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => tripController.getTripsByDriver(req, res)
);

router.get(
  '/:id',
  requireAuth,
  [
    param('id').notEmpty().withMessage('Valid trip ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.getTripById(req, res)
);

router.put(
  '/:id',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    param('id').notEmpty().withMessage('Valid trip ID is required'),
    body('status').optional().isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Valid status is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.updateTrip(req, res)
);

router.delete(
  '/:id',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    param('id').notEmpty().withMessage('Valid trip ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.deleteTrip(req, res)
);

// Matching algorithm routes
router.get(
  '/matches/package/:packageId',
  requireAuth,
  [
    param('packageId').notEmpty().withMessage('Valid package ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.findMatchesForPackage(req, res)
);

router.get(
  '/matches/trip/:tripId',
  requireAuth,
  [
    param('tripId').notEmpty().withMessage('Valid trip ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => tripController.findMatchesForTrip(req, res)
);

router.get(
  '/matches/optimal',
  requireAuth,
  (req, res) => tripController.getOptimalMatches(req, res)
);

export default router;
