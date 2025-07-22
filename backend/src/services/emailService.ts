import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import logger from './loggerService';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static templatesDir = path.join(__dirname, '../templates/email');
  private static templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();

  /**
   * Initialize email service with SMTP configuration
   */
  static initialize(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_SECURE === 'true',
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: config.NODE_ENV === 'production',
        },
      });

      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initialize();
      }

      let html = options.html;

      // If template is specified, render it
      if (options.template) {
        html = await this.renderTemplate(options.template, options.context || {});
      }

      const mailOptions = {
        from: config.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || config.EMAIL_REPLY_TO,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Render email template with Handlebars
   */
  private static async renderTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    try {
      // Check if template is cached
      if (!this.templateCache.has(templateName)) {
        const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        
        // Compile and cache template
        const template = Handlebars.compile(templateContent);
        this.templateCache.set(templateName, template);
      }

      // Get template from cache
      const template = this.templateCache.get(templateName)!;
      
      // Add common context variables
      const fullContext = {
        ...context,
        appName: config.APP_NAME,
        appUrl: config.APP_URL,
        currentYear: new Date().getFullYear(),
        supportEmail: config.SUPPORT_EMAIL,
      };

      // Render template with context
      return template(fullContext);
    } catch (error) {
      logger.error(`Error rendering email template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${config.APP_NAME}!`,
      template: 'welcome',
      context: {
        name,
        loginUrl: `${config.APP_URL}/login`,
      },
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${config.APP_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: email,
      subject: `Reset Your ${config.APP_NAME} Password`,
      template: 'password-reset',
      context: {
        resetUrl,
        expiryHours: 24, // Token expiry in hours
      },
    });
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(email: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${config.APP_URL}/verify-email?token=${verificationToken}`;
    
    return this.sendEmail({
      to: email,
      subject: `Verify Your Email for ${config.APP_NAME}`,
      template: 'email-verification',
      context: {
        verificationUrl,
        expiryHours: 48, // Token expiry in hours
      },
    });
  }

  /**
   * Send session confirmation email
   */
  static async sendSessionConfirmation(
    email: string, 
    name: string, 
    sessionDetails: {
      id: string;
      title: string;
      date: string;
      time: string;
      duration: string;
      mentorName: string;
    }
  ): Promise<boolean> {
    const sessionUrl = `${config.APP_URL}/sessions/${sessionDetails.id}`;
    
    return this.sendEmail({
      to: email,
      subject: `Your ${config.APP_NAME} Session Confirmation`,
      template: 'session-confirmation',
      context: {
        name,
        sessionDetails,
        sessionUrl,
        calendarLink: this.generateCalendarLink(
          sessionDetails.title,
          sessionDetails.date,
          sessionDetails.time,
          sessionDetails.duration
        ),
      },
    });
  }

  /**
   * Send session reminder email
   */
  static async sendSessionReminder(
    email: string, 
    name: string, 
    sessionDetails: {
      id: string;
      title: string;
      date: string;
      time: string;
      mentorName: string;
      joinUrl: string;
    }
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `Reminder: Your ${config.APP_NAME} Session is Starting Soon`,
      template: 'session-reminder',
      context: {
        name,
        sessionDetails,
      },
    });
  }

  /**
   * Send notification email
   */
  static async sendNotificationEmail(
    email: string, 
    name: string, 
    notification: {
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    }
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: notification.title,
      template: 'notification',
      context: {
        name,
        notification,
      },
    });
  }

  /**
   * Generate calendar link (Google Calendar format)
   */
  private static generateCalendarLink(
    title: string, 
    date: string, 
    time: string, 
    duration: string
  ): string {
    try {
      // Parse date and time
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      
      // Create start date
      const startDate = new Date(year, month - 1, day, hour, minute);
      
      // Calculate end date based on duration (format: "2h 30m" or "45m")
      const endDate = new Date(startDate);
      
      if (duration.includes('h')) {
        const hours = parseInt(duration.split('h')[0].trim());
        endDate.setHours(endDate.getHours() + hours);
        
        if (duration.includes('m')) {
          const minutes = parseInt(duration.split('h')[1].split('m')[0].trim());
          endDate.setMinutes(endDate.getMinutes() + minutes);
        }
      } else if (duration.includes('m')) {
        const minutes = parseInt(duration.split('m')[0].trim());
        endDate.setMinutes(endDate.getMinutes() + minutes);
      }
      
      // Format dates for Google Calendar
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
      };
      
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      
      // Create Google Calendar link
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(`${config.APP_NAME} Session`)}`;
    } catch (error) {
      logger.error('Error generating calendar link:', error);
      return '';
    }
  }

  /**
   * Verify SMTP connection
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initialize();
      }
      
      await this.transporter.verify();
      logger.info('SMTP connection verified');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

export default EmailService;