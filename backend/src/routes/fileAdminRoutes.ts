import { Router } from 'express';
import { fileAdminController } from '../controllers/fileAdminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard and overview routes
router.get('/dashboard/stats', fileAdminController.getDashboardStats);
router.get('/storage/overview', fileAdminController.getStorageOverview);

// Security policy management
router.get('/security/policies', fileAdminController.getSecurityPolicies);
router.post('/security/policies', 
  rateLimiter.general, 
  fileAdminController.createSecurityPolicy
);
router.put('/security/policies/:policyId', 
  rateLimiter.general, 
  fileAdminController.updateSecurityPolicy
);
router.delete('/security/policies/:policyId', 
  rateLimiter.general, 
  fileAdminController.deleteSecurityPolicy
);

// User quota management
router.get('/quotas/users', fileAdminController.getUserQuotas);
router.put('/quotas/users', 
  rateLimiter.general, 
  fileAdminController.updateUserQuota
);

// Advanced access logs
router.get('/logs/access', fileAdminController.getAdvancedAccessLogs);

// Cleanup management
router.get('/cleanup/status', fileAdminController.getCleanupJobStatus);
router.post('/cleanup/run', 
  rateLimiter.general, 
  fileAdminController.runManualCleanup
);
router.post('/cleanup/jobs/:jobName/restart', 
  rateLimiter.general, 
  fileAdminController.restartCleanupJob
);

export default router;