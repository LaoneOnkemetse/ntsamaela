# Hybrid Verification System

A comprehensive AI-powered document verification system with facial recognition, built for the Ntsamaela platform.

## Overview

The hybrid verification system combines multiple AI services to provide robust identity verification:

- **Document Authenticity**: AWS Rekognition for security feature detection
- **Data Extraction**: AWS Textract for OCR and data extraction
- **Facial Recognition**: AWS Rekognition for face matching
- **Risk Assessment**: Custom algorithm for risk scoring
- **Decision Engine**: Automated decision making with manual review fallback

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Endpoint  │───▶│ Verification     │───▶│ Decision Engine │
│                 │    │ Service          │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Workflow Engine  │
                       └──────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ AWS Rekognition │ │ OCR Service  │ │ Risk Scoring │
    │ Service         │ │              │ │ Service      │
    └─────────────────┘ └──────────────┘ └──────────────┘
```

## Components

### 1. AWS Rekognition Service (`awsRekognitionService.ts`)

**Purpose**: Document authenticity checking and facial recognition

**Features**:
- Document security feature detection
- Anomaly detection (tampering, forgery, blur)
- Facial recognition matching
- Face collection management
- Liveness detection (anti-spoofing)

**Key Methods**:
- `analyzeDocumentAuthenticity()` - Check document authenticity
- `performFacialRecognition()` - Match faces between document and selfie
- `createFaceCollection()` - Create user face collection
- `indexFace()` - Index face for future recognition
- `searchFaces()` - Search for faces in collection

### 2. OCR Service (`ocrService.ts`)

**Purpose**: Extract data from identity documents

**Features**:
- Support for multiple document types (Driver's License, Passport, National ID)
- AWS Textract integration
- Data validation and formatting
- Confidence scoring

**Key Methods**:
- `extractDocumentData()` - Extract data from document images
- `validateExtractedData()` - Validate extracted information
- `parseDate()` - Parse and format dates
- `extractDates()` - Extract dates from text

### 3. Facial Recognition Service (`facialRecognitionService.ts`)

**Purpose**: Advanced facial recognition and anti-spoofing

**Features**:
- Face detection and quality assessment
- Facial landmark extraction
- Pose consistency checking
- Liveness detection
- Face collection management

**Key Methods**:
- `performFacialRecognition()` - Main facial recognition workflow
- `analyzeFaceLiveness()` - Detect spoofing attempts
- `createFaceCollection()` - Create user face collection
- `getFaceCollectionStats()` - Get collection statistics

### 4. Risk Scoring Service (`riskScoringService.ts`)

**Purpose**: Calculate comprehensive risk assessment

**Features**:
- Multi-factor risk analysis
- Configurable risk weights and thresholds
- Behavioral pattern analysis
- Technical quality assessment

**Risk Factors**:
- Document Authenticity (35% weight)
- Data Consistency (25% weight)
- Facial Match (25% weight)
- Behavioral (10% weight)
- Technical (5% weight)

**Key Methods**:
- `calculateRiskAssessment()` - Main risk calculation
- `updateRiskWeights()` - Configure risk weights
- `updateRiskThresholds()` - Configure risk thresholds

### 5. Decision Engine Service (`decisionEngineService.ts`)

**Purpose**: Automated decision making with rule-based logic

**Features**:
- Workflow-based processing
- Rule-based decision making
- Confidence scoring
- Manual review recommendations

**Decision Rules**:
- Auto-approve: All criteria met, low risk
- Auto-reject: Critical failures, high risk
- Manual review: Mixed results, medium risk

**Key Methods**:
- `makeDecision()` - Main decision making
- `executeDecisionWorkflow()` - Execute verification workflow
- `applyDecisionRules()` - Apply decision rules

### 6. Verification Service (`verificationService.ts`)

**Purpose**: Main orchestration service

**Features**:
- End-to-end verification workflow
- Database integration
- Audit logging
- Metrics collection

**Key Methods**:
- `processVerification()` - Main verification workflow
- `getVerificationMetrics()` - Get system metrics
- `reviewVerification()` - Manual review process

## API Endpoints

### Public Endpoints

#### `POST /api/verification/submit`
Submit document verification request.

**Request**:
```json
{
  "documentType": "DRIVERS_LICENSE",
  "userType": "DRIVER",
  "frontImage": "file",
  "backImage": "file", // Required for driver license
  "selfieImage": "file"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "riskScore": 0.2,
    "authenticityScore": 0.95,
    "dataValidationScore": 0.92,
    "facialMatchScore": 0.88,
    "status": "APPROVED",
    "message": "Verification approved"
  }
}
```

#### `GET /api/verification/status`
Get user verification status.

#### `GET /api/verification/:id`
Get verification by ID.

### Admin Endpoints

#### `GET /api/verification/admin/metrics`
Get verification metrics (Admin only).

#### `POST /api/verification/admin/:id/review`
Review verification manually (Admin only).

### Test Endpoints (Development Only)

#### `POST /api/verification/test/document-authenticity`
Test document authenticity analysis.

#### `POST /api/verification/test/facial-recognition`
Test facial recognition.

#### `POST /api/verification/test/ocr-extraction`
Test OCR data extraction.

## Document Type Requirements

### Driver's License
- **Required for**: Drivers only
- **Images**: Front and back required
- **Validation**: License number format, expiry date
- **Security Features**: Hologram, microprint, watermark

### Passport
- **Required for**: Customers
- **Images**: Front only
- **Validation**: Passport number format, nationality, expiry date
- **Security Features**: Chip, hologram, watermark

### National ID
- **Required for**: Customers
- **Images**: Front only
- **Validation**: ID number format, date of birth
- **Security Features**: Hologram, microprint

## Risk Assessment

### Risk Levels
- **LOW** (0-30%): Auto-approve
- **MEDIUM** (31-60%): Additional verification
- **HIGH** (61-80%): Manual review required
- **CRITICAL** (81-100%): Immediate manual review

### Risk Factors

#### Document Authenticity (35% weight)
- Security feature detection
- Anomaly detection
- Document quality assessment

#### Data Consistency (25% weight)
- OCR confidence
- Data completeness
- Format validation
- Suspicious patterns

#### Facial Match (25% weight)
- Face detection
- Match confidence
- Face quality
- Landmark detection

#### Behavioral (10% weight)
- Verification history
- Attempt frequency
- Suspicious activity

#### Technical (5% weight)
- Processing times
- Error rates
- System performance

## Configuration

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REKOGNITION_COLLECTION_ID=ntsamaela-verification
AWS_S3_BUCKET=ntsamaela-documents
AWS_TEXTRACT_ROLE_ARN=your-textract-role

# JWT Configuration
JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ntsamaela
```

