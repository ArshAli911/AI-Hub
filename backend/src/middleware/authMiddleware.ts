import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { RBACService } from '../services/rbacService';
import { Permission, UserRole } from '../types/rbac';
import logger from '../services/loggerService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: UserRole;
        permissions: Permission[];
      };
    }
  }
}

/**
 * Verify Firebase ID token and attach user info to request
 */
export const verifyIdToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No valid authorization header found',
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    // Verify the token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Get user claims (role and permissions)
    const userRecord = await getAuth().getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims as any;

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || userRecord.email || '',
      role: customClaims?.role || UserRole.USER,
      permissions: customClaims?.permissions || [],
    };

    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Require specific permission(s)
 */
export const requirePermission = (requiredPermissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const hasPermission = await RBACService.hasAnyPermission(
        req.user.uid,
        requiredPermissions
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
          requiredPermissions,
          userPermissions: req.user.permissions,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check permissions',
      });
    }
  };
};

/**
 * Require specific role(s)
 */
export const requireRole = (requiredRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const hasRole = await RBACService.hasAnyRole(req.user.uid, requiredRoles);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient role privileges',
          requiredRoles,
          userRole: req.user.role,
        });
      }

      next();
    } catch (error) {
      logger.error('Role check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check role',
      });
    }
  };
};

/**
 * Require admin role (for backward compatibility)
 */
export const requireAdmin = requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Optional authentication - attach user if token is provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user info
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return next(); // Continue without user info
    }

    // Verify the token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Get user claims (role and permissions)
    const userRecord = await getAuth().getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims as any;

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || userRecord.email || '',
      role: customClaims?.role || UserRole.USER,
      permissions: customClaims?.permissions || [],
    };

    next();
  } catch (error) {
    // Log error but continue without user info
    logger.warn('Optional auth failed:', error);
    next();
  }
}; 