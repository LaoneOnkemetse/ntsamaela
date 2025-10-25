import { Router } from 'express';
import { analyticsService } from '../services/analyticsService';
import { requireAuth } from '../middleware/auth';
import { startOfDay, endOfDay, subDays, subMonths } from 'date-fns';

const router = Router();

// Apply authentication middleware to all analytics routes
router.use(requireAuth);

// Get delivery performance metrics
router.get('/delivery-metrics', async (req: any, res: any) => {
  try {
    const { startDate, endDate, driverId, period } = req.query;
    
    let start: Date;
    let end: Date;

    if (period) {
      // Handle predefined periods
      switch (period) {
        case 'today':
          start = startOfDay(new Date());
          end = endOfDay(new Date());
          break;
        case 'yesterday':
          start = startOfDay(subDays(new Date(), 1));
          end = endOfDay(subDays(new Date(), 1));
          break;
        case 'last7days':
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
          break;
        case 'last30days':
          start = startOfDay(subDays(new Date(), 30));
          end = endOfDay(new Date());
          break;
        case 'last3months':
          start = startOfDay(subMonths(new Date(), 3));
          end = endOfDay(new Date());
          break;
        default:
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
      }
    } else {
      start = startDate ? new Date(startDate) : startOfDay(subDays(new Date(), 7));
      end = endDate ? new Date(endDate) : endOfDay(new Date());
    }

    const metrics = await analyticsService.getDeliveryMetrics(start, end, driverId);
    
    res.json({
      success: true,
      data: metrics,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery metrics',
    });
  }
});

// Get revenue metrics
router.get('/revenue-metrics', async (req: any, res: any) => {
  try {
    const { startDate, endDate, driverId, period } = req.query;
    
    let start: Date;
    let end: Date;

    if (period) {
      switch (period) {
        case 'today':
          start = startOfDay(new Date());
          end = endOfDay(new Date());
          break;
        case 'yesterday':
          start = startOfDay(subDays(new Date(), 1));
          end = endOfDay(subDays(new Date(), 1));
          break;
        case 'last7days':
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
          break;
        case 'last30days':
          start = startOfDay(subDays(new Date(), 30));
          end = endOfDay(new Date());
          break;
        case 'last3months':
          start = startOfDay(subMonths(new Date(), 3));
          end = endOfDay(new Date());
          break;
        default:
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
      }
    } else {
      start = startDate ? new Date(startDate) : startOfDay(subDays(new Date(), 7));
      end = endDate ? new Date(endDate) : endOfDay(new Date());
    }

    const metrics = await analyticsService.getRevenueMetrics(start, end, driverId);
    
    res.json({
      success: true,
      data: metrics,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue metrics',
    });
  }
});

// Get user activity metrics
router.get('/user-activity-metrics', async (req: any, res: any) => {
  try {
    const { startDate, endDate, period } = req.query;
    
    let start: Date;
    let end: Date;

    if (period) {
      switch (period) {
        case 'today':
          start = startOfDay(new Date());
          end = endOfDay(new Date());
          break;
        case 'yesterday':
          start = startOfDay(subDays(new Date(), 1));
          end = endOfDay(subDays(new Date(), 1));
          break;
        case 'last7days':
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
          break;
        case 'last30days':
          start = startOfDay(subDays(new Date(), 30));
          end = endOfDay(new Date());
          break;
        case 'last3months':
          start = startOfDay(subMonths(new Date(), 3));
          end = endOfDay(new Date());
          break;
        default:
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
      }
    } else {
      start = startDate ? new Date(startDate) : startOfDay(subDays(new Date(), 7));
      end = endDate ? new Date(endDate) : endOfDay(new Date());
    }

    const metrics = await analyticsService.getUserActivityMetrics(start, end);
    
    res.json({
      success: true,
      data: metrics,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity metrics',
    });
  }
});

