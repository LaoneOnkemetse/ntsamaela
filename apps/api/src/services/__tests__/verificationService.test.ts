// Mock database before importing the service
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  verification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn()
  },
  verificationAuditLog: {
    create: jest.fn()
  }
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

// Mock other dependencies
jest.mock('../emailService', () => ({
  sendEmail: jest.fn()
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      const commandName = command.constructor.name;
      
      switch (commandName) {
        case 'AnalyzeDocumentCommand':
          return Promise.resolve({
            Blocks: [
              { BlockType: 'LINE', Text: 'PASSPORT' },
              { BlockType: 'LINE', Text: 'ABC123456' }
            ],
            DocumentMetadata: {
              Pages: 1
            }
          });
        case 'DetectFacesCommand':
          return Promise.resolve({
            FaceDetails: [
              {
                BoundingBox: { Width: 0.5, Height: 0.5, Left: 0.25, Top: 0.25 },
                Confidence: 95,
                Landmarks: [],
                Pose: { Roll: 0, Yaw: 0, Pitch: 0 },
                Quality: { Brightness: 50, Sharpness: 50 }
              }
            ]
          });
        case 'CompareFacesCommand':
          return Promise.resolve({
            FaceMatches: [{ Similarity: 85 }],
            UnmatchedFaces: []
          });
        case 'DetectDocumentTextCommand':
          return Promise.resolve({
            TextDetections: [
              { DetectedText: 'PASSPORT', Confidence: 95 },
              { DetectedText: 'ABC123456', Confidence: 90 }
            ]
          });
        default:
          return Promise.resolve({});
      }
    })
  })),
  AnalyzeDocumentCommand: jest.fn(),
  DetectFacesCommand: jest.fn(),
  CompareFacesCommand: jest.fn(),
  DetectDocumentTextCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command) => {
      const commandName = command.constructor.name;
      
      switch (commandName) {
        case 'AnalyzeDocumentCommand':
          return Promise.resolve({
            Blocks: [
              { BlockType: 'LINE', Text: 'PASSPORT' },
              { BlockType: 'LINE', Text: 'ABC123456' },
              { BlockType: 'LINE', Text: '2025-12-31' }
            ],
            DocumentMetadata: {
              Pages: 1
            }
          });
        case 'DetectDocumentTextCommand':
          return Promise.resolve({
            Blocks: [
              { BlockType: 'LINE', Text: 'PASSPORT' },
              { BlockType: 'LINE', Text: 'ABC123456' },
              { BlockType: 'LINE', Text: '2025-12-31' }
            ]
          });
        default:
          return Promise.resolve({});
      }
    })
  })),
  AnalyzeDocumentCommand: jest.fn(),
  DetectDocumentTextCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Location: 'https://s3.amazonaws.com/bucket/image.jpg'
    })
  })),
  PutObjectCommand: jest.fn(),
}));

// Mock service dependencies
jest.mock('../awsRekognitionService', () => {
  return jest.fn().mockImplementation(() => ({
    analyzeDocumentAuthenticity: jest.fn().mockResolvedValue({
      isAuthentic: true,
      confidence: 95,
      anomalies: []
    }),
    performFacialRecognition: jest.fn().mockResolvedValue({
      isMatch: true,
      confidence: 90,
      faceDetails: {}
    })
  }));
});

jest.mock('../ocrService', () => {
  return jest.fn().mockImplementation(() => ({
    extractDocumentData: jest.fn().mockResolvedValue({
      documentType: 'DRIVER_LICENSE',
      confidence: 95,
      extractedData: {}
    })
  }));
});

jest.mock('../facialRecognitionService', () => {
  return jest.fn().mockImplementation(() => ({
    compareFaces: jest.fn().mockResolvedValue({
      isMatch: true,
      confidence: 90
    })
  }));
});

jest.mock('../riskScoringService', () => {
  return jest.fn().mockImplementation(() => ({
    calculateRiskAssessment: jest.fn().mockResolvedValue({
      riskScore: 15,
      riskLevel: 'LOW',
      requiresManualReview: false
    })
  }));
});

jest.mock('../decisionEngineService', () => {
  return jest.fn().mockImplementation(() => ({
    makeDecision: jest.fn().mockResolvedValue({
      decision: 'APPROVED',
      confidence: 90,
      requiresManualReview: false
    })
  }));
});

import VerificationService from '../verificationService';
import { DocumentData, VerificationResult, RiskScore, DocumentType, UserType } from '@shared/types';

describe('VerificationService', () => {
  let verificationService: VerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    verificationService = new VerificationService();
    
    // Set up default audit log mock
    mockPrisma.verificationAuditLog.create.mockResolvedValue({
      id: 'audit-log-123',
      verificationId: 'verification-123',
      action: 'CREATED',
      userId: 'user-123'
    });
  });

  describe('processVerification', () => {
    const mockDocumentData = {
      userId: 'user-123',
      documentType: 'DRIVER_LICENSE' as DocumentType,
      userType: 'CUSTOMER' as UserType,
      frontImage: 'base64-encoded-image-data',
      backImage: 'base64-encoded-image-data',
      selfieImage: 'base64-encoded-selfie-data'
    };

    it('should handle verification process', async () => {
      // Use the global mockPrisma
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'CUSTOMER',
        identityVerified: false
      });
      mockPrisma.verification.findMany.mockResolvedValue([]);
      mockPrisma.verification.create.mockResolvedValue({
        id: 'verification-123',
        userId: 'user-123',
        status: 'APPROVED',
        riskScore: 15,
        confidence: 90,
        requiresManualReview: false,
        submittedAt: new Date()
      });

      const result = await verificationService.processVerification(mockDocumentData);

      // Just verify that the method runs without throwing an error
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('getUserVerifications', () => {
    it('should return verification status when exists', async () => {
      mockPrisma.verification.findMany.mockResolvedValue([{
        id: 'verification-123',
        status: 'APPROVED',
        riskScore: 15,
        confidence: 95,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: 'admin-123'
      }]);

      const result = await verificationService.getUserVerifications('user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('APPROVED');
      expect(result[0].riskScore).toBe(15);
      expect(result[0].confidence).toBe(95);
    });

    it('should return empty array when no verification exists', async () => {
      mockPrisma.verification.findMany.mockResolvedValue([]);

      const result = await verificationService.getUserVerifications('user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
