import { Request, Response } from 'express';
import { fileStorageService } from '../services/fileStorageService';
import { fileSecurityService } from '../services/fileSecurityService';
import { fileCleanupService } from '../services/fileCleanupService';
import logger from '../services/loggerService';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

// Validation schemas
const createSecurityPolicySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  rules: Joi.object({
    allowedMimeTypes: Joi.array().items(Joi.string()).optional(),
    blockedMimeTypes: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().min(1).optional(),
    allowedExtensions: Joi.array().items(Joi.string()).optional(),
    blockedExtensions: Joi.array().items(Joi.string()).optional(),
    requireVirusScan: Joi.boolean().default(true),
    quarantineOnThreat: Joi.boolean().default(true),
    allowExecutables: Joi.boolean().default(false),
    scanArchives: Joi.boolean().default(true)
  }).required(),
  isActive: Joi.boolean().default(true)
});

const updateQuotaSchema = Joi.object({
  userId: Joi.string().required(),
  totalLimit: Joi.number().min(0).optional(),
  categoryLimits: Joi.object().pattern(
    Joi.string(),
    Joi.number().min(0)
  ).optional()
});

const manualCleanupSchema = Joi.object({
  cleanupType: Joi.string().valid('expired', 'temp', 'quarantine', 'optimize', 'all').required()
});

export class FileAdminController {
  /**
   * Get file management dashboard statistics
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const [cleanupStats, jobStatus] = await Promise.all([
        fileCleanupService.getCleanupStats(),
        fileCleanupService.getJobStatus()
      ]);

      // Get recent file uploads (last 24 hours)
      const { firestore } = await import('../config/firebaseAdmin');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentUploadsSnapshot = await firestore
        .collection('fileMetadata')
        .where('uploadedAt', '>=', oneDayAgo)
        .count()
        .get();

      // Get virus scan statistics
      const virusScanStats = await firestore
        .collection('virusScanResults')
        .where('scannedAt', '>=', oneDayAgo)
        .get();

      const scanStats = {
        total: virusScanStats.size,
        clean: 0,
        infected: 0,
        quarantined: 0,
        errors: 0
      };

      virusScanStats.docs.forEach(doc => {
        const status = doc.data().status;
        if (status in scanStats) {
          scanStats[status as keyof typeof scanStats]++;
        }
      });

      // Get top file categories by usage
      const categoryUsageSnapshot = await firestore
        .collection('storageQuotas')
        .limit(100)
        .get();

      const categoryTotals: Record<string, number> = {};
      categoryUsageSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.categoryUsed) {
          Object.entries(data.categoryUsed).forEach(([category, usage]) => {
            categoryTotals[category] = (categoryTotals[category] || 0) + (usage as number);
          });
        }
      });

      res.json({
        success: true,
        data: {
          storage: cleanupStats,
          recentUploads: recentUploadsSnapshot.data().count,
          virusScan: scanStats,
          categoryUsage: categoryTotals,
          cleanupJobs: jobStatus,
          systemHealth: {
            storageOptimized: cleanupStats.duplicateFiles === 0,
            quarantineManaged: cleanupStats.quarantinedFiles < 100,
            tempFilesClean: cleanupStats.tempFiles < 50
          }
        }
      });

    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics'
      });
    }
  });

  /**
   * Get all security policies
   */
  getSecurityPolicies = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      const { limit = 20, offset = 0, active } = req.query;

      let query = firestore.collection('securityPolicies');

