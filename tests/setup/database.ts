import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  try {
    // Create a new Prisma client for testing
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db'
        }
      }
    });

    // Connect to the test database
    await prisma.$connect();

    // Clean up existing data
    await cleanupTestData();

    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  try {
    if (prisma) {
      await cleanupTestData();
      await prisma.$disconnect();
    }
    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
}

async function cleanupTestData() {
  // Delete all data in reverse order of dependencies
  await prisma.adminReview.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.package.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
}

export const createTestUser = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'CUSTOMER' | 'DRIVER';
}) => {
  return await prisma.user.create({
    data: {
      ...userData,
      passwordHash: 'hashed_password_for_testing',
    },
  });
};

export const createTestDriver = async (userId: string) => {
  return await prisma.driver.create({
    data: {
      userId,
      licensePlate: 'TEST123',
      vehicleType: 'Sedan',
      vehicleCapacity: 'Medium',
      rating: 4.5,
      totalDeliveries: 0,
      active: true,
    },
  });
};

export const createTestPackage = async (customerId: string) => {
  return await prisma.package.create({
    data: {
      customerId,
      description: 'Test package',
      pickupAddress: '123 Test St',
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      deliveryAddress: '456 Test Ave',
      deliveryLat: 40.7589,
      deliveryLng: -73.9851,
      priceOffered: 25.0,
      status: 'PENDING',
    },
  });
};
