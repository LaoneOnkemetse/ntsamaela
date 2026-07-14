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
    const { isFormData, timeoutMs: customTimeout, ...fetchOptions } = options;
    const headers = this.getHeaders(!isFormData);
    const config = {
      ...fetchOptions,
      headers: {
        ...headers,
        ...(fetchOptions.headers || {}),
      },
    };

    // Remove Content-Type for FormData so boundary is set automatically
    if (isFormData) {
      delete config.headers["Content-Type"];
    }

    try {
      const controller = new AbortController();
      const timeoutMs =
        typeof customTimeout === "number"
          ? customTimeout
          : isFormData
            ? 60000
            : 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        const isAbort =
          error?.name === "AbortError" ||
          (typeof error?.message === "string" &&
            error.message.toLowerCase().includes("abort"));
        const message = isAbort
          ? `Request timed out after ${timeoutMs}ms`
          : "Network request failed";
        console.error("API request failed:", { url, endpoint, message, error });
        throw new Error(message);
      }

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (data && (data.error?.message || data.message)) ||
          `Request failed (${response.status})`;

        // Rate limited — return a soft error so callers don't retry immediately
        if (response.status === 429) {
          return {
            success: false,
            data: null,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message,
            },
            statusCode: 429,
          };
        }

        // For verification status, a 404 "no verification found" is expected
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

        // Client validation / auth errors — return structured response instead of throwing
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            data: null,
            error: {
              code: data?.error?.code || "REQUEST_FAILED",
              message,
              details: data?.error?.details,
            },
            statusCode: response.status,
          };
        }

        throw new Error(message);
      }

      return data?.success !== undefined ? data : { success: true, data };
    } catch (error) {
      if (error?.message && !error.message.includes("Network")) {
        throw error;
      }
      console.error("API request failed:", {
        url,
        endpoint,
        message: error?.message,
      });
      throw error instanceof Error ? error : new Error("API request failed");
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

  async rechargeWallet(amount, paymentMethod = "DPO") {
    return this.request("/api/wallet/recharge", {
      method: "POST",
      body: JSON.stringify({ amount, paymentMethod }),
    });
  }

  async confirmWalletRecharge({ companyRef, transactionToken } = {}) {
    const params = new URLSearchParams();
    if (companyRef) params.set("companyRef", companyRef);
    if (transactionToken) params.set("transactionToken", transactionToken);
    const query = params.toString();
    return this.request(
      `/api/wallet/recharge/confirm${query ? `?${query}` : ""}`,
    );
  }

  async getCommissionBreakdown() {
    return this.request("/api/wallet/commission-breakdown");
  }

  // Driver
  async updateDriverProfile(formData) {
    return this.request("/api/driver/profile", {
      method: "PUT",
      isFormData: true,
      body: formData,
      timeoutMs: 60000,
    });
  }

  async updateDriverVehicleDetails(details) {
    // Prefer JSON vehicle endpoint; fall back to multipart /profile for older APIs
    const jsonResp = await this.request("/api/driver/profile/vehicle", {
      method: "PUT",
      body: JSON.stringify(details),
    });
    if (
      jsonResp?.success !== false &&
      jsonResp?.statusCode !== 404 &&
      jsonResp?.error?.code !== "NOT_FOUND"
    ) {
      return jsonResp;
    }

    const formData = new FormData();
    if (details.carRegistration) {
      formData.append("carRegistration", String(details.carRegistration));
    }
    if (details.carDescription) {
      formData.append("carDescription", String(details.carDescription));
    }
    if (details.vehicleType) {
      formData.append("vehicleType", String(details.vehicleType));
    }
    if (details.vehicleCapacity) {
      formData.append("vehicleCapacity", String(details.vehicleCapacity));
    }
    return this.updateDriverProfile(formData);
  }

  async uploadProfilePicture(imageUri) {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || `profile-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    formData.append("profilePicture", {
      uri: imageUri,
      name: filename,
      type,
    });
    return this.request("/api/user/profile/picture", {
      method: "POST",
      isFormData: true,
      body: formData,
      timeoutMs: 60000,
    });
  }

  async cancelPackage(packageId) {
    const tryPaths = [
      { path: `/api/packages/${packageId}/cancel`, method: "POST" },
      { path: `/api/packages/cancel/${packageId}`, method: "POST" },
      { path: `/api/packages/${packageId}/cancel`, method: "DELETE" },
    ];
    let lastError = null;
    for (const attempt of tryPaths) {
      try {
        const resp = await this.request(attempt.path, {
          method: attempt.method,
        });
        if (resp?.success !== false) return resp;
        if (resp?.statusCode === 404 || resp?.error?.code === "NOT_FOUND") {
          lastError = resp;
          continue;
        }
        return resp;
      } catch (e) {
        lastError = e;
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("not found") || msg.includes("404")) continue;
        throw e;
      }
    }
    if (lastError instanceof Error) throw lastError;
    return (
      lastError || {
        success: false,
        error: { message: "Cancel route not found", code: "NOT_FOUND" },
      }
    );
  }

  async getDriverProfile() {
    return this.request("/api/driver/profile");
  }

  async updateDriverActiveStatus(active) {
    return this.request("/api/driver/active", {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
  }

  async updateDriverLocation(latitude, longitude) {
    return this.request("/api/driver/location", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  async getAllDrivers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/driver/all?${queryParams}`);
  }

  async getDriverById(driverId) {
    return this.request(`/api/driver/${driverId}`);
  }

  // Trips
  async createTrip(tripData) {
    return this.request("/api/trips", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
  }

  async updateTrip(tripId, tripData) {
    return this.request(`/api/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(tripData),
    });
  }

  async deleteTrip(tripId) {
    return this.request(`/api/trips/${tripId}`, {
      method: "DELETE",
    });
  }

  async getMyTrips(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/trips/my-trips?${queryParams}`);
  }

  async getAvailableTrips(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/trips/available?${queryParams}`);
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
    if (packageData?.imageUri || packageData?.photo) {
      const formData = new FormData();
      Object.entries(packageData).forEach(([key, value]) => {
        if (
          key === "imageUri" ||
          key === "photo" ||
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }
        if (
          key === "weight" &&
          (Number.isNaN(Number(value)) || Number(value) <= 0)
        ) {
          return;
        }
        formData.append(key, String(value));
      });
      const uri = packageData.imageUri || packageData.photo;
      const filename = uri.split("/").pop() || "package.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("image", { uri, name: filename, type });
      return this.request("/api/packages", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    }

    const cleaned = { ...packageData };
    delete cleaned.imageUri;
    delete cleaned.photo;
    if (
      cleaned.weight === null ||
      cleaned.weight === "" ||
      Number.isNaN(cleaned.weight)
    ) {
      delete cleaned.weight;
    }
    return this.request("/api/packages", {
      method: "POST",
      body: JSON.stringify(cleaned),
    });
  }

  async searchPlaces(query) {
    return this.request(
      `/api/places/autocomplete?q=${encodeURIComponent(query)}`,
    );
  }

  async withdrawWallet(amount, method = "BANK_TRANSFER", accountDetails = "") {
    return this.request("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount, method, accountDetails }),
    });
  }

  async deletePackage(packageId) {
    return this.request(`/api/packages/${packageId}`, {
      method: "DELETE",
    });
  }

  async updatePackageStatus(packageId, status, notes) {
    return this.request(`/api/packages/${packageId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
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
    return this.request("/api/bids/accept", {
      method: "POST",
      body: JSON.stringify({ bidId }),
    });
  }

  async customerCounterBid(bidId, amount) {
    return this.request("/api/bids/customer-counter", {
      method: "POST",
      body: JSON.stringify({ bidId, amount: parseFloat(amount) }),
    });
  }

  async updateBid(bidId, amount, message = "") {
    return this.request(`/api/bids/${bidId}`, {
      method: "PUT",
      body: JSON.stringify({
        amount: parseFloat(amount),
        message: message || `Updated bid: P${amount}`,
      }),
    });
  }

  async submitCounterBid(packageId, amount) {
    return this.createBid({
      packageId,
      amount: parseFloat(amount),
      message: `Counter offer: P${amount}`,
    });
  }

  async placeBidOnPackage(packageId, amount, message = "", location = null) {
    const payload = {
      packageId,
      amount: parseFloat(amount),
      message: message || `Bid: P${amount}`,
    };
    if (location?.latitude != null && location?.longitude != null) {
      payload.bidLatitude = location.latitude;
      payload.bidLongitude = location.longitude;
      if (location.locationName) {
        payload.bidLocationName = location.locationName;
      }
    }
    return this.createBid(payload);
  }

  getPackageBids(packageId) {
    return this.getBidsByPackage(packageId);
  }

  // Trips
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
