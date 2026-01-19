import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard API methods
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export const getRecentActivity = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/activity');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

// User management API methods
export const getUsers = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/users', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData: any) => {
  try {
    const response = await apiClient.post('/admin/users', userData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUser = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const suspendUser = async (id: string, reason?: string) => {
  try {
    const response = await apiClient.post(`/admin/users/${id}/suspend`, { reason });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error suspending user:', error);
    throw error;
  }
};

export const unsuspendUser = async (id: string) => {
  try {
    const response = await apiClient.post(`/admin/users/${id}/unsuspend`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error unsuspending user:', error);
    throw error;
  }
};

// Driver management API methods
export const getDrivers = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/drivers', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
};

export const getDriverById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/drivers/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching driver:', error);
    throw error;
  }
};

export const updateDriver = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/drivers/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
};

export const deleteDriver = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
};

// Trip management API methods
export const getTrips = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/trips', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

export const getTripById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/trips/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trip:', error);
    throw error;
  }
};

export const updateTrip = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/trips/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteTrip = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// Verification management API methods
export const getVerifications = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/verifications', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching verifications:', error);
    throw error;
  }
};

export const approveVerification = async (id: string) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${id}/approve`);
    return response.data.data;
  } catch (error) {
    console.error('Error approving verification:', error);
    throw error;
  }
};

export const rejectVerification = async (id: string, reason: string) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
    return response.data.data;
  } catch (error) {
    console.error('Error rejecting verification:', error);
    throw error;
  }
};

// Package management API methods
export const getPackages = async (params?: any) => {
  try {
    const response = await apiClient.get('/packages', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

export const getPackageById = async (id: string) => {
  try {
    const response = await apiClient.get(`/packages/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
};

export const updatePackageStatus = async (id: string, status: string) => {
  try {
    const response = await apiClient.put(`/packages/${id}/status`, { status });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error updating package status:', error);
    throw error;
  }
};

// Wallet management API methods
export const getWallets = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw error;
  }
};

export const getWalletById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    throw error;
  }
};

// Analytics API methods
export const getAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/analytics', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export const getRealTimeMetrics = async () => {
  try {
    const response = await apiClient.get('/admin/analytics/realtime');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    throw error;
  }
};

export const exportAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.post('/admin/analytics/export', params, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
};

// System health API methods
export const getSystemHealth = async () => {
  try {
    // Use the public health endpoint (no /api prefix needed, it's at root)
    const baseUrl = API_BASE_URL.replace('/api', '');
    const response = await axios.get(`${baseUrl}/health/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching system health:', error);
    // Fallback to basic health check
    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      const response = await axios.get(`${baseUrl}/health`);
      return response.data;
    } catch (fallbackError) {
      console.error('Error fetching basic health:', fallbackError);
      return null;
    }
  }
};

export const getSystemMetrics = async () => {
  try {
    const response = await apiClient.get('/admin/system/metrics');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    // Return basic metrics from health check
    try {
      const health = await getSystemHealth();
      return {
        uptime: health?.uptime || 0,
        memory: { usage: 'N/A' },
      };
    } catch {
      return null;
    }
  }
};

// Transaction API methods
export const getTransactions = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransactionAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions/analytics', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching transaction analytics:', error);
    throw error;
  }
};

export const refundTransaction = async (id: string, amount?: number) => {
  try {
    const response = await apiClient.post(`/admin/transactions/${id}/refund`, { amount });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error refunding transaction:', error);
    throw error;
  }
};

// Audit log API methods
export const getAuditLog = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/audit-log', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw error;
  }
};

// Bulk operations
export const performBulkAction = async (action: string, targetIds: string[], metadata?: any) => {
  try {
    const response = await apiClient.post('/admin/bulk-action', {
      action,
      targetIds,
      metadata,
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error performing bulk action:', error);
    throw error;
  }
};

// Notifications API methods
export const getNotifications = async (params?: any) => {
  try {
    const response = await apiClient.get('/notifications', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Export default for use in components
export default apiClient;
