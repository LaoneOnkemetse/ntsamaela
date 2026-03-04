// Enhanced API Service for mobile app - uses API_CONFIG.BASE_URL (env in prod, local in __DEV__)
import { API_CONFIG } from "../constants/config";

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders(includeContentType = true) {
    const headers = {};

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(!options.isFormData),
      ...options,
    };

    // Remove Content-Type for FormData
    if (options.isFormData) {
      delete config.headers["Content-Type"];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (data && (data.error?.message || data.message)) || "Request failed";

        // For verification status, a 404 "no verification found" is expected
        // when the user has not submitted documents yet. Treat this as a
        // soft response instead of throwing so the UI doesn't log an error.
        if (
          response.status === 404 &&
          message &&
          message.toLowerCase().includes("no verification found")
        ) {
          return {
            success: false,
            data: null,
            error: {
              code: data?.error?.code || "VERIFICATION_NOT_FOUND",
              message,
            },
            statusCode: response.status,
          };
        }

        throw new Error(message);
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Authentication
  async loginWithPhone(phone, password) {
    return this.request("/api/auth/login-phone", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
  }

  async register(userData) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request("/api/auth/me");
  }

  // Verification
  async submitVerification(formData) {
    return this.request("/api/verification/submit", {
      method: "POST",
      isFormData: true,
      body: formData,
    });
  }

  async getVerificationStatus() {
    return this.request("/api/verification/my-status");
  }

  async getVerificationById(id) {
    return this.request(`/api/verification/${id}`);
  }

  // Wallet
  async getWalletBalance() {
    return this.request("/api/wallet/balance");
  }

  async getTransactions(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/wallet/transactions?${queryParams}`);
  }

  async rechargeWallet(amount, paymentMethod) {
    return this.request("/api/wallet/recharge", {
      method: "POST",
      body: JSON.stringify({ amount, paymentMethod }),
    });
  }

  async getCommissionBreakdown() {
    return this.request("/api/wallet/commission-breakdown");
  }

  // Chat
  async getChatRooms() {
    return this.request("/api/chat/rooms");
  }

  async getChatRoom(roomId) {
    return this.request(`/api/chat/rooms/${roomId}`);
  }

  async getChatMessages(roomId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/chat/rooms/${roomId}/messages?${queryParams}`);
  }

  async sendMessage(roomId, message, messageType = "TEXT") {
    return this.request(`/api/chat/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, messageType }),
    });
  }

  // Tracking
  async getPackageTracking(packageId) {
    return this.request(`/api/tracking/package/${packageId}`);
  }

  async updateLocation(packageId, latitude, longitude) {
    return this.request(`/api/tracking/package/${packageId}/location`, {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // Packages
  async createPackage(packageData) {
    return this.request("/api/packages", {
      method: "POST",
      body: JSON.stringify(packageData),
    });
  }

  async getPackages(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/packages?${queryParams}`);
  }

  async getPackageById(id) {
    return this.request(`/api/packages/${id}`);
  }

  // Bids
  async createBid(bidData) {
    return this.request("/api/bids", {
      method: "POST",
      body: JSON.stringify(bidData),
    });
  }

  async getBidsByPackage(packageId) {
    return this.request(`/api/bids/package/${packageId}`);
  }

  async getMyBids() {
    return this.request("/api/bids/my-bids");
  }

  async acceptBid(bidId) {
    return this.request(`/api/bids/${bidId}/accept`, {
      method: "PUT",
    });
  }

  async submitCounterBid(packageId, amount) {
    return this.request(`/api/bids/${packageId}/counter`, {
      method: "POST",
      body: JSON.stringify({ amount, message: `Counter offer: P${amount}` }),
    });
  }

  getPackageBids(packageId) {
    return this.getBidsByPackage(packageId);
  }

  // Trips
  async createTrip(tripData) {
    return this.request("/api/trips", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
  }

  async getTrips(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/trips?${queryParams}`);
  }

  // Notifications
  async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/notifications?${queryParams}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  // FCM Token Management
  async registerFcmToken(fcmToken) {
    return this.request("/api/auth/fcm-token/register", {
      method: "POST",
      body: JSON.stringify({ fcmToken }),
    });
  }

  async removeFcmToken(fcmToken) {
    return this.request("/api/auth/fcm-token/remove", {
      method: "POST",
      body: JSON.stringify({ fcmToken }),
    });
  }
}

export default new ApiService();
