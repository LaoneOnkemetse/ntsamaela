import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import trackingController from '../controllers/trackingController';
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

// Create tracking update
router.post(
  '/',
  requireAuth,
  requireUserType(['DRIVER', 'ADMIN']),
  [
    body('packageId').notEmpty().withMessage('Package ID is required'),
    body('status').notEmpty().withMessage('Status is required'),
    body('location').optional().isString().withMessage('Location must be a string'),
    body('latitude').optional().isFloat().withMessage('Latitude must be a number'),
    body('longitude').optional().isFloat().withMessage('Longitude must be a number'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => trackingController.createTrackingUpdate(req, res)
);

// Get package tracking
router.get(
  '/package/:packageId',
  requireAuth,
  requireUserType(['CUSTOMER', 'DRIVER', 'ADMIN']),
  [
    param('packageId').notEmpty().withMessage('Package ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => trackingController.getPackageTracking(req, res)
);

// Update package location
router.put(
  '/package/:packageId/location',
  requireAuth,
  requireUserType(['DRIVER']),
  [
    param('packageId').notEmpty().withMessage('Package ID is required'),
    body('latitude').isFloat().withMessage('Latitude is required and must be a number'),
    body('longitude').isFloat().withMessage('Longitude is required and must be a number'),
    body('location').optional().isString().withMessage('Location must be a string')
  ],
  handleValidationErrors,
  (req: any, res: any) => trackingController.updatePackageLocation(req, res)
);

// Start delivery
router.post(
  '/package/:packageId/start-delivery',
  requireAuth,
  requireUserType(['DRIVER']),
  [
    param('packageId').notEmpty().withMessage('Package ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => trackingController.startDelivery(req, res)
);

// Complete delivery
router.post(
  '/package/:packageId/complete-delivery',
  requireAuth,
  requireUserType(['DRIVER']),
  [
    param('packageId').notEmpty().withMessage('Package ID is required')
  ],
  handleValidationErrors,
  (req: any, res: any) => trackingController.completeDelivery(req, res)
);

export default router;
