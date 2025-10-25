import { AppError } from '../utils/errors';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CachingService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 1000;
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || this.DEFAULT_TTL,
      maxSize: options.maxSize || this.DEFAULT_MAX_SIZE
    };
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.options.maxSize!) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl!
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source and cache the result
    try {
      const data = await fetchFunction();
      this.set(key, data, ttl);
      return data;
    } catch (_error) {
      throw new AppError('Failed to fetch data', 'CACHE_FETCH_FAILED', 500);
    }
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize!,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      entries
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Remove the oldest entry
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key for package queries
   */
  generatePackageCacheKey(filters: any): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {} as any);
    
    return `packages:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Generate cache key for trip queries
   */
  generateTripCacheKey(filters: any): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {} as any);
    
    return `trips:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Generate cache key for bid queries
   */
  generateBidCacheKey(filters: any): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {} as any);
    
    return `bids:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Generate cache key for user data
   */
  generateUserCacheKey(userId: string, dataType: string): string {
    return `user:${userId}:${dataType}`;
  }

  /**
   * Generate cache key for dashboard data
   */
  generateDashboardCacheKey(adminId: string): string {
    return `dashboard:${adminId}`;
  }
}

// Create different cache instances for different data types
export const packageCache = new CachingService({ ttl: 2 * 60 * 1000 }); // 2 minutes
export const tripCache = new CachingService({ ttl: 1 * 60 * 1000 }); // 1 minute
export const bidCache = new CachingService({ ttl: 30 * 1000 }); // 30 seconds
export const userCache = new CachingService({ ttl: 10 * 60 * 1000 }); // 10 minutes
export const dashboardCache = new CachingService({ ttl: 5 * 60 * 1000 }); // 5 minutes

// Cache middleware for Express routes
export const cacheMiddleware = (cache: CachingService, ttl?: number) => {
  return (req: any, res: any, next: any) => {
    const key = req.originalUrl + JSON.stringify(req.query);
    
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data: any) {
      cache.set(key, data, ttl);
      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache invalidation helpers
export const invalidatePackageCache = (packageId?: string) => {
  if (packageId) {
    // Invalidate specific package-related caches
    const keysToDelete: string[] = [];
    for (const [key] of packageCache['cache'].entries()) {
      if (key.includes(packageId) || key.includes('packages:')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => packageCache.delete(key));
  } else {
    packageCache.clear();
  }
};

export const invalidateTripCache = (tripId?: string) => {
  if (tripId) {
    const keysToDelete: string[] = [];
    for (const [key] of tripCache['cache'].entries()) {
      if (key.includes(tripId) || key.includes('trips:')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => tripCache.delete(key));
  } else {
    tripCache.clear();
  }
};

export const invalidateBidCache = (bidId?: string) => {
  if (bidId) {
    const keysToDelete: string[] = [];
    for (const [key] of bidCache['cache'].entries()) {
      if (key.includes(bidId) || key.includes('bids:')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => bidCache.delete(key));
  } else {
    bidCache.clear();
  }
};

export const invalidateUserCache = (userId: string) => {
  const keysToDelete: string[] = [];
  for (const [key] of userCache['cache'].entries()) {
    if (key.includes(userId)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => userCache.delete(key));
};

export const invalidateDashboardCache = () => {
  dashboardCache.clear();
};

// Periodic cleanup
setInterval(() => {
  packageCache.cleanup();
  tripCache.cleanup();
  bidCache.cleanup();
  userCache.cleanup();
  dashboardCache.cleanup();
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export default CachingService;
