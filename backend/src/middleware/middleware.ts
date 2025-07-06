import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { authAdmin } from '../config/firebaseAdmin';

// Extend the Request interface to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

// Middleware to verify Firebase ID Token and attach user to request
export const verifyIdToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    req.user = decodedToken; // Attach decoded token to request
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(403).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

// Middleware to check for admin custom claim (example)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};
