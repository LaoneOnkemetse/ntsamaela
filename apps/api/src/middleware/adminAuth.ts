import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "@database/index";

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

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "No admin token provided" },
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
      } catch (_error) {
        // If ADMIN_JWT_SECRET verification fails, try regular JWT_SECRET
      }
    }

    // If admin token verification failed, try regular user token
    if (!decoded && process.env.JWT_SECRET) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        isAdminToken = false;
      } catch (_err) {
        // Both verifications failed - return 401 without throwing (avoids log spam)
        return res.status(401).json({
          success: false,
          error: { message: "Invalid token signature" },
        });
      }
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          message: process.env.JWT_SECRET
            ? "Invalid admin token"
            : "No JWT secret configured on server",
        },
      });
    }

    // Admin tokens and regular user tokens both use the User model
    // Check if it's an admin token with adminId, or regular token with userId
    if (isAdminToken && decoded.adminId) {
      // Admin token - treat adminId as userId and verify user
      const userId = decoded.adminId;
      const user = await getPrisma().user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          userType: true,
        },
      });

      if (!user || user.userType !== "ADMIN") {
        return res.status(401).json({ message: "Invalid admin user" });
      }

      req.admin = {
        id: user.id,
        email: user.email,
        role: "ADMIN",
        permissions: ["*"],
      };
    } else {
      // It's a regular user token - check if user has admin privileges
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await getPrisma().user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          userType: true,
          identityVerified: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid user" });
      }

      // Check if user has admin user type
      const isAdmin = user.userType === "ADMIN";

      if (!isAdmin) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      req.admin = {
        id: user.id,
        email: user.email,
        role: "ADMIN", // Set role to ADMIN for admin users
        permissions: ["*"], // Grant all permissions for admin users
      };
    }

    next();
  } catch (_error) {
    // Don't log JWT errors as they're expected for invalid tokens
    if (
      (_error as any).name !== "JsonWebTokenError" &&
      (_error as any).name !== "TokenExpiredError"
    ) {
      console.error("Admin auth error:", _error);
    }
    return res.status(401).json({
      success: false,
      error: { message: "Invalid admin token" },
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    if (
      !req.admin.permissions.includes(permission) &&
      !req.admin.permissions.includes("*")
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    if (req.admin.role !== role && req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Insufficient role privileges" });
    }

    next();
  };
};
