# Ntsamaela Database Package

This package contains the complete PostgreSQL database schema for the Ntsamaela platform using Prisma ORM.

## 📊 Database Schema Overview

### Core Models

#### User
- **Purpose**: Central user management for both customers and drivers
- **Key Fields**: email, passwordHash, firstName, lastName, phone, userType, identityVerified
- **Relations**: One-to-one with Driver, Wallet, Verification; One-to-many with Package, AdminReview

#### Verification
- **Purpose**: Hybrid verification system with AI-powered document validation
- **Key Fields**: documentType, frontImageUrl, backImageUrl, selfieImageUrl, riskScore, authenticityScore
- **Status**: PENDING, APPROVED, REJECTED, FLAGGED
- **Relations**: One-to-one with User; One-to-many with AdminReview

#### Driver
- **Purpose**: Enhanced driver profiles with vehicle and delivery information
- **Key Fields**: licensePlate, vehicleType, vehicleCapacity, rating, totalDeliveries, active
- **Relations**: One-to-one with User; One-to-many with Trip, Bid, Transaction

#### Package
- **Purpose**: Delivery requests from customers
- **Key Fields**: description, pickupAddress, deliveryAddress, priceOffered, status, size, weight
- **Status**: PENDING, ACCEPTED, COLLECTED, IN_TRANSIT, DELIVERED, CANCELLED
- **Relations**: Many-to-one with User (customer); One-to-many with Bid, Transaction

#### Trip
- **Purpose**: Driver travel plans and routes
- **Key Fields**: startAddress, endAddress, departureTime, arrivalTime, availableCapacity, status
- **Status**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- **Relations**: Many-to-one with Driver; One-to-many with Bid

#### Bid
- **Purpose**: Competitive bidding system between drivers and customers
- **Key Fields**: amount, status, message
- **Status**: PENDING, ACCEPTED, REJECTED, CANCELLED
- **Relations**: Many-to-one with Package, Driver, Trip

#### Wallet
- **Purpose**: Financial management with commission system
- **Key Fields**: balance, reservedBalance
- **Relations**: One-to-one with User

#### Transaction
- **Purpose**: Financial transaction tracking
- **Key Fields**: type, amount, balanceAfter, status
- **Types**: RECHARGE, COMMISSION_HOLD, COMMISSION_DEDUCTION, REFUND
- **Relations**: Many-to-one with Driver, Package

#### AdminReview
- **Purpose**: Manual verification review system
- **Key Fields**: decision, notes, reviewedAt
- **Relations**: Many-to-one with Verification, User (admin)

## 🚀 Setup Instructions

### Prerequisites
- PostgreSQL database server
- Node.js 18+ and npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ntsamaela"
```

### 3. Generate Prisma Client
```bash
npm run generate
```

### 4. Run Database Migrations
```bash
npm run migrate
```

### 5. Seed Database with Test Data
```bash
npm run seed
```

## 📋 Available Scripts

- `npm run generate` - Generate Prisma client
- `npm run push` - Push schema changes to database (development)
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with test data
- `npm run studio` - Open Prisma Studio for database management
- `npm run reset` - Reset database and run migrations + seed

## 🔑 Test Credentials

After running the seed script, you'll have these test accounts:

### Admin User
- **Email**: admin@ntsamaela.com
- **Password**: admin123

### Customer Users
- **Email**: customer1@example.com
- **Password**: customer123
- **Email**: customer2@example.com
- **Password**: customer123

### Driver Users
- **Email**: driver1@example.com
- **Password**: driver123
- **Email**: driver2@example.com
- **Password**: driver123

## 📊 Seed Data Summary

The seed script creates:
- 5 users (1 admin, 2 customers, 2 drivers)
- 2 driver profiles
- 2 verification records
- 3 wallets
- 2 packages
- 2 trips
- 3 bids
- 2 transactions
- 1 admin review

## 🔧 Database Features

### Hybrid Verification System
- AI-powered document validation
- Facial recognition matching
- Risk scoring algorithm
- Manual review workflow

### Commission System
- 30% commission from driver wallets
- Reserved balance management
- Transaction tracking

### Bidding System
- Competitive pricing
- Driver-customer matching
- Trip integration

### Real-time Tracking
- Package status updates
- Trip progress tracking
- Location coordinates

## 🛠️ Development

### Adding New Models
1. Update `schema.prisma`
2. Create migration: `npm run migrate`
3. Update seed script if needed
4. Generate client: `npm run generate`

### Database Reset
```bash
npm run reset
```

### View Database
```bash
npm run studio
```

## 📝 Notes

- All timestamps use UTC
- Soft deletes are not implemented (use status fields instead)
- Foreign key constraints use CASCADE for most relations
- AdminReview uses RESTRICT to prevent admin deletion
- UUIDs are used for all primary keys (CUID format)

## 🔒 Security Considerations

- Passwords are hashed using bcrypt with 12 rounds
- JWT tokens for authentication
- Rate limiting on API endpoints
- Input validation on all endpoints
- SQL injection protection via Prisma ORM
