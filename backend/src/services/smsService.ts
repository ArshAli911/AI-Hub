import { Twilio } from 'twilio';
import { config } from '../config/environment';
import logger from './loggerService';

export interface SMSOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export class SMSService {
  private static client: Twilio;

  /**
   * Initialize SMS service with Twilio configuration
   */
  static initialize(): void {
    try {
      this.client = new Twilio(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_AUTH_TOKEN
      );

      logger.info('SMS service initialized');
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
      throw error;
    }
  }

  /**
   * Send SMS message
   */
  static async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      if (!this.client) {
        this.initialize();
      }

      const message = await this.client.messages.create({
        body: options.body,
        to: options.to,
        from: options.from || config.TWILIO_PHONE_NUMBER,
        mediaUrl: options.mediaUrl,
      });

      logger.info(`SMS sent: ${message.sid}`);
      return true;
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send verification code
   */
  static async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    return this.sendSMS({
      to: phoneNumber,
      body: `Your ${config.APP_NAME} verification code is: ${code}. This code will expire in 10 minutes.`,
    });
  }

  /**
   * Send session reminder
   */
  static async sendSessionReminder(
    phoneNumber: string,
    sessionDetails: {
      title: string;
      time: string;
      joinUrl: string;
    }
  ): Promise<boolean> {
    return this.sendSMS({
      to: phoneNumber,
      body: `Reminder: Your ${config.APP_NAME} session "${sessionDetails.title}" starts at ${sessionDetails.time}. Join here: ${sessionDetails.joinUrl}`,
    });
  }

  /**
   * Send security alert
   */
  static async sendSecurityAlert(
    phoneNumber: string,
    alertDetails: {
      type: string;
      location?: string;
      device?: string;
      time?: string;
    }
  ): Promise<boolean> {
    const { type, location, device, time } = alertDetails;
    const timeStr = time || new Date().toLocaleTimeString();
    
    let message = `${config.APP_NAME} Security Alert: ${type} detected`;
    
    if (location) {
      message += ` from ${location}`;
    }
    
    if (device) {
      message += ` on ${device}`;
    }
    
    message += ` at ${timeStr}. If this wasn't you, please secure your account immediately.`;

    return this.sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * Send important notification
   */
  static async sendImportantNotification(
    phoneNumber: string,
    notification: {
      title: string;
      message: string;
    }
  ): Promise<boolean> {
    return this.sendSMS({
      to: phoneNumber,
      body: `${notification.title}: ${notification.message}`,
    });
  }

  /**
   * Verify phone number (send test message)
   */
  static async verifyPhoneNumber(phoneNumber: string): Promise<boolean> {
    return this.sendSMS({
      to: phoneNumber,
      body: `This is a verification message from ${config.APP_NAME}. Your phone number has been verified.`,
    });
  }
}

export default SMSService;