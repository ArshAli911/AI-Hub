import { Request, Response } from 'express';
import { RBACService } from '../services/rbacService';
import { AuditService } from '../services/auditService';
import { BulkService } from '../services/bulkService';
import { SchedulerService } from '../services/schedulerService';
import { UserRole, Permission } from '../types/rbac';
import logger from '../services/loggerService';

// Get all available roles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = RBACService.getAvailableRoles();
    const permissions = RBACService.getAvailablePermissions();
    
    const rolePermissions = roles.map(role => ({
      role,
      permissions: RBACService.getRolePermissions(role),
    }));

    res.json({
      success: true,
      data: {
        roles,
        permissions,
        rolePermissions,
      },
    });
  } catch (error) {
    logger.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get roles',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Set user role
export const setUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const adminUserId = req.user?.uid;
    const adminEmail = req.user?.email;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and role are required',
      });
    }

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role must be one of the valid roles',
      });
    }

    await RBACService.setUserRole(userId, role);

    // Log the role change
    await AuditService.logRoleChange(
      adminUserId!,
      adminEmail!,
      userId,
      req.body.userEmail || 'unknown',
      'unknown',
      role,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: `Role updated successfully for user ${userId}`,
      data: { userId, role },
    });
  } catch (error) {
    logger.error('Error setting user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set user role',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get audit logs
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      success,
      limit = 100,
      offset = 0,
    } = req.query;

    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (action) filters.action = action as string;
    if (resource) filters.resource = resource as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (success !== undefined) filters.success = success === 'true';

    const logs = await AuditService.getAuditLogs(
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: logs.length,
      },
    });
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get audit statistics
export const getAuditStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'startDate and endDate are required',
      });
    }

    const stats = await AuditService.getAuditStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Bulk user operations
export const bulkUserOperations = async (req: Request, res: Response) => {
  try {
    const { operations } = req.body;
    const adminUserId = req.user?.uid;
    const adminEmail = req.user?.email;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operations',
        message: 'operations must be an array',
      });
    }

    const result = await BulkService.bulkUserOperations(
      adminUserId!,
      adminEmail!,
      operations,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error performing bulk user operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk operations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get system statistics
export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const stats = await BulkService.getSystemStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get scheduled job status
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const jobStatus = SchedulerService.getJobStatus();

    res.json({
      success: true,
      data: jobStatus,
    });
  } catch (error) {
    logger.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Trigger a scheduled job manually
export const triggerJob = async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params;

    if (!jobName) {
      return res.status(400).json({
        success: false,
        error: 'Missing job name',
        message: 'jobName is required',
      });
    }

    await SchedulerService.triggerJob(jobName);

    res.json({
      success: true,
      message: `Job '${jobName}' triggered successfully`,
    });
  } catch (error) {
    logger.error('Error triggering job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Export user data
export const exportUserData = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user IDs',
        message: 'userIds must be an array',
      });
    }

    const userData = await BulkService.exportUserData(userIds);

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 