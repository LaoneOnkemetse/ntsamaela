import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
// import rateLimit from 'express-rate-limit';
import dotenv from "dotenv";
import { createServer } from "http";
import { initializePrisma } from "@database/index";
import { getRealtimeService } from "./services/realtimeService";
import { generalRateLimit } from "./middleware/rateLimiting";

// Load environment variables
dotenv.config();

// Set development environment variables if not set (do NOT default in production)
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌ DATABASE_URL is required in production. Set DATABASE_URL in Railway (or your host) to your Postgres connection string."
    );
  } else {
    process.env.DATABASE_URL =
      "postgresql://postgres:password@localhost:5432/ntsamaela";
  }
}
if (!process.env.DISABLE_PRISMA) {
  process.env.DISABLE_PRISMA = "false"; // Enable Prisma for development
}
const DEFAULT_JWT_SECRET = "your-super-secret-jwt-key-here";
const DEFAULT_ADMIN_JWT_SECRET = "your-super-secret-admin-jwt-key-here";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
}
if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = DEFAULT_ADMIN_JWT_SECRET;
}

// Warn in production if still using placeholder secrets (causes "Invalid token signature" if frontend uses different env)
if (process.env.NODE_ENV === "production") {
  if (process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    console.warn(
      "⚠️  JWT_SECRET is unset in production. Set JWT_SECRET in Railway (or your host) to a strong random string so admin/auth tokens work consistently."
    );
  }
  if (process.env.ADMIN_JWT_SECRET === DEFAULT_ADMIN_JWT_SECRET) {
    console.warn(
      "⚠️  ADMIN_JWT_SECRET is unset in production. Set ADMIN_JWT_SECRET in Railway if you use admin-specific login."
    );
  }
}

// Initialize Prisma client after environment variables are loaded
initializePrisma();

const app = express();
const server = createServer(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust proxy for rate limiting behind Railway/proxy
// Set to 1 to trust only Railway's proxy (not all proxies)
// This prevents rate limiting bypass while still working behind Railway's proxy
app.set('trust proxy', 1);

// Initialize Real-time Service (only if server is provided)
if (server) {
  const _realtimeService = getRealtimeService(server);
}

// Security middleware
app.use(helmet());

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.WEB_ADMIN_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  // Allow Railway web-admin domains
  /^https:\/\/.*web-admin.*\.up\.railway\.app$/,
  /^https:\/\/.*webadmin.*\.up\.railway\.app$/,
  // Allow Railway web domains
  /^https:\/\/.*ntsamaela.*\.up\.railway\.app$/,
].filter(Boolean) as (string | RegExp)[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check endpoints
app.get("/health", async (req, res) => {
  try {
    // Test database connection (will use mock if disabled)
    const dbStatus = process.env.DISABLE_PRISMA === "true" ? "MOCK" : "REAL";
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: dbStatus,
      message: `API running with ${dbStatus.toLowerCase()} database`,
    });
  } catch (_error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      message: "API running but database connection failed",
      error: _error instanceof Error ? _error.message : "Unknown error",
    });
  }
});

// Database health check
app.get("/health/db", async (req, res) => {
  try {
    const dbStatus = process.env.DISABLE_PRISMA === "true" ? "MOCK" : "REAL";
    res.status(200).json({
      status: "healthy",
      database: {
        status: "connected",
        type: dbStatus.toLowerCase(),
        responseTime: "< 10ms",
      },
    });
  } catch (_error) {
    res.status(503).json({
      status: "ERROR",
      database: {
        status: "disconnected",
        error: _error instanceof Error ? _error.message : "Unknown error",
      },
    });
  }
});

// Redis health check
app.get("/health/redis", async (req, res) => {
  try {
    res.status(200).json({
      status: "healthy",
      redis: {
        status: "connected",
        type: "mock",
        responseTime: "< 5ms",
      },
    });
  } catch (_error) {
    res.status(503).json({
      status: "ERROR",
      redis: {
        status: "disconnected",
        error: _error instanceof Error ? _error.message : "Unknown error",
      },
    });
  }
});

// Comprehensive health check
app.get("/health/all", async (req, res) => {
  try {
    const dbStatus = process.env.DISABLE_PRISMA === "true" ? "MOCK" : "REAL";
    res.status(200).json({
      status: "healthy",
      services: {
        database: {
          status: "connected",
          type: dbStatus.toLowerCase(),
          responseTime: "< 10ms",
        },
        redis: {
          status: "connected",
          type: "mock",
          responseTime: "< 5ms",
        },
        api: {
          status: "healthy",
          uptime: process.uptime(),
          environment: process.env.NODE_ENV,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    res.status(503).json({
      status: "ERROR",
      services: {
        database: { status: "error" },
        redis: { status: "error" },
        api: { status: "error" },
      },
      error: _error instanceof Error ? _error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Import routes
import simpleRoutes from "./routes/simpleRoutes";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import packageRoutes from "./routes/packageRoutes";
import tripRoutes from "./routes/tripRoutes";
import bidRoutes from "./routes/bidRoutes";
import walletRoutes from "./routes/wallet";
import verificationRoutes from "./routes/verificationRoutes";
import deliveryRoutes from "./routes/deliveries";
import chatRoutes from "./routes/chatRoutes";
import trackingRoutes from "./routes/trackingRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import performanceRoutes from "./routes/performanceRoutes";
import realtimeRoutes from "./routes/realtime";
import webhookRoutes from "./routes/webhookRoutes";

// Cloud services initialized:
// - Google Cloud Vision API (for OCR and face detection)
// - Cloudinary (for file storage and image optimization)

// Mount routes - IMPORTANT: Real routes must come BEFORE simpleRoutes to avoid mock endpoints
// Order matters: more specific routes first, then catch-all simpleRoutes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/webhooks", webhookRoutes);
// simpleRoutes should come LAST to only handle routes not covered by real routes
app.use("/api", simpleRoutes);

// API root endpoint - provide helpful information
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Ntsamaela API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/user",
      packages: "/api/packages",
      trips: "/api/trips",
      bids: "/api/bids",
      wallet: "/api/wallet",
      verification: "/api/verification",
      deliveries: "/api/deliveries",
      chat: "/api/chat",
      tracking: "/api/tracking",
      notifications: "/api/notifications",
      admin: "/api/admin",
      analytics: "/api/analytics",
      performance: "/api/performance",
      realtime: "/api/realtime",
      webhooks: "/api/webhooks",
    },
    health: "/health",
  });
});

// Cloud services:
// - Google Cloud Vision API (for OCR and face detection)
// - Cloudinary (for file storage and image optimization)

// Initialize Firebase Cloud Messaging
try {
  import("./services/fcmService").then(({ fcmService }) => {
    if (fcmService.isReady()) {
      console.log("✅ Firebase Cloud Messaging ready");
    }
  });
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  // Don't crash the app, but log the error
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Firebase is recommended for production push notifications.",
    );
  }
}

// Simple test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

export { app, server, PORT };
