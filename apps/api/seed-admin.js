/**
 * Script to ensure admin user exists in database.
 * Run: node apps/api/seed-admin.js
 *
 * Required env:
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *
 * Optional:
 *   ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_PHONE
 *   ADMIN_SYNC_PASSWORD=true  — reset password on existing admin
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME?.trim() || "Admin";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME?.trim() || "Administrator";
const ADMIN_PHONE = process.env.ADMIN_PHONE?.trim() || "+26770000000";
const syncPassword = process.env.ADMIN_SYNC_PASSWORD === "true";

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required",
    );
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  console.log("🔐 Ensuring admin user exists...");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: ADMIN_PHONE,
      userType: "ADMIN",
      identityVerified: true,
      emailVerified: true,
      ...(syncPassword ? { passwordHash } : {}),
    },
    create: {
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

  console.log("✅ Admin user ensured:");
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`   Type: ${adminUser.userType}`);
  if (syncPassword) {
    console.log("   Password was synced (ADMIN_SYNC_PASSWORD=true)");
  }

  return adminUser;
}

async function main() {
  try {
    await ensureAdminUser();
    console.log("\n✅ Admin user setup completed successfully!");
  } catch (error) {
    console.error("❌ Failed to ensure admin user:", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
