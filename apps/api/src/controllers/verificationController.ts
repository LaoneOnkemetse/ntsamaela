import { Request, Response } from 'express';
import { getPrismaClient } from '@database/index';
// Mock verification service for now
const verificationService = {
  processVerification: async (verificationId: string) => {
    console.log(`Mock processing verification: ${verificationId}`);
    // Mock processing - in real implementation, this would call AI services
  }
};
import { AuthenticatedRequest } from '@shared/types';
import cloudStorageService from '../services/cloudStorageService';

export class VerificationController {
  async submitVerification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { documentType } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.frontImage || !files.selfieImage) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILES',
            message: 'Front image and selfie are required'
          }
        });
      }

      // Upload images to cloud storage
      const frontImageUrl = (await cloudStorageService.uploadPackageImage(
        files.frontImage[0],
        userId,
        `verification-front-${Date.now()}`
      )).url;

      const selfieImageUrl = (await cloudStorageService.uploadPackageImage(
        files.selfieImage[0],
        userId,
        `verification-selfie-${Date.now()}`
      )).url;

      let backImageUrl = null;
      if (files.backImage && files.backImage[0]) {
        backImageUrl = (await cloudStorageService.uploadPackageImage(
          files.backImage[0],
          userId,
          `verification-back-${Date.now()}`
        )).url;
      }

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      // Create verification record
      const verification = await prisma.verification.create({
        data: {
          userId,
          documentType,
          frontImageUrl,
          backImageUrl,
          selfieImageUrl,
          status: 'PENDING'
        }
      });

      // Process verification asynchronously
      verificationService.processVerification(verification.id).catch(console.error);

      res.status(201).json({
        success: true,
        data: verification,
        message: 'Verification submitted successfully'
      });
    } catch (_error: any) {
      console.error('Error submitting verification:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_SUBMISSION_ERROR',
          message: 'Failed to submit verification'
        }
      });
    }
  }

  async getVerificationStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const verification = await prisma.verification.findUnique({
        where: { userId },
        select: {
          id: true,
          documentType: true,
          status: true,
          riskScore: true,
          authenticityScore: true,
          dataValidationScore: true,
          facialMatchScore: true,
          reviewedAt: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!verification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VERIFICATION_NOT_FOUND',
            message: 'No verification found for this user'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: verification
      });
    } catch (_error: any) {
      console.error('Error getting verification status:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_STATUS_ERROR',
          message: 'Failed to get verification status'
        }
      });
    }
  }

  async getMyVerificationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get Prisma client
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.status(503).json({
          success: false,
          error: { code: "DATABASE_ERROR", message: "Database unavailable" },
        });
      }

      const verification = await prisma.verification.findUnique({
        where: { userId },
        select: {
          id: true,
          documentType: true,
          status: true,
          riskScore: true,
          authenticityScore: true,
          dataValidationScore: true,
          facialMatchScore: true,
          reviewedAt: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!verification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VERIFICATION_NOT_FOUND',
            message: 'No verification found for this user'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: verification
      });
    } catch (_error: any) {
      console.error('Error getting verification status:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_STATUS_ERROR',
          message: 'Failed to get verification status'
        }
      });
    }
  }

  async getVerificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const verificationService = (await import('../services/verificationService')).default;
      const verification = await verificationService.getVerificationById(id);

      if (!verification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VERIFICATION_NOT_FOUND',
            message: 'Verification not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: verification
      });
    } catch (_error: any) {
      console.error('Error getting verification:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FETCH_ERROR',
          message: 'Failed to get verification'
        }
      });
    }
  }

  async getVerificationMetrics(_req: Request, res: Response) {
    try {
      const verificationService = (await import('../services/verificationService')).default;
      const metrics = await verificationService.getVerificationMetrics();

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (_error: any) {
      console.error('Error getting verification metrics:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_METRICS_ERROR',
          message: 'Failed to get verification metrics'
        }
      });
    }
  }

  async reviewVerification(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { decision, rejectionReason } = req.body;
      const reviewedBy = req.user!.id;

      if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DECISION',
            message: 'Decision must be APPROVED or REJECTED'
          }
        });
      }

      const verificationService = (await import('../services/verificationService')).default;
      await verificationService.reviewVerification(id, decision, reviewedBy, rejectionReason);

      res.status(200).json({
        success: true,
        message: `Verification ${decision.toLowerCase()} successfully`
      });
    } catch (_error: any) {
      console.error('Error reviewing verification:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_REVIEW_ERROR',
          message: _error.message || 'Failed to review verification'
        }
      });
    }
  }

  async testDocumentAuthenticity(req: Request, res: Response) {
    try {
      const { imageBase64, documentType } = req.body;

      if (!imageBase64 || !documentType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'imageBase64 and documentType are required'
          }
        });
      }

      const verificationService = (await import('../services/verificationService')).default;
      const result = await verificationService.testDocumentAuthenticity(imageBase64, documentType);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (_error: any) {
      console.error('Error testing document authenticity:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOCUMENT_AUTHENTICITY_TEST_ERROR',
          message: 'Failed to test document authenticity'
        }
      });
    }
  }

  async testFacialRecognition(req: Request, res: Response) {
    try {
      const { selfieImageBase64, documentImageBase64 } = req.body;

      if (!selfieImageBase64 || !documentImageBase64) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'selfieImageBase64 and documentImageBase64 are required'
          }
        });
      }

      const verificationService = (await import('../services/verificationService')).default;
      const result = await verificationService.testFacialRecognition(selfieImageBase64, documentImageBase64);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (_error: any) {
      console.error('Error testing facial recognition:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FACIAL_RECOGNITION_TEST_ERROR',
          message: 'Failed to test facial recognition'
        }
      });
    }
  }

  async testOCRExtraction(req: Request, res: Response) {
    try {
      const { imageBase64, documentType } = req.body;

      if (!imageBase64 || !documentType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'imageBase64 and documentType are required'
          }
        });
      }

      const verificationService = (await import('../services/verificationService')).default;
      const result = await verificationService.testOCRExtraction(imageBase64, documentType);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (_error: any) {
      console.error('Error testing OCR extraction:', _error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OCR_EXTRACTION_TEST_ERROR',
          message: 'Failed to test OCR extraction'
        }
      });
    }
  }
}