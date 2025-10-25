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
    
    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error('ADMIN_JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET) as any;
    
    // Verify admin user exists and is active
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

    next();
  } catch (_error) {
    console.error('Admin auth error:', _error);
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
