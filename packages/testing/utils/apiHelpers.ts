import request from 'supertest';
import { Express } from 'express';
import { generateTestEmail, generateTestPhone } from './testHelpers';

// API test helpers
export class ApiTestHelper {
  private app: Express;
  private authToken?: string;

  constructor(app: Express) {
    this.app = app;
  }

  // Set authentication token for subsequent requests
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Clear authentication token
  clearAuthToken() {
    this.authToken = undefined;
  }

  // Create authenticated request
  private createRequest() {
    const req = request(this.app);
    if (this.authToken) {
      return req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req;
  }

  // Auth endpoints
  async register(userData?: Partial<any>) {
    const data = {
      email: generateTestEmail(),
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      phone: generateTestPhone(),
      userType: 'CUSTOMER' as const,
      ...userData,
    };

    const response = await this.createRequest()
      .post('/api/auth/register')
      .send(data);

    if (response.body.success && response.body.data?.token) {
      this.setAuthToken(response.body.data.token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.createRequest()
      .post('/api/auth/login')
      .send({ email, password });

    if (response.body.success && response.body.data?.token) {
      this.setAuthToken(response.body.data.token);
    }

    return response;
  }

  async getCurrentUser() {
    return this.createRequest().get('/api/auth/me');
  }

  async logout() {
    const response = await this.createRequest().post('/api/auth/logout');
    this.clearAuthToken();
    return response;
  }

  // Package endpoints
  async createPackage(packageData?: Partial<any>) {
    const data = {
      description: 'Test package',
      pickupAddress: '123 Test St, Test City',
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      deliveryAddress: '456 Test Ave, Test City',
      deliveryLat: 40.7589,
      deliveryLng: -73.9851,
      priceOffered: 50.0,
      size: 'Medium',
      weight: 2.5,
      ...packageData,
    };

    return this.createRequest()
      .post('/api/packages')
      .send(data);
  }

  async getPackages() {
    return this.createRequest().get('/api/packages');
  }

  async getPackage(id: string) {
    return this.createRequest().get(`/api/packages/${id}`);
  }

  async updatePackage(id: string, updateData: any) {
    return this.createRequest()
      .put(`/api/packages/${id}`)
      .send(updateData);
  }

  async deletePackage(id: string) {
    return this.createRequest().delete(`/api/packages/${id}`);
  }

  // Trip endpoints
  async createTrip(tripData?: Partial<any>) {
    const data = {
      startAddress: '100 Start St, City A',
      startLat: 40.7128,
      startLng: -74.0060,
      endAddress: '200 End St, City B',
      endLat: 40.7589,
      endLng: -73.9851,
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      availableCapacity: 'Medium',
      ...tripData,
    };

    return this.createRequest()
      .post('/api/trips')
      .send(data);
  }

  async getTrips() {
    return this.createRequest().get('/api/trips');
  }

  async getTrip(id: string) {
    return this.createRequest().get(`/api/trips/${id}`);
  }

  // Bid endpoints
  async createBid(packageId: string, bidData?: Partial<any>) {
    const data = {
      amount: 45.0,
      message: 'I can deliver this package safely.',
      ...bidData,
    };

    return this.createRequest()
      .post(`/api/packages/${packageId}/bids`)
      .send(data);
  }

  async getBids(packageId: string) {
    return this.createRequest().get(`/api/packages/${packageId}/bids`);
  }

  async acceptBid(bidId: string) {
    return this.createRequest().put(`/api/bids/${bidId}/accept`);
  }

  // Wallet endpoints
  async getWallet() {
    return this.createRequest().get('/api/wallet');
  }

  async getTransactions() {
    return this.createRequest().get('/api/wallet/transactions');
  }

  // Verification endpoints
  async submitVerification(verificationData?: Partial<any>) {
    const data = {
      documentType: 'DRIVERS_LICENSE' as const,
      frontImageUrl: 'https://example.com/front.jpg',
      backImageUrl: 'https://example.com/back.jpg',
      selfieImageUrl: 'https://example.com/selfie.jpg',
      ...verificationData,
    };

    return this.createRequest()
      .post('/api/verification')
      .send(data);
  }

  async getVerificationStatus() {
    return this.createRequest().get('/api/verification/status');
  }
}

// Response assertion helpers
export const expectSuccessResponse = (response: any) => {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  expect(response.body.success).toBe(true);
};

export const expectErrorResponse = (response: any, statusCode?: number) => {
  if (statusCode) {
    expect(response.status).toBe(statusCode);
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400);
  }
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
};

export const expectValidationError = (response: any) => {
  expectErrorResponse(response, 400);
  expect(response.body.error.code).toBe('VALIDATION_ERROR');
};

export const expectUnauthorizedError = (response: any) => {
  expectErrorResponse(response, 401);
  expect(response.body.error.code).toBe('UNAUTHORIZED');
};

export const expectNotFoundError = (response: any) => {
  expectErrorResponse(response, 404);
  expect(response.body.error.code).toBe('NOT_FOUND');
};
