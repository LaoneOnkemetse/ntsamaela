import { getPrismaClient } from '@database/index';
import AWSRekognitionService from './awsRekognitionService';
import OCRService from './ocrService';
import FacialRecognitionService from './facialRecognitionService';
import RiskScoringService from './riskScoringService';
import DecisionEngineService from './decisionEngineService';
import {
  DocumentVerificationRequest,
  VerificationResult,
  DocumentAuthenticityResult,
  FacialRecognitionResult,
  OCRResult,
  RiskAssessment,
  VerificationDecision,
  DocumentType,
  UserType,
  Verification,
  VerificationWorkflow,
  VerificationStep,
  VerificationStepResult,
  VerificationConfig,
  VerificationMetrics,
  // VerificationAuditLog
} from '@shared/types';

export class VerificationService {
  private awsRekognition: AWSRekognitionService;
  private ocrService: OCRService;
  private facialRecognition: FacialRecognitionService;
  private riskScoring: RiskScoringService;
  private decisionEngine: DecisionEngineService;
  private config: VerificationConfig;

  constructor() {
    this.awsRekognition = new AWSRekognitionService();
    this.ocrService = new OCRService();
    this.facialRecognition = new FacialRecognitionService();
    this.riskScoring = new RiskScoringService();
    this.decisionEngine = new DecisionEngineService();
    this.config = this.getDefaultConfig();
  }

