import { Router } from 'express';
import VerificationController, { upload } from '../controllers/verificationController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';

const router = Router();
let verificationController: VerificationController;

try {
  verificationController = new VerificationController();
} catch (_error) {
  console.error('Verification routes error:', _error);
  throw _error;
}

/**
 * @route POST /api/verification/submit
 * @desc Submit document verification
 * @access Private
 */
router.post(
  '/submit',
  authenticateToken,
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 },
  ]),
  validateRequest({
    body: {
      documentType: { type: 'string', enum: ['DRIVERS_LICENSE', 'NATIONAL_ID', 'PASSPORT'], required: true },
      userType: { type: 'string', enum: ['CUSTOMER', 'DRIVER'], required: true },
    },
  }),
  verificationController.submitVerification
);

/**
 * @route GET /api/verification/status
 * @desc Get user verification status
 * @access Private
 */
router.get(
  '/status',
  authenticateToken,
  verificationController.getVerificationStatus
);

/**
 * @route GET /api/verification/:id
 * @desc Get verification by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticateToken,
  verificationController.getVerificationById
);

/**
 * @route GET /api/verification/admin/metrics
 * @desc Get verification metrics (Admin only)
 * @access Private (Admin)
 */
router.get(
  '/admin/metrics',
  authenticateToken,
  verificationController.getVerificationMetrics
);

/**
 * @route POST /api/verification/admin/:id/review
 * @desc Review verification (Admin only)
 * @access Private (Admin)
 */
router.post(
  '/admin/:id/review',
  authenticateToken,
  requireAdmin,
  validateRequest({
    body: {
      decision: { type: 'string', enum: ['APPROVED', 'REJECTED'], required: true },
      rejectionReason: { type: 'string', required: false },
    },
  }),
  verificationController.reviewVerification
);

/**
 * @route POST /api/verification/test/document-authenticity
 * @desc Test document authenticity (Development only)
 * @access Private (Development)
 */
router.post(
  '/test/document-authenticity',
  validateRequest({
    body: {
      imageBase64: { type: 'string', required: true },
      documentType: { type: 'string', enum: ['DRIVERS_LICENSE', 'NATIONAL_ID', 'PASSPORT'], required: true },
    },
  }),
  verificationController.testDocumentAuthenticity
);

/**
 * @route POST /api/verification/test/facial-recognition
 * @desc Test facial recognition (Development only)
 * @access Private (Development)
 */
router.post(
  '/test/facial-recognition',
  validateRequest({
    body: {
      documentImageBase64: { type: 'string', required: true },
      selfieImageBase64: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      documentType: { type: 'string', enum: ['DRIVERS_LICENSE', 'NATIONAL_ID', 'PASSPORT'], required: true },
    },
  }),
  verificationController.testFacialRecognition
);

/**
 * @route POST /api/verification/test/ocr-extraction
 * @desc Test OCR extraction (Development only)
 * @access Private (Development)
 */
router.post(
  '/test/ocr-extraction',
  validateRequest({
    body: {
      imageBase64: { type: 'string', required: true },
      documentType: { type: 'string', enum: ['DRIVERS_LICENSE', 'NATIONAL_ID', 'PASSPORT'], required: true },
    },
  }),
  verificationController.testOCRExtraction
);

export default router;
