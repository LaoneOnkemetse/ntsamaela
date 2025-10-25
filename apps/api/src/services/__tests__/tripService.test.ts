import tripService from '../tripService';
import { getPrismaClient } from '@database/index';
import { AppError } from '../../utils/errors';
import { CreateTripRequest, UpdateTripRequest, TripFilters } from '@ntsamaela/shared/types';

// Mock the database
const mockPrisma = {
  trip: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  driver: {
    findUnique: jest.fn()
  }
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

describe('TripService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to their default implementations
    mockPrisma.driver.findUnique.mockClear();
    mockPrisma.trip.create.mockClear();
    mockPrisma.trip.findMany.mockClear();
    mockPrisma.trip.findUnique.mockClear();
    mockPrisma.trip.update.mockClear();
    mockPrisma.trip.delete.mockClear();
    mockPrisma.trip.count.mockClear();
    
  });

  describe('createTrip', () => {
    const validTripData: CreateTripRequest = {
      driverId: 'driver123',
      startAddress: '123 Main St, City',
      startLat: 40.7128,
      startLng: -74.0060,
      endAddress: '456 Oak Ave, City',
      endLat: 40.7589,
      endLng: -73.9851,
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      availableCapacity: 'MEDIUM'
    };

    it('should create a trip successfully', async () => {
      const mockDriver = {
        id: 'driver123',
        user: { identityVerified: true }
      };

      const mockTrip = {
        id: 'trip123',
        ...validTripData,
        departureTime: new Date(validTripData.departureTime),
        status: 'SCHEDULED',
        createdAt: new Date()
      };

      // Ensure mocks are properly set up
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.trip.create.mockResolvedValue(mockTrip);

      const result = await tripService.createTrip(validTripData);

      expect(mockPrisma.driver.findUnique).toHaveBeenCalledWith({
        where: { id: validTripData.driverId },
        include: { user: true }
      });
      expect(mockPrisma.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: validTripData.driverId,
          startAddress: validTripData.startAddress,
          startLat: validTripData.startLat,
          startLng: validTripData.startLng,
          endAddress: validTripData.endAddress,
          endLat: validTripData.endLat,
          endLng: validTripData.endLng,
          departureTime: expect.any(Date),
          availableCapacity: validTripData.availableCapacity,
          status: 'SCHEDULED'
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'trip123',
        driverId: 'driver123',
        status: 'SCHEDULED'
      }));
    });

    it('should throw error if driver not found', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(null);

      await expect(tripService.createTrip(validTripData)).rejects.toThrow(
        new AppError('Driver not found', 'DRIVER_NOT_FOUND', 404)
      );
    });

    it('should throw error if driver not verified', async () => {
      const mockDriver = {
        id: 'driver123',
        user: { identityVerified: false }
      };

      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);

      await expect(tripService.createTrip(validTripData)).rejects.toThrow(
        new AppError('Driver must be verified to create trips', 'DRIVER_NOT_VERIFIED', 403)
      );
    });

    it('should throw error for invalid departure time', async () => {
      const invalidTripData = {
        ...validTripData,
        departureTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const mockDriver = {
        id: 'driver123',
        user: { identityVerified: true }
      };

      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);

      await expect(tripService.createTrip(invalidTripData)).rejects.toThrow(
        new AppError('Departure time must be in the future', 'INVALID_DEPARTURE_TIME', 400)
      );
    });

    it('should validate required fields', async () => {
      const invalidTripData = {
        ...validTripData,
        driverId: ''
      };

      await expect(tripService.createTrip(invalidTripData)).rejects.toThrow(
        new AppError('Driver ID is required', 'VALIDATION_ERROR', 400)
      );
    });

    it('should validate coordinates', async () => {
      const invalidTripData = {
        ...validTripData,
        startLat: 'invalid'
      };

      await expect(tripService.createTrip(invalidTripData)).rejects.toThrow(
        new AppError('Valid coordinates are required', 'VALIDATION_ERROR', 400)
      );
    });

    it('should validate capacity enum', async () => {
      const invalidTripData = {
        ...validTripData,
        availableCapacity: 'INVALID'
      };

      await expect(tripService.createTrip(invalidTripData)).rejects.toThrow(
        new AppError('Invalid capacity type', 'VALIDATION_ERROR', 400)
      );
    });
  });

  describe('getTrips', () => {
    it('should return trips with default filters', async () => {
      const mockTrips = [
        {
          id: 'trip1',
          driverId: 'driver1',
          startAddress: '123 Main St',
          startLat: 40.7128,
          startLng: -74.0060,
          endAddress: '456 Oak Ave',
          endLat: 40.7589,
          endLng: -73.9851,
          departureTime: new Date(),
          availableCapacity: 'MEDIUM',
          status: 'SCHEDULED',
          createdAt: new Date()
        }
      ];

      mockPrisma.trip.findMany.mockResolvedValue(mockTrips);
      mockPrisma.trip.count.mockResolvedValue(1);

      const result = await tripService.getTrips();

      expect(result.trips).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const filters: TripFilters = {
        driverId: 'driver123',
        status: 'SCHEDULED',
        limit: 10,
        offset: 0
      };

      mockPrisma.trip.findMany.mockResolvedValue([]);
      mockPrisma.trip.count.mockResolvedValue(0);

      await tripService.getTrips(filters);

      expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          driverId: 'driver123',
          status: 'SCHEDULED'
        },
        include: expect.any(Object),
        orderBy: { departureTime: 'asc' },
        take: 10,
        skip: 0
      });
    });

    it('should filter by date range', async () => {
      const filters: TripFilters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      mockPrisma.trip.findMany.mockResolvedValue([]);
      mockPrisma.trip.count.mockResolvedValue(0);

      await tripService.getTrips(filters);

      expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          departureTime: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: expect.any(Object),
        orderBy: { departureTime: 'asc' },
        take: 20,
        skip: 0
      });
    });
  });

  describe('getTripById', () => {
    it('should return trip by ID', async () => {
      const mockTrip = {
        id: 'trip123',
        driverId: 'driver123',
        startAddress: '123 Main St',
        startLat: 40.7128,
        startLng: -74.0060,
        endAddress: '456 Oak Ave',
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(),
        availableCapacity: 'MEDIUM',
        status: 'SCHEDULED',
        createdAt: new Date()
      };

      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);

      const result = await tripService.getTripById('trip123');

      expect(mockPrisma.trip.findUnique).toHaveBeenCalledWith({
        where: { id: 'trip123' },
        include: expect.any(Object)
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'trip123',
        driverId: 'driver123'
      }));
    });

    it('should throw error if trip not found', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(tripService.getTripById('nonexistent')).rejects.toThrow(
        new AppError('Trip not found', 'TRIP_NOT_FOUND', 404)
      );
    });
  });

  describe('updateTrip', () => {
    const updateData: UpdateTripRequest = {
      status: 'IN_PROGRESS'
    };

    it('should update trip successfully', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'driver123',
        status: 'SCHEDULED'
      };

      const updatedTrip = {
        ...existingTrip,
        startAddress: '123 Main St',
        startLat: 40.7128,
        startLng: -74.0060,
        endAddress: '456 Oak Ave',
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(),
        availableCapacity: 'MEDIUM',
        status: 'IN_PROGRESS',
        createdAt: new Date()
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);
      mockPrisma.trip.update.mockResolvedValue(updatedTrip);

      const result = await tripService.updateTrip('trip123', updateData, 'driver123');

      expect(mockPrisma.trip.findUnique).toHaveBeenCalledWith({
        where: { id: 'trip123' }
      });
      expect(mockPrisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip123' },
        data: updateData
      });
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw error if trip not found', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(tripService.updateTrip('nonexistent', updateData, 'driver123')).rejects.toThrow(
        new AppError('Trip not found', 'TRIP_NOT_FOUND', 404)
      );
    });

    it('should throw error if unauthorized', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'different-driver'
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);

      await expect(tripService.updateTrip('trip123', updateData, 'driver123')).rejects.toThrow(
        new AppError('Unauthorized to update this trip', 'UNAUTHORIZED', 403)
      );
    });

    it('should validate status transitions', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'driver123',
        status: 'COMPLETED'
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);

      await expect(tripService.updateTrip('trip123', updateData, 'driver123')).rejects.toThrow(
        new AppError('Invalid status transition from COMPLETED to IN_PROGRESS', 'INVALID_STATUS_TRANSITION', 400)
      );
    });
  });

  describe('deleteTrip', () => {
    it('should delete trip successfully', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'driver123',
        bids: []
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);
      mockPrisma.trip.delete.mockResolvedValue({});

      await tripService.deleteTrip('trip123', 'driver123');

      expect(mockPrisma.trip.findUnique).toHaveBeenCalledWith({
        where: { id: 'trip123' },
        include: { bids: true }
      });
      expect(mockPrisma.trip.delete).toHaveBeenCalledWith({
        where: { id: 'trip123' }
      });
    });

    it('should throw error if trip has accepted bids', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'driver123',
        bids: [{ status: 'ACCEPTED' }]
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);

      await expect(tripService.deleteTrip('trip123', 'driver123')).rejects.toThrow(
        new AppError('Cannot delete trip with accepted bids', 'TRIP_HAS_ACCEPTED_BIDS', 400)
      );
    });

    it('should throw error if unauthorized', async () => {
      const existingTrip = {
        id: 'trip123',
        driverId: 'different-driver',
        bids: []
      };

      mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);

      await expect(tripService.deleteTrip('trip123', 'driver123')).rejects.toThrow(
        new AppError('Unauthorized to delete this trip', 'UNAUTHORIZED', 403)
      );
    });
  });

  describe('getTripsByDriver', () => {
    it('should return trips for specific driver', async () => {
      const filters: TripFilters = { status: 'SCHEDULED' };
      
      mockPrisma.trip.findMany.mockResolvedValue([]);
      mockPrisma.trip.count.mockResolvedValue(0);

      await tripService.getTripsByDriver('driver123', filters);

      expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          driverId: 'driver123',
          status: 'SCHEDULED'
        },
        include: expect.any(Object),
        orderBy: { departureTime: 'asc' },
        take: 20,
        skip: 0
      });
    });
  });

  describe('getAvailableTrips', () => {
    it('should return only scheduled trips', async () => {
      mockPrisma.trip.findMany.mockResolvedValue([]);
      mockPrisma.trip.count.mockResolvedValue(0);

      await tripService.getAvailableTrips();

      expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SCHEDULED'
        },
        include: expect.any(Object),
        orderBy: { departureTime: 'asc' },
        take: 20,
        skip: 0
      });
    });
  });
});
