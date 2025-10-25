import { 
  RiskAssessment, 
  RiskFactor, 
  DocumentAuthenticityResult,
  FacialRecognitionResult,
  OCRResult,
  DocumentType,
  UserType,
  ExtractedDocumentData
} from '@shared/types';

export class RiskScoringService {
  private riskWeights: Record<string, number>;
  private riskThresholds: Record<string, number>;

  constructor() {
    // Initialize risk factor weights
    this.riskWeights = {
      documentAuthenticity: 0.35,
      dataConsistency: 0.25,
      facialMatch: 0.25,
      behavioral: 0.10,
      technical: 0.05,
    };

    // Initialize risk thresholds
    this.riskThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9,
    };
  }

  /**
   * Calculate comprehensive risk assessment
   */
  async calculateRiskAssessment(
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult,
    userType: UserType,
    documentType: DocumentType,
    userHistory?: any
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    // Calculate document authenticity risk
    const authenticityRisk = this.calculateDocumentAuthenticityRisk(documentAuthenticity);
    factors.push(authenticityRisk);

    // Calculate data consistency risk
    const dataConsistencyRisk = this.calculateDataConsistencyRisk(ocrResult, userType, documentType);
    factors.push(dataConsistencyRisk);

    // Calculate facial match risk
    const facialMatchRisk = this.calculateFacialMatchRisk(facialRecognition);
    factors.push(facialMatchRisk);

    // Calculate behavioral risk
    const behavioralRisk = this.calculateBehavioralRisk(userHistory, userType);
    factors.push(behavioralRisk);

    // Calculate technical risk
    const technicalRisk = this.calculateTechnicalRisk(documentAuthenticity, facialRecognition, ocrResult);
    factors.push(technicalRisk);

    // Calculate overall risk score
    const overallRisk = this.calculateOverallRisk(factors);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallRisk);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, riskLevel);

    // Determine if manual review is required
    const requiresManualReview = this.requiresManualReview(overallRisk, factors);

    return {
      overallRisk,
      riskLevel,
      factors,
      recommendations,
      requiresManualReview,
    };
  }

  /**
   * Calculate document authenticity risk
   */
  private calculateDocumentAuthenticityRisk(
    documentAuthenticity: DocumentAuthenticityResult
  ): RiskFactor {
    let score = 0;
    const evidence: string[] = [];

    // Base score from authenticity confidence
    if (!documentAuthenticity.isAuthentic) {
      score += 0.8;
      evidence.push('Document authenticity check failed');
    } else {
      score += (1 - documentAuthenticity.confidence) * 0.6;
    }

    // Check for anomalies
    documentAuthenticity.anomalies.forEach(anomaly => {
      const severityMultiplier = {
        'LOW': 0.1,
        'MEDIUM': 0.3,
        'HIGH': 0.6,
        'CRITICAL': 0.9,
      };
      
      score += severityMultiplier[anomaly.severity] * anomaly.confidence;
      evidence.push(`${anomaly.type}: ${anomaly.description}`);
    });

    // Check security features
    const detectedFeatures = documentAuthenticity.securityFeatures.filter(f => f.detected);
    const totalFeatures = documentAuthenticity.securityFeatures.length;
    
    if (totalFeatures > 0) {
      const featureRatio = detectedFeatures.length / totalFeatures;
      if (featureRatio < 0.7) {
        score += 0.3;
        evidence.push('Insufficient security features detected');
      }
    }

    return {
      category: 'DOCUMENT_AUTHENTICITY',
      score: Math.min(1, score),
      weight: this.riskWeights.documentAuthenticity,
      description: 'Risk based on document authenticity analysis',
      evidence,
    };
  }

  /**
   * Calculate data consistency risk
   */
  private calculateDataConsistencyRisk(
    ocrResult: OCRResult,
    userType: UserType,
    documentType: DocumentType
  ): RiskFactor {
    let score = 0;
    const evidence: string[] = [];

    // Check OCR confidence
    if (ocrResult.confidence < 0.7) {
      score += 0.4;
      evidence.push('Low OCR confidence');
    }

    // Validate extracted data
    const validation = this.validateExtractedData(ocrResult.extractedData, documentType);
    if (!validation.isValid) {
      score += 0.5;
      evidence.push(...validation.errors);
    }

    // Check for data completeness
    const completenessScore = this.checkDataCompleteness(ocrResult.extractedData, documentType);
    if (completenessScore < 0.8) {
      score += 0.3;
      evidence.push('Incomplete document data');
    }

    // Check for data consistency with user type
    const consistencyScore = this.checkDataConsistency(ocrResult.extractedData, userType, documentType);
    if (consistencyScore < 0.7) {
      score += 0.4;
      evidence.push('Data inconsistent with user type requirements');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(ocrResult.extractedData);
    if (suspiciousPatterns.length > 0) {
      score += 0.3;
      evidence.push(...suspiciousPatterns);
    }

    return {
      category: 'DATA_CONSISTENCY',
      score: Math.min(1, score),
      weight: this.riskWeights.dataConsistency,
      description: 'Risk based on data extraction and validation',
      evidence,
    };
  }

  /**
   * Calculate facial match risk
   */
  private calculateFacialMatchRisk(
    facialRecognition: FacialRecognitionResult
  ): RiskFactor {
    let score = 0;
    const evidence: string[] = [];

    // Check if face was detected
    if (!facialRecognition.faceDetected) {
      score += 0.9;
      evidence.push('No face detected in images');
    } else {
      // Check facial match confidence
      if (!facialRecognition.match) {
        score += 0.8;
        evidence.push('Facial recognition match failed');
      } else {
        score += (1 - facialRecognition.confidence / 100) * 0.6;
      }

      // Check face quality
      if (facialRecognition.faceQuality < 0.6) {
        score += 0.3;
        evidence.push('Poor face quality in images');
      }

      // Check for sufficient landmarks
      if (facialRecognition.landmarks.length < 5) {
        score += 0.2;
        evidence.push('Insufficient facial landmarks detected');
      }
    }

    return {
      category: 'FACIAL_MATCH',
      score: Math.min(1, score),
      weight: this.riskWeights.facialMatch,
      description: 'Risk based on facial recognition analysis',
      evidence,
    };
  }

  /**
   * Calculate behavioral risk
   */
  private calculateBehavioralRisk(
    userHistory: any,
    _userType: UserType
  ): RiskFactor {
    let score = 0;
    const evidence: string[] = [];

    if (!userHistory) {
      // New user - moderate risk
      score += 0.3;
      evidence.push('New user with no verification history');
      return {
        category: 'BEHAVIORAL',
        score,
        weight: this.riskWeights.behavioral,
        description: 'Risk based on user behavior patterns',
        evidence,
      };
    }

    // Check verification history
    if (userHistory.previousVerifications) {
      const failedVerifications = userHistory.previousVerifications.filter(
        (v: any) => v.status === 'REJECTED'
      ).length;
      
      if (failedVerifications > 2) {
        score += 0.6;
        evidence.push('Multiple previous verification failures');
      } else if (failedVerifications > 0) {
        score += 0.3;
        evidence.push('Previous verification failures');
      }
    }

    // Check for rapid verification attempts
    if (userHistory.verificationAttempts) {
      const recentAttempts = userHistory.verificationAttempts.filter(
        (attempt: any) => {
          const attemptTime = new Date(attempt.timestamp);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return attemptTime > oneHourAgo;
        }
      ).length;

      if (recentAttempts > 3) {
        score += 0.5;
        evidence.push('Excessive verification attempts');
      }
    }

    // Check for suspicious patterns
    if (userHistory.suspiciousActivity) {
      score += 0.4;
      evidence.push('Suspicious activity detected');
    }

    return {
      category: 'BEHAVIORAL',
      score: Math.min(1, score),
      weight: this.riskWeights.behavioral,
      description: 'Risk based on user behavior patterns',
      evidence,
    };
  }

  /**
   * Calculate technical risk
   */
  private calculateTechnicalRisk(
    documentAuthenticity: DocumentAuthenticityResult,
    facialRecognition: FacialRecognitionResult,
    ocrResult: OCRResult
  ): RiskFactor {
    let score = 0;
    const evidence: string[] = [];

    // Check processing times
    if (facialRecognition.processingTime > 10000) { // 10 seconds
      score += 0.2;
      evidence.push('Slow facial recognition processing');
    }

    if (ocrResult.processingTime > 15000) { // 15 seconds
      score += 0.2;
      evidence.push('Slow OCR processing');
    }

    // Check for technical errors
    if (ocrResult.errors.length > 0) {
      score += 0.3;
      evidence.push('OCR processing errors');
    }

    // Check for low confidence across all services
    const avgConfidence = (
      documentAuthenticity.confidence +
      (facialRecognition.confidence / 100) +
      ocrResult.confidence
    ) / 3;

    if (avgConfidence < 0.6) {
      score += 0.4;
      evidence.push('Low confidence across all verification services');
    }

    return {
      category: 'TECHNICAL',
      score: Math.min(1, score),
      weight: this.riskWeights.technical,
      description: 'Risk based on technical processing quality',
      evidence,
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine risk level
   */
  public determineRiskLevel(overallRisk: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (overallRisk <= this.riskThresholds.low) {
      return 'LOW';
    } else if (overallRisk <= this.riskThresholds.medium) {
      return 'MEDIUM';
    } else if (overallRisk <= this.riskThresholds.high) {
      return 'HIGH';
    } else {
      return 'CRITICAL';
    }
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(
    factors: RiskFactor[],
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): string[] {
    const recommendations: string[] = [];

    // Risk level specific recommendations
    switch (riskLevel) {
      case 'LOW':
        recommendations.push('Verification can proceed automatically');
        break;
      case 'MEDIUM':
        recommendations.push('Consider additional verification steps');
        recommendations.push('Monitor for suspicious activity');
        break;
      case 'HIGH':
        recommendations.push('Manual review required');
        recommendations.push('Request additional documentation');
        recommendations.push('Enhanced monitoring recommended');
        break;
      case 'CRITICAL':
        recommendations.push('Immediate manual review required');
        recommendations.push('Consider blocking verification');
        recommendations.push('Investigate for fraud');
        break;
    }

    // Factor-specific recommendations
    factors.forEach(factor => {
      if (factor.score > 0.7) {
        switch (factor.category) {
          case 'DOCUMENT_AUTHENTICITY':
            recommendations.push('Request new document images');
            recommendations.push('Verify document authenticity manually');
            break;
          case 'DATA_CONSISTENCY':
            recommendations.push('Verify extracted data manually');
            recommendations.push('Request document re-upload');
            break;
          case 'FACIAL_MATCH':
            recommendations.push('Request new selfie image');
            recommendations.push('Verify identity manually');
            break;
          case 'BEHAVIORAL':
            recommendations.push('Review user history');
            recommendations.push('Implement additional security measures');
            break;
          case 'TECHNICAL':
            recommendations.push('Retry verification process');
            recommendations.push('Check system performance');
            break;
        }
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Determine if manual review is required
   */
  private requiresManualReview(
    overallRisk: number,
    factors: RiskFactor[]
  ): boolean {
    // Always require manual review for high/critical risk
    if (overallRisk >= this.riskThresholds.high) {
      return true;
    }

    // Require manual review if any critical factor is high
    const criticalFactors = factors.filter(f => f.score > 0.8);
    if (criticalFactors.length > 0) {
      return true;
    }

    // Require manual review if multiple factors are medium-high
    const mediumHighFactors = factors.filter(f => f.score > 0.6);
    if (mediumHighFactors.length >= 3) {
      return true;
    }

    return false;
  }

  // Helper methods

  private validateExtractedData(
    data: ExtractedDocumentData,
    documentType: DocumentType
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.documentNumber) errors.push('Document number missing');
    if (!data.firstName) errors.push('First name missing');
    if (!data.lastName) errors.push('Last name missing');
    if (!data.dateOfBirth) errors.push('Date of birth missing');

    // Document type specific validation
    if (documentType === 'DRIVERS_LICENSE' && !data.expiryDate) {
      errors.push('Expiry date missing for driver license');
    }

    if (documentType === 'PASSPORT' && !data.nationality) {
      errors.push('Nationality missing for passport');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private checkDataCompleteness(
    data: ExtractedDocumentData,
    documentType: DocumentType
  ): number {
    const requiredFields = ['documentNumber', 'firstName', 'lastName', 'dateOfBirth'];
    
    if (documentType === 'DRIVERS_LICENSE') {
      requiredFields.push('expiryDate');
    }
    
    if (documentType === 'PASSPORT') {
      requiredFields.push('nationality', 'expiryDate');
    }

    const presentFields = requiredFields.filter(field => data[field as keyof ExtractedDocumentData]);
    return presentFields.length / requiredFields.length;
  }

  private checkDataConsistency(
    data: ExtractedDocumentData,
    userType: UserType,
    documentType: DocumentType
  ): number {
    let score = 1.0;

    // Drivers must have driver's license
    if (userType === 'DRIVER' && documentType !== 'DRIVERS_LICENSE') {
      score -= 0.5;
    }

    // Check age consistency
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (userType === 'DRIVER' && age < 18) {
        score -= 0.3;
      }
    }

    return Math.max(0, score);
  }

  private detectSuspiciousPatterns(data: ExtractedDocumentData): string[] {
    const patterns: string[] = [];

    // Check for suspicious document numbers
    if (data.documentNumber) {
      if (data.documentNumber.length < 5) {
        patterns.push('Suspiciously short document number');
      }
      
      if (/^(\d)\1+$/.test(data.documentNumber)) {
        patterns.push('Document number contains repeated digits');
      }
    }

    // Check for suspicious names
    if (data.firstName && data.firstName.length < 2) {
      patterns.push('Suspiciously short first name');
    }

    if (data.lastName && data.lastName.length < 2) {
      patterns.push('Suspiciously short last name');
    }

    return patterns;
  }

  private calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Update risk weights (for configuration)
   */
  updateRiskWeights(weights: Record<string, number>): void {
    this.riskWeights = { ...this.riskWeights, ...weights };
  }

  /**
   * Update risk thresholds (for configuration)
   */
  updateRiskThresholds(thresholds: Record<string, number>): void {
    this.riskThresholds = { ...this.riskThresholds, ...thresholds };
  }

  /**
   * Get current risk configuration
   */
  getRiskConfiguration(): {
    weights: Record<string, number>;
    thresholds: Record<string, number>;
  } {
    return {
      weights: { ...this.riskWeights },
      thresholds: { ...this.riskThresholds },
    };
  }
}

export default RiskScoringService;
