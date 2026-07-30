-- =========================================================
-- CleanMax Dashboard - Database Schema (SQL Script)
-- Suitable for PostgreSQL, MySQL, SQLite, or SQL Server
-- =========================================================

-- 1. VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(100) PRIMARY KEY,
    vendorCode VARCHAR(50) NOT NULL,
    vendorName VARCHAR(255) NOT NULL,
    vendorType VARCHAR(50) DEFAULT 'O&M Vendor',
    plantName VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    state VARCHAR(100),
    city VARCHAR(100),
    plantCapacity DECIMAL(10, 2) DEFAULT 0.00,
    capacityUnit VARCHAR(20) DEFAULT 'kWp',
    rate DECIMAL(10, 2) DEFAULT 0.00,
    poNumber VARCHAR(100),
    prNumber VARCHAR(100),
    contractStart TIMESTAMP NOT NULL,
    contractEnd TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Active', 'Expiring Soon', 'Expired'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    projectCode VARCHAR(50) NOT NULL,
    projectName VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'O&M Project',
    capacity DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'kWp',
    status VARCHAR(50) DEFAULT 'In Progress', -- 'In Progress', 'Planning', 'Completed'
    completionDate TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS TABLE (EMPLOYEES & AUTHENTICATION)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL, -- 'admin', 'procurement', 'operations', 'viewer'
    department VARCHAR(100),
    jobTitle VARCHAR(100),
    twoFactorEnabled BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ARCHIVED CONTRACTS TABLE (RENEWAL AUDIT HISTORY)
CREATE TABLE IF NOT EXISTS archived_contracts (
    id VARCHAR(100) PRIMARY KEY,
    vendorId VARCHAR(100),
    vendorCode VARCHAR(50) NOT NULL,
    vendorName VARCHAR(255) NOT NULL,
    plantName VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    state VARCHAR(100),
    city VARCHAR(100),
    oldPoNumber VARCHAR(100),
    newPoNumber VARCHAR(100),
    oldRate DECIMAL(10, 2) DEFAULT 0.00,
    newRate DECIMAL(10, 2) DEFAULT 0.00,
    oldContractStart TIMESTAMP,
    oldContractEnd TIMESTAMP,
    newContractStart TIMESTAMP,
    newContractEnd TIMESTAMP,
    plantCapacity DECIMAL(10, 2) DEFAULT 0.00,
    capacityUnit VARCHAR(20) DEFAULT 'kWp',
    renewalStatus VARCHAR(50) DEFAULT 'Renewed',
    renewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    renewedBy VARCHAR(255),
    renewedByRole VARCHAR(50)
);

-- 5. DELETED RECORDS TABLE (RECYCLE BIN & AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS deleted_records (
    id VARCHAR(100) PRIMARY KEY,
    recordType VARCHAR(50) NOT NULL, -- 'vendor' or 'project'
    deletedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedBy VARCHAR(255),
    deletedByRole VARCHAR(50),
    dataJson TEXT NOT NULL
);

-- INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendorCode);
CREATE INDEX IF NOT EXISTS idx_vendors_region ON vendors(region);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(projectCode);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
