import { queueService } from '../queueService';
import { emailService } from '../emailService';
import logger from '../loggerService';

export interface EmailQueueData {
  type: 'welcome' | 'password-reset' | 'email-verification' | 'session-confirmation' | 'session-reminder' | 'notification' | 'custom';
  to: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Initialize email queue processor
 */
export function initializeEmailQueueProcessor(): void {
  // Register email queue processor
  queueService.registerQueue<EmailQueueData>('emailQueue', async (data, job) => {
    logger.info(`Processing email job ${job.id} of type ${data.type}`);
    
    try {
      switch (data.type) {
        case 'welcome':
          if (!data.context?.name || !data.to) {
            throw new Error('Missing required data for welcome email');
          }
          return await emailService.sendWelcomeEmail(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.name
          );
          
        case 'password-reset':
          if (!data.context?.resetToken || !data.to) {
            throw new Error('Missing required data for password reset email');
          }
          return await emailService.sendPasswordResetEmail(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.resetToken
          );
          
        case 'email-verification':
          if (!data.context?.verificationToken || !data.to) {
            throw new Error('Missing required data for email verification');
          }
          return await emailService.sendEmailVerification(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.verificationToken
          );
          
        case 'session-confirmation':
          if (!data.context?.sessionDetails || !data.context?.name || !data.to) {
            throw new Error('Missing required data for session confirmation');
          }
          return await emailService.sendSessionConfirmation(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.name,
            data.context.sessionDetails
          );
          
        case 'session-reminder':
          if (!data.context?.sessionDetails || !data.context?.name || !data.to) {
            throw new Error('Missing required data for session reminder');
          }
          return await emailService.sendSessionReminder(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.name,
            data.context.sessionDetails
          );
          
        case 'notification':
          if (!data.context?.notification || !data.context?.name || !data.to) {
            throw new Error('Missing required data for notification email');
          }
          return await emailService.sendNotificationEmail(
            Array.isArray(data.to) ? data.to[0] : data.to,
            data.context.name,
            data.context.notification
          );
          
        case 'custom':
          // For custom emails, use the provided options directly
          return await emailService.sendEmail({
            to: data.to,
            subject: data.subject || 'No Subject',
            text: data.text,
            html: data.html,
            template: data.template,
            context: data.context,
            cc: data.cc,
            bcc: data.bcc,
            replyTo: data.replyTo,
            attachments: data.attachments
          });
          
        default:
          throw new Error(`Unknown email type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`Error processing email job ${job.id}:`, error);
      throw error;
    }
  }, {
    concurrency: 10, // Process up to 10 emails at once
    pollInterval: 5000, // Check for new emails every 5 seconds
  });
  
  // Start processing the queue
  queueService.startProcessing('emailQueue');
  logger.info('Email queue processor initialized');
}

/**
 * Add email to queue
 */
export async function queueEmail(data: EmailQueueData, options: { priority?: number; delaySeconds?: number } = {}): Promise<string> {
  const job = await queueService.addJob('emailQueue', data, {
    priority: options.priority || 0,
    delaySeconds: options.delaySeconds || 0,
    maxAttempts: 5 // Retry failed emails up to 5 times
  });
  
  return job.id;
}

export default {
  initializeEmailQueueProcessor,
  queueEmail
};