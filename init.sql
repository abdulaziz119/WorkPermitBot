-- Database initialization script
-- This script will be executed when PostgreSQL container starts for the first time

-- Create database if not exists
-- Note: The database is already created by POSTGRES_DB env variable

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- You can add any additional initialization SQL here
-- For example, creating additional users, schemas, etc.

-- Create schema if different from public
-- CREATE SCHEMA IF NOT EXISTS workpermit;

-- Grant permissions
-- GRANT ALL PRIVILEGES ON SCHEMA workpermit TO postgres;
