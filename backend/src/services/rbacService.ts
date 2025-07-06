import { UserRole, Permission, RolePermissions, UserClaims } from '../types/rbac';
import { getAuth } from 'firebase-admin/auth';
import logger from './loggerService';

// Define role permissions mapping
export const rolePermissions: RolePermissions = {
  [UserRole.USER]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.READ_MARKETPLACE,
    Permission.CREATE_PRODUCT,
    Permission.UPDATE_OWN_PRODUCT,
    Permission.DELETE_OWN_PRODUCT,
    Permission.READ_MENTORS,
    Permission.BOOK_SESSION,
    Permission.READ_COMMUNITY,
    Permission.CREATE_POST,
    Permission.UPDATE_OWN_POST,
    Permission.DELETE_OWN_POST,
    Permission.READ_PROTOTYPES,
    Permission.CREATE_PROTOTYPE,
    Permission.UPDATE_OWN_PROTOTYPE,
    Permission.DELETE_OWN_PROTOTYPE,
    Permission.SUBMIT_FEEDBACK,
  ],
  
  [UserRole.MENTOR]: [
    ...rolePermissions[UserRole.USER],
    Permission.CREATE_MENTOR_PROFILE,
    Permission.UPDATE_OWN_MENTOR_PROFILE,
  ],
  
  [UserRole.MODERATOR]: [
    ...rolePermissions[UserRole.MENTOR],
    Permission.MODERATE_POSTS,
    Permission.MANAGE_ALL_POSTS,
  ],
  
  [UserRole.ADMIN]: [
    ...rolePermissions[UserRole.MODERATOR],
    Permission.MANAGE_USERS,
    Permission.MANAGE_ALL_PRODUCTS,
    Permission.MANAGE_ALL_PROTOTYPES,
    Permission.VIEW_AUDIT_LOGS,
  ],
  
  [UserRole.SUPER_ADMIN]: [
    ...rolePermissions[UserRole.ADMIN],
    Permission.MANAGE_SYSTEM,
  ],
};

export class RBACService {
  /**
   * Get user claims from Firebase Auth
   */
  static async getUserClaims(uid: string): Promise<UserClaims | null> {
    try {
      const userRecord = await getAuth().getUser(uid);
      const customClaims = userRecord.customClaims as UserClaims;
      
      if (!customClaims) {
        return null;
      }
      
      return customClaims;
    } catch (error) {
      logger.error('Error getting user claims:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(uid: string, permission: Permission): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(uid);
      
      if (!claims || !claims.permissions) {
        return false;
      }
      
      return claims.permissions.includes(permission);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(uid: string, permissions: Permission[]): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(uid);
      
      if (!claims || !claims.permissions) {
        return false;
      }
      
      return permissions.some(permission => claims.permissions.includes(permission));
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(uid: string, permissions: Permission[]): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(uid);
      
      if (!claims || !claims.permissions) {
        return false;
      }
      
      return permissions.every(permission => claims.permissions.includes(permission));
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific role
   */
  static async hasRole(uid: string, role: UserRole): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(uid);
      
      if (!claims) {
        return false;
      }
      
      return claims.role === role;
    } catch (error) {
      logger.error('Error checking role:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  static async hasAnyRole(uid: string, roles: UserRole[]): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(uid);
      
      if (!claims) {
        return false;
      }
      
      return roles.includes(claims.role);
    } catch (error) {
      logger.error('Error checking roles:', error);
      return false;
    }
  }

  /**
   * Set user role and permissions
   */
  static async setUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      const permissions = rolePermissions[role];
      const claims: UserClaims = {
        role,
        permissions,
        userId: uid,
        email: '', // Will be set by the calling function
        isActive: true,
        createdAt: Date.now(),
      };
      
      await getAuth().setCustomUserClaims(uid, claims);
      logger.info(`Set role ${role} for user ${uid}`);
    } catch (error) {
      logger.error('Error setting user role:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return rolePermissions[role] || [];
  }

  /**
   * Get all available roles
   */
  static getAvailableRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Get all available permissions
   */
  static getAvailablePermissions(): Permission[] {
    return Object.values(Permission);
  }
} 