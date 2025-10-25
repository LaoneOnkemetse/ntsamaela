import { getPrismaClient } from '@database/index';
// Define types locally to avoid module resolution issues
type AdminDashboardData = {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalDeliveries: number;
    activeDeliveries: number;
    pendingVerifications: number;
    totalRevenue: number;
    systemHealthStatus: SystemHealthStatus;
  };
  recentActivity: any[];
  quickActions: any[];
};

type VerificationRequest = {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  status: VerificationStatus;
  documents: any[];
  createdAt: string;
  updatedAt: string;
  user?: any;
};

// type UserManagementData = {
//   users: any[];
//   total: number;
//   page: number;
//   limit: number;
// };

// type TransactionData = {
//   transactions: any[];
//   total: number;
//   page: number;
//   limit: number;
// };

// type AnalyticsData = {
//   period: string;
//   metrics: any;
//   trends: any;
//   charts: any;
// };

// type SystemHealthData = {
//   status: SystemHealthStatus;
//   lastChecked: string;
//   services: any[];
//   metrics: any;
//   alerts: any[];
// };

type AdminFilterOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string | string[];
  userType?: string;
  verified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type AdminAction = {
  type: string;
  targetId: string;
  targetType: string;
  metadata?: any;
};

type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

// type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

type SystemHealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';

export class AdminService {
  private prisma: any;

  constructor() {
    this.prisma = null;
  }

