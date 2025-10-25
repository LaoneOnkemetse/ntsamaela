import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// String constants for status values
const USER_TYPES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN'
} as const;

const DOCUMENT_TYPES = {
  DRIVERS_LICENSE: 'DRIVERS_LICENSE',
  NATIONAL_ID: 'NATIONAL_ID',
  PASSPORT: 'PASSPORT'
} as const;

const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FLAGGED: 'FLAGGED'
} as const;

const PACKAGE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  COLLECTED: 'COLLECTED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as const;

const TRIP_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

const BID_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
} as const;

const TRANSACTION_TYPE = {
  RECHARGE: 'RECHARGE',
  COMMISSION_HOLD: 'COMMISSION_HOLD',
  COMMISSION_DEDUCTION: 'COMMISSION_DEDUCTION',
  REFUND: 'REFUND',
  WITHDRAWAL: 'WITHDRAWAL'
} as const;

const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ntsamaela.com' },
    update: {},
    create: {
      email: 'admin@ntsamaela.com',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5Kz8KzK',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      userType: USER_TYPES.ADMIN,
      identityVerified: true,
      emailVerified: true
    }
  });

  // Create sample customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5Kz8KzK',
      firstName: 'John',
      lastName: 'Customer',
      phone: '+1234567891',
      userType: USER_TYPES.CUSTOMER,
      identityVerified: true,
      emailVerified: true
    }
  });

  // Create sample driver
  const driver = await prisma.user.upsert({
    where: { email: 'driver@example.com' },
    update: {},
    create: {
      email: 'driver@example.com',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/5Kz8KzK',
      firstName: 'Jane',
      lastName: 'Driver',
      phone: '+1234567892',
      userType: USER_TYPES.DRIVER,
      identityVerified: true,
      emailVerified: true
    }
  });

  // Create driver profile
  const driverProfile = await prisma.driver.upsert({
    where: { userId: driver.id },
    update: {},
    create: {
      userId: driver.id,
      licensePlate: 'ABC123',
      vehicleType: 'VAN',
      vehicleCapacity: '1000kg',
      rating: 4.5,
      totalDeliveries: 0,
      active: true
    }
  });

  // Create wallet for driver
  const driverWallet = await prisma.wallet.upsert({
    where: { userId: driver.id },
    update: {},
    create: {
      userId: driver.id,
      availableBalance: 0,
      reservedBalance: 0
    }
  });

  // Create sample package
  const package1 = await prisma.package.create({
    data: {
      customerId: customer.id,
      description: 'Electronics package',
      pickupAddress: '123 Main St, City, State 12345',
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      deliveryAddress: '456 Oak Ave, City, State 12345',
      deliveryLat: 40.7589,
      deliveryLng: -73.9851,
      priceOffered: 50.00,
      status: PACKAGE_STATUS.PENDING,
      size: '30x20x15',
      weight: 5.5
    }
  });

  console.log('✅ Database seeding completed!');
  console.log(`Created users: ${adminUser.email}, ${customer.email}, ${driver.email}`);
  console.log(`Created package: ${package1.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
