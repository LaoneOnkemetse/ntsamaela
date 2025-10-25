import { getPrismaClient } from '@database/index';
import { AppError } from '../utils/errors';
import {
  CreateTripRequest,
  UpdateTripRequest,
  TripFilters,
  Trip
} from '@ntsamaela/shared/types';

class TripService {
  private prisma: any;

  constructor() {
    // Don't initialize prisma in constructor to avoid startup issues
  }

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  async createTrip(tripData: CreateTripRequest): Promise<Trip> {
    try {
      // Validate driver exists
      const driver = await this.getPrisma().driver.findUnique({
        where: { id: tripData.driverId },
        include: { user: true }
      });

      if (!driver) {
        throw new AppError('Driver not found', 'DRIVER_NOT_FOUND', 404);
      }

      // Check if driver is verified
      if (!driver.user?.identityVerified) {
        throw new AppError('Driver must be verified to create trips', 'DRIVER_NOT_VERIFIED', 403);
      }

      // Validate required fields
      if (!tripData.driverId) {
        throw new AppError('Driver ID is required', 'VALIDATION_ERROR', 400);
      }

      // Validate coordinates
      if (!tripData.startLat || !tripData.startLng || !tripData.endLat || !tripData.endLng) {
        throw new AppError('Valid coordinates are required', 'VALIDATION_ERROR', 400);
      }

      // Validate coordinate values are numbers
      const startLat = parseFloat(tripData.startLat.toString());
      const startLng = parseFloat(tripData.startLng.toString());
      const endLat = parseFloat(tripData.endLat.toString());
      const endLng = parseFloat(tripData.endLng.toString());

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        throw new AppError('Valid coordinates are required', 'VALIDATION_ERROR', 400);
      }

      // Validate departure time
      const departureTime = new Date(tripData.departureTime);
      if (departureTime <= new Date()) {
        throw new AppError('Departure time must be in the future', 'INVALID_DEPARTURE_TIME', 400);
      }

      // Validate capacity enum
      const validCapacities = ['SMALL', 'MEDIUM', 'LARGE'];
      if (!validCapacities.includes(tripData.availableCapacity)) {
        throw new AppError('Invalid capacity type', 'VALIDATION_ERROR', 400);
      }

      // Create the trip
      const trip = await this.getPrisma().trip.create({
        data: {
          driverId: tripData.driverId,
          startAddress: tripData.startAddress,
          startLat: tripData.startLat,
          startLng: tripData.startLng,
          endAddress: tripData.endAddress,
          endLat: tripData.endLat,
          endLng: tripData.endLng,
          departureTime: new Date(tripData.departureTime),
          availableCapacity: tripData.availableCapacity,
          status: 'SCHEDULED'
        }
      });

      return this.formatTrip(trip);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to create trip', 'TRIP_CREATION_FAILED', 500);
    }
  }

  async getTrips(filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> {
    try {
      const where: any = {};

      if (filters.driverId) {
        where.driverId = filters.driverId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.departureDate) {
        const startDate = new Date(filters.departureDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        where.departureTime = {
          gte: startDate,
          lt: endDate
        };
      }

      if (filters.capacity) {
        where.availableCapacity = filters.capacity;
      }

      // Handle date range filtering
      if (filters.startDate && filters.endDate) {
        where.departureTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      } else if (filters.startDate) {
        where.departureTime = {
          gte: new Date(filters.startDate)
        };
      } else if (filters.endDate) {
        where.departureTime = {
          lte: new Date(filters.endDate)
        };
      }

      const trips = await this.getPrisma().trip.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          bids: {
            include: {
              package: {
                select: {
                  id: true,
                  description: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  priceOffered: true
                }
              }
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      });

      const total = await this.getPrisma().trip.count({ where });

      return {
        trips: trips.map((trip: any) => this.formatTrip(trip)),
        total
      };
    } catch (_error) {
      throw new AppError('Failed to get trips', 'TRIP_FETCH_FAILED', 500);
    }
  }

  async getTripById(id: string): Promise<Trip> {
    try {
      const trip = await this.getPrisma().trip.findUnique({
        where: { id },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          bids: {
            include: {
              package: {
                select: {
                  id: true,
                  description: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  priceOffered: true
                }
              }
            }
          }
        }
      });

      if (!trip) {
        throw new AppError('Trip not found', 'TRIP_NOT_FOUND', 404);
      }

      return this.formatTrip(trip);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to get trip', 'TRIP_FETCH_FAILED', 500);
    }
  }

  async updateTrip(id: string, updateData: UpdateTripRequest, driverId?: string): Promise<Trip> {
    try {
      const existingTrip = await this.getPrisma().trip.findUnique({
        where: { id }
      });

      if (!existingTrip) {
        throw new AppError('Trip not found', 'TRIP_NOT_FOUND', 404);
      }

      // Check authorization if driverId is provided
      if (driverId && existingTrip.driverId !== driverId) {
        throw new AppError('Unauthorized to update this trip', 'UNAUTHORIZED', 403);
      }

      // Validate status transitions
      if (updateData.status) {
        this.validateStatusTransition(existingTrip.status, updateData.status);
      }

      const trip = await this.getPrisma().trip.update({
        where: { id },
        data: {
          ...(updateData.startAddress && { startAddress: updateData.startAddress }),
          ...(updateData.startLat && { startLat: updateData.startLat }),
          ...(updateData.startLng && { startLng: updateData.startLng }),
          ...(updateData.endAddress && { endAddress: updateData.endAddress }),
          ...(updateData.endLat && { endLat: updateData.endLat }),
          ...(updateData.endLng && { endLng: updateData.endLng }),
          ...(updateData.departureTime && { departureTime: new Date(updateData.departureTime) }),
          ...(updateData.arrivalTime && { arrivalTime: new Date(updateData.arrivalTime) }),
          ...(updateData.availableCapacity && { availableCapacity: updateData.availableCapacity }),
          ...(updateData.status && { status: updateData.status })
        }
      });

      return this.formatTrip(trip);
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to update trip', 'TRIP_UPDATE_FAILED', 500);
    }
  }

  async deleteTrip(id: string, driverId?: string): Promise<void> {
    try {
      const existingTrip = await this.getPrisma().trip.findUnique({
        where: { id },
        include: { bids: true }
      });

      if (!existingTrip) {
        throw new AppError('Trip not found', 'TRIP_NOT_FOUND', 404);
      }

      // Check authorization if driverId is provided
      if (driverId && existingTrip.driverId !== driverId) {
        throw new AppError('Unauthorized to delete this trip', 'UNAUTHORIZED', 403);
      }

      // Check if trip has accepted bids
      const hasAcceptedBids = existingTrip.bids?.some((bid: any) => bid.status === 'ACCEPTED');
      if (hasAcceptedBids) {
        throw new AppError('Cannot delete trip with accepted bids', 'TRIP_HAS_ACCEPTED_BIDS', 400);
      }

      await this.getPrisma().trip.delete({
        where: { id }
      });
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to delete trip', 'TRIP_DELETE_FAILED', 500);
    }
  }

  async searchTrips(filters: TripFilters): Promise<{ trips: Trip[]; total: number }> {
    try {
      const where: any = {};

      if (filters.driverId) {
        where.driverId = filters.driverId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.departureDate) {
        const startDate = new Date(filters.departureDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        where.departureTime = {
          gte: startDate,
          lt: endDate
        };
      }

      if (filters.capacity) {
        where.availableCapacity = filters.capacity;
      }

      // Handle date range filtering
      if (filters.startDate && filters.endDate) {
        where.departureTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      } else if (filters.startDate) {
        where.departureTime = {
          gte: new Date(filters.startDate)
        };
      } else if (filters.endDate) {
        where.departureTime = {
          lte: new Date(filters.endDate)
        };
      }

      const trips = await this.getPrisma().trip.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          bids: {
            include: {
              package: {
                select: {
                  id: true,
                  description: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  priceOffered: true
                }
              }
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      });

      const total = await this.getPrisma().trip.count({ where });

      return {
        trips: trips.map((trip: any) => this.formatTrip(trip)),
        total
      };
    } catch (_error) {
      throw new AppError('Failed to search trips', 'TRIP_SEARCH_FAILED', 500);
    }
  }

  async getTripsByDriver(driverId: string, filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> {
    try {
      const where: any = {
        driverId: driverId
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.departureDate) {
        const startDate = new Date(filters.departureDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        where.departureTime = {
          gte: startDate,
          lt: endDate
        };
      }

      const trips = await this.getPrisma().trip.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          bids: {
            include: {
              package: {
                select: {
                  id: true,
                  description: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  priceOffered: true
                }
              }
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      });

      const total = await this.getPrisma().trip.count({ where });

      return {
        trips: trips.map((trip: any) => this.formatTrip(trip)),
        total
      };
    } catch (_error) {
      throw new AppError('Failed to get trips by driver', 'TRIP_FETCH_FAILED', 500);
    }
  }

  async getAvailableTrips(filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> {
    try {
      const where: any = {
        status: 'SCHEDULED'
      };

      if (filters.departureDate) {
        const startDate = new Date(filters.departureDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        where.departureTime = {
          gte: startDate,
          lt: endDate
        };
      }

      if (filters.capacity) {
        where.availableCapacity = filters.capacity;
      }

      // Handle date range filtering
      if (filters.startDate && filters.endDate) {
        where.departureTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      } else if (filters.startDate) {
        where.departureTime = {
          gte: new Date(filters.startDate)
        };
      } else if (filters.endDate) {
        where.departureTime = {
          lte: new Date(filters.endDate)
        };
      }

      const trips = await this.getPrisma().trip.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          bids: {
            include: {
              package: {
                select: {
                  id: true,
                  description: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  priceOffered: true
                }
              }
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      });

      const total = await this.getPrisma().trip.count({ where });

      return {
        trips: trips.map((trip: any) => this.formatTrip(trip)),
        total
      };
    } catch (_error) {
      throw new AppError('Failed to get available trips', 'TRIP_FETCH_FAILED', 500);
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: { [key: string]: string[] } = {
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // No transitions from completed
      'CANCELLED': [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION',
        400
      );
    }
  }

  private formatTrip(trip: any): Trip {
    return {
      id: trip.id,
      driverId: trip.driverId,
      startAddress: trip.startAddress,
      startLat: trip.startLat,
      startLng: trip.startLng,
      endAddress: trip.endAddress,
      endLat: trip.endLat,
      endLng: trip.endLng,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime?.toISOString(),
      availableCapacity: trip.availableCapacity,
      status: trip.status,
      createdAt: trip.createdAt.toISOString(),
      driver: trip.driver ? {
        id: trip.driver.id,
        userId: trip.driver.userId,
        licensePlate: trip.driver.licensePlate,
        vehicleType: trip.driver.vehicleType,
        vehicleCapacity: trip.driver.vehicleCapacity,
        rating: trip.driver.rating,
        totalDeliveries: trip.driver.totalDeliveries,
        active: trip.driver.active || true
      } : undefined,
      bids: trip.bids?.map((bid: any) => ({
        id: bid.id,
        packageId: bid.packageId,
        driverId: bid.driverId,
        tripId: bid.tripId,
        amount: bid.amount,
        status: bid.status,
        message: bid.message,
        createdAt: bid.createdAt.toISOString()
      }))
    };
  }

}

// Export singleton instance
let tripServiceInstance: TripService | null = null;

export function getTripService(): TripService {
  if (!tripServiceInstance) {
    tripServiceInstance = new TripService();
  }
  return tripServiceInstance;
}

export default getTripService();
