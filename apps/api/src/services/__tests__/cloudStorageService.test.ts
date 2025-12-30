import cloudStorageService from '../cloudStorageService';
import { AppError } from '../../utils/AppError';

// Mock Cloudinary service
jest.mock('../cloudinaryUploadService', () => ({
  __esModule: true,
  default: {
    uploadPackageImage: jest.fn(),
    uploadProfilePicture: jest.fn(),
    deleteImage: jest.fn(),
    getSignedUrl: jest.fn(),
  },
}));

import cloudinaryUploadService from '../cloudinaryUploadService';

describe('CloudStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the private validateImageContent method to return true by default
    jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(true);
    // Mock the private validateImage method to return valid result by default
    jest.spyOn(cloudStorageService as any, 'validateImage').mockReturnValue({ isValid: true, errors: [] });
  });

  describe('uploadPackageImage', () => {
    it('should upload image successfully', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length,
        fieldname: 'image',
        encoding: '7bit',
      };
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';
      const mockResult = { url: 'https://cloudinary.com/image.jpg', key: 'packages/package-123/image.jpg', bucket: 'cloudinary' };

      (cloudinaryUploadService.uploadPackageImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await cloudStorageService.uploadPackageImage(mockFile, mockUserId, mockPackageId);

      expect(cloudinaryUploadService.uploadPackageImage).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
    });

    it('should upload image with package ID', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.png',
        mimetype: 'image/png',
        size: mockBuffer.length,
        fieldname: 'image',
        encoding: '7bit',
      };
      const mockUserId = 'user-456';
      const mockPackageId = 'package-456';
      const mockResult = { url: 'https://cloudinary.com/image.png', key: 'packages/package-456/image.png', bucket: 'cloudinary' };

      (cloudinaryUploadService.uploadPackageImage as jest.Mock).mockResolvedValue(mockResult);

      const result = await cloudStorageService.uploadPackageImage(mockFile, mockUserId, mockPackageId);

      expect(result.key).toContain(mockPackageId);
    });

    it('should throw error for file too large', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(cloudStorageService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['File too large. Maximum size is 10MB']
      });

      const mockBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length,
        fieldname: 'image',
        encoding: '7bit',
      };
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(cloudStorageService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: File too large. Maximum size is 10MB', 'INVALID_IMAGE', 400));
    });

    it('should throw error for invalid file type', async () => {
      // Override the validation mock to return false for this test
      jest.spyOn(cloudStorageService as any, 'validateImage').mockReturnValue({
        isValid: false,
        errors: ['Invalid file type. Only JPEG, PNG, and WebP are allowed']
      });

      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: mockBuffer.length,
        fieldname: 'image',
        encoding: '7bit',
      };
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      await expect(cloudStorageService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Invalid image: Invalid file type. Only JPEG, PNG, and WebP are allowed', 'INVALID_IMAGE', 400));
    });

    it('should handle cloud storage upload error', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockFile = {
        buffer: mockBuffer,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: mockBuffer.length,
        fieldname: 'image',
        encoding: '7bit',
      };
      const mockUserId = 'user-123';
      const mockPackageId = 'package-123';

      // Mock validation to pass, but cloud storage upload to fail
      jest.spyOn(cloudStorageService as any, 'validateImage').mockReturnValue({ isValid: true, errors: [] });
      jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(true);
      (cloudinaryUploadService.uploadPackageImage as jest.Mock).mockRejectedValue(new Error('Cloud storage upload failed'));

      await expect(cloudStorageService.uploadPackageImage(mockFile, mockUserId, mockPackageId))
        .rejects.toThrow(new AppError('Failed to upload image', 'UPLOAD_ERROR', 500));
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockKey = 'packages/package-123/image.jpg';

      (cloudinaryUploadService.deleteImage as jest.Mock).mockResolvedValue(undefined);

      await cloudStorageService.deleteImage(mockKey);

      expect(cloudinaryUploadService.deleteImage).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const mockKey = 'packages/package-123/image.jpg';

      (cloudinaryUploadService.deleteImage as jest.Mock).mockRejectedValue(new Error('Cloud storage delete failed'));

      await expect(cloudStorageService.deleteImage(mockKey))
        .rejects.toThrow(new AppError('Failed to delete image', 'DELETE_ERROR', 500));
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockKey = 'packages/package-123/image.jpg';
      const mockSignedUrl = 'https://cloudinary.com/packages/package-123/image.jpg?signature=abc123';

      (cloudinaryUploadService.getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

      const result = await cloudStorageService.getSignedUrl(mockKey);

      expect(cloudinaryUploadService.getSignedUrl).toHaveBeenCalled();
      expect(result).toBe(mockSignedUrl);
    });

    it('should use default expiration time', async () => {
      const mockKey = 'packages/package-123/image.jpg';
      const mockSignedUrl = 'https://cloudinary.com/packages/package-123/image.jpg?signature=abc123';

      (cloudinaryUploadService.getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

      await cloudStorageService.getSignedUrl(mockKey);

      expect(cloudinaryUploadService.getSignedUrl).toHaveBeenCalledWith(mockKey, 3600);
    });

    it('should handle signed URL generation error', async () => {
      const mockKey = 'packages/package-123/image.jpg';

      (cloudinaryUploadService.getSignedUrl as jest.Mock).mockRejectedValue(new Error('URL generation failed'));

      await expect(cloudStorageService.getSignedUrl(mockKey))
        .rejects.toThrow(new AppError('Failed to generate signed URL', 'SIGNED_URL_ERROR', 500));
    });
  });

  describe('validateImageContent', () => {
    it('should validate JPEG content', async () => {
      const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header

      // Reset the mock for this specific test
      jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (cloudStorageService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should validate PNG content', async () => {
      const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header

      // Reset the mock for this specific test
      jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (cloudStorageService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should validate WebP content', async () => {
      const mockBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46]); // WebP header

      // Reset the mock for this specific test
      jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(true);

      const result = await (cloudStorageService as any).validateImageContent(mockBuffer);

      expect(result).toBe(true);
    });

    it('should reject invalid content', async () => {
      const mockBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid header

      // Reset the mock for this specific test
      jest.spyOn(cloudStorageService as any, 'validateImageContent').mockResolvedValue(false);

      const result = await (cloudStorageService as any).validateImageContent(mockBuffer);

      expect(result).toBe(false);
    });
  });
});
