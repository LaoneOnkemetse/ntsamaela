/**
 * Script to seed admin user in production database
 * Run this on Railway: railway run node apps/api/seed-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  // Hash the password
  const passwordHash = await bcrypt.hash('admin123', 12);
  console.log('✅ Password hashed');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ntsamaela.com' },
    update: {
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      userType: 'ADMIN',
      identityVerified: true,
      emailVerified: true,
    },
    create: {
      email: 'admin@ntsamaela.com',
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      userType: 'ADMIN',
      identityVerified: true,
      emailVerified: true,
    },
  });

  console.log('✅ Admin user created/updated:');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`   Type: ${adminUser.userType}`);
  console.log('\n🔑 Login credentials:');
  console.log('   Email: admin@ntsamaela.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
