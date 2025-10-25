# Ntsamaela - Peer-to-Peer Package Delivery Platform

A sophisticated peer-to-peer package delivery platform that connects drivers with spare vehicle capacity to customers needing inter-city parcel delivery, featuring hybrid AI-powered verification and real-time tracking.

## 🚀 Features

- **Hybrid Verification System**: AI-powered document validation with facial recognition
- **Commission-Based Revenue Model**: 30% commission from driver wallets
- **Real-time Tracking**: Live package location and status updates
- **Bidding System**: Competitive pricing between drivers and customers
- **Mobile Applications**: React Native apps for iOS and Android
- **Admin Dashboard**: Comprehensive management interface

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React Native with Expo (iOS/Android)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Storage**: AWS S3 for documents/images
- **AI Services**: AWS Rekognition, Google Cloud Vision OCR
- **Maps**: Google Maps Platform
- **Payments**: Stripe/Paystack integration
- **Notifications**: Firebase Cloud Messaging

### Testing Framework
- **Unit Tests**: Jest (70% of test pyramid)
- **Integration Tests**: Supertest (20% of test pyramid)
- **E2E Tests**: Detox/Cypress (10% of test pyramid)
- **Coverage Requirements**: 80%+ overall, 90%+ business logic, 100% critical paths

## 📁 Project Structure

```
ntsamaela/
├── apps/
│   ├── mobile/                 # React Native app
│   ├── web-admin/             # Admin dashboard
│   └── api/                   # Backend API
├── packages/
│   ├── shared/                # Shared types and utilities
│   ├── database/              # Prisma schema and migrations
│   └── testing/               # Test utilities and fixtures
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # API integration tests
│   └── e2e/                   # End-to-end tests
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
└── .github/
    └── workflows/             # CI/CD pipelines
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- PostgreSQL 13+
- AWS Account (for S3, Rekognition)
- Google Cloud Account (for Vision API)
- Firebase Account (for notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ntsamaela.git
   cd ntsamaela
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
npm run check-coverage
```

### Test Coverage Requirements
- **Overall Coverage**: 80%+
- **Business Logic**: 90%+
- **Critical Paths**: 100%
- **API Routes**: 85%+

## 📱 Mobile Development

### Setup React Native Environment
```bash
# Install Expo CLI
npm install -g @expo/cli

# Start mobile development
cd apps/mobile
npm install
npm start
```

### Running on Devices
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical device (scan QR code)
npm start
```

## 🔧 Development

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## 🚀 Deployment

### Production Build
```bash
# Build all applications
npm run build

# Build API only
npm run build:api

# Build mobile app only
npm run build:mobile
```

### Environment Setup
1. Configure production environment variables
2. Setup AWS services (S3, Rekognition)
3. Configure Google Cloud Vision API
4. Setup Firebase for notifications
5. Configure payment processors (Stripe/Paystack)

## 📊 Monitoring & Analytics

### Quality Metrics
- Test coverage reports
- Performance benchmarks
- Security audit results
- User satisfaction metrics

### Business Metrics
- User verification rates
- Commission collection
- Platform growth
- Delivery success rates

## 🔒 Security

### Data Protection
- All PII encrypted at rest and in transit
- Secure document storage with access controls
- Regular security audits and penetration testing
- GDPR and CCPA compliance measures

### Verification Security
- Liveness detection for selfie photos
- Document tampering detection
- Biometric data protection
- Audit trails for all verification actions

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Mobile App Guide](./docs/mobile.md)
- [Deployment Guide](./docs/deployment.md)
- [Testing Guide](./docs/testing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
1. Write failing tests (TDD)
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Ensure all quality gates pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🗺️ Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [x] Project setup and configuration
- [x] Database schema implementation
- [x] Authentication system
- [x] Testing framework setup

### Phase 2: Verification System (Weeks 5-8)
- [ ] AI document validation
- [ ] Facial recognition service
- [ ] Risk scoring engine
- [ ] Admin review interface

### Phase 3: Marketplace Features (Weeks 9-12)
- [ ] Package management
- [ ] Trip planning
- [ ] Bidding system
- [ ] Wallet and commission system

### Phase 4: Advanced Features (Weeks 13-16)
- [ ] Real-time tracking
- [ ] Push notifications
- [ ] Rating system
- [ ] Analytics dashboard

### Phase 5: Testing & Deployment (Weeks 17-20)
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Security auditing
- [ ] Production deployment

---

**Built with ❤️ by the Ntsamaela Team**













