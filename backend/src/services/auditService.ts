import { getFirestore } from 'firebase-admin/firestore';
import { AuditLogEntry } from '../types/rbac';
import logger from './loggerService';
import { captureMessage } from './sentryService';

export class AuditService {
  private static db = getFirestore();
  private static collection = 'audit_logs';

  /**
   * Log an audit event
   */
  static async logEvent(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    details: Record<string, any> = {},
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: Date.now(),
        success,
        errorMessage,
      };

      // Store in Firestore
      await this.db.collection(this.collection).doc(auditEntry.id).set(auditEntry);

      // Log to Winston
      const logLevel = success ? 'info' : 'error';
      const logMessage = `AUDIT: ${action} on ${resource} by ${userEmail} (${userId})`;
      
      logger.log(logLevel, logMessage, {
        auditEntry,
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
      });

      // Send to Sentry for important actions or errors
      if (!success || this.isImportantAction(action)) {
        captureMessage(logMessage, success ? 'info' : 'error', { auditEntry });
      }

    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log user creation
   */
  static async logUserCreation(
    adminUserId: string,
    adminEmail: string,
    newUserId: string,
    newUserEmail: string,
    userData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      adminUserId,
      adminEmail,
      'USER_CREATED',
      'user',
      {
        newUserId,
        newUserEmail,
        userData,
      },
      newUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log user deletion
   */
  static async logUserDeletion(
    adminUserId: string,
    adminEmail: string,
    deletedUserId: string,
    deletedUserEmail: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      adminUserId,
      adminEmail,
      'USER_DELETED',
      'user',
      {
        deletedUserId,
        deletedUserEmail,
      },
      deletedUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log role changes
   */
  static async logRoleChange(
    adminUserId: string,
    adminEmail: string,
    targetUserId: string,
    targetUserEmail: string,
    oldRole: string,
    newRole: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      adminUserId,
      adminEmail,
      'ROLE_CHANGED',
      'user',
      {
        targetUserId,
        targetUserEmail,
        oldRole,
        newRole,
      },
      targetUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log login attempts
   */
  static async logLoginAttempt(
    userId: string,
    userEmail: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent(
      userId,
      userEmail,
      'LOGIN_ATTEMPT',
      'auth',
      {},
      undefined,
      ipAddress,
      userAgent,
      success,
      errorMessage
    );
  }

  /**
   * Log data access
   */
  static async logDataAccess(
    userId: string,
    userEmail: string,
    resource: string,
    resourceId: string,
    action: 'READ' | 'UPDATE' | 'DELETE' | 'CREATE',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      userId,
      userEmail,
      `${action}_${resource.toUpperCase()}`,
      resource,
      {},
      resourceId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    } = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      let query: any = this.db.collection(this.collection);

      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }
      if (filters.resource) {
        query = query.where('resource', '==', filters.resource);
      }
      if (filters.success !== undefined) {
        query = query.where('success', '==', filters.success);
      }
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate.getTime());
      }
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate.getTime());
      }

      // Order by timestamp descending
      query = query.orderBy('timestamp', 'desc');

      // Apply pagination
      query = query.limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => doc.data() as AuditLogEntry);

    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
  }> {
    try {
      const logs = await this.getAuditLogs({
        startDate,
        endDate,
      }, 1000); // Get more logs for stats

      const stats = {
        totalEvents: logs.length,
        successfulEvents: logs.filter(log => log.success).length,
        failedEvents: logs.filter(log => !log.success).length,
        eventsByAction: {} as Record<string, number>,
        eventsByUser: {} as Record<string, number>,
      };

      logs.forEach(log => {
        // Count by action
        stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
        
        // Count by user
        stats.eventsByUser[log.userEmail] = (stats.eventsByUser[log.userEmail] || 0) + 1;
      });

      return stats;

    } catch (error) {
      logger.error('Failed to get audit stats:', error);
      throw error;
    }
  }

  /**
   * Check if an action is important enough to send to Sentry
   */
  private static isImportantAction(action: string): boolean {
    const importantActions = [
      'USER_CREATED',
      'USER_DELETED',
      'ROLE_CHANGED',
      'SYSTEM_CONFIG_CHANGED',
      'BULK_OPERATION',
    ];
    
    return importantActions.includes(action);
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const snapshot = await this.db
        .collection(this.collection)
        .where('timestamp', '<', cutoffDate.getTime())
        .get();

      const batch = this.db.batch();
      let deletedCount = 0;

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${deletedCount} old audit logs`);
      }

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }
} 