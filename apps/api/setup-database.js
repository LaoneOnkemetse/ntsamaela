const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // First, connect to the default postgres database to create our database
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'plutoniumdb', // Use the password from the .env file
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL admin database');

    // Check if our database exists
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'ntsamaela'"
    );

    if (result.rows.length === 0) {
      console.log('📦 Creating ntsamaela database...');
      await adminClient.query('CREATE DATABASE ntsamaela');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }

    await adminClient.end();

    // Now connect to our specific database
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'plutoniumdb',
      database: 'ntsamaela'
    });

    await client.connect();
    console.log('✅ Connected to ntsamaela database');

    // Test a simple query
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Database is working:', testResult.rows[0].now);

    await client.end();
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