      if (active !== undefined) {
        query = query.where('isActive', '==', active === 'true');
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .get();

      const policies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get total count
      const totalSnapshot = await query.count().get();

      res.json({
        success: true,
        data: {
          policies,
          total: totalSnapshot.data().count,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });

    } catch (error) {
      logger.error('Error getting security policies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get security policies'
      });
    }
  });

  /**
   * Create new security policy
   */
  createSecurityPolicy = [
    validateRequest(createSecurityPolicySchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const policyData = req.body;
        const adminUserId = req.user?.uid;

        if (!adminUserId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const policy = await fileSecurityService.createSecurityPolicy(policyData);

        // Log admin action
        logger.info(`Security policy created by admin ${adminUserId}:`, {
          policyId: policy.id,
          policyName: policy.name
        });

        res.status(201).json({
          success: true,
          message: 'Security policy created successfully',
          data: policy
        });

      } catch (error) {
        logger.error('Error creating security policy:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create security policy'
        });
      }
    })
  ];

  /**
   * Update security policy
   */
  updateSecurityPolicy = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const updateData = req.body;
      const adminUserId = req.user?.uid;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { firestore } = await import('../config/firebaseAdmin');
      
      await firestore.collection('securityPolicies').doc(policyId).update({
        ...updateData,
        updatedAt: new Date()
      });

      // Get updated policy
      const updatedDoc = await firestore.collection('securityPolicies').doc(policyId).get();
      const updatedPolicy = { id: updatedDoc.id, ...updatedDoc.data() };

      // Log admin action
      logger.info(`Security policy updated by admin ${adminUserId}:`, {
        policyId,
        changes: updateData
      });

      res.json({
        success: true,
        message: 'Security policy updated successfully',
        data: updatedPolicy
      });

    } catch (error) {
      logger.error('Error updating security policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update security policy'
      });
    }
  });

  /**
   * Delete security policy
   */
  deleteSecurityPolicy = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const adminUserId = req.user?.uid;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { firestore } = await import('../config/firebaseAdmin');
      
      // Check if policy exists and get its data for logging
      const policyDoc = await firestore.collection('securityPolicies').doc(policyId).get();
      
      if (!policyDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Security policy not found'
        });
      }

      const policyData = policyDoc.data();

      // Don't allow deletion of default policy
      if (policyData?.name === 'default') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default security policy'
        });
      }

      await firestore.collection('securityPolicies').doc(policyId).delete();

      // Log admin action
      logger.info(`Security policy deleted by admin ${adminUserId}:`, {
        policyId,
        policyName: policyData?.name
      });

      res.json({
        success: true,
        message: 'Security policy deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting security policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete security policy'
      });
    }
  });

  /**
   * Get user storage quotas
   */
  getUserQuotas = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, sortBy = 'totalUsed', sortOrder = 'desc' } = req.query;

      const { firestore } = await import('../config/firebaseAdmin');
      
      let query = firestore.collection('storageQuotas');

      // Apply sorting
      query = query.orderBy(sortBy as string, sortOrder as 'asc' | 'desc');

      const snapshot = await query
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .get();

      const quotas = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));

      // Get total count
      const totalSnapshot = await firestore.collection('storageQuotas').count().get();

      res.json({
        success: true,
        data: {
          quotas,
          total: totalSnapshot.data().count,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });

    } catch (error) {
      logger.error('Error getting user quotas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user quotas'
      });
    }
  });

  /**
   * Update user quota
   */
  updateUserQuota = [
    validateRequest(updateQuotaSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { userId, totalLimit, categoryLimits } = req.body;
        const adminUserId = req.user?.uid;

        if (!adminUserId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const { firestore } = await import('../config/firebaseAdmin');
        
        const updateData: any = {
          lastUpdated: new Date()
        };

        if (totalLimit !== undefined) {
          updateData.totalLimit = totalLimit;
        }

        if (categoryLimits) {
          Object.entries(categoryLimits).forEach(([category, limit]) => {
            updateData[`categoryLimits.${category}`] = limit;
          });
        }

        await firestore.collection('storageQuotas').doc(userId).update(updateData);

        // Get updated quota
        const updatedDoc = await firestore.collection('storageQuotas').doc(userId).get();
        const updatedQuota = { userId: updatedDoc.id, ...updatedDoc.data() };

        // Log admin action
        logger.info(`User quota updated by admin ${adminUserId}:`, {
          targetUserId: userId,
          changes: { totalLimit, categoryLimits }
        });

        res.json({
          success: true,
          message: 'User quota updated successfully',
          data: updatedQuota
        });

      } catch (error) {
        logger.error('Error updating user quota:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update user quota'
        });
      }
    })
  ];

  /**
   * Get file access logs with advanced filtering
   */
  getAdvancedAccessLogs = asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        fileId,
        userId,
        action,
        startDate,
        endDate,
        ipAddress,
        success,
        limit = 100,
        offset = 0
      } = req.query;

      const logs = await fileSecurityService.getFileAccessLogs(
        fileId as string,
        userId as string,
        action as any,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        parseInt(limit as string)
      );

      // Additional filtering that can't be done at database level
      let filteredLogs = logs;

      if (ipAddress) {
        filteredLogs = filteredLogs.filter(log => log.ipAddress.includes(ipAddress as string));
      }

      if (success !== undefined) {
        const successFilter = success === 'true';
        filteredLogs = filteredLogs.filter(log => log.success === successFilter);
      }

      // Apply offset for client-side pagination
      const offsetNum = parseInt(offset as string);
      const paginatedLogs = filteredLogs.slice(offsetNum, offsetNum + parseInt(limit as string));

      res.json({
        success: true,
        data: {
          logs: paginatedLogs,
          total: filteredLogs.length,
          limit: parseInt(limit as string),
          offset: offsetNum
        }
      });

    } catch (error) {
      logger.error('Error getting advanced access logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get access logs'
      });
    }
  });

  /**
   * Run manual cleanup
   */
  runManualCleanup = [
    validateRequest(manualCleanupSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { cleanupType } = req.body;
        const adminUserId = req.user?.uid;

        if (!adminUserId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        logger.info(`Manual cleanup initiated by admin ${adminUserId}:`, { cleanupType });

        const result = await fileCleanupService.runManualCleanup(cleanupType);

        // Log admin action
        logger.info(`Manual cleanup completed by admin ${adminUserId}:`, {
          cleanupType,
          success: result.success,
          results: result.results,
          errors: result.errors
        });

        res.json({
          success: result.success,
          message: result.success ? 'Cleanup completed successfully' : 'Cleanup completed with errors',
          data: {
            results: result.results,
            errors: result.errors
          }
        });

      } catch (error) {
        logger.error('Error running manual cleanup:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to run cleanup'
        });
      }
    })
  ];

  /**
   * Get cleanup job status
   */
  getCleanupJobStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      const jobStatus = fileCleanupService.getJobStatus();
      const cleanupStats = await fileCleanupService.getCleanupStats();

      res.json({
        success: true,
        data: {
          jobs: jobStatus,
          stats: cleanupStats,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting cleanup job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup job status'
      });
    }
  });

  /**
   * Restart cleanup job
   */
  restartCleanupJob = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobName } = req.params;
      const adminUserId = req.user?.uid;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const success = fileCleanupService.restartJob(jobName);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Cleanup job not found'
        });
      }

      // Log admin action
      logger.info(`Cleanup job restarted by admin ${adminUserId}:`, { jobName });

      res.json({
        success: true,
        message: `Cleanup job '${jobName}' restarted successfully`
      });

    } catch (error) {
      logger.error('Error restarting cleanup job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart cleanup job'
      });
    }
  });

  /**
   * Get system storage overview
   */
  getStorageOverview = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { firestore } = await import('../config/firebaseAdmin');
      
      // Get storage statistics by category
      const quotasSnapshot = await firestore.collection('storageQuotas').get();
      
      const categoryStats: Record<string, { used: number; limit: number; users: number }> = {};
      let totalUsed = 0;
      let totalLimit = 0;
      let totalUsers = quotasSnapshot.size;

      quotasSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalUsed += data.totalUsed || 0;
        totalLimit += data.totalLimit || 0;

        if (data.categoryUsed && data.categoryLimits) {
          Object.entries(data.categoryUsed).forEach(([category, used]) => {
            if (!categoryStats[category]) {
              categoryStats[category] = { used: 0, limit: 0, users: 0 };
            }
            categoryStats[category].used += used as number;
            categoryStats[category].users += 1;
          });

          Object.entries(data.categoryLimits).forEach(([category, limit]) => {
            if (!categoryStats[category]) {
              categoryStats[category] = { used: 0, limit: 0, users: 0 };
            }
            categoryStats[category].limit += limit as number;
          });
        }
      });

      // Get file type distribution
      const filesSnapshot = await firestore
        .collection('fileMetadata')
        .select('mimeType', 'size')
        .get();

      const fileTypeStats: Record<string, { count: number; size: number }> = {};
      
      filesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const mimeType = data.mimeType || 'unknown';
        const size = data.size || 0;

        if (!fileTypeStats[mimeType]) {
          fileTypeStats[mimeType] = { count: 0, size: 0 };
        }
        fileTypeStats[mimeType].count += 1;
        fileTypeStats[mimeType].size += size;
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalUsed,
            totalLimit,
            totalUsers,
            utilizationPercentage: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
          },
          categoryStats,
          fileTypeStats,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting storage overview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get storage overview'
      });
    }
  });
}

export const fileAdminController = new FileAdminController();
export default fileAdminController;