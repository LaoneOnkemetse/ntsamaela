import { initializePrisma, getPrismaClient } from '../index';

describe('Database Package', () => {
  let prisma: any;

  beforeAll(() => {
    process.env.DISABLE_PRISMA = 'true';
    initializePrisma();
    prisma = getPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should provide a mock client in tests', async () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$disconnect).toBe('function');
  });

  it('should have required models', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.package).toBeDefined();
    expect(prisma.trip).toBeDefined();
    expect(prisma.bid).toBeDefined();
    expect(prisma.wallet).toBeDefined();
  });
});
