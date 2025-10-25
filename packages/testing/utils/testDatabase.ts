import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockPackage, createMockTrip } from './mockData';

// Test database utilities
export class TestDatabase {
  private prisma: PrismaClient;
  private testData: any[] = [];

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/ntsamaela_test',
        },
      },
    });
  }

  // Connect to test database
  async connect() {
    await this.prisma.$connect();
  }

  // Disconnect from test database
  async disconnect() {
    await this.prisma.$disconnect();
  }

  // Clean all test data
  async clean() {
    const tables = [
      'AdminReview',
      'Transaction',
      'Bid',
      'Trip',
      'Package',
      'Wallet',
      'Driver',
      'Verification',
      'User',
    ];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }

  // Create test user
  async createTestUser(userData?: Partial<any>) {
    const user = await this.prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: '$2b$10$test.hash.for.testing',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        userType: 'CUSTOMER',
        ...userData,
      },
    });

    this.testData.push({ table: 'User', id: user.id });
    return user;
  }

  // Create test driver
  async createTestDriver(userData?: Partial<any>) {
    const user = await this.createTestUser({
      userType: 'DRIVER',
      ...userData,
    });

    const driver = await this.prisma.driver.create({
      data: {
        userId: user.id,
        licensePlate: 'TEST123',
        vehicleType: 'Sedan',
        vehicleCapacity: 'Medium',
        rating: 4.5,
        totalDeliveries: 10,
        active: true,
      },
    });

    this.testData.push({ table: 'Driver', id: driver.id });
    return { user, driver };
  }

  // Create test package
  async createTestPackage(customerId: string, packageData?: Partial<any>) {
    const package_ = await this.prisma.package.create({
      data: {
        customerId,
        description: 'Test package',
        pickupAddress: '123 Test St, Test City',
        pickupLat: 40.7128,
        pickupLng: -74.0060,
        deliveryAddress: '456 Test Ave, Test City',
        deliveryLat: 40.7589,
        deliveryLng: -73.9851,
        priceOffered: 50.0,
        status: 'PENDING',
        size: 'Medium',
        weight: 2.5,
        ...packageData,
      },
    });

    this.testData.push({ table: 'Package', id: package_.id });
    return package_;
  }

  // Create test trip
  async createTestTrip(driverId: string, tripData?: Partial<any>) {
    const trip = await this.prisma.trip.create({
      data: {
        driverId,
        startAddress: '100 Start St, City A',
        startLat: 40.7128,
        startLng: -74.0060,
        endAddress: '200 End St, City B',
        endLat: 40.7589,
        endLng: -73.9851,
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        availableCapacity: 'Medium',
        status: 'SCHEDULED',
        ...tripData,
      },
    });

    this.testData.push({ table: 'Trip', id: trip.id });
    return trip;
  }

  // Create test bid
  async createTestBid(packageId: string, driverId: string, bidData?: Partial<any>) {
    const bid = await this.prisma.bid.create({
      data: {
        packageId,
        driverId,
        amount: 45.0,
        status: 'PENDING',
        message: 'Test bid message',
        ...bidData,
      },
    });

    this.testData.push({ table: 'Bid', id: bid.id });
    return bid;
  }

  // Create test wallet
  async createTestWallet(userId: string, walletData?: Partial<any>) {
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        balance: 500.0,
        reservedBalance: 0,
        ...walletData,
      },
    });

    this.testData.push({ table: 'Wallet', id: wallet.id });
    return wallet;
  }

  // Create test verification
  async createTestVerification(userId: string, verificationData?: Partial<any>) {
    const verification = await this.prisma.verification.create({
      data: {
        userId,
        documentType: 'DRIVERS_LICENSE',
        frontImageUrl: 'https://example.com/front.jpg',
        backImageUrl: 'https://example.com/back.jpg',
        selfieImageUrl: 'https://example.com/selfie.jpg',
        status: 'PENDING',
        riskScore: 25.5,
        authenticityScore: 85.2,
        dataValidationScore: 90.1,
        facialMatchScore: 88.7,
        ...verificationData,
      },
    });

    this.testData.push({ table: 'Verification', id: verification.id });
    return verification;
  }

  // Get test data by ID
  async getTestData(table: string, id: string) {
    return this.prisma[table.toLowerCase()].findUnique({
      where: { id },
    });
  }

  // Delete test data by ID
  async deleteTestData(table: string, id: string) {
    await this.prisma[table.toLowerCase()].delete({
      where: { id },
    });
  }

  // Clean up all test data
  async cleanup() {
    for (const data of this.testData.reverse()) {
      try {
        await this.deleteTestData(data.table, data.id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.testData = [];
  }
}

// Database test setup and teardown helpers
export const setupTestDatabase = async () => {
  const testDb = new TestDatabase();
  await testDb.connect();
  await testDb.clean();
  return testDb;
};

export const teardownTestDatabase = async (testDb: TestDatabase) => {
  await testDb.cleanup();
  await testDb.disconnect();
};

// Database transaction helpers for tests
export const withTestDatabase = async (testFn: (db: TestDatabase) => Promise<void>) => {
  const testDb = await setupTestDatabase();
  
  try {
    await testFn(testDb);
  } finally {
    await teardownTestDatabase(testDb);
  }
};

// Mock database for unit tests
export const createMockDatabase = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  driver: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  package: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  trip: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  bid: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  verification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  adminReview: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});

// Database seeding for tests
export const seedTestDatabase = async (testDb: TestDatabase) => {
  // Create test users
  const customer = await testDb.createTestUser({ userType: 'CUSTOMER' });
  const { user: driver, driver: driverProfile } = await testDb.createTestDriver();
  const admin = await testDb.createTestUser({ userType: 'CUSTOMER' }); // Admin is also a customer type

  // Create test packages
  const package1 = await testDb.createTestPackage(customer.id);
  const package2 = await testDb.createTestPackage(customer.id, { status: 'ACCEPTED' });

  // Create test trips
  const trip1 = await testDb.createTestTrip(driverProfile.id);
  const trip2 = await testDb.createTestTrip(driverProfile.id, { status: 'IN_PROGRESS' });

  // Create test bids
  const bid1 = await testDb.createTestBid(package1.id, driverProfile.id);
  const bid2 = await testDb.createTestBid(package1.id, driverProfile.id, { status: 'ACCEPTED' });

  // Create test wallets
  const customerWallet = await testDb.createTestWallet(customer.id);
  const driverWallet = await testDb.createTestWallet(driver.id, { balance: 1000.0 });

  // Create test verification
  const verification = await testDb.createTestVerification(driver.id);

  return {
    customer,
    driver,
    driverProfile,
    admin,
    package1,
    package2,
    trip1,
    trip2,
    bid1,
    bid2,
    customerWallet,
    driverWallet,
    verification,
  };
};
