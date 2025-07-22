import { EmailService } from '../services/emailService';
import { SMSService } from '../services/smsService';
import { NotificationService } from '../services/notificationService';
import { config } from '../config/environment';
import logger from '../services/loggerService';

/**
 * Script to test email and SMS communication services
 * 
 * This script sends test emails and SMS messages to verify that the communication
 * services are properly configured and working.
 */
async function testCommunication(): Promise<void> {
  try {
    logger.info('Starting communication services test');
    
    // Initialize services
    EmailService.initialize();
    SMSService.initialize();
    
    // Test email connection
    logger.info('Testing email connection...');
    const emailConnected = await EmailService.verifyConnection();
    
    if (emailConnected) {
      logger.info('Email connection successful');
      
      // Test sending a welcome email
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      const testName = 'Test User';
      
      logger.info(`Sending test welcome email to ${testEmail}...`);
      const emailSent = await EmailService.sendWelcomeEmail(testEmail, testName);
      
      if (emailSent) {
        logger.info('Test welcome email sent successfully');
      } else {
        logger.error('Failed to send test welcome email');
      }
    } else {
      logger.error('Email connection failed');
    }
    
    // Test SMS service if configured
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER) {
      const testPhone = process.env.TEST_PHONE || '+15555555555';
      
      logger.info(`Sending test SMS to ${testPhone}...`);
      const smsSent = await SMSService.sendVerificationCode(testPhone, '123456');
      
      if (smsSent) {
        logger.info('Test SMS sent successfully');
      } else {
        logger.error('Failed to send test SMS');
      }
    } else {
      logger.warn('SMS service not configured, skipping SMS test');
    }
    
    // Test notification service
    const testUserId = process.env.TEST_USER_ID;
    
    if (testUserId) {
      logger.info(`Sending test notification to user ${testUserId}...`);
      
      const notification = await NotificationService.sendNotification({
        userId: testUserId,
        title: 'Test Notification',
        message: 'This is a test notification from the communication test script.',
        type: 'info',
        priority: 'normal',
        actionUrl: `${config.APP_URL}/notifications`,
        actionText: 'View Notifications',
        data: {
          type: 'test'
        }
      });
      
      if (notification) {
        logger.info('Test notification sent successfully');
      } else {
        logger.error('Failed to send test notification');
      }
    } else {
      logger.warn('No test user ID provided, skipping notification test');
    }
    
    logger.info('Communication services test completed');
  } catch (error) {
    logger.error('Error testing communication services:', error);
    throw error;
  }
}

// Execute if this script is run directly
if (require.main === module) {
  testCommunication()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export default testCommunication;