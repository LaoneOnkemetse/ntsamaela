import { 
  VerificationDecision,
  RiskAssessment,
  DocumentAuthenticityResult,
  FacialRecognitionResult,
  OCRResult,
  DocumentType,
  UserType,
  VerificationConfig,
  VerificationWorkflow,
  VerificationStep,
  VerificationStepResult
} from '@shared/types';

export class DecisionEngineService {
  private config: VerificationConfig;
  private decisionRules: DecisionRule[];

  constructor(config?: VerificationConfig) {
    this.config = config || this.getDefaultConfig();
    this.decisionRules = this.initializeDecisionRules();
  }

  /**
   * Make automated verification decision
   */
  async makeDecision(
    riskAssessment: RiskAssessment,
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult,
    userType: UserType,
    documentType: DocumentType,
    workflow?: VerificationWorkflow
  ): Promise<VerificationDecision> {
    try {
      // Execute decision workflow
      const workflowResult = await this.executeDecisionWorkflow(
        riskAssessment,
        documentAuthenticity,
        facialRecognition,
        ocrResult,
        userType,
        documentType,
        workflow
      );

      // Apply decision rules
      const decision = await this.applyDecisionRules(workflowResult);

      // Calculate confidence
      const confidence = this.calculateDecisionConfidence(decision, riskAssessment);

      // Generate reasoning
      const reasoning = this.generateDecisionReasoning(decision, riskAssessment);

      // Determine next steps
      const nextSteps = this.determineNextSteps(decision, riskAssessment);

      return {
        decision: decision.decision,
        confidence,
        reasoning,
        automated: decision.automated,
        requiresManualReview: decision.requiresManualReview,
        nextSteps,
      };
    } catch (_error) {
      console.error('Decision engine service error:', _error);
      
      // Default to manual review on error
      return {
        decision: 'FLAG_FOR_REVIEW',
        confidence: 0,
        reasoning: ['Decision engine error occurred'],
        automated: false,
        requiresManualReview: true,
        nextSteps: ['Manual review required due to system error'],
      };
    }
  }

  /**
   * Execute decision workflow
   */
  private async executeDecisionWorkflow(
    riskAssessment: RiskAssessment,
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult,
    userType: UserType,
    documentType: DocumentType,
    workflow?: VerificationWorkflow
  ): Promise<WorkflowResult> {
    const steps = workflow?.steps || this.getDefaultWorkflowSteps(userType, documentType);
    const results: VerificationStepResult[] = [];

    for (const step of steps) {
      const stepResult = await this.executeStep(
        step,
        riskAssessment,
        documentAuthenticity,
        facialRecognition,
        ocrResult,
        userType,
        documentType
      );
      
      results.push(stepResult);

      // Stop workflow if critical step fails
      if (step.required && !stepResult.success) {
        break;
      }
    }

    return {
      steps: results,
      overallSuccess: results.every(r => r.success),
      criticalFailures: results.filter(r => !r.success && r.stepId.includes('CRITICAL')).length,
    };
  }

