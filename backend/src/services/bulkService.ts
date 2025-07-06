import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { UserRole } from '../types/rbac';
import { RBACService } from './rbacService';
import { AuditService } from './auditService';
import logger from './loggerService';

export interface BulkOperationResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
}

export interface BulkUserOperation {
  userId: string;
  email: string;
  operation: 'update_role' | 'deactivate' | 'activate' | 'delete';
  newRole?: UserRole;
  reason?: string;
}

export interface BulkProductOperation {
  productId: string;
  operation: 'approve' | 'reject' | 'delete' | 'feature';
  reason?: string;
}

export class BulkService {
  private static db = getFirestore();
  private static auth = getAuth();

  /**
   * Bulk user operations
   */
  static async bulkUserOperations(
    adminUserId: string,
    adminEmail: string,
    operations: BulkUserOperation[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: true,
      message: `Processed ${operations.length} user operations`,
      details: {
        total: operations.length,
        successful: 0,
        failed: 0,
        errors: [],
      },
      errors: [],
    };

    const batch = this.db.batch();

    for (const operation of operations) {
      try {
        switch (operation.operation) {
          case 'update_role':
            if (operation.newRole) {
              await RBACService.setUserRole(operation.userId, operation.newRole);
              
              // Update user document in Firestore
              const userRef = this.db.collection('users').doc(operation.userId);
              batch.update(userRef, {
                role: operation.newRole,
                updatedAt: new Date(),
                updatedBy: adminUserId,
              });

              // Log the role change
              await AuditService.logRoleChange(
                adminUserId,
                adminEmail,
                operation.userId,
                operation.email,
                'unknown', // We don't have the old role easily accessible
                operation.newRole,
                ipAddress,
                userAgent
              );
            }
            break;

          case 'deactivate':
            await this.auth.updateUser(operation.userId, { disabled: true });
            
            const userRef = this.db.collection('users').doc(operation.userId);
            batch.update(userRef, {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedBy: adminUserId,
              deactivationReason: operation.reason,
            });

            await AuditService.logEvent(
              adminUserId,
              adminEmail,
              'USER_DEACTIVATED',
              'user',
              { reason: operation.reason },
              operation.userId,
              ipAddress,
              userAgent
            );
            break;

          case 'activate':
            await this.auth.updateUser(operation.userId, { disabled: false });
            
            const activateUserRef = this.db.collection('users').doc(operation.userId);
            batch.update(activateUserRef, {
              isActive: true,
              activatedAt: new Date(),
              activatedBy: adminUserId,
            });

            await AuditService.logEvent(
              adminUserId,
              adminEmail,
              'USER_ACTIVATED',
              'user',
              {},
              operation.userId,
              ipAddress,
              userAgent
            );
            break;

          case 'delete':
            await this.auth.deleteUser(operation.userId);
            
            const deleteUserRef = this.db.collection('users').doc(operation.userId);
            batch.delete(deleteUserRef);

            await AuditService.logUserDeletion(
              adminUserId,
              adminEmail,
              operation.userId,
              operation.email,
              ipAddress,
              userAgent
            );
            break;
        }

        results.details!.successful++;
        logger.info(`Bulk operation successful: ${operation.operation} on user ${operation.userId}`);

      } catch (error) {
        const errorMessage = `Failed to ${operation.operation} user ${operation.userId}: ${error}`;
        results.details!.failed++;
        results.errors!.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Commit all Firestore changes
    try {
      await batch.commit();
    } catch (error) {
      logger.error('Failed to commit bulk operations batch:', error);
      results.errors!.push(`Batch commit failed: ${error}`);
    }

    // Log the bulk operation
    await AuditService.logEvent(
      adminUserId,
      adminEmail,
      'BULK_USER_OPERATIONS',
      'users',
      {
        total: operations.length,
        successful: results.details!.successful,
        failed: results.details!.failed,
        operations: operations.map(op => ({ userId: op.userId, operation: op.operation })),
      },
      undefined,
      ipAddress,
      userAgent,
      results.details!.failed === 0
    );

    return results;
  }

  /**
   * Bulk product operations
   */
  static async bulkProductOperations(
    adminUserId: string,
    adminEmail: string,
    operations: BulkProductOperation[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: true,
      message: `Processed ${operations.length} product operations`,
      details: {
        total: operations.length,
        successful: 0,
        failed: 0,
        errors: [],
      },
      errors: [],
    };

    const batch = this.db.batch();

    for (const operation of operations) {
      try {
        const productRef = this.db.collection('products').doc(operation.productId);

        switch (operation.operation) {
          case 'approve':
            batch.update(productRef, {
              status: 'approved',
              approvedAt: new Date(),
              approvedBy: adminUserId,
            });
            break;

          case 'reject':
            batch.update(productRef, {
              status: 'rejected',
              rejectedAt: new Date(),
              rejectedBy: adminUserId,
              rejectionReason: operation.reason,
            });
            break;

          case 'delete':
            batch.delete(productRef);
            break;

          case 'feature':
            batch.update(productRef, {
              featured: true,
              featuredAt: new Date(),
              featuredBy: adminUserId,
            });
            break;
        }

        await AuditService.logEvent(
          adminUserId,
          adminEmail,
          `BULK_PRODUCT_${operation.operation.toUpperCase()}`,
          'product',
          { reason: operation.reason },
          operation.productId,
          ipAddress,
          userAgent
        );

        results.details!.successful++;
        logger.info(`Bulk product operation successful: ${operation.operation} on product ${operation.productId}`);

      } catch (error) {
        const errorMessage = `Failed to ${operation.operation} product ${operation.productId}: ${error}`;
        results.details!.failed++;
        results.errors!.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Commit all Firestore changes
    try {
      await batch.commit();
    } catch (error) {
      logger.error('Failed to commit bulk product operations batch:', error);
      results.errors!.push(`Batch commit failed: ${error}`);
    }

    // Log the bulk operation
    await AuditService.logEvent(
      adminUserId,
      adminEmail,
      'BULK_PRODUCT_OPERATIONS',
      'products',
      {
        total: operations.length,
        successful: results.details!.successful,
        failed: results.details!.failed,
        operations: operations.map(op => ({ productId: op.productId, operation: op.operation })),
      },
      undefined,
      ipAddress,
      userAgent,
      results.details!.failed === 0
    );

    return results;
  }

  /**
   * Get system statistics for admin dashboard
   */
  static async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalProducts: number;
    totalMentors: number;
    totalPrototypes: number;
    recentActivity: any[];
  }> {
    try {
      // Get user statistics
      const usersSnapshot = await this.db.collection('users').get();
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length;

      // Get product statistics
      const productsSnapshot = await this.db.collection('products').get();
      const totalProducts = productsSnapshot.size;

      // Get mentor statistics
      const mentorsSnapshot = await this.db.collection('mentors').get();
      const totalMentors = mentorsSnapshot.size;

      // Get prototype statistics
      const prototypesSnapshot = await this.db.collection('prototypes').get();
      const totalPrototypes = prototypesSnapshot.size;

      // Get recent audit logs for activity
      const recentLogs = await AuditService.getAuditLogs({}, 10, 0);

      return {
        totalUsers,
        activeUsers,
        totalProducts,
        totalMentors,
        totalPrototypes,
        recentActivity: recentLogs,
      };

    } catch (error) {
      logger.error('Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Export user data for admin purposes
   */
  static async exportUserData(userIds: string[]): Promise<any[]> {
    try {
      const userData: any[] = [];

      for (const userId of userIds) {
        try {
          const userRecord = await this.auth.getUser(userId);
          const userDoc = await this.db.collection('users').doc(userId).get();
          
          userData.push({
            uid: userId,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            disabled: userRecord.disabled,
            emailVerified: userRecord.emailVerified,
            createdAt: userRecord.metadata.creationTime,
            lastSignIn: userRecord.metadata.lastSignInTime,
            customClaims: userRecord.customClaims,
            firestoreData: userDoc.exists ? userDoc.data() : null,
          });
        } catch (error) {
          logger.error(`Failed to export data for user ${userId}:`, error);
          userData.push({
            uid: userId,
            error: `Failed to export: ${error}`,
          });
        }
      }

      return userData;

    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw error;
    }
  }
} 