// Simplified routes to avoid TypeScript compilation errors
import { Router } from "express";
import { Request, Response } from "express";

const router = Router();

// Simple health check
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

// REMOVED: Mock authentication endpoints - now using real auth routes from ./routes/auth.ts
// Real authentication is handled at:
// - /api/auth/login-phone (phone-based login)
// - /api/auth/login (email-based login)
// - /api/auth/register (user registration)

// Mock package endpoints
router.post("/packages", (req: Request, res: Response) => {
  const packageData = req.body;

  // Mock package creation
  const mockPackage = {
    id: "pkg_" + Date.now(),
    ...packageData,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: mockPackage,
    message: "Package created successfully",
  });
});

// REMOVED: Mock packages endpoint - now using real package routes from ./routes/packageRoutes.ts
// Real packages are handled at: /api/packages (via packageRoutes)
router.get("/packages", (req: Request, res: Response) => {
  // Return empty array instead of mock data - real data should come from database
  res.json({
    success: true,
    data: [],
    message: "Use /api/packages endpoint for real package data",
  });
});

// Mock bid endpoints
router.post("/bids", (req: Request, res: Response) => {
  const { packageId, amount, message } = req.body;

  const mockBid = {
    id: "bid_" + Date.now(),
    packageId,
    amount: parseFloat(amount),
    message: message || "Mock bid",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    data: mockBid,
    message: "Bid created successfully",
  });
});

router.get("/bids/package/:packageId", (req: Request, res: Response) => {
  const { packageId } = req.params;

  const mockBids = [
    {
      id: "bid_1",
      packageId,
      amount: 120,
      message: "I can deliver this quickly",
      status: "PENDING",
      driver: {
        firstName: "John",
        lastName: "Driver",
        rating: 4.5,
      },
    },
  ];

  res.json({
    success: true,
    data: mockBids,
  });
});

router.post("/bids/:id/counter", (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, message } = req.body;

  res.json({
    success: true,
    data: {
      id: "counter_" + Date.now(),
      originalBidId: id,
      amount: parseFloat(amount),
      message: message || "Counter offer",
    },
    message: "Counter bid created successfully",
  });
});

// Mock driver endpoints
router.post("/driver/profile", (req: Request, res: Response) => {
  const { carRegistration, carDescription } = req.body;

  const mockProfile = {
    id: "driver_" + Date.now(),
    carRegistration,
    carDescription,
    rating: 0,
    totalDeliveries: 0,
    active: true,
  };

  res.status(201).json({
    success: true,
    data: mockProfile,
    message: "Driver profile created successfully",
  });
});

router.get("/driver/all", (req: Request, res: Response) => {
  const mockDrivers = [
    {
      id: "driver_1",
      firstName: "John",
      lastName: "Driver",
      rating: 4.5,
      totalDeliveries: 25,
      carRegistration: "B123 ABC",
    },
    {
      id: "driver_2",
      firstName: "Jane",
      lastName: "Driver",
      rating: 4.8,
      totalDeliveries: 42,
      carRegistration: "B456 DEF",
    },
  ];

  res.json({
    success: true,
    data: mockDrivers,
  });
});

// Mock verification endpoints
router.post("/verification/submit", (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    data: {
      id: "verification_" + Date.now(),
      status: "PENDING",
    },
    message: "Verification submitted successfully",
  });
});

router.get("/verification/my-status", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: "verification_123",
      status: "PENDING",
      documentType: "DRIVERS_LICENSE",
    },
  });
});

// REMOVED: Mock notification endpoints - now using real notification routes
// Real notifications are handled at: /api/notifications (via notificationRoutes)
// Admin notifications are handled at: /api/admin/notifications (via adminRoutes)
router.get("/notifications", (req: Request, res: Response) => {
  // Return empty array instead of mock data - real data should come from database
  res.json({
    success: true,
    data: [],
    message: "Use /api/notifications endpoint for real notification data",
  });
});

router.get("/notifications/unread-count", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { unreadCount: 1 },
  });
});

router.put("/notifications/:id/read", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Notification marked as read",
  });
});

// User profile picture endpoints (mock implementation)
router.post("/user/profile/picture", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      profilePictureUrl: `https://mock-s3-bucket.com/profiles/user_123/profile-${Date.now()}.jpg`,
      user: {
        id: "user_123",
        profilePictureUrl: `https://mock-s3-bucket.com/profiles/user_123/profile-${Date.now()}.jpg`,
      },
    },
    message: "Profile picture uploaded successfully",
  });
});

router.delete("/user/profile/picture", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: {
        id: "user_123",
        profilePictureUrl: null,
      },
    },
    message: "Profile picture deleted successfully",
  });
});

router.get("/user/profile", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: "user_123",
      email: "user@example.com",
      firstName: "Mock",
      lastName: "User",
      phone: "1234567890",
      userType: "CUSTOMER",
      profilePictureUrl: null,
      identityVerified: false,
      emailVerified: false,
    },
  });
});

export default router;