  /**
   * Execute individual workflow step
   */
  private async executeStep(
    step: VerificationStep,
    riskAssessment: RiskAssessment,
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult,
    userType: UserType,
    documentType: DocumentType
  ): Promise<VerificationStepResult> {
    const startTime = Date.now();

    try {
      let result: any;
      let success = false;

      switch (step.type) {
        case 'DOCUMENT_AUTHENTICITY':
          result = await this.evaluateDocumentAuthenticity(documentAuthenticity, documentType);
          success = result.passed;
          break;

        case 'OCR_EXTRACTION':
          result = await this.evaluateOCRResult(ocrResult, documentType);
          success = result.passed;
          break;

        case 'FACIAL_RECOGNITION':
          result = await this.evaluateFacialRecognition(facialRecognition, userType);
          success = result.passed;
          break;

        case 'RISK_ASSESSMENT':
          result = await this.evaluateRiskAssessment(riskAssessment);
          success = result.passed;
          break;

        case 'DECISION_ENGINE':
          result = await this.evaluateDecisionCriteria(
            riskAssessment,
            documentAuthenticity,
            facialRecognition,
            ocrResult,
            userType,
            documentType
          );
          success = result.passed;
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        stepId: step.id,
        success,
        result,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (_error) {
      return {
        stepId: step.id,
        success: false,
        result: null,
        error: _error instanceof Error ? _error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Apply decision rules to workflow result
   */
  private async applyDecisionRules(workflowResult: WorkflowResult): Promise<DecisionResult> {
    for (const rule of this.decisionRules) {
      const ruleResult = await rule.evaluate(workflowResult);
      if (ruleResult.applies) {
        return ruleResult.decision;
      }
    }

    // Default decision if no rules apply
    return {
      decision: 'FLAG_FOR_REVIEW',
      automated: false,
      requiresManualReview: true,
    };
  }

  /**
   * Calculate decision confidence
   */
  private calculateDecisionConfidence(
    decision: DecisionResult,
    riskAssessment: RiskAssessment
  ): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on risk level
    switch (riskAssessment.riskLevel) {
      case 'LOW':
        confidence += 0.3;
        break;
      case 'MEDIUM':
        confidence += 0.1;
        break;
      case 'HIGH':
        confidence -= 0.2;
        break;
      case 'CRITICAL':
        confidence -= 0.4;
        break;
    }

    // Adjust based on decision type
    if (decision.decision === 'APPROVE' && decision.automated) {
      confidence += 0.2;
    } else if (decision.decision === 'REJECT' && decision.automated) {
      confidence += 0.1;
    } else if (decision.requiresManualReview) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate decision reasoning
   */
  private generateDecisionReasoning(
    decision: DecisionResult,
    riskAssessment: RiskAssessment
  ): string[] {
    const reasoning: string[] = [];

    // Add risk-based reasoning
    reasoning.push(`Overall risk level: ${riskAssessment.riskLevel}`);
    
    if (riskAssessment.overallRisk > 0.8) {
      reasoning.push('High risk factors detected');
    } else if (riskAssessment.overallRisk > 0.5) {
      reasoning.push('Medium risk factors detected');
    } else {
      reasoning.push('Low risk factors detected');
    }

    // Add factor-specific reasoning
    riskAssessment.factors.forEach(factor => {
      if (factor.score > 0.7) {
        reasoning.push(`High risk in ${factor.category.toLowerCase()}: ${factor.description}`);
      }
    });

    // Add decision-specific reasoning
    switch (decision.decision) {
      case 'APPROVE':
        reasoning.push('All verification criteria met');
        reasoning.push('Risk level within acceptable limits');
        break;
      case 'REJECT':
        reasoning.push('Critical verification failures detected');
        reasoning.push('Risk level exceeds acceptable thresholds');
        break;
      case 'FLAG_FOR_REVIEW':
        reasoning.push('Manual review required due to risk factors');
        reasoning.push('Automated decision not possible');
        break;
    }

    return reasoning;
  }

  /**
   * Determine next steps
   */
  private determineNextSteps(
    decision: DecisionResult,
    riskAssessment: RiskAssessment
  ): string[] {
    const nextSteps: string[] = [];

    switch (decision.decision) {
      case 'APPROVE':
        nextSteps.push('Update user verification status');
        nextSteps.push('Send approval notification');
        nextSteps.push('Enable platform access');
        break;

      case 'REJECT':
        nextSteps.push('Update user verification status');
        nextSteps.push('Send rejection notification');
        nextSteps.push('Log rejection reason');
        nextSteps.push('Block platform access');
        break;

      case 'FLAG_FOR_REVIEW':
        nextSteps.push('Queue for manual review');
        nextSteps.push('Notify review team');
        nextSteps.push('Maintain pending status');
        break;
    }

    // Add risk-specific next steps
    if (riskAssessment.requiresManualReview) {
      nextSteps.push('Schedule manual review');
    }

    if (riskAssessment.riskLevel === 'CRITICAL') {
      nextSteps.push('Implement enhanced monitoring');
      nextSteps.push('Consider fraud investigation');
    }

    return nextSteps;
  }

  // Evaluation methods for different verification components

  private async evaluateDocumentAuthenticity(
    documentAuthenticity: DocumentAuthenticityResult,
    documentType: DocumentType
  ): Promise<{ passed: boolean; score: number; details: string }> {
    const config = this.config.documentTypes.find(dt => dt.type === documentType);
    const minConfidence = config ? 0.7 : 0.6;

    const passed = documentAuthenticity.isAuthentic && 
                   documentAuthenticity.confidence >= minConfidence &&
                   documentAuthenticity.anomalies.length === 0;

    return {
      passed,
      score: documentAuthenticity.confidence,
      details: `Document authenticity: ${passed ? 'PASSED' : 'FAILED'} (${documentAuthenticity.confidence.toFixed(2)})`,
    };
  }

  private async evaluateOCRResult(
    ocrResult: OCRResult,
    _documentType: DocumentType
  ): Promise<{ passed: boolean; score: number; details: string }> {
    const minConfidence = this.config.ocr.minConfidence;
    const passed = ocrResult.confidence >= minConfidence && ocrResult.errors.length === 0;

    return {
      passed,
      score: ocrResult.confidence,
      details: `OCR extraction: ${passed ? 'PASSED' : 'FAILED'} (${ocrResult.confidence.toFixed(2)})`,
    };
  }

  private async evaluateFacialRecognition(
    facialRecognition: FacialRecognitionResult,
    _userType: UserType
  ): Promise<{ passed: boolean; score: number; details: string }> {
    const minConfidence = this.config.facialRecognition.minConfidence;
    const passed = facialRecognition.match && 
                   facialRecognition.confidence >= minConfidence &&
                   facialRecognition.faceDetected &&
                   facialRecognition.faceQuality >= this.config.facialRecognition.faceQualityThreshold;

    return {
      passed,
      score: facialRecognition.confidence / 100,
      details: `Facial recognition: ${passed ? 'PASSED' : 'FAILED'} (${facialRecognition.confidence}%)`,
    };
  }

  private async evaluateRiskAssessment(
    riskAssessment: RiskAssessment
  ): Promise<{ passed: boolean; score: number; details: string }> {
    const maxRisk = this.config.riskThresholds.medium;
    const passed = riskAssessment.overallRisk <= maxRisk;

    return {
      passed,
      score: 1 - riskAssessment.overallRisk,
      details: `Risk assessment: ${passed ? 'PASSED' : 'FAILED'} (${riskAssessment.overallRisk.toFixed(2)})`,
    };
  }

  private async evaluateDecisionCriteria(
    riskAssessment: RiskAssessment,
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult,
    _userType: UserType,
    _documentType: DocumentType
  ): Promise<{ passed: boolean; score: number; details: string }> {
    // Comprehensive evaluation of all criteria
    const criteria = [
      documentAuthenticity.isAuthentic,
      facialRecognition.match,
      ocrResult.confidence >= this.config.ocr.minConfidence,
      riskAssessment.overallRisk <= this.config.riskThresholds.medium,
    ];

    const passedCount = criteria.filter(Boolean).length;
    const passed = passedCount >= 3; // At least 3 out of 4 criteria must pass

    return {
      passed,
      score: passedCount / criteria.length,
      details: `Decision criteria: ${passed ? 'PASSED' : 'FAILED'} (${passedCount}/${criteria.length})`,
    };
  }

  // Helper methods

  private getDefaultWorkflowSteps(_userType: UserType, _documentType: DocumentType): VerificationStep[] {
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
      {
        id: 'DECISION_ENGINE',
        name: 'Decision Engine',
        type: 'DECISION_ENGINE',
        required: true,
        timeout: 5000,
        retryCount: 1,
      },
    ];

    return steps;
  }

  private initializeDecisionRules(): DecisionRule[] {
    return [
      // Auto-approve rule
      new AutoApproveRule(),
      
      // Auto-reject rule
      new AutoRejectRule(),
      
      // Manual review rule
      new ManualReviewRule(),
      
      // Default rule
      new DefaultRule(),
    ];
  }

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
        region: 'us-east-1',
        rekognitionCollectionId: 'ntsamaela-verification',
        textractRoleArn: '',
        s3Bucket: 'ntsamaela-documents',
      },
    };
  }
}

// Decision rule classes

interface DecisionRule {
  evaluate(workflowResult: WorkflowResult): Promise<{ applies: boolean; decision: DecisionResult }>;
}

interface WorkflowResult {
  steps: VerificationStepResult[];
  overallSuccess: boolean;
  criticalFailures: number;
}

interface DecisionResult {
  decision: 'APPROVE' | 'REJECT' | 'FLAG_FOR_REVIEW';
  automated: boolean;
  requiresManualReview: boolean;
}

class AutoApproveRule implements DecisionRule {
  async evaluate(workflowResult: WorkflowResult): Promise<{ applies: boolean; decision: DecisionResult }> {
    const applies = workflowResult.overallSuccess && 
                   workflowResult.criticalFailures === 0 &&
                   workflowResult.steps.every(step => step.success);

    return {
      applies,
      decision: {
        decision: 'APPROVE',
        automated: true,
        requiresManualReview: false,
      },
    };
  }
}

class AutoRejectRule implements DecisionRule {
  async evaluate(workflowResult: WorkflowResult): Promise<{ applies: boolean; decision: DecisionResult }> {
    const applies = workflowResult.criticalFailures > 0 ||
                   !workflowResult.overallSuccess;

    return {
      applies,
      decision: {
        decision: 'REJECT',
        automated: true,
        requiresManualReview: false,
      },
    };
  }
}

class ManualReviewRule implements DecisionRule {
  async evaluate(workflowResult: WorkflowResult): Promise<{ applies: boolean; decision: DecisionResult }> {
    const applies = workflowResult.overallSuccess && 
                   workflowResult.criticalFailures === 0 &&
                   workflowResult.steps.some(step => !step.success);

    return {
      applies,
      decision: {
        decision: 'FLAG_FOR_REVIEW',
        automated: false,
        requiresManualReview: true,
      },
    };
  }
}

class DefaultRule implements DecisionRule {
  async evaluate(_workflowResult: WorkflowResult): Promise<{ applies: boolean; decision: DecisionResult }> {
    return {
      applies: true,
      decision: {
        decision: 'FLAG_FOR_REVIEW',
        automated: false,
        requiresManualReview: true,
      },
    };
  }
}

export default DecisionEngineService;
