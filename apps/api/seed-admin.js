/**
 * Script to ensure permanent admin user exists in database
 * This script ensures the admin user always exists with the correct credentials
 * Run this on Railway: railway run node apps/api/seed-admin.js
 * Or it will run automatically during deployment via railway-start.sh
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Permanent admin credentials
const ADMIN_EMAIL = 'admin@ntsamaela.com';
const ADMIN_PASSWORD = 'admin123'; // Change this in production if needed
const ADMIN_FIRST_NAME = 'Ntsamaela';
const ADMIN_LAST_NAME = 'Administrator';
const ADMIN_PHONE = '+26771234567'; // Botswana phone number format

async function ensureAdminUser() {
  console.log('🔐 Ensuring permanent admin user exists...');

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    console.log('✅ Password hashed');

    // Create or update admin user (always ensure it exists with correct credentials)
    const adminUser = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        // Always update to ensure credentials are correct
        passwordHash: passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        phone: ADMIN_PHONE,
        userType: 'ADMIN',
        identityVerified: true,
        emailVerified: true,
      },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        phone: ADMIN_PHONE,
        userType: 'ADMIN',
        identityVerified: true,
        emailVerified: true,
      },
    });

    console.log('✅ Admin user ensured:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   Type: ${adminUser.userType}`);
    console.log(`   Phone: ${adminUser.phone}`);
    console.log('\n🔑 Permanent Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Change the password in production for security!');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error);
    throw error;
  }
}

async function main() {
  try {
    await ensureAdminUser();
    console.log('\n✅ Admin user setup completed successfully!');
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
