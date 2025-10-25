import { Request, Response } from 'express';
import { PackageController } from '../packageController';
import { AppError } from '../../utils/AppError';
import packageService from '../../services/packageService';
import { validationResult } from 'express-validator';

// Mock the PackageService
jest.mock('../../services/packageService', () => ({
  __esModule: true,
  default: {
    createPackage: jest.fn(),
    getPackages: jest.fn(),
    getPackageById: jest.fn(),
    updatePackageStatus: jest.fn(),
    deletePackage: jest.fn(),
    searchPackages: jest.fn(),
    getPackageAnalytics: jest.fn()
  }
}));

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

// Mock s3UploadService
jest.mock('../../services/s3UploadService', () => ({
  __esModule: true,
  default: {
    uploadPackageImage: jest.fn()
  }
}));

describe('PackageController', () => {
  let packageController: PackageController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    packageController = new PackageController();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123', userType: 'CUSTOMER' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Mock validationResult to return no errors by default
    (validationResult as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPackage', () => {
    it('should create a package successfully', async () => {
      const packageData = {
        description: 'Test Description',
        pickupAddress: '123 Main St',
        pickupLat: '40.7128',
        pickupLng: '-74.0060',
        deliveryAddress: '456 Oak Ave',
        deliveryLat: '40.7589',
        deliveryLng: '-73.9851',
        priceOffered: '25.00',
        size: 'MEDIUM',
        weight: '5.5'
      };

      mockRequest.body = packageData;
      const createdPackage = { id: 'package-123', ...packageData, status: 'PENDING' };
      (packageService.createPackage as jest.Mock).mockResolvedValue(createdPackage);

      await packageController.createPackage(mockRequest as Request, mockResponse as Response);

      expect(packageService.createPackage).toHaveBeenCalledWith({
        customerId: 'user-123',
        description: 'Test Description',
        pickupAddress: '123 Main St',
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryAddress: '456 Oak Ave',
        deliveryLat: 40.7589,
        deliveryLng: -73.9851,
        priceOffered: 25.00,
        size: 'MEDIUM',
        weight: 5.5
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdPackage,
        message: 'Package created successfully'
      });
    });

    it('should handle validation errors', async () => {
      const packageData = {
        description: '', // Invalid: empty description
        weight: '-1', // Invalid: negative weight
        priceOffered: '0' // Invalid: zero price
      };

      mockRequest.body = packageData;
      
      // Mock validationResult to return errors
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Validation failed', param: 'description' }]
      });

      await packageController.createPackage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [{ msg: 'Validation failed', param: 'description' }]
        }
      });
    });

    it('should handle service errors', async () => {
      const packageData = {
        description: 'Test Description',
        weight: '5.5',
        priceOffered: '25.00'
      };

      mockRequest.body = packageData;
      (packageService.createPackage as jest.Mock).mockRejectedValue(
        new AppError('INTERNAL_ERROR', 'Database error', 500)
      );

      await packageController.createPackage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error',
          code: 'INTERNAL_ERROR'
        }
      });
    });
  });

  describe('getPackages', () => {
    it('should get packages with default filters', async () => {
      const packages = [
        { id: 'package-1', title: 'Package 1', status: 'PENDING' },
        { id: 'package-2', title: 'Package 2', status: 'ACTIVE' }
      ];

      (packageService.getPackages as jest.Mock).mockResolvedValue(packages);

      await packageController.getPackages(mockRequest as Request, mockResponse as Response);

      expect(packageService.getPackages).toHaveBeenCalledWith({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: packages
      });
    });

    it('should get packages with custom filters', async () => {
      const filters = {
        status: 'PENDING',
        minPrice: '10',
        maxPrice: '50'
      };

      mockRequest.query = filters;
      const packages = [{ id: 'package-1', title: 'Package 1', status: 'PENDING' }];
      (packageService.getPackages as jest.Mock).mockResolvedValue(packages);

      await packageController.getPackages(mockRequest as Request, mockResponse as Response);

      expect(packageService.getPackages).toHaveBeenCalledWith({
        status: 'PENDING',
        minPrice: 10,
        maxPrice: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: packages
      });
    });

    it('should handle service errors', async () => {
      (packageService.getPackages as jest.Mock).mockRejectedValue(
        new AppError('INTERNAL_ERROR', 'Database error', 500)
      );

      await packageController.getPackages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error',
          code: 'INTERNAL_ERROR'
        }
      });
    });
  });

  describe('getPackageById', () => {
    it('should get package by ID successfully', async () => {
      const packageId = 'package-123';
      const packageData = {
        id: packageId,
        title: 'Test Package',
        status: 'PENDING'
      };

      mockRequest.params = { id: packageId };
      (packageService.getPackageById as jest.Mock).mockResolvedValue(packageData);

      await packageController.getPackageById(mockRequest as Request, mockResponse as Response);

      expect(packageService.getPackageById).toHaveBeenCalledWith(packageId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: packageData
      });
    });

    it('should handle package not found', async () => {
      const packageId = 'non-existent';
      mockRequest.params = { id: packageId };
      (packageService.getPackageById as jest.Mock).mockRejectedValue(
        new AppError('NOT_FOUND', 'Package not found', 404)
      );

      await packageController.getPackageById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Package not found',
          code: 'NOT_FOUND'
        }
      });
    });
  });

  describe('updatePackageStatus', () => {
    it('should update package status successfully', async () => {
      const packageId = 'package-123';
      const status = 'ACTIVE';
      const updatedPackage = {
        id: packageId,
        title: 'Test Package',
        status: status
      };

      mockRequest.params = { id: packageId };
      mockRequest.body = { status };
      mockRequest.user = { id: 'user-123', role: 'CUSTOMER' };
      
      // Mock getPackageById to return a package owned by the user
      packageService.getPackageById.mockResolvedValue({
        data: {
          id: packageId,
          customerId: 'user-123',
          status: 'PENDING'
        }
      });
      
      (packageService.updatePackageStatus as jest.Mock).mockResolvedValue({
        data: updatedPackage
      });

      await packageController.updatePackageStatus(mockRequest as Request, mockResponse as Response);

      expect(packageService.updatePackageStatus).toHaveBeenCalledWith(
        packageId,
        { status: 'ACTIVE', notes: undefined }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedPackage,
        message: 'Package status updated successfully'
      });
    });

    it('should handle unauthorized access', async () => {
      const packageId = 'package-123';
      const status = 'ACTIVE';

      mockRequest.params = { id: packageId };
      mockRequest.body = { status };
      mockRequest.user = { id: 'user-123', role: 'CUSTOMER' };
      
      // Mock getPackageById to return a package owned by a different user
      packageService.getPackageById.mockResolvedValue({
        data: {
          id: packageId,
          customerId: 'different-user',
          status: 'PENDING'
        }
      });

      await packageController.updatePackageStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. You can only update your own packages.',
          code: 'ACCESS_DENIED'
        }
      });
    });
  });

  describe('deletePackage', () => {
    it('should delete package successfully', async () => {
      const packageId = 'package-123';
      mockRequest.params = { id: packageId };
      (packageService.deletePackage as jest.Mock).mockResolvedValue({ message: 'Package deleted successfully' });

      await packageController.deletePackage(mockRequest as Request, mockResponse as Response);

      expect(packageService.deletePackage).toHaveBeenCalledWith(
        packageId,
        'user-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Package deleted successfully'
      });
    });

    it('should handle package not found', async () => {
      const packageId = 'non-existent';
      mockRequest.params = { id: packageId };
      (packageService.deletePackage as jest.Mock).mockRejectedValue(
        new AppError('NOT_FOUND', 'Package not found', 404)
      );

      await packageController.deletePackage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Package not found',
          code: 'NOT_FOUND'
        }
      });
    });
  });

  describe('searchPackages', () => {
    it('should search packages successfully', async () => {
      const searchQuery = 'electronics';
      const packages = [
        { id: 'package-1', title: 'Electronics Package', status: 'PENDING' }
      ];

      mockRequest.query = { q: searchQuery };
      packageService.getPackages.mockResolvedValue({
        data: packages
      });

      await packageController.searchPackages(mockRequest as Request, mockResponse as Response);

      expect(packageService.getPackages).toHaveBeenCalledWith({
        search: searchQuery,
        limit: 20,
        offset: 0
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: packages,
        searchParams: {
          query: searchQuery,
          location: undefined,
          radius: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          size: undefined
        }
      });
    });

    it('should handle empty search results', async () => {
      const searchQuery = 'nonexistent';
      mockRequest.query = { q: searchQuery };
      packageService.getPackages.mockResolvedValue({
        data: []
      });

      await packageController.searchPackages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        searchParams: {
          query: searchQuery,
          location: undefined,
          radius: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          size: undefined
        }
      });
    });
  });

});