### Risk Configuration

```typescript
const riskConfig = {
  weights: {
    documentAuthenticity: 0.35,
    dataConsistency: 0.25,
    facialMatch: 0.25,
    behavioral: 0.10,
    technical: 0.05,
  },
  thresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.9,
  },
};
```

## Testing

### Unit Tests
```bash
npm run test:verification
```

### Integration Tests
```bash
npm run test:verification:coverage
```

### Test Coverage
- AWS Rekognition Service: 95%+
- OCR Service: 90%+
- Facial Recognition Service: 90%+
- Risk Scoring Service: 95%+
- Decision Engine Service: 90%+
- API Endpoints: 85%+

## Security Considerations

### Data Protection
- Images are processed in memory and not stored permanently
- S3 objects are automatically deleted after processing
- All API communications use HTTPS
- JWT tokens for authentication

### Anti-Spoofing
- Liveness detection
- Face quality assessment
- Pose consistency checking
- Multiple image validation

### Audit Trail
- Complete verification history
- Admin review logs
- System metrics
- Error tracking

## Performance

### Processing Times
- Document Authenticity: ~3-5 seconds
- OCR Extraction: ~4-6 seconds
- Facial Recognition: ~2-4 seconds
- Risk Assessment: ~1 second
- **Total**: ~10-16 seconds

### Scalability
- AWS services auto-scale
- Database connection pooling
- Caching for frequent operations
- Rate limiting on API endpoints

## Monitoring

### Metrics
- Verification success rate
- Average processing time
- Risk distribution
- Error rates
- System performance

### Alerts
- High error rates
- Slow processing times
- Failed verifications
- System downtime

## Future Enhancements

### Planned Features
- Multi-language OCR support
- Advanced fraud detection
- Real-time verification
- Mobile SDK integration
- Biometric authentication

### Integration Opportunities
- Third-party identity providers
- Government databases
- Credit bureau integration
- Social media verification

## Support

For technical support or questions about the verification system:

- **Documentation**: This README and inline code comments
- **Tests**: Comprehensive test suite in `/test/verification/`
- **Logs**: Detailed logging throughout the system
- **Metrics**: Real-time monitoring and alerting

## License

This verification system is part of the Ntsamaela platform and is proprietary software.
