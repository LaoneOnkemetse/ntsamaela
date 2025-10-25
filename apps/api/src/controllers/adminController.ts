import { Response } from 'express';
import { AuthenticatedRequest } from '@ntsamaela/shared/types';
import { AdminService } from '../services/adminService';
// Define types locally to avoid module resolution issues
type AdminFilterOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string | string[];
  userType?: string;
  verified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: string;
};

// type AdminAction = {
//   type: string;
//   targetId: string;
//   targetType: string;
//   metadata?: any;
// };

// type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

// type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

// type SystemHealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  // --- Dashboard ---
  async getDashboardData(req: AuthenticatedRequest, res: Response) {
    try {
      const dashboardData = await this.adminService.getDashboardData();
      res.json(dashboardData);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch dashboard data' });
    }
  }

  // --- Verification Management ---
  async getVerificationRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const filters: AdminFilterOptions = {
        status: req.query.status ? [req.query.status as string] : undefined,
        dateFrom: req.query.startDate as string,
        dateTo: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.adminService.getVerificationRequests(filters);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch verification requests' });
    }
  }

  async getVerificationRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const verification = await this.adminService.getVerificationRequest(id);
      res.json(verification);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch verification request' });
    }
  }

  async reviewVerification(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes, rejectionReason } = req.body;
      const adminId = req.user?.id; // Assuming admin user is attached to request

      await this.adminService.reviewVerification(id, status, notes, rejectionReason, adminId);
      res.json({ message: 'Verification reviewed successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to review verification' });
    }
  }

  async bulkReviewVerifications(req: AuthenticatedRequest, res: Response) {
    try {
      const { actions } = req.body;
      const adminId = req.user?.id;

      await this.adminService.bulkReviewVerifications(actions, adminId);
      res.json({ message: 'Bulk review completed successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to perform bulk review' });
    }
  }

  // --- User Management ---
  async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const filters: AdminFilterOptions = {
        status: req.query.status as string,
        role: req.query.role as string,
        dateFrom: req.query.startDate as string,
        dateTo: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.adminService.getUsers(filters);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch users' });
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await this.adminService.getUser(id);
      res.json(user);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch user' });
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      await this.adminService.updateUserStatus(id, status, reason);
      res.json({ message: 'User status updated successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to update user status' });
    }
  }

  async suspendUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, duration } = req.body;
      const adminId = req.user?.id;

      await this.adminService.suspendUser(id, duration, reason);
      res.json({ message: 'User suspended successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to suspend user' });
    }
  }

  async unsuspendUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      await this.adminService.unsuspendUser(id);
      res.json({ message: 'User unsuspended successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to unsuspend user' });
    }
  }

  async resetUserPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const _adminId = req.user?.id;

      const result = await this.adminService.resetUserPassword(id);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to reset user password' });
    }
  }

  async sendNotificationToUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title: _title, message } = req.body;
      const _adminId = req.user?.id;

      await this.adminService.sendNotificationToUser(id, message);
      res.json({ message: 'Notification sent successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to send notification' });
    }
  }

  // --- Transaction Monitoring ---
  async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const filters: AdminFilterOptions = {
        status: req.query.status as string,
        dateFrom: req.query.startDate as string,
        dateTo: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.adminService.getTransactions(filters);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch transactions' });
    }
  }

  async getTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const transaction = await this.adminService.getTransaction(id);
      res.json(transaction);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch transaction' });
    }
  }

  async retryFailedTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      await this.adminService.retryFailedTransaction(id, adminId || '');
      res.json({ message: 'Transaction retry initiated successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to retry transaction' });
    }
  }

  async refundTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const adminId = req.user?.id;

      await this.adminService.refundTransaction(id, amount, reason, adminId || '');
      res.json({ message: 'Refund processed successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to process refund' });
    }
  }

  async getTransactionAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { period } = req.query;
      const analytics = await this.adminService.getTransactionAnalytics(period as string);
      res.json(analytics);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch transaction analytics' });
    }
  }

  // --- Analytics Dashboard ---
  async getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { period } = req.query;
      const analytics = await this.adminService.getAnalytics(period as string);
      res.json(analytics);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch analytics' });
    }
  }

  async getRealTimeMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const metrics = await this.adminService.getRealTimeMetrics();
      res.json(metrics);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch real-time metrics' });
    }
  }

  async exportAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { period, format } = req.body;
      const result = await this.adminService.exportAnalytics(period, format);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to export analytics' });
    }
  }

  // --- System Health Monitoring ---
  async getSystemHealth(req: AuthenticatedRequest, res: Response) {
    try {
      const health = await this.adminService.getSystemHealth();
      res.json(health);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch system health' });
    }
  }

  async getSystemMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const { period } = req.query;
      const metrics = await this.adminService.getSystemMetrics(period as string);
      res.json(metrics);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch system metrics' });
    }
  }

  async getSystemAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const _filters: AdminFilterOptions = {
        status: req.query.status as string,
        dateFrom: req.query.startDate as string,
        dateTo: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.adminService.getSystemAlerts();
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch system alerts' });
    }
  }

  async resolveAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      const adminId = req.user?.id;

      await this.adminService.resolveAlert(id, resolution, adminId || '');
      res.json({ message: 'Alert resolved successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to resolve alert' });
    }
  }

  async acknowledgeAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      await this.adminService.acknowledgeAlert(id, adminId || '');
      res.json({ message: 'Alert acknowledged successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to acknowledge alert' });
    }
  }

  // --- Admin User Management ---
  async getAdminUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await this.adminService.getAdminUsers();
      res.json(users);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch admin users' });
    }
  }

  async createAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, name, role, permissions } = req.body;
      const _createdBy = req.user?.id;

      const user = await this.adminService.createAdminUser({ email, name, role, permissions });
      res.status(201).json(user);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to create admin user' });
    }
  }

  async updateAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user?.id;

      const user = await this.adminService.updateAdminUser(id, updates, updatedBy || '');
      res.json(user);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to update admin user' });
    }
  }

  async deleteAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.id;

      await this.adminService.deleteAdminUser(id, deletedBy || '');
      res.json({ message: 'Admin user deleted successfully' });
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to delete admin user' });
    }
  }

  // --- Bulk Operations ---
  async performBulkAction(req: AuthenticatedRequest, res: Response) {
    try {
      const { actions } = req.body;
      const _adminId = req.user?.id;

      const result = await this.adminService.performBulkActions(actions);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to perform bulk action' });
    }
  }

  // --- Audit Log ---
  async getAuditLog(req: AuthenticatedRequest, res: Response) {
    try {
      const filters: AdminFilterOptions = {
        dateFrom: req.query.startDate as string,
        dateTo: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.adminService.getAuditLog(filters);
      res.json(result);
    } catch (_error: any) {
      res.status(500).json({ message: _error.message || 'Failed to fetch audit log' });
    }
  }
}
