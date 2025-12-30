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

router.get("/packages", (req: Request, res: Response) => {
  // Mock packages list
  const mockPackages = [
    {
      id: "pkg_1",
      description: "Mock package 1",
      pickupAddress: "123 Main St, Gaborone",
      deliveryAddress: "456 Airport Rd, Gaborone",
      priceOffered: 150,
      status: "PENDING",
      urgency: "NORMAL",
    },
    {
      id: "pkg_2",
      description: "Mock package 2",
      pickupAddress: "789 Broad St, Francistown",
      deliveryAddress: "321 Mall St, Francistown",
      priceOffered: 200,
      status: "ACCEPTED",
      urgency: "URGENT",
    },
  ];

  res.json({
    success: true,
    data: mockPackages,
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

// Mock notification endpoints
router.get("/notifications", (req: Request, res: Response) => {
  const mockNotifications = [
    {
      id: "notif_1",
      title: "New Bid Received",
      message: "You have received a new bid for your package",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "notif_2",
      title: "Package Delivered",
      message: "Your package has been successfully delivered",
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  res.json({
    success: true,
    data: mockNotifications,
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
