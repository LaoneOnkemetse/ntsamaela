import { Request, Response } from 'express';
import { getPrismaClient } from '@database/index';
// import { AppError } from '../utils/errors';
import queryOptimizationService from '../services/queryOptimizationService';
import { packageCache, tripCache, bidCache, userCache, dashboardCache } from '../services/cachingService';

interface PerformanceMetrics {
  timestamp: Date;
  apiResponseTime: number;
  databaseQueryTime: number;
  cacheHitRate: number;
  memoryUsage: any;
  activeConnections: number;
  errorRate: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  version: string;
  environment: string;
  lastHealthCheck: Date;
  components: {
    database: 'healthy' | 'degraded' | 'critical';
    cache: 'healthy' | 'degraded' | 'critical';
    storage: 'healthy' | 'degraded' | 'critical';
    messaging: 'healthy' | 'degraded' | 'critical';
  };
  metrics: PerformanceMetrics;
}

class PerformanceController {
  private prisma: any;
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  constructor() {
    try {
      this.prisma = getPrismaClient();
    } catch (_error) {
      console.warn('Prisma client not available in test environment');
      this.prisma = null;
    }
    this.initializeMetricsCollection();
  }

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check cache health
      const cacheHealth = await this.checkCacheHealth();
      
      // Check storage health
      const storageHealth = await this.checkStorageHealth();
      
      // Check messaging health
      const messagingHealth = await this.checkMessagingHealth();
      
      // Calculate overall health status
      const componentStatuses = [dbHealth, cacheHealth, storageHealth, messagingHealth];
      const criticalCount = componentStatuses.filter(status => status === 'critical').length;
      const degradedCount = componentStatuses.filter(status => status === 'degraded').length;
      
