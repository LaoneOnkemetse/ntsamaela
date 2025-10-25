// Test database connection
process.env.DATABASE_URL = "postgresql://postgres:plutoniumdb@localhost:5432/ntsamaela";
process.env.NODE_ENV = "development";

const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected successfully! Found ${userCount} users.`);
    
    // Test login
    const user = await prisma.user.findUnique({
      where: { email: 'customer@example.com' }
    });
    
    if (user) {
      console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
