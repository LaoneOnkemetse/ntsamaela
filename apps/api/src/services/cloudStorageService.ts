/**
 * S3 Upload Service (Legacy Compatibility Layer)
 * This service now delegates all operations to Cloudinary.
 * Kept for backward compatibility with existing code.
 */

import { AppError } from "../utils/AppError";
import cloudinaryUploadService from "./cloudinaryUploadService";

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
  key: string;
  bucket: string;
}

interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
}

class CloudStorageService {
  // All operations delegate to Cloudinary
  constructor() {
    // Service is now a compatibility layer for Cloudinary
  }

  async uploadPackageImage(
    file: MulterFile,
    userId: string,
    packageId?: string,
  ): Promise<UploadResult> {
    // Use Cloudinary for cloud storage
    try {
      return await cloudinaryUploadService.uploadPackageImage(file, userId, packageId);
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError("Failed to upload image", "UPLOAD_ERROR", 500);
    }
  }

  async uploadProfilePicture(
    file: MulterFile,
    userId: string,
  ): Promise<UploadResult> {
    // Use Cloudinary for cloud storage
    try {
      return await cloudinaryUploadService.uploadProfilePicture(file, userId);
    } catch (_error: any) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError(
        "Failed to upload profile picture",
        "UPLOAD_ERROR",
        500,
      );
    }
  }

  async deleteImage(key: string): Promise<void> {
    // Use Cloudinary for cloud storage
    try {
      await cloudinaryUploadService.deleteImage(key);
    } catch (_error: any) {
      throw new AppError("Failed to delete image", "DELETE_ERROR", 500);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Use Cloudinary for cloud storage
    try {
      return await cloudinaryUploadService.getSignedUrl(key, expiresIn);
    } catch (_error: any) {
      throw new AppError(
        "Failed to generate signed URL",
        "SIGNED_URL_ERROR",
        500,
      );
    }
  }

  private validateImage(file: MulterFile): ImageValidationResult {
    const errors: string[] = [];

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push("File size exceeds 10MB limit");
    }

    // Check file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push("Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Check file extension
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExtension = this.getFileExtension(
      file.originalname,
    ).toLowerCase();

    if (!allowedExtensions.includes(`.${fileExtension}`)) {
      errors.push("Invalid file extension");
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.originalname)) {
      errors.push("Suspicious file name detected");
    }

    // Basic buffer validation
    if (!file.buffer || file.buffer.length === 0) {
      errors.push("Empty file buffer");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private getFileExtension(filename: string): string {
    return filename.split(".").pop() || "";
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
}

export default new CloudStorageService();
