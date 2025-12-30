// Ensure Prisma is disabled for unit tests in the database package
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DISABLE_PRISMA = 'true';
process.env.DATABASE_URL = process.env.DATABASE_URL || '';


