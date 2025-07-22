import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';
import { schedulerService } from '../services/schedulerService';
import { queueService } from '../services/queueService';
import { backgroundJobsService } from '../services/backgroundJobsService';
import logger from '../services/loggerService';

// Validation schemas
const createJobSchema = Joi.object({
  name: Joi.string().required(),
  schedule: Joi.string().required(),
  status: Joi.string().valid('active', 'paused').default('active')
});

const updateJobSchema = Joi.object({
  schedule: Joi.string().optional(),
  status: Joi.string().valid('active', 'paused').optional()
});

const queueJobSchema = Joi.object({
  queueName: Joi.string().required(),
  data: Joi.object().required(),
  options: Joi.object({
    priority: Joi.number().min(0).max(10).default(0),
    maxAttempts: Joi.number().min(1).max(10).default(3),
    delaySeconds: Joi.number().min(0).max(86400).default(0)
  }).optional()
});

export class BackgroundJobsController {
  /**
   * Get all scheduled jobs
   */
  getJobs = asyncHandler(async (req: Request, res: Response) => {
    try {
      const jobStatus = schedulerService.getJobStatus();
      
      res.json({
        success: true,
        data: jobStatus
      });
    } catch (error) {
      logger.error('Error getting jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get job by ID
   */
  getJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = schedulerService.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      logger.error('Error getting job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Create a new scheduled job
   */
  createJob = [
    validateRequest(createJobSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const jobId = await schedulerService.createJob(req.body);
        
        res.status(201).json({
          success: true,
          message: 'Job created successfully',
          data: {
            jobId
          }
        });
      } catch (error) {
        logger.error('Error creating job:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create job',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Update a scheduled job
   */
  updateJob = [
    validateRequest(updateJobSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { jobId } = req.params;
        await schedulerService.updateJob(jobId, req.body);
        
        res.json({
          success: true,
          message: 'Job updated successfully'
        });
      } catch (error) {
        logger.error('Error updating job:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update job',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Delete a scheduled job
   */
  deleteJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      await schedulerService.deleteJob(jobId);
      
      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Trigger a job manually
   */
  triggerJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobName } = req.params;
      const result = await schedulerService.triggerJob(jobName);
      
      res.json({
        success: true,
        message: 'Job triggered successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error triggering job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Pause a job
   */
  pauseJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      await schedulerService.pauseJob(jobId);
      
      res.json({
        success: true,
        message: 'Job paused successfully'
      });
    } catch (error) {
      logger.error('Error pausing job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Resume a job
   */
  resumeJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      await schedulerService.resumeJob(jobId);
      
      res.json({
        success: true,
        message: 'Job resumed successfully'
      });
    } catch (error) {
      logger.error('Error resuming job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get queue statistics
   */
  getQueueStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const stats = await queueService.getQueueStats(queueName);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get jobs from a queue by status
   */
  getQueueJobs = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { status = 'pending', limit = '100', offset = '0' } = req.query;
      
      const statusArray = (status as string).split(',') as any[];
      const jobs = await queueService.getJobsByStatus(
        queueName,
        statusArray,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({
        success: true,
        data: {
          jobs,
          count: jobs.length
        }
      });
    } catch (error) {
      logger.error('Error getting queue jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get a specific job from a queue
   */
  getQueueJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const job = await queueService.getJob(queueName, jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      logger.error('Error getting queue job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Add a job to a queue
   */
  addQueueJob = [
    validateRequest(queueJobSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { queueName, data, options } = req.body;
        const job = await queueService.addJob(queueName, data, options);
        
        res.status(201).json({
          success: true,
          message: 'Job added to queue successfully',
          data: {
            jobId: job.id
          }
        });
      } catch (error) {
        logger.error('Error adding job to queue:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to add job to queue',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  ];

  /**
   * Retry a failed job
   */
  retryQueueJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const success = await queueService.retryJob(queueName, jobId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to retry job, job may not be in failed state'
        });
      }
      
      res.json({
        success: true,
        message: 'Job marked for retry'
      });
    } catch (error) {
      logger.error('Error retrying queue job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Delete a job from a queue
   */
  deleteQueueJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const success = await queueService.deleteJob(queueName, jobId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting queue job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Clean up old jobs from a queue
   */
  cleanupQueueJobs = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { olderThanDays = '7' } = req.query;
      
      const count = await queueService.cleanupOldJobs(
        queueName,
        parseInt(olderThanDays as string)
      );
      
      res.json({
        success: true,
        message: `Cleaned up ${count} old jobs`,
        data: {
          count
        }
      });
    } catch (error) {
      logger.error('Error cleaning up queue jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean up jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get system status for all background jobs and queues
   */
  getSystemStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get scheduled jobs status
      const jobStatus = schedulerService.getJobStatus();
      
      // Get queue stats for all queues
      const queueNames = ['emailQueue', 'fileProcessingQueue', 'exportQueue'];
      const queueStats = await Promise.all(
        queueNames.map(async queueName => {
          try {
            const stats = await queueService.getQueueStats(queueName);
            return {
              queueName,
              stats
            };
          } catch (error) {
            return {
              queueName,
              stats: {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                retrying: 0,
                total: 0
              },
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );
      
      res.json({
        success: true,
        data: {
          scheduledJobs: jobStatus,
          queues: queueStats,
          systemTime: new Date()
        }
      });
    } catch (error) {
      logger.error('Error getting system status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export const backgroundJobsController = new BackgroundJobsController();
export default backgroundJobsController;