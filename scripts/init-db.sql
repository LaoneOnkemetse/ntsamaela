-- Initialize Ntsamaela Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create the main database (already created by POSTGRES_DB env var)
-- Create additional databases for testing
CREATE DATABASE ntsamaela_test;

-- Create extensions
\c ntsamaela;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c ntsamaela_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Switch back to main database
\c ntsamaela;

-- Create initial admin user (password: admin123)
-- This will be handled by the application, but we can set up the structure here
-- The actual user creation will be done through the API

-- Set up any additional database configurations
ALTER DATABASE ntsamaela SET timezone TO 'UTC';
ALTER DATABASE ntsamaela_test SET timezone TO 'UTC';













