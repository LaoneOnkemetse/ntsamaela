import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../utils/AppError';
import crypto from 'crypto';
// import type { Request } from 'express';
// import type { File as MulterFile } from 'express';

interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
}

class S3UploadService {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'ntsamaela-packages';
  }

  async uploadPackageImage(
    file: Express.Multer.File,
    userId: string,
    packageId?: string
  ): Promise<UploadResult> {
    try {
      // Validate image
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        throw new AppError(
          `Invalid image: ${validation.errors.join(', ')}`,
          'INVALID_IMAGE',
          400
        );
      }

      // Additional content validation
      const isContentValid = await this.validateImageContent(file.buffer);
      if (!isContentValid) {
        throw new AppError(
          'Invalid image content detected',
          'INVALID_IMAGE_CONTENT',
          400
        );
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(file.originalname);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(16).toString('hex');
      const key = `packages/${userId}/${packageId || 'temp'}/${timestamp}-${randomString}.${fileExtension}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId,
          packageId: packageId || 'temp',
          uploadedAt: new Date().toISOString(),
          originalName: file.originalname
        }
      });

      await this.s3.send(command);

      return {
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
        key: key,
        bucket: this.bucketName
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to upload image', 'UPLOAD_ERROR', 500);
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      await this.s3.send(command);
    } catch (_error: any) {
      throw new AppError('Failed to delete image', 'DELETE_ERROR', 500);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      return await getSignedUrl(this.s3, command, { expiresIn });
    } catch (_error: any) {
      throw new AppError('Failed to generate signed URL', 'SIGNED_URL_ERROR', 500);
    }
  }

  private validateImage(file: Express.Multer.File): ImageValidationResult {
    const errors: string[] = [];

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = this.getFileExtension(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(`.${fileExtension}`)) {
      errors.push('Invalid file extension');
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.originalname)) {
      errors.push('Suspicious file name detected');
    }

    // Basic buffer validation
    if (!file.buffer || file.buffer.length === 0) {
      errors.push('Empty file buffer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  private isSuspiciousFileName(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx)$/i // Executable extensions
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  // Additional security validation for image content
  async validateImageContent(buffer: Buffer): Promise<boolean> {
    try {
      // Check for common image file signatures
      const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        webp: [0x52, 0x49, 0x46, 0x46] // RIFF header for WebP
      };

      const header = Array.from(buffer.slice(0, 10));
      
      // Check JPEG signature
      if (header[0] === signatures.jpeg[0] && 
          header[1] === signatures.jpeg[1] && 
          header[2] === signatures.jpeg[2]) {
        return true;
      }

      // Check PNG signature
      if (signatures.png.every((byte, index) => header[index] === byte)) {
        return true;
      }

      // Check WebP signature (RIFF + WEBP)
      if (signatures.webp.every((byte, index) => header[index] === byte) &&
          header[8] === 0x57 && header[9] === 0x45) { // "WE" of "WEBP"
        return true;
      }

      return false;
    } catch (_error) {
      return false;
    }
  }
}

export default new S3UploadService();
