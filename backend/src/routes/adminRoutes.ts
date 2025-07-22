import { Router } from 'express';
import {
  getRoles,
  setUserRole,
  getAuditLogs,
  getAuditStats,
  bulkUserOperations,
  getSystemStats,
  getJobStatus,
  triggerJob,
  exportUserData,
} from '../controllers/adminController';
import { verifyIdToken, requirePermission } from '../middleware/authMiddleware';
import { Permission } from '../types/rbac';
import fileAdminRoutes from './fileAdminRoutes';

const router = Router();

// All admin routes require authentication
router.use(verifyIdToken);

// RBAC Management
router.get('/roles', requirePermission([Permission.MANAGE_USERS]), getRoles);
router.post('/users/role', requirePermission([Permission.MANAGE_USERS]), setUserRole);

// Audit Logs
router.get('/audit-logs', requirePermission([Permission.VIEW_AUDIT_LOGS]), getAuditLogs);
router.get('/audit-stats', requirePermission([Permission.VIEW_AUDIT_LOGS]), getAuditStats);

// Bulk Operations
router.post('/users/bulk', requirePermission([Permission.MANAGE_USERS]), bulkUserOperations);

// System Management
router.get('/system/stats', requirePermission([Permission.MANAGE_SYSTEM]), getSystemStats);
router.get('/system/jobs', requirePermission([Permission.MANAGE_SYSTEM]), getJobStatus);
router.post('/system/jobs/:jobName/trigger', requirePermission([Permission.MANAGE_SYSTEM]), triggerJob);

// Data Export
router.post('/export/users', requirePermission([Permission.MANAGE_USERS]), exportUserData);

// File Management Admin Routes
router.use('/files', fileAdminRoutes);

export default router; 