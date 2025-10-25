import { Router } from 'express';
import { requireAuth, requireUserType } from '../middleware/auth';

const router = Router();

// Admin routes
router.get('/dashboard', requireAuth, requireUserType(['ADMIN']), (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Admin dashboard',
      stats: {
        users: 0,
        packages: 0,
        trips: 0
      }
    }
  });
});

export default router;