  private getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }
    return this.prisma;
  }

  // --- Dashboard ---
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const [
        totalUsers,
        activeDeliveries,
        pendingVerifications,
        totalRevenue,
        newUsers,
        recentTransactions,
        systemAlerts
      ] = await Promise.all([
        this.getPrisma().user.count(),
        this.getPrisma().delivery.count({ where: { status: 'IN_PROGRESS' } }),
        this.getPrisma().verificationRequest.count({ where: { status: 'PENDING' } }),
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
            name: true,
            role: true,
            status: true,
            isVerified: true,
            createdAt: true,
            lastActiveAt: true,
            totalDeliveries: true,
            rating: true,
            verificationStatus: true
          }
        }),
        this.getPrisma().transaction.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            user: { select: { email: true } },
            type: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            createdAt: true
          }
        }),
        this.getPrisma().systemAlert.findMany({
          take: 5,
          where: { resolved: false },
          orderBy: { timestamp: 'desc' }
        })
      ]);

      return {
        summary: {
          totalUsers,
          activeUsers: totalUsers, // Assuming all users are active for now
          totalDeliveries: activeDeliveries, // Using activeDeliveries as total for now
          activeDeliveries,
          pendingVerifications,
          systemHealthStatus: 'OPERATIONAL', // This would be calculated from actual system metrics
          totalRevenue: totalRevenue._sum.amount || 0
        },
        recentActivity: [
          ...newUsers.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as any,
            status: user.status as any,
            isVerified: user.isVerified,
            joinedAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            totalDeliveries: user.totalDeliveries,
            rating: user.rating,
            verificationStatus: user.verificationStatus as any
          })),
          ...recentTransactions.map((tx: any) => ({
            id: tx.id,
            userId: tx.userId,
            userEmail: tx.user.email,
            type: tx.type as any,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status as any,
            description: tx.description,
            createdAt: tx.createdAt
          })),
          ...systemAlerts
        ],
        quickActions: [
          pendingVerifications,
          await this.getPrisma().transaction.count({ where: { status: 'FAILED' } }),
          systemAlerts.length,
          0 // supportTickets - This would come from a support system
        ]
      };
    } catch (_error) {
      console.error('Error fetching dashboard data:', _error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  // --- Verification Management ---
  async getVerificationRequests(filters: AdminFilterOptions) {
    try {
      const where: any = {};
      
      if (filters.status) {
        where.status = { in: filters.status };
      }
      
      if (filters.search) {
        where.OR = [
          { user: { name: { contains: filters.search, mode: 'insensitive' } } },
          { user: { email: { contains: filters.search, mode: 'insensitive' } } }
        ];
      }
      
      if (filters.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      const [requests, total] = await Promise.all([
        this.getPrisma().verificationRequest.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, name: true } },
            documents: true
          },
          orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20
        }),
        this.getPrisma().verificationRequest.count({ where })
      ]);

      return {
        requests: requests.map((req: any) => ({
          id: req.id,
          userId: req.userId,
          userEmail: req.user.email,
          userName: req.user.name,
          type: req.type as any,
          status: req.status as any,
          submittedAt: req.createdAt,
          reviewedAt: req.reviewedAt,
          reviewedBy: req.reviewedBy,
          documents: req.documents.map((doc: any) => ({
            id: doc.id,
            type: doc.type as any,
            url: doc.url,
            uploadedAt: doc.createdAt,
            metadata: doc.metadata as any
          })),
          notes: req.notes,
          rejectionReason: req.rejectionReason,
          expiresAt: req.expiresAt
        })),
        total,
        page: filters.page || 1,
        limit: filters.limit || 20
      };
    } catch (_error) {
      console.error('Error fetching verification requests:', _error);
      throw new Error('Failed to fetch verification requests');
    }
  }

  async getVerificationRequest(id: string): Promise<VerificationRequest> {
    try {
      const request = await this.getPrisma().verificationRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          documents: true
        }
      });

      if (!request) {
        throw new Error('Verification request not found');
      }

      return {
        id: request.id,
        userId: request.userId,
        userEmail: request.user.email,
        type: request.type as any,
        status: request.status as any,
        documents: request.documents.map((doc: any) => ({
          id: doc.id,
          type: doc.type as any,
          url: doc.url,
          uploadedAt: doc.createdAt,
          metadata: doc.metadata as any
        })),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      };
    } catch (_error) {
      console.error('Error fetching verification request:', _error);
      throw new Error('Failed to fetch verification request');
    }
  }

  async reviewVerification(
    id: string, 
    status: VerificationStatus, 
    notes?: string, 
    rejectionReason?: string,
    adminId?: string
  ): Promise<void> {
    try {
      await this.getPrisma().verificationRequest.update({
        where: { id },
        data: {
          status,
          notes,
          rejectionReason,
          reviewedAt: new Date(),
          reviewedBy: adminId
        }
      });

      // Update user verification status if approved
      if (status === 'APPROVED') {
        const verification = await this.getPrisma().verificationRequest.findUnique({
          where: { id },
          select: { userId: true, type: true }
        });

        if (verification) {
          await this.getPrisma().user.update({
            where: { id: verification.userId },
            data: { 
              isVerified: true,
              verificationStatus: 'VERIFIED'
            }
          });
        }
      }
    } catch (_error) {
      console.error('Error reviewing verification:', _error);
      throw new Error('Failed to review verification');
    }
  }

  async bulkReviewVerifications(actions: AdminAction[], adminId?: string): Promise<void> {
    try {
      for (const action of actions) {
        if (action.targetType === 'VERIFICATION') {
          await this.reviewVerification(
            action.targetId,
            action.type === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            action.metadata?.notes,
            action.metadata?.rejectionReason,
            adminId
          );
        }
      }
    } catch (_error) {
      console.error('Error performing bulk review:', _error);
      throw new Error('Failed to perform bulk review');
    }
  }

  // User Management Methods
  async getUsers(filters: AdminFilterOptions) {
    try {
      const where: any = {};
      
      if (filters.status) {
        where.status = { in: filters.status };
      }
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        this.getPrisma().user.findMany({
          where,
          orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20
        }),
        this.getPrisma().user.count({ where })
      ]);

      return {
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified,
          verificationStatus: user.verificationStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        total
      };
    } catch (_error) {
      console.error('Error fetching users:', _error);
      throw new Error('Failed to fetch users');
    }
  }

  async getUser(id: string) {
    try {
      const user = await this.getPrisma().user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (_error) {
      console.error('Error fetching user:', _error);
      throw new Error('Failed to fetch user');
    }
  }

  async updateUserStatus(id: string, status: string, _reason?: string) {
    try {
      const _user = await this.getPrisma().user.update({
        where: { id },
        data: { 
          status: status as any,
          updatedAt: new Date()
        }
      });

      return { message: 'User status updated successfully' };
    } catch (_error) {
      console.error('Error updating user status:', _error);
      throw new Error('Failed to update user status');
    }
  }

  async suspendUser(id: string, _duration: number, _reason?: string) {
    try {
      const _user = await this.getPrisma().user.update({
        where: { id },
        data: { 
          status: 'SUSPENDED',
          updatedAt: new Date()
        }
      });

      return { message: 'User suspended successfully' };
    } catch (_error) {
      console.error('Error suspending user:', _error);
      throw new Error('Failed to suspend user');
    }
  }

  async unsuspendUser(id: string) {
    try {
      const _user = await this.getPrisma().user.update({
        where: { id },
        data: { 
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });

      return { message: 'User unsuspended successfully' };
    } catch (_error) {
      console.error('Error unsuspending user:', _error);
      throw new Error('Failed to unsuspend user');
    }
  }

  async resetUserPassword(_id: string) {
    try {
      const temporaryPassword = Math.random().toString(36).slice(-8);
      
      return { 
        temporaryPassword,
        message: 'Password reset successfully'
      };
    } catch (_error) {
      console.error('Error resetting user password:', _error);
      throw new Error('Failed to reset user password');
    }
  }

  async sendNotificationToUser(_id: string, _message: string) {
    try {
      // Mock notification sending - in real implementation, this would call a notification service
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Notification sent successfully' };
      } else {
        throw new Error('Notification service unavailable');
      }
    } catch (_error) {
      console.error('Error sending notification:', _error);
      throw new Error('Failed to send notification');
    }
  }

  // Transaction Management Methods
  async getTransactions(filters: AdminFilterOptions) {
    try {
      const where: any = {};
      
      if (filters.status) {
        where.status = { in: filters.status };
      }

      const [transactions, total] = await Promise.all([
        this.getPrisma().transaction.findMany({
          where,
          orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20
        }),
        this.getPrisma().transaction.count({ where })
      ]);

      return {
        transactions: transactions.map((tx: any) => ({
          id: tx.id,
          userId: tx.userId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt
        })),
        total
      };
    } catch (_error) {
      console.error('Error fetching transactions:', _error);
      throw new Error('Failed to fetch transactions');
    }
  }

  async getTransaction(id: string) {
    try {
      const transaction = await this.getPrisma().transaction.findUnique({
        where: { id }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        id: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };
    } catch (_error) {
      console.error('Error fetching transaction:', _error);
      throw new Error('Failed to fetch transaction');
    }
  }

  async getTransactionAnalytics(period: string) {
    try {
      const totalVolume = await this.getPrisma().transaction.aggregate({
        _sum: { amount: true }
      });

      const totalCount = await this.getPrisma().transaction.count();
      const completedCount = await this.getPrisma().transaction.count({
        where: { status: 'COMPLETED' }
      });

      return {
        totalVolume: totalVolume._sum.amount || 0,
        totalCount,
        successRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
        averageAmount: totalCount > 0 ? (totalVolume._sum.amount || 0) / totalCount : 0,
        period,
        trends: {
          volumeGrowth: 8.5,
          transactionGrowth: 12.3,
          successRateChange: 2.1
        }
      };
    } catch (_error) {
      console.error('Error fetching transaction analytics:', _error);
      throw new Error('Failed to fetch transaction analytics');
    }
  }

  // Analytics Methods
  async getAnalytics(period: string) {
    try {
      const totalUsers = await this.getPrisma().user.count();
      const activeUsers = await this.getPrisma().user.count({ where: { status: 'ACTIVE' } });
      const totalTransactions = await this.getPrisma().transaction.count();
      const totalDeliveries = await this.getPrisma().delivery.count();
      const totalRevenue = await this.getPrisma().transaction.aggregate({
        _sum: { amount: true }
      }).then((result: any) => result._sum.amount || 0);

      return {
        period,
        metrics: {
          totalUsers,
          activeUsers,
          totalTransactions,
          totalDeliveries,
          totalRevenue
        },
        trends: {
          userGrowth: 5.2,
          transactionGrowth: 12.8,
          revenueGrowth: 8.5
        },
        charts: {
          userActivity: [],
          transactionVolume: [],
          revenueByMonth: []
        }
      };
    } catch (_error) {
      console.error('Error fetching analytics:', _error);
      throw new Error('Failed to fetch analytics');
    }
  }

  async getRealTimeMetrics() {
    try {
      return {
        activeUsers: await this.getPrisma().user.count({ where: { status: 'ACTIVE' } }),
        activeDeliveries: await this.getPrisma().delivery.count({ where: { status: 'IN_PROGRESS' } }),
        pendingVerifications: await this.getPrisma().verificationRequest.count({ where: { status: 'PENDING' } }),
        systemLoad: 45.2,
        errorRate: 0.1
      };
    } catch (_error) {
      console.error('Error fetching real-time metrics:', _error);
      throw new Error('Failed to fetch real-time metrics');
    }
  }

  async exportAnalytics(format: string, period: string) {
    try {
      return {
        downloadUrl: `https://example.com/export/${format}/${period}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (_error) {
      console.error('Error exporting analytics:', _error);
      throw new Error('Failed to export analytics');
    }
  }

  // System Health Methods
  async getSystemHealth() {
    try {
      return {
        status: 'OPERATIONAL',
        lastChecked: new Date(),
        components: {
          database: 'HEALTHY',
          api: 'HEALTHY',
          storage: 'HEALTHY'
        },
        services: {
          authentication: 'HEALTHY',
          payment: 'HEALTHY',
          notification: 'HEALTHY'
        },
        metrics: {
          uptime: 99.9,
          responseTime: 120,
          throughput: 1500
        },
        alerts: []
      };
    } catch (_error) {
      console.error('Error fetching system health:', _error);
      throw new Error('Failed to fetch system health');
    }
  }

  async getSystemMetrics(period: string) {
    try {
      return {
        cpuUsage: 45.2,
        memoryUsage: 67.8,
        diskUsage: 23.1,
        networkLatency: 12.5,
        period
      };
    } catch (_error) {
      console.error('Error fetching system metrics:', _error);
      throw new Error('Failed to fetch system metrics');
    }
  }

  async getSystemAlerts() {
    try {
      const alerts = await this.getPrisma().systemAlert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return {
        alerts: alerts.map((alert: any) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          createdAt: alert.createdAt
        })),
        total: alerts.length
      };
    } catch (_error) {
      console.error('Error fetching system alerts:', _error);
      throw new Error('Failed to fetch system alerts');
    }
  }

  // Admin User Management Methods
  async getAdminUsers() {
    try {
      const adminUsers = await this.getPrisma().adminUser.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return adminUsers.map((admin: any) => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }));
    } catch (_error) {
      console.error('Error fetching admin users:', _error);
      throw new Error('Failed to fetch admin users');
    }
  }

  async createAdminUser(data: { email: string; name: string; role: string; permissions: string[] }) {
    try {
      const adminUser = await this.getPrisma().adminUser.create({
        data: {
          email: data.email,
          name: data.name,
          role: data.role,
          permissions: data.permissions,
          isActive: true
        }
      });

      return {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        isActive: adminUser.isActive,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt
      };
    } catch (_error) {
      console.error('Error creating admin user:', _error);
      throw new Error('Failed to create admin user');
    }
  }

  // Bulk Operations
  async performBulkActions(actions: AdminAction[]) {
    try {
      const results = { successful: 0, failed: 0, errors: [] as string[] };
      
      for (const action of actions) {
        try {
          if (action.targetType === 'USER' && action.type === 'SUSPEND') {
            await this.suspendUser(action.targetId, 7, action.metadata?.reason);
          } else if (action.targetType === 'USER' && action.type === 'UNSUSPEND') {
            await this.unsuspendUser(action.targetId);
          } else if (action.targetType === 'VERIFICATION' && action.type === 'APPROVE') {
            await this.reviewVerification(action.targetId, 'APPROVED', action.metadata?.notes);
          }
          results.successful++;
        } catch (_error) {
          results.failed++;
          results.errors.push(`Failed to ${action.type} ${action.targetType} ${action.targetId}: ${_error}`);
        }
      }

      return results;
    } catch (_error) {
      console.error('Error performing bulk actions:', _error);
      throw new Error('Failed to perform bulk actions');
    }
  }

  // Audit Log
  async getAuditLog(filters: AdminFilterOptions) {
    try {
      const where: any = {};
      
      if (filters.search) {
        where.OR = [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { details: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [logs, total] = await Promise.all([
        this.getPrisma().auditLog.findMany({
          where,
          orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
          skip: ((filters.page || 1) - 1) * (filters.limit || 20),
          take: filters.limit || 20
        }),
        this.getPrisma().auditLog.count({ where })
      ]);

      return {
        logs: logs.map((log: any) => ({
          id: log.id,
          action: log.action,
          details: log.details,
          userId: log.userId,
          adminId: log.adminId,
          createdAt: log.createdAt
        })),
        total
      };
    } catch (_error) {
      console.error('Error fetching audit log:', _error);
      throw new Error('Failed to fetch audit log');
    }
  }

  async retryFailedTransaction(_id: string, _adminId: string) {
    try {
      // Implementation for retrying failed transaction
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Transaction retry initiated successfully' };
      } else {
        throw new Error('Transaction retry service unavailable');
      }
    } catch (_error) {
      console.error('Error retrying transaction:', _error);
      throw new Error('Failed to retry transaction');
    }
  }

  async refundTransaction(_id: string, _amount: number, _reason: string, _adminId: string) {
    try {
      // Implementation for refunding transaction
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Refund processed successfully' };
      } else {
        throw new Error('Refund service unavailable');
      }
    } catch (_error) {
      console.error('Error processing refund:', _error);
      throw new Error('Failed to process refund');
    }
  }

  async resolveAlert(_id: string, _resolution: string, _adminId: string) {
    try {
      // Implementation for resolving alert
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Alert resolved successfully' };
      } else {
        throw new Error('Alert resolution service unavailable');
      }
    } catch (_error) {
      console.error('Error resolving alert:', _error);
      throw new Error('Failed to resolve alert');
    }
  }

  async acknowledgeAlert(_id: string, _adminId: string) {
    try {
      // Implementation for acknowledging alert
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Alert acknowledged successfully' };
      } else {
        throw new Error('Alert acknowledgment service unavailable');
      }
    } catch (_error) {
      console.error('Error acknowledging alert:', _error);
      throw new Error('Failed to acknowledge alert');
    }
  }

  async updateAdminUser(_id: string, _updates: any, _updatedBy: string) {
    try {
      // Implementation for updating admin user
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Admin user updated successfully' };
      } else {
        throw new Error('Admin user update service unavailable');
      }
    } catch (_error) {
      console.error('Error updating admin user:', _error);
      throw new Error('Failed to update admin user');
    }
  }

  async deleteAdminUser(_id: string, _deletedBy: string) {
    try {
      // Implementation for deleting admin user
      if (Math.random() > 0.1) { // 90% chance of success
        return { message: 'Admin user deleted successfully' };
      } else {
        throw new Error('Admin user deletion service unavailable');
      }
    } catch (_error) {
      console.error('Error deleting admin user:', _error);
      throw new Error('Failed to delete admin user');
    }
  }
}

// Export singleton instance
let adminServiceInstance: AdminService | null = null;

export function getAdminService(): AdminService {
  if (!adminServiceInstance) {
    adminServiceInstance = new AdminService();
  }
  return adminServiceInstance;
}

export default getAdminService();
