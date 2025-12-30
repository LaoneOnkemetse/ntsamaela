// API Client utility for mobile app
const API_BASE_URL = 'http://192.168.1.116:3001/api';

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async loginWithPhone(phone, password) {
    return this.request('/auth/login-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Package management
  async createPackage(packageData) {
    return this.request('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  async getPackages(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/packages?${queryParams}`);
  }

  async getPackageById(id) {
    return this.request(`/packages/${id}`);
  }

  // Bid management
  async createBid(bidData) {
    return this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(bidData),
    });
  }

  async getBidsByPackage(packageId) {
    return this.request(`/bids/package/${packageId}`);
  }

  async getMyBids() {
    return this.request('/bids/my-bids');
  }

  async acceptBid(bidId) {
    return this.request(`/bids/${bidId}/accept`, {
      method: 'PUT',
    });
  }

  async rejectBid(bidId) {
    return this.request(`/bids/${bidId}/reject`, {
      method: 'PUT',
    });
  }

  async counterBid(bidId, amount, message) {
    return this.request(`/bids/${bidId}/counter`, {
      method: 'POST',
      body: JSON.stringify({ amount, message }),
    });
  }

  // Driver management
  async createDriverProfile(profileData) {
    return this.request('/driver/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async getDriverProfile() {
    return this.request('/driver/profile');
  }

  async getAllDrivers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/driver/all?${queryParams}`);
  }

  // Verification
  async submitVerification(verificationData) {
    const formData = new FormData();
    
    // Add files
    if (verificationData.frontImage) {
      formData.append('frontImage', verificationData.frontImage);
    }
    if (verificationData.backImage) {
      formData.append('backImage', verificationData.backImage);
    }
    if (verificationData.selfieImage) {
      formData.append('selfieImage', verificationData.selfieImage);
    }
    
    // Add other data
    formData.append('documentType', verificationData.documentType);
    formData.append('userId', verificationData.userId);

    return this.request('/verification/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  async getVerificationStatus() {
    return this.request('/verification/my-status');
  }

  // Notifications
  async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/notifications?${queryParams}`);
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  async markAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // Data transformation utilities
  static transformUserType(mobileType) {
    return mobileType?.toUpperCase() || 'CUSTOMER';
  }

  static transformVerificationStatus(mobileVerified) {
    return mobileVerified ? 'APPROVED' : 'PENDING';
  }

  static transformPackageData(mobileData) {
    return {
      description: mobileData.description,
      pickupAddress: mobileData.pickup?.address || mobileData.pickupAddress,
      pickupLat: mobileData.pickup?.lat || mobileData.pickupLat,
      pickupLng: mobileData.pickup?.lng || mobileData.pickupLng,
      deliveryAddress: mobileData.delivery?.address || mobileData.deliveryAddress,
      deliveryLat: mobileData.delivery?.lat || mobileData.deliveryLat,
      deliveryLng: mobileData.delivery?.lng || mobileData.deliveryLng,
      priceOffered: parseFloat(mobileData.price || mobileData.priceOffered),
      weight: mobileData.weight ? parseFloat(mobileData.weight) : undefined,
      size: mobileData.size,
      deliveryDate: mobileData.deliveryDate ? new Date(mobileData.deliveryDate).toISOString() : undefined,
      urgency: mobileData.urgency?.toUpperCase() || 'NORMAL',
      recipientPhone: mobileData.recipientPhone,
    };
  }

  static transformBidData(mobileData) {
    return {
      packageId: mobileData.packageId,
      amount: parseFloat(mobileData.amount),
      message: mobileData.message,
      tripId: mobileData.tripId,
    };
  }
}

export default new ApiClient();
