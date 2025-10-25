import { body, param, query } from 'express-validator';
// import { BidStatus } from '@ntsamaela/shared/types';

export const validateCreateBid = [
  body('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isLength({ min: 1 })
    .withMessage('Valid package ID is required'),

  body('tripId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Valid trip ID is required'),

  body('amount')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Bid amount must be between $1 and $10,000'),

  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters')
];

export const validateUpdateBid = [
  body('amount')
    .optional()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Bid amount must be between $1 and $10,000'),

  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters'),

  body('status')
    .optional()
    .isIn(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
    .withMessage('Valid status is required')
];

export const validateBidId = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('Valid bid ID is required')
];

export const validateBidFilters = [
  query('packageId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Valid package ID is required'),

  query('driverId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Valid driver ID is required'),

  query('tripId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Valid trip ID is required'),

  query('status')
    .optional()
    .isIn(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
    .withMessage('Valid status is required'),

  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min amount must be a positive number'),

  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export const validateBidAcceptance = [
  body('bidId')
    .notEmpty()
    .withMessage('Bid ID is required')
    .isLength({ min: 1 })
    .withMessage('Valid bid ID is required'),

  body('commissionAmount')
    .isFloat({ min: 0 })
    .withMessage('Valid commission amount is required')
];

export const validateBidRejection = [
  body('bidId')
    .notEmpty()
    .withMessage('Bid ID is required')
    .isLength({ min: 1 })
    .withMessage('Valid bid ID is required'),

  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must not exceed 500 characters')
];

export const validateCommissionCalculation = [
  body('amount')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Amount must be between $1 and $10,000')
];
