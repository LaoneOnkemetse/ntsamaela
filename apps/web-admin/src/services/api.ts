import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

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

export default apiClient;
