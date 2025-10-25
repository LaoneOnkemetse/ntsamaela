import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { loginRateLimit } from '../middleware/rateLimiting';

const router = Router();
const authController = new AuthController();

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('userType').isIn(['CUSTOMER', 'DRIVER']).withMessage('Valid user type is required')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const passwordResetValidation = [
  body('email').isEmail().withMessage('Valid email is required')
];

const passwordResetConfirmValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Routes
router.post('/register', registerValidation, validateRequest, authController.register.bind(authController));
router.post('/login', loginRateLimit, loginValidation, validateRequest, authController.login.bind(authController));
router.post('/create-driver-profile', requireAuth, authController.createDriverProfile.bind(authController));
router.get('/me', requireAuth, authController.getCurrentUser.bind(authController));
router.post('/request-password-reset', passwordResetValidation, validateRequest, authController.requestPasswordReset.bind(authController));
router.post('/reset-password', passwordResetConfirmValidation, validateRequest, authController.confirmPasswordReset.bind(authController));
router.post('/confirm-password-reset', passwordResetConfirmValidation, validateRequest, authController.confirmPasswordReset.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.get('/verify-email/:token', authController.verifyEmail.bind(authController));
router.post('/logout', requireAuth, authController.logout.bind(authController));
router.post('/change-password', requireAuth, authController.changePassword.bind(authController));
router.post('/resend-verification-email', authController.resendVerificationEmail.bind(authController));

export default router;


