import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { AppError } from '../utils/errors';

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
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'ntsamaela-packages';
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
   * Upload optimized image to S3
   */
  async uploadOptimizedImage(
    buffer: Buffer,
    key: string,
    options: ImageOptimizationOptions = {}
  ): Promise<{ url: string; key: string; metadata: any }> {
    try {
      const optimized = await this.optimizeImage(buffer, options);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: optimized.buffer,
        ContentType: `image/${optimized.metadata.format}`,
        CacheControl: 'max-age=31536000', // 1 year cache
        Metadata: {
          'original-size': optimized.metadata.originalSize.toString(),
          'optimized-size': optimized.metadata.size.toString(),
          'compression-ratio': optimized.metadata.compressionRatio.toString(),
          'dimensions': `${optimized.metadata.width}x${optimized.metadata.height}`
        }
      });

      await this.s3.send(command);

      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;
      
      return {
        url,
        key,
        metadata: optimized.metadata
      };
    } catch (_error) {
      throw new AppError('Failed to upload optimized image', 'IMAGE_UPLOAD_FAILED', 500);
    }
  }

  /**
   * Upload responsive images to S3
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
        
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: image.buffer,
          ContentType: `image/${image.metadata.format}`,
          CacheControl: 'max-age=31536000',
          Metadata: {
            'dimensions': `${image.metadata.width}x${image.metadata.height}`,
            'size': image.metadata.size.toString()
          }
        });

        await this.s3.send(command);
        
        return {
          suffix: image.suffix,
          url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
          key,
          metadata: image.metadata
        };
      });

      return await Promise.all(uploadPromises);
    } catch (_error) {
      throw new AppError('Failed to upload responsive images', 'RESPONSIVE_UPLOAD_FAILED', 500);
    }
  }

  /**
   * Generate signed URL for optimized image
   */
  async getOptimizedImageUrl(
    key: string,
    options: ImageOptimizationOptions = {},
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // First, get the original image
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3.send(getCommand);
      
      if (!response.Body) {
        throw new AppError('Image not found', 'IMAGE_NOT_FOUND', 404);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      // Optimize the image
      const optimized = await this.optimizeImage(buffer, options);
      
      // Upload optimized version with a temporary key
      const optimizedKey = `optimized/${Date.now()}-${key}`;
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: optimizedKey,
        Body: optimized.buffer,
        ContentType: `image/${optimized.metadata.format}`,
        CacheControl: 'max-age=3600' // 1 hour cache for temporary optimized images
      });

      await this.s3.send(uploadCommand);

      // Generate signed URL for the optimized image
      const signedUrlCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: optimizedKey
      });

      return await getSignedUrl(this.s3, signedUrlCommand, { expiresIn });
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
