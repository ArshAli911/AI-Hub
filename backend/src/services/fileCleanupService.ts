import cron from 'node-cron';
import { fileStorageService } from './fileStorageService';
import { fileSecurityService } from './fileSecurityService';
import logger from './loggerService';

export class FileCleanupService {
  private static instance: FileCleanupService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): FileCleanupService {
    if (!FileCleanupService.instance) {
      FileCleanupService.instance = new FileCleanupService();
    }
    return FileCleanupService.instance;
  }

  /**
   * Initialize all cleanup jobs
   */
  public initializeJobs(): void {
    this.scheduleExpiredFileCleanup();
    this.scheduleTempFileCleanup();
    this.scheduleVirusScanCleanup();
    this.scheduleQuarantineCleanup();
    this.scheduleStorageOptimization();
    
    logger.info('File cleanup service initialized with scheduled jobs');
  }

  /**
   * Schedule cleanup of expired files (runs every hour)
   */
  private scheduleExpiredFileCleanup(): void {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting expired files cleanup');
        const cleanedCount = await fileStorageService.cleanupExpiredFiles();
        logger.info(`Expired files cleanup completed: ${cleanedCount} files removed`);
      } catch (error) {
        logger.error('Error in expired files cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('expiredFileCleanup', job);
    job.start();
  }

  /**
   * Schedule cleanup of temporary files (runs every 6 hours)
   */
  private scheduleTempFileCleanup(): void {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Starting temp files cleanup');
        const cleanedCount = await fileStorageService.cleanupTempFiles(24); // Files older than 24 hours
        logger.info(`Temp files cleanup completed: ${cleanedCount} files removed`);
      } catch (error) {
        logger.error('Error in temp files cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('tempFileCleanup', job);
    job.start();
  }

  /**
   * Schedule cleanup of old virus scan results (runs daily at 2 AM)
   */
  private scheduleVirusScanCleanup(): void {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting virus scan results cleanup');
        await this.cleanupOldVirusScanResults();
        logger.info('Virus scan results cleanup completed');
      } catch (error) {
        logger.error('Error in virus scan results cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('virusScanCleanup', job);
    job.start();
  }

  /**
   * Schedule cleanup of old quarantined files (runs weekly on Sunday at 3 AM)
   */
  private scheduleQuarantineCleanup(): void {
    const job = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Starting quarantine cleanup');
        await this.cleanupOldQuarantinedFiles();
        logger.info('Quarantine cleanup completed');
      } catch (error) {
        logger.error('Error in quarantine cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('quarantineCleanup', job);
    job.start();
  }

  /**
   * Schedule storage optimization (runs daily at 4 AM)
   */
  private scheduleStorageOptimization(): void {
    const job = cron.schedule('0 4 * * *', async () => {
      try {
        logger.info('Starting storage optimization');
        await this.optimizeStorage();
        logger.info('Storage optimization completed');
      } catch (error) {
        logger.error('Error in storage optimization:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('storageOptimization', job);
    job.start();
  }

  /**
   * Clean up old virus scan results (older than 30 days)
   */
  private async cleanupOldVirusScanResults(): Promise<void> {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const oldScansSnapshot = await firestore
        .collection('virusScanResults')
        .where('scannedAt', '<', cutoffDate)
        .limit(100)
        .get();

      if (oldScansSnapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      oldScansSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Cleaned up ${oldScansSnapshot.size} old virus scan results`);
    } catch (error) {
      logger.error('Error cleaning up old virus scan results:', error);
      throw error;
    }
  }

  /**
   * Clean up old quarantined files (older than 90 days)
   */
  private async cleanupOldQuarantinedFiles(): Promise<void> {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const oldQuarantineSnapshot = await firestore
        .collection('virusScanResults')
        .where('status', '==', 'quarantined')
        .where('scannedAt', '<', cutoffDate)
        .limit(50)
        .get();

      if (oldQuarantineSnapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      const fs = await import('fs/promises');
      const path = await import('path');

      for (const doc of oldQuarantineSnapshot.docs) {
        const data = doc.data();
        
        // Delete quarantined file from disk
        try {
          const quarantinePath = path.join('/tmp/quarantine', `${data.fileId}_quarantined`);
          await fs.unlink(quarantinePath);
        } catch (fileError) {
          logger.warn(`Could not delete quarantined file: ${data.fileId}`, fileError);
        }

        // Delete from database
        batch.delete(doc.ref);
      }

      await batch.commit();
      logger.info(`Cleaned up ${oldQuarantineSnapshot.size} old quarantined files`);
    } catch (error) {
      logger.error('Error cleaning up old quarantined files:', error);
      throw error;
    }
  }

  /**
   * Optimize storage by identifying and handling duplicate files
   */
  private async optimizeStorage(): Promise<void> {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      
      // Find duplicate files by checksum
      const duplicatesMap = new Map<string, string[]>();
      
      const filesSnapshot = await firestore
        .collection('fileMetadata')
        .orderBy('uploadedAt', 'desc')
        .limit(1000)
        .get();

      // Group files by checksum
      filesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.checksum) {
          if (!duplicatesMap.has(data.checksum)) {
            duplicatesMap.set(data.checksum, []);
          }
          duplicatesMap.get(data.checksum)!.push(doc.id);
        }
      });

      // Process duplicates (keep the first one, mark others as duplicates)
      let optimizedCount = 0;
      for (const [checksum, fileIds] of duplicatesMap) {
        if (fileIds.length > 1) {
          // Keep the first file, mark others as duplicates
          for (let i = 1; i < fileIds.length; i++) {
            await firestore.collection('fileMetadata').doc(fileIds[i]).update({
              isDuplicate: true,
              originalFileId: fileIds[0],
              duplicateDetectedAt: new Date()
            });
            optimizedCount++;
          }
        }
      }

      if (optimizedCount > 0) {
        logger.info(`Storage optimization: marked ${optimizedCount} duplicate files`);
      }

      // Clean up old access logs (older than 90 days)
      await this.cleanupOldAccessLogs();

    } catch (error) {
      logger.error('Error in storage optimization:', error);
      throw error;
    }
  }

  /**
   * Clean up old file access logs
   */
  private async cleanupOldAccessLogs(): Promise<void> {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const oldLogsSnapshot = await firestore
        .collection('fileAccessLogs')
        .where('timestamp', '<', cutoffDate)
        .limit(500)
        .get();

      if (oldLogsSnapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      oldLogsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Cleaned up ${oldLogsSnapshot.size} old file access logs`);
    } catch (error) {
      logger.error('Error cleaning up old access logs:', error);
    }
  }

  /**
   * Manual cleanup trigger for admin use
   */
  public async runManualCleanup(cleanupType: 'expired' | 'temp' | 'quarantine' | 'optimize' | 'all'): Promise<{
    success: boolean;
    results: Record<string, number>;
    errors: string[];
  }> {
    const results: Record<string, number> = {};
    const errors: string[] = [];

    try {
      if (cleanupType === 'expired' || cleanupType === 'all') {
        try {
          results.expiredFiles = await fileStorageService.cleanupExpiredFiles();
        } catch (error) {
          errors.push(`Expired files cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (cleanupType === 'temp' || cleanupType === 'all') {
        try {
          results.tempFiles = await fileStorageService.cleanupTempFiles(24);
        } catch (error) {
          errors.push(`Temp files cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (cleanupType === 'quarantine' || cleanupType === 'all') {
        try {
          await this.cleanupOldQuarantinedFiles();
          results.quarantinedFiles = 1; // Placeholder since we don't return count
        } catch (error) {
          errors.push(`Quarantine cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (cleanupType === 'optimize' || cleanupType === 'all') {
        try {
          await this.optimizeStorage();
          results.optimizedFiles = 1; // Placeholder since we don't return count
        } catch (error) {
          errors.push(`Storage optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors
      };

    } catch (error) {
      logger.error('Error in manual cleanup:', error);
      return {
        success: false,
        results,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get cleanup statistics
   */
  public async getCleanupStats(): Promise<{
    expiredFiles: number;
    tempFiles: number;
    quarantinedFiles: number;
    duplicateFiles: number;
    totalStorageUsed: number;
  }> {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count expired files
      const expiredFilesSnapshot = await firestore
        .collection('fileMetadata')
        .where('expiresAt', '<', now)
        .count()
        .get();

      // Count temp files older than 24 hours
      const tempFilesSnapshot = await firestore
        .collection('fileMetadata')
        .where('category', '==', 'temp_files')
        .where('uploadedAt', '<', oneDayAgo)
        .count()
        .get();

      // Count quarantined files
      const quarantinedFilesSnapshot = await firestore
        .collection('virusScanResults')
        .where('status', '==', 'quarantined')
        .count()
        .get();

      // Count duplicate files
      const duplicateFilesSnapshot = await firestore
        .collection('fileMetadata')
        .where('isDuplicate', '==', true)
        .count()
        .get();

      // Calculate total storage used (this is a simplified calculation)
      const allFilesSnapshot = await firestore
        .collection('fileMetadata')
        .select('size')
        .get();

      let totalStorageUsed = 0;
      allFilesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.size && !data.isDuplicate) {
          totalStorageUsed += data.size;
        }
      });

      return {
        expiredFiles: expiredFilesSnapshot.data().count,
        tempFiles: tempFilesSnapshot.data().count,
        quarantinedFiles: quarantinedFilesSnapshot.data().count,
        duplicateFiles: duplicateFilesSnapshot.data().count,
        totalStorageUsed
      };

    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      return {
        expiredFiles: 0,
        tempFiles: 0,
        quarantinedFiles: 0,
        duplicateFiles: 0,
        totalStorageUsed: 0
      };
    }
  }

  /**
   * Stop all cleanup jobs
   */
  public stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped cleanup job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Restart a specific job
   */
  public restartJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      job.start();
      logger.info(`Restarted cleanup job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Get job status
   */
  public getJobStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.jobs.forEach((job, name) => {
      // Check if the job is scheduled (not stopped)
      status[name] = job.getStatus() === 'scheduled';
    });
    return status;
  }
}

export const fileCleanupService = FileCleanupService.getInstance();
export default fileCleanupService;