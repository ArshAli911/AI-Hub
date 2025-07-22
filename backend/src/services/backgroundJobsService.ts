import { schedulerService } from './schedulerService';
import { queueService } from './queueService';
import { fileCleanupService } from './fileCleanupService';
import logger from './loggerService';
import { config } from '../config/environment';

// Import queue processors
import { initializeEmailQueueProcessor } from './queueProcessors/emailQueueProcessor';
import { initializeFileProcessingQueueProcessor } from './queueProcessors/fileProcessingQueueProcessor';
import { initializeExportQueueProcessor } from './queueProcessors/exportQueueProcessor';

export class BackgroundJobsService {
  private static instance: BackgroundJobsService;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BackgroundJobsService {
    if (!BackgroundJobsService.instance) {
      BackgroundJobsService.instance = new BackgroundJobsService();
    }
    return BackgroundJobsService.instance;
  }

  /**
   * Initialize all background jobs and queue processors
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing background jobs service');

      // Initialize queue service
      await queueService.initialize();

      // Initialize queue processors
      if (config.ENABLE_EMAIL_QUEUE) {
        initializeEmailQueueProcessor();
      }

      if (config.ENABLE_FILE_PROCESSING_QUEUE) {
        initializeFileProcessingQueueProcessor();
      }

      if (config.ENABLE_EXPORT_QUEUE) {
        initializeExportQueueProcessor();
      }

      // Initialize scheduled jobs
      await this.initializeScheduledJobs();

      // Initialize file cleanup service
      fileCleanupService.initializeJobs();

      this.initialized = true;
      logger.info('Background jobs service initialized');
    } catch (error) {
      logger.error('Failed to initialize background jobs service:', error);
      throw error;
    }
  }

  /**
   * Initialize scheduled jobs
   */
  private async initializeScheduledJobs(): Promise<void> {
    try {
      // Check if default jobs exist in database
      const { firestore } = await import('../config/firebaseAdmin');
      const jobsSnapshot = await firestore.collection('scheduledJobs').get();

      if (jobsSnapshot.empty) {
        // Create default scheduled jobs
        await this.createDefaultScheduledJobs();
      }

      // Initialize scheduler service (loads jobs from database)
      new schedulerService();
    } catch (error) {
      logger.error('Error initializing scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Create default scheduled jobs
   */
  private async createDefaultScheduledJobs(): Promise<void> {
    try {
      logger.info('Creating default scheduled jobs');

      const defaultJobs = [
        {
          name: 'cleanupExpiredSessions',
          schedule: '0 */2 * * *', // Every 2 hours
          status: 'active',
          maxAttempts: 3
        },
        {
          name: 'sendReminderNotifications',
          schedule: '*/15 * * * *', // Every 15 minutes
          status: 'active',
          maxAttempts: 3
        },
        {
          name: 'generateAnalyticsReports',
          schedule: '0 1 * * *', // Every day at 1 AM
          status: 'active',
          maxAttempts: 3
        },
        {
          name: 'cleanupTempFiles',
          schedule: '0 3 * * *', // Every day at 3 AM
          status: 'active',
          maxAttempts: 3
        }
      ];

      const { firestore } = await import('../config/firebaseAdmin');
      const batch = firestore.batch();

      for (const job of defaultJobs) {
        const jobRef = firestore.collection('scheduledJobs').doc();
        batch.set(jobRef, {
          ...job,
          id: jobRef.id,
          lastRun: null,
          nextRun: null,
          runCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      await batch.commit();
      logger.info('Default scheduled jobs created');
    } catch (error) {
      logger.error('Error creating default scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Stop all background jobs and queue processors
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down background jobs service');

      // Stop all queue processors
      queueService.stopAllQueues();

      // Stop all scheduled jobs
      schedulerService.stopAllJobs();

      // Stop file cleanup jobs
      fileCleanupService.stopAllJobs();

      logger.info('Background jobs service shut down');
    } catch (error) {
      logger.error('Error shutting down background jobs service:', error);
    }
  }
}

export const backgroundJobsService = BackgroundJobsService.getInstance();
export default backgroundJobsService;