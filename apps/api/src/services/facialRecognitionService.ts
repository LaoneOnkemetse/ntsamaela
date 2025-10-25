import { 
  FacialRecognitionResult, 
  FaceLandmark, 
  DocumentType 
} from '@shared/types';
import AWSRekognitionService from './awsRekognitionService';

export class FacialRecognitionService {
  private awsRekognition: AWSRekognitionService;

  constructor() {
    this.awsRekognition = new AWSRekognitionService();
  }

  /**
   * Perform facial recognition between document and selfie
   */
  async performFacialRecognition(
    documentImageBase64: string,
    selfieImageBase64: string,
    userId: string,
    documentType: DocumentType
  ): Promise<FacialRecognitionResult> {
    try {
      const startTime = Date.now();

      // Use AWS Rekognition for facial recognition
      const result = await this.awsRekognition.performFacialRecognition(
        documentImageBase64,
        selfieImageBase64,
        userId
      );

      // Perform additional liveness detection
      const livenessResult = await this.awsRekognition.analyzeFaceLiveness(selfieImageBase64);

      // Enhance result with liveness information
      const enhancedResult: FacialRecognitionResult = {
        ...result,
        liveness: livenessResult.isLive,
        livenessConfidence: livenessResult.confidence,
        spoofingIndicators: livenessResult.spoofingIndicators,
        processingTime: Date.now() - startTime,
      };

      // Adjust confidence based on liveness detection
      if (!livenessResult.isLive) {
        enhancedResult.confidence = Math.max(0, enhancedResult.confidence - 20);
        enhancedResult.match = false;
      }

      return enhancedResult;
    } catch (error) {
      console.error('Facial recognition service error:', error);
      throw new Error(`Facial recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze face quality in document
   */
  async analyzeDocumentFaceQuality(imageBase64: string): Promise<{
    quality: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Use AWS Rekognition to detect faces
      const result = await this.awsRekognition.performFacialRecognition(
        imageBase64,
        imageBase64, // Compare with itself for quality analysis
        'quality-check'
      );

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check face quality
      if (result.faceQuality < 0.6) {
        issues.push('Poor face quality detected');
        recommendations.push('Ensure good lighting and clear image');
      }

      // Check if face is detected
      if (!result.faceDetected) {
        issues.push('No face detected in document');
        recommendations.push('Ensure face is clearly visible in document photo');
      }

      // Check landmarks
      if (result.landmarks.length < 5) {
        issues.push('Insufficient facial landmarks detected');
        recommendations.push('Ensure face is positioned correctly and clearly visible');
      }

      return {
        quality: result.faceQuality,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Face quality analysis error:', error);
      return {
        quality: 0,
        issues: ['Analysis failed'],
        recommendations: ['Retry with better image quality'],
      };
    }
  }

  /**
   * Analyze selfie quality
   */
  async analyzeSelfieQuality(imageBase64: string): Promise<{
    quality: number;
    liveness: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      // Perform liveness detection
      const livenessResult = await this.awsRekognition.analyzeFaceLiveness(imageBase64);

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check liveness
      if (!livenessResult.isLive) {
        issues.push('Liveness detection failed');
        recommendations.push('Ensure you are taking a live selfie, not a photo of a photo');
      }

      // Check spoofing indicators
      if (livenessResult.spoofingIndicators.length > 0) {
        issues.push(...livenessResult.spoofingIndicators);
        recommendations.push('Ensure good lighting and natural positioning');
      }

      // Analyze face quality
      const qualityResult = await this.analyzeDocumentFaceQuality(imageBase64);
      issues.push(...qualityResult.issues);
      recommendations.push(...qualityResult.recommendations);

      return {
        quality: qualityResult.quality,
        liveness: livenessResult.isLive,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Selfie quality analysis error:', error);
      return {
        quality: 0,
        liveness: false,
        issues: ['Analysis failed'],
        recommendations: ['Retry with better image quality'],
      };
    }
  }

  /**
   * Compare multiple faces for consistency
   */
  async compareMultipleFaces(
    faces: Array<{
      imageBase64: string;
      type: 'document' | 'selfie';
      timestamp: Date;
    }>
  ): Promise<{
    consistency: number;
    matches: Array<{
      face1: number;
      face2: number;
      confidence: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const matches: Array<{
        face1: number;
        face2: number;
        confidence: number;
      }> = [];

      // Compare all pairs of faces
      for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
          const result = await this.awsRekognition.performFacialRecognition(
            faces[i].imageBase64,
            faces[j].imageBase64,
            'comparison'
          );

          matches.push({
            face1: i,
            face2: j,
            confidence: result.confidence,
          });
        }
      }

      // Calculate consistency score
      const avgConfidence = matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length;
      const consistency = avgConfidence / 100; // Convert to 0-1 scale

      const recommendations: string[] = [];
      if (consistency < 0.7) {
        recommendations.push('Face consistency is low - consider retaking photos');
      }
      if (matches.some(match => match.confidence < 70)) {
        recommendations.push('Some face comparisons show low confidence');
      }

      return {
        consistency,
        matches,
        recommendations,
      };
    } catch (error) {
      console.error('Multiple face comparison error:', error);
      return {
        consistency: 0,
        matches: [],
        recommendations: ['Face comparison failed'],
      };
    }
  }

  /**
   * Extract facial features for biometric analysis
   */
  async extractFacialFeatures(imageBase64: string): Promise<{
    features: {
      eyeDistance: number;
      noseWidth: number;
      mouthWidth: number;
      faceWidth: number;
      faceHeight: number;
    };
    landmarks: FaceLandmark[];
    quality: number;
  }> {
    try {
      const result = await this.awsRekognition.performFacialRecognition(
        imageBase64,
        imageBase64,
        'feature-extraction'
      );

      // Calculate facial features from landmarks
      const features = this.calculateFacialFeatures(result.landmarks);

      return {
        features,
        landmarks: result.landmarks,
        quality: result.faceQuality,
      };
    } catch (error) {
      console.error('Facial feature extraction error:', error);
      return {
        features: {
          eyeDistance: 0,
          noseWidth: 0,
          mouthWidth: 0,
          faceWidth: 0,
          faceHeight: 0,
        },
        landmarks: [],
        quality: 0,
      };
    }
  }

  /**
   * Calculate facial features from landmarks
   */
  private calculateFacialFeatures(landmarks: FaceLandmark[]): {
    eyeDistance: number;
    noseWidth: number;
    mouthWidth: number;
    faceWidth: number;
    faceHeight: number;
  } {
    const eyeLandmarks = landmarks.filter(l => l.type === 'EYE');
    const noseLandmarks = landmarks.filter(l => l.type === 'NOSE');
    const mouthLandmarks = landmarks.filter(l => l.type === 'MOUTH');

    // Calculate eye distance
    let eyeDistance = 0;
    if (eyeLandmarks.length >= 2) {
      const leftEye = eyeLandmarks[0];
      const rightEye = eyeLandmarks[1];
      eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
      );
    }

    // Calculate nose width
    let noseWidth = 0;
    if (noseLandmarks.length >= 2) {
      const leftNostril = noseLandmarks[0];
      const rightNostril = noseLandmarks[1];
      noseWidth = Math.sqrt(
        Math.pow(rightNostril.x - leftNostril.x, 2) + Math.pow(rightNostril.y - leftNostril.y, 2)
      );
    }

    // Calculate mouth width
    let mouthWidth = 0;
    if (mouthLandmarks.length >= 2) {
      const leftMouth = mouthLandmarks[0];
      const rightMouth = mouthLandmarks[1];
      mouthWidth = Math.sqrt(
        Math.pow(rightMouth.x - leftMouth.x, 2) + Math.pow(rightMouth.y - leftMouth.y, 2)
      );
    }

    // Calculate face dimensions
    const allX = landmarks.map(l => l.x);
    const allY = landmarks.map(l => l.y);
    const faceWidth = Math.max(...allX) - Math.min(...allX);
    const faceHeight = Math.max(...allY) - Math.min(...allY);

    return {
      eyeDistance,
      noseWidth,
      mouthWidth,
      faceWidth,
      faceHeight,
    };
  }

  /**
   * Validate face against document type requirements
   */
  async validateFaceForDocumentType(
    imageBase64: string,
    documentType: DocumentType
  ): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const qualityResult = await this.analyzeDocumentFaceQuality(imageBase64);
      const issues: string[] = [...qualityResult.issues];
      const recommendations: string[] = [...qualityResult.recommendations];

      // Document type specific validations
      switch (documentType) {
        case 'DRIVERS_LICENSE':
          if (qualityResult.quality < 0.7) {
            issues.push('Driver license photo quality too low');
            recommendations.push('Ensure clear, well-lit photo of driver license');
          }
          break;

        case 'PASSPORT':
          if (qualityResult.quality < 0.8) {
            issues.push('Passport photo quality too low');
            recommendations.push('Ensure high-quality passport photo');
          }
          break;

        case 'NATIONAL_ID':
          if (qualityResult.quality < 0.6) {
            issues.push('National ID photo quality too low');
            recommendations.push('Ensure clear national ID photo');
          }
          break;
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Face validation error:', error);
      return {
        valid: false,
        issues: ['Validation failed'],
        recommendations: ['Retry with better image quality'],
      };
    }
  }
}

export default FacialRecognitionService;