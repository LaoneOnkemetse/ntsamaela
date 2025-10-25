import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();
const adminController = new AdminController();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

// --- Dashboard ---
router.get('/dashboard', adminController.getDashboardData.bind(adminController));

// --- Verification Management ---
router.get('/verifications', adminController.getVerificationRequests.bind(adminController));
router.get('/verifications/:id', adminController.getVerificationRequest.bind(adminController));
router.put('/verifications/:id/review', adminController.reviewVerification.bind(adminController));
router.post('/verifications/bulk-review', adminController.bulkReviewVerifications.bind(adminController));

// --- User Management ---
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUser.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.post('/users/:id/suspend', adminController.suspendUser.bind(adminController));
router.post('/users/:id/unsuspend', adminController.unsuspendUser.bind(adminController));
router.post('/users/:id/reset-password', adminController.resetUserPassword.bind(adminController));
router.post('/users/:id/notify', adminController.sendNotificationToUser.bind(adminController));

// --- Transaction Monitoring ---
router.get('/transactions', adminController.getTransactions.bind(adminController));
router.get('/transactions/analytics', adminController.getTransactionAnalytics.bind(adminController));
router.get('/transactions/:id', adminController.getTransaction.bind(adminController));
router.post('/transactions/:id/retry', adminController.retryFailedTransaction.bind(adminController));
router.post('/transactions/:id/refund', adminController.refundTransaction.bind(adminController));

// --- Analytics Dashboard ---
router.get('/analytics', adminController.getAnalytics.bind(adminController));
router.get('/analytics/realtime', adminController.getRealTimeMetrics.bind(adminController));
router.post('/analytics/export', adminController.exportAnalytics.bind(adminController));

// --- System Health Monitoring ---
router.get('/system/health', adminController.getSystemHealth.bind(adminController));
router.get('/system/metrics', adminController.getSystemMetrics.bind(adminController));
router.get('/system/alerts', adminController.getSystemAlerts.bind(adminController));
router.put('/system/alerts/:id/resolve', adminController.resolveAlert.bind(adminController));
router.put('/system/alerts/:id/acknowledge', adminController.acknowledgeAlert.bind(adminController));

// --- Admin User Management ---
router.get('/admin/users', adminController.getAdminUsers.bind(adminController));
router.post('/admin/users', adminController.createAdminUser.bind(adminController));
router.put('/admin/users/:id', adminController.updateAdminUser.bind(adminController));
router.delete('/admin/users/:id', adminController.deleteAdminUser.bind(adminController));

// --- Bulk Operations ---
router.post('/bulk-action', adminController.performBulkAction.bind(adminController));

// --- Audit Log ---
router.get('/audit-log', adminController.getAuditLog.bind(adminController));

export default router;
