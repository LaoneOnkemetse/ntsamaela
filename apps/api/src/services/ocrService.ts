// DEPRECATED: This service previously used AWS Textract. Now uses Google Cloud Vision API.
// Google Vision API provides OCR capabilities without requiring S3 storage.

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { 
  OCRResult, 
  ExtractedDocumentData, 
  DocumentType 
} from '@shared/types';
import { AppError } from '../utils/AppError';

export class OCRService {
  private visionClient: ImageAnnotatorClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Initialize Google Cloud Vision client
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      try {
        // Configure Google Cloud credentials
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
        console.warn('Google Cloud Vision not configured. OCR will fail. Error:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.warn('Google Cloud Vision not configured. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_CLIENT_EMAIL environment variables.');
      this.isConfigured = false;
    }
  }

  /**
   * Extract data from document using Google Cloud Vision API
   */
  async extractDocumentData(
    imageBase64: string,
    documentType: DocumentType
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    if (!this.isConfigured || !this.visionClient) {
      errors.push('Google Cloud Vision is not configured');
      return {
        extractedData: this.getEmptyDocumentData(documentType),
        confidence: 0,
        processingTime: Date.now() - startTime,
        errors,
      };
    }

    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');

      // Use appropriate extraction method based on document type
      let extractedData: ExtractedDocumentData;
      let confidence: number;

      if (documentType === 'DRIVERS_LICENSE') {
        const result = await this.extractDriverLicenseData(imageBuffer);
        extractedData = result.data;
        confidence = result.confidence;
      } else if (documentType === 'PASSPORT') {
        const result = await this.extractPassportData(imageBuffer);
        extractedData = result.data;
        confidence = result.confidence;
      } else {
        const result = await this.extractNationalIdData(imageBuffer);
        extractedData = result.data;
        confidence = result.confidence;
      }

      const processingTime = Date.now() - startTime;

      return {
        extractedData,
        confidence,
        processingTime,
        errors,
      };
    } catch (_error) {
      console.error('OCR service error:', _error);
      errors.push(`OCR extraction failed: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
      
      return {
        extractedData: this.getEmptyDocumentData(documentType),
        confidence: 0,
        processingTime: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Extract data from driver's license using Google Cloud Vision
   */
  private async extractDriverLicenseData(imageBuffer: Buffer): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    if (!this.visionClient) {
      throw new AppError('Google Cloud Vision client not initialized', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      // Perform text detection
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      if (detections.length === 0) {
        // Return empty data instead of throwing error - this is a valid case
        return {
          data: this.getEmptyDocumentData('DRIVERS_LICENSE'),
          confidence: 0,
        };
      }

      // Get full text annotation (first element contains all text)
      const fullText = detections[0]?.description || '';
      
      // Extract fields from the text
      const extractedData = this.parseDriverLicenseText(fullText, detections);
      
      // Calculate confidence based on text detection quality
      const confidence = this.calculateGoogleVisionConfidence(detections);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Extract data from passport using Google Cloud Vision
   */
  private async extractPassportData(imageBuffer: Buffer): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    if (!this.visionClient) {
      throw new AppError('Google Cloud Vision client not initialized', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      // Perform text detection
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      if (detections.length === 0) {
        // Return empty data instead of throwing error - this is a valid case
        return {
          data: this.getEmptyDocumentData('DRIVERS_LICENSE'),
          confidence: 0,
        };
      }

      // Get full text annotation
      const fullText = detections[0]?.description || '';
      
      // Parse passport data from text
      const extractedData = this.parsePassportText(fullText, detections);
      
      // Calculate confidence
      const confidence = this.calculateGoogleVisionConfidence(detections);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Extract data from national ID using Google Cloud Vision
   */
  private async extractNationalIdData(imageBuffer: Buffer): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    if (!this.visionClient) {
      throw new AppError('Google Cloud Vision client not initialized', 'VISION_NOT_CONFIGURED', 500);
    }

    try {
      // Perform text detection
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      if (detections.length === 0) {
        // Return empty data instead of throwing error - this is a valid case
        return {
          data: this.getEmptyDocumentData('DRIVERS_LICENSE'),
          confidence: 0,
        };
      }

      // Get full text annotation
      const fullText = detections[0]?.description || '';
      
      // Parse national ID data from text
      const extractedData = this.parseNationalIdText(fullText, detections);
      
      // Calculate confidence
      const confidence = this.calculateGoogleVisionConfidence(detections);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Parse driver license text from Google Vision response
   */
  private parseDriverLicenseText(fullText: string, detections: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'DRIVERS_LICENSE',
    };

    // Extract license number (usually alphanumeric, 8-12 characters)
    const licenseNumberMatch = fullText.match(/\b([A-Z0-9]{8,12})\b/);
    if (licenseNumberMatch) {
      data.documentNumber = licenseNumberMatch[1];
    }

    // Extract name patterns
    const namePatterns = [
      /(?:name|full name)\s*:?\s*([A-Z\s]+)/i,
      /([A-Z]{2,}\s+[A-Z]{2,})/,
    ];
    for (const pattern of namePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        const nameParts = match[1].trim().split(/\s+/);
        if (nameParts.length >= 2) {
          data.firstName = nameParts[0];
          data.lastName = nameParts.slice(1).join(' ');
        }
        break;
      }
    }

    // Extract dates
    const dates = this.extractDates(fullText);
    if (dates.length >= 1) {
      data.dateOfBirth = this.parseDate(dates[0]);
    }
    if (dates.length >= 2) {
      data.issueDate = this.parseDate(dates[1]);
    }
    if (dates.length >= 3) {
      data.expiryDate = this.parseDate(dates[2]);
    }

    // Extract address
    const addressMatch = fullText.match(/(?:address|residence)\s*:?\s*([A-Z0-9\s,.-]+)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    // Extract gender
    const genderMatch = fullText.match(/(?:sex|gender)\s*:?\s*([MF])/i);
    if (genderMatch) {
      data.gender = genderMatch[1];
    }

    // Extract issuing authority
    const issuerMatch = fullText.match(/(?:issuer|issuing authority|authority)\s*:?\s*([A-Z\s]+)/i);
    if (issuerMatch) {
      data.issuer = issuerMatch[1].trim();
    }

    return data as ExtractedDocumentData;
  }

  /**
   * Parse passport data from Google Vision text
   */
  private parsePassportText(fullText: string, detections: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'PASSPORT',
    };

    // Extract passport number (usually starts with letter followed by numbers)
    const passportNumberMatch = fullText.match(/\b([A-Z]{1,2}\d{6,9})\b/);
    if (passportNumberMatch) {
      data.documentNumber = passportNumberMatch[1];
    }

    // Extract name (usually in format "SURNAME, GIVEN NAMES")
    const nameMatch = fullText.match(/([A-Z\s,]+)\s*([A-Z\s]+)/);
    if (nameMatch) {
      const nameParts = nameMatch[1].split(',');
      if (nameParts.length >= 2) {
        data.lastName = nameParts[0].trim();
        data.firstName = nameParts[1].trim();
      }
    }

    // Extract dates
    const dates = this.extractDates(fullText);
    if (dates.length >= 1) {
      data.dateOfBirth = this.parseDate(dates[0]);
    }
    if (dates.length >= 2) {
      data.issueDate = this.parseDate(dates[1]);
    }
    if (dates.length >= 3) {
      data.expiryDate = this.parseDate(dates[2]);
    }

    // Extract nationality
    const nationalityMatch = fullText.match(/(?:nationality|citizen)\s*:?\s*([A-Z]{3})/i);
    if (nationalityMatch) {
      data.nationality = nationalityMatch[1];
    }

    // Extract gender
    const genderMatch = fullText.match(/(?:sex|gender)\s*:?\s*([MF])/i);
    if (genderMatch) {
      data.gender = genderMatch[1];
    }

    return data as ExtractedDocumentData;
  }

  /**
   * Parse national ID data from Google Vision text
   */
  private parseNationalIdText(fullText: string, detections: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'NATIONAL_ID',
    };

    // Extract ID number (usually numeric with some formatting)
    const idNumberMatch = fullText.match(/\b(\d{8,12})\b/);
    if (idNumberMatch) {
      data.documentNumber = idNumberMatch[1];
    }

    // Extract name
    const nameMatch = fullText.match(/([A-Z\s]+)\s+([A-Z\s]+)/);
    if (nameMatch) {
      data.firstName = nameMatch[1].trim();
      data.lastName = nameMatch[2].trim();
    }

    // Extract dates
    const dates = this.extractDates(fullText);
    if (dates.length >= 1) {
      data.dateOfBirth = this.parseDate(dates[0]);
    }

    // Extract address
    const addressMatch = fullText.match(/(?:address|residence)\s*:?\s*([A-Z0-9\s,.-]+)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    return data as ExtractedDocumentData;
  }

  /**
   * Extract dates from text
   */
  private extractDates(text: string): string[] {
    const datePatterns = [
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
      /\b(\d{2,4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
      /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})\b/gi,
    ];

    const dates: string[] = [];

    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });

    return dates;
  }

  /**
   * Parse date string to standard format
   */
  private parseDate(dateString: string): string {
    try {
      // Handle various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (_error) {
      return dateString;
    }
  }

  /**
   * Calculate confidence based on Google Vision text detection
   */
  private calculateGoogleVisionConfidence(detections: any[]): number {
    if (detections.length === 0) return 0;

    // Skip the first detection (full text annotation) and calculate from individual detections
    const individualDetections = detections.slice(1);
    if (individualDetections.length === 0) return 0.5; // Default confidence if only full text available

    // Calculate average confidence from individual text detections
    let totalConfidence = 0;
    let validDetections = 0;

    individualDetections.forEach((detection: any) => {
      // Google Vision doesn't provide confidence scores directly in textDetection
      // We'll estimate based on bounding polygon quality and text length
      if (detection.boundingPoly && detection.boundingPoly.vertices) {
        const vertices = detection.boundingPoly.vertices;
        if (vertices.length >= 4) {
          // Estimate confidence based on bounding box completeness
          totalConfidence += 0.85; // Default high confidence for detected text
          validDetections++;
        }
      }
    });

    if (validDetections === 0) return 0.5;

    // Normalize to 0-1 scale
    const avgConfidence = totalConfidence / validDetections;
    return Math.min(1, Math.max(0, avgConfidence));
  }

  /**
   * Get empty document data structure
   */
  private getEmptyDocumentData(documentType: DocumentType): ExtractedDocumentData {
    return {
      documentNumber: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      expiryDate: '',
      issueDate: '',
      address: '',
      nationality: '',
      gender: '',
      issuer: '',
      documentType,
    };
  }


  /**
   * Validate extracted data
   */
  validateExtractedData(data: ExtractedDocumentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.documentNumber) {
      errors.push('Document number is required');
    }

    if (!data.firstName) {
      errors.push('First name is required');
    }

    if (!data.lastName) {
      errors.push('Last name is required');
    }

    if (!data.dateOfBirth) {
      errors.push('Date of birth is required');
    }

    // Document type specific validation
    if (data.documentType === 'DRIVERS_LICENSE') {
      if (!data.expiryDate) {
        errors.push('Expiry date is required for driver license');
      }
    }

    if (data.documentType === 'PASSPORT') {
      if (!data.nationality) {
        errors.push('Nationality is required for passport');
      }
      if (!data.expiryDate) {
        errors.push('Expiry date is required for passport');
      }
    }

    // Date format validation
    if (data.dateOfBirth && !this.isValidDate(data.dateOfBirth)) {
      errors.push('Invalid date of birth format');
    }

    if (data.expiryDate && !this.isValidDate(data.expiryDate)) {
      errors.push('Invalid expiry date format');
    }

    if (data.issueDate && !this.isValidDate(data.issueDate)) {
      errors.push('Invalid issue date format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if date string is valid
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}

export default OCRService;
