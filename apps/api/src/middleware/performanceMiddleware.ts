import { Request, Response, NextFunction } from 'express';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Performance monitoring middleware
 * Tracks API response times and errors
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const _startTime = Date.now();
  
  // Start monitoring this request
  performanceMonitoringService.startApiTimer(
    requestId,
    req.path,
    req.method
  );

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    // End monitoring
    performanceMonitoringService.endApiTimer(
      requestId,
      req.path,
      req.method,
      res.statusCode
    );
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  // Handle errors
  const originalJson = res.json;
  res.json = function(obj: any) {
    if (res.statusCode >= 400) {
      performanceMonitoringService.recordError(
        'API_ERROR',
        new Error(`API Error: ${req.method} ${req.path} - ${res.statusCode}`),
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          body: obj
        }
      );
    }
    return originalJson.call(this, obj);
  };

  next();
}

/**
 * Database query monitoring decorator
 */
export function monitorQuery(queryName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const queryId = uuidv4();
      const query = `${target.constructor.name}.${propertyName}`;
      
      try {
        performanceMonitoringService.startQueryTimer(queryId, query);
        const result = await method.apply(this, args);
        performanceMonitoringService.endQueryTimer(queryId, query, true);
        return result;
      } catch (_error) {
        performanceMonitoringService.endQueryTimer(queryId, query, false);
        performanceMonitoringService.recordError(
          'DATABASE_ERROR',
          _error as Error,
          {
            query: queryName,
            method: propertyName,
            args: args.length
          }
        );
        throw _error;
      }
    };

    return descriptor;
  };
}

/**
 * Service method monitoring decorator
 */
export function monitorService(serviceName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const serviceId = uuidv4();
      const service = `${serviceName}.${propertyName}`;
      
      try {
        performanceMonitoringService.startApiTimer(serviceId, service, 'SERVICE');
        const result = await method.apply(this, args);
        performanceMonitoringService.endApiTimer(serviceId, service, 'SERVICE', 200);
        return result;
      } catch (_error) {
        performanceMonitoringService.endApiTimer(serviceId, service, 'SERVICE', 500);
        performanceMonitoringService.recordError(
          'SERVICE_ERROR',
          _error as Error,
          {
            service: serviceName,
            method: propertyName,
            args: args.length
          }
        );
        throw _error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory usage monitoring middleware
 */
export function memoryMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const memBefore = process.memoryUsage();
  
  res.on('finish', () => {
    const memAfter = process.memoryUsage();
    const memDiff = {
      rss: memAfter.rss - memBefore.rss,
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external
    };

    // Log if memory usage increased significantly
    if (memDiff.heapUsed > 10 * 1024 * 1024) { // 10MB
      console.warn('High memory usage detected:', {
        endpoint: `${req.method} ${req.path}`,
        memoryDiff: memDiff,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
}

/**
 * Request rate limiting middleware
 */
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [id, data] of requests.entries()) {
      if (data.resetTime < windowStart) {
        requests.delete(id);
      }
    }

    // Get or create client data
    let clientData = requests.get(clientId);
    if (!clientData || clientData.resetTime < windowStart) {
      clientData = { count: 0, resetTime: now + windowMs };
      requests.set(clientId, clientData);
    }

    // Check rate limit
    if (clientData.count >= maxRequests) {
      performanceMonitoringService.recordError(
        'RATE_LIMIT_EXCEEDED',
        new Error(`Rate limit exceeded for ${clientId}`),
        {
          clientId,
          count: clientData.count,
          maxRequests,
          windowMs
        }
      );

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      });
    }

    // Increment counter
    clientData.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
    });

    next();
  };
}

/**
 * Health check endpoint data
 */
export function getHealthCheckData() {
  const stats = performanceMonitoringService.getPerformanceStats();
  const systemStats = stats.system;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: systemStats.uptime,
    memory: {
      used: systemStats.memory.heapUsed,
      total: systemStats.memory.heapTotal,
      percentage: systemStats.memory.heapUsedPercentage
    },
    performance: {
      averageQueryTime: stats.queries ? Object.values(stats.queries).reduce((sum: number, q: any) => sum + q.average, 0) / Object.keys(stats.queries).length : 0,
      averageApiTime: stats.api ? Object.values(stats.api).reduce((sum: number, a: any) => sum + a.average, 0) / Object.keys(stats.api).length : 0,
      totalErrors: Object.values(stats.errors).reduce((sum: number, e: any) => sum + (typeof e === 'number' ? e : 0), 0)
    }
  };

  // Determine health status
  if (systemStats.memory.heapUsedPercentage > 90) {
    health.status = 'critical';
  } else if (systemStats.memory.heapUsedPercentage > 80 || (health.performance.totalErrors as number) > 10) {
    health.status = 'warning';
  }

  return health;
}

export default {
  performanceMiddleware,
  monitorQuery,
  monitorService,
  memoryMonitoringMiddleware,
  rateLimitMiddleware,
  getHealthCheckData
};
