import { getPrismaClient } from '@database/index';
import { AppError } from '../utils/errors';

interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  rowsReturned: number;
  timestamp: Date;
}

interface OptimizationSuggestion {
  type: 'INDEX' | 'QUERY_REWRITE' | 'PAGINATION' | 'CACHING';
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  query?: string;
}

class QueryOptimizationService {
  private prisma: any;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Optimized package search with proper indexing
   */
  async searchPackagesOptimized(filters: {
    status?: string;
    customerId?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const startTime = Date.now();
    
    try {
      const {
        status,
        customerId,
        minPrice,
        maxPrice,
        size,
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build optimized where clause
      const where: any = {};
      
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (size) where.size = size;
      
      // Price range optimization
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.priceOffered = {};
        if (minPrice !== undefined) where.priceOffered.gte = minPrice;
        if (maxPrice !== undefined) where.priceOffered.lte = maxPrice;
      }

      // Use select to limit fields returned
      const selectFields = {
        id: true,
        description: true,
        pickupAddress: true,
        deliveryAddress: true,
        priceOffered: true,
        status: true,
        size: true,
        weight: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      };

      const [packages, total] = await Promise.all([
        this.getPrisma().package.findMany({
          where,
          select: selectFields,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset
        }),
        this.getPrisma().package.count({ where })
      ]);

      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('package_search', duration, packages.length);

      return {
        packages,
        total,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (_error) {
      throw new AppError('Failed to search packages', 'PACKAGE_SEARCH_FAILED', 500);
    }
  }

  /**
   * Optimized trip search with location-based indexing
   */
  async searchTripsOptimized(filters: {
    driverId?: string;
    status?: string;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
    radius?: number;
    capacity?: string;
    departureTimeStart?: Date;
    departureTimeEnd?: Date;
    limit?: number;
    offset?: number;
  }) {
    const startTime = Date.now();
    
    try {
      const {
        driverId,
        status,
        startLat,
        startLng,
        endLat,
        endLng,
        radius = 50,
        capacity,
        departureTimeStart,
        departureTimeEnd,
        limit = 20,
        offset = 0
      } = filters;

      const where: any = {};
      
      if (driverId) where.driverId = driverId;
      if (status) where.status = status;
      if (capacity) where.availableCapacity = capacity;
      
      // Time range optimization
      if (departureTimeStart || departureTimeEnd) {
        where.departureTime = {};
        if (departureTimeStart) where.departureTime.gte = departureTimeStart;
        if (departureTimeEnd) where.departureTime.lte = departureTimeEnd;
      }

      // Get trips first, then filter by location if needed
      let trips = await this.getPrisma().trip.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              rating: true,
              vehicleType: true,
              vehicleCapacity: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: limit * 2, // Get more to account for location filtering
        skip: offset
      });

      // Location-based filtering (if coordinates provided)
      if (startLat && startLng && endLat && endLng) {
        trips = trips.filter((trip: any) => {
          const startDistance = this.calculateDistance(
            startLat, startLng,
            trip.startLat, trip.startLng
          );
          const endDistance = this.calculateDistance(
            endLat, endLng,
            trip.endLat, trip.endLng
          );
          
          return startDistance <= radius && endDistance <= radius;
        });
      }

      // Apply final limit
      trips = trips.slice(0, limit);

      const total = await this.getPrisma().trip.count({ where });
      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('trip_search', duration, trips.length);

      return {
        trips,
        total,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (_error) {
      throw new AppError('Failed to search trips', 'TRIP_SEARCH_FAILED', 500);
    }
  }

  /**
   * Optimized bid queries with proper joins
   */
  async getBidsOptimized(filters: {
    packageId?: string;
    driverId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const startTime = Date.now();
    
    try {
      const {
        packageId,
        driverId,
        status,
        limit = 20,
        offset = 0
      } = filters;

      const where: any = {};
      if (packageId) where.packageId = packageId;
      if (driverId) where.driverId = driverId;
      if (status) where.status = status;

      const [bids, total] = await Promise.all([
        this.getPrisma().bid.findMany({
          where,
          include: {
            driver: {
              select: {
                id: true,
                rating: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            package: {
              select: {
                id: true,
                description: true,
                pickupAddress: true,
                deliveryAddress: true,
                priceOffered: true,
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.getPrisma().bid.count({ where })
      ]);

      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('bid_query', duration, bids.length);

      return {
        bids,
        total,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (_error) {
      throw new AppError('Failed to fetch bids', 'BID_FETCH_FAILED', 500);
    }
  }

  /**
   * Optimized dashboard queries with parallel execution
   */
  async getDashboardDataOptimized() {
    const startTime = Date.now();
    
    try {
      // Execute all queries in parallel for better performance
      const [
        totalUsers,
        activePackages,
        pendingBids,
        totalRevenue,
        recentUsers,
        recentTransactions
      ] = await Promise.all([
        this.getPrisma().user.count(),
        this.getPrisma().package.count({ where: { status: 'PENDING' } }),
        this.getPrisma().bid.count({ where: { status: 'PENDING' } }),
        this.getPrisma().transaction.aggregate({
          where: { 
            status: 'COMPLETED',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          _sum: { amount: true }
        }),
        this.getPrisma().user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userType: true,
            createdAt: true
          }
        }),
        this.getPrisma().transaction.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            type: true,
            amount: true,
            status: true,
            description: true,
            createdAt: true
          }
        })
      ]);

      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('dashboard_query', duration, 1);

      return {
        summary: {
          totalUsers,
          activePackages,
          pendingBids,
          totalRevenue: totalRevenue._sum.amount || 0
        },
        recentUsers,
        recentTransactions
      };
    } catch (_error) {
      throw new AppError('Failed to fetch dashboard data', 'DASHBOARD_FETCH_FAILED', 500);
    }
  }

  /**
   * Optimized notification queries
   */
  async getNotificationsOptimized(userId: string, filters: {
    type?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const startTime = Date.now();
    
    try {
      const {
        type,
        isRead,
        limit = 20,
        offset = 0
      } = filters;

      const where: any = { userId };
      if (type) where.type = type;
      if (isRead !== undefined) where.isRead = isRead;

      const [notifications, total] = await Promise.all([
        this.getPrisma().notification.findMany({
          where,
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            data: true,
            isRead: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.getPrisma().notification.count({ where })
      ]);

      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('notification_query', duration, notifications.length);

      return {
        notifications,
        total,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (_error) {
      throw new AppError('Failed to fetch notifications', 'NOTIFICATION_FETCH_FAILED', 500);
    }
  }

  /**
   * Get performance metrics and optimization suggestions
   */
  getPerformanceMetrics(): {
    metrics: QueryPerformanceMetrics[];
    suggestions: OptimizationSuggestion[];
  } {
    const slowQueries = this.performanceMetrics.filter(
      metric => metric.duration > this.SLOW_QUERY_THRESHOLD
    );

    const suggestions: OptimizationSuggestion[] = [];

    // Analyze slow queries and provide suggestions
    slowQueries.forEach(metric => {
      if (metric.query.includes('package') && metric.duration > 500) {
        suggestions.push({
          type: 'INDEX',
          description: 'Consider adding composite index on Package(status, createdAt, priceOffered)',
          impact: 'HIGH',
          query: metric.query
        });
      }

      if (metric.query.includes('trip') && metric.duration > 300) {
        suggestions.push({
          type: 'INDEX',
          description: 'Consider adding spatial index on Trip location fields',
          impact: 'HIGH',
          query: metric.query
        });
      }

      if (metric.query.includes('bid') && metric.duration > 400) {
        suggestions.push({
          type: 'QUERY_REWRITE',
          description: 'Optimize bid queries by limiting joined fields',
          impact: 'MEDIUM',
          query: metric.query
        });
      }
    });

    return {
      metrics: this.performanceMetrics,
      suggestions
    };
  }

  /**
   * Record performance metrics for analysis
   */
  private recordPerformanceMetrics(query: string, duration: number, rowsReturned: number) {
    this.performanceMetrics.push({
      query,
      duration,
      rowsReturned,
      timestamp: new Date()
    });

    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Clear performance metrics
   */
  clearMetrics() {
    this.performanceMetrics = [];
  }
}

export default new QueryOptimizationService();
