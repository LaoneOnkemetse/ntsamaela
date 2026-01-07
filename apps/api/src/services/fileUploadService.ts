import cloudinaryUploadService from "./cloudinaryUploadService";
import { AppError } from "../utils/AppError";

export interface UploadResponse {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
  key?: string;
}

// Type for multer file
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * Generic file upload service
 * Uses Cloudinary for actual uploads
 */
export class FileUploadService {
  /**
   * Upload a generic file to cloud storage
   * @param file - File buffer and metadata
   * @param userId - User ID for organizing files
   * @param folder - Optional folder path (e.g., 'documents', 'uploads')
   * @returns Upload response with URL and key
   */
  async uploadFile(
    file:
      | MulterFile
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
          size: number;
        },
    userId: string,
    folder: string = "uploads",
  ): Promise<UploadResponse> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      // Convert to MulterFile format if needed
      const multerFile: MulterFile = {
        fieldname: "file",
        originalname: file.originalname,
        encoding: "7bit",
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      };

      // Use cloud storage service for package images
      // For generic files, we'll create a similar upload method
      const result = await this.uploadToCloudStorage(
        multerFile,
        userId,
        folder,
      );

      return {
        success: true,
        url: result.url,
        key: result.key,
        message: "File uploaded successfully",
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        return {
          success: false,
          error: _error.message,
        };
      }
      return {
        success: false,
        error: "Failed to upload file",
      };
    }
  }

  /**
   * Upload image file (uses S3UploadService)
   */
  async uploadImage(
    file: Buffer | MulterFile,
    filename: string,
    userId?: string,
    packageId?: string,
  ): Promise<UploadResponse> {
    try {
      // Convert Buffer to MulterFile if needed
      let multerFile: MulterFile;
      if (Buffer.isBuffer(file)) {
        multerFile = {
          fieldname: "image",
          originalname: filename,
          encoding: "7bit",
          mimetype: this.getMimeType(filename),
          size: file.length,
          buffer: file,
        };
      } else {
        multerFile = file;
      }

      // Use Cloudinary upload service
      let result;
      if (packageId) {
        result = await cloudinaryUploadService.uploadPackageImage(
          multerFile,
          userId || "unknown",
          packageId,
        );
      } else if (userId) {
        result = await cloudinaryUploadService.uploadProfilePicture(
          multerFile,
          userId,
        );
      } else {
        // Generic image upload
        result = await cloudinaryUploadService.uploadFile(
          multerFile,
          "images",
          {
            metadata: { userId: userId || "unknown" },
          },
        );
      }

      return {
        success: true,
        url: result.url,
        key: result.key,
        message: "Image uploaded successfully",
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        return {
          success: false,
          error: _error.message,
        };
      }
      return {
        success: false,
        error: "Failed to upload image",
      };
    }
  }

  /**
   * Delete a file from cloud storage
   * @param urlOrKey - Cloud storage URL or key
   */
  async deleteImage(urlOrKey: string): Promise<UploadResponse> {
    try {
      // Cloudinary can extract public_id from URL automatically
      await cloudinaryUploadService.deleteImage(urlOrKey);

      return {
        success: true,
        message: "File deleted successfully",
      };
    } catch (_error: any) {
      if (_error instanceof AppError) {
        return {
          success: false,
          error: _error.message,
        };
      }
      return {
        success: false,
        error: "Failed to delete file",
      };
    }
  }

  /**
   * Generate a presigned URL for file access
   * @param key - S3 key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      return await cloudinaryUploadService.getSignedUrl(key, expiresIn);
    } catch (_error: any) {
      throw new AppError(
        "Failed to generate presigned URL",
        "PRESIGNED_URL_ERROR",
        500,
      );
    }
  }

  /**
   * Upload file to Cloudinary (internal method)
   */
  private async uploadToCloudStorage(
    file: MulterFile,
    userId: string,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    // Use Cloudinary for cloud storage
    const result = await cloudinaryUploadService.uploadFile(file, folder, {
      metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalname,
      },
    });

    return { url: result.url, key: result.key };
  }

  /**
   * Validate file before upload
   */
  private validateFile(
    file:
      | MulterFile
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
          size: number;
        },
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push("File size exceeds 10MB limit");
    }

    // Check if buffer exists
    if (!file.buffer || file.buffer.length === 0) {
      errors.push("Empty file buffer");
    }

    // Check file name
    if (!file.originalname || file.originalname.trim().length === 0) {
      errors.push("Invalid file name");
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.originalname)) {
      errors.push("Suspicious file name detected");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split(".").pop() || "";
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = this.getFileExtension(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Check for suspicious file names
   */
  private isSuspiciousFileName(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx)$/i, // Executable extensions
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Extract key from URL (works for both S3 and Cloudinary)
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      // Handle Cloudinary URLs: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}
      if (url.includes("cloudinary.com")) {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : null;
      }

      // Handle cloud storage URLs
      const cloudStorageUrlPattern = /https?:\/\/[^/]+\/(.+)$/;
      const match = url.match(cloudStorageUrlPattern);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Export convenience functions for backward compatibility
export const uploadImage = async (
  file: Buffer | MulterFile,
  filename: string,
  userId?: string,
  packageId?: string,
): Promise<UploadResponse> => {
  return await fileUploadService.uploadImage(file, filename, userId, packageId);
};

export const deleteImage = async (
  urlOrKey: string,
): Promise<UploadResponse> => {
  return await fileUploadService.deleteImage(urlOrKey);
};
