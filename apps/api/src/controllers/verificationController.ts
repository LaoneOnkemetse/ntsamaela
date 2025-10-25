import { Request, Response } from 'express';
import multer from 'multer';
import VerificationService from '../services/verificationService';
import { 
  DocumentVerificationRequest, 
  ApiResponse, 
  AuthenticatedRequest,
  DocumentType,
  UserType 
} from '@shared/types';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export class VerificationController {
  private verificationService: VerificationService | null = null;

  constructor() {
    // Don't initialize verification service in constructor
  }

  private getVerificationService(): VerificationService {
    if (!this.verificationService) {
      this.verificationService = new VerificationService();
    }
    return this.verificationService;
  }

  /**
   * Submit document verification
   */
  submitVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
        return;
      }

      const { documentType, userType } = req.body;
      
      // Validate required fields
      if (!documentType || !userType) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Document type and user type are required' 
          },
        });
        return;
      }

      // Validate document type
      if (!['DRIVERS_LICENSE', 'NATIONAL_ID', 'PASSPORT'].includes(documentType)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_DOCUMENT_TYPE', 
            message: 'Invalid document type' 
          },
        });
        return;
      }

      // Validate user type
      if (!['CUSTOMER', 'DRIVER'].includes(userType)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_USER_TYPE', 
            message: 'Invalid user type' 
          },
        });
        return;
      }

      // Check if user type matches document type requirements
      if (userType === 'DRIVER' && documentType !== 'DRIVERS_LICENSE') {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_DOCUMENT_FOR_USER_TYPE', 
            message: 'Drivers must provide a driver license' 
          },
        });
        return;
      }

      // Get uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.frontImage || files.frontImage.length === 0) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_FRONT_IMAGE', 
            message: 'Front image is required' 
          },
        });
        return;
      }

      if (!files.selfieImage || files.selfieImage.length === 0) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_SELFIE_IMAGE', 
            message: 'Selfie image is required' 
          },
        });
        return;
      }

      // Check if back image is required
      const requiresBackImage = documentType === 'DRIVERS_LICENSE';
      if (requiresBackImage && (!files.backImage || files.backImage.length === 0)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_BACK_IMAGE', 
            message: 'Back image is required for driver license' 
          },
        });
        return;
      }

      // Convert images to base64
      const frontImageBase64 = files.frontImage[0].buffer.toString('base64');
      const selfieImageBase64 = files.selfieImage[0].buffer.toString('base64');
      const backImageBase64 = files.backImage?.[0]?.buffer.toString('base64');

      // Create verification request
      const verificationRequest: DocumentVerificationRequest = {
        userId,
        documentType: documentType as DocumentType,
        frontImageBase64,
        backImageBase64,
        selfieImageBase64,
        userType: userType as UserType,
      };

      // Process verification
      const result = await this.getVerificationService().processVerification(verificationRequest);

      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.message,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (_error) {
      console.error('Failed to process verification:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'VERIFICATION_ERROR', 
          message: 'Failed to process verification' 
        },
      });
    }
  };

  /**
   * Get verification status
   */
  getVerificationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
        return;
      }

      const verifications = await this.getVerificationService().getUserVerifications(userId);
      
      const response: ApiResponse = {
        success: true,
        data: verifications,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'VERIFICATION_ERROR', 
          message: 'Failed to get verification status' 
        },
      });
    }
  };

  /**
   * Get verification by ID
   */
  getVerificationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_VERIFICATION_ID', 
            message: 'Verification ID is required' 
          },
        });
        return;
      }

      const verification = await this.getVerificationService().getVerificationById(id);
      
      if (!verification) {
        res.status(404).json({
          success: false,
          error: { 
            code: 'VERIFICATION_NOT_FOUND', 
            message: 'Verification not found' 
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: verification,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'VERIFICATION_ERROR', 
          message: 'Failed to get verification' 
        },
      });
    }
  };

  /**
   * Get verification metrics (Admin only)
   */
  getVerificationMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userType = req.user?.userType;
      
      if (userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          },
        });
        return;
      }

      const metrics = await this.getVerificationService().getVerificationMetrics();
      
      const response: ApiResponse = {
        success: true,
        data: metrics,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'VERIFICATION_ERROR', 
          message: 'Failed to get verification metrics' 
        },
      });
    }
  };

  /**
   * Review verification (Admin only)
   */
  reviewVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userType = req.user?.userType;
      const reviewedBy = req.user?.id;
      
      if (userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required' 
          },
        });
        return;
      }

      const { id } = req.params;
      const { decision, rejectionReason } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_VERIFICATION_ID', 
            message: 'Verification ID is required' 
          },
        });
        return;
      }

      if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_DECISION', 
            message: 'Decision must be APPROVED or REJECTED' 
          },
        });
        return;
      }

      if (decision === 'REJECTED' && !rejectionReason) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_REJECTION_REASON', 
            message: 'Rejection reason is required for rejected verifications' 
          },
        });
        return;
      }

      await this.getVerificationService().reviewVerification(
        id,
        decision,
        reviewedBy!,
        rejectionReason
      );

      const response: ApiResponse = {
        success: true,
        message: `Verification ${decision.toLowerCase()} successfully`,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'VERIFICATION_ERROR', 
          message: 'Failed to review verification' 
        },
      });
    }
  };

  /**
   * Test document authenticity (Development only)
   */
  testDocumentAuthenticity = async (req: Request, res: Response): Promise<void> => {
    try {
      // This endpoint is for development/testing purposes only
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({
          success: false,
          error: { 
            code: 'NOT_FOUND', 
            message: 'Endpoint not available in production' 
          },
        });
        return;
      }

      const { imageBase64, documentType } = req.body;
      
      if (!imageBase64 || !documentType) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_PARAMETERS', 
            message: 'Image base64 and document type are required' 
          },
        });
        return;
      }

      // Import AWS Rekognition service for testing
      const AWSRekognitionService = (await import('../services/awsRekognitionService')).default;
      const rekognitionService = new AWSRekognitionService();
      
      const result = await rekognitionService.analyzeDocumentAuthenticity(
        imageBase64,
        documentType as DocumentType
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'TEST_ERROR', 
          message: 'Failed to test document authenticity' 
        },
      });
    }
  };

  /**
   * Test facial recognition (Development only)
   */
  testFacialRecognition = async (req: Request, res: Response): Promise<void> => {
    try {
      // This endpoint is for development/testing purposes only
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({
          success: false,
          error: { 
            code: 'NOT_FOUND', 
            message: 'Endpoint not available in production' 
          },
        });
        return;
      }

      const { documentImageBase64, selfieImageBase64, userId, documentType } = req.body;
      
      if (!documentImageBase64 || !selfieImageBase64 || !userId || !documentType) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_PARAMETERS', 
            message: 'All parameters are required' 
          },
        });
        return;
      }

      // Import Facial Recognition service for testing
      const FacialRecognitionService = (await import('../services/facialRecognitionService')).default;
      const facialRecognitionService = new FacialRecognitionService();
      
      const result = await facialRecognitionService.performFacialRecognition(
        documentImageBase64,
        selfieImageBase64,
        userId,
        documentType as DocumentType
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'TEST_ERROR', 
          message: 'Failed to test facial recognition' 
        },
      });
    }
  };

  /**
   * Test OCR extraction (Development only)
   */
  testOCRExtraction = async (req: Request, res: Response): Promise<void> => {
    try {
      // This endpoint is for development/testing purposes only
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({
          success: false,
          error: { 
            code: 'NOT_FOUND', 
            message: 'Endpoint not available in production' 
          },
        });
        return;
      }

      const { imageBase64, documentType } = req.body;
      
      if (!imageBase64 || !documentType) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'MISSING_PARAMETERS', 
            message: 'Image base64 and document type are required' 
          },
        });
        return;
      }

      // Import OCR service for testing
      const OCRService = (await import('../services/ocrService')).default;
      const ocrService = new OCRService();
      
      const result = await ocrService.extractDocumentData(
        imageBase64,
        documentType as DocumentType
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (_error) {
      console.error('Verification error:', _error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'TEST_ERROR', 
          message: 'Failed to test OCR extraction' 
        },
      });
    }
  };
}

// Export multer middleware for file uploads
export { upload };

// Default export
export default VerificationController;
