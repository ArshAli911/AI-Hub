import cron from 'node-cron';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { AuditService } from './auditService';
import logger from './loggerService';
import { captureMessage } from './sentryService';

export class SchedulerService {
  private static db = getFirestore();
  private static auth = getAuth();
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  static initializeJobs(): void {
    logger.info('Initializing scheduled jobs...');

    // Daily cleanup job (runs at 2 AM every day)
    this.scheduleJob('daily-cleanup', '0 2 * * *', this.dailyCleanup.bind(this));

    // Weekly analytics job (runs every Sunday at 3 AM)
    this.scheduleJob('weekly-analytics', '0 3 * * 0', this.weeklyAnalytics.bind(this));

    // Monthly audit log cleanup (runs on the 1st of every month at 4 AM)
    this.scheduleJob('monthly-audit-cleanup', '0 4 1 * *', this.monthlyAuditCleanup.bind(this));

    // Hourly system health check (runs every hour)
    this.scheduleJob('hourly-health-check', '0 * * * *', this.hourlyHealthCheck.bind(this));

    // Daily user activity reminder (runs at 9 AM every day)
    this.scheduleJob('daily-reminders', '0 9 * * *', this.dailyReminders.bind(this));

    logger.info(`Initialized ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Schedule a new job
   */
  private static scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    try {
      const job = cron.schedule(cronExpression, async () => {
        logger.info(`Starting scheduled job: ${name}`);
        const startTime = Date.now();

        try {
          await task();
          const duration = Date.now() - startTime;
          logger.info(`Completed scheduled job: ${name} (${duration}ms)`);
          
          // Send to Sentry for monitoring
          captureMessage(`Scheduled job completed: ${name}`, 'info', {
            jobName: name,
            duration,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Failed scheduled job: ${name} (${duration}ms)`, error);
          
          // Send error to Sentry
          captureMessage(`Scheduled job failed: ${name}`, 'error', {
            jobName: name,
            duration,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC',
      });

      this.jobs.set(name, job);
      job.start();
      logger.info(`Scheduled job '${name}' started with expression: ${cronExpression}`);

    } catch (error) {
      logger.error(`Failed to schedule job '${name}':`, error);
    }
  }

  /**
   * Daily cleanup tasks
   */
  private static async dailyCleanup(): Promise<void> {
    logger.info('Starting daily cleanup...');

    try {
      // Clean up old audit logs (keep last 90 days)
      const deletedAuditLogs = await AuditService.cleanupOldLogs(90);
      logger.info(`Cleaned up ${deletedAuditLogs} old audit logs`);

      // Clean up old temporary files (if any)
      // This would depend on your file storage implementation
      
      // Clean up expired sessions (if using session storage)
      // This would depend on your session implementation

      // Clean up old notifications (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const notificationsSnapshot = await this.db
        .collection('notifications')
        .where('createdAt', '<', thirtyDaysAgo)
        .get();

      const batch = this.db.batch();
      let deletedNotifications = 0;

      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedNotifications++;
      });

      if (deletedNotifications > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${deletedNotifications} old notifications`);
      }

      // Clean up inactive users (disabled for more than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const inactiveUsersSnapshot = await this.db
        .collection('users')
        .where('isActive', '==', false)
        .where('deactivatedAt', '<', oneYearAgo)
        .get();

      let deletedUsers = 0;
      for (const doc of inactiveUsersSnapshot.docs) {
        try {
          const userData = doc.data();
          await this.auth.deleteUser(doc.id);
          await doc.ref.delete();
          deletedUsers++;
          
          // Log the cleanup
          await AuditService.logEvent(
            'system',
            'system@aihub.com',
            'USER_CLEANUP_DELETED',
            'user',
            { reason: 'Inactive for more than 1 year' },
            doc.id
          );
        } catch (error) {
          logger.error(`Failed to delete inactive user ${doc.id}:`, error);
        }
      }

      if (deletedUsers > 0) {
        logger.info(`Cleaned up ${deletedUsers} inactive users`);
      }

    } catch (error) {
      logger.error('Daily cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Weekly analytics and reporting
   */
  private static async weeklyAnalytics(): Promise<void> {
    logger.info('Starting weekly analytics...');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Get audit statistics for the week
      const auditStats = await AuditService.getAuditStats(startDate, endDate);

      // Get system statistics
      const systemStats = {
        totalUsers: 0,
        activeUsers: 0,
        totalProducts: 0,
        totalMentors: 0,
        totalPrototypes: 0,
      };

      // Count users
      const usersSnapshot = await this.db.collection('users').get();
      systemStats.totalUsers = usersSnapshot.size;
      systemStats.activeUsers = usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length;

      // Count products
      const productsSnapshot = await this.db.collection('products').get();
      systemStats.totalProducts = productsSnapshot.size;

      // Count mentors
      const mentorsSnapshot = await this.db.collection('mentors').get();
      systemStats.totalMentors = mentorsSnapshot.size;

      // Count prototypes
      const prototypesSnapshot = await this.db.collection('prototypes').get();
      systemStats.totalPrototypes = prototypesSnapshot.size;

      // Store analytics data
      const analyticsData = {
        period: 'weekly',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        systemStats,
        auditStats,
        generatedAt: new Date().toISOString(),
      };

      await this.db.collection('analytics').add(analyticsData);

      logger.info('Weekly analytics completed', analyticsData);

      // Send summary to Sentry for monitoring
      captureMessage('Weekly analytics completed', 'info', analyticsData);

    } catch (error) {
      logger.error('Weekly analytics failed:', error);
      throw error;
    }
  }

  /**
   * Monthly audit log cleanup
   */
  private static async monthlyAuditCleanup(): Promise<void> {
    logger.info('Starting monthly audit cleanup...');

    try {
      // Clean up audit logs older than 6 months
      const deletedCount = await AuditService.cleanupOldLogs(180);
      logger.info(`Monthly audit cleanup: deleted ${deletedCount} old audit logs`);

      // Send to Sentry for monitoring
      captureMessage('Monthly audit cleanup completed', 'info', {
        deletedCount,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Monthly audit cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Hourly system health check
   */
  private static async hourlyHealthCheck(): Promise<void> {
    logger.info('Starting hourly health check...');

    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeJobs: this.jobs.size,
        firebaseConnection: 'healthy', // You could add actual Firebase health check
      };

      // Store health check data
      await this.db.collection('health_checks').add(healthData);

      // Check for any critical issues
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        captureMessage('High memory usage detected', 'warning', healthData);
      }

      logger.info('Hourly health check completed', healthData);

    } catch (error) {
      logger.error('Hourly health check failed:', error);
      captureMessage('Health check failed', 'error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Daily reminders and notifications
   */
  private static async dailyReminders(): Promise<void> {
    logger.info('Starting daily reminders...');

    try {
      // Find users who haven't been active for a while (7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const inactiveUsersSnapshot = await this.db
        .collection('users')
        .where('isActive', '==', true)
        .where('lastActivity', '<', sevenDaysAgo)
        .limit(100) // Limit to avoid overwhelming the system
        .get();

      let reminderCount = 0;
      for (const doc of inactiveUsersSnapshot.docs) {
        try {
          const userData = doc.data();
          
          // Create a reminder notification
          await this.db.collection('notifications').add({
            userId: doc.id,
            type: 'reminder',
            title: 'Welcome back!',
            message: 'We miss you! Come back and check out the latest updates.',
            data: {
              screen: 'Home',
            },
            createdAt: new Date(),
            read: false,
          });

          reminderCount++;

          // Log the reminder
          await AuditService.logEvent(
            'system',
            'system@aihub.com',
            'REMINDER_SENT',
            'user',
            { userId: doc.id, email: userData.email },
            doc.id
          );

        } catch (error) {
          logger.error(`Failed to send reminder to user ${doc.id}:`, error);
        }
      }

      logger.info(`Sent ${reminderCount} daily reminders`);

      // Send to Sentry for monitoring
      if (reminderCount > 0) {
        captureMessage('Daily reminders sent', 'info', {
          reminderCount,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      logger.error('Daily reminders failed:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAllJobs(): void {
    logger.info('Stopping all scheduled jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  static getJobStatus(): { name: string; running: boolean }[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.getStatus() === 'scheduled',
    }));
  }

  /**
   * Manually trigger a job
   */
  static async triggerJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job '${jobName}' not found`);
    }

    logger.info(`Manually triggering job: ${jobName}`);
    
    // Get the task function and execute it
    const taskMap: Record<string, () => Promise<void>> = {
      'daily-cleanup': this.dailyCleanup.bind(this),
      'weekly-analytics': this.weeklyAnalytics.bind(this),
      'monthly-audit-cleanup': this.monthlyAuditCleanup.bind(this),
      'hourly-health-check': this.hourlyHealthCheck.bind(this),
      'daily-reminders': this.dailyReminders.bind(this),
    };

    const task = taskMap[jobName];
    if (task) {
      await task();
    } else {
      throw new Error(`Task function for job '${jobName}' not found`);
    }
  }
} 