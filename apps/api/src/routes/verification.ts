import { Router } from 'express';
import { VerificationController } from '../controllers/verificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();
const verificationController = new VerificationController();

// Routes
router.post('/submit', requireAuth, verificationController.submitVerification.bind(verificationController));
router.get('/status', requireAuth, verificationController.getVerificationStatus.bind(verificationController));

export default router;


