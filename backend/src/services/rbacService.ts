import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MENTOR = 'mentor',
  USER = 'user',
  GUEST = 'guest'
}

export enum Permission {
  // User management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // Content management
  CREATE_POST = 'create_post',
  READ_POST = 'read_post',
  UPDATE_POST = 'update_post',
  DELETE_POST = 'delete_post',
  MODERATE_POST = 'moderate_post',
  PIN_POST = 'pin_post',
  
  // Comment management
  CREATE_COMMENT = 'create_comment',
  READ_COMMENT = 'read_comment',
  UPDATE_COMMENT = 'update_comment',
  DELETE_COMMENT = 'delete_comment',
  MODERATE_COMMENT = 'moderate_comment',
  
  // Prototype management
  CREATE_PROTOTYPE = 'create_prototype',
  READ_PROTOTYPE = 'read_prototype',
  UPDATE_PROTOTYPE = 'update_prototype',
  DELETE_PROTOTYPE = 'delete_prototype',
  REVIEW_PROTOTYPE = 'review_prototype',
  
  // Marketplace management
  CREATE_PRODUCT = 'create_product',
  READ_PRODUCT = 'read_product',
  UPDATE_PRODUCT = 'update_product',
  DELETE_PRODUCT = 'delete_product',
  APPROVE_PRODUCT = 'approve_product',
  
  // Session management
  CREATE_SESSION = 'create_session',
  READ_SESSION = 'read_session',
  UPDATE_SESSION = 'update_session',
  DELETE_SESSION = 'delete_session',
  JOIN_SESSION = 'join_session',
  
  // System management
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SYSTEM = 'manage_system',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings',
  
  // Notification management
  SEND_NOTIFICATION = 'send_notification',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  
  // Report management
  CREATE_REPORT = 'create_report',
  READ_REPORT = 'read_report',
  RESOLVE_REPORT = 'resolve_report'
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  
  [UserRole.ADMIN]: [
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
    
    Permission.CREATE_POST,
    Permission.READ_POST,
    Permission.UPDATE_POST,
    Permission.DELETE_POST,
    Permission.MODERATE_POST,
    Permission.PIN_POST,
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT,
    Permission.MODERATE_COMMENT,
    
    Permission.CREATE_PROTOTYPE,
    Permission.READ_PROTOTYPE,
    Permission.UPDATE_PROTOTYPE,
    Permission.DELETE_PROTOTYPE,
    Permission.REVIEW_PROTOTYPE,
    
    Permission.CREATE_PRODUCT,
    Permission.READ_PRODUCT,
    Permission.UPDATE_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.APPROVE_PRODUCT,
    
    Permission.CREATE_SESSION,
    Permission.READ_SESSION,
    Permission.UPDATE_SESSION,
    Permission.DELETE_SESSION,
    Permission.JOIN_SESSION,
    
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_LOGS,
    Permission.MANAGE_SETTINGS,
    
    Permission.SEND_NOTIFICATION,
    Permission.MANAGE_NOTIFICATIONS,
    
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.RESOLVE_REPORT
  ],
  
  [UserRole.MODERATOR]: [
    Permission.READ_USER,
    Permission.UPDATE_USER,
    
    Permission.CREATE_POST,
    Permission.READ_POST,
    Permission.UPDATE_POST,
    Permission.DELETE_POST,
    Permission.MODERATE_POST,
    Permission.PIN_POST,
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT,
    Permission.MODERATE_COMMENT,
    
    Permission.READ_PROTOTYPE,
    Permission.REVIEW_PROTOTYPE,
    
    Permission.READ_PRODUCT,
    Permission.APPROVE_PRODUCT,
    
    Permission.READ_SESSION,
    
    Permission.SEND_NOTIFICATION,
    
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.RESOLVE_REPORT
  ],
  
  [UserRole.MENTOR]: [
    Permission.READ_USER,
    Permission.UPDATE_USER,
    
    Permission.CREATE_POST,
    Permission.READ_POST,
    Permission.UPDATE_POST,
    Permission.DELETE_POST,
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT,
    
    Permission.CREATE_PROTOTYPE,
    Permission.READ_PROTOTYPE,
    Permission.UPDATE_PROTOTYPE,
    Permission.DELETE_PROTOTYPE,
    
    Permission.CREATE_PRODUCT,
    Permission.READ_PRODUCT,
    Permission.UPDATE_PRODUCT,
    Permission.DELETE_PRODUCT,
    
    Permission.CREATE_SESSION,
    Permission.READ_SESSION,
    Permission.UPDATE_SESSION,
    Permission.DELETE_SESSION,
    Permission.JOIN_SESSION,
    
    Permission.CREATE_REPORT
  ],
  