      let overallStatus: 'healthy' | 'degraded' | 'critical';
      if (criticalCount > 0) {
        overallStatus = 'critical';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const responseTime = Date.now() - startTime;
      
      const systemHealth: SystemHealth = {
        status: overallStatus,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        lastHealthCheck: new Date(),
        components: {
          database: dbHealth,
          cache: cacheHealth,
          storage: storageHealth,
          messaging: messagingHealth
        },
        metrics: {
          timestamp: new Date(),
          apiResponseTime: responseTime,
          databaseQueryTime: 0, // Would be measured in actual implementation
          cacheHitRate: this.calculateCacheHitRate(),
          memoryUsage: process.memoryUsage(),
          activeConnections: 0, // Would be tracked in actual implementation
          errorRate: this.calculateErrorRate()
        }
      };

      res.json({
        success: true,
        data: systemHealth
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to check system health'
        }
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange: _timeRange = '1h', limit = 100 } = req.query;
      
      // Get recent metrics
      const recentMetrics = this.metrics.slice(-Number(limit));
      
      // Calculate aggregated metrics
      const aggregatedMetrics = this.calculateAggregatedMetrics(recentMetrics);
      
      // Get query optimization metrics
      const queryMetrics = queryOptimizationService.getPerformanceMetrics();
      
      // Get cache statistics
      const cacheStats = {
        package: packageCache.getStats(),
        trip: tripCache.getStats(),
        bid: bidCache.getStats(),
        user: userCache.getStats(),
        dashboard: dashboardCache.getStats()
      };

      res.json({
        success: true,
        data: {
          metrics: recentMetrics,
          aggregated: aggregatedMetrics,
          queryOptimization: queryMetrics,
          cache: cacheStats,
          timestamp: new Date()
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_FETCH_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to fetch performance metrics'
        }
      });
    }
  }

  /**
   * Get database performance metrics
   */
  async getDatabaseMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Get database statistics
      const [
        totalUsers,
        totalPackages,
        totalTrips,
        totalBids,
        totalTransactions
      ] = await Promise.all([
        this.getPrisma().user.count(),
        this.getPrisma().package.count(),
        this.getPrisma().trip.count(),
        this.getPrisma().bid.count(),
        this.getPrisma().transaction.count()
      ]);

      const queryTime = Date.now() - startTime;

      // Get slow queries (mock data for now)
      const slowQueries = [
        {
          query: 'SELECT * FROM "Package" WHERE status = $1',
          averageTime: 150,
          callCount: 1250,
          lastExecuted: new Date()
        },
        {
          query: 'SELECT * FROM "Trip" WHERE startLat BETWEEN $1 AND $2',
          averageTime: 200,
          callCount: 890,
          lastExecuted: new Date()
        }
      ];

      res.json({
        success: true,
        data: {
          statistics: {
            totalUsers,
            totalPackages,
            totalTrips,
            totalBids,
            totalTransactions
          },
          performance: {
            queryTime,
            slowQueries,
            connectionPool: {
              active: 5,
              idle: 10,
              total: 15
            }
          },
          recommendations: [
            'Consider adding index on Package.status',
            'Optimize location-based queries with spatial indexes',
            'Implement query result caching for frequently accessed data'
          ]
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_METRICS_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to fetch database metrics'
        }
      });
    }
  }

  /**
   * Get cache performance metrics
   */
  async getCacheMetrics(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = {
        package: packageCache.getStats(),
        trip: tripCache.getStats(),
        bid: bidCache.getStats(),
        user: userCache.getStats(),
        dashboard: dashboardCache.getStats()
      };

      // Calculate overall cache performance
      const totalSize = Object.values(cacheStats).reduce((sum, stats) => sum + stats.size, 0);
      const totalMaxSize = Object.values(cacheStats).reduce((sum, stats) => sum + stats.maxSize, 0);
      const utilizationRate = (totalSize / totalMaxSize) * 100;

      res.json({
        success: true,
        data: {
          caches: cacheStats,
          overall: {
            totalSize,
            totalMaxSize,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            totalEntries: Object.values(cacheStats).reduce((sum, stats) => sum + stats.size, 0)
          },
          recommendations: this.generateCacheRecommendations(cacheStats)
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CACHE_METRICS_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to fetch cache metrics'
        }
      });
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const queryRecommendations = queryOptimizationService.getPerformanceMetrics().suggestions;
      const cacheRecommendations = this.generateCacheRecommendations({
        package: packageCache.getStats(),
        trip: tripCache.getStats(),
        bid: bidCache.getStats(),
        user: userCache.getStats(),
        dashboard: dashboardCache.getStats()
      });

      const recommendations = [
        ...queryRecommendations.map(rec => ({
          type: 'DATABASE',
          category: rec.type,
          description: rec.description,
          impact: rec.impact,
          priority: rec.impact === 'HIGH' ? 1 : rec.impact === 'MEDIUM' ? 2 : 3
        })),
        ...cacheRecommendations.map(rec => ({
          type: 'CACHE',
          category: 'PERFORMANCE',
          description: rec,
          impact: 'MEDIUM' as const,
          priority: 2
        }))
      ].sort((a, b) => a.priority - b.priority);

      res.json({
        success: true,
        data: {
          recommendations,
          summary: {
            total: recommendations.length,
            high: recommendations.filter(r => r.impact === 'HIGH').length,
            medium: recommendations.filter(r => r.impact === 'MEDIUM').length,
            low: recommendations.filter(r => r.impact === 'LOW').length
          }
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATIONS_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to fetch optimization recommendations'
        }
      });
    }
  }

  /**
   * Clear performance data
   */
  async clearPerformanceData(req: Request, res: Response): Promise<void> {
    try {
      this.metrics = [];
      queryOptimizationService.clearMetrics();
      
      // Clear caches
      packageCache.clear();
      tripCache.clear();
      bidCache.clear();
      userCache.clear();
      dashboardCache.clear();

      res.json({
        success: true,
        message: 'Performance data cleared successfully'
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_DATA_FAILED',
          message: _error instanceof Error ? _error.message : 'Failed to clear performance data'
        }
      });
    }
  }

  /**
   * Private helper methods
   */
  private async checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const startTime = Date.now();
      await this.getPrisma().user.count();
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 100) return 'healthy';
      if (responseTime < 500) return 'degraded';
      return 'critical';
    } catch (_error) {
      return 'critical';
    }
  }

  private async checkCacheHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Check if caches are responsive
      const testKey = 'health-check';
      packageCache.set(testKey, 'test', 1000);
      const result = packageCache.get(testKey);
      packageCache.delete(testKey);
      
      return result ? 'healthy' : 'degraded';
    } catch (_error) {
      return 'critical';
    }
  }

  private async checkStorageHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Mock storage health check
      // In real implementation, this would check AWS S3 connectivity
      if (Math.random() > 0.1) { // 90% chance of success
        return 'healthy';
      } else {
        throw new Error('Storage check failed');
      }
    } catch (_error) {
      return 'critical';
    }
  }

  private async checkMessagingHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Mock messaging health check
      // In real implementation, this would check WebSocket connections
      if (Math.random() > 0.1) { // 90% chance of success
        return 'healthy';
      } else {
        throw new Error('Messaging check failed');
      }
    } catch (_error) {
      return 'critical';
    }
  }

  private calculateCacheHitRate(): number {
    // Mock cache hit rate calculation
    return Math.random() * 100;
  }

  private calculateErrorRate(): number {
    // Mock error rate calculation
    return Math.random() * 5; // 0-5% error rate
  }

  private calculateAggregatedMetrics(metrics: PerformanceMetrics[]): any {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        averageQueryTime: 0,
        averageCacheHitRate: 0,
        averageMemoryUsage: 0,
        averageErrorRate: 0
      };
    }

    return {
      averageResponseTime: metrics.reduce((sum, m) => sum + m.apiResponseTime, 0) / metrics.length,
      averageQueryTime: metrics.reduce((sum, m) => sum + m.databaseQueryTime, 0) / metrics.length,
      averageCacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length,
      averageErrorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
    };
  }

  private generateCacheRecommendations(cacheStats: any): string[] {
    const recommendations: string[] = [];
    
    Object.entries(cacheStats).forEach(([name, stats]: [string, any]) => {
      const utilization = (stats.size / stats.maxSize) * 100;
      
      if (utilization > 80) {
        recommendations.push(`High cache utilization for ${name} cache (${utilization.toFixed(1)}%)`);
      }
      
      if (stats.size > 0 && stats.entries.length > 0) {
        const avgAge = stats.entries.reduce((sum: number, entry: any) => sum + entry.age, 0) / stats.entries.length;
        if (avgAge > 3600000) { // 1 hour
          recommendations.push(`Old entries in ${name} cache (avg age: ${(avgAge / 1000 / 60).toFixed(1)} minutes)`);
        }
      }
    });
    
    return recommendations;
  }

  private initializeMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      const metric: PerformanceMetrics = {
        timestamp: new Date(),
        apiResponseTime: 0, // Would be tracked in middleware
        databaseQueryTime: 0, // Would be tracked in database service
        cacheHitRate: this.calculateCacheHitRate(),
        memoryUsage: process.memoryUsage(),
        activeConnections: 0, // Would be tracked in connection manager
        errorRate: this.calculateErrorRate()
      };

      this.metrics.push(metric);

      // Keep only recent metrics
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }
    }, 30000);
  }
}

export default new PerformanceController();
