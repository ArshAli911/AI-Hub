import { Router } from 'express';
import { communicationController } from '../controllers/communicationController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Email routes
router.post('/email/send', 
  rateLimiter.general, 
  communicationController.sendEmail
);

router.post('/email/welcome', 
  rateLimiter.general, 
  communicationController.sendWelcomeEmail
);

router.post('/email/password-reset', 
  rateLimiter.general, 
  communicationController.sendPasswordResetEmail
);

router.post('/email/verification', 
  rateLimiter.general, 
  communicationController.sendEmailVerification
);

router.post('/email/session-confirmation', 
  rateLimiter.general, 
  communicationController.sendSessionConfirmation
);

router.post('/email/session-reminder', 
  rateLimiter.general, 
  communicationController.sendSessionReminder
);

router.post('/email/notification', 
  rateLimiter.general, 
  communicationController.sendNotificationEmail
);

router.get('/email/verify-connection', 
  communicationController.verifyEmailConnection
);

// SMS routes
router.post('/sms/send', 
  rateLimiter.general, 
  communicationController.sendSms
);

router.post('/sms/verification-code', 
  rateLimiter.general, 
  communicationController.sendVerificationCode
);

router.post('/sms/session-reminder', 
  rateLimiter.general, 
  communicationController.sendSessionReminderSms
);

export default router;