// Get system usage metrics
router.get('/system-usage-metrics', async (req: any, res: any) => {
  try {
    const { startDate, endDate, period } = req.query;
    
    let start: Date;
    let end: Date;

    if (period) {
      switch (period) {
        case 'today':
          start = startOfDay(new Date());
          end = endOfDay(new Date());
          break;
        case 'yesterday':
          start = startOfDay(subDays(new Date(), 1));
          end = endOfDay(subDays(new Date(), 1));
          break;
        case 'last7days':
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
          break;
        case 'last30days':
          start = startOfDay(subDays(new Date(), 30));
          end = endOfDay(new Date());
          break;
        case 'last3months':
          start = startOfDay(subMonths(new Date(), 3));
          end = endOfDay(new Date());
          break;
        default:
          start = startOfDay(subDays(new Date(), 7));
          end = endOfDay(new Date());
      }
    } else {
      start = startDate ? new Date(startDate) : startOfDay(subDays(new Date(), 7));
      end = endDate ? new Date(endDate) : endOfDay(new Date());
    }

    const metrics = await analyticsService.getSystemUsageMetrics(start, end);
    
    res.json({
      success: true,
      data: metrics,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system usage metrics',
    });
  }
});

// Get comprehensive dashboard metrics
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const { period } = req.query;
    
    let start: Date;
    let end: Date;

    switch (period) {
      case 'today':
        start = startOfDay(new Date());
        end = endOfDay(new Date());
        break;
      case 'yesterday':
        start = startOfDay(subDays(new Date(), 1));
        end = endOfDay(subDays(new Date(), 1));
        break;
      case 'last7days':
        start = startOfDay(subDays(new Date(), 7));
        end = endOfDay(new Date());
        break;
      case 'last30days':
        start = startOfDay(subDays(new Date(), 30));
        end = endOfDay(new Date());
        break;
      case 'last3months':
        start = startOfDay(subMonths(new Date(), 3));
        end = endOfDay(new Date());
        break;
      default:
        start = startOfDay(subDays(new Date(), 7));
        end = endOfDay(new Date());
    }

    // Fetch all metrics in parallel
    const [
      deliveryMetrics,
      revenueMetrics,
      userActivityMetrics,
      systemUsageMetrics,
    ] = await Promise.all([
      analyticsService.getDeliveryMetrics(start, end),
      analyticsService.getRevenueMetrics(start, end),
      analyticsService.getUserActivityMetrics(start, end),
      analyticsService.getSystemUsageMetrics(start, end),
    ]);

    res.json({
      success: true,
      data: {
        delivery: deliveryMetrics,
        revenue: revenueMetrics,
        userActivity: userActivityMetrics,
        systemUsage: systemUsageMetrics,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
    });
  }
});

// Get real-time metrics
router.get('/realtime', async (req: any, res: any) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      deliveryMetrics,
      revenueMetrics,
      userActivityMetrics,
      systemUsageMetrics,
    ] = await Promise.all([
      analyticsService.getDeliveryMetrics(oneHourAgo, now),
      analyticsService.getRevenueMetrics(oneHourAgo, now),
      analyticsService.getUserActivityMetrics(oneHourAgo, now),
      analyticsService.getSystemUsageMetrics(oneHourAgo, now),
    ]);

    res.json({
      success: true,
      data: {
        delivery: deliveryMetrics,
        revenue: revenueMetrics,
        userActivity: userActivityMetrics,
        systemUsage: systemUsageMetrics,
      },
      timestamp: now.toISOString(),
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time metrics',
    });
  }
});

