import { 
  TextractClient, 
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand
} from '@aws-sdk/client-textract';
import { 
  S3Client, 
  PutObjectCommand,
  // GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { 
  OCRResult, 
  ExtractedDocumentData, 
  DocumentType 
} from '@shared/types';

export class OCRService {
  private textract: TextractClient;
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.textract = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET || 'ntsamaela-documents';
  }

  /**
   * Extract data from document using AWS Textract
   */
  async extractDocumentData(
    imageBase64: string,
    documentType: DocumentType
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Upload image to S3
      const s3Key = `ocr/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      await this.uploadToS3(imageBase64, s3Key);

      // Use appropriate Textract method based on document type
      let extractedData: ExtractedDocumentData;
      let confidence: number;

      if (documentType === 'DRIVERS_LICENSE') {
        const result = await this.extractDriverLicenseData(s3Key);
        extractedData = result.data;
        confidence = result.confidence;
      } else if (documentType === 'PASSPORT') {
        const result = await this.extractPassportData(s3Key);
        extractedData = result.data;
        confidence = result.confidence;
      } else {
        const result = await this.extractNationalIdData(s3Key);
        extractedData = result.data;
        confidence = result.confidence;
      }

      // Clean up S3 object
      await this.deleteFromS3(s3Key);

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
   * Extract data from driver's license
   */
  private async extractDriverLicenseData(s3Key: string): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    try {
      // Use Textract to analyze the document
      const command = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: this.bucketName,
            Name: s3Key,
          },
        },
        FeatureTypes: ['TABLES', 'FORMS'],
      });
      const result = await this.textract.send(command);

      const identityDocuments = (result as any).IdentityDocuments || [];
      if (identityDocuments.length === 0) {
        throw new Error('No identity document detected');
      }

      const document = identityDocuments[0];
      const documentFields = document.IdentityDocumentFields || [];
      
      // Extract fields from the document
      const extractedData = this.parseDriverLicenseFields(documentFields);
      
      // Calculate confidence based on field detection
      const confidence = this.calculateConfidence(documentFields);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Extract data from passport
   */
  private async extractPassportData(s3Key: string): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    try {
      // For passports, we'll use document text analysis
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: this.bucketName,
            Name: s3Key,
          },
        },
      });
      const result = await this.textract.send(command);

      const blocks = result.Blocks || [];
      const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
      
      // Parse passport data from text blocks
      const extractedData = this.parsePassportText(textBlocks);
      
      // Calculate confidence based on text detection
      const confidence = this.calculateTextConfidence(textBlocks);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Extract data from national ID
   */
  private async extractNationalIdData(s3Key: string): Promise<{ data: ExtractedDocumentData; confidence: number }> {
    try {
      // Use document text analysis for national IDs
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: this.bucketName,
            Name: s3Key,
          },
        },
      });
      const result = await this.textract.send(command);

      const blocks = result.Blocks || [];
      const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
      
      // Parse national ID data from text blocks
      const extractedData = this.parseNationalIdText(textBlocks);
      
      // Calculate confidence based on text detection
      const confidence = this.calculateTextConfidence(textBlocks);

      return { data: extractedData, confidence };
    } catch (_error) {
      console.error('OCR service error:', _error);
      throw _error;
    }
  }

  /**
   * Parse driver license fields from Textract response
   */
  private parseDriverLicenseFields(fields: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'DRIVERS_LICENSE',
    };

    fields.forEach(field => {
      const fieldType = field.Type?.Text;
      const fieldValue = field.ValueDetection?.Text;
      const confidence = field.ValueDetection?.Confidence || 0;

      if (!fieldType || !fieldValue || confidence < 50) return;

      switch (fieldType.toLowerCase()) {
        case 'document_number':
        case 'license_number':
          data.documentNumber = fieldValue;
          break;
        case 'first_name':
          data.firstName = fieldValue;
          break;
        case 'last_name':
          data.lastName = fieldValue;
          break;
        case 'date_of_birth':
          data.dateOfBirth = this.parseDate(fieldValue);
          break;
        case 'expiration_date':
        case 'expiry_date':
          data.expiryDate = this.parseDate(fieldValue);
          break;
        case 'issue_date':
          data.issueDate = this.parseDate(fieldValue);
          break;
        case 'address':
          data.address = fieldValue;
          break;
        case 'sex':
        case 'gender':
          data.gender = fieldValue;
          break;
        case 'issuing_authority':
        case 'issuer':
          data.issuer = fieldValue;
          break;
      }
    });

    return data as ExtractedDocumentData;
  }

  /**
   * Parse passport data from text blocks
   */
  private parsePassportText(textBlocks: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'PASSPORT',
    };

    const fullText = textBlocks.map(block => block.Text).join(' ');

    // Extract passport number (usually starts with letter followed by numbers)
    const passportNumberMatch = fullText.match(/\b[A-Z]{1,2}\d{6,9}\b/);
    if (passportNumberMatch) {
      data.documentNumber = passportNumberMatch[0];
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
      data.dateOfBirth = dates[0];
    }
    if (dates.length >= 2) {
      data.issueDate = dates[1];
    }
    if (dates.length >= 3) {
      data.expiryDate = dates[2];
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
   * Parse national ID data from text blocks
   */
  private parseNationalIdText(textBlocks: any[]): ExtractedDocumentData {
    const data: Partial<ExtractedDocumentData> = {
      documentType: 'NATIONAL_ID',
    };

    const fullText = textBlocks.map(block => block.Text).join(' ');

    // Extract ID number (usually numeric with some formatting)
    const idNumberMatch = fullText.match(/\b\d{8,12}\b/);
    if (idNumberMatch) {
      data.documentNumber = idNumberMatch[0];
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
      data.dateOfBirth = dates[0];
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
   * Calculate confidence based on field detection
   */
  private calculateConfidence(fields: any[]): number {
    if (fields.length === 0) return 0;

    const totalConfidence = fields.reduce((sum, field) => {
      return sum + (field.ValueDetection?.Confidence || 0);
    }, 0);

    return totalConfidence / fields.length / 100; // Convert to 0-1 scale
  }

  /**
   * Calculate confidence based on text detection
   */
  private calculateTextConfidence(textBlocks: any[]): number {
    if (textBlocks.length === 0) return 0;

    const totalConfidence = textBlocks.reduce((sum, block) => {
      return sum + (block.Confidence || 0);
    }, 0);

    return totalConfidence / textBlocks.length / 100; // Convert to 0-1 scale
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
   * Upload image to S3
   */
  private async uploadToS3(imageBase64: string, key: string): Promise<void> {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    });
    await this.s3.send(command);
  }

  /**
   * Delete object from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3.send(command);
    } catch (_error) {
      console.warn('Failed to delete S3 object:', key, _error);
    }
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