  /**
   * Process document verification request
   */
  async processVerification(request: DocumentVerificationRequest): Promise<VerificationResult> {
    const startTime = Date.now();
    let verificationId: string | null = null;

    try {
      // Create verification record
      verificationId = await this.createVerificationRecord(request);

      // Log verification start
      await this.logVerificationAction(verificationId, 'SUBMITTED', request.userId);

      // Execute verification workflow
      const workflow = this.createVerificationWorkflow(request.userType, request.documentType);
      const workflowResult = await this.executeVerificationWorkflow(
        request,
        workflow,
        verificationId
      );

      // Make decision
      const decision = await this.decisionEngine.makeDecision(
        workflowResult.riskAssessment,
        workflowResult.documentAuthenticity,
        workflowResult.facialRecognition,
        workflowResult.ocrResult,
        request.userType,
        request.documentType,
        workflow
      );

      // Update verification record with results
      await this.updateVerificationRecord(verificationId, decision, workflowResult);

      // Log verification completion
      await this.logVerificationAction(
        verificationId,
        decision.decision === 'APPROVE' ? 'APPROVED' : 
        decision.decision === 'REJECT' ? 'REJECTED' : 'FLAGGED',
        request.userId
      );

      // Update user verification status if approved
      if (decision.decision === 'APPROVE') {
        await this.updateUserVerificationStatus(request.userId, true);
      }

      const _processingTime = Date.now() - startTime;

      return {
        success: decision.decision === 'APPROVE',
        riskScore: workflowResult.riskAssessment.overallRisk,
        authenticityScore: workflowResult.documentAuthenticity.confidence,
        dataValidationScore: workflowResult.ocrResult.confidence,
        facialMatchScore: workflowResult.facialRecognition.confidence / 100,
        status: decision.decision === 'APPROVE' ? 'APPROVED' : decision.decision === 'REJECT' ? 'REJECTED' : 'FLAGGED',
        message: decision.reasoning.join('; '),
      };
    } catch (_error) {
      // Log error in non-test environments only
      if (process.env.NODE_ENV !== 'test') {
        console.error('Verification workflow failed:', _error);
      }
      
      if (verificationId) {
        await this.logVerificationAction(verificationId, 'FAILED', request.userId, {
          error: _error instanceof Error ? _error.message : 'Unknown error',
        });
      }

      return {
        success: false,
        riskScore: 1.0,
        authenticityScore: 0,
        dataValidationScore: 0,
        facialMatchScore: 0,
        status: 'REJECTED',
        message: `Verification failed: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute verification workflow
   */
  private async executeVerificationWorkflow(
    request: DocumentVerificationRequest,
    workflow: VerificationWorkflow,
    _verificationId: string
  ): Promise<{
    documentAuthenticity: DocumentAuthenticityResult;
    facialRecognition: FacialRecognitionResult;
    ocrResult: OCRResult;
    riskAssessment: RiskAssessment;
  }> {
    const results: VerificationStepResult[] = [];
    let documentAuthenticity: DocumentAuthenticityResult | null = null;
    let facialRecognition: FacialRecognitionResult | null = null;
    let ocrResult: OCRResult | null = null;
    let riskAssessment: RiskAssessment | null = null;

    // Execute steps in parallel where possible
    const stepPromises = workflow.steps.map(async (step) => {
      const startTime = Date.now();
      
      try {
        let result: any;
        let success = false;

        switch (step.type) {
          case 'DOCUMENT_AUTHENTICITY':
            if (!documentAuthenticity) {
              documentAuthenticity = await this.awsRekognition.analyzeDocumentAuthenticity(
                request.frontImageBase64,
                request.documentType
              );
            }
            result = documentAuthenticity;
            success = documentAuthenticity.isAuthentic && documentAuthenticity.confidence >= 0.7;
            break;

          case 'OCR_EXTRACTION':
            if (!ocrResult) {
              ocrResult = await this.ocrService.extractDocumentData(
                request.frontImageBase64,
                request.documentType
              );
            }
            result = ocrResult;
            success = ocrResult.confidence >= 0.7 && ocrResult.errors.length === 0;
            break;

          case 'FACIAL_RECOGNITION':
            if (!facialRecognition) {
              facialRecognition = await this.facialRecognition.performFacialRecognition(
                request.frontImageBase64,
                request.selfieImageBase64,
                request.userId,
                request.documentType
              );
            }
            result = facialRecognition;
            success = facialRecognition.match && facialRecognition.confidence >= 80;
            break;

          case 'RISK_ASSESSMENT': {
            if (!documentAuthenticity || !facialRecognition || !ocrResult) {
              throw new Error('Required verification results not available for risk assessment');
            }
            
            const userHistory = await this.getUserVerificationHistory(request.userId);
            riskAssessment = await this.riskScoring.calculateRiskAssessment(
              documentAuthenticity,
              facialRecognition,
              ocrResult,
              request.userType,
              request.documentType,
              userHistory
            );
            result = riskAssessment;
            success = riskAssessment.overallRisk <= 0.6;
            break;
          }

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        const stepResult: VerificationStepResult = {
          stepId: step.id,
          success,
          result,
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
        };

        results.push(stepResult);
        return stepResult;
      } catch (_error) {
        const stepResult: VerificationStepResult = {
          stepId: step.id,
          success: false,
          result: null,
          error: _error instanceof Error ? _error.message : 'Unknown error',
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
        };

        results.push(stepResult);
        return stepResult;
      }
    });

    // Wait for all steps to complete
    await Promise.all(stepPromises);

    // Ensure all required results are available
    if (!documentAuthenticity || !facialRecognition || !ocrResult || !riskAssessment) {
      throw new Error('Failed to complete all verification steps');
    }

    return {
      documentAuthenticity,
      facialRecognition,
      ocrResult,
      riskAssessment,
    };
  }

  /**
   * Create verification workflow
   */
  private createVerificationWorkflow(_userType: UserType, _documentType: DocumentType): VerificationWorkflow {
    const steps: VerificationStep[] = [
      {
        id: 'DOC_AUTH_CRITICAL',
        name: 'Document Authenticity Check',
        type: 'DOCUMENT_AUTHENTICITY',
        required: true,
        timeout: 30000,
        retryCount: 2,
      },
      {
        id: 'OCR_EXTRACTION',
        name: 'OCR Data Extraction',
        type: 'OCR_EXTRACTION',
        required: true,
        timeout: 45000,
        retryCount: 2,
      },
      {
        id: 'FACIAL_RECOGNITION',
        name: 'Facial Recognition',
        type: 'FACIAL_RECOGNITION',
        required: true,
        timeout: 30000,
        retryCount: 2,
      },
      {
        id: 'RISK_ASSESSMENT',
        name: 'Risk Assessment',
        type: 'RISK_ASSESSMENT',
        required: true,
        timeout: 10000,
        retryCount: 1,
      },
    ];

    return {
      steps,
      currentStep: 0,
      status: 'PENDING',
      results: [],
    };
  }

  /**
   * Create verification record in database
   */
  private async createVerificationRecord(request: DocumentVerificationRequest): Promise<string> {
    const prisma = getPrismaClient();
    
    const verification = await prisma.verification.create({
      data: {
        userId: request.userId,
        documentType: request.documentType,
        frontImageUrl: await this.uploadImage(request.frontImageBase64, 'front'),
        backImageUrl: request.backImageBase64 ? 
          await this.uploadImage(request.backImageBase64, 'back') : null,
        selfieImageUrl: await this.uploadImage(request.selfieImageBase64, 'selfie'),
        status: 'PENDING',
      },
    });

    return verification.id;
  }

  /**
   * Update verification record with results
   */
  private async updateVerificationRecord(
    verificationId: string,
    decision: VerificationDecision,
    workflowResult: any
  ): Promise<void> {
    const prisma = getPrismaClient();
    
    const status = decision.decision === 'APPROVE' ? 'APPROVED' :
                  decision.decision === 'REJECT' ? 'REJECTED' : 'FLAGGED';

    await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status,
        riskScore: workflowResult.riskAssessment.overallRisk,
        authenticityScore: workflowResult.documentAuthenticity.confidence,
        dataValidationScore: workflowResult.ocrResult.confidence,
        facialMatchScore: workflowResult.facialRecognition.confidence / 100,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Update user verification status
   */
  private async updateUserVerificationStatus(userId: string, verified: boolean): Promise<void> {
    const prisma = getPrismaClient();
    
    await prisma.user.update({
      where: { id: userId },
      data: { identityVerified: verified },
    });
  }

  /**
   * Get user verification history
   */
  private async getUserVerificationHistory(userId: string): Promise<any> {
    const prisma = getPrismaClient();
    
    const verifications = await prisma.verification.findMany({
        where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      });

      return {
      previousVerifications: verifications,
      verificationAttempts: verifications.map((v: any) => ({
        timestamp: v.createdAt,
        status: v.status,
      })),
      suspiciousActivity: false, // TODO: Implement suspicious activity detection
    };
  }

  /**
   * Upload image to storage
   */
  private async uploadImage(imageBase64: string, type: string): Promise<string> {
    // TODO: Implement actual image upload to S3 or other storage
    // For now, return a placeholder URL
    return `https://storage.example.com/verification/${Date.now()}-${type}.jpg`;
  }

  /**
   * Log verification action
   */
  private async logVerificationAction(
    verificationId: string,
    action: string,
    performedBy: string,
    details?: any
  ): Promise<void> {
    const prisma = getPrismaClient();
    
    await prisma.verificationAuditLog.create({
      data: {
        verificationId,
        action,
        performedBy,
        details: details || {},
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get verification metrics
   */
  async getVerificationMetrics(): Promise<VerificationMetrics> {
    const prisma = getPrismaClient();
    
    const totalVerifications = await prisma.verification.count();
    const approvedCount = await prisma.verification.count({
      where: { status: 'APPROVED' },
    });
    const rejectedCount = await prisma.verification.count({
      where: { status: 'REJECTED' },
    });
    const flaggedCount = await prisma.verification.count({
      where: { status: 'FLAGGED' },
    });

    // Calculate average processing time
    const verifications = await prisma.verification.findMany({
      select: { createdAt: true, reviewedAt: true },
    });

    const processingTimes = verifications
      .filter((v: any) => v.reviewedAt)
      .map((v: any) => v.reviewedAt!.getTime() - v.createdAt.getTime());

    const averageProcessingTime = processingTimes.length > 0 ?
      processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length : 0;

    const successRate = totalVerifications > 0 ? approvedCount / totalVerifications : 0;
    const accuracyRate = totalVerifications > 0 ? (approvedCount + rejectedCount) / totalVerifications : 0;

      return {
      totalVerifications,
      approvedCount,
      rejectedCount,
      flaggedCount,
      averageProcessingTime,
      successRate,
      accuracyRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(verificationId: string): Promise<Verification | null> {
    const prisma = getPrismaClient();
    
    return await prisma.verification.findUnique({
      where: { id: verificationId },
    });
  }

  /**
   * Get user verifications
   */
  async getUserVerifications(userId: string): Promise<Verification[]> {
    const prisma = getPrismaClient();
    
    return await prisma.verification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Manual review verification
   */
  async reviewVerification(
    verificationId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    const prisma = getPrismaClient();
    
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: decision,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: decision === 'REJECTED' ? rejectionReason : null,
      },
    });

    // Update user verification status if approved
    if (decision === 'APPROVED') {
      await this.updateUserVerificationStatus(verification.userId, true);
    }

    // Log review action
    await this.logVerificationAction(verificationId, 'MANUAL_REVIEW', reviewedBy, {
      decision,
      rejectionReason,
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): VerificationConfig {
    return {
      documentTypes: [
        {
          type: 'DRIVERS_LICENSE',
          requiredForUserTypes: ['DRIVER'],
          requiresBackImage: true,
          securityFeatures: ['hologram', 'microprint', 'watermark'],
          validationRules: [
            { field: 'documentNumber', required: true, pattern: '^[A-Z0-9]{8,12}$' },
            { field: 'expiryDate', required: true },
          ],
        },
        {
          type: 'PASSPORT',
          requiredForUserTypes: ['CUSTOMER'],
          requiresBackImage: false,
          securityFeatures: ['chip', 'hologram', 'watermark'],
          validationRules: [
            { field: 'documentNumber', required: true, pattern: '^[A-Z]{1,2}[0-9]{6,9}$' },
            { field: 'nationality', required: true },
          ],
        },
        {
          type: 'NATIONAL_ID',
          requiredForUserTypes: ['CUSTOMER'],
          requiresBackImage: false,
          securityFeatures: ['hologram', 'microprint'],
          validationRules: [
            { field: 'documentNumber', required: true },
            { field: 'dateOfBirth', required: true },
          ],
        },
      ],
      riskThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9,
      },
      facialRecognition: {
        minConfidence: 80,
        maxProcessingTime: 30000,
        faceQualityThreshold: 0.6,
        landmarkDetectionRequired: true,
      },
      ocr: {
        minConfidence: 0.7,
        maxProcessingTime: 45000,
        supportedLanguages: ['en'],
        customFields: [],
      },
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        rekognitionCollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID || 'ntsamaela-verification',
        textractRoleArn: process.env.AWS_TEXTRACT_ROLE_ARN || '',
        s3Bucket: process.env.AWS_S3_BUCKET || 'ntsamaela-documents',
      },
    };
  }
}

export default VerificationService;
