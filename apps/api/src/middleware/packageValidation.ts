import { body, param, query } from 'express-validator';

export const validateCreatePackage = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  
  body('description')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('pickupAddress')
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage('Pickup address must be between 5 and 200 characters'),
  
  body('pickupLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  
  body('pickupLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  
  body('deliveryAddress')
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage('Delivery address must be between 5 and 200 characters'),
  
  body('deliveryLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Delivery latitude must be between -90 and 90'),
  
  body('deliveryLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Delivery longitude must be between -180 and 180'),
  
  body('priceOffered')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Price offered must be between $0.01 and $10,000'),
  
  body('size')
    .optional()
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Size must be one of: SMALL, MEDIUM, LARGE, EXTRA_LARGE'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Weight must be between 0.1 and 1000 kg')
];

export const validateUpdatePackageStatus = [
  body('status')
    .isIn(['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'])
    .withMessage('Status must be one of: PENDING, ACCEPTED, IN_TRANSIT, DELIVERED, FAILED, CANCELLED'),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

export const validatePackageId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Package ID is required')
];

export const validatePackageFilters = [
  query('status')
    .optional()
    .isIn(['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'])
    .withMessage('Invalid status filter'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  query('size')
    .optional()
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'])
    .withMessage('Invalid size filter'),
  
  query('weight')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Weight must be between 0.1 and 1000 kg'),
  
  query('minWeight')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Minimum weight must be at least 0.1 kg'),
  
  query('maxWeight')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Maximum weight must be between 0.1 and 1000 kg'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'priceOffered', 'weight', 'status'])
    .withMessage('Sort by must be one of: createdAt, priceOffered, weight, status'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('search')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
];

export const validateImageUpload = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Package ID is required')
];

export const validateLocationSearch = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be between 0.1 and 100 km')
];
