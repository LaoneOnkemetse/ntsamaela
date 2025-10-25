import express from 'express';
import multer from 'multer';
import PackageController from '../controllers/packageController';
import { requireAuth } from '../middleware/auth';
import { requireUserType } from '../middleware/userTypeMiddleware';
import {
  validateCreatePackage,
  validateUpdatePackageStatus,
  validatePackageId,
  validatePackageFilters,
  validateImageUpload,
  validateLocationSearch
} from '../middleware/packageValidation';
import { validateRequest } from '../middleware/validateRequest';
import { sanitizeInput } from '../middleware/sanitization';
import { param } from 'express-validator';

const router = express.Router();
const packageController = PackageController;

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Mock multer for test environment
if (process.env.NODE_ENV === 'test') {
  upload.single = () => (req: any, res: any, next: any) => next();
}

// Package CRUD routes
router.post(
  '/',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN']),
  upload.single('image'),
  sanitizeInput,
  validateCreatePackage,
  validateRequest,
  packageController.createPackage
);

router.get(
  '/',
  requireAuth,
  validatePackageFilters,
  validateRequest,
  packageController.getPackages
);

router.get(
  '/search',
  requireAuth,
  validatePackageFilters,
  validateRequest,
  packageController.searchPackages
);

router.get(
  '/search/location',
  requireAuth,
  validateLocationSearch,
  validatePackageFilters,
  validateRequest,
  packageController.searchPackagesByLocation
);

router.get(
  '/user/:userId',
  requireAuth,
  [
    param('userId')
      .isUUID()
      .withMessage('Valid user ID is required')
      .custom((value) => {
        // Additional security check for SQL injection patterns
        if (value.includes("'") || value.includes(';') || value.includes('--') || value.includes('/*')) {
          throw new Error('Invalid user ID format');
        }
        return true;
      })
  ],
  validateRequest,
  packageController.getPackagesByUser
);

router.get(
  '/:id',
  requireAuth,
  validatePackageId,
  validateRequest,
  packageController.getPackageById
);

router.put(
  '/:id/status',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN', 'DRIVER']),
  validatePackageId,
  validateUpdatePackageStatus,
  validateRequest,
  packageController.updatePackageStatus
);

router.delete(
  '/:id',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN']),
  validatePackageId,
  validateRequest,
  packageController.deletePackage
);

// Image upload routes
router.post(
  '/:id/image',
  requireAuth,
  requireUserType(['CUSTOMER', 'ADMIN']),
  upload.single('image'),
  validateImageUpload,
  validateRequest,
  packageController.uploadPackageImage
);

router.get(
  '/image/:key',
  requireAuth,
  packageController.getPackageImage
);

// Admin routes
router.get(
  '/admin/all',
  requireAuth,
  requireUserType(['ADMIN']),
  validatePackageFilters,
  validateRequest,
  packageController.getPackages
);

// Error handling middleware for multer
router.use((_error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (_error instanceof multer.MulterError) {
    if (_error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        }
      });
    }
    if (_error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file is allowed'
        }
      });
    }
  }
  
  if (_error.message === 'Invalid file type. Only JPEG, PNG, and WebP are allowed.') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: _error.message
      }
    });
  }

  next(_error);
});

export default router;
