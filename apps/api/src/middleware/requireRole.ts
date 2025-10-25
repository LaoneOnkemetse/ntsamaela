import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }

      if (req.user.userType !== requiredRole) {
        throw new AppError('FORBIDDEN', `Access denied. ${requiredRole} role required.`, 403);
      }

      next();
    } catch (_error) {
      next(_error);
    }
  };
};
