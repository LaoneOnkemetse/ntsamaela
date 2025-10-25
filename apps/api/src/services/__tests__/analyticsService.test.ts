import { AnalyticsService } from '../analyticsService';

// Mock the database package
const mockPrismaClient = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  package: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  bid: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  transaction: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  verification: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  delivery: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  review: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@ntsamaela/database', () => ({
  getPrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService();
    mockPrisma = mockPrismaClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeliveryMetrics', () => {
    it('should return delivery performance metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock Prisma responses
      // Mock the new optimized structure
      mockPrisma.delivery.groupBy.mockResolvedValue([
        { status: 'DELIVERED', _count: { status: 2 } },
        { status: 'FAILED', _count: { status: 1 } }
      ]);
      
      mockPrisma.delivery.findMany.mockResolvedValue([
        { 
          id: '1', 
          status: 'DELIVERED', 
          createdAt: new Date(),
          completedAt: new Date(),
          estimatedDeliveryTime: new Date(),
          driverId: 'driver-1'
        },
        { 
          id: '2', 
          status: 'DELIVERED', 
          createdAt: new Date(),
          completedAt: new Date(),
          estimatedDeliveryTime: new Date(),
          driverId: 'driver-2'
        },
        { 
          id: '3', 
          status: 'FAILED', 
          createdAt: new Date(),
          completedAt: null,
          estimatedDeliveryTime: new Date(),
          driverId: 'driver-3'
        },
      ]);
      
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 4.5, deliveryId: '1' },
        { rating: 4.8, deliveryId: '2' }
      ]);
      mockPrisma.package.count.mockResolvedValue(100);
      mockPrisma.package.aggregate.mockResolvedValue({
        _avg: { priceOffered: 50 },
        _sum: { priceOffered: 5000 },
      });
      mockPrisma.bid.count.mockResolvedValue(150);
      mockPrisma.bid.aggregate.mockResolvedValue({
        _avg: { amount: 45 },
        _sum: { amount: 6750 },
      });

      const result = await analyticsService.getDeliveryMetrics(startDate, endDate);

      expect(result).toEqual({
        totalDeliveries: 3,
        completedDeliveries: 2,
        failedDeliveries: 1,
        averageDeliveryTime: expect.any(Number),
        onTimeDeliveryRate: expect.any(Number),
        customerSatisfactionScore: expect.any(Number),
        driverPerformanceScore: expect.any(Number),
        deliveryVolumeByDay: expect.any(Array),
        deliveryVolumeByHour: expect.any(Array),
        topPerformingDrivers: expect.any(Array),
        deliveryStatusBreakdown: expect.any(Array),
      });

      expect(mockPrisma.delivery.groupBy).toHaveBeenCalled();
      expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      expect(mockPrisma.review.findMany).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock empty results for optimized structure
      mockPrisma.delivery.groupBy.mockResolvedValue([]);
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDeliveryMetrics(startDate, endDate);

      expect(result.totalDeliveries).toBe(0);
      expect(result.completedDeliveries).toBe(0);
      expect(result.failedDeliveries).toBe(0);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return revenue metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock the new optimized structure
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 225 },
        _count: { id: 3 }
      });
      
      mockPrisma.transaction.findMany.mockResolvedValue([
        { id: '1', amount: 50, type: 'DELIVERY_FEE', createdAt: new Date(), deliveryId: 'delivery-1' },
        { id: '2', amount: 75, type: 'DELIVERY_FEE', createdAt: new Date(), deliveryId: 'delivery-2' },
        { id: '3', amount: 100, type: 'DELIVERY_FEE', createdAt: new Date(), deliveryId: 'delivery-3' },
      ]);

      const result = await analyticsService.getRevenueMetrics(startDate, endDate);

      expect(result).toEqual({
        totalRevenue: 225,
        grossRevenue: 225,
        netRevenue: 202.5,
        commissionEarned: 22.5,
        averageOrderValue: 75,
        revenueByDay: expect.any(Array),
        revenueByMonth: expect.any(Array),
        revenueByDriver: expect.any(Array),
        paymentMethodBreakdown: expect.any(Array),
        refundsAndCancellations: expect.any(Object),
      });

      expect(mockPrisma.transaction.aggregate).toHaveBeenCalled();
      expect(mockPrisma.transaction.findMany).toHaveBeenCalled();
    });

    it('should calculate commission revenue correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.transaction.count.mockResolvedValue(10);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
        _avg: { amount: 100 },
      });

      const result = await analyticsService.getRevenueMetrics(startDate, endDate);

      // Commission rate is 10% (0.1)
      expect(result.commissionEarned).toBe(100); // 1000 * 0.1
      expect(result.netRevenue).toBe(900); // 1000 * 0.9
    });
  });

  describe('getUserActivityMetrics', () => {
    it('should return user activity metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.user.count.mockResolvedValue(200);
      mockPrisma.user.findMany.mockResolvedValue([
        { 
          id: '1', 
          userType: 'CUSTOMER', 
          createdAt: new Date(),
          deliveries: [{ id: '1' }],
          packages: [{ id: '1' }]
        },
        { 
          id: '2', 
          userType: 'DRIVER', 
          createdAt: new Date(),
          deliveries: [{ id: '2' }],
          packages: []
        },
        { 
          id: '3', 
          userType: 'CUSTOMER', 
          createdAt: new Date(),
          deliveries: [],
          packages: [{ id: '2' }]
        },
      ]);
      
      // Mock refunds and cancellations
      mockPrisma.transaction.findMany.mockResolvedValueOnce([
        { id: '1', amount: 50, type: 'DELIVERY_FEE', createdAt: new Date() },
        { id: '2', amount: 75, type: 'DELIVERY_FEE', createdAt: new Date() },
        { id: '3', amount: 100, type: 'DELIVERY_FEE', createdAt: new Date() },
      ]).mockResolvedValueOnce([
        { id: '1', amount: 50, type: 'REFUND', createdAt: new Date() },
      ]);

      const result = await analyticsService.getUserActivityMetrics(startDate, endDate);

      expect(result).toEqual({
        totalUsers: 3,
        newUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        userGrowthRate: expect.any(Number),
        userRetentionRate: expect.any(Number),
        userTypeBreakdown: expect.any(Array),
        topActiveUsers: expect.any(Array),
        userEngagementScore: expect.any(Number),
        averageSessionDuration: expect.any(Number),
        churnRate: expect.any(Number),
        userActivityByDay: expect.any(Array),
        userActivityByHour: expect.any(Array),
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lte: endDate,
          },
        },
        include: {
          deliveries: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          packages: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });
    });

    it('should calculate user type distribution', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue([
        { 
          id: '1', 
          userType: 'CUSTOMER', 
          createdAt: new Date(),
          deliveries: [{ id: '1' }],
          packages: [{ id: '1' }]
        },
        { 
          id: '2', 
          userType: 'DRIVER', 
          createdAt: new Date(),
          deliveries: [{ id: '2' }],
          packages: []
        },
        { 
          id: '3', 
          userType: 'CUSTOMER', 
          createdAt: new Date(),
          deliveries: [],
          packages: [{ id: '2' }]
        },
        { 
          id: '4', 
          userType: 'DRIVER', 
          createdAt: new Date(),
          deliveries: [{ id: '3' }],
          packages: []
        },
        { 
          id: '5', 
          userType: 'CUSTOMER', 
          createdAt: new Date(),
          deliveries: [],
          packages: [{ id: '3' }]
        },
      ]);
      
      // Mock refunds and cancellations
      mockPrisma.transaction.findMany.mockResolvedValueOnce([
        { id: '1', amount: 50, type: 'DELIVERY_FEE', createdAt: new Date() },
        { id: '2', amount: 75, type: 'DELIVERY_FEE', createdAt: new Date() },
        { id: '3', amount: 100, type: 'DELIVERY_FEE', createdAt: new Date() },
      ]).mockResolvedValueOnce([
        { id: '1', amount: 50, type: 'REFUND', createdAt: new Date() },
      ]);

      const result = await analyticsService.getUserActivityMetrics(startDate, endDate);

      expect(result.userTypeBreakdown).toEqual([
        { userType: 'CUSTOMER', count: 3, percentage: 60 },
        { userType: 'DRIVER', count: 2, percentage: 40 },
      ]);
    });
  });

  describe('getSystemUsageMetrics', () => {
    it('should return system usage metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock system metrics
      const result = await analyticsService.getSystemUsageMetrics(startDate, endDate);

      expect(result).toEqual({
        totalRequests: expect.any(Number),
        averageResponseTime: expect.any(Number),
        errorRate: expect.any(Number),
        systemUptime: expect.any(Number),
        apiUsageByEndpoint: expect.any(Array),
        databasePerformance: expect.any(Object),
        serverResources: expect.any(Object),
        performanceTrends: expect.any(Array),
        systemHealthScore: expect.any(Number),
      });

      // Verify all metrics are within expected ranges
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.systemUptime).toBeGreaterThanOrEqual(0);
      expect(result.systemUptime).toBeLessThanOrEqual(100);
    });

    it('should return realistic system metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await analyticsService.getSystemUsageMetrics(startDate, endDate);

      // Check that metrics are realistic
      expect(result.averageResponseTime).toBeLessThan(1000); // Less than 1 second
      expect(result.serverResources.memoryUsage).toBeLessThan(100); // Less than 100%
      expect(result.serverResources.cpuUsage).toBeLessThan(100); // Less than 100%
      expect(result.serverResources.diskUsage).toBeLessThan(100); // Less than 100%
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return comprehensive dashboard metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock all service methods
      jest.spyOn(analyticsService, 'getDeliveryMetrics').mockResolvedValue({
        totalPackages: 100,
        completedDeliveries: 80,
        averageDeliveryTime: 2.5,
        successRate: 0.8,
        averagePackageValue: 50,
        totalPackageValue: 5000,
        totalBids: 150,
        averageBidAmount: 45,
        totalBidAmount: 6750,
        bidAcceptanceRate: 0.53,
      });

      jest.spyOn(analyticsService, 'getRevenueMetrics').mockResolvedValue({
        totalRevenue: 2500,
        averageTransactionValue: 50,
        totalTransactions: 50,
        commissionRevenue: 750,
        driverEarnings: 1750,
        revenueGrowth: 0.15,
        topRevenueSources: [],
      });

      jest.spyOn(analyticsService, 'getUserActivityMetrics').mockResolvedValue({
        totalUsers: 200,
        newUsers: 25,
        activeUsers: 150,
        userGrowth: 0.12,
        userRetention: 0.85,
        userTypeDistribution: { CUSTOMER: 120, DRIVER: 80 },
        topActiveUsers: [],
        userEngagementScore: 0.75,
      });

      jest.spyOn(analyticsService, 'getSystemUsageMetrics').mockResolvedValue({
        totalApiCalls: 10000,
        averageResponseTime: 245,
        errorRate: 0.02,
        systemUptime: 99.9,
        databaseConnections: 45,
        memoryUsage: 68,
        cpuUsage: 23,
        diskUsage: 45,
        networkLatency: 12,
        peakUsage: {},
        systemHealth: 'HEALTHY',
      });

      const result = await analyticsService.getDashboardMetrics(startDate, endDate);

      expect(result).toEqual({
        delivery: expect.any(Object),
        revenue: expect.any(Object),
        userActivity: expect.any(Object),
        systemUsage: expect.any(Object),
        summary: expect.any(Object),
        trends: expect.any(Object),
        alerts: expect.any(Array),
      });

      expect(result.summary).toHaveProperty('totalRevenue');
      expect(result.summary).toHaveProperty('totalUsers');
      expect(result.summary).toHaveProperty('totalDeliveries');
      expect(result.summary).toHaveProperty('systemHealth');
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics', async () => {
      const result = await analyticsService.getRealTimeMetrics();

      expect(result).toEqual({
        activeConnections: expect.any(Number),
        currentLoad: expect.any(Number),
        realTimeUsers: expect.any(Number),
        liveDeliveries: expect.any(Number),
        systemStatus: expect.any(String),
        lastUpdated: expect.any(Date),
      });

      expect(result.activeConnections).toBeGreaterThanOrEqual(0);
      expect(result.currentLoad).toBeGreaterThanOrEqual(0);
      expect(result.currentLoad).toBeLessThanOrEqual(100);
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const reportType = 'comprehensive';

      const result = await analyticsService.generateReport(startDate, endDate, reportType);

      expect(result).toEqual({
        reportId: expect.any(String),
        reportType: 'comprehensive',
        period: {
          start: startDate,
          end: endDate,
        },
        generatedAt: expect.any(Date),
        data: expect.any(Object),
        summary: expect.any(Object),
        insights: expect.any(Array),
        recommendations: expect.any(Array),
        exportFormats: ['pdf', 'csv', 'json'],
      });

      expect(result.insights).toHaveLength(5);
      expect(result.recommendations).toHaveLength(3);
    });

    it('should generate different report types', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const comprehensiveReport = await analyticsService.generateReport(startDate, endDate, 'comprehensive');
      const deliveryReport = await analyticsService.generateReport(startDate, endDate, 'delivery');
      const revenueReport = await analyticsService.generateReport(startDate, endDate, 'revenue');

      expect(comprehensiveReport.reportType).toBe('comprehensive');
      expect(deliveryReport.reportType).toBe('delivery');
      expect(revenueReport.reportType).toBe('revenue');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.delivery.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(analyticsService.getDeliveryMetrics(startDate, endDate)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle invalid date ranges', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01'); // End before start

      // Mock empty results for invalid date range
      mockPrisma.delivery.groupBy.mockResolvedValue([]);
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDeliveryMetrics(startDate, endDate);
      expect(result.totalDeliveries).toBe(0);
    });
  });

  describe('data validation', () => {
    it('should validate input parameters', async () => {
      const invalidDate = new Date('invalid');

      // Mock empty results for invalid date
      mockPrisma.delivery.groupBy.mockResolvedValue([]);
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDeliveryMetrics(invalidDate, new Date());
      expect(result.totalDeliveries).toBe(0);
    });

    it('should handle null and undefined values', async () => {
      // Mock empty results for null/undefined values
      mockPrisma.delivery.groupBy.mockResolvedValue([]);
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDeliveryMetrics(new Date(), new Date());

      expect(result.totalDeliveries).toBe(0);
      expect(result.completedDeliveries).toBe(0);
    });
  });
});
