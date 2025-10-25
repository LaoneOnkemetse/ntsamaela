import { PrismaClient } from '@prisma/client';

describe('Database Package', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/ntsamaela_test',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('should have required models', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.package).toBeDefined();
    expect(prisma.trip).toBeDefined();
    expect(prisma.bid).toBeDefined();
    expect(prisma.wallet).toBeDefined();
  });
});
