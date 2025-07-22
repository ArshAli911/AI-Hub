import { Router } from 'express';
import { backgroundJobsController } from '../controllers/backgroundJobsController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// System status
router.get('/status', backgroundJobsController.getSystemStatus);

// Scheduled jobs routes
router.get('/jobs', backgroundJobsController.getJobs);
router.get('/jobs/:jobId', backgroundJobsController.getJob);
router.post('/jobs', rateLimiter.general, backgroundJobsController.createJob);
router.put('/jobs/:jobId', rateLimiter.general, backgroundJobsController.updateJob);
router.delete('/jobs/:jobId', rateLimiter.general, backgroundJobsController.deleteJob);
router.post('/jobs/:jobName/trigger', rateLimiter.general, backgroundJobsController.triggerJob);
router.post('/jobs/:jobId/pause', rateLimiter.general, backgroundJobsController.pauseJob);
router.post('/jobs/:jobId/resume', rateLimiter.general, backgroundJobsController.resumeJob);

// Queue routes
router.get('/queues/:queueName/stats', backgroundJobsController.getQueueStats);
router.get('/queues/:queueName/jobs', backgroundJobsController.getQueueJobs);
router.get('/queues/:queueName/jobs/:jobId', backgroundJobsController.getQueueJob);
router.post('/queues/jobs', rateLimiter.general, backgroundJobsController.addQueueJob);
router.post('/queues/:queueName/jobs/:jobId/retry', rateLimiter.general, backgroundJobsController.retryQueueJob);
router.delete('/queues/:queueName/jobs/:jobId', rateLimiter.general, backgroundJobsController.deleteQueueJob);
router.post('/queues/:queueName/cleanup', rateLimiter.general, backgroundJobsController.cleanupQueueJobs);

export default router;