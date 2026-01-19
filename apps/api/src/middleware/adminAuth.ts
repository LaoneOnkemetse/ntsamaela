import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '@database/index';

// Initialize prisma lazily to avoid circular dependency issues
let prisma: any = null;
function getPrisma() {
  if (!prisma) {
    prisma = getPrismaClient();
  }
  return prisma;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: { message: 'No admin token provided' }
      });
    }

    const token = authHeader.substring(7);
    let decoded: any = null;
    let isAdminToken = false;
    
    // Try to verify with ADMIN_JWT_SECRET first (for admin-specific tokens)
    if (process.env.ADMIN_JWT_SECRET) {
      try {
        decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET) as any;
        isAdminToken = true;
      } catch (error) {
        // If ADMIN_JWT_SECRET verification fails, try regular JWT_SECRET
      }
    }
    
    // If admin token verification failed, try regular user token
    if (!decoded && process.env.JWT_SECRET) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        isAdminToken = false;
      } catch (error) {
        // Both verifications failed
        throw new Error('Invalid token signature');
      }
    }
    
    if (!decoded) {
      throw new Error('No JWT secret configured');
    }

    // If it's an admin token, verify admin user exists
    if (isAdminToken && decoded.adminId) {
      const adminUser = await getPrisma().adminUser.findUnique({
        where: { id: decoded.adminId },
        select: {
          id: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true
        }
      });

      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive admin user' });
      }

      req.admin = {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions
      };
    } else {
      // It's a regular user token - check if user has admin privileges
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Invalid token payload' });
      }

      const user = await getPrisma().user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          userType: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive user' });
      }

      // Check if user has admin role or is admin user type
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.userType === 'ADMIN';
      
      if (!isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required' });
      }

      req.admin = {
        id: user.id,
        email: user.email,
        role: user.role || 'ADMIN',
        permissions: ['*'] // Grant all permissions for admin users
      };
    }

    next();
  } catch (_error) {
    // Don't log JWT errors as they're expected for invalid tokens
    if ((_error as any).name !== 'JsonWebTokenError' && (_error as any).name !== 'TokenExpiredError') {
      console.error('Admin auth error:', _error);
    }
    return res.status(401).json({ 
      success: false,
      error: { message: 'Invalid admin token' }
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    if (!req.admin.permissions.includes(permission) && !req.admin.permissions.includes('*')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    if (req.admin.role !== role && req.admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Insufficient role privileges' });
    }

    next();
  };
};
