import { getPrismaClient } from '@database/index';

/**
 * Performance Optimization Service
 * Provides optimized database queries and caching strategies
 */
export class PerformanceOptimizationService {
  private prisma: any;
  private queryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Optimized package search with minimal data fetching
   */
  async getPackagesOptimized(filters: any) {
    const cacheKey = `packages_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const where = this.buildPackageWhereClause(filters);
    
    // Use parallel queries for better performance
    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        select: {
          id: true,
          description: true,
          pickupAddress: true,
          deliveryAddress: true,
          priceOffered: true,
          size: true,
          weight: true,
          status: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: { bids: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      }),
      this.prisma.package.count({ where })
    ]);

    const result = {
      packages,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
      limit: filters.limit || 20
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Optimized bid retrieval with pagination
   */
  async getBidsOptimized(filters: any) {
    const cacheKey = `bids_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const where = this.buildBidWhereClause(filters);
    
    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where,
        select: {
          id: true,
          amount: true,
          status: true,
          message: true,
          createdAt: true,
          package: {
            select: {
              id: true,
              description: true,
              pickupAddress: true,
              deliveryAddress: true,
              priceOffered: true
            }
          },
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
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      }),
      this.prisma.bid.count({ where })
    ]);

    const result = {
      bids,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
      limit: filters.limit || 20
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Optimized analytics with aggregation queries
   */
  async getAnalyticsOptimized(startDate: Date, endDate: Date) {
    const cacheKey = `analytics_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Use parallel aggregation queries
    const [
      packageStats,
      bidStats,
      userStats,
      revenueStats
    ] = await Promise.all([
      this.prisma.package.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      this.prisma.bid.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _avg: { amount: true }
      }),
      this.prisma.user.groupBy({
        by: ['userType'],
        where: {
          createdAt: where.createdAt
        },
        _count: { userType: true }
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...where,
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const result = {
      packages: packageStats,
      bids: bidStats,
      users: userStats,
      revenue: revenueStats,
      generatedAt: new Date()
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Optimized dashboard data with minimal queries
   */
  async getDashboardOptimized() {
    const cacheKey = 'dashboard_data';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      totalPackages,
      totalBids,
      totalRevenue,
      recentPackages,
      recentBids
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.package.count(),
      this.prisma.bid.count(),
      this.prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      this.prisma.package.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          description: true,
          status: true,
          priceOffered: true,
          createdAt: true
        }
      }),
      this.prisma.bid.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true
        }
      })
    ]);

    const result = {
      totalUsers,
      totalPackages,
      totalBids,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentPackages,
      recentBids,
      generatedAt: new Date()
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Batch operations for better performance
   */
  async batchUpdatePackageStatus(packageIds: string[], status: string) {
    return this.prisma.package.updateMany({
      where: {
        id: {
          in: packageIds
        }
      },
      data: {
        status
      }
    });
  }

  /**
   * Optimized user search with minimal data
   */
  async searchUsersOptimized(query: string, limit: number = 10) {
    const cacheKey = `user_search_${query}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userType: true,
        identityVerified: true
      },
      take: limit
    });

    this.setCache(cacheKey, users);
    return users;
  }

  /**
   * Clear cache for specific patterns
   */
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys())
    };
  }

  // Private helper methods
  private buildPackageWhereClause(filters: any) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.size) where.size = filters.size;
    
    if (filters.minPrice || filters.maxPrice) {
      where.priceOffered = {};
      if (filters.minPrice) where.priceOffered.gte = filters.minPrice;
      if (filters.maxPrice) where.priceOffered.lte = filters.maxPrice;
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { pickupAddress: { contains: filters.search, mode: 'insensitive' } },
        { deliveryAddress: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  private buildBidWhereClause(filters: any) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.packageId) where.packageId = filters.packageId;
    
    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    return where;
  }

  private getFromCache(key: string) {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.queryCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();
