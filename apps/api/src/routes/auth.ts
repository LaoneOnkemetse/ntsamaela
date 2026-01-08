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

const loginPhoneValidation = [
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const passwordResetValidation = [
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required')
];

const passwordResetConfirmValidation = [
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const phoneVerificationValidation = [
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const accountRecoveryValidation = [
  body('email').isEmail().withMessage('Valid email is required')
];

const accountRecoveryConfirmValidation = [
  body('token').notEmpty().withMessage('Recovery token is required'),
  body('newPhone').optional().isMobilePhone('any').withMessage('Valid phone number is required if provided')
];

// Routes
router.post('/register', registerValidation, validateRequest, authController.register.bind(authController));
router.post('/login', loginRateLimit, loginValidation, validateRequest, authController.login.bind(authController));
router.post('/login-phone', loginRateLimit, loginPhoneValidation, validateRequest, authController.loginWithPhone.bind(authController));
router.post('/create-driver-profile', requireAuth, authController.createDriverProfile.bind(authController));
router.get('/me', requireAuth, authController.getCurrentUser.bind(authController));
router.post('/request-password-reset', passwordResetValidation, validateRequest, authController.requestPasswordReset.bind(authController));
router.post('/reset-password', passwordResetConfirmValidation, validateRequest, authController.confirmPasswordReset.bind(authController));
router.post('/confirm-password-reset', passwordResetConfirmValidation, validateRequest, authController.confirmPasswordReset.bind(authController));
router.post('/verify-phone', phoneVerificationValidation, validateRequest, authController.verifyPhone.bind(authController));
router.post('/resend-phone-verification', [body('phone').isMobilePhone('any').withMessage('Valid phone number is required')], validateRequest, authController.resendPhoneVerificationOtp.bind(authController));
router.post('/request-account-recovery', accountRecoveryValidation, validateRequest, authController.requestAccountRecovery.bind(authController));
router.post('/confirm-account-recovery', accountRecoveryConfirmValidation, validateRequest, authController.confirmAccountRecovery.bind(authController));
router.post('/logout', requireAuth, authController.logout.bind(authController));
router.post('/change-password', requireAuth, authController.changePassword.bind(authController));
router.post('/fcm-token/register', requireAuth, [body('fcmToken').notEmpty().withMessage('FCM token is required')], validateRequest, authController.registerFcmToken.bind(authController));
router.post('/fcm-token/remove', requireAuth, [body('fcmToken').notEmpty().withMessage('FCM token is required')], validateRequest, authController.removeFcmToken.bind(authController));

export default router;


