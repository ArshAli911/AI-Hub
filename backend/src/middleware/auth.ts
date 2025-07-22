import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin';
import logger from '../services/loggerService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
        permissions?: string[];
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get additional user info if needed
    const userRecord = await auth.getUser(decodedToken.uid);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userRecord.customClaims?.role || 'user',
      permissions: userRecord.customClaims?.permissions || []
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error as Error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      if (error.message.includes('invalid')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `${requiredRole} role required`
      });
    }

    next();
  };
};

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.permissions?.includes(requiredPermission) && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `Permission '${requiredPermission}' required`
      });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');