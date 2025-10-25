import { AppError } from '../../utils/AppError';

// Mock database
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  package: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  }
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

// Import after mocking
import packageService from '../packageService';

describe('PackageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPackage', () => {
    const mockPackageData = {
      customerId: 'customer-123',
      description: 'A small package for delivery',
      pickupAddress: '123 Main St, City, State',
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      deliveryAddress: '456 Oak Ave, City, State',
      deliveryLat: 40.7589,
      deliveryLng: -73.9851,
      priceOffered: 25.50,
      size: 'SMALL' as const,
      weight: 2.5
    };

    it('should create a package successfully', async () => {
      const mockCustomer = {
        id: 'customer-123',
        email: 'customer@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockCreatedPackage = {
        id: 'package-123',
        ...mockPackageData,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: mockCustomer
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.package.create.mockResolvedValue(mockCreatedPackage);

      const result = await packageService.createPackage(mockPackageData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedPackage);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-123' }
      });
      expect(mockPrisma.package.create).toHaveBeenCalledWith({
        data: {
          ...mockPackageData,
          status: 'PENDING'
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });
    });

    it('should throw error if customer not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(packageService.createPackage(mockPackageData))
        .rejects
        .toThrow(new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404));
    });

    it('should validate required fields', async () => {
      const invalidData = {
        ...mockPackageData,
        description: 'short' // Too short
      };

      await expect(packageService.createPackage(invalidData))
        .rejects
        .toThrow(new AppError('Description must be at least 10 characters long', 'INVALID_DESCRIPTION', 400));
    });

    it('should validate price range', async () => {
      const invalidData = {
        ...mockPackageData,
        priceOffered: -10 // Negative price
      };

      await expect(packageService.createPackage(invalidData))
        .rejects
        .toThrow(new AppError('Price offered must be greater than 0', 'INVALID_PRICE', 400));
    });

    it('should validate coordinates', async () => {
      const invalidData = {
        ...mockPackageData,
        pickupLat: 95 // Invalid latitude
      };

      await expect(packageService.createPackage(invalidData))
        .rejects
        .toThrow(new AppError('Invalid pickup latitude', 'INVALID_COORDINATES', 400));
    });

    it('should validate weight range', async () => {
      const invalidData = {
        ...mockPackageData,
        weight: 1500 // Too heavy
      };

      await expect(packageService.createPackage(invalidData))
        .rejects
        .toThrow(new AppError('Weight must be between 0 and 1000 kg', 'INVALID_WEIGHT', 400));
    });

    it('should validate package size', async () => {
      const invalidData = {
        ...mockPackageData,
        size: 'INVALID_SIZE' as any
      };

      await expect(packageService.createPackage(invalidData))
        .rejects
        .toThrow(new AppError('Invalid package size', 'INVALID_SIZE', 400));
    });
  });

  describe('getPackages', () => {
    it('should return packages with default filters', async () => {
      const mockPackages = [
        {
          id: 'package-1',
          description: 'Package 1',
          status: 'PENDING',
          priceOffered: 25.50
        },
        {
          id: 'package-2',
          description: 'Package 2',
          status: 'ACCEPTED',
          priceOffered: 35.00
        }
      ];

      mockPrisma.package.findMany.mockResolvedValue(mockPackages);
      mockPrisma.package.count.mockResolvedValue(2);

      const result = await packageService.getPackages();

      expect(result.success).toBe(true);
      expect(result.data.packages).toEqual(mockPackages);
      expect(result.data.pagination.total).toBe(2);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        status: 'PENDING',
        minPrice: 20,
        maxPrice: 50,
        size: 'SMALL',
        search: 'electronics',
        limit: 10,
        offset: 0
      };

      mockPrisma.package.findMany.mockResolvedValue([]);
      mockPrisma.package.count.mockResolvedValue(0);

      await packageService.getPackages(filters);

      expect(mockPrisma.package.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          priceOffered: {
            gte: 20,
            lte: 50
          },
          size: 'SMALL',
          OR: [
            { description: { contains: 'electronics', mode: 'insensitive' } },
            { pickupAddress: { contains: 'electronics', mode: 'insensitive' } },
            { deliveryAddress: { contains: 'electronics', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
    });
  });

  describe('getPackageById', () => {
    it('should return package by ID', async () => {
      const mockPackage = {
        id: 'package-123',
        description: 'Test package',
        status: 'PENDING'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);

      const result = await packageService.getPackageById('package-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPackage);
      expect(mockPrisma.package.findUnique).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        include: expect.any(Object)
      });
    });

    it('should throw error if package not found', async () => {
      mockPrisma.package.findUnique.mockResolvedValue(null);

      await expect(packageService.getPackageById('nonexistent'))
        .rejects
        .toThrow(new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404));
    });
  });

  describe('updatePackageStatus', () => {
    it('should update package status successfully', async () => {
      const existingPackage = {
        id: 'package-123',
        status: 'PENDING'
      };

      const updateData = {
        status: 'ACCEPTED' as const,
        notes: 'Package accepted by driver'
      };

      const updatedPackage = {
        ...existingPackage,
        status: 'ACCEPTED',
        updatedAt: new Date()
      };

      mockPrisma.package.findUnique.mockResolvedValue(existingPackage);
      mockPrisma.package.update.mockResolvedValue(updatedPackage);

      const result = await packageService.updatePackageStatus('package-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ACCEPTED');
    });

    it('should validate status transitions', async () => {
      const existingPackage = {
        id: 'package-123',
        status: 'DELIVERED'
      };

      const updateData = {
        status: 'PENDING' as const
      };

      mockPrisma.package.findUnique.mockResolvedValue(existingPackage);

      await expect(packageService.updatePackageStatus('package-123', updateData))
        .rejects
        .toThrow(new AppError('Invalid status transition from DELIVERED to PENDING', 'INVALID_STATUS_TRANSITION', 400));
    });

    it('should throw error if package not found', async () => {
      mockPrisma.package.findUnique.mockResolvedValue(null);

      const updateData = {
        status: 'ACCEPTED' as const
      };

      await expect(packageService.updatePackageStatus('nonexistent', updateData))
        .rejects
        .toThrow(new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404));
    });
  });

  describe('deletePackage', () => {
    it('should delete package successfully', async () => {
      const mockPackage = {
        id: 'package-123',
        customerId: 'customer-123',
        status: 'PENDING'
      };

      const mockUser = {
        id: 'customer-123',
        userType: 'CUSTOMER'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.package.delete.mockResolvedValue({});

      const result = await packageService.deletePackage('package-123', 'customer-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Package deleted successfully');
    });

    it('should allow admin to delete any package', async () => {
      const mockPackage = {
        id: 'package-123',
        customerId: 'customer-123',
        status: 'PENDING'
      };

      const mockAdmin = {
        id: 'admin-123',
        userType: 'ADMIN'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.package.delete.mockResolvedValue({});

      const result = await packageService.deletePackage('package-123', 'admin-123');

      expect(result.success).toBe(true);
    });

    it('should prevent unauthorized deletion', async () => {
      const mockPackage = {
        id: 'package-123',
        customerId: 'customer-123',
        status: 'PENDING'
      };

      const mockUser = {
        id: 'other-user-123',
        userType: 'CUSTOMER'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(packageService.deletePackage('package-123', 'other-user-123'))
        .rejects
        .toThrow(new AppError('Unauthorized to delete this package', 'UNAUTHORIZED', 403));
    });

    it('should prevent deletion of non-pending packages', async () => {
      const mockPackage = {
        id: 'package-123',
        customerId: 'customer-123',
        status: 'DELIVERED'
      };

      const mockUser = {
        id: 'customer-123',
        userType: 'CUSTOMER'
      };

      mockPrisma.package.findUnique.mockResolvedValue(mockPackage);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(packageService.deletePackage('package-123', 'customer-123'))
        .rejects
        .toThrow(new AppError('Cannot delete package with status other than PENDING', 'INVALID_STATUS', 400));
    });
  });
});
