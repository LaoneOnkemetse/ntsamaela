import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '@shared/types';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Access token required' },
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-key-for-wallet-tests';
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = decoded;
    next();
  } catch (_error) {
    console.error('Auth middleware error:', _error);
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid or expired token' },
    });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.userType !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
  next();
};

export const requireDriver = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.userType !== 'DRIVER') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Driver access required' },
    });
  }
  next();
};

export const requireCustomer = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.userType !== 'CUSTOMER') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Customer access required' },
    });
  }
  next();
};
