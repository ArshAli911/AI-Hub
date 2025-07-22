import { Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';
import logger from '../services/loggerService';

// Validation schemas
const sendEmailSchema = Joi.object({
  to: Joi.alternatives().try(
    Joi.string().email().required(),
    Joi.array().items(Joi.string().email()).min(1).required()
  ),
  subject: Joi.string().required(),
  text: Joi.string().when('html', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  html: Joi.string().optional(),
  template: Joi.string().optional(),
  context: Joi.object().optional(),
  cc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ).optional(),
  bcc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ).optional(),
  replyTo: Joi.string().email().optional(),
  attachments: Joi.array().items(
    Joi.object({
      filename: Joi.string().required(),
      content: Joi.alternatives().try(
        Joi.string(),
        Joi.binary()
      ).optional(),
      path: Joi.string().optional(),
      contentType: Joi.string().optional()
    })
  ).optional()
});

const sendSmsSchema = Joi.object({
  to: Joi.string().required(),
  body: Joi.string().required(),
  mediaUrl: Joi.array().items(Joi.string().uri()).optional()
});

const sendWelcomeEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required()
});

const sendPasswordResetEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  resetToken: Joi.string().required()
});

const sendVerificationEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  verificationToken: Joi.string().required()
});

const sendSessionConfirmationSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  sessionDetails: Joi.object({
    id: Joi.string().required(),
    title: Joi.string().required(),
    date: Joi.string().required(),
    time: Joi.string().required(),
    duration: Joi.string().required(),
    mentorName: Joi.string().required()
  }).required()
});

const sendSessionReminderSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  sessionDetails: Joi.object({
    id: Joi.string().required(),
    title: Joi.string().required(),
    date: Joi.string().required(),
    time: Joi.string().required(),
    mentorName: Joi.string().required(),
    joinUrl: Joi.string().uri().required()
  }).required()
});

const sendNotificationEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  notification: Joi.object({
    title: Joi.string().required(),
    message: Joi.string().required(),
    actionUrl: Joi.string().uri().optional(),
    actionText: Joi.string().optional()
  }).required()
});

const sendVerificationCodeSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  code: Joi.string().required()
});

const sendSessionReminderSmsSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  sessionDetails: Joi.object({
    title: Joi.string().required(),
    time: Joi.string().required(),
    joinUrl: Joi.string().uri().required()
  }).required()
});

export class CommunicationController {
  /**
   * Send custom email
   */
  sendEmail = [
    validateRequest(sendEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const success = await emailService.sendEmail(req.body);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send email'
          });
        }
      } catch (error) {
        logger.error('Error sending email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send custom SMS
   */
  sendSms = [
    validateRequest(sendSmsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const success = await smsService.sendSMS(req.body);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'SMS sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send SMS'
          });
        }
      } catch (error) {
        logger.error('Error sending SMS:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send SMS',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send welcome email
   */
  sendWelcomeEmail = [
    validateRequest(sendWelcomeEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, name } = req.body;
        const success = await emailService.sendWelcomeEmail(email, name);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Welcome email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send welcome email'
          });
        }
      } catch (error) {
        logger.error('Error sending welcome email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send welcome email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send password reset email
   */
  sendPasswordResetEmail = [
    validateRequest(sendPasswordResetEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, resetToken } = req.body;
        const success = await emailService.sendPasswordResetEmail(email, resetToken);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Password reset email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send password reset email'
          });
        }
      } catch (error) {
        logger.error('Error sending password reset email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send password reset email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send email verification
   */
  sendEmailVerification = [
    validateRequest(sendVerificationEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, verificationToken } = req.body;
        const success = await emailService.sendEmailVerification(email, verificationToken);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Email verification sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send email verification'
          });
        }
      } catch (error) {
        logger.error('Error sending email verification:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send email verification',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send session confirmation email
   */
  sendSessionConfirmation = [
    validateRequest(sendSessionConfirmationSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, name, sessionDetails } = req.body;
        const success = await emailService.sendSessionConfirmation(email, name, sessionDetails);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Session confirmation email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send session confirmation email'
          });
        }
      } catch (error) {
        logger.error('Error sending session confirmation email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send session confirmation email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send session reminder email
   */
  sendSessionReminder = [
    validateRequest(sendSessionReminderSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, name, sessionDetails } = req.body;
        const success = await emailService.sendSessionReminder(email, name, sessionDetails);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Session reminder email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send session reminder email'
          });
        }
      } catch (error) {
        logger.error('Error sending session reminder email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send session reminder email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send notification email
   */
  sendNotificationEmail = [
    validateRequest(sendNotificationEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, name, notification } = req.body;
        const success = await emailService.sendNotificationEmail(email, name, notification);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Notification email sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send notification email'
          });
        }
      } catch (error) {
        logger.error('Error sending notification email:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send notification email',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send SMS verification code
   */
  sendVerificationCode = [
    validateRequest(sendVerificationCodeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { phoneNumber, code } = req.body;
        const success = await smsService.sendVerificationCode(phoneNumber, code);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Verification code sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send verification code'
          });
        }
      } catch (error) {
        logger.error('Error sending verification code:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification code',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Send SMS session reminder
   */
  sendSessionReminderSms = [
    validateRequest(sendSessionReminderSmsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { phoneNumber, sessionDetails } = req.body;
        const success = await smsService.sendSessionReminder(phoneNumber, sessionDetails);
        
        if (success) {
          res.status(200).json({
            success: true,
            message: 'Session reminder SMS sent successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to send session reminder SMS'
          });
        }
      } catch (error) {
        logger.error('Error sending session reminder SMS:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send session reminder SMS',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Verify email service connection
   */
  verifyEmailConnection = asyncHandler(async (req: Request, res: Response) => {
    try {
      const isConnected = await emailService.verifyConnection();
      
      if (isConnected) {
        res.status(200).json({
          success: true,
          message: 'Email service connection verified'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to verify email service connection'
        });
      }
    } catch (error) {
      logger.error('Error verifying email connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email service connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export const communicationController = new CommunicationController();
export default communicationController;