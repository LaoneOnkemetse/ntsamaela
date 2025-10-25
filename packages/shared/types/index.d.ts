import { Request } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    userType: 'CUSTOMER' | 'DRIVER';
    identityVerified: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface AuthUser extends User {
    token?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    userType: 'CUSTOMER' | 'DRIVER';
}
export interface Package {
    id: string;
    customerId: string;
    description: string;
    imageUrl?: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    priceOffered: number;
    status: 'PENDING' | 'ACCEPTED' | 'COLLECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
    size?: string;
    weight?: number;
    createdAt: string;
    updatedAt: string;
}
export interface Trip {
    id: string;
    driverId: string;
    startAddress: string;
    startLat: number;
    startLng: number;
    endAddress: string;
    endLat: number;
    endLng: number;
    departureTime: string;
    arrivalTime?: string;
    availableCapacity: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
}
export interface Bid {
    id: string;
    packageId: string;
    driverId: string;
    tripId?: string;
    amount: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    message?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Wallet {
    id: string;
    userId: string;
    balance: number;
    reservedBalance: number;
}
export interface Transaction {
    id: string;
    driverId: string;
    packageId?: string;
    type: 'RECHARGE' | 'COMMISSION_HOLD' | 'COMMISSION_DEDUCTION' | 'REFUND';
    amount: number;
    balanceAfter: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
}
export interface Verification {
    id: string;
    userId: string;
    documentType: 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'PASSPORT';
    frontImageUrl: string;
    backImageUrl?: string;
    selfieImageUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
    riskScore?: number;
    authenticityScore?: number;
    dataValidationScore?: number;
    facialMatchScore?: number;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Driver {
    id: string;
    userId: string;
    licensePlate?: string;
    vehicleType?: string;
    vehicleCapacity?: string;
    rating: number;
    totalDeliveries: number;
    active: boolean;
}
export interface Theme {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        error: string;
        success: string;
        warning: string;
        info: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    borderRadius: {
        sm: number;
        md: number;
        lg: number;
    };
}
export interface CreateTripRequest {
    startAddress: string;
    startLat: number;
    startLng: number;
    endAddress: string;
    endLat: number;
    endLng: number;
    departureTime: Date;
    availableCapacity: string;
}
export interface CreateBidRequest {
    packageId: string;
    tripId?: string;
    amount: number;
    message?: string;
}
export interface SubmitVerificationRequest {
    documentType: 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'PASSPORT';
    frontImage: File;
    backImage?: File;
    selfieImage: File;
}
export interface VerificationRequest extends SubmitVerificationRequest {
    userId: string;
}
export interface PasswordResetRequest {
    email: string;
}
export interface PasswordResetConfirmRequest {
    token: string;
    newPassword: string;
}
export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    lat: number;
    lng: number;
}
export interface PackageDimensions {
    length: number;
    width: number;
    height: number;
}
export interface CreatePackageRequest {
    pickupAddress: Address;
    pickupLat: number;
    pickupLng: number;
    deliveryAddress: Address;
    deliveryLat: number;
    deliveryLng: number;
    dimensions: PackageDimensions | string;
    weight: number;
    description: string;
    priceOffered?: number;
    estimatedValue?: number;
    specialInstructions?: string;
}
export interface WalletRechargeRequest {
    amount: number;
    paymentMethodId: string;
}
export interface Location {
    lat: number;
    lng: number;
    address: string;
}
export interface Route {
    start: Location;
    end: Location;
    distance: number;
    duration: number;
    waypoints?: Location[];
}
export interface Notification {
    id: string;
    userId: string;
    title: string;
    body: string;
    type: 'PACKAGE_UPDATE' | 'BID_RECEIVED' | 'VERIFICATION_STATUS' | 'PAYMENT_RECEIVED';
    data?: Record<string, any>;
    read: boolean;
    createdAt: Date;
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: ValidationError[];
}
export interface PackageFilters {
    status?: string[];
    minPrice?: number;
    maxPrice?: number;
    pickupLocation?: Location;
    deliveryLocation?: Location;
    radius?: number;
}
export interface TripFilters {
    status?: string[];
    startLocation?: Location;
    endLocation?: Location;
    departureDate?: Date;
    radius?: number;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export type DocumentType = 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'PASSPORT';
export type UserType = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export interface DocumentData {
    documentType: DocumentType;
    frontImage: File;
    backImage?: File;
    selfieImage: File;
}
export interface VerificationResult {
    success: boolean;
    riskScore: number;
    authenticityScore: number;
    dataValidationScore: number;
    facialMatchScore: number;
    status: 'APPROVED' | 'REJECTED' | 'FLAGGED';
    message?: string;
}
export interface RiskScore {
    overall: number;
    authenticity: number;
    dataValidation: number;
    facialMatch: number;
    flags: string[];
}
export interface JWTPayload {
    id: string;
    email: string;
    userType: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}
export interface AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
}
export interface DocumentVerificationRequest {
    userId: string;
    documentType: DocumentType;
    frontImageBase64: string;
    backImageBase64?: string;
    selfieImageBase64: string;
    userType: UserType;
}
export interface DocumentAuthenticityResult {
    isAuthentic: boolean;
    confidence: number;
    securityFeatures: SecurityFeature[];
    anomalies: Anomaly[];
    documentType: DocumentType;
    issuer: string;
    expiryDate?: string;
    issueDate?: string;
}
export interface SecurityFeature {
    name: string;
    detected: boolean;
    confidence: number;
    description: string;
}
export interface Anomaly {
    type: 'TAMPERING' | 'FORGERY' | 'BLUR' | 'LOW_QUALITY' | 'WRONG_DOCUMENT_TYPE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    confidence: number;
    location?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface OCRResult {
    extractedData: ExtractedDocumentData;
    confidence: number;
    processingTime: number;
    errors: string[];
}
export interface ExtractedDocumentData {
    documentNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    expiryDate?: string;
    issueDate?: string;
    address?: string;
    nationality?: string;
    gender?: string;
    issuer?: string;
    documentType: DocumentType;
}
export interface FacialRecognitionResult {
    match: boolean;
    confidence: number;
    faceDetected: boolean;
    faceQuality: number;
    landmarks: FaceLandmark[];
    processingTime: number;
}
export interface FaceLandmark {
    type: 'EYE' | 'NOSE' | 'MOUTH' | 'EAR' | 'CHIN';
    x: number;
    y: number;
    confidence: number;
}
export interface RiskAssessment {
    overallRisk: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: RiskFactor[];
    recommendations: string[];
    requiresManualReview: boolean;
}
export interface RiskFactor {
    category: 'DOCUMENT_AUTHENTICITY' | 'DATA_CONSISTENCY' | 'FACIAL_MATCH' | 'BEHAVIORAL' | 'TECHNICAL';
    score: number;
    weight: number;
    description: string;
    evidence: string[];
}
export interface VerificationDecision {
    decision: 'APPROVE' | 'REJECT' | 'FLAG_FOR_REVIEW';
    confidence: number;
    reasoning: string[];
    automated: boolean;
    requiresManualReview: boolean;
    nextSteps: string[];
}
export interface VerificationWorkflow {
    steps: VerificationStep[];
    currentStep: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    results: VerificationStepResult[];
}
export interface VerificationStep {
    id: string;
    name: string;
    type: 'DOCUMENT_AUTHENTICITY' | 'OCR_EXTRACTION' | 'FACIAL_RECOGNITION' | 'RISK_ASSESSMENT' | 'DECISION_ENGINE';
    required: boolean;
    timeout: number;
    retryCount: number;
}
export interface VerificationStepResult {
    stepId: string;
    success: boolean;
    result: any;
    error?: string;
    processingTime: number;
    timestamp: Date;
}
export interface VerificationConfig {
    documentTypes: DocumentTypeConfig[];
    riskThresholds: RiskThresholds;
    facialRecognition: FacialRecognitionConfig;
    ocr: OCRConfig;
    aws: AWSConfig;
}
export interface DocumentTypeConfig {
    type: DocumentType;
    requiredForUserTypes: UserType[];
    requiresBackImage: boolean;
    securityFeatures: string[];
    validationRules: ValidationRule[];
}
export interface ValidationRule {
    field: string;
    required: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    customValidator?: string;
}
export interface RiskThresholds {
    low: number;
    medium: number;
    high: number;
    critical: number;
}
export interface FacialRecognitionConfig {
    minConfidence: number;
    maxProcessingTime: number;
    faceQualityThreshold: number;
    landmarkDetectionRequired: boolean;
}
export interface OCRConfig {
    minConfidence: number;
    maxProcessingTime: number;
    supportedLanguages: string[];
    customFields: string[];
}
export interface AWSConfig {
    region: string;
    rekognitionCollectionId: string;
    textractRoleArn: string;
    s3Bucket: string;
}
export interface VerificationMetrics {
    totalVerifications: number;
    approvedCount: number;
    rejectedCount: number;
    flaggedCount: number;
    averageProcessingTime: number;
    successRate: number;
    accuracyRate: number;
    lastUpdated: Date;
}
export interface VerificationAuditLog {
    id: string;
    verificationId: string;
    action: 'SUBMITTED' | 'PROCESSED' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'MANUAL_REVIEW';
    performedBy: string;
    timestamp: Date;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
//# sourceMappingURL=index.d.ts.map