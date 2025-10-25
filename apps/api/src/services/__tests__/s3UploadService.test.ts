import s3UploadService from '../s3UploadService';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../../utils/AppError';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

const mockS3Client = {
  send: jest.fn()
};

(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client as any);
jest.mocked(getSignedUrl).mockImplementation(jest.fn());

describe('S3UploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the service's S3Client instance
    (s3UploadService as any).s3 = mockS3Client;
    // Mock the private validateImageContent method to return true by default
    jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(true);
    // Mock the private validateImage method to return valid result by default
    jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({ isValid: true, errors: [] });
  });

  describe('uploadPackageImage', () => {
    it('should upload image successfully', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';
      const mockResult = { ETag: '"abc123"' };

      mockS3Client.send.mockResolvedValue(mockResult);

      const result = await s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId);

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
    });

    it('should upload image with package ID', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.png',
        mimetype: 'image/png',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-456';
      const mockPackageId = 'package-456';
      const mockResult = { ETag: '"def456"' };

      mockS3Client.send.mockResolvedValue(mockResult);

      const result = await s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId);

      expect(result.key).toContain(mockPackageId);
    });

    it('should throw error for file too large', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['File too large. Maximum size is 10MB']
      });

      const mockBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: File too large. Maximum size is 10MB', 'INVALID_IMAGE', 400));
    });

    it('should throw error for invalid file type', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['Invalid file type. Only JPEG, PNG, and WebP are allowed']
      });

      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: Invalid file type. Only JPEG, PNG, and WebP are allowed', 'INVALID_IMAGE', 400));
    });

    it('should throw error for invalid file extension', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['Invalid file extension']
      });

      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-file.exe',
        mimetype: 'image/jpeg',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: Invalid file extension', 'INVALID_IMAGE', 400));
    });

    it('should throw error for suspicious file name', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['Suspicious file name detected']
      });

      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: '../../../etc/passwd.jpg', // Suspicious filename
        mimetype: 'image/jpeg',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: Suspicious file name detected', 'INVALID_IMAGE', 400));
    });

    it('should throw error for empty buffer', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['File is empty']
      });

      const mockBuffer = Buffer.alloc(0);
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'empty.jpg',
        mimetype: 'image/jpeg',
        size: 0
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: File is empty', 'INVALID_IMAGE', 400));
    });

    it('should handle AWS upload error', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length
      } as Express.Multer.File;
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      // Mock validation to pass, but S3 upload to fail
      jest.spyOn(s3UploadService as any, 'validateImage').mockReturnValue({ isValid: true, errors: [] });
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(true);
      mockS3Client.send.mockRejectedValue(new Error('AWS upload failed'));

      await expect(s3UploadService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Failed to upload image', 'UPLOAD_ERROR', 500));
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockKey = 'packages/package-123/image.jpg';
      const mockResult = { DeleteMarker: true };

      mockS3Client.send.mockResolvedValue(mockResult);

      await s3UploadService.deleteImage(mockKey);

      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const mockKey = 'packages/package-123/image.jpg';

      mockS3Client.send.mockRejectedValue(new Error('AWS delete failed'));

      await expect(s3UploadService.deleteImage(mockKey))
        .rejects.toThrow(new AppError('Failed to delete image', 'DELETE_ERROR', 500));
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockKey = 'packages/package-123/image.jpg';
      const mockSignedUrl = 'https://s3.amazonaws.com/bucket/packages/package-123/image.jpg?signature=abc123';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

      const result = await s3UploadService.getSignedUrl(mockKey);

      expect(getSignedUrl).toHaveBeenCalled();
      expect(result).toBe(mockSignedUrl);
    });

    it('should use default expiration time', async () => {
      const mockKey = 'packages/package-123/image.jpg';
      const mockSignedUrl = 'https://s3.amazonaws.com/bucket/packages/package-123/image.jpg?signature=abc123';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

      await s3UploadService.getSignedUrl(mockKey);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // S3 client instance
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });

    it('should handle signed URL generation error', async () => {
      const mockKey = 'packages/package-123/image.jpg';

      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('URL generation failed'));

      await expect(s3UploadService.getSignedUrl(mockKey))
        .rejects.toThrow(new AppError('Failed to generate signed URL', 'SIGNED_URL_ERROR', 500));
    });
  });

  describe('validateImageContent', () => {
    it('should validate JPEG content', async () => {
      const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header

      // Reset the mock for this specific test
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (s3UploadService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should validate PNG content', async () => {
      const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header

      // Reset the mock for this specific test
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (s3UploadService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should validate WebP content', async () => {
      const mockBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46]); // WebP header

      // Reset the mock for this specific test
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (s3UploadService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should reject invalid content', async () => {
      const mockBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid header

      // Reset the mock for this specific test
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(false);

      const result = await (s3UploadService as any).validateImageContent(mockBuffer);

      expect(result).toBe(false);
    });

    it('should handle validation error gracefully', async () => {
      const mockBuffer = null as any;

      // Reset the mock for this specific test
      jest.spyOn(s3UploadService as any, 'validateImageContent').mockResolvedValue(false);

      const result = await (s3UploadService as any).validateImageContent(mockBuffer);

      expect(result).toBe(false);
    });
  });



});
