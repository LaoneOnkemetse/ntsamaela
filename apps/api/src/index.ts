import { config } from "dotenv";
import { server, PORT } from "./app";
import { getPrismaClient } from "@database/index";
import bcrypt from "bcryptjs";

// Load environment variables (Railway provides these automatically)
// Only load .env file in development
if (process.env.NODE_ENV !== "production") {
  config({ path: "../../.env" });
}

// All middleware and routes are already configured in app.ts
// Prisma is already initialized in app.ts

/**
 * Ensure production DB has all columns the Prisma schema expects.
 * This fixes drift caused by migrations being marked applied without executing.
 */
async function ensureSchemaColumns() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return;

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carDescription" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carPhotoUrl" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "lastLatitude" DOUBLE PRECISION`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "lastLongitude" DOUBLE PRECISION`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3)`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "locationName" TEXT`,
    );
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CommissionReservation" (
        "id" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "tripId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "percentage" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CommissionReservation_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log("✅ Schema columns verified");
  } catch (error) {
    console.error("⚠️  ensureSchemaColumns error (non-fatal):", error);
  }
}

/**
 * Ensure admin user exists when ADMIN_EMAIL + ADMIN_PASSWORD are set via env.
 * Does not use hardcoded credentials. Does not reset password on every boot
 * unless ADMIN_SYNC_PASSWORD=true.
 */
async function ensureAdminUser() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      console.log(
        "⚠️  Prisma client not available, skipping admin user creation",
      );
      return;
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME?.trim() || "Admin";
    const ADMIN_LAST_NAME =
      process.env.ADMIN_LAST_NAME?.trim() || "Administrator";
    const ADMIN_PHONE = process.env.ADMIN_PHONE?.trim() || "+26770000000";
    const syncPassword = process.env.ADMIN_SYNC_PASSWORD === "true";

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      const msg =
        "ADMIN_EMAIL and ADMIN_PASSWORD not set — skipping admin user seed";
      if (process.env.NODE_ENV === "production") {
        console.warn(`⚠️  ${msg}`);
      } else {
        console.log(`ℹ️  ${msg}`);
      }
      return;
    }

    if (ADMIN_PASSWORD.length < 8) {
      console.warn(
        "⚠️  ADMIN_PASSWORD must be at least 8 characters — skipping admin seed",
      );
      return;
    }

    console.log("🔐 Ensuring admin user exists...");

    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (existingUser) {
      const updateData: Record<string, unknown> = {
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        phone: ADMIN_PHONE,
        userType: "ADMIN",
        identityVerified: true,
        emailVerified: true,
      };

      if (syncPassword) {
        updateData.passwordHash = passwordHash;
      }

      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: updateData,
      });

      console.log(
        syncPassword
          ? `✅ Admin user updated (password synced): ${ADMIN_EMAIL}`
          : `✅ Admin user profile synced: ${ADMIN_EMAIL}`,
      );
    } else {
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash,
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
          phone: ADMIN_PHONE,
          userType: "ADMIN",
          identityVerified: true,
          emailVerified: true,
        },
      });
      console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("⚠️  Failed to ensure admin user:", error);
    // Don't exit - server should still start
  }
}

// Add error handlers (before starting server)
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  },
);

// Start server first so the process stays up and health checks pass; then ensure admin in background
try {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🔗 API base: http://0.0.0.0:${PORT}/api`);
    console.log(`🔌 Socket.IO enabled for real-time features`);
    // Ensure DB schema is in sync, then seed admin user
    ensureSchemaColumns()
      .then(() => ensureAdminUser())
      .catch((err) => {
        console.error("⚠️  startup tasks failed (non-fatal):", err);
      });
  });

  server.on("error", (error: Error & { code?: string; syscall?: string }) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof PORT === "string" ? `Pipe ${PORT}` : `Port ${PORT}`;

    switch (error.code) {
      case "EACCES":
        console.error(`❌ ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`❌ ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
