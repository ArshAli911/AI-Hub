import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';
import { v4 as uuidv4 } from 'uuid';

export type QueueJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface QueueJob<T = any> {
  id: string;
  queue: string;
  data: T;
  status: QueueJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  processingTime?: number;
  nextRetryAt?: Date;
}

export interface QueueJobOptions {
  priority?: number;
  maxAttempts?: number;
  delaySeconds?: number;
}

export interface QueueProcessorOptions {
  concurrency?: number;
  pollInterval?: number;
  visibilityTimeout?: number;
}

export type JobHandler<T = any> = (data: T, job: QueueJob<T>) => Promise<any>;

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, {
    handler: JobHandler;
    options: QueueProcessorOptions;
    isProcessing: boolean;
    processingJobs: Set<string>;
  }> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize queue service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing queue service');
      
      // Create queue collection if it doesn't exist
      const db = firestore;
      const queueCollections = ['emailQueue', 'fileProcessingQueue', 'notificationQueue', 'exportQueue', 'importQueue'];
      
      for (const queueName of queueCollections) {
        const collectionRef = db.collection(queueName);
        const snapshot = await collectionRef.limit(1).get();
        
        if (snapshot.empty) {
          // Collection exists but is empty, or doesn't exist yet
          logger.info(`Queue collection ${queueName} is ready`);
        }
      }
      
      this.isInitialized = true;
      logger.info('Queue service initialized');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  /**
   * Register a queue processor
   */
  public registerQueue<T = any>(
    queueName: string,
    handler: JobHandler<T>,
    options: QueueProcessorOptions = {}
  ): void {
    if (this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} is already registered`);
    }

    const defaultOptions: QueueProcessorOptions = {
      concurrency: 5,
      pollInterval: 5000, // 5 seconds
      visibilityTimeout: 60000, // 1 minute
    };

    const queueOptions = { ...defaultOptions, ...options };

    this.queues.set(queueName, {
      handler,
      options: queueOptions,
      isProcessing: false,
      processingJobs: new Set()
    });

    logger.info(`Queue ${queueName} registered with options:`, queueOptions);
  }

  /**
   * Start processing a queue
   */
  public startProcessing(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} is not registered`);
    }

    if (queue.isProcessing) {
      logger.info(`Queue ${queueName} is already processing`);
      return;
    }

    queue.isProcessing = true;
    this.pollQueue(queueName);

    logger.info(`Started processing queue ${queueName}`);
  }

  /**
   * Stop processing a queue
   */
  public stopProcessing(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} is not registered`);
    }

    if (!queue.isProcessing) {
      logger.info(`Queue ${queueName} is not processing`);
      return;
    }

    queue.isProcessing = false;
    const interval = this.pollingIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(queueName);
    }

    logger.info(`Stopped processing queue ${queueName}`);
  }

  /**
   * Add a job to a queue
   */
  public async addJob<T = any>(
    queueName: string,
    data: T,
    options: QueueJobOptions = {}
  ): Promise<QueueJob<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const defaultOptions: QueueJobOptions = {
      priority: 0,
      maxAttempts: 3,
      delaySeconds: 0
    };

    const jobOptions = { ...defaultOptions, ...options };
    const now = new Date();
    
    // Calculate next retry time if delayed
    let nextRetryAt: Date | undefined;
    if (jobOptions.delaySeconds && jobOptions.delaySeconds > 0) {
      nextRetryAt = new Date(now.getTime() + jobOptions.delaySeconds * 1000);
    }

    const job: QueueJob<T> = {
      id: uuidv4(),
      queue: queueName,
      data,
      status: nextRetryAt ? 'pending' : 'pending',
      priority: jobOptions.priority!,
      attempts: 0,
      maxAttempts: jobOptions.maxAttempts!,
      createdAt: now,
      updatedAt: now,
      nextRetryAt
    };

    try {
      await firestore.collection(queueName).doc(job.id).set(job);
      logger.info(`Added job ${job.id} to queue ${queueName}`);
      return job;
    } catch (error) {
      logger.error(`Error adding job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Poll queue for jobs to process
   */
  private pollQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return;
    }

    const pollInterval = queue.options.pollInterval || 5000;
    
    const interval = setInterval(async () => {
      if (!queue.isProcessing) {
        clearInterval(interval);
        return;
      }

      try {
        // Check if we can process more jobs
        const availableSlots = (queue.options.concurrency || 5) - queue.processingJobs.size;
        if (availableSlots <= 0) {
          return;
        }

        // Get jobs to process
        const now = new Date();
        const jobs = await firestore.collection(queueName)
          .where('status', 'in', ['pending', 'retrying'])
          .where('nextRetryAt', '<=', now)
          .orderBy('nextRetryAt', 'asc')
          .orderBy('priority', 'desc')
          .orderBy('createdAt', 'asc')
          .limit(availableSlots)
          .get();

        if (jobs.empty) {
          return;
        }

        // Process each job
        jobs.docs.forEach(doc => {
          const job = doc.data() as QueueJob;
          this.processJob(queueName, job.id).catch(error => {
            logger.error(`Error processing job ${job.id} from queue ${queueName}:`, error);
          });
        });
      } catch (error) {
        logger.error(`Error polling queue ${queueName}:`, error);
      }
    }, pollInterval);

    this.pollingIntervals.set(queueName, interval);
  }

  /**
   * Process a job from the queue
   */
  private async processJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return;
    }

    // Mark job as being processed
    queue.processingJobs.add(jobId);

    try {
      // Get job from database
      const jobDoc = await firestore.collection(queueName).doc(jobId).get();
      if (!jobDoc.exists) {
        queue.processingJobs.delete(jobId);
        return;
      }

      const job = jobDoc.data() as QueueJob;
      const startTime = Date.now();

      // Update job status to processing
      await firestore.collection(queueName).doc(jobId).update({
        status: 'processing',
        attempts: job.attempts + 1,
        startedAt: new Date(),
        updatedAt: new Date()
      });

      try {
        // Execute job handler
        const result = await queue.handler(job.data, job);
        const processingTime = Date.now() - startTime;

        // Update job as completed
        await firestore.collection(queueName).doc(jobId).update({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          result,
          processingTime
        });

        logger.info(`Job ${jobId} from queue ${queueName} completed in ${processingTime}ms`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;

        // Check if we should retry
        if (job.attempts < job.maxAttempts) {
          // Calculate exponential backoff for retry
          const delaySeconds = Math.pow(2, job.attempts) * 30; // 30s, 60s, 120s, ...
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

          await firestore.collection(queueName).doc(jobId).update({
            status: 'retrying',
            error: errorMessage,
            updatedAt: new Date(),
            processingTime,
            nextRetryAt
          });

          logger.warn(`Job ${jobId} from queue ${queueName} failed, will retry in ${delaySeconds}s: ${errorMessage}`);
        } else {
          // Mark as failed
          await firestore.collection(queueName).doc(jobId).update({
            status: 'failed',
            failedAt: new Date(),
            updatedAt: new Date(),
            error: errorMessage,
            processingTime
          });

          logger.error(`Job ${jobId} from queue ${queueName} failed after ${job.maxAttempts} attempts: ${errorMessage}`);
        }
      }
    } catch (error) {
      logger.error(`Error handling job ${jobId} from queue ${queueName}:`, error);
    } finally {
      // Remove job from processing set
      queue.processingJobs.delete(jobId);
    }
  }

  /**
   * Get job by ID
   */
  public async getJob<T = any>(queueName: string, jobId: string): Promise<QueueJob<T> | null> {
    try {
      const jobDoc = await firestore.collection(queueName).doc(jobId).get();
      if (!jobDoc.exists) {
        return null;
      }
      return jobDoc.data() as QueueJob<T>;
    } catch (error) {
      logger.error(`Error getting job ${jobId} from queue ${queueName}:`, error);
      return null;
    }
  }

  /**
   * Get jobs by status
   */
  public async getJobsByStatus<T = any>(
    queueName: string,
    status: QueueJobStatus | QueueJobStatus[],
    limit: number = 100,
    offset: number = 0
  ): Promise<QueueJob<T>[]> {
    try {
      let query = firestore.collection(queueName);
      
      if (Array.isArray(status)) {
        query = query.where('status', 'in', status);
      } else {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => doc.data() as QueueJob<T>);
    } catch (error) {
      logger.error(`Error getting jobs by status from queue ${queueName}:`, error);
      return [];
    }
  }

  /**
   * Retry a failed job
   */
  public async retryJob(queueName: string, jobId: string): Promise<boolean> {
    try {
      const jobDoc = await firestore.collection(queueName).doc(jobId).get();
      if (!jobDoc.exists) {
        return false;
      }

      const job = jobDoc.data() as QueueJob;
      if (job.status !== 'failed') {
        return false;
      }

      await firestore.collection(queueName).doc(jobId).update({
        status: 'pending',
        updatedAt: new Date(),
        nextRetryAt: new Date()
      });

      logger.info(`Job ${jobId} from queue ${queueName} marked for retry`);
      return true;
    } catch (error) {
      logger.error(`Error retrying job ${jobId} from queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Delete a job
   */
  public async deleteJob(queueName: string, jobId: string): Promise<boolean> {
    try {
      await firestore.collection(queueName).doc(jobId).delete();
      logger.info(`Job ${jobId} deleted from queue ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting job ${jobId} from queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Clean up completed and failed jobs older than specified days
   */
  public async cleanupOldJobs(queueName: string, olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get completed jobs
      const completedSnapshot = await firestore.collection(queueName)
        .where('status', '==', 'completed')
        .where('completedAt', '<', cutoffDate)
        .limit(500)
        .get();

      // Get failed jobs
      const failedSnapshot = await firestore.collection(queueName)
        .where('status', '==', 'failed')
        .where('failedAt', '<', cutoffDate)
        .limit(500)
        .get();

      const batch = firestore.batch();
      let count = 0;

      // Add completed jobs to batch
      completedSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      // Add failed jobs to batch
      failedSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${count} old jobs from queue ${queueName}`);
      }

      return count;
    } catch (error) {
      logger.error(`Error cleaning up old jobs from queue ${queueName}:`, error);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
    total: number;
  }> {
    try {
      const [
        pendingCount,
        processingCount,
        completedCount,
        failedCount,
        retryingCount,
        totalCount
      ] = await Promise.all([
        firestore.collection(queueName).where('status', '==', 'pending').count().get(),
        firestore.collection(queueName).where('status', '==', 'processing').count().get(),
        firestore.collection(queueName).where('status', '==', 'completed').count().get(),
        firestore.collection(queueName).where('status', '==', 'failed').count().get(),
        firestore.collection(queueName).where('status', '==', 'retrying').count().get(),
        firestore.collection(queueName).count().get()
      ]);

      return {
        pending: pendingCount.data().count,
        processing: processingCount.data().count,
        completed: completedCount.data().count,
        failed: failedCount.data().count,
        retrying: retryingCount.data().count,
        total: totalCount.data().count
      };
    } catch (error) {
      logger.error(`Error getting queue stats for ${queueName}:`, error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        total: 0
      };
    }
  }

  /**
   * Start all registered queues
   */
  public startAllQueues(): void {
    for (const queueName of this.queues.keys()) {
      this.startProcessing(queueName);
    }
    logger.info('Started processing all queues');
  }

  /**
   * Stop all registered queues
   */
  public stopAllQueues(): void {
    for (const queueName of this.queues.keys()) {
      this.stopProcessing(queueName);
    }
    logger.info('Stopped processing all queues');
  }
}

export const queueService = QueueService.getInstance();
export default queueService;