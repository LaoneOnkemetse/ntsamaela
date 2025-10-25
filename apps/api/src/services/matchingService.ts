import { getPrismaClient } from '@database/index';
import { AppError } from '../utils/errors';
import {
  PackageTripMatch,
  MatchingCriteria
} from '@ntsamaela/shared/types';

export interface MatchingResult {
  matches: PackageTripMatch[];
  totalMatches: number;
  criteria: MatchingCriteria;
}

class MatchingService {
  private prisma: any;

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  async findMatchesForPackage(
    packageId: string,
    criteria: MatchingCriteria = {}
  ): Promise<MatchingResult> {
    try {
      // Get package details
      const package_ = await this.getPrisma().package.findUnique({
        where: { id: packageId }
      });

      if (!package_) {
        throw new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404);
      }

      if (package_.status !== 'PENDING') {
        throw new AppError('Package is not available for matching', 'PACKAGE_NOT_AVAILABLE', 400);
      }

      // Get available trips
      const trips = await this.getTripsForMatching(criteria);

      // Find matches
      const matches = this.calculateMatches(package_, trips, criteria);

      return {
        matches,
        totalMatches: matches.length,
        criteria
      };
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to find matches', 'MATCHING_FAILED', 500);
    }
  }

  async findMatchesForTrip(
    tripId: string,
    criteria: MatchingCriteria = {}
  ): Promise<MatchingResult> {
    try {
      // Get trip details
      const trip = await this.getPrisma().trip.findUnique({
        where: { id: tripId }
      });

      if (!trip) {
        throw new AppError('Trip not found', 'TRIP_NOT_FOUND', 404);
      }

      if (trip.status !== 'SCHEDULED') {
        throw new AppError('Trip is not available for matching', 'TRIP_NOT_AVAILABLE', 400);
      }

      // Get available packages
      const packages = await this.getPackagesForMatching(criteria);

      // Find matches
      const matches = this.calculateMatchesForTrip(trip, packages, criteria);

      return {
        matches,
        totalMatches: matches.length,
        criteria
      };
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to find matches', 'MATCHING_FAILED', 500);
    }
  }

  async findOptimalMatches(criteria: MatchingCriteria = {}): Promise<MatchingResult> {
    try {
      // Get all available packages and trips
      const [packages, trips] = await Promise.all([
        this.getPackagesForMatching(criteria),
        this.getTripsForMatching(criteria)
      ]);

      const allMatches: PackageTripMatch[] = [];

      // Calculate matches for each package
      for (const package_ of packages) {
        const packageMatches = this.calculateMatches(package_, trips, criteria);
        allMatches.push(...packageMatches);
      }

      // Sort by match score and remove duplicates
      const uniqueMatches = this.removeDuplicateMatches(allMatches);
      const sortedMatches = uniqueMatches.sort((a, b) => b.matchScore - a.matchScore);

      return {
        matches: sortedMatches,
        totalMatches: sortedMatches.length,
        criteria
      };
    } catch (_error) {
      throw new AppError('Failed to find optimal matches', 'MATCHING_FAILED', 500);
    }
  }

  async getRecommendedBids(
    packageId: string,
    _criteria: MatchingCriteria = {}
  ): Promise<{ recommendedAmount: number; reasoning: string[] }> {
    try {
      const package_ = await this.getPrisma().package.findUnique({
        where: { id: packageId }
      });

      if (!package_) {
        throw new AppError('Package not found', 'PACKAGE_NOT_FOUND', 404);
      }

      // Get similar packages for price analysis
      const similarPackages = await this.getPrisma().package.findMany({
        where: {
          status: 'ACCEPTED',
          size: package_.size,
          weight: package_.weight ? {
            gte: package_.weight * 0.8,
            lte: package_.weight * 1.2
          } : undefined
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Calculate recommended bid amount
      const recommendedAmount = this.calculateRecommendedBid(package_, similarPackages);
      const reasoning = this.generateBidReasoning(package_, similarPackages, recommendedAmount);

      return {
        recommendedAmount,
        reasoning
      };
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to get recommended bids', 'RECOMMENDATION_FAILED', 500);
    }
  }

  // Private helper methods
  private async getTripsForMatching(criteria: MatchingCriteria): Promise<any[]> {
    const {
      maxDistance: _maxDistance = 50, // Default 50km
      timeWindow = 24, // Default 24 hours
      minMatchScore: _minMatchScore = 0.3,
      capacityRequired,
      driverRating: _driverRating = 0
    } = criteria;

    const where: any = {
      status: 'SCHEDULED',
      departureTime: {
        gte: new Date(),
        lte: new Date(Date.now() + timeWindow * 60 * 60 * 1000)
      }
    };

    if (capacityRequired) {
      where.availableCapacity = capacityRequired;
    }

    if (_driverRating > 0) {
      where.driver = {
        rating: { gte: _driverRating }
      };
    }

    return this.getPrisma().trip.findMany({
      where,
      include: {
        driver: {
          include: {
            user: true
          }
        }
      },
      orderBy: { departureTime: 'asc' }
    });
  }

  private async getPackagesForMatching(_criteria: MatchingCriteria): Promise<any[]> {
    return this.getPrisma().package.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private calculateMatches(
    package_: any,
    trips: any[],
    criteria: MatchingCriteria
  ): PackageTripMatch[] {
    const matches: PackageTripMatch[] = [];
    const { maxDistance = 50, minMatchScore = 0.3 } = criteria;

    for (const trip of trips) {
      // Calculate distance compatibility
      const pickupDistance = this.calculateDistance(
        package_.pickupLat, package_.pickupLng,
        trip.startLat, trip.startLng
      );
      const deliveryDistance = this.calculateDistance(
        package_.deliveryLat, package_.deliveryLng,
        trip.endLat, trip.endLng
      );

      if (pickupDistance > maxDistance || deliveryDistance > maxDistance) {
        continue;
      }

      // Calculate time compatibility
      const timeCompatibility = this.calculateTimeCompatibility(
        package_, trip
      );

      // Check capacity compatibility
      const capacityCompatibility = this.checkCapacityCompatibility(
        package_.size, trip.availableCapacity
      );

      if (!capacityCompatibility) {
        continue;
      }

      // Calculate route compatibility
      const routeCompatibility = this.calculateRouteCompatibility(
        package_, trip
      );

      // Calculate overall match score
      const matchScore = this.calculateMatchScore({
        pickupDistance,
        deliveryDistance,
        timeCompatibility,
        capacityCompatibility,
        routeCompatibility,
        driverRating: trip.driver.rating
      });

      if (matchScore >= minMatchScore) {
        const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
          trip.departureTime, pickupDistance, deliveryDistance
        );

        matches.push({
          packageId: package_.id,
          tripId: trip.id,
          driverId: trip.driverId,
          matchScore,
          distance: Math.max(pickupDistance, deliveryDistance),
          timeCompatibility,
          capacityCompatibility,
          routeCompatibility,
          estimatedDeliveryTime
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchesForTrip(
    trip: any,
    packages: any[],
    criteria: MatchingCriteria
  ): PackageTripMatch[] {
    const matches: PackageTripMatch[] = [];
    const { maxDistance = 50, minMatchScore = 0.3 } = criteria;

    for (const package_ of packages) {
      // Calculate distance compatibility
      const pickupDistance = this.calculateDistance(
        package_.pickupLat, package_.pickupLng,
        trip.startLat, trip.startLng
      );
      const deliveryDistance = this.calculateDistance(
        package_.deliveryLat, package_.deliveryLng,
        trip.endLat, trip.endLng
      );

      if (pickupDistance > maxDistance || deliveryDistance > maxDistance) {
        continue;
      }

      // Calculate time compatibility
      const timeCompatibility = this.calculateTimeCompatibility(
        package_, trip
      );

      // Check capacity compatibility
      const capacityCompatibility = this.checkCapacityCompatibility(
        package_.size, trip.availableCapacity
      );

      if (!capacityCompatibility) {
        continue;
      }

      // Calculate route compatibility
      const routeCompatibility = this.calculateRouteCompatibility(
        package_, trip
      );

      // Calculate overall match score
      const matchScore = this.calculateMatchScore({
        pickupDistance,
        deliveryDistance,
        timeCompatibility,
        capacityCompatibility,
        routeCompatibility,
        driverRating: trip.driver.rating
      });

      if (matchScore >= minMatchScore) {
        const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
          trip.departureTime, pickupDistance, deliveryDistance
        );

        matches.push({
          packageId: package_.id,
          tripId: trip.id,
          driverId: trip.driverId,
          matchScore,
          distance: Math.max(pickupDistance, deliveryDistance),
          timeCompatibility,
          capacityCompatibility,
          routeCompatibility,
          estimatedDeliveryTime
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateTimeCompatibility(package_: any, trip: any): number {
    // Simple time compatibility based on package creation time vs trip departure
    const packageAge = Date.now() - new Date(package_.createdAt).getTime();
    const hoursUntilDeparture = (new Date(trip.departureTime).getTime() - Date.now()) / (1000 * 60 * 60);

    // Higher score for packages that need quick delivery and trips leaving soon
    if (packageAge > 24 * 60 * 60 * 1000 && hoursUntilDeparture < 2) {
      return 0.9; // Urgent package, trip leaving soon
    } else if (packageAge > 12 * 60 * 60 * 1000 && hoursUntilDeparture < 6) {
      return 0.7; // Recent package, trip leaving soon
    } else if (hoursUntilDeparture > 24) {
      return 0.5; // Trip leaving far in future
    } else {
      return 0.6; // Default compatibility
    }
  }

  private checkCapacityCompatibility(packageSize: string, tripCapacity: string): boolean {
    const sizeOrder = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
    const packageIndex = sizeOrder.indexOf(packageSize);
    const tripIndex = sizeOrder.indexOf(tripCapacity);

    return tripIndex >= packageIndex;
  }

  private calculateRouteCompatibility(package_: any, trip: any): number {
    // Calculate how well the package pickup/delivery aligns with trip route
    const pickupDistance = this.calculateDistance(
      package_.pickupLat, package_.pickupLng,
      trip.startLat, trip.startLng
    );
    const deliveryDistance = this.calculateDistance(
      package_.deliveryLat, package_.deliveryLng,
      trip.endLat, trip.endLng
    );

    // Perfect route compatibility if pickup is near start and delivery is near end
    const totalDistance = this.calculateDistance(
      trip.startLat, trip.startLng,
      trip.endLat, trip.endLng
    );

    const detourDistance = pickupDistance + deliveryDistance;
    const routeEfficiency = Math.max(0, 1 - (detourDistance / totalDistance));

    return Math.min(1, routeEfficiency);
  }

  private calculateMatchScore(params: {
    pickupDistance: number;
    deliveryDistance: number;
    timeCompatibility: number;
    capacityCompatibility: boolean;
    routeCompatibility: number;
    driverRating: number;
  }): number {
    const {
      pickupDistance,
      deliveryDistance,
      timeCompatibility,
      capacityCompatibility,
      routeCompatibility,
      driverRating
    } = params;

    // Weighted scoring system
    const distanceScore = Math.max(0, 1 - (Math.max(pickupDistance, deliveryDistance) / 50));
    const capacityScore = capacityCompatibility ? 1 : 0;
    const ratingScore = Math.min(1, driverRating / 5); // Normalize to 0-1

    const weights = {
      distance: 0.3,
      time: 0.25,
      capacity: 0.2,
      route: 0.15,
      rating: 0.1
    };

    return (
      distanceScore * weights.distance +
      timeCompatibility * weights.time +
      capacityScore * weights.capacity +
      routeCompatibility * weights.route +
      ratingScore * weights.rating
    );
  }

  private calculateEstimatedDeliveryTime(
    departureTime: string,
    pickupDistance: number,
    deliveryDistance: number
  ): string {
    const departure = new Date(departureTime);
    const averageSpeed = 30; // km/h in city traffic
    const pickupTime = (pickupDistance / averageSpeed) * 60; // minutes
    const deliveryTime = (deliveryDistance / averageSpeed) * 60; // minutes
    const totalTime = pickupTime + deliveryTime + 30; // Add 30 minutes for handling

    const estimatedDelivery = new Date(departure.getTime() + totalTime * 60 * 1000);
    return estimatedDelivery.toISOString();
  }

  private calculateRecommendedBid(package_: any, similarPackages: any[]): number {
    if (similarPackages.length === 0) {
      // No similar packages, use package's offered price as base
      return Math.floor(package_.priceOffered * 0.8 * 100) / 100;
    }

    // Calculate average accepted price for similar packages
    const averagePrice = similarPackages.reduce((sum, pkg) => sum + pkg.priceOffered, 0) / similarPackages.length;
    
    // Recommend 80% of average price or 80% of package's offered price, whichever is lower
    const recommendedPrice = Math.min(averagePrice * 0.8, package_.priceOffered * 0.8);
    
    return Math.floor(recommendedPrice * 100) / 100;
  }

  private generateBidReasoning(
    package_: any,
    similarPackages: any[],
    recommendedAmount: number
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Recommended bid: $${recommendedAmount.toFixed(2)}`);

    if (similarPackages.length > 0) {
      const averagePrice = similarPackages.reduce((sum, pkg) => sum + pkg.priceOffered, 0) / similarPackages.length;
      reasoning.push(`Based on ${similarPackages.length} similar packages with average price of $${averagePrice.toFixed(2)}`);
    } else {
      reasoning.push('No similar packages found, using package offered price as reference');
    }

    if (package_.size) {
      reasoning.push(`Package size: ${package_.size}`);
    }

    if (package_.weight) {
      reasoning.push(`Package weight: ${package_.weight}kg`);
    }

    reasoning.push('Bid amount is 80% of reference price to remain competitive');

    return reasoning;
  }

  private removeDuplicateMatches(matches: PackageTripMatch[]): PackageTripMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = `${match.packageId}-${match.tripId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Enhanced matching with machine learning-inspired scoring
  async findOptimalMatchesWithML(
    criteria: MatchingCriteria = {}
  ): Promise<MatchingResult> {
    try {
      const packages = await this.getPackagesForMatching(criteria);
      const trips = await this.getTripsForMatching(criteria);

      const allMatches: PackageTripMatch[] = [];
      const usedTrips = new Set<string>();
      const usedPackages = new Set<string>();

      // Create a priority queue of matches
      const matchQueue: Array<PackageTripMatch & { priority: number }> = [];

      // Calculate all possible matches
      for (const package_ of packages) {
        for (const trip of trips) {
          if (usedTrips.has(trip.id) || usedPackages.has(package_.id)) {
            continue;
          }

          const match = this.calculateAdvancedMatch(package_, trip, criteria);
          if (match.matchScore >= (criteria.minMatchScore || 0.3)) {
            matchQueue.push({
              ...match,
              priority: this.calculatePriority(match, package_, trip)
            });
          }
        }
      }

      // Sort by priority (highest first)
      matchQueue.sort((a, b) => b.priority - a.priority);

      // Select optimal matches (no conflicts)
      for (const match of matchQueue) {
        if (!usedTrips.has(match.tripId) && !usedPackages.has(match.packageId)) {
          allMatches.push(match);
          usedTrips.add(match.tripId);
          usedPackages.add(match.packageId);
        }
      }

      return {
        matches: allMatches,
        totalMatches: allMatches.length,
        criteria
      };
    } catch (_error) {
      if (_error instanceof AppError) {
        throw _error;
      }
      throw new AppError('Failed to find optimal matches', 'OPTIMAL_MATCHING_FAILED', 500);
    }
  }

  private calculateAdvancedMatch(
    package_: any,
    trip: any,
    _criteria: MatchingCriteria
  ): PackageTripMatch {
    const pickupDistance = this.calculateDistance(
      package_.pickupLat, package_.pickupLng,
      trip.startLat, trip.startLng
    );
    const deliveryDistance = this.calculateDistance(
      package_.deliveryLat, package_.deliveryLng,
      trip.endLat, trip.endLng
    );

    const timeCompatibility = this.calculateTimeCompatibility(package_, trip);
    const capacityCompatibility = this.checkCapacityCompatibility(package_.size, trip.availableCapacity);
    const routeCompatibility = this.calculateRouteCompatibility(package_, trip);

    // Enhanced scoring with multiple factors
    const distanceScore = Math.max(0, 1 - (Math.max(pickupDistance, deliveryDistance) / 50));
    const timeScore = timeCompatibility;
    const capacityScore = capacityCompatibility ? 1 : 0;
    const routeScore = routeCompatibility;
    const driverScore = Math.min(1, trip.driver.rating / 5);
    const priceScore = this.calculatePriceCompatibility(package_.priceOffered, trip);

    // Weighted combination
    const matchScore = (
      distanceScore * 0.25 +
      timeScore * 0.20 +
      capacityScore * 0.15 +
      routeScore * 0.15 +
      driverScore * 0.15 +
      priceScore * 0.10
    );

    return {
      packageId: package_.id,
      tripId: trip.id,
      driverId: trip.driverId,
      matchScore,
      distance: Math.max(pickupDistance, deliveryDistance),
      timeCompatibility,
      capacityCompatibility,
      routeCompatibility,
      estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(
        trip.departureTime, pickupDistance, deliveryDistance
      )
    };
  }

  private calculatePriority(match: PackageTripMatch, package_: any, trip: any): number {
    // Higher priority for better matches, higher package values, and better drivers
    return (
      match.matchScore * 100 +
      (package_.priceOffered / 100) * 10 +
      trip.driver.rating * 5 +
      (trip.driver.totalDeliveries / 100) * 2
    );
  }

  private calculatePriceCompatibility(packagePrice: number, trip: any): number {
    // Simple price compatibility based on trip capacity and driver experience
    const basePrice = 50; // Base expected price
    const expectedPrice = basePrice * this.getCapacityMultiplier(trip.availableCapacity);
    
    if (packagePrice >= expectedPrice * 0.8 && packagePrice <= expectedPrice * 1.5) {
      return 1.0;
    } else if (packagePrice >= expectedPrice * 0.6) {
      return 0.7;
    } else {
      return 0.3;
    }
  }

  private getCapacityMultiplier(capacity: string): number {
    switch (capacity) {
      case 'SMALL': return 0.7;
      case 'MEDIUM': return 1.0;
      case 'LARGE': return 1.3;
      case 'EXTRA_LARGE': return 1.6;
      default: return 1.0;
    }
  }
}

export default new MatchingService();
