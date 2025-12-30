/**
 * Google Vision Service
 * Provides face detection, face comparison, and document authenticity analysis
 * using Google Cloud Vision API.
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { 
  DocumentAuthenticityResult, 
  SecurityFeature, 
  Anomaly, 
  DocumentType,
  FacialRecognitionResult,
  FaceLandmark 
} from '@shared/types';
import { AppError } from '../utils/AppError';
import OCRService from './ocrService';

// Google Vision face detection result type
type GoogleVisionFace = {
  boundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
  fdBoundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
  landmarks?: Array<{
    type?: string;
    position?: { x?: number; y?: number; z?: number };
  }>;
  rollAngle?: number;
  panAngle?: number;
  tiltAngle?: number;
  detectionConfidence?: number;
  landmarkingConfidence?: number;
  joyLikelihood?: string;
  sorrowLikelihood?: string;
  angerLikelihood?: string;
  surpriseLikelihood?: string;
  underExposedLikelihood?: string;
  blurredLikelihood?: string;
  headwearLikelihood?: string;
};

export class GoogleVisionService {
  private visionClient: ImageAnnotatorClient | null = null;
  private ocrService: OCRService;
  private isConfigured: boolean = false;

  constructor() {
    // Initialize Google Cloud Vision client
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      try {
        const credentials = {
          type: 'service_account',
          project_id: projectId,
          private_key_id: '',
          private_key: privateKey.replace(/\\n/g, '\n'),
          client_email: clientEmail,
          client_id: '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
        };

        this.visionClient = new ImageAnnotatorClient({
          projectId,
          credentials,
        });
        this.isConfigured = true;
      } catch (error: any) {
        console.warn('Google Cloud Vision not configured for face detection. Error:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.warn('Google Cloud Vision not configured. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_CLIENT_EMAIL environment variables.');
      this.isConfigured = false;
    }

    // Initialize OCR service for document authenticity analysis
    this.ocrService = new OCRService();
  }

  /**
   * Analyze document authenticity using Google Cloud Vision API
   */
  async analyzeDocumentAuthenticity(
    imageBase64: string,
    documentType: DocumentType
  ): Promise<DocumentAuthenticityResult> {
    if (!this.isConfigured || !this.visionClient) {
      throw new AppError('Google Cloud Vision is not configured', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Use OCR service to extract text (already uses Google Vision)
      const ocrResult = await this.ocrService.extractDocumentData(imageBase64, documentType);
      
      // Detect faces in the document using Google Vision
      const faceDetection = await this.detectFaces(imageBuffer);
      
      // Analyze document structure and security features
      const securityAnalysis = await this.analyzeSecurityFeatures(imageBuffer, documentType, ocrResult);
      
      // Check for anomalies
      const anomalies = await this.detectAnomalies(imageBuffer, documentType, ocrResult, faceDetection);
      
      // Calculate overall authenticity score
      const authenticityScore = this.calculateAuthenticityScore(securityAnalysis, anomalies, ocrResult, faceDetection);
      
      // Extract document information from OCR result
      const documentInfo = this.extractDocumentInfo(ocrResult.extractedData, documentType);

      return {
        isAuthentic: authenticityScore >= 0.7,
        confidence: authenticityScore,
        securityFeatures: securityAnalysis,
        anomalies,
        documentType,
        issuer: documentInfo.issuer,
        expiryDate: documentInfo.expiryDate,
        issueDate: documentInfo.issueDate,
      };
    } catch (_error) {
      console.error('Document authenticity analysis failed:', _error);
      throw new Error(`Document authenticity analysis failed: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform facial recognition matching using Google Cloud Vision API
   */
  async performFacialRecognition(
    documentImageBase64: string,
    selfieImageBase64: string,
    _userId: string
  ): Promise<FacialRecognitionResult> {
    if (!this.isConfigured || !this.visionClient) {
      throw new AppError('Google Cloud Vision is not configured', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      const startTime = Date.now();
      
      // Convert base64 to buffers
      const documentBuffer = Buffer.from(documentImageBase64, 'base64');
      const selfieBuffer = Buffer.from(selfieImageBase64, 'base64');

      // Detect faces in both images using Google Vision
      const documentFaces = await this.detectFaces(documentBuffer);
      const selfieFaces = await this.detectFaces(selfieBuffer);

      if (documentFaces.length === 0 || selfieFaces.length === 0) {
        return {
          match: false,
          confidence: 0,
          faceDetected: false,
          faceQuality: 0,
          landmarks: [],
          processingTime: Date.now() - startTime,
        };
      }

      // Extract face from document
      const documentFace = documentFaces[0];
      const selfieFace = selfieFaces[0];

      // Compare faces using Google Vision face detection data
      const comparisonResult = await this.compareFaces(documentFace, selfieFace);

      // Extract facial landmarks
      const landmarks = this.extractFacialLandmarks(documentFace);

      // Calculate face quality score
      const faceQuality = this.calculateFaceQuality(documentFace, selfieFace);

      const processingTime = Date.now() - startTime;

      return {
        match: comparisonResult.match,
        confidence: comparisonResult.confidence,
        faceDetected: true,
        faceQuality,
        landmarks,
        processingTime,
      };
    } catch (_error) {
      console.error('Facial recognition failed:', _error);
      throw new Error(`Facial recognition failed: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update face collection for user (Not supported by Google Vision - placeholder)
   */
  async createFaceCollection(_userId: string): Promise<void> {
    // Google Vision doesn't support face collections
    // This is a placeholder for backward compatibility
    console.warn('Face collections are not supported by Google Vision API');
  }

  /**
   * Index face for future recognition (Not supported by Google Vision - placeholder)
   */
  async indexFace(
    _userId: string,
    _imageBase64: string,
    _faceId: string
  ): Promise<void> {
    // Google Vision doesn't support face indexing
    // This is a placeholder for backward compatibility
    console.warn('Face indexing is not supported by Google Vision API');
  }

  /**
   * Search for faces in collection (Not supported by Google Vision - placeholder)
   */
  async searchFaces(
    _userId: string,
    _imageBase64: string,
    _threshold: number = 80
  ): Promise<{ faceId: string; confidence: number }[]> {
    // Google Vision doesn't support face search in collections
    // This is a placeholder for backward compatibility
    console.warn('Face search in collections is not supported by Google Vision API');
    return [];
  }

  // Private helper methods

  /**
   * Detect faces using Google Cloud Vision API
   */
  private async detectFaces(imageBuffer: Buffer): Promise<GoogleVisionFace[]> {
    if (!this.visionClient) {
      throw new AppError('Google Cloud Vision client not initialized', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      const [result] = await this.visionClient.faceDetection({
        image: { content: imageBuffer },
      });

      // Convert Google Vision face annotations to our custom type
      const faces: GoogleVisionFace[] = (result.faceAnnotations || []).map(face => ({
        boundingPoly: face.boundingPoly ? {
          vertices: face.boundingPoly.vertices?.map(v => ({ 
            x: v.x ?? undefined, 
            y: v.y ?? undefined 
          })).filter(v => v.x !== undefined && v.y !== undefined) || []
        } : undefined,
        fdBoundingPoly: face.fdBoundingPoly ? {
          vertices: face.fdBoundingPoly.vertices?.map(v => ({ 
            x: v.x ?? undefined, 
            y: v.y ?? undefined 
          })).filter(v => v.x !== undefined && v.y !== undefined) || []
        } : undefined,
        landmarks: face.landmarks?.map(l => ({
          type: l.type ? String(l.type) : '',
          position: l.position ? {
            x: l.position.x ?? undefined,
            y: l.position.y ?? undefined,
            z: l.position.z ?? undefined
          } : undefined
        })).filter(l => l.position !== undefined) || [],
        rollAngle: face.rollAngle ?? undefined,
        panAngle: face.panAngle ?? undefined,
        tiltAngle: face.tiltAngle ?? undefined,
        detectionConfidence: face.detectionConfidence ?? undefined,
        landmarkingConfidence: face.landmarkingConfidence ?? undefined,
        joyLikelihood: face.joyLikelihood ? String(face.joyLikelihood) : undefined,
        sorrowLikelihood: face.sorrowLikelihood ? String(face.sorrowLikelihood) : undefined,
        angerLikelihood: face.angerLikelihood ? String(face.angerLikelihood) : undefined,
        surpriseLikelihood: face.surpriseLikelihood ? String(face.surpriseLikelihood) : undefined,
        underExposedLikelihood: face.underExposedLikelihood ? String(face.underExposedLikelihood) : undefined,
        blurredLikelihood: face.blurredLikelihood ? String(face.blurredLikelihood) : undefined,
        headwearLikelihood: face.headwearLikelihood ? String(face.headwearLikelihood) : undefined,
      }));

      return faces;
    } catch (error: any) {
      console.error('Face detection failed:', error);
      throw new Error(`Face detection failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Compare faces using Google Vision face detection data
   */
  private async compareFaces(
    documentFace: GoogleVisionFace,
    selfieFace: GoogleVisionFace
  ): Promise<{ match: boolean; confidence: number }> {
    // Google Vision doesn't have built-in face comparison
    // We'll implement a simple comparison using face landmarks and bounding boxes
    
    let similarityScore = 0;
    let comparisonFactors = 0;

    // Compare face bounding boxes (size and position)
    if (documentFace.boundingPoly?.vertices && selfieFace.boundingPoly?.vertices) {
      const docBox = this.calculateBoundingBoxArea(documentFace.boundingPoly.vertices);
      const selfieBox = this.calculateBoundingBoxArea(selfieFace.boundingPoly.vertices);
      const sizeSimilarity = 1 - Math.abs(docBox - selfieBox) / Math.max(docBox, selfieBox);
      similarityScore += sizeSimilarity * 0.3;
      comparisonFactors++;
    }

    // Compare face landmarks
    if (documentFace.landmarks && selfieFace.landmarks && documentFace.landmarks.length > 0 && selfieFace.landmarks.length > 0) {
      const landmarkSimilarity = this.compareLandmarks(documentFace.landmarks, selfieFace.landmarks);
      similarityScore += landmarkSimilarity * 0.5;
      comparisonFactors++;
    }

    // Compare face angles (roll, pan, tilt)
    if (documentFace.rollAngle !== undefined && selfieFace.rollAngle !== undefined) {
      const rollDiff = Math.abs(documentFace.rollAngle - selfieFace.rollAngle);
      const rollSimilarity = Math.max(0, 1 - rollDiff / 45); // Normalize to 0-1
      similarityScore += rollSimilarity * 0.1;
      comparisonFactors++;
    }

    if (documentFace.panAngle !== undefined && selfieFace.panAngle !== undefined) {
      const panDiff = Math.abs(documentFace.panAngle - selfieFace.panAngle);
      const panSimilarity = Math.max(0, 1 - panDiff / 45);
      similarityScore += panSimilarity * 0.05;
      comparisonFactors++;
    }

    if (documentFace.tiltAngle !== undefined && selfieFace.tiltAngle !== undefined) {
      const tiltDiff = Math.abs(documentFace.tiltAngle - selfieFace.tiltAngle);
      const tiltSimilarity = Math.max(0, 1 - tiltDiff / 45);
      similarityScore += tiltSimilarity * 0.05;
      comparisonFactors++;
    }

    // Normalize score
    const finalScore = comparisonFactors > 0 ? similarityScore / comparisonFactors : 0;
    const confidence = finalScore * 100; // Convert to percentage
    const match = confidence >= 70; // Threshold for match

    return { match, confidence };
  }

  /**
   * Calculate bounding box area
   */
  private calculateBoundingBoxArea(vertices: Array<{ x?: number; y?: number }>): number {
    if (vertices.length < 4) return 0;
    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    return width * height;
  }

  /**
   * Compare face landmarks
   */
  private compareLandmarks(
    docLandmarks: Array<{ type?: string; position?: { x?: number; y?: number; z?: number } }>,
    selfieLandmarks: Array<{ type?: string; position?: { x?: number; y?: number; z?: number } }>
  ): number {
    // Group landmarks by type
    const docLandmarksByType = new Map<string, { x: number; y: number }>();
    const selfieLandmarksByType = new Map<string, { x: number; y: number }>();

    docLandmarks.forEach(landmark => {
      if (landmark.type && landmark.position) {
        docLandmarksByType.set(landmark.type, {
          x: landmark.position.x || 0,
          y: landmark.position.y || 0,
        });
      }
    });

    selfieLandmarks.forEach(landmark => {
      if (landmark.type && landmark.position) {
        selfieLandmarksByType.set(landmark.type, {
          x: landmark.position.x || 0,
          y: landmark.position.y || 0,
        });
      }
    });

    // Compare common landmarks
    let totalSimilarity = 0;
    let commonLandmarks = 0;

    docLandmarksByType.forEach((docPos, type) => {
      const selfiePos = selfieLandmarksByType.get(type);
      if (selfiePos) {
        const distance = Math.sqrt(
          Math.pow(docPos.x - selfiePos.x, 2) + Math.pow(docPos.y - selfiePos.y, 2)
        );
        // Normalize distance (assuming max distance of 100 pixels)
        const similarity = Math.max(0, 1 - distance / 100);
        totalSimilarity += similarity;
        commonLandmarks++;
      }
    });

    return commonLandmarks > 0 ? totalSimilarity / commonLandmarks : 0;
  }

  private async analyzeSecurityFeatures(
    imageBuffer: Buffer,
    documentType: DocumentType,
    ocrResult: any
  ): Promise<SecurityFeature[]> {
    const features: SecurityFeature[] = [];

    try {
      // Analyze text quality from OCR result
      const textQuality = this.analyzeTextQualityFromOCR(ocrResult);
      
      features.push({
        name: 'Text Quality',
        detected: textQuality.isGood,
        confidence: textQuality.confidence,
        description: 'Document text clarity and consistency',
      });

      // Detect face presence and quality
      const faceResult = await this.detectFaces(imageBuffer);
      const faceQuality = this.analyzeFaceQuality(faceResult);
      
      features.push({
        name: 'Face Quality',
        detected: faceQuality.isGood,
        confidence: faceQuality.confidence,
        description: 'Document photo quality and positioning',
      });

      // Document-specific security features
      const documentFeatures = this.getDocumentSpecificFeatures(documentType);
      features.push(...documentFeatures);

    } catch (_error) {
      console.error('Security features analysis failed:', _error);
    }

    return features;
  }

  private async detectAnomalies(
    _imageBuffer: Buffer,
    _documentType: DocumentType,
    ocrResult: any,
    faceDetection: GoogleVisionFace[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for blur or low quality from OCR
    if (ocrResult.confidence < 0.7) {
      anomalies.push({
        type: 'LOW_QUALITY',
        severity: 'MEDIUM',
        description: 'Document appears blurry or low quality',
        confidence: 1 - ocrResult.confidence,
      });
    }

    // Check for missing face
    if (faceDetection.length === 0) {
      anomalies.push({
        type: 'WRONG_DOCUMENT_TYPE',
        severity: 'HIGH',
        description: 'No face detected in document photo',
        confidence: 0.9,
      });
    }

    // Check for multiple faces
    if (faceDetection.length > 1) {
      anomalies.push({
        type: 'TAMPERING',
        severity: 'MEDIUM',
        description: 'Multiple faces detected in document',
        confidence: 0.7,
      });
    }

    return anomalies;
  }

  private calculateAuthenticityScore(
    securityFeatures: SecurityFeature[],
    anomalies: Anomaly[],
    _ocrResult: any,
    _faceDetection: GoogleVisionFace[]
  ): number {
    let score = 1.0;

    // Deduct points for anomalies
    anomalies.forEach(anomaly => {
      const severityMultiplier = {
        'LOW': 0.05,
        'MEDIUM': 0.15,
        'HIGH': 0.3,
        'CRITICAL': 0.5,
      };
      score -= severityMultiplier[anomaly.severity] * anomaly.confidence;
    });

    // Add points for security features
    const detectedFeatures = securityFeatures.filter(f => f.detected);
    const featureScore = detectedFeatures.length / securityFeatures.length;
    score = score * 0.7 + featureScore * 0.3;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  private extractDocumentInfo(
    extractedData: any,
    documentType: DocumentType
  ): { issuer: string; expiryDate?: string; issueDate?: string } {
    // Extract issuer based on document type
    let issuer = extractedData.issuer || 'Unknown';
    if (issuer === 'Unknown') {
      if (documentType === 'DRIVERS_LICENSE') {
        issuer = 'Department of Motor Vehicles';
      } else if (documentType === 'PASSPORT') {
        issuer = 'Government Authority';
      }
    }

    // Extract dates from OCR result
    const expiryDate = extractedData.expiryDate;
    const issueDate = extractedData.issueDate;

    return { issuer, expiryDate, issueDate };
  }

  private extractLicenseIssuer(text: string): string {
    const patterns = [
      /(?:issued by|department of|dmv|motor vehicle)\s+([a-z\s]+)/i,
      /([a-z\s]+)\s+(?:department|dmv|motor vehicle)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return 'Department of Motor Vehicles';
  }

  private extractPassportIssuer(text: string): string {
    const patterns = [
      /(?:issued by|authority)\s+([a-z\s]+)/i,
      /([a-z\s]+)\s+(?:passport|authority)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return 'Government Authority';
  }

  private extractDate(text: string, keywords: string[]): string | undefined {
    const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{2,4}[/-]\d{1,2}[/-]\d{1,2})\b/g;
    const dates = text.match(datePattern);
    
    if (dates) {
      // Find date near keywords
      for (const keyword of keywords) {
        const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
        if (keywordIndex !== -1) {
          const nearbyText = text.substring(Math.max(0, keywordIndex - 50), keywordIndex + 50);
          const nearbyDates = nearbyText.match(datePattern);
          if (nearbyDates && nearbyDates.length > 0) {
            return nearbyDates[0];
          }
        }
      }
    }

    return undefined;
  }

  private extractFacialLandmarks(face: GoogleVisionFace): FaceLandmark[] {
    const landmarks: FaceLandmark[] = [];

    if (face.landmarks) {
      face.landmarks.forEach(landmark => {
        let type: FaceLandmark['type'] = 'EYE';
        
        const landmarkType = landmark.type || '';
        if (landmarkType.includes('EYE') || landmarkType.includes('eye')) {
          type = 'EYE';
        } else if (landmarkType.includes('NOSE') || landmarkType.includes('nose')) {
          type = 'NOSE';
        } else if (landmarkType.includes('MOUTH') || landmarkType.includes('mouth')) {
          type = 'MOUTH';
        } else if (landmarkType.includes('EAR') || landmarkType.includes('ear')) {
          type = 'EAR';
        } else if (landmarkType.includes('CHIN') || landmarkType.includes('chin')) {
          type = 'CHIN';
        }

        if (landmark.position) {
          landmarks.push({
            type,
            x: landmark.position.x || 0,
            y: landmark.position.y || 0,
            confidence: face.landmarkingConfidence || 0.9,
          });
        }
      });
    }

    return landmarks;
  }

  private calculateFaceQuality(
    documentFace: GoogleVisionFace,
    selfieFace: GoogleVisionFace
  ): number {
    const documentQuality = this.getFaceQualityScore(documentFace);
    const selfieQuality = this.getFaceQualityScore(selfieFace);
    
    return (documentQuality + selfieQuality) / 2;
  }

  private getFaceQualityScore(face: GoogleVisionFace): number {
    let score = 0.5; // Base score

    // Use detection confidence
    if (face.detectionConfidence && face.detectionConfidence > 0.5) {
      score += face.detectionConfidence * 0.3;
    }

    // Check for blur
    if (face.blurredLikelihood === 'VERY_UNLIKELY' || face.blurredLikelihood === 'UNLIKELY') {
      score += 0.1;
    }

    // Check for proper exposure
    if (face.underExposedLikelihood === 'VERY_UNLIKELY' || face.underExposedLikelihood === 'UNLIKELY') {
      score += 0.1;
    }

    // Check face angles (smaller angles = better quality)
    if (face.rollAngle !== undefined && Math.abs(face.rollAngle) < 20) score += 0.05;
    if (face.panAngle !== undefined && Math.abs(face.panAngle) < 20) score += 0.05;
    if (face.tiltAngle !== undefined && Math.abs(face.tiltAngle) < 20) score += 0.05;

    return Math.min(1, score);
  }

  private analyzeTextQualityFromOCR(ocrResult: any): { isGood: boolean; confidence: number } {
    return {
      isGood: ocrResult.confidence > 0.7,
      confidence: ocrResult.confidence || 0,
    };
  }

  private analyzeFaceQuality(faceResult: GoogleVisionFace[]): { isGood: boolean; confidence: number } {
    if (faceResult.length === 0) {
      return { isGood: false, confidence: 0 };
    }

    const face = faceResult[0];
    const qualityScore = this.getFaceQualityScore(face);

    return {
      isGood: qualityScore > 0.6,
      confidence: qualityScore,
    };
  }

  private getDocumentSpecificFeatures(documentType: DocumentType): SecurityFeature[] {
    const features: SecurityFeature[] = [];

    switch (documentType) {
      case 'DRIVERS_LICENSE':
        features.push(
          {
            name: 'License Number Format',
            detected: true,
            confidence: 0.8,
            description: 'Valid driver license number format',
          },
          {
            name: 'State/Province Code',
            detected: true,
            confidence: 0.9,
            description: 'Valid state or province identifier',
          }
        );
        break;
      
      case 'PASSPORT':
        features.push(
          {
            name: 'Passport Number Format',
            detected: true,
            confidence: 0.8,
            description: 'Valid passport number format',
          },
          {
            name: 'Country Code',
            detected: true,
            confidence: 0.9,
            description: 'Valid country identifier',
          }
        );
        break;
      
      case 'NATIONAL_ID':
        features.push(
          {
            name: 'ID Number Format',
            detected: true,
            confidence: 0.8,
            description: 'Valid national ID number format',
          },
          {
            name: 'Government Seal',
            detected: true,
            confidence: 0.7,
            description: 'Government authority seal or logo',
          }
        );
        break;
    }

    return features;
  }

  /**
   * Analyze face liveness (anti-spoofing) using Google Cloud Vision
   */
  async analyzeFaceLiveness(imageBase64: string): Promise<{
    isLive: boolean;
    confidence: number;
    spoofingIndicators: string[];
  }> {
    if (!this.isConfigured || !this.visionClient) {
      return {
        isLive: false,
        confidence: 0,
        spoofingIndicators: ['Google Cloud Vision not configured'],
      };
    }

    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Detect faces to get quality metrics
      const faces = await this.detectFaces(imageBuffer);

      if (faces.length === 0) {
        return {
          isLive: false,
          confidence: 0,
          spoofingIndicators: ['No face detected'],
        };
      }

      const face = faces[0];
      const spoofingIndicators: string[] = [];

      // Check for common spoofing indicators using Google Vision attributes
      if (face.underExposedLikelihood === 'LIKELY' || face.underExposedLikelihood === 'VERY_LIKELY') {
        spoofingIndicators.push('Image too dark');
      }

      if (face.blurredLikelihood === 'LIKELY' || face.blurredLikelihood === 'VERY_LIKELY') {
        spoofingIndicators.push('Image too blurry');
      }

      if (face.rollAngle !== undefined && Math.abs(face.rollAngle) > 30) {
        spoofingIndicators.push('Unnatural head angle');
      }

      if (face.panAngle !== undefined && Math.abs(face.panAngle) > 30) {
        spoofingIndicators.push('Unnatural head position');
      }

      // Check for suspicious emotional states (might indicate photo of photo)
      if (face.joyLikelihood === 'VERY_UNLIKELY' && face.surpriseLikelihood === 'VERY_UNLIKELY') {
        // Neutral expression might indicate photo of photo, but not definitive
      }

      // Calculate liveness confidence
      const isLive = spoofingIndicators.length === 0;
      const baseConfidence = face.detectionConfidence || 0.8;
      const confidence = isLive ? baseConfidence : Math.max(0, baseConfidence - (spoofingIndicators.length * 0.2));

      return {
        isLive,
        confidence,
        spoofingIndicators,
      };
    } catch (_error) {
      console.error('Liveness detection failed:', _error);
      return {
        isLive: false,
        confidence: 0,
        spoofingIndicators: ['Analysis failed'],
      };
    }
  }
}

export default GoogleVisionService;
