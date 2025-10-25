import { Request, Response, NextFunction } from 'express';
// import { AppError } from '../utils/AppError';

export const requireUserType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedTypes.includes(user.userType)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required user type: ' + allowedTypes.join(' or ')
        }
      });
    }

    next();
  };
};

export const requireAdmin = requireUserType(['ADMIN']);
export const requireCustomer = requireUserType(['CUSTOMER']);
export const requireDriver = requireUserType(['DRIVER']);
export const requireCustomerOrDriver = requireUserType(['CUSTOMER', 'DRIVER']);
export const requireAnyUser = requireUserType(['CUSTOMER', 'DRIVER', 'ADMIN']);
