import express from 'express';
import performanceController from '../controllers/performanceController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireUserType } from '../middleware/roleAuth';

const router = express.Router();

// All performance routes require authentication
router.use(authenticateToken);

// System health endpoints (accessible to all authenticated users)
router.get('/health', performanceController.getSystemHealth.bind(performanceController));

// Performance metrics endpoints (accessible to all authenticated users)
router.get('/metrics', performanceController.getPerformanceMetrics.bind(performanceController));

// Database performance metrics (accessible to all authenticated users)
router.get('/database', performanceController.getDatabaseMetrics.bind(performanceController));

// Cache performance metrics (accessible to all authenticated users)
router.get('/cache', performanceController.getCacheMetrics.bind(performanceController));

// Optimization recommendations (accessible to all authenticated users)
router.get('/recommendations', performanceController.getOptimizationRecommendations.bind(performanceController));

// Clear performance data (admin only)
router.delete('/data', 
  requireUserType(['ADMIN']),
  performanceController.clearPerformanceData.bind(performanceController)
);

export default router;
