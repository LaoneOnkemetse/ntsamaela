/**
 * Image Optimization Service
 * Uses Cloudinary for storage and Sharp for local optimization.
 * Cloudinary provides built-in image optimization and transformations.
 */

import sharp from 'sharp';
import { AppError } from '../utils/errors';
import cloudinaryUploadService from './cloudinaryUploadService';

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

interface OptimizedImageResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    originalSize: number;
    compressionRatio: number;
  };
}

class ImageOptimizationService {
  // No AWS dependencies - uses Cloudinary for storage
  constructor() {
    // Service uses Cloudinary for storage and Sharp for local optimization
  }

  /**
   * Optimize image buffer with various compression options
   */
  async optimizeImage(
    buffer: Buffer, 
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format = 'jpeg',
        progressive = true
      } = options;

      const originalSize = buffer.length;
      let sharpInstance = sharp(buffer);

      // Get original metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize if needed
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
      }

      // Apply format-specific optimizations
      let optimizedBuffer: Buffer;
      
      switch (format) {
        case 'jpeg':
          optimizedBuffer = await sharpInstance
            .jpeg({ 
              quality, 
              progressive,
              mozjpeg: true // Use mozjpeg encoder for better compression
            })
            .toBuffer();
          break;
          
        case 'png':
          optimizedBuffer = await sharpInstance
            .png({ 
              quality,
              progressive,
              compressionLevel: 9
            })
            .toBuffer();
          break;
          
        case 'webp':
          optimizedBuffer = await sharpInstance
            .webp({ 
              quality,
              lossless: false
            })
            .toBuffer();
          break;
          
        default:
          throw new AppError('Unsupported image format', 'INVALID_FORMAT', 400);
      }

      // Get optimized metadata
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();
      
      return {
        buffer: optimizedBuffer,
        metadata: {
          width: optimizedMetadata.width || 0,
          height: optimizedMetadata.height || 0,
          format: optimizedMetadata.format || format,
          size: optimizedBuffer.length,
          originalSize,
          compressionRatio: originalSize / optimizedBuffer.length
        }
      };
    } catch (_error) {
      throw new AppError('Failed to optimize image', 'IMAGE_OPTIMIZATION_FAILED', 500);
    }
  }

  /**
   * Generate multiple image sizes for responsive loading
   */
  async generateResponsiveImages(
    buffer: Buffer,
    sizes: Array<{ width: number; height: number; suffix: string }>
  ): Promise<Array<{ suffix: string; buffer: Buffer; metadata: any }>> {
    try {
      const results = await Promise.all(
        sizes.map(async (size) => {
          const optimized = await this.optimizeImage(buffer, {
            maxWidth: size.width,
            maxHeight: size.height,
            quality: 85,
            format: 'jpeg'
          });

          return {
            suffix: size.suffix,
            buffer: optimized.buffer,
            metadata: optimized.metadata
          };
        })
      );

      return results;
    } catch (_error) {
      throw new AppError('Failed to generate responsive images', 'RESPONSIVE_IMAGE_FAILED', 500);
    }
  }

  /**
   * Upload optimized image to Cloudinary (replaces S3)
   * Cloudinary automatically optimizes images, so we use its built-in optimization
   */
  async uploadOptimizedImage(
    buffer: Buffer,
    key: string,
    options: ImageOptimizationOptions = {}
  ): Promise<{ url: string; key: string; metadata: any }> {
    try {
      // Convert buffer to MulterFile format for Cloudinary
      const multerFile = {
        fieldname: 'image',
        originalname: key.split('/').pop() || 'image.jpg',
        encoding: '7bit',
        mimetype: `image/${options.format || 'jpeg'}`,
        size: buffer.length,
        buffer: buffer,
      };

      // Extract folder from key
      const folder = key.split('/').slice(0, -1).join('/') || 'optimized';

      // Upload to Cloudinary with automatic optimization
      const result = await cloudinaryUploadService.uploadFile(multerFile, folder, {
        resourceType: 'image',
        transformation: [
          ...(options.maxWidth || options.maxHeight ? [{
            width: options.maxWidth,
            height: options.maxHeight,
            crop: 'limit',
          }] : []),
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      // Get metadata from optimized image
      const optimized = await this.optimizeImage(buffer, options);
      
      return {
        url: result.url,
        key: result.key,
        metadata: {
          ...optimized.metadata,
          cloudinaryUrl: result.url,
        }
      };
    } catch (_error) {
      throw new AppError('Failed to upload optimized image', 'IMAGE_UPLOAD_FAILED', 500);
    }
  }

  /**
   * Upload responsive images to Cloudinary
   */
  async uploadResponsiveImages(
    buffer: Buffer,
    baseKey: string,
    sizes: Array<{ width: number; height: number; suffix: string }>
  ): Promise<Array<{ suffix: string; url: string; key: string; metadata: any }>> {
    try {
      const responsiveImages = await this.generateResponsiveImages(buffer, sizes);
      
      const uploadPromises = responsiveImages.map(async (image) => {
        const key = baseKey.replace(/(\.[^.]+)$/, `${image.suffix}$1`);
        
        // Convert to MulterFile format for Cloudinary
        const multerFile = {
          fieldname: 'image',
          originalname: key.split('/').pop() || 'image.jpg',
          encoding: '7bit',
          mimetype: `image/${image.metadata.format}`,
          size: image.buffer.length,
          buffer: image.buffer,
        };

        // Extract folder from key
        const folder = key.split('/').slice(0, -1).join('/') || 'responsive';

        // Upload to Cloudinary
        const result = await cloudinaryUploadService.uploadFile(multerFile, folder, {
          resourceType: 'image',
          transformation: [
            {
              width: image.metadata.width,
              height: image.metadata.height,
              crop: 'limit',
            },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        });
        
        return {
          suffix: image.suffix,
          url: result.url,
          key: result.key,
          metadata: image.metadata
        };
      });

      return await Promise.all(uploadPromises);
    } catch (_error) {
      throw new AppError('Failed to upload responsive images', 'RESPONSIVE_UPLOAD_FAILED', 500);
    }
  }

  /**
   * Generate optimized image URL using Cloudinary
   * Cloudinary handles optimization on-the-fly via URL transformations
   */
  async getOptimizedImageUrl(
    key: string,
    options: ImageOptimizationOptions = {},
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Cloudinary handles optimization on-the-fly via URL transformations
      // We can generate a transformed URL directly
      const transformations: any = {
        quality: options.quality || 'auto',
        format: options.format || 'auto',
      };
      
      if (options.progressive) {
        transformations.flags = 'progressive';
      }
      
      if (options.maxWidth || options.maxHeight) {
        transformations.width = options.maxWidth;
        transformations.height = options.maxHeight;
        transformations.crop = 'limit';
      }
      
      // Use Cloudinary's transformed URL generation
      const url = cloudinaryUploadService.getTransformedImageUrl(key, transformations);
      return url;
    } catch (_error) {
      throw new AppError('Failed to generate optimized image URL', 'OPTIMIZED_URL_FAILED', 500);
    }
  }

  /**
   * Validate image file
   */
  async validateImage(buffer: Buffer): Promise<{
    isValid: boolean;
    format?: string;
    width?: number;
    height?: number;
    size?: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Check file size (max 10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        errors.push('Image size exceeds 10MB limit');
      }
      
      // Check dimensions
      if (metadata.width && metadata.width > 5000) {
        errors.push('Image width exceeds 5000px limit');
      }
      
      if (metadata.height && metadata.height > 5000) {
        errors.push('Image height exceeds 5000px limit');
      }
      
      // Check format
      const supportedFormats = ['jpeg', 'png', 'webp', 'gif'];
      if (!metadata.format || !supportedFormats.includes(metadata.format)) {
        errors.push(`Unsupported image format: ${metadata.format}`);
      }
      
      return {
        isValid: errors.length === 0,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        errors
      };
    } catch (_error) {
      errors.push('Invalid image file');
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Get image optimization statistics
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    averageCompressionRatio: number;
    totalBytesSaved: number;
  } {
    // This would typically be stored in a database or cache
    // For now, return mock data
    return {
      totalOptimizations: 0,
      averageCompressionRatio: 0,
      totalBytesSaved: 0
    };
  }
}

export default new ImageOptimizationService();