// Generate reports
router.post('/reports', async (req: any, res: any) => {
  try {
    const { startDate, endDate, reportType } = req.body;

    if (!startDate || !endDate || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: startDate, endDate, reportType',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    const report = await analyticsService.generateReport(start, end, reportType);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
});

// Get specific report
router.get('/reports/:reportId', async (req: any, res: any) => {
  try {
    const { reportId: _reportId } = req.params;
    
    // In a real implementation, you would fetch the report from storage
    // For now, we'll generate a new report
    const report = await analyticsService.generateReport(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date(),
      'comprehensive'
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }
});

// Download report
router.get('/reports/:reportId/download', async (req: any, res: any) => {
  try {
    const { reportId: _reportId } = req.params;
    const { format = 'pdf' } = req.query;

    const supportedFormats = ['pdf', 'csv', 'json'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported format. Supported formats: pdf, csv, json',
      });
    }

    // Generate report data
    const report = await analyticsService.generateReport(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
      'comprehensive'
    );

    // Generate a unique report ID
    const reportId = `report-${Date.now()}`;

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${reportId}.pdf`);
      // In a real implementation, you would generate a PDF
      res.send('PDF content would be here');
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${reportId}.csv`);
      // In a real implementation, you would convert to CSV
      res.send('CSV content would be here');
    } else {
      res.json({
        success: true,
        data: report,
      });
    }
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to download report',
    });
  }
});

// Export analytics data
router.get('/export', async (req: any, res: any) => {
  try {
    const { startDate, endDate, format, metrics } = req.query;
    
    const start = startDate ? new Date(startDate) : startOfDay(subDays(new Date(), 30));
    const end = endDate ? new Date(endDate) : endOfDay(new Date());

    const exportData: any = {};

    if (!metrics || metrics.includes('delivery')) {
      exportData.delivery = await analyticsService.getDeliveryMetrics(start, end);
    }
    
    if (!metrics || metrics.includes('revenue')) {
      exportData.revenue = await analyticsService.getRevenueMetrics(start, end);
    }
    
    if (!metrics || metrics.includes('userActivity')) {
      exportData.userActivity = await analyticsService.getUserActivityMetrics(start, end);
    }
    
    if (!metrics || metrics.includes('systemUsage')) {
      exportData.systemUsage = await analyticsService.getSystemUsageMetrics(start, end);
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      res.send(csvData);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: exportData,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        exportedAt: new Date().toISOString(),
      });
    }
  } catch (_error) {
    console.error('Analytics routes error:', _error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data: any): string {
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push('Metric Type,Date,Value,Details');
  
  // Add delivery metrics
  if (data.delivery) {
    csvRows.push(`Delivery,${new Date().toISOString()},${data.delivery.totalDeliveries},Total Deliveries`);
    csvRows.push(`Delivery,${new Date().toISOString()},${data.delivery.completedDeliveries},Completed Deliveries`);
    csvRows.push(`Delivery,${new Date().toISOString()},${data.delivery.averageDeliveryTime},Average Delivery Time (minutes)`);
    csvRows.push(`Delivery,${new Date().toISOString()},${data.delivery.onTimeDeliveryRate},On-Time Delivery Rate (%)`);
  }
  
  // Add revenue metrics
  if (data.revenue) {
    csvRows.push(`Revenue,${new Date().toISOString()},${data.revenue.totalRevenue},Total Revenue`);
    csvRows.push(`Revenue,${new Date().toISOString()},${data.revenue.netRevenue},Net Revenue`);
    csvRows.push(`Revenue,${new Date().toISOString()},${data.revenue.commissionEarned},Commission Earned`);
  }
  
  // Add user activity metrics
  if (data.userActivity) {
    csvRows.push(`User Activity,${new Date().toISOString()},${data.userActivity.totalUsers},Total Users`);
    csvRows.push(`User Activity,${new Date().toISOString()},${data.userActivity.activeUsers},Active Users`);
    csvRows.push(`User Activity,${new Date().toISOString()},${data.userActivity.newUsers},New Users`);
  }
  
  // Add system usage metrics
  if (data.systemUsage) {
    csvRows.push(`System Usage,${new Date().toISOString()},${data.systemUsage.totalRequests},Total Requests`);
    csvRows.push(`System Usage,${new Date().toISOString()},${data.systemUsage.averageResponseTime},Average Response Time (ms)`);
    csvRows.push(`System Usage,${new Date().toISOString()},${data.systemUsage.errorRate},Error Rate (%)`);
    csvRows.push(`System Usage,${new Date().toISOString()},${data.systemUsage.systemUptime},System Uptime (%)`);
  }
  
  return csvRows.join('\n');
}

export default router;







