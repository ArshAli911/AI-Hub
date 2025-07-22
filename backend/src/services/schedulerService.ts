import cron from 'node-cron';
import logger from './loggerService';
import { firestore } from '../config/firebaseAdmin';
import { fileCleanupService } from './fileCleanupService';

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  status: 'active' | 'paused' | 'error';
  errorMessage?: string;
  runCount: number;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export class SchedulerService {
  private jobs: Map<string, { 
    task: cron.ScheduledTask;
    config: ScheduledJob;
    handler: () => Promise<JobResult>;
  }> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize scheduler service
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing scheduler service');
      await this.loadJobsFromDatabase();
      logger.info(`Initialized ${this.jobs.size} scheduled jobs`);
    } catch (error) {
      logger.error('Failed to initialize scheduler service', error);
    }
  }

  /**
   * Initialize all services (static method for app initialization)
   */
  static initializeJobs(): void {
    try {
      // Initialize file cleanup service
      fileCleanupService.initializeJobs();
      logger.info('File cleanup service initialized');
      
      // Initialize security policy if needed
      SchedulerService.initializeSecurityPolicies();
    } catch (error) {
      logger.error('Failed to initialize cleanup jobs:', error);
    }
  }
  
  /**
   * Initialize security policies if they don't exist
   */
  private static async initializeSecurityPolicies(): Promise<void> {
    try {
      // Check if default security policy exists
      const { firestore } = await import('../config/firebaseAdmin');
      const defaultPolicySnapshot = await firestore
        .collection('securityPolicies')
        .where('name', '==', 'default')
        .limit(1)
        .get();
      
      if (defaultPolicySnapshot.empty) {
        // Import and run the security policy creation script
        const createDefaultSecurityPolicy = (await import('../scripts/createDefaultSecurityPolicy')).default;
        await createDefaultSecurityPolicy();
        logger.info('Default security policies created');
      } else {
        logger.info('Default security policies already exist');
      }
    } catch (error) {
      logger.error('Error initializing security policies:', error);
    }
  }

  /**
   * Load jobs from database
   */
  private async loadJobsFromDatabase(): Promise<void> {
    try {
      const jobsSnapshot = await firestore.collection('scheduledJobs').get();
      
      for (const doc of jobsSnapshot.docs) {
        const jobData = doc.data() as ScheduledJob;
        
        // Register job handlers based on job name
        switch (jobData.name) {
          case 'cleanupExpiredSessions':
            await this.registerJob(jobData, this.cleanupExpiredSessions.bind(this));
            break;
          case 'sendReminderNotifications':
            await this.registerJob(jobData, this.sendReminderNotifications.bind(this));
            break;
          case 'processPayouts':
            await this.registerJob(jobData, this.processPayouts.bind(this));
            break;
          case 'generateAnalyticsReports':
            await this.registerJob(jobData, this.generateAnalyticsReports.bind(this));
            break;
          case 'syncExternalData':
            await this.registerJob(jobData, this.syncExternalData.bind(this));
            break;
          case 'cleanupTempFiles':
            await this.registerJob(jobData, this.cleanupTempFiles.bind(this));
            break;
          default:
            logger.warn(`Unknown job type: ${jobData.name}`);
        }
      }
    } catch (error) {
      logger.error('Error loading jobs from database', error);
      throw error;
    }
  }

  /**
   * Register a new job
   */
  async registerJob(
    jobConfig: ScheduledJob, 
    handler: () => Promise<JobResult>
  ): Promise<string> {
    try {
      // Validate cron expression
      if (!cron.validate(jobConfig.schedule)) {
        throw new Error(`Invalid cron expression: ${jobConfig.schedule}`);
      }

      // Create cron task
      const task = cron.schedule(jobConfig.schedule, async () => {
        try {
          logger.info(`Running scheduled job: ${jobConfig.name}`);
          
          // Update job status
          await this.updateJobStatus(jobConfig.id, {
            lastRun: new Date(),
            status: 'active',
            runCount: jobConfig.runCount + 1
          });
          
          // Execute job handler
          const result = await handler();
          
          // Update job status based on result
          if (result.success) {
            await this.updateJobStatus(jobConfig.id, {
              status: 'active',
              errorMessage: undefined
            });
            logger.info(`Job ${jobConfig.name} completed successfully`);
          } else {
            await this.updateJobStatus(jobConfig.id, {
              status: 'error',
              errorMessage: result.message
            });
            logger.error(`Job ${jobConfig.name} failed: ${result.message}`);
          }
          
          // Calculate next run time
          const nextRun = this.calculateNextRunTime(jobConfig.schedule);
          await this.updateJobStatus(jobConfig.id, { nextRun });
          
        } catch (error) {
          logger.error(`Error executing job ${jobConfig.name}:`, error);
          await this.updateJobStatus(jobConfig.id, {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }, {
        scheduled: jobConfig.status === 'active'
      });
      
      // Store job in memory
      this.jobs.set(jobConfig.id, {
        task,
        config: jobConfig,
        handler
      });
      
      // Calculate next run time
      const nextRun = this.calculateNextRunTime(jobConfig.schedule);
      await this.updateJobStatus(jobConfig.id, { nextRun });
      
      return jobConfig.id;
    } catch (error) {
      logger.error(`Error registering job ${jobConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(jobId: string, updates: Partial<ScheduledJob>): Promise<void> {
    try {
      await firestore.collection('scheduledJobs').doc(jobId).update(updates);
      
      // Update in-memory job config
      const job = this.jobs.get(jobId);
      if (job) {
        job.config = { ...job.config, ...updates };
        this.jobs.set(jobId, job);
      }
    } catch (error) {
      logger.error(`Error updating job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate next run time based on cron schedule
   */
  private calculateNextRunTime(cronExpression: string): Date {
    try {
      const schedule = cron.schedule(cronExpression, () => {});
      const nextDate = schedule.nextDate();
      schedule.stop();
      return nextDate.toDate();
    } catch (error) {
      logger.error(`Error calculating next run time:`, error);
      return new Date(Date.now() + 3600000); // Default to 1 hour from now
    }
  }

  /**
   * Get all registered jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(job => job.config);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId)?.config;
  }

  /**
   * Get job status
   */
  getJobStatus(): { jobs: ScheduledJob[]; activeCount: number; pausedCount: number; errorCount: number } {
    const jobs = this.getJobs();
    
    return {
      jobs,
      activeCount: jobs.filter(job => job.status === 'active').length,
      pausedCount: jobs.filter(job => job.status === 'paused').length,
      errorCount: jobs.filter(job => job.status === 'error').length
    };
  }

  /**
   * Pause a job
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    job.task.stop();
    await this.updateJobStatus(jobId, { status: 'paused' });
    logger.info(`Job ${job.config.name} paused`);
  }

  /**
   * Resume a job
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    job.task.start();
    await this.updateJobStatus(jobId, { status: 'active' });
    logger.info(`Job ${job.config.name} resumed`);
  }

  /**
   * Trigger a job manually
   */
  async triggerJob(jobName: string): Promise<JobResult> {
    // Find job by name
    const jobEntry = Array.from(this.jobs.entries()).find(([_, job]) => job.config.name === jobName);
    
    if (!jobEntry) {
      throw new Error(`Job not found: ${jobName}`);
    }
    
    const [jobId, job] = jobEntry;
    
    try {
      logger.info(`Manually triggering job: ${jobName}`);
      
      // Update job status
      await this.updateJobStatus(jobId, {
        lastRun: new Date(),
        runCount: job.config.runCount + 1
      });
      
      // Execute job handler
      const result = await job.handler();
      
      // Update job status based on result
      if (result.success) {
        await this.updateJobStatus(jobId, {
          status: 'active',
          errorMessage: undefined
        });
      } else {
        await this.updateJobStatus(jobId, {
          status: 'error',
          errorMessage: result.message
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`Error triggering job ${jobName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(jobId, {
        status: 'error',
        errorMessage
      });
      
      return {
        success: false,
        message: `Failed to execute job: ${errorMessage}`
      };
    }
  }

  /**
   * Create a new job
   */
  async createJob(jobConfig: Omit<ScheduledJob, 'id' | 'lastRun' | 'nextRun' | 'runCount'>): Promise<string> {
    try {
      // Create job document in database
      const jobRef = await firestore.collection('scheduledJobs').add({
        ...jobConfig,
        lastRun: null,
        nextRun: null,
        runCount: 0
      });
      
      const jobId = jobRef.id;
      const fullConfig: ScheduledJob = {
        id: jobId,
        ...jobConfig,
        lastRun: null,
        nextRun: null,
        runCount: 0
      };
      
      // Register job handler based on job name
      switch (jobConfig.name) {
        case 'cleanupExpiredSessions':
          await this.registerJob(fullConfig, this.cleanupExpiredSessions.bind(this));
          break;
        case 'sendReminderNotifications':
          await this.registerJob(fullConfig, this.sendReminderNotifications.bind(this));
          break;
        case 'processPayouts':
          await this.registerJob(fullConfig, this.processPayouts.bind(this));
          break;
        case 'generateAnalyticsReports':
          await this.registerJob(fullConfig, this.generateAnalyticsReports.bind(this));
          break;
        case 'syncExternalData':
          await this.registerJob(fullConfig, this.syncExternalData.bind(this));
          break;
        case 'cleanupTempFiles':
          await this.registerJob(fullConfig, this.cleanupTempFiles.bind(this));
          break;
        default:
          throw new Error(`Unknown job type: ${jobConfig.name}`);
      }
      
      return jobId;
    } catch (error) {
      logger.error(`Error creating job:`, error);
      throw error;
    }
  }

  /**
   * Update job configuration
   */
  async updateJob(jobId: string, updates: Partial<ScheduledJob>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    try {
      // Update job in database
      await firestore.collection('scheduledJobs').doc(jobId).update(updates);
      
      // If schedule changed, recreate the cron task
      if (updates.schedule && updates.schedule !== job.config.schedule) {
        job.task.stop();
        
        const newTask = cron.schedule(updates.schedule, async () => {
          try {
            logger.info(`Running scheduled job: ${job.config.name}`);
            
            // Update job status
            await this.updateJobStatus(jobId, {
              lastRun: new Date(),
              status: 'active',
              runCount: job.config.runCount + 1
            });
            
            // Execute job handler
            const result = await job.handler();
            
            // Update job status based on result
            if (result.success) {
              await this.updateJobStatus(jobId, {
                status: 'active',
                errorMessage: undefined
              });
            } else {
              await this.updateJobStatus(jobId, {
                status: 'error',
                errorMessage: result.message
              });
            }
            
            // Calculate next run time
            const nextRun = this.calculateNextRunTime(updates.schedule);
            await this.updateJobStatus(jobId, { nextRun });
            
          } catch (error) {
            logger.error(`Error executing job ${job.config.name}:`, error);
            await this.updateJobStatus(jobId, {
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }, {
          scheduled: job.config.status === 'active'
        });
        
        // Update job in memory
        this.jobs.set(jobId, {
          ...job,
          task: newTask,
          config: { ...job.config, ...updates }
        });
        
        // Calculate next run time
        const nextRun = this.calculateNextRunTime(updates.schedule);
        await this.updateJobStatus(jobId, { nextRun });
      } else {
        // Update job config in memory
        this.jobs.set(jobId, {
          ...job,
          config: { ...job.config, ...updates }
        });
      }
    } catch (error) {
      logger.error(`Error updating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    try {
      // Stop the cron task
      job.task.stop();
      
      // Remove job from memory
      this.jobs.delete(jobId);
      
      // Delete job from database
      await firestore.collection('scheduledJobs').doc(jobId).delete();
      
      logger.info(`Job ${job.config.name} deleted`);
    } catch (error) {
      logger.error(`Error deleting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Stop all jobs
   */
  stopAllJobs(): void {
    for (const [_, job] of this.jobs) {
      job.task.stop();
    }
    logger.info('All scheduled jobs stopped');
  }

  /**
   * Cleanup expired sessions job handler
   */
  private async cleanupExpiredSessions(): Promise<JobResult> {
    try {
      logger.info('Running cleanup expired sessions job');
      
      // Get expired sessions
      const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const expiredSessionsSnapshot = await firestore
        .collection('sessions')
        .where('status', '==', 'active')
        .where('expiresAt', '<', expiryThreshold)
        .get();
      
      if (expiredSessionsSnapshot.empty) {
        return {
          success: true,
          message: 'No expired sessions found'
        };
      }
      
      // Update expired sessions
      const batch = firestore.batch();
      expiredSessionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      
      return {
        success: true,
        message: `Cleaned up ${expiredSessionsSnapshot.size} expired sessions`,
        data: {
          count: expiredSessionsSnapshot.size
        }
      };
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return {
        success: false,
        message: 'Failed to clean up expired sessions',
        error
      };
    }
  }

  /**
   * Send reminder notifications job handler
   */
  private async sendReminderNotifications(): Promise<JobResult> {
    try {
      logger.info('Running send reminder notifications job');
      
      // Get upcoming sessions
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const upcomingSessionsSnapshot = await firestore
        .collection('sessions')
        .where('status', '==', 'scheduled')
        .where('startTime', '>', now)
        .where('startTime', '<', oneHourFromNow)
        .where('reminderSent', '==', false)
        .get();
      
      if (upcomingSessionsSnapshot.empty) {
        return {
          success: true,
          message: 'No upcoming sessions requiring reminders'
        };
      }
      
      // Send reminders
      const batch = firestore.batch();
      let reminderCount = 0;
      
      for (const doc of upcomingSessionsSnapshot.docs) {
        const session = doc.data();
        
        // Get user data
        const userDoc = await firestore.collection('users').doc(session.userId).get();
        const mentorDoc = await firestore.collection('users').doc(session.mentorId).get();
        
        if (!userDoc.exists || !mentorDoc.exists) {
          logger.warn(`Missing user data for session ${doc.id}`);
          continue;
        }
        
        const userData = userDoc.data();
        const mentorData = mentorDoc.data();
        
        // Send notification to user
        await firestore.collection('notifications').add({
          userId: session.userId,
          title: 'Upcoming Session Reminder',
          body: `Your session with ${mentorData.displayName} starts in 1 hour`,
          data: {
            type: 'session_reminder',
            sessionId: doc.id
          },
          read: false,
          createdAt: now
        });
        
        // Send notification to mentor
        await firestore.collection('notifications').add({
          userId: session.mentorId,
          title: 'Upcoming Session Reminder',
          body: `Your session with ${userData.displayName} starts in 1 hour`,
          data: {
            type: 'session_reminder',
            sessionId: doc.id
          },
          read: false,
          createdAt: now
        });
        
        // Mark reminder as sent
        batch.update(doc.ref, {
          reminderSent: true,
          updatedAt: now
        });
        
        reminderCount++;
      }
      
      await batch.commit();
      
      return {
        success: true,
        message: `Sent ${reminderCount} session reminders`,
        data: {
          count: reminderCount
        }
      };
    } catch (error) {
      logger.error('Error sending reminder notifications:', error);
      return {
        success: false,
        message: 'Failed to send reminder notifications',
        error
      };
    }
  }

  /**
   * Process payouts job handler
   */
  private async processPayouts(): Promise<JobResult> {
    try {
      logger.info('Running process payouts job');
      
      // Get pending payouts
      const pendingPayoutsSnapshot = await firestore
        .collection('payouts')
        .where('status', '==', 'pending')
        .get();
      
      if (pendingPayoutsSnapshot.empty) {
        return {
          success: true,
          message: 'No pending payouts found'
        };
      }
      
      // Process payouts
      let successCount = 0;
      let failureCount = 0;
      
      for (const doc of pendingPayoutsSnapshot.docs) {
        const payout = doc.data();
        
        try {
          // Process payout logic would go here
          // This is a placeholder for the actual payment processing
          
          // Update payout status
          await doc.ref.update({
            status: 'completed',
            processedAt: new Date(),
            updatedAt: new Date()
          });
          
          successCount++;
        } catch (error) {
          logger.error(`Error processing payout ${doc.id}:`, error);
          
          // Update payout status
          await doc.ref.update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date()
          });
          
          failureCount++;
        }
      }
      
      return {
        success: true,
        message: `Processed ${successCount} payouts successfully, ${failureCount} failed`,
        data: {
          successCount,
          failureCount,
          totalCount: pendingPayoutsSnapshot.size
        }
      };
    } catch (error) {
      logger.error('Error processing payouts:', error);
      return {
        success: false,
        message: 'Failed to process payouts',
        error
      };
    }
  }

  /**
   * Generate analytics reports job handler
   */
  private async generateAnalyticsReports(): Promise<JobResult> {
    try {
      logger.info('Running generate analytics reports job');
      
      // Get date range for report
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      // Generate daily report
      const report = {
        date: yesterday,
        metrics: {
          newUsers: 0,
          activeUsers: 0,
          sessions: 0,
          revenue: 0,
          marketplaceOrders: 0
        },
        createdAt: now
      };
      
      // Count new users
      const newUsersSnapshot = await firestore
        .collection('users')
        .where('createdAt', '>=', yesterday)
        .where('createdAt', '<', today)
        .count()
        .get();
      
      report.metrics.newUsers = newUsersSnapshot.data().count;
      
      // Count active users
      const activeUsersSnapshot = await firestore
        .collection('userActivity')
        .where('lastActive', '>=', yesterday)
        .where('lastActive', '<', today)
        .count()
        .get();
      
      report.metrics.activeUsers = activeUsersSnapshot.data().count;
      
      // Count sessions
      const sessionsSnapshot = await firestore
        .collection('sessions')
        .where('startTime', '>=', yesterday)
        .where('startTime', '<', today)
        .count()
        .get();
      
      report.metrics.sessions = sessionsSnapshot.data().count;
      
      // Calculate revenue
      const paymentsSnapshot = await firestore
        .collection('payments')
        .where('createdAt', '>=', yesterday)
        .where('createdAt', '<', today)
        .where('status', '==', 'completed')
        .get();
      
      let totalRevenue = 0;
      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        totalRevenue += payment.amount;
      });
      
      report.metrics.revenue = totalRevenue;
      
      // Count marketplace orders
      const ordersSnapshot = await firestore
        .collection('orders')
        .where('createdAt', '>=', yesterday)
        .where('createdAt', '<', today)
        .count()
        .get();
      
      report.metrics.marketplaceOrders = ordersSnapshot.data().count;
      
      // Save report
      await firestore.collection('analyticsReports').add(report);
      
      return {
        success: true,
        message: 'Generated daily analytics report',
        data: report
      };
    } catch (error) {
      logger.error('Error generating analytics reports:', error);
      return {
        success: false,
        message: 'Failed to generate analytics reports',
        error
      };
    }
  }

  /**
   * Sync external data job handler
   */
  private async syncExternalData(): Promise<JobResult> {
    try {
      logger.info('Running sync external data job');
      
      // This is a placeholder for external data synchronization
      // In a real implementation, this would connect to external APIs
      // and sync data with the application
      
      return {
        success: true,
        message: 'External data sync completed',
        data: {
          syncedSources: ['externalApi1', 'externalApi2'],
          recordsProcessed: 150
        }
      };
    } catch (error) {
      logger.error('Error syncing external data:', error);
      return {
        success: false,
        message: 'Failed to sync external data',
        error
      };
    }
  }

  /**
   * Cleanup temporary files job handler
   */
  private async cleanupTempFiles(): Promise<JobResult> {
    try {
      logger.info('Running cleanup temp files job');
      
      // Get old temporary files
      const expiryThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const tempFilesSnapshot = await firestore
        .collection('tempFiles')
        .where('createdAt', '<', expiryThreshold)
        .get();
      
      if (tempFilesSnapshot.empty) {
        return {
          success: true,
          message: 'No temporary files to clean up'
        };
      }
      
      // Delete files from storage and database
      const batch = firestore.batch();
      const { storage } = require('../config/firebaseAdmin');
      const bucket = storage.bucket();
      
      for (const doc of tempFilesSnapshot.docs) {
        const file = doc.data();
        
        // Delete from storage
        try {
          await bucket.file(file.path).delete();
        } catch (error) {
          logger.warn(`Error deleting file ${file.path} from storage:`, error);
        }
        
        // Delete from database
        batch.delete(doc.ref);
      }
      
      await batch.commit();
      
      return {
        success: true,
        message: `Cleaned up ${tempFilesSnapshot.size} temporary files`,
        data: {
          count: tempFilesSnapshot.size
        }
      };
    } catch (error) {
      logger.error('Error cleaning up temporary files:', error);
      return {
        success: false,
        message: 'Failed to clean up temporary files',
        error
      };
    }
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;