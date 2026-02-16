import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import { API_CONFIG } from '../constants/config';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [screenHistory, setScreenHistory] = useState(['loading']);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [authToken, setAuthToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [screenParams, setScreenParams] = useState({});
  
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profilePhoto: null,
    rating: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
    isVerified: false,
    phoneVerified: false,
    email: '',
    userId: null,
  });

  const [customerWallet, setCustomerWallet] = useState(0);
  const [driverWallet, setDriverWallet] = useState(0);
  const [myPackages, setMyPackages] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [isActiveDriver, setIsActiveDriver] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);

  const toggleActiveDriverStatus = (status) => {
    setIsActiveDriver(status);
    if (status) {
      const currentDriverProfile = {
        id: 999,
        driver: `${userProfile.firstName} ${userProfile.lastName}`,
        rating: userProfile.rating,
        location: 'Current Location',
        vehicle: 'My Vehicle',
        totalDeliveries: userProfile.totalDeliveries,
        earnings: `P ${userProfile.totalEarnings}`
      };
      setActiveDrivers(prev => {
        const exists = prev.some(d => d.id === 999);
        return exists ? prev : [...prev, currentDriverProfile];
      });
    } else {
      setActiveDrivers(prev => prev.filter(d => d.id !== 999));
    }
  };

  const addTrip = (tripData) => {
    const newTrip = {
      id: `TRIP-${upcomingTrips.length + 1}`,
      driver: `${userProfile.firstName} ${userProfile.lastName}`,
      rating: userProfile.rating,
      from: tripData.from.name,
      to: tripData.to.name,
      date: `${tripData.date}, ${tripData.time}`,
      spacesLeft: 3,
      price: 'P 100'
    };
    setUpcomingTrips(prev => [...prev, newTrip]);
  };

  const navigate = (screenName, replace = false, params = {}) => {
    if (replace) {
      setScreenHistory([screenName]);
    } else {
      setScreenHistory(prev => [...prev, screenName]);
    }
    setCurrentScreen(screenName);
    if (Object.keys(params).length > 0) {
      setScreenParams(prev => ({ ...prev, [screenName]: params }));
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const apiUrl = API_CONFIG.BASE_URL;
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  const fetchWalletBalance = async (token) => {
    try {
      const apiUrl = API_CONFIG.BASE_URL;
      const response = await fetch(`${apiUrl}/api/wallet/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data.availableBalance || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      return 0;
    }
  };

  const login = async (phone, password) => {
    try {
      if (!phone || !phone.trim()) {
        Alert.alert('Validation Error', 'Phone number is required');
        return;
      }
      if (!password || !password.trim()) {
        Alert.alert('Validation Error', 'Password is required');
        return;
      }

      const apiUrl = API_CONFIG.BASE_URL;
      let normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        response = await fetch(`${apiUrl}/api/auth/login-phone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalizedPhone, password }),
          signal: controller.signal
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
        return;
      }

      clearTimeout(timeoutId);
      
      if (!response) {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please try again.');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
        return;
      }

      if (!response.ok || response.status === 401 || response.status === 403 || data.success !== true) {
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';
        if (errorCode === 'USER_NOT_FOUND') {
          Alert.alert('Phone Number Not Registered', 'This phone number is not registered. Would you like to sign up?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => navigate('registerCustomer', true) }
          ]);
        } else if (errorCode === 'INVALID_PASSWORD') {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
        } else {
          Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        }
        return;
      }

      if (!data.data || !data.data.token || !data.data.user || !data.data.user.id) {
        Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
        return;
      }

      const token = data.data.token;
      const userData = data.data.user;

      setAuthToken(token);
      setUserProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || normalizedPhone,
        profilePhoto: userData.profilePictureUrl || null,
        rating: 0,
        totalDeliveries: 0,
        totalEarnings: 0,
        isVerified: userData.identityVerified || false,
        phoneVerified: userData.phoneVerified || false,
        email: userData.email || '',
        userId: userData.id,
      });

      const actualUserType = userData.userType?.toLowerCase() || 'customer';
      setUserType(actualUserType);

      const fullProfile = await fetchUserProfile(token);
      if (fullProfile) {
        setUserProfile(prev => ({
          ...prev,
          firstName: fullProfile.firstName || prev.firstName,
          lastName: fullProfile.lastName || prev.lastName,
          phone: fullProfile.phone || prev.phone,
          profilePhoto: fullProfile.profilePictureUrl || prev.profilePhoto,
          isVerified: fullProfile.identityVerified || prev.isVerified,
          phoneVerified: fullProfile.phoneVerified || prev.phoneVerified,
          email: fullProfile.email || prev.email,
          userId: fullProfile.id || prev.userId,
        }));
      }

      const walletBalance = await fetchWalletBalance(token);
      if (actualUserType === 'customer') {
        setCustomerWallet(walletBalance);
      } else if (actualUserType === 'driver') {
        setDriverWallet(walletBalance);
      }

      setIsAuthenticated(true);
      apiService.setToken(token);
      try {
        socketService.connect(token);
      } catch (socketError) {
        console.warn('Socket.IO connection failed:', socketError);
      }

      navigate('home', true);
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'AbortError') {
        Alert.alert('Connection Timeout', 'The request took too long. Please check your internet connection and try again.');
      } else {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      }
      setIsAuthenticated(false);
      setAuthToken(null);
      setUserType(null);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setActiveTab('home');
    apiService.setToken(null);
    socketService.disconnect();
    navigate('login', true);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1);
      setScreenHistory(newHistory);
      setCurrentScreen(newHistory[newHistory.length - 1]);
      return true;
    }
    return false;
  };

  return (
    <NavigationContext.Provider value={{
      currentScreen,
      navigate,
      goBack,
      isAuthenticated,
      userType,
      login,
      logout,
      activeTab,
      setActiveTab,
      userProfile,
      setUserProfile,
      customerWallet,
      setCustomerWallet,
      driverWallet,
      setDriverWallet,
      myPackages,
      setMyPackages,
      availablePackages,
      setAvailablePackages,
      myBids,
      setMyBids,
      notifications,
      setNotifications,
      upcomingTrips,
      setUpcomingTrips,
      addTrip,
      isActiveDriver,
      toggleActiveDriverStatus,
      activeDrivers,
      setActiveDrivers,
      authToken,
      screenParams,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

