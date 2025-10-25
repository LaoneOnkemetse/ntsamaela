import matchingService from '../matchingService';
import { getPrismaClient } from '@database/index';
import { AppError } from '../../utils/errors';

// Mock Prisma client
jest.mock('@database/index');
const mockPrisma = {
  package: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  trip: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  }
};

(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

describe('Enhanced Matching Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOptimalMatchesWithML', () => {
    const mockPackages = [
      {
        id: 'package1',
        customerId: 'customer1',
        description: 'Test package 1',
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryLat: 40.7589,
        deliveryLng: -73.9851,
        priceOffered: 50,
        size: 'MEDIUM',
        weight: 5,
        status: 'PENDING',
        createdAt: new Date()
      },
      {
        id: 'package2',
        customerId: 'customer2',
        description: 'Test package 2',
        pickupLat: 40.7505,
        pickupLng: -73.9934,
        deliveryLat: 40.7614,
        deliveryLng: -73.9776,
        priceOffered: 75,
        size: 'LARGE',
        weight: 10,
        status: 'PENDING',
        createdAt: new Date()
      }
    ];

    const mockTrips = [
      {
        id: 'trip1',
        driverId: 'driver1',
        startLat: 40.7128,
        startLng: -74.0060,
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(Date.now() + 3600000), // 1 hour from now
        availableCapacity: 'MEDIUM',
        status: 'SCHEDULED',
        driver: {
          id: 'driver1',
          rating: 4.5,
          totalDeliveries: 100
        }
      },
      {
        id: 'trip2',
        driverId: 'driver2',
        startLat: 40.7505,
        startLng: -73.9934,
        endLat: 40.7614,
        endLng: -73.9776,
        departureTime: new Date(Date.now() + 7200000), // 2 hours from now
        availableCapacity: 'LARGE',
        status: 'SCHEDULED',
        driver: {
          id: 'driver2',
          rating: 4.8,
          totalDeliveries: 150
        }
      }
    ];

    it('should find optimal matches with ML algorithm', async () => {
      mockPrisma.package.findMany.mockResolvedValue(mockPackages);
      mockPrisma.trip.findMany.mockResolvedValue(mockTrips);

      const result = await matchingService.findOptimalMatchesWithML();

      expect(result.matches).toHaveLength(2);
      expect(result.totalMatches).toBe(2);
      
      // Should match package1 with trip1 and package2 with trip2
      const match1 = result.matches.find(m => m.packageId === 'package1');
      const match2 = result.matches.find(m => m.packageId === 'package2');
      
      expect(match1?.tripId).toBe('trip1');
      expect(match2?.tripId).toBe('trip2');
    });

    it('should prioritize higher-rated drivers', async () => {
      const packages = [mockPackages[0]];
      const trips = [
        {
          ...mockTrips[0],
          id: 'trip1',
          driverId: 'driver1',
          availableCapacity: 'MEDIUM', // Match package size
          startLat: 40.7128, // Same as package pickup
          startLng: -74.0060,
          endLat: 40.7589, // Same as package delivery
          endLng: -73.9851,
          driver: { ...mockTrips[0].driver, rating: 3.5 }
        },
        {
          ...mockTrips[0], // Use same base trip data
          id: 'trip2',
          driverId: 'driver2',
          availableCapacity: 'MEDIUM', // Match package size
          startLat: 40.7128, // Same as package pickup
          startLng: -74.0060,
          endLat: 40.7589, // Same as package delivery
          endLng: -73.9851,
          driver: { ...mockTrips[0].driver, rating: 4.8 }
        }
      ];

      mockPrisma.package.findMany.mockResolvedValue(packages);
      mockPrisma.trip.findMany.mockResolvedValue(trips);

      const result = await matchingService.findOptimalMatchesWithML();

      expect(result.matches).toHaveLength(1);
      // The algorithm should prefer the higher-rated driver
      expect(result.matches[0].driverId).toBe('driver2');
    });

    it('should handle no available packages', async () => {
      mockPrisma.package.findMany.mockResolvedValue([]);
      mockPrisma.trip.findMany.mockResolvedValue(mockTrips);

      const result = await matchingService.findOptimalMatchesWithML();

      expect(result.matches).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });

    it('should handle no available trips', async () => {
      mockPrisma.package.findMany.mockResolvedValue(mockPackages);
      mockPrisma.trip.findMany.mockResolvedValue([]);

      const result = await matchingService.findOptimalMatchesWithML();

      expect(result.matches).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });

    it('should apply matching criteria filters', async () => {
      const criteria = {
        maxDistance: 5, // Very small distance
        minMatchScore: 0.8 // High match score requirement
      };

      mockPrisma.package.findMany.mockResolvedValue(mockPackages);
      mockPrisma.trip.findMany.mockResolvedValue(mockTrips);

      const result = await matchingService.findOptimalMatchesWithML(criteria);

      // Should filter out matches that don't meet criteria
      result.matches.forEach(match => {
        expect(match.distance).toBeLessThanOrEqual(criteria.maxDistance);
        expect(match.matchScore).toBeGreaterThanOrEqual(criteria.minMatchScore);
      });
    });
  });

  describe('Advanced Match Calculation', () => {
    it('should calculate price compatibility correctly', async () => {
      const package_ = {
        id: 'package1',
        priceOffered: 60,
        size: 'MEDIUM',
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryLat: 40.7589,
        deliveryLng: -73.9851
      };

      const trip = {
        id: 'trip1',
        driverId: 'driver1',
        startLat: 40.7128,
        startLng: -74.0060,
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(Date.now() + 3600000),
        availableCapacity: 'MEDIUM',
        driver: {
          rating: 4.5,
          totalDeliveries: 100
        }
      };

      mockPrisma.package.findMany.mockResolvedValue([package_]);
      mockPrisma.trip.findMany.mockResolvedValue([trip]);

      const result = await matchingService.findOptimalMatchesWithML();

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchScore).toBeGreaterThan(0);
    });

    it('should handle capacity mismatches', async () => {
      const package_ = {
        id: 'package1',
        customerId: 'customer1',
        description: 'Test package',
        priceOffered: 50,
        size: 'LARGE',
        weight: 10,
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryLat: 40.7589,
        deliveryLng: -73.9851,
        status: 'PENDING',
        createdAt: new Date()
      };

      const trip = {
        id: 'trip1',
        driverId: 'driver1',
        startLat: 40.7128,
        startLng: -74.0060,
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(Date.now() + 3600000),
        availableCapacity: 'SMALL', // Can't handle LARGE package
        status: 'SCHEDULED',
        driver: {
          id: 'driver1',
          rating: 4.5,
          totalDeliveries: 100
        }
      };

      mockPrisma.package.findMany.mockResolvedValue([package_]);
      mockPrisma.trip.findMany.mockResolvedValue([trip]);

      const result = await matchingService.findOptimalMatchesWithML();

      // The algorithm should still create a match but with low capacity compatibility
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].capacityCompatibility).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.package.findMany.mockRejectedValue(new Error('Database error'));

      await expect(matchingService.findOptimalMatchesWithML()).rejects.toThrow(
        new AppError('Failed to find optimal matches', 'OPTIMAL_MATCHING_FAILED', 500)
      );
    });

    it('should handle concurrent access scenarios', async () => {
      const packages = [{
        id: 'package1',
        customerId: 'customer1',
        description: 'Test package 1',
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryLat: 40.7589,
        deliveryLng: -73.9851,
        priceOffered: 50,
        size: 'MEDIUM',
        weight: 5,
        status: 'PENDING',
        createdAt: new Date()
      }];
      const trips = [{
        id: 'trip1',
        driverId: 'driver1',
        startLat: 40.7128,
        startLng: -74.0060,
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(Date.now() + 3600000),
        availableCapacity: 'MEDIUM',
        status: 'SCHEDULED',
        driver: {
          id: 'driver1',
          rating: 4.5,
          totalDeliveries: 100
        }
      }];

      mockPrisma.package.findMany.mockResolvedValue(packages);
      mockPrisma.trip.findMany.mockResolvedValue(trips);

      // Simulate concurrent calls
      const promises = Array(5).fill(null).map(() => 
        matchingService.findOptimalMatchesWithML()
      );

      const results = await Promise.all(promises);

      // All should return the same result
      results.forEach(result => {
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].packageId).toBe('package1');
        expect(result.matches[0].tripId).toBe('trip1');
      });
    });

    it('should handle large datasets efficiently', async () => {
      // Create smaller datasets for testing
      const largePackages = Array(100).fill(null).map((_, i) => ({
        id: `package${i}`,
        customerId: `customer${i}`,
        description: `Test package ${i}`,
        pickupLat: 40.7128 + (i * 0.001),
        pickupLng: -74.0060 + (i * 0.001),
        deliveryLat: 40.7589 + (i * 0.001),
        deliveryLng: -73.9851 + (i * 0.001),
        priceOffered: 50 + i,
        size: 'MEDIUM',
        weight: 5,
        status: 'PENDING',
        createdAt: new Date()
      }));

      const largeTrips = Array(100).fill(null).map((_, i) => ({
        id: `trip${i}`,
        driverId: `driver${i}`,
        startLat: 40.7128 + (i * 0.001),
        startLng: -74.0060 + (i * 0.001),
        endLat: 40.7589 + (i * 0.001),
        endLng: -73.9851 + (i * 0.001),
        departureTime: new Date(Date.now() + 3600000),
        availableCapacity: 'MEDIUM',
        status: 'SCHEDULED',
        driver: {
          id: `driver${i}`,
          rating: 4.0 + (i % 10) * 0.1,
          totalDeliveries: 50 + i
        }
      }));

      mockPrisma.package.findMany.mockResolvedValue(largePackages);
      mockPrisma.trip.findMany.mockResolvedValue(largeTrips);

      const startTime = Date.now();
      const result = await matchingService.findOptimalMatchesWithML();
      const endTime = Date.now();

      expect(result.matches.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
