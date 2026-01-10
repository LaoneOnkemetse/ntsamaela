import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/AppError';
import crypto from 'crypto';

// Type for multer file
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

interface UploadResult {
  url: string;
  key: string; // Public ID in Cloudinary
  bucket: string; // Folder in Cloudinary
}

interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
}

class CloudinaryUploadService {
  private isConfigured: boolean;

  constructor() {
    // Configure Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true, // Use HTTPS
      });
      this.isConfigured = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Cloudinary configured successfully');
      }
    } else {
      this.isConfigured = false;
      // Only show warning in development, silent in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Cloudinary not configured. File uploads will be disabled. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables to enable.');
      }
    }
  }

  async uploadPackageImage(
    file: MulterFile,
    userId: string,
    packageId?: string,
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      // Validate image
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        throw new AppError(
          `Invalid image: ${validation.errors.join(', ')}`,
          'INVALID_IMAGE',
          400,
        );
      }

      // Additional content validation
      const isContentValid = await this.validateImageContent(file.buffer);
      if (!isContentValid) {
        throw new AppError(
          'Invalid image content detected',
          'INVALID_IMAGE_CONTENT',
          400,
        );
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(file.originalname);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(16).toString('hex');
      const publicId = `${userId}/${packageId || 'temp'}/${timestamp}-${randomString}`;

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: 'ntsamaela/packages',
            resource_type: 'image',
            format: fileExtension,
            overwrite: false,
            invalidate: true,
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
            // Use context instead of metadata (Cloudinary doesn't support arbitrary metadata)
            context: {
              userId: userId,
              packageId: packageId || 'temp',
              uploadedAt: new Date().toISOString(),
              originalName: file.originalname,
            },
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        key: result.public_id,
        bucket: 'ntsamaela/packages',
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      // Log the actual error for debugging
      console.error('Cloudinary upload error:', _error);
      throw new AppError(
        `Failed to upload image: ${_error.message || 'Unknown error'}`,
        'UPLOAD_ERROR',
        500,
      );
    }
  }

  async uploadProfilePicture(
    file: MulterFile,
    userId: string,
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      // Validate image
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        throw new AppError(
          `Invalid image: ${validation.errors.join(', ')}`,
          'INVALID_IMAGE',
          400,
        );
      }

      // Additional content validation
      const isContentValid = await this.validateImageContent(file.buffer);
      if (!isContentValid) {
        throw new AppError(
          'Invalid image content detected',
          'INVALID_IMAGE_CONTENT',
          400,
        );
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(file.originalname);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(16).toString('hex');
      const publicId = `${userId}/${timestamp}-${randomString}`;

      // Upload to Cloudinary with automatic face detection and cropping
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: 'ntsamaela/profiles',
            resource_type: 'image',
            format: fileExtension,
            overwrite: false,
            invalidate: true,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
            // Use context instead of metadata
            context: {
              userId: userId,
              uploadedAt: new Date().toISOString(),
              originalName: file.originalname,
              type: 'profile-picture',
            },
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        key: result.public_id,
        bucket: 'ntsamaela/profiles',
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        `Failed to upload profile picture: ${_error.message || 'Unknown error'}`,
        'UPLOAD_ERROR',
        500,
      );
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      // Extract public_id from URL if full URL is provided
      const id = this.extractPublicIdFromUrl(publicId) || publicId;

      await cloudinary.uploader.destroy(id, {
        invalidate: true,
      });
    } catch (_error: any) {
      throw new AppError(
        `Failed to delete image: ${_error.message || 'Unknown error'}`,
        'DELETE_ERROR',
        500,
      );
    }
  }

  async getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      // Extract public_id from URL if full URL is provided
      const id = this.extractPublicIdFromUrl(publicId) || publicId;

      // Generate signed URL (Cloudinary uses signed URLs for private resources)
      // For public resources, just return the secure URL
      const url = cloudinary.url(id, {
        secure: true,
        sign_url: expiresIn > 0,
        expires_at: expiresIn > 0 ? Math.floor(Date.now() / 1000) + expiresIn : undefined,
      });

      return url;
    } catch (_error: any) {
      throw new AppError(
        `Failed to generate signed URL: ${_error.message || 'Unknown error'}`,
        'SIGNED_URL_ERROR',
        500,
      );
    }
  }

  /**
   * Upload any file type to Cloudinary
   */
  async uploadFile(
    file: MulterFile,
    folder: string = 'uploads',
    options: {
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      transformation?: any[];
      metadata?: Record<string, string>;
    } = {}
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      const fileExtension = this.getFileExtension(file.originalname);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(16).toString('hex');
      const publicId = `${timestamp}-${randomString}`;

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: `ntsamaela/${folder}`,
            resource_type: options.resourceType || 'auto',
            format: fileExtension,
            overwrite: false,
            invalidate: true,
            transformation: options.transformation || [{ quality: 'auto' }],
            // Use context instead of metadata
            context: {
              uploadedAt: new Date().toISOString(),
              originalName: file.originalname,
              ...(options.metadata ? Object.fromEntries(
                Object.entries(options.metadata).map(([k, v]) => [k, String(v)])
              ) : {}),
            },
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        key: result.public_id,
        bucket: `ntsamaela/${folder}`,
      };
    } catch (_error: any) {
      throw new AppError(
        `Failed to upload file: ${_error.message || 'Unknown error'}`,
        'UPLOAD_ERROR',
        500,
      );
    }
  }

  private validateImage(file: MulterFile): ImageValidationResult {
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
      'image/webp',
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
      errors,
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
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx)$/i, // Executable extensions
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(filename));
  }

  // Additional security validation for image content
  async validateImageContent(buffer: Buffer): Promise<boolean> {
    try {
      // Check for common image file signatures
      const signatures = {
        jpeg: [0xff, 0xd8, 0xff],
        png: [0x89, 0x50, 0x4e, 0x47],
        webp: [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
      };

      const header = Array.from(buffer.slice(0, 10));

      // Check JPEG signature
      if (
        header[0] === signatures.jpeg[0] &&
        header[1] === signatures.jpeg[1] &&
        header[2] === signatures.jpeg[2]
      ) {
        return true;
      }

      // Check PNG signature
      if (signatures.png.every((byte, index) => header[index] === byte)) {
        return true;
      }

      // Check WebP signature (RIFF + WEBP)
      if (
        signatures.webp.every((byte, index) => header[index] === byte) &&
        header[8] === 0x57 &&
        header[9] === 0x45
      ) {
        // "WE" of "WEBP"
        return true;
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate transformed image URL with Cloudinary transformations
   */
  getTransformedImageUrl(publicId: string, transformations: any): string {
    if (!this.isConfigured) {
      throw new AppError('Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED', 500);
    }

    try {
      // Extract public_id from URL if full URL is provided
      const id = this.extractPublicIdFromUrl(publicId) || publicId;

      // Generate URL with transformations
      const url = cloudinary.url(id, {
        secure: true,
        transformation: [transformations],
      });

      return url;
    } catch (_error: any) {
      throw new AppError(
        `Failed to generate transformed image URL: ${_error.message || 'Unknown error'}`,
        'TRANSFORMED_URL_ERROR',
        500,
      );
    }
  }
}

export default new CloudinaryUploadService();

