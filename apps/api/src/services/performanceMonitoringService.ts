import { performance } from 'perf_hooks';

/**
 * Performance Monitoring Service
 * Tracks and monitors application performance metrics
 */
export class PerformanceMonitoringService {
  private metrics: Map<string, any> = new Map();
  private queryTimes: Map<string, number[]> = new Map();
  private apiResponseTimes: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing a database query
   */
  startQueryTimer(queryId: string, query: string) {
    this.startTimes.set(queryId, performance.now());
    this.logQuery(query, 'START');
  }

  /**
   * End timing a database query
   */
  endQueryTimer(queryId: string, query: string, success: boolean = true) {
    const startTime = this.startTimes.get(queryId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.recordQueryTime(query, duration);
    this.startTimes.delete(queryId);

    if (duration > 1000) { // Log slow queries (>1 second)
      console.warn(`Slow query detected: ${query} took ${duration.toFixed(2)}ms`);
    }

    this.logQuery(query, success ? 'SUCCESS' : 'ERROR', duration);
  }

  /**
   * Start timing an API request
   */
  startApiTimer(requestId: string, endpoint: string, method: string) {
    this.startTimes.set(requestId, performance.now());
    this.logApiRequest(endpoint, method, 'START');
  }

  /**
   * End timing an API request
   */
  endApiTimer(requestId: string, endpoint: string, method: string, statusCode: number) {
    const startTime = this.startTimes.get(requestId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.recordApiResponseTime(endpoint, duration);
    this.startTimes.delete(requestId);

    if (duration > 2000) { // Log slow API calls (>2 seconds)
      console.warn(`Slow API call detected: ${method} ${endpoint} took ${duration.toFixed(2)}ms`);
    }

    this.logApiRequest(endpoint, method, statusCode >= 400 ? 'ERROR' : 'SUCCESS', duration, statusCode);
  }

  /**
   * Record an error
   */
  recordError(errorType: string, _error: Error, context?: any) {
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);

    console.error(`Error recorded: ${errorType}`, {
      message: _error.message,
      stack: _error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.metrics.set('memory', {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage() {
    const cpuUsage = process.cpuUsage();
    this.metrics.set('cpu', {
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const queryStats = this.getQueryStats();
    const apiStats = this.getApiStats();
    const errorStats = this.getErrorStats();
    const systemStats = this.getSystemStats();

    return {
      queries: queryStats,
      api: apiStats,
      errors: errorStats,
      system: systemStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats: any = {};
    
    for (const [query, times] of this.queryTimes.entries()) {
      if (times.length > 0) {
        stats[query] = {
          count: times.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          p95: this.percentile(times, 0.95),
          p99: this.percentile(times, 0.99)
        };
      }
    }

    return stats;
  }

  /**
   * Get API performance statistics
   */
  getApiStats() {
    const stats: any = {};
    
    for (const [endpoint, times] of this.apiResponseTimes.entries()) {
      if (times.length > 0) {
        stats[endpoint] = {
          count: times.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          p95: this.percentile(times, 0.95),
          p99: this.percentile(times, 0.99)
        };
      }
    }

    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats: any = {};
    
    for (const [errorType, count] of this.errorCounts.entries()) {
      stats[errorType] = count;
    }

    return stats;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        heapUsedPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours
    const _cutoff = Date.now() - maxAge;
    
    // Clear old query times (keep only recent ones)
    for (const [query, times] of this.queryTimes.entries()) {
      if (times.length > 1000) { // Keep only last 1000 measurements
        this.queryTimes.set(query, times.slice(-1000));
      }
    }

    // Clear old API response times
    for (const [endpoint, times] of this.apiResponseTimes.entries()) {
      if (times.length > 1000) { // Keep only last 1000 measurements
        this.apiResponseTimes.set(endpoint, times.slice(-1000));
      }
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const stats = this.getPerformanceStats();
    
    const report = {
      summary: {
        totalQueries: Object.values(stats.queries).reduce((sum: number, q: any) => sum + q.count, 0),
        totalApiCalls: Object.values(stats.api).reduce((sum: number, a: any) => sum + a.count, 0),
        totalErrors: Object.values(stats.errors).reduce((sum: number, e: any) => sum + (typeof e === 'number' ? e : 0), 0),
        averageQueryTime: this.calculateAverage(Object.values(stats.queries).map((q: any) => q.average)),
        averageApiTime: this.calculateAverage(Object.values(stats.api).map((a: any) => a.average))
      },
      recommendations: this.generateRecommendations(stats),
      details: stats
    };

    return report;
  }

  // Private helper methods
  private recordQueryTime(query: string, duration: number) {
    if (!this.queryTimes.has(query)) {
      this.queryTimes.set(query, []);
    }
    this.queryTimes.get(query)!.push(duration);
  }

  private recordApiResponseTime(endpoint: string, duration: number) {
    if (!this.apiResponseTimes.has(endpoint)) {
      this.apiResponseTimes.set(endpoint, []);
    }
    this.apiResponseTimes.get(endpoint)!.push(duration);
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private logQuery(query: string, status: string, duration?: number) {
    const logData = {
      type: 'QUERY',
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      status,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      timestamp: new Date().toISOString()
    };

    if (status === 'ERROR' || (duration && duration > 1000)) {
      console.warn('Query Performance:', logData);
    }
  }

  private logApiRequest(endpoint: string, method: string, status: string, duration?: number, statusCode?: number) {
    const logData = {
      type: 'API',
      method,
      endpoint,
      status,
      statusCode,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      timestamp: new Date().toISOString()
    };

    if (status === 'ERROR' || (duration && duration > 2000)) {
      console.warn('API Performance:', logData);
    }
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    // Query performance recommendations
    for (const [query, data] of Object.entries(stats.queries)) {
      const queryData = data as any;
      if (queryData.average > 1000) {
        recommendations.push(`Optimize slow query: ${query} (avg: ${queryData.average.toFixed(2)}ms)`);
      }
      if (queryData.p95 > 2000) {
        recommendations.push(`Query has high p95 latency: ${query} (p95: ${queryData.p95.toFixed(2)}ms)`);
      }
    }

    // API performance recommendations
    for (const [endpoint, data] of Object.entries(stats.api)) {
      const apiData = data as any;
      if (apiData.average > 2000) {
        recommendations.push(`Optimize slow API endpoint: ${endpoint} (avg: ${apiData.average.toFixed(2)}ms)`);
      }
    }

    // Error recommendations
    for (const [errorType, count] of Object.entries(stats.errors)) {
      const errorCount = count as number;
      if (errorCount > 10) {
        recommendations.push(`High error rate for: ${errorType} (${errorCount} errors)`);
      }
    }

    // Memory recommendations
    if (stats.system.memory.heapUsedPercentage > 80) {
      recommendations.push('High memory usage detected - consider optimizing memory usage');
    }

    return recommendations;
  }
}

// Singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Auto-clear old metrics every hour
setInterval(() => {
  performanceMonitoringService.clearOldMetrics();
}, 60 * 60 * 1000);

// Record system metrics every 5 minutes
setInterval(() => {
  performanceMonitoringService.recordMemoryUsage();
  performanceMonitoringService.recordCpuUsage();
}, 5 * 60 * 1000);
