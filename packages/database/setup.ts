import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Setting up Ntsamaela database...');

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set. Please set it in your .env file.');
      console.log('Example: DATABASE_URL="postgresql://username:password@localhost:5432/ntsamaela"');
      return;
    }

    // Test database connection
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if migrations directory exists
    const migrationsDir = join(__dirname, 'prisma', 'migrations');
    if (!existsSync(migrationsDir)) {
      console.log('📁 Creating migrations directory...');
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    } else {
      console.log('📁 Migrations directory exists, running migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    }

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Seed database
    console.log('🌱 Seeding database...');
    execSync('npm run seed', { stdio: 'inherit' });

    console.log('✅ Database setup completed successfully!');
    console.log('\n📊 You can now:');
    console.log('- Start the API server');
    console.log('- Access the web admin dashboard');
    console.log('- Use the mobile app');
    console.log('\n🔑 Test credentials are available in the README.md');

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Database connection failed. Please ensure:');
      console.log('1. PostgreSQL is running');
      console.log('2. DATABASE_URL is correct');
      console.log('3. Database "ntsamaela" exists');
      console.log('\nTo create the database:');
      console.log('createdb ntsamaela');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
