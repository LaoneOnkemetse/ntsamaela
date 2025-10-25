import { generateTestId, generateTestEmail, generateTestPhone } from './testHelpers';

// Mock data generators for testing
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: generateTestId('user'),
  email: generateTestEmail(),
  firstName: 'Test',
  lastName: 'User',
  phone: generateTestPhone(),
  userType: 'CUSTOMER' as const,
  identityVerified: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockDriver = (overrides: Partial<any> = {}) => ({
  id: generateTestId('driver'),
  userId: generateTestId('user'),
  licensePlate: 'ABC123',
  vehicleType: 'Sedan',
  vehicleCapacity: 'Medium',
  rating: 4.5,
  totalDeliveries: 25,
  active: true,
  ...overrides,
});

export const createMockPackage = (overrides: Partial<any> = {}) => ({
  id: generateTestId('package'),
  customerId: generateTestId('user'),
  description: 'Test package for delivery',
  imageUrl: 'https://example.com/package.jpg',
  pickupAddress: '123 Test St, Test City',
  pickupLat: 40.7128,
  pickupLng: -74.0060,
  deliveryAddress: '456 Test Ave, Test City',
  deliveryLat: 40.7589,
  deliveryLng: -73.9851,
  priceOffered: 50.0,
  status: 'PENDING' as const,
  size: 'Medium',
  weight: 2.5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockTrip = (overrides: Partial<any> = {}) => ({
  id: generateTestId('trip'),
  driverId: generateTestId('driver'),
  startAddress: '100 Start St, City A',
  startLat: 40.7128,
  startLng: -74.0060,
  endAddress: '200 End St, City B',
  endLat: 40.7589,
  endLng: -73.9851,
  departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  arrivalTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  availableCapacity: 'Medium',
  status: 'SCHEDULED' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockBid = (overrides: Partial<any> = {}) => ({
  id: generateTestId('bid'),
  packageId: generateTestId('package'),
  driverId: generateTestId('driver'),
  tripId: generateTestId('trip'),
  amount: 45.0,
  status: 'PENDING' as const,
  message: 'I can deliver this package safely and on time.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockWallet = (overrides: Partial<any> = {}) => ({
  id: generateTestId('wallet'),
  userId: generateTestId('user'),
  balance: 500.0,
  reservedBalance: 0,
  ...overrides,
});

export const createMockTransaction = (overrides: Partial<any> = {}) => ({
  id: generateTestId('transaction'),
  driverId: generateTestId('driver'),
  packageId: generateTestId('package'),
  type: 'COMMISSION_HOLD' as const,
  amount: 15.0,
  balanceAfter: 485.0,
  status: 'COMPLETED' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockVerification = (overrides: Partial<any> = {}) => ({
  id: generateTestId('verification'),
  userId: generateTestId('user'),
  documentType: 'DRIVERS_LICENSE' as const,
  frontImageUrl: 'https://example.com/front.jpg',
  backImageUrl: 'https://example.com/back.jpg',
  selfieImageUrl: 'https://example.com/selfie.jpg',
  status: 'PENDING' as const,
  riskScore: 25.5,
  authenticityScore: 85.2,
  dataValidationScore: 90.1,
  facialMatchScore: 88.7,
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockAdminReview = (overrides: Partial<any> = {}) => ({
  id: generateTestId('review'),
  verificationId: generateTestId('verification'),
  adminId: generateTestId('admin'),
  decision: 'APPROVED' as const,
  notes: 'All documents verified successfully.',
  reviewedAt: new Date().toISOString(),
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = <T>(data: T, success: boolean = true, message?: string) => ({
  success,
  data: success ? data : undefined,
  message,
  error: !success ? {
    code: 'TEST_ERROR',
    message: message || 'Test error occurred',
  } : undefined,
});

export const createMockPaginatedResponse = <T>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  total: number = data.length
) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

// Mock authentication data
export const createMockAuthToken = () => `mock-jwt-token-${Date.now()}`;

export const createMockAuthResponse = (user: any, token?: string) => ({
  success: true,
  data: {
    user,
    token: token || createMockAuthToken(),
  },
  message: 'Authentication successful',
});

// Mock error responses
export const createMockErrorResponse = (code: string, message: string) => ({
  success: false,
  error: {
    code,
    message,
  },
});

export const mockValidationError = (field: string, message: string) => ({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: [
      {
        field,
        message,
      },
    ],
  },
});

export const mockUnauthorizedError = () => ({
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  },
});

export const mockNotFoundError = (resource: string) => ({
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: `${resource} not found`,
  },
});

// Mock database queries
export const mockPrismaQuery = <T>(data: T) => ({
  findUnique: jest.fn().mockResolvedValue(data),
  findMany: jest.fn().mockResolvedValue([data]),
  create: jest.fn().mockResolvedValue(data),
  update: jest.fn().mockResolvedValue(data),
  delete: jest.fn().mockResolvedValue(data),
  count: jest.fn().mockResolvedValue(1),
});

// Mock external services
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
};

export const mockSmsService = {
  sendSms: jest.fn().mockResolvedValue({ success: true }),
  sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
};

export const mockPaymentService = {
  processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'txn_123' }),
  refundPayment: jest.fn().mockResolvedValue({ success: true }),
  getPaymentStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
};

export const mockFileUploadService = {
  uploadImage: jest.fn().mockResolvedValue({ url: 'https://example.com/uploaded.jpg' }),
  deleteImage: jest.fn().mockResolvedValue({ success: true }),
};
