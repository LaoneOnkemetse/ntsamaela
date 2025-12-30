const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createTables() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'plutoniumdb',
    database: 'ntsamaela'
  });

  try {
    await client.connect();
    console.log('✅ Connected to ntsamaela database');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'init-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✅ Executed SQL statement');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('ℹ️  Table already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
          }
        }
      }
    }

    console.log('🎉 Database tables created successfully!');

    // Test the tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTables();