  [UserRole.USER]: [
    Permission.READ_USER,
    Permission.UPDATE_USER,
    
    Permission.CREATE_POST,
    Permission.READ_POST,
    Permission.UPDATE_POST,
    Permission.DELETE_POST,
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT,
    
    Permission.CREATE_PROTOTYPE,
    Permission.READ_PROTOTYPE,
    Permission.UPDATE_PROTOTYPE,
    Permission.DELETE_PROTOTYPE,
    
    Permission.READ_PRODUCT,
    
    Permission.READ_SESSION,
    Permission.JOIN_SESSION,
    
    Permission.CREATE_REPORT
  ],
  
  [UserRole.GUEST]: [
    Permission.READ_POST,
    Permission.READ_COMMENT,
    Permission.READ_PROTOTYPE,
    Permission.READ_PRODUCT
  ]
};

export class RBACService {
  /**
   * Get user role from database
   */
  static async getUserRole(userId: string): Promise<UserRole> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return UserRole.GUEST;
      }
      
      const userData = userDoc.data()!;
      return userData.role || UserRole.USER;
    } catch (error) {
      logger.error(`Error getting user role for ${userId}:`, error);
      return UserRole.GUEST;
    }
  }

  /**
   * Set user role
   */
  static async setUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      const permissions = this.getRolePermissions(role);
      
      await firestore.collection('users').doc(userId).update({
        role,
        permissions,
        updatedAt: new Date()
      });
      
      logger.info(`User ${userId} role updated to ${role}`);
    } catch (error) {
      logger.error(`Error setting user role for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get permissions for a role
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return this.getRolePermissions(UserRole.GUEST);
      }
      
      const userData = userDoc.data()!;
      const role = userData.role || UserRole.USER;
      
      // Get role-based permissions
      const rolePermissions = this.getRolePermissions(role);
      
      // Get custom permissions (if any)
      const customPermissions = userData.customPermissions || [];
      
      // Combine and deduplicate permissions
      const allPermissions = [...rolePermissions, ...customPermissions];
      return [...new Set(allPermissions)];
    } catch (error) {
      logger.error(`Error getting user permissions for ${userId}:`, error);
      return this.getRolePermissions(UserRole.GUEST);
    }
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.includes(permission);
    } catch (error) {
      logger.error(`Error checking permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has any of the permissions
   */
  static async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.some(permission => userPermissions.includes(permission));
    } catch (error) {
      logger.error(`Error checking permissions for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has all permissions
   */
  static async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.every(permission => userPermissions.includes(permission));
    } catch (error) {
      logger.error(`Error checking permissions for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Grant custom permission to user
   */
  static async grantPermission(userId: string, permission: Permission): Promise<void> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data()!;
      const customPermissions = userData.customPermissions || [];
      
      if (!customPermissions.includes(permission)) {
        customPermissions.push(permission);
        
        await firestore.collection('users').doc(userId).update({
          customPermissions,
          updatedAt: new Date()
        });
        
        logger.info(`Permission ${permission} granted to user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error granting permission ${permission} to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke custom permission from user
   */
  static async revokePermission(userId: string, permission: Permission): Promise<void> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data()!;
      const customPermissions = userData.customPermissions || [];
      
      const updatedPermissions = customPermissions.filter(p => p !== permission);
      
      await firestore.collection('users').doc(userId).update({
        customPermissions: updatedPermissions,
        updatedAt: new Date()
      });
      
      logger.info(`Permission ${permission} revoked from user ${userId}`);
    } catch (error) {
      logger.error(`Error revoking permission ${permission} from user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user can access resource
   */
  static async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      // Check if user has the required permission
      const hasPermission = await this.hasPermission(userId, action);
      
      if (!hasPermission) {
        return false;
      }
      
      // Additional resource-specific checks
      switch (resourceType) {
        case 'post':
          return await this.canAccessPost(userId, resourceId, action);
        case 'comment':
          return await this.canAccessComment(userId, resourceId, action);
        case 'prototype':
          return await this.canAccessPrototype(userId, resourceId, action);
        case 'product':
          return await this.canAccessProduct(userId, resourceId, action);
        case 'session':
          return await this.canAccessSession(userId, resourceId, action);
        default:
          return true;
      }
    } catch (error) {
      logger.error(`Error checking resource access for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user can access post
   */
  private static async canAccessPost(
    userId: string,
    postId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      const postDoc = await firestore.collection('posts').doc(postId).get();
      
      if (!postDoc.exists) {
        return false;
      }
      
      const post = postDoc.data()!;
      const userRole = await this.getUserRole(userId);
      
      // Owner can always access their own posts
      if (post.userId === userId) {
        return true;
      }
      
      // Admins and moderators can access all posts
      if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(userRole)) {
        return true;
      }
      
      // For other actions, check if post is public or user has special access
      if (action === Permission.READ_POST) {
        return post.visibility === 'public' || post.allowedUsers?.includes(userId);
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking post access:`, error);
      return false;
    }
  }

  /**
   * Check if user can access comment
   */
  private static async canAccessComment(
    userId: string,
    commentId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      const commentDoc = await firestore.collection('comments').doc(commentId).get();
      
      if (!commentDoc.exists) {
        return false;
      }
      
      const comment = commentDoc.data()!;
      const userRole = await this.getUserRole(userId);
      
      // Owner can always access their own comments
      if (comment.userId === userId) {
        return true;
      }
      
      // Admins and moderators can access all comments
      if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(userRole)) {
        return true;
      }
      
      // For read access, check if user can access the parent post
      if (action === Permission.READ_COMMENT) {
        return await this.canAccessPost(userId, comment.postId, Permission.READ_POST);
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking comment access:`, error);
      return false;
    }
  }

  /**
   * Check if user can access prototype
   */
  private static async canAccessPrototype(
    userId: string,
    prototypeId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      const prototypeDoc = await firestore.collection('prototypes').doc(prototypeId).get();
      
      if (!prototypeDoc.exists) {
        return false;
      }
      
      const prototype = prototypeDoc.data()!;
      const userRole = await this.getUserRole(userId);
      
      // Owner can always access their own prototypes
      if (prototype.userId === userId) {
        return true;
      }
      
      // Admins and moderators can access all prototypes
      if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(userRole)) {
        return true;
      }
      
      // For read access, check visibility
      if (action === Permission.READ_PROTOTYPE) {
        return prototype.visibility === 'public';
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking prototype access:`, error);
      return false;
    }
  }

  /**
   * Check if user can access product
   */
  private static async canAccessProduct(
    userId: string,
    productId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      const productDoc = await firestore.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        return false;
      }
      
      const product = productDoc.data()!;
      const userRole = await this.getUserRole(userId);
      
      // Owner can always access their own products
      if (product.sellerId === userId) {
        return true;
      }
      
      // Admins and moderators can access all products
      if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(userRole)) {
        return true;
      }
      
      // For read access, check if product is published
      if (action === Permission.READ_PRODUCT) {
        return product.status === 'published';
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking product access:`, error);
      return false;
    }
  }

  /**
   * Check if user can access session
   */
  private static async canAccessSession(
    userId: string,
    sessionId: string,
    action: Permission
  ): Promise<boolean> {
    try {
      const sessionDoc = await firestore.collection('sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        return false;
      }
      
      const session = sessionDoc.data()!;
      const userRole = await this.getUserRole(userId);
      
      // Participants can access the session
      if (session.userId === userId || session.mentorId === userId) {
        return true;
      }
      
      // Admins can access all sessions
      if ([UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole)) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking session access:`, error);
      return false;
    }
  }

  /**
   * Get available roles
   */
  static getAvailableRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Get available permissions
   */
  static getAvailablePermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Check if role exists
   */
  static isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Check if permission exists
   */
  static isValidPermission(permission: string): permission is Permission {
    return Object.values(Permission).includes(permission as Permission);
  }

  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  static getRoleLevel(role: UserRole): number {
    const levels = {
      [UserRole.GUEST]: 0,
      [UserRole.USER]: 1,
      [UserRole.MENTOR]: 2,
      [UserRole.MODERATOR]: 3,
      [UserRole.ADMIN]: 4,
      [UserRole.SUPER_ADMIN]: 5
    };
    
    return levels[role] || 0;
  }

  /**
   * Check if user has higher or equal role level
   */
  static async hasRoleLevel(userId: string, requiredLevel: number): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      const userLevel = this.getRoleLevel(userRole);
      return userLevel >= requiredLevel;
    } catch (error) {
      logger.error(`Error checking role level for user ${userId}:`, error);
      return false;
    }
  }
}

export default RBACService;