import { body, param, query } from 'express-validator';
// import { TripCapacity, TripStatus } from '@ntsamaela/shared/types';

export const validateCreateTrip = [
  body('startAddress')
    .notEmpty()
    .withMessage('Start address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Start address must be between 5 and 200 characters'),

  body('startLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid start latitude is required'),

  body('startLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid start longitude is required'),

  body('endAddress')
    .notEmpty()
    .withMessage('End address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('End address must be between 5 and 200 characters'),

  body('endLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid end latitude is required'),

  body('endLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid end longitude is required'),

  body('departureTime')
    .isISO8601()
    .withMessage('Valid departure time is required')
    .custom((value) => {
      const departureTime = new Date(value);
      const now = new Date();
      if (departureTime <= now) {
        throw new Error('Departure time must be in the future');
      }
      return true;
    }),

  body('availableCapacity')
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Valid capacity is required')
];

export const validateUpdateTrip = [
  body('startAddress')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Start address must be between 5 and 200 characters'),

  body('startLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid start latitude is required'),

  body('startLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid start longitude is required'),

  body('endAddress')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('End address must be between 5 and 200 characters'),

  body('endLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid end latitude is required'),

  body('endLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid end longitude is required'),

  body('departureTime')
    .optional()
    .isISO8601()
    .withMessage('Valid departure time is required')
    .custom((value) => {
      if (value) {
        const departureTime = new Date(value);
        const now = new Date();
        if (departureTime <= now) {
          throw new Error('Departure time must be in the future');
        }
      }
      return true;
    }),

  body('arrivalTime')
    .optional()
    .isISO8601()
    .withMessage('Valid arrival time is required'),

  body('availableCapacity')
    .optional()
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Valid capacity is required'),

  body('status')
    .optional()
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Valid status is required')
];

export const validateTripId = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('Valid trip ID is required')
];

export const validateTripFilters = [
  query('driverId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Valid driver ID is required'),

  query('status')
    .optional()
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Valid status is required'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),

  query('startLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid start latitude is required'),

  query('startLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid start longitude is required'),

  query('endLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid end latitude is required'),

  query('endLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid end longitude is required'),

  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Radius must be between 0.1 and 1000 kilometers'),

  query('capacity')
    .optional()
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Valid capacity is required'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export const validateMatchingCriteria = [
  query('maxDistance')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Max distance must be between 0.1 and 1000 kilometers'),

  query('timeWindow')
    .optional()
    .isFloat({ min: 0.1, max: 168 })
    .withMessage('Time window must be between 0.1 and 168 hours'),

  query('minMatchScore')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Min match score must be between 0 and 1'),

  query('capacityRequired')
    .optional()
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Valid capacity is required'),

  query('driverRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Driver rating must be between 0 and 5')
];
