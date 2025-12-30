import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, Image, Modal, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// Import all screens and services
import { 
  LoadingScreen,
  LoginScreen,
  RegisterCustomerScreen,
  RegisterDriverScreen,
  ForgotPasswordScreen,
  VerificationScreen, 
  WalletScreen as NewWalletScreen, 
  ChatScreen, 
  TrackingScreen,
  CreatePackageScreen,
  MyPackagesScreen,
  AvailablePackagesScreen,
  MyTripsScreen,
  CustomerHomeScreen,
  DriverHomeScreen,
  ProfileScreen,
  SettingsScreen,
  NotificationScreen,
  AvailableDriversScreen,
} from './src/screens';
import apiService from './src/services/apiService';
import socketService from './src/services/socketService';

const { width } = Dimensions.get('window');

// Botswana Flag Colors Only - Light Professional Palette
const colors = {
  // Botswana Flag Colors
  botswanaBlue: '#75AADB',    // Light Blue from flag
  botswanaBlack: '#000000',   // Black from flag
  botswanaWhite: '#FFFFFF',   // White from flag
  
  // Primary colors using Botswana flag
  primary: '#75AADB',         // Botswana Blue
  primaryDark: '#5A8FBF',     // Darker Blue
  primaryLight: '#A3C9E8',    // Lighter Blue
  secondary: '#000000',       // Botswana Black
  secondaryLight: '#333333',  // Light Gray (lighter than before)
  
  // System colors using flag colors
  success: '#10B981',         // Green for success
  error: '#000000',           // Black for error (with white text)
  warning: '#75AADB',         // Blue for warning
  
  // Background colors (use darker button blue as main background)
  background: '#5A8FBF',      // Darker blue
  backgroundSecondary: '#75AADB', // Main light blue
  cardBg: '#E6F3FF',          // Light blue card background
  cardBgLight: '#F0F8FF',     // Very light blue card background
  
  // Text colors
  textPrimary: '#000000',     // Black text
  textSecondary: '#333333',   // Dark gray text
  textTertiary: '#666666',    // Medium gray text
  textLight: '#FFFFFF',       // White text
  textDark: '#000000',        // Black text
  
  // Border colors
  border: '#E0E0E0',          // Light gray border
  borderLight: '#F0F0F0',     // Very light border
  borderDark: '#000000',      // Black border
  
  // Shadow and effects
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowBlue: 'rgba(117, 170, 219, 0.2)',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(0, 0, 0, 0.1)',
  gradient: ['#75AADB', '#A3C9E8'], // Light blue gradient
};

// Helper button used by registration screens for photo fields
const RegistrationPhotoButton = ({ label, onPress, preview }) => (
  <View style={styles.documentRow}>
    <Text style={styles.documentLabel}>{label}</Text>
    <TouchableOpacity style={styles.documentButton} onPress={onPress}>
      {preview ? (
        <Image source={{ uri: preview.uri }} style={styles.documentPreview} />
      ) : (
        <Text style={styles.documentButtonText}>Add</Text>
      )}
    </TouchableOpacity>
  </View>
);

// Camera and media helpers (top-level for reuse)
const requestCameraPermissionGlobal = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }
  return true;
};

const requestMediaLibraryPermissionGlobal = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }
  return true;
};

const takePhotoGlobal = async (setter) => {
  const hasPermission = await requestCameraPermissionGlobal();
  if (!hasPermission) {
    Alert.alert('Permission Required', 'Camera permission is required to take photos');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setter(result.assets[0]);
  }
};

const selectFromGalleryGlobal = async (setter) => {
  const hasPermission = await requestMediaLibraryPermissionGlobal();
  if (!hasPermission) {
    Alert.alert('Permission Required', 'Media library permission is required to select photos');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setter(result.assets[0]);
  }
};

const showPhotoActionSheetGlobal = (setter) => {
  Alert.alert(
    'Select Document Photo',
    'Choose how you want to add the document photo',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => takePhotoGlobal(setter) },
      { text: 'Choose from Gallery', onPress: () => selectFromGalleryGlobal(setter) },
    ]
  );
};

// Navigation Context
const NavigationContext = React.createContext();

function NavigationProvider({ children }) {
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

  // Active driver status
  const [isActiveDriver, setIsActiveDriver] = useState(false);
  
  // Active drivers list (for customer view)
  const [activeDrivers, setActiveDrivers] = useState([]);

  // Function to toggle active driver status and update activeDrivers list
  const toggleActiveDriverStatus = (status) => {
    setIsActiveDriver(status);
    
    if (status) {
      // Add current driver to active drivers list
      const currentDriverProfile = {
        id: 999,
        driver: `${userProfile.firstName} ${userProfile.lastName}`,
        rating: userProfile.rating,
        location: 'Current Location',
        vehicle: 'My Vehicle',
        totalDeliveries: userProfile.totalDeliveries,
        earnings: `P ${userProfile.totalEarnings}`
      };
      
      // Only add if not already in the list
      setActiveDrivers(prev => {
        const exists = prev.some(d => d.id === 999);
        return exists ? prev : [...prev, currentDriverProfile];
      });
    } else {
      // Remove current driver from active drivers list
      setActiveDrivers(prev => prev.filter(d => d.id !== 999));
    }
  };

  const addTrip = (tripData) => {
    const newTrip = {
      id: upcomingTrips.length + 1,
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
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
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
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
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
      // Validate inputs
      if (!phone || !phone.trim()) {
        Alert.alert('Validation Error', 'Phone number is required');
        return;
      }
      if (!password || !password.trim()) {
        Alert.alert('Validation Error', 'Password is required');
        return;
      }

      // Use environment variable or default to local IP
      // For Expo Go on physical device, use your computer's local IP
      // For emulator, use localhost or 10.0.2.2 (Android) / localhost (iOS)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      
      console.log(`🔗 Attempting to connect to: ${apiUrl}/api/auth/login-phone`);
      console.log(`📱 Phone number: ${phone}`);
      console.log(`🔒 Password provided: ${password ? 'YES (length: ' + password.length + ')' : 'NO'}`);
      
      // Phone number should already be normalized with country code from LoginScreen
      // Just ensure it starts with +
      let normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith('+')) {
        // If no + prefix, assume it's already in E.164 format or add +
        normalizedPhone = '+' + normalizedPhone;
      }
      
      console.log(`📱 Normalized phone: ${normalizedPhone}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log('🌐 Making API request to:', `${apiUrl}/api/auth/login-phone`);
      console.log('📤 Request body:', { phone: normalizedPhone, password: '***' });
      
      let response;
      try {
        response = await fetch(`${apiUrl}/api/auth/login-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            phone: normalizedPhone,
          password: password
          }),
          signal: controller.signal
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Network error - fetch failed:', fetchError);
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
        return; // CRITICAL: Never allow login on network error
      }

      clearTimeout(timeoutId);
      
      // CRITICAL: Verify we actually got a response
      if (!response) {
        console.error('❌ No response received from server');
        Alert.alert('Connection Error', 'Unable to connect to the server. Please try again.');
        return; // CRITICAL: Never allow login without response
      }
      
      console.log('📥 API Response received. Status:', response.status, 'OK:', response.ok);

      // Parse response JSON first to get error details
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError);
        Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
        return; // CRITICAL: Explicitly return to prevent login
      }

      console.log('📥 Login response:', JSON.stringify(data, null, 2));
      console.log('📥 Response status:', response.status);
      console.log('📥 Response structure check:', {
        hasData: !!data.data,
        hasToken: !!data.data?.token,
        tokenType: typeof data.data?.token,
        tokenLength: data.data?.token?.length,
        hasUser: !!data.data?.user,
        hasUserId: !!data.data?.user?.id,
        hasEmail: !!data.data?.user?.email,
        hasFirstName: !!data.data?.user?.firstName
      });

      // CRITICAL: Check response status - 401/403 means authentication failed
      if (!response.ok || response.status === 401 || response.status === 403) {
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';
        
        console.error('❌ Login failed:', data.error?.message, 'Status:', response.status, 'Code:', errorCode);
        
        // Handle specific error cases with user-friendly messages
        if (errorCode === 'USER_NOT_FOUND') {
          Alert.alert(
            'Phone Number Not Registered',
            'This phone number is not registered to any account.\n\nWould you like to sign up?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => navigate('registerCustomer', true) }
            ]
          );
        } else if (errorCode === 'INVALID_PASSWORD') {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
        } else if (errorCode === 'DATABASE_CONNECTION_ERROR') {
          Alert.alert('Service Unavailable', 'The service is temporarily unavailable. Please try again in a few moments.');
        } else if (errorCode === 'LOGIN_ERROR') {
          Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        } else {
          Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        }
        
        return; // CRITICAL: Explicitly return to prevent login
      }

      // CRITICAL: Check if response indicates success - must be explicitly true
      if (data.success !== true) {
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';
        
        console.error('❌ Login failed - success is not true:', data);
        
        // Handle specific error cases (defensive check in case status was 200 but success is false)
        if (errorCode === 'USER_NOT_FOUND') {
          Alert.alert(
            'Phone Number Not Registered',
            'This phone number is not registered to any account.\n\nWould you like to sign up?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => navigate('registerCustomer', true) }
            ]
          );
        } else if (errorCode === 'INVALID_PASSWORD') {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
        } else if (errorCode === 'DATABASE_CONNECTION_ERROR') {
          Alert.alert('Service Unavailable', 'The service is temporarily unavailable. Please try again in a few moments.');
        } else {
          Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        }
        
        return; // CRITICAL: Explicitly return to prevent login
      }

      // CRITICAL: Verify that we have a token before proceeding
      if (!data.data || !data.data.token || typeof data.data.token !== 'string' || data.data.token.length === 0) {
        console.error('❌ Login failed: No valid token in response', data);
        Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
        return; // CRITICAL: Explicitly return to prevent login
      }

      // CRITICAL: Verify user data exists
      if (!data.data.user || !data.data.user.id) {
        console.error('❌ Login failed: No user data in response', data);
        Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
        return; // CRITICAL: Explicitly return to prevent login
      }

      // CRITICAL: Only proceed if ALL conditions are met
      // 1. Response status must be 200
      // 2. data.success must be explicitly true
      // 3. Token must exist and be valid
      // 4. User data must exist with valid ID
      const hasValidResponse = response.status === 200;
      const hasSuccessFlag = data.success === true;
      const hasValidToken = data.data && data.data.token && typeof data.data.token === 'string' && data.data.token.length > 0;
      const hasValidUser = data.data && data.data.user && data.data.user.id;
      
      console.log('🔍 Validation checks:', {
        status200: hasValidResponse,
        successTrue: hasSuccessFlag,
        hasToken: hasValidToken,
        hasUser: hasValidUser
      });
      
      if (!hasValidResponse || !hasSuccessFlag || !hasValidToken || !hasValidUser) {
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';
        const errorMessage = data.error?.message || data.message || 'Login failed. Invalid response from server.';
        
        console.error('❌ Login validation failed:', {
          status: response.status,
          success: data.success,
          hasToken: hasValidToken,
          hasUser: hasValidUser,
          errorCode,
          errorMessage
        });
        
        if (errorCode === 'USER_NOT_FOUND') {
          Alert.alert(
            'Phone Number Not Registered',
            'This phone number is not registered to any account.\n\nWould you like to sign up?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => navigate('registerCustomer', true) }
            ]
          );
        } else if (errorCode === 'INVALID_PASSWORD') {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
        } else {
          Alert.alert('Sign in failed', errorMessage);
        }
        
        return; // CRITICAL: Never allow login if validation fails
      }

      // CRITICAL: Final validation - ALL conditions must be true
      const statusOk = response.status === 200;
      const successTrue = data.success === true;
      const hasData = !!data.data;
      const hasToken = hasData && !!data.data.token && typeof data.data.token === 'string' && data.data.token.length > 10;
      const hasUser = hasData && !!data.data.user;
      const hasUserId = hasUser && !!data.data.user.id;
      // Email is optional since we're using phone-based auth, but check if it exists
      const hasUserEmail = hasUser && (!!data.data.user.email || !!data.data.user.phone);
      const hasUserFirstName = hasUser && !!data.data.user.firstName;
      // Phone is required for phone-based auth
      const hasUserPhone = hasUser && !!data.data.user.phone;

      console.log('🔍 Validation breakdown:', {
        statusOk: `status=${response.status} (${statusOk ? '✓' : '✗'})`,
        successTrue: `success=${data.success} (${successTrue ? '✓' : '✗'})`,
        hasData: `${hasData ? '✓' : '✗'} - data object exists`,
        hasToken: `${hasToken ? '✓' : '✗'} - token exists and valid`,
        hasUser: `${hasUser ? '✓' : '✗'} - user object exists`,
        hasUserId: `${hasUserId ? '✓' : '✗'} - user.id exists`,
        hasUserPhone: `${hasUserPhone ? '✓' : '✗'} - user.phone exists`,
        hasUserEmail: `${hasUserEmail ? '✓' : '✗'} - user.email or phone exists`,
        hasUserFirstName: `${hasUserFirstName ? '✓' : '✗'} - user.firstName exists`
      });

      // Email is optional, but phone is required for phone-based auth
      const isValidLogin = statusOk && successTrue && hasData && hasToken && hasUser && hasUserId && hasUserPhone && hasUserFirstName;

      if (!isValidLogin) {
        console.error('❌ CRITICAL: Login validation failed. Detailed check:', {
          statusOk,
          successTrue,
          hasData,
          hasToken,
          hasUser,
          hasUserId,
          hasUserEmail,
          hasUserFirstName,
          responseStatus: response.status,
          dataSuccess: data.success,
          dataStructure: {
            hasData: !!data.data,
            hasToken: !!data.data?.token,
            tokenType: typeof data.data?.token,
            tokenLength: data.data?.token?.length,
            hasUser: !!data.data?.user,
            hasUserId: !!data.data?.user?.id,
            hasEmail: !!data.data?.user?.email,
            hasFirstName: !!data.data?.user?.firstName
          },
          fullResponse: JSON.stringify(data, null, 2)
        });
        
        // Provide simple error message
        console.error('❌ Login validation failed. Detailed check:', {
          statusOk,
          successTrue,
          hasData,
          hasToken,
          hasUser,
          hasUserId,
          hasUserPhone,
          hasUserFirstName
        });
        
        Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        return; // CRITICAL: Never allow login if validation fails
      }

      // All validations passed - proceed with login
      if (data.success === true && data.data && data.data.token && data.data.user && data.data.user.id) {
        // Store token and user data
        const token = data.data.token;
        const userData = data.data.user;
        
        // FINAL SAFETY CHECK: Verify we have all required data before authenticating
        // Email is optional (phone-based auth), but phone and firstName are required
        if (!token || token.length < 10 || !userData || !userData.id || !userData.phone || !userData.firstName) {
          console.error('❌ CRITICAL: Attempted to authenticate without valid token or user data', {
            hasToken: !!token,
            tokenLength: token?.length,
            hasUserData: !!userData,
            hasUserId: !!userData?.id,
            hasPhone: !!userData?.phone,
            hasFirstName: !!userData?.firstName,
            hasEmail: !!userData?.email
          });
          Alert.alert('Sign in Failed', 'Unable to sign in. Please try again.');
          return;
        }

        setAuthToken(token);
        
        // Update user profile with actual user data from API
        setUserProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || normalizedPhone,
          profilePhoto: userData.profilePictureUrl || null,
          rating: 0, // Will be fetched separately if needed
          totalDeliveries: 0, // Will be fetched separately if needed
          totalEarnings: 0, // Will be fetched separately if needed
          isVerified: userData.identityVerified || false,
          phoneVerified: userData.phoneVerified || false,
          email: userData.email || '',
          userId: userData.id,
        });
        
        // Set user type from API response
        const actualUserType = userData.userType?.toLowerCase() || 'customer';
        setUserType(actualUserType);
        
        // Fetch full user profile and wallet balance
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
        
        // Fetch wallet balance
        const walletBalance = await fetchWalletBalance(token);
        if (actualUserType === 'customer') {
          setCustomerWallet(walletBalance);
        } else if (actualUserType === 'driver') {
          setDriverWallet(walletBalance);
        }

        // FINAL VALIDATION: Double-check everything before authenticating
        if (!token || token.length === 0 || !userData || !userData.id) {
          console.error('❌ CRITICAL ERROR: Invalid token or user data at final check');
          Alert.alert('Authentication Error', 'Invalid authentication data received. Please try again.');
          return;
        }

        console.log(`✅ Login successful! User: ${userData.firstName} ${userData.lastName} (ID: ${userData.id})`);
        console.log(`✅ Token received: ${token.substring(0, 20)}...`);
        
        // Only set authenticated if we have valid data
        setIsAuthenticated(true);
        
        // Initialize API and Socket services
        apiService.setToken(token);
        try {
          socketService.connect(token);
          console.log('✅ Socket.IO connected');
        } catch (socketError) {
          console.warn('⚠️ Socket.IO connection failed (may need polyfills):', socketError);
        }
        
        navigate('home', true);
        console.log(`✅ Connected to server at ${apiUrl}`);
        return; // Success, exit the function
      } else {
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';
        console.error('❌ Login failed:', data.error?.message);
        
        // Handle specific error codes
        if (errorCode === 'USER_NOT_FOUND') {
          Alert.alert(
            'Phone Number Not Registered',
            'This phone number is not registered to any account.\n\nWould you like to sign up?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => navigate('registerCustomer', true) }
            ]
          );
        } else if (errorCode === 'INVALID_PASSWORD') {
          Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
        } else if (errorCode === 'DATABASE_CONNECTION_ERROR') {
          Alert.alert('Service Unavailable', 'The service is temporarily unavailable. Please try again in a few moments.');
        } else {
          Alert.alert('Sign in Failed', 'Unable to sign in. Please check your credentials and try again.');
        }
        return;
      }
    } catch (error) {
      console.error('❌ Login error caught in catch block:', error);
      
      // CRITICAL: Never allow login on error - explicitly return
      if (error.name === 'AbortError') {
        Alert.alert('Connection Timeout', 'The request took too long. Please check your internet connection and try again.');
      } else {
        Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      // CRITICAL: Ensure authentication state is NOT set
      setIsAuthenticated(false);
      setAuthToken(null);
      setUserType(null);
      
      return; // Explicitly return to prevent any further execution
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
      notifications,
      setNotifications,
      setMyBids,
      upcomingTrips,
      setUpcomingTrips,
      addTrip,
      isActiveDriver,
      toggleActiveDriverStatus,
      activeDrivers,
      setActiveDrivers,
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Dedicated Registration Screens
function RegisterCustomerScreen() {
  const { navigate, login } = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [passportFront, setPassportFront] = useState(null);
  const [passportBack, setPassportBack] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const takeSelfie = () => takePhotoGlobal(setSelfie);

  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!firstName || !lastName || !phoneNumber || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return;
    }
    if (!selfie) {
      Alert.alert('Selfie Required', 'Please take a selfie for verification');
      return;
    }
    if (!idFront || !idBack) {
      if (!passportFront || !passportBack) {
        Alert.alert('Document Required', 'Upload ID front/back or Passport front/back');
        return;
      }
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      
      // Normalize phone number
      let normalizedPhone = phoneNumber.trim();
      if (!normalizedPhone.startsWith('+')) {
        // If no + prefix, assume Botswana (+267)
        if (normalizedPhone.startsWith('267')) {
          normalizedPhone = '+' + normalizedPhone;
        } else if (normalizedPhone.length === 8) {
          normalizedPhone = '+267' + normalizedPhone;
        } else {
          normalizedPhone = '+267' + normalizedPhone;
        }
      }

      console.log('📝 Registering customer:', { firstName, lastName, phone: normalizedPhone });
      
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `${normalizedPhone.replace('+', '')}@ntsamaela.local`, // Generate email from phone
          password: password,
          firstName: firstName,
          lastName: lastName,
          phone: normalizedPhone,
          userType: 'CUSTOMER',
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Registration successful');
        Alert.alert('Success', 'Account created successfully! Please check your phone for the verification code.', [
      { text: 'OK', onPress: () => navigate('login', true) }
    ]);
      } else {
        console.error('❌ Registration failed:', data.error);
        const errorMessage = data.error?.message || 'Failed to create account. Please try again.';
        Alert.alert('Registration Failed', errorMessage);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Failed to create account. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigate('login', true)} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.nameRow}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="First Name" placeholderTextColor={colors.textTertiary} value={firstName} onChangeText={setFirstName} />
            <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="Last Name" placeholderTextColor={colors.textTertiary} value={lastName} onChangeText={setLastName} />
          </View>
          <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor={colors.textTertiary} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <View style={styles.passwordInputWrapper}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="Password" placeholderTextColor={colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.passwordIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.passwordIconText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordInputWrapper}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="Confirm Password" placeholderTextColor={colors.textTertiary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)} style={styles.passwordIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.passwordIconText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.documentsSection}>
            <Text style={styles.documentsTitle}>Identity Verification</Text>
            <Text style={styles.documentsSubtitle}>Selfie required; ID or Passport</Text>
            <RegistrationPhotoButton label="Selfie *" onPress={takeSelfie} preview={selfie} />
            <RegistrationPhotoButton label="ID Front *" onPress={() => showPhotoActionSheetGlobal(setIdFront)} preview={idFront} />
            <RegistrationPhotoButton label="ID Back *" onPress={() => showPhotoActionSheetGlobal(setIdBack)} preview={idBack} />
            <Text style={styles.documentNote}>Or use Passport instead:</Text>
            <RegistrationPhotoButton label="Passport Front" onPress={() => showPhotoActionSheetGlobal(setPassportFront)} preview={passportFront} />
            <RegistrationPhotoButton label="Passport Back" onPress={() => showPhotoActionSheetGlobal(setPassportBack)} preview={passportBack} />
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity style={styles.termsCheckbox} onPress={() => setAcceptTerms(!acceptTerms)}>
              <Text style={styles.checkboxText}>{acceptTerms ? '☑️' : '☐'}</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text> and <Text style={styles.termsLink}>Privacy Policy</Text></Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, isLoading && { opacity: 0.6 }]} 
            onPress={submit}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RegisterDriverScreen() {
  const { navigate, login } = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [driversLicenseFront, setDriversLicenseFront] = useState(null);
  const [driversLicenseBack, setDriversLicenseBack] = useState(null);
  const [carRegistration, setCarRegistration] = useState('');
  const [carDescription, setCarDescription] = useState('');
  const [carPhoto, setCarPhoto] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const takeSelfie = () => takePhotoGlobal(setSelfie);

  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!firstName || !lastName || !phoneNumber || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return;
    }
    if (!selfie) {
      Alert.alert('Selfie Required', 'Please take a selfie for verification');
      return;
    }
    if (!driversLicenseFront || !driversLicenseBack) {
      Alert.alert('Document Required', 'Upload both front and back of Driver\'s License');
      return;
    }
    if (!carRegistration || !carDescription) {
      Alert.alert('Car Details Required', 'Please enter car registration and description');
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      
      // Normalize phone number
      let normalizedPhone = phoneNumber.trim();
      if (!normalizedPhone.startsWith('+')) {
        // If no + prefix, assume Botswana (+267)
        if (normalizedPhone.startsWith('267')) {
          normalizedPhone = '+' + normalizedPhone;
        } else if (normalizedPhone.length === 8) {
          normalizedPhone = '+267' + normalizedPhone;
        } else {
          normalizedPhone = '+267' + normalizedPhone;
        }
      }

      console.log('📝 Registering driver:', { firstName, lastName, phone: normalizedPhone });
      
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `${normalizedPhone.replace('+', '')}@ntsamaela.local`, // Generate email from phone
          password: password,
          firstName: firstName,
          lastName: lastName,
          phone: normalizedPhone,
          userType: 'DRIVER',
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Registration successful');
        Alert.alert('Success', 'Account created successfully! Please check your phone for the verification code.', [
      { text: 'OK', onPress: () => navigate('login', true) }
    ]);
      } else {
        console.error('❌ Registration failed:', data.error);
        const errorMessage = data.error?.message || 'Failed to create account. Please try again.';
        Alert.alert('Registration Failed', errorMessage);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Failed to create account. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigate('login', true)} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.nameRow}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="First Name" placeholderTextColor={colors.textTertiary} value={firstName} onChangeText={setFirstName} />
            <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="Last Name" placeholderTextColor={colors.textTertiary} value={lastName} onChangeText={setLastName} />
          </View>
          <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor={colors.textTertiary} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <View style={styles.passwordInputWrapper}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="Password" placeholderTextColor={colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.passwordIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.passwordIconText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordInputWrapper}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="Confirm Password" placeholderTextColor={colors.textTertiary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)} style={styles.passwordIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.passwordIconText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.documentsSection}>
            <Text style={styles.documentsTitle}>Identity Verification</Text>
            <Text style={styles.documentsSubtitle}>Selfie and Driver's License</Text>
            <RegistrationPhotoButton label="Selfie *" onPress={takeSelfie} preview={selfie} />
            <RegistrationPhotoButton label="License Front *" onPress={() => showPhotoActionSheetGlobal(setDriversLicenseFront)} preview={driversLicenseFront} />
            <RegistrationPhotoButton label="License Back *" onPress={() => showPhotoActionSheetGlobal(setDriversLicenseBack)} preview={driversLicenseBack} />
          </View>

          <View style={styles.documentsSection}>
            <Text style={styles.documentsTitle}>Vehicle Information</Text>
            <Text style={styles.documentsSubtitle}>Car registration and description</Text>
            
            <Text style={styles.fieldLabel}>Car Registration *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., B123 ABC"
              placeholderTextColor={colors.textTertiary}
              value={carRegistration}
              onChangeText={setCarRegistration}
            />

            <Text style={styles.fieldLabel}>Car Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., White Toyota Corolla 2020"
              placeholderTextColor={colors.textTertiary}
              value={carDescription}
              onChangeText={setCarDescription}
            />

            <RegistrationPhotoButton label="Car Photo (Optional)" onPress={() => showPhotoActionSheetGlobal(setCarPhoto)} preview={carPhoto} />
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity style={styles.termsCheckbox} onPress={() => setAcceptTerms(!acceptTerms)}>
              <Text style={styles.checkboxText}>{acceptTerms ? '☑️' : '☐'}</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms and Conditions</Text> and <Text style={styles.termsLink}>Privacy Policy</Text></Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, isLoading && { opacity: 0.6 }]} 
            onPress={submit}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Forgot Password as a dedicated screen
function ForgotPasswordScreen() {
  const { navigate } = useNavigation();
  const [step, setStep] = useState('phone'); // phone -> otp -> new
  const [forgotPhone, setForgotPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  const sendOTP = () => {
    if (!forgotPhone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    setStep('otp');
  };

  const verifyOTP = () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    if (otpCode !== '123456') {
      Alert.alert('Error', 'Invalid OTP. Please try again');
      return;
    }
    setStep('new');
  };

  const resetPassword = () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    Alert.alert('Success', 'Password reset successfully! You can now login.', [
      { text: 'OK', onPress: () => navigate('login', true) }
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigate('login', true)} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.formContainer}>
          {step === 'phone' && (
            <View style={styles.formCard}>
              <Text style={styles.modalSubtitle}>Enter your phone number to receive a 6-digit OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.textTertiary}
                value={forgotPhone}
                onChangeText={setForgotPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.primaryButton} onPress={sendOTP}>
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.formCard}>
              <Text style={styles.modalSubtitle}>Enter the 6-digit OTP sent to {forgotPhone}</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                placeholderTextColor={colors.textTertiary}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={verifyOTP}>
                <Text style={styles.primaryButtonText}>Verify OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'new' && (
            <View style={styles.formCard}>
              <Text style={styles.modalSubtitle}>Create a new password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(p => !p)} style={styles.passwordIcon}>
                  <Text style={styles.passwordIconText}>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirmNew}
                />
                <TouchableOpacity onPress={() => setShowConfirmNew(p => !p)} style={styles.passwordIcon}>
                  <Text style={styles.passwordIconText}>{showConfirmNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={resetPassword}>
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
function useNavigation() {
  return React.useContext(NavigationContext);
}

// Animated Loading Screen with Typing Effect
function LoadingScreen() {
  const { navigate } = useNavigation();
  const [displayedText, setDisplayedText] = useState('');
  const [displayedSlogan, setDisplayedSlogan] = useState('');
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;

  const appName = 'NTSAMAELA';
  const slogan = 'Peer to Peer Package Delivery';

  useEffect(() => {
    // Show logo immediately (no animation)
    logoScale.setValue(1);
    logoOpacity.setValue(1);
    textOpacity.setValue(1);
    sloganOpacity.setValue(1);
    setDisplayedText(appName);
    setDisplayedSlogan(slogan); // Show slogan immediately without animation

    // Navigate to login after delay
    setTimeout(() => {
      navigate('login', true);
    }, 3000);
  }, []);

  const typeText = (text, setter, onComplete) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setter(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 100);
  };

  return (
    <View style={styles.loadingContainer}>
      <StatusBar style="light" />
      
      {/* Animated Logo */}
      <Animated.View 
        style={[
          styles.logoBigContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }
        ]}
      >
        <Text style={styles.logoBigN}>N</Text>
      </Animated.View>

      {/* App Name - Stationary */}
      <Text style={styles.logoTextBig}>{displayedText}</Text>

      {/* Slogan */}
      <Animated.View style={{ opacity: sloganOpacity }}>
        <Text style={styles.sloganBig}>{displayedSlogan}</Text>
      </Animated.View>
    </View>
  );
}

// Custom Input Modal Component (Android-compatible)
function InputModal({ visible, title, placeholder, onSubmit, onCancel, keyboardType = 'default' }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={setValue}
              keyboardType={keyboardType}
              autoFocus
            />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={handleCancel}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSubmit]}
              onPress={handleSubmit}
            >
              <Text style={styles.modalButtonTextSubmit}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Login Screen - Conventional Structure
function LoginScreen() {
  const { login, navigate } = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('267'); // Default to Botswana
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Common country codes
  const countryCodes = [
    { code: '267', country: 'Botswana', flag: '🇧🇼' },
    { code: '27', country: 'South Africa', flag: '🇿🇦' },
    { code: '254', country: 'Kenya', flag: '🇰🇪' },
    { code: '234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '233', country: 'Ghana', flag: '🇬🇭' },
    { code: '255', country: 'Tanzania', flag: '🇹🇿' },
    { code: '256', country: 'Uganda', flag: '🇺🇬' },
    { code: '260', country: 'Zambia', flag: '🇿🇲' },
    { code: '263', country: 'Zimbabwe', flag: '🇿🇼' },
    { code: '264', country: 'Namibia', flag: '🇳🇦' },
  ];
  
  // Identity document states
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [driversLicenseFront, setDriversLicenseFront] = useState(null);
  const [driversLicenseBack, setDriversLicenseBack] = useState(null);
  const [passportFront, setPassportFront] = useState(null);
  const [passportBack, setPassportBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  
  // Forgot password moved to dedicated screen
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPasswordVisible, setShowNewPasswordVisible] = useState(false);
  const [showConfirmNewPasswordVisible, setShowConfirmNewPasswordVisible] = useState(false);

  const handleForgotPassword = () => {
    navigate('forgotPassword', true);
  };

  const closeAllModals = () => {
    setShowForgotPassword(false);
    setShowOTP(false);
    setShowPasswordChange(false);
  };

  const handleSendOTP = () => {
    if (!forgotPhone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    
    // Close any existing modals first
    closeAllModals();
    
    // Simulate sending OTP
    Alert.alert('OTP Sent', `A 6-digit OTP has been sent to ${forgotPhone}`, [
      { text: 'OK', onPress: () => {
        // Small delay to ensure previous alert is closed
        setTimeout(() => setShowOTP(true), 100);
      }}
    ]);
  };

  const handleVerifyOTP = () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    
    // Simulate OTP verification
    if (otpCode === '123456') {
      Alert.alert('Success', 'OTP verified! Please enter your new password', [
        { text: 'OK', onPress: () => {
          // Close OTP modal and open password change modal
          setShowOTP(false);
          setTimeout(() => setShowPasswordChange(true), 100);
        }}
      ]);
    } else {
      Alert.alert('Error', 'Invalid OTP. Please try again');
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    Alert.alert('Success', 'Password reset successfully! You can now login with your new password', [
      { text: 'OK', onPress: () => {
        // Close all modals and reset form
        closeAllModals();
        setForgotPhone('');
        setOtpCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      }}
    ]);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
    return true;
  };

  // (moved) RegistrationPhotoButton defined at module scope

  const takePhoto = async (setter) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setter(result.assets[0]);
    }
  };

  const selectFromGallery = async (setter) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Media library permission is required to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setter(result.assets[0]);
    }
  };

  const showPhotoActionSheet = (setter) => {
    Alert.alert(
      'Select Document Photo',
      'Choose how you want to add the document photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => takePhoto(setter) },
        { text: 'Choose from Gallery', onPress: () => selectFromGallery(setter) },
      ]
    );
  };

  const handleAuth = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isLogin) {
      setIsLoading(true);
      try {
        // Normalize phone number with selected country code before calling login
        let normalizedPhone = phoneNumber.trim();
        // Remove any existing country code
        if (normalizedPhone.startsWith('+')) {
          normalizedPhone = normalizedPhone.substring(1);
        }
        // Remove country code if it's already in the number
        if (normalizedPhone.startsWith(countryCode)) {
          normalizedPhone = normalizedPhone.substring(countryCode.length);
        }
        // Add selected country code
        normalizedPhone = '+' + countryCode + normalizedPhone;
        
        console.log('🔐 handleAuth: Calling login with phone:', normalizedPhone);
        await login(normalizedPhone, password);
        console.log('🔐 handleAuth: Login function completed');
        
        // CRITICAL: Double-check authentication state after login
        // If login failed, isAuthenticated should still be false
        // This is a safety check in case something went wrong
      } catch (error) {
        console.error('❌ Login error in handleAuth catch block:', error);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        Alert.alert('Login Error', 'An error occurred during login. Please try again.');
        // CRITICAL: Ensure we don't allow login on error
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Sign Up: prompt role chooser and navigate to dedicated screens
    setShowRoleModal(true);
  };

  return (
    <KeyboardAvoidingView 
      behavior="padding"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style="light" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <SafeAreaView style={styles.loginContainer}>
          {/* Professional Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoN}>N</Text>
            </View>
            <Text style={styles.logoText}>NTSAMAELA</Text>
            <Text style={styles.slogan}>Re go tsamaela bosigo le motshegare</Text>
          </View>

          {/* Login/Signup Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
              onPress={() => { setIsLogin(false); setShowRoleModal(true); }}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card (only for Sign In). Sign Up uses dedicated screens */}
          {isLogin && (
          <View style={styles.formCard}>
            {/* Phone Number with Country Code */}
            <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                style={styles.countryCodeContainer}
                onPress={() => setShowCountryCodeModal(true)}
                >
                <Text style={styles.countryCodeText}>+{countryCode}</Text>
                <Text style={styles.countryCodeArrow}>▼</Text>
                </TouchableOpacity>
            <TextInput
                style={[styles.input, styles.phoneInput]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textTertiary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            </View>

            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showLoginPassword}
              />
              <TouchableOpacity onPress={() => setShowLoginPassword(p => !p)} style={styles.passwordIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.passwordIconText}>{showLoginPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} 
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>
          )}
        </SafeAreaView>
      </ScrollView>

      {/* Country Code Selection Modal */}
      <Modal visible={showCountryCodeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <ScrollView style={styles.countryCodeList}>
              {countryCodes.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.countryCodeItem,
                    countryCode === item.code && styles.countryCodeItemActive
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryCodeModal(false);
                  }}
                >
                  <Text style={styles.countryCodeFlag}>{item.flag}</Text>
                  <Text style={styles.countryCodeName}>{item.country}</Text>
                  <Text style={styles.countryCodeNumber}>+{item.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalCancelButton]} 
              onPress={() => setShowCountryCodeModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Account Type</Text>
            <Text style={styles.modalSubtitle}>Select how you want to register</Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.roleChoiceButton, { flex: 1, marginRight: 8 }]}
                onPress={() => { setShowRoleModal(false); navigate('registerCustomer'); }}
              >
                <Text style={styles.roleChoiceText}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleChoiceButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => { setShowRoleModal(false); navigate('registerDriver'); }}
              >
                <Text style={styles.roleChoiceText}>Driver</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.roleModalSpacing} />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* (old modals removed; dedicated Forgot Password screen is used) */}
    </KeyboardAvoidingView>
  );
}

// Customer Home Screen - moved to src/screens/CustomerHomeScreen.js

// Driver Home Screen
function DriverHomeScreen() {
  const { navigate, availablePackages, driverWallet, userProfile, isActiveDriver, toggleActiveDriverStatus, notifications } = useNavigation();
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);

  const handleNotifications = () => {
    navigate('notifications');
  };
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleActiveStatus = () => {
    const newStatus = !isActiveDriver;
    toggleActiveDriverStatus(newStatus);
    Alert.alert(
      newStatus ? 'Status: Active' : 'Status: Inactive',
      newStatus 
        ? 'You are now visible to customers! They can send you delivery requests.'
        : 'You are now invisible to customers. Turn on to appear in Active Drivers list.'
    );
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          {/* Redesigned minimal notification icon */}
          <TouchableOpacity style={styles.headerNotif} onPress={handleNotifications}>
            <Text style={styles.headerNotifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.headerNotifBadge}>
                <Text style={styles.headerNotifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Driver Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statValue}>{userProfile.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success }]}>
            <Text style={styles.statValue}>P {driverWallet}</Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statValue}>{userProfile.rating}</Text>
              <Text style={[styles.statValue, { marginLeft: 6 }]}>⭐</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Active Status Toggle */}
        <View style={styles.activeStatusContainer}>
          <View style={styles.activeStatusLeft}>
            <Text style={styles.activeStatusTitle}>Active Status</Text>
            <Text style={styles.activeStatusSubtitle}>
              {isActiveDriver ? 'Visible to customers' : 'Hidden from customers'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.activeToggle, isActiveDriver && styles.activeToggleOn]}
            onPress={handleToggleActiveStatus}
            activeOpacity={0.8}
          >
            <View style={[styles.activeToggleCircle, isActiveDriver && styles.activeToggleCircleOn]} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, !userProfile.isVerified && styles.actionCardDisabled]}
              onPress={() => userProfile.isVerified ? setShowCreateTripModal(true) : Alert.alert('Verification Required', 'Please wait for account verification to create trips')}
            >
              <View style={[styles.actionIcon, { backgroundColor: userProfile.isVerified ? '#00C853' : colors.border }]}>
                <Text style={styles.actionIconText}>➕</Text>
              </View>
              <Text style={[styles.actionText, !userProfile.isVerified && styles.actionTextDisabled]}>Create Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, !userProfile.isVerified && styles.actionCardDisabled]}
              onPress={() => userProfile.isVerified ? navigate('availablePackages') : Alert.alert('Verification Required', 'Please wait for account verification to browse packages')}
            >
              <View style={[styles.actionIcon, { backgroundColor: userProfile.isVerified ? colors.primary : colors.border }]}>
                <Text style={styles.actionIconText}>📦</Text>
              </View>
              <Text style={[styles.actionText, !userProfile.isVerified && styles.actionTextDisabled]}>Browse Packages</Text>
            </TouchableOpacity>


            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('myTrips')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
                <Text style={styles.actionIconText}>🚗</Text>
              </View>
              <Text style={styles.actionText}>My Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('wallet')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF6D00' }]}>
                <Text style={styles.actionIconText}>💰</Text>
              </View>
              <Text style={styles.actionText}>Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

      <CreateTripModal 
        visible={showCreateTripModal}
        onClose={() => setShowCreateTripModal(false)}
      />

        {/* Available Packages removed */}
      </ScrollView>
    </View>
  );
}

// Create Trip Modal
function CreateTripModal({ visible, onClose }) {
  const { addTrip } = useNavigation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const handleCreate = () => {
    if (!from || !to || !date || !time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    addTrip({ from, to, date, time });

    Alert.alert(
      'Trip Created',
      `Your trip from ${from.name} to ${to.name} on ${date} at ${time} has been created!\n\nCustomers can now suggest packages for this route.`,
      [
        { text: 'OK', onPress: () => {
          setFrom(null);
          setTo(null);
          setDate('');
          setTime('');
          onClose();
        }}
      ]
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
              <Text style={styles.modalTitle}>Create Trip</Text>
              <Text style={styles.modalSubtitle}>
                Create a trip so customers can suggest packages
              </Text>

            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>From *</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowFromModal(true)}
              >
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  {from ? (
                    <>
                      <Text style={styles.locationSelectedName}>{from.name}</Text>
                      <Text style={styles.locationSelectedAddress}>{from.address}</Text>
                    </>
                  ) : (
                    <Text style={styles.locationPlaceholder}>Select departure location...</Text>
                  )}
                </View>
                <Text style={styles.locationArrow}>›</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>To *</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowToModal(true)}
              >
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  {to ? (
                    <>
                      <Text style={styles.locationSelectedName}>{to.name}</Text>
                      <Text style={styles.locationSelectedAddress}>{to.address}</Text>
                    </>
                  ) : (
                    <Text style={styles.locationPlaceholder}>Select destination...</Text>
                  )}
                </View>
                <Text style={styles.locationArrow}>›</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Oct 28, 2025"
                placeholderTextColor={colors.textTertiary}
                value={date}
                onChangeText={setDate}
              />

              <Text style={styles.fieldLabel}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10:00 AM"
                placeholderTextColor={colors.textTertiary}
                value={time}
                onChangeText={setTime}
              />

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ Maximum 3 packages per trip. Customers will suggest packages for your route and you can accept, counter, or reject.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setFrom(null);
                  setTo(null);
                  setDate('');
                  setTime('');
                  onClose();
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleCreate}
              >
                <Text style={styles.modalButtonTextSubmit}>Create Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <LocationSearchModal
        visible={showFromModal}
        title="Select Departure Location"
        onSelect={(location) => {
          setFrom(location);
          setShowFromModal(false);
        }}
        onCancel={() => setShowFromModal(false)}
      />

      <LocationSearchModal
        visible={showToModal}
        title="Select Destination"
        onSelect={(location) => {
          setTo(location);
          setShowToModal(false);
        }}
        onCancel={() => setShowToModal(false)}
      />
    </>
  );
}

// Helper function to decode polyline
const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    poly.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return poly;
};

// Location Search Modal with Map
function LocationSearchModal({ visible, title, onSelect, onCancel, showRoute = false, routeStart = null, routeEnd = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -24.6282, // Gaborone default
    longitude: 25.9231,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const mapRef = useRef(null);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Update map region
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(newRegion);
      
      // Reverse geocode to get address
      await reverseGeocode(latitude, longitude);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        // Fallback to sample location if API key not configured
        const sampleLocation = {
          name: 'Selected Location',
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(sampleLocation);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = {
          name: result.formatted_address.split(',')[0],
          address: result.formatted_address,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      } else {
        const location = {
          name: 'Selected Location',
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const location = {
        name: 'Selected Location',
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      };
      setSelectedLocation(location);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for addresses
  const searchAddresses = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        // Fallback to sample locations if API key not configured
        const sampleLocations = [
          { id: 1, name: 'Gaborone Main Mall', address: 'The Mall, Gaborone', lat: -24.6282, lng: 25.9231 },
          { id: 2, name: 'Sir Seretse Khama Airport', address: 'Airport Road, Gaborone', lat: -24.5552, lng: 25.9182 },
          { id: 3, name: 'Francistown Bus Rank', address: 'Blue Jacket St, Francistown', lat: -21.1700, lng: 27.5083 },
        ];
        const filtered = sampleLocations.filter(loc =>
          loc.name.toLowerCase().includes(query.toLowerCase()) ||
          loc.address.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
        setIsLoading(false);
        return;
      }

      // Use Places API (New) - Autocomplete
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ['bw'],
            languageCode: 'en'
          })
        }
      );
      const data = await response.json();
      
      if (data.suggestions) {
        const results = await Promise.all(
          data.suggestions.slice(0, 5).map(async (suggestion) => {
            if (suggestion.placePrediction?.placeId) {
              // Get place details using Places API (New)
              const detailsResponse = await fetch(
                `https://places.googleapis.com/v1/places/${suggestion.placePrediction.placeId}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
                  }
                }
              );
              const detailsData = await detailsResponse.json();
              
              if (detailsData.location) {
                return {
                  id: detailsData.id || suggestion.placePrediction.placeId,
                  name: detailsData.displayName?.text || suggestion.placePrediction.text?.text || 'Unknown',
                  address: detailsData.formattedAddress || suggestion.placePrediction.text?.text || '',
                  lat: detailsData.location.latitude || 0,
                  lng: detailsData.location.longitude || 0,
                };
              }
            }
            return null;
          })
        );
        setSearchResults(results.filter(r => r !== null));
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle map region change (when user drags map)
  const handleRegionChangeComplete = (region) => {
    setMapRegion(region);
    reverseGeocode(region.latitude, region.longitude);
  };

  // Load route if showRoute is true
  useEffect(() => {
    if (showRoute && routeStart && routeEnd && visible) {
      const loadRoute = async () => {
        try {
          const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) return;

          const origin = `${routeStart.lat},${routeStart.lng}`;
          const destination = `${routeEnd.lat},${routeEnd.lng}`;
          
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`
          );
          const data = await response.json();

          if (data.status === 'OK' && data.routes[0]) {
            const polyline = decodePolyline(data.routes[0].overview_polyline.points);
            setRoutePolyline(polyline);
            
            // Fit map to show entire route
            if (polyline.length > 0 && mapRef.current) {
              const coordinates = polyline;
              const minLat = Math.min(...coordinates.map(c => c.latitude));
              const maxLat = Math.max(...coordinates.map(c => c.latitude));
              const minLng = Math.min(...coordinates.map(c => c.longitude));
              const maxLng = Math.max(...coordinates.map(c => c.longitude));
              
              const padding = 0.1;
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              });
            }
          }
        } catch (error) {
          console.error('Error loading route:', error);
        }
      };
      loadRoute();
    } else {
      setRoutePolyline(null);
    }
  }, [showRoute, routeStart, routeEnd, visible]);

  // Handle search query change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAddresses(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
  const handleSearchResultSelect = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.address);
    setSearchResults([]);
    
    const newRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(newRegion);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleSelect = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      setSearchQuery('');
      setSelectedLocation(null);
      setSearchResults([]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {
      onCancel();
      setSearchQuery('');
      setSelectedLocation(null);
      setSearchResults([]);
    }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '90%' }]}>
            <Text style={styles.modalTitle}>{title}</Text>
            
            {/* Search Input */}
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <TextInput
                style={styles.modalInput}
                placeholder="Search location or drag map..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isLoading && (
                <View style={{ position: 'absolute', right: 12, top: 12 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 12, backgroundColor: colors.cardBg, borderRadius: 8 }}>
                {searchResults.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.locationItem}
                    onPress={() => handleSearchResultSelect(location)}
                  >
                    <Text style={styles.locationIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Text style={styles.locationAddress}>{location.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Map View */}
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                region={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={false}
                mapType="standard"
              >
                {/* Route polyline */}
                {routePolyline && routePolyline.length > 0 && (
                  <Polyline
                    coordinates={routePolyline}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                  />
                )}
                
                {/* Route start marker */}
                {showRoute && routeStart && (
                  <Marker
                    coordinate={{
                      latitude: routeStart.lat,
                      longitude: routeStart.lng,
                    }}
                    title="Start"
                    pinColor={colors.success}
                  />
                )}
                
                {/* Route end marker */}
                {showRoute && routeEnd && (
                  <Marker
                    coordinate={{
                      latitude: routeEnd.lat,
                      longitude: routeEnd.lng,
                    }}
                    title="End"
                    pinColor={colors.error}
                  />
                )}
                
                {/* Selected location marker */}
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      reverseGeocode(latitude, longitude);
                    }}
                  />
                )}
              </MapView>
              
              {/* Current Location Button */}
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.currentLocationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Selected Location Info */}
            {selectedLocation && (
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{selectedLocation.name}</Text>
                  <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  onCancel();
                  setSearchQuery('');
                  setSelectedLocation(null);
                  setSearchResults([]);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSubmit,
                  (!selectedLocation || isLoading) && { opacity: 0.5 }
                ]}
                onPress={handleSelect}
                disabled={!selectedLocation || isLoading}
              >
                <Text style={styles.modalButtonTextSubmit}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Create Package for Driver Modal
function CreatePackageForDriverModal({ visible, driver, onClose }) {
  const [description, setDescription] = useState('');
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const driverName = driver?.driver || 'this driver';

  const handleSubmit = () => {
    if (!description || !pickup || !delivery || !recipientPhone || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert('Error', 'Please enter a valid Botswana phone number (e.g., 71234567)');
      return;
    }

    const platformFee = (parseFloat(price) * 0.3).toFixed(2);
    const driverEarnings = (parseFloat(price) * 0.7).toFixed(2);

    Alert.alert(
      'Request Sent',
      `Package delivery request sent to ${driverName}!\n\nPackage: ${description}\nFrom: ${pickup.name}\nTo: ${delivery.name}\nOffering: P ${price}\n\n${driverName} will receive P ${driverEarnings} (after P ${platformFee} platform fee).\n\nThey can accept, reject, or counter your offer.`,
      [
        { text: 'OK', onPress: () => {
          setDescription('');
          setPickup(null);
          setDelivery(null);
          setRecipientPhone('');
          setWeight('');
          setPrice('');
          onClose();
        }}
      ]
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {
        setDescription('');
        setPickup(null);
        setDelivery(null);
        setRecipientPhone('');
        setWeight('');
        setPrice('');
        onClose();
      }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: '90%' }]}>
              <Text style={styles.modalTitle}>Create Package for {driverName}</Text>
              <Text style={styles.modalSubtitle}>
                Send a delivery request directly to this driver
              </Text>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Electronics, Documents, Clothing"
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={styles.fieldLabel}>Pickup Location *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowPickupModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {pickup ? (
                      <>
                        <Text style={styles.locationSelectedName}>{pickup.name}</Text>
                        <Text style={styles.locationSelectedAddress}>{pickup.address}</Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>Select pickup location...</Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Delivery Location *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowDeliveryModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {delivery ? (
                      <>
                        <Text style={styles.locationSelectedName}>{delivery.name}</Text>
                        <Text style={styles.locationSelectedAddress}>{delivery.address}</Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>Select delivery location...</Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Recipient Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 71234567"
                  placeholderTextColor={colors.textTertiary}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  maxLength={8}
                />

                <Text style={styles.fieldLabel}>Weight (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2 kg"
                  placeholderTextColor={colors.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                />

                <Text style={styles.fieldLabel}>Offering Price (P) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 150"
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Platform charges 30% fee. Driver will receive 70% of your offered price. They can accept, counter, or reject your offer.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setDescription('');
                    setPickup(null);
                    setDelivery(null);
                    setRecipientPhone('');
                    setWeight('');
                    setPrice('');
                    onClose();
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.modalButtonTextSubmit}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LocationSearchModal
        visible={showPickupModal}
        title="Select Pickup Location"
        onSelect={(location) => {
          setPickup(location);
          setShowPickupModal(false);
        }}
        onCancel={() => setShowPickupModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />

      <LocationSearchModal
        visible={showDeliveryModal}
        title="Select Delivery Location"
        onSelect={(location) => {
          setDelivery(location);
          setShowDeliveryModal(false);
        }}
        onCancel={() => setShowDeliveryModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />
    </>
  );
}

// Create Package Screen (Customer)
function CreatePackageScreen() {
  const { navigate, goBack } = useNavigation();
  const [description, setDescription] = useState('');
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [packagePhoto, setPackagePhoto] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Calculate route distance and duration using Distance Matrix API
  const calculateRoute = async (pickupLoc, deliveryLoc) => {
    if (!pickupLoc || !deliveryLoc) {
      setRouteInfo(null);
      return;
    }

    try {
      setIsCalculatingRoute(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setRouteInfo(null);
        return;
      }

      // Use Distance Matrix API
      const origin = `${pickupLoc.lat},${pickupLoc.lng}`;
      const destination = `${deliveryLoc.lat},${deliveryLoc.lng}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}&units=metric`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        setRouteInfo({
          distance: element.distance.text,
          distanceValue: element.distance.value, // in meters
          duration: element.duration.text,
          durationValue: element.duration.value, // in seconds
        });
      } else {
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteInfo(null);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Get route polyline using Directions API
  const getRoutePolyline = async (pickupLoc, deliveryLoc) => {
    if (!pickupLoc || !deliveryLoc) return null;

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return null;

      const origin = `${pickupLoc.lat},${pickupLoc.lng}`;
      const destination = `${deliveryLoc.lat},${deliveryLoc.lng}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.routes[0]) {
        // Decode polyline
        const polyline = data.routes[0].overview_polyline.points;
        return polyline;
      }
      return null;
    } catch (error) {
      console.error('Error getting route polyline:', error);
      return null;
    }
  };

  // Update route when pickup or delivery changes
  useEffect(() => {
    if (pickup && delivery) {
      calculateRoute(pickup, delivery);
    } else {
      setRouteInfo(null);
    }
  }, [pickup, delivery]);

  const handlePhotoSelection = async () => {
    const { status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permission to take photos');
      return;
    }

    Alert.alert(
      'Add Package Photo',
      'Choose photo source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPackagePhoto(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPackagePhoto(result.assets[0].uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCreate = async () => {
    if (!description || !pickup || !delivery || !recipientPhone || !price || !deliveryDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert('Error', 'Please enter a valid Botswana phone number (e.g., 71234567)');
      return;
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      const response = await fetch(`${apiUrl}/api/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          description,
          pickupAddress: pickup.address,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          deliveryAddress: delivery.address,
          deliveryLat: delivery.lat,
          deliveryLng: delivery.lng,
          priceOffered: parseFloat(price),
          weight: parseFloat(weight),
          deliveryDate: new Date(deliveryDate).toISOString(),
          urgency: urgency.toUpperCase(),
          recipientPhone
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Package created successfully!\n\nDrivers can now bid on your package.', [
          { text: 'OK', onPress: () => goBack() }
        ]);
      } else {
        Alert.alert('Error', data.error.message);
      }
    } catch (error) {
      console.error('Create package error:', error);
      Alert.alert('Error', 'Failed to create package. Please try again.');
    }
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Package</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.formContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Package Details Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>📦 Package Details</Text>
            
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Electronics, Documents, Clothing"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2.5 (optional)"
              placeholderTextColor={colors.textTertiary}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Your Offering Price (P) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 150"
              placeholderTextColor={colors.textTertiary}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Desired Delivery Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2024-01-15"
              placeholderTextColor={colors.textTertiary}
              value={deliveryDate}
              onChangeText={setDeliveryDate}
            />

            <Text style={styles.fieldLabel}>Urgency Level *</Text>
            <View style={styles.urgencyContainer}>
              {['normal', 'urgent', 'same-day'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyButton,
                    urgency === level && styles.urgencyButtonActive
                  ]}
                  onPress={() => setUrgency(level)}
                >
                  <Text style={[
                    styles.urgencyButtonText,
                    urgency === level && styles.urgencyButtonTextActive
                  ]}>
                    {level === 'normal' ? 'Normal' : level === 'urgent' ? 'Urgent' : 'Same Day'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>🗺️ Delivery Route</Text>
            
            <Text style={styles.fieldLabel}>Pickup Location *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowPickupModal(true)}
            >
              <Text style={styles.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                {pickup ? (
                  <>
                    <Text style={styles.locationSelectedName}>{pickup.name}</Text>
                    <Text style={styles.locationSelectedAddress}>{pickup.address}</Text>
                  </>
                ) : (
                  <Text style={styles.locationPlaceholder}>Search on map...</Text>
                )}
              </View>
              <Text style={styles.locationArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Delivery Location *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowDeliveryModal(true)}
            >
              <Text style={styles.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                {delivery ? (
                  <>
                    <Text style={styles.locationSelectedName}>{delivery.name}</Text>
                    <Text style={styles.locationSelectedAddress}>{delivery.address}</Text>
                  </>
                ) : (
                  <Text style={styles.locationPlaceholder}>Search on map...</Text>
                )}
              </View>
              <Text style={styles.locationArrow}>›</Text>
            </TouchableOpacity>

            {pickup && delivery && (
              <View style={styles.routeInfo}>
                {isCalculatingRoute ? (
                  <Text style={styles.routeInfoText}>Calculating route...</Text>
                ) : routeInfo ? (
                  <>
                    <View style={styles.routeInfoRow}>
                      <Text style={styles.routeInfoIcon}>📏</Text>
                      <Text style={styles.routeInfoText}>
                        Distance: <Text style={styles.routeInfoValue}>{routeInfo.distance}</Text>
                      </Text>
                    </View>
                    <View style={styles.routeInfoRow}>
                      <Text style={styles.routeInfoIcon}>⏱️</Text>
                      <Text style={styles.routeInfoText}>
                        Estimated Time: <Text style={styles.routeInfoValue}>{routeInfo.duration}</Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.routeInfoText}>
                    ✓ Route will be calculated when driver accepts
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Recipient Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>👤 Recipient Information</Text>
            
            <Text style={styles.fieldLabel}>Recipient Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 71234567"
              placeholderTextColor={colors.textTertiary}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
              maxLength={8}
            />
            <Text style={styles.fieldHint}>
              Delivery confirmation code will be sent to this number
            </Text>
          </View>

          {/* Photo Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>📷 Package Photo</Text>
            
            {packagePhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: packagePhoto }} style={styles.photoImage} />
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={handlePhotoSelection}
                >
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addPhotoButton}
                onPress={handlePhotoSelection}
              >
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Package Photo (Optional)</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>Create Package</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <LocationSearchModal
        visible={showPickupModal}
        title="Select Pickup Location"
        onSelect={(location) => {
          setPickup(location);
          setShowPickupModal(false);
        }}
        onCancel={() => setShowPickupModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />

      <LocationSearchModal
        visible={showDeliveryModal}
        title="Select Delivery Location"
        onSelect={(location) => {
          setDelivery(location);
          setShowDeliveryModal(false);
        }}
        onCancel={() => setShowDeliveryModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />
    </View>
  );
}

// My Packages Screen (Customer)
function MyPackagesScreen() {
  const { goBack, myPackages } = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);

  const pendingPackages = [
    { 
      id: 'PKG-004', 
      description: 'Laptop and accessories', 
      pickup: 'Gaborone', 
      delivery: 'Francistown',
      price: 250,
      status: 'pending',
      bids: [
        { id: 1, driver: 'Thabo Mokoena', photo: 'https://i.pravatar.cc/150?img=12', rating: 4.8, amount: 220, trips: 234 },
        { id: 2, driver: 'Neo Sedimo', photo: 'https://i.pravatar.cc/150?img=47', rating: 4.9, amount: 200, trips: 189 },
        { id: 3, driver: 'Mpho Kgosi', photo: 'https://i.pravatar.cc/150?img=33', rating: 4.7, amount: 240, trips: 156 },
      ]
    },
  ];

  const inTransitPackages = myPackages.filter(p => p.status === 'in-transit').map(p => ({
    ...p,
    currentLocation: 'Palapye',
    eta: '45 minutes',
    progress: 65
  }));

  const deliveredPackages = myPackages.filter(p => p.status === 'delivered');

  const handleViewBids = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidsModal(true);
  };

  const handleAcceptBid = (bid) => {
    Alert.alert(
      'Accept Bid',
      `Accept ${bid.driver}'s bid of P ${bid.amount}?\n\n• Platform fee (30%): P ${(bid.amount * 0.3).toFixed(2)}\n• You pay: P ${bid.amount}\n• Driver receives: P ${(bid.amount * 0.7).toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            setShowBidsModal(false);
            Alert.alert('Success', `Bid accepted! Driver ${bid.driver} will be notified.`);
          }
        }
      ]
    );
  };

  const handleRejectBid = (bid) => {
    Alert.alert('Bid Rejected', `${bid.driver}'s bid has been rejected.`);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Packages</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {/* Pending Packages */}
          {pendingPackages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>⏳ Pending ({pendingPackages.length})</Text>
              {pendingPackages.map(pkg => (
                <TouchableOpacity
                  key={pkg.id}
                  style={styles.packageCard}
                  onPress={() => handleViewBids(pkg)}
                >
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageId}>{pkg.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#FFA500' }]}>
                      <Text style={styles.statusText}>{pkg.bids.length} bids</Text>
                    </View>
                  </View>
                  <Text style={styles.packageDesc}>{pkg.description}</Text>
                  <View style={styles.packageRoute}>
                    <Text style={styles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={styles.packageArrow}>→</Text>
                    <Text style={styles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={styles.packageFooter}>
                    <Text style={styles.packageDriver}>Your offer: P {pkg.price}</Text>
                    <Text style={styles.viewBidsText}>Tap to view bids →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* In Transit Packages */}
          {inTransitPackages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🚚 In Transit ({inTransitPackages.length})</Text>
              {inTransitPackages.map(pkg => (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageId}>{pkg.id}</Text>
                    <View style={[styles.statusBadge, getStatusColor('in-transit')]}>
                      <Text style={styles.statusText}>In Transit</Text>
                    </View>
                  </View>
                  <Text style={styles.packageDesc}>{pkg.description}</Text>
                  <View style={styles.packageRoute}>
                    <Text style={styles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={styles.packageArrow}>→</Text>
                    <Text style={styles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={styles.trackingBox}>
                    <Text style={styles.trackingText}>📍 Current: {pkg.currentLocation}</Text>
                    <Text style={styles.trackingText}>🕒 ETA: {pkg.eta}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pkg.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{pkg.progress}% complete</Text>
                  </View>
                  <View style={styles.packageFooter}>
                    {pkg.driverPhoto && (
                      <Image 
                        source={{ uri: pkg.driverPhoto }} 
                        style={styles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageDriver}>Driver: {pkg.driver}</Text>
                    </View>
                    <Text style={styles.packagePrice}>P {pkg.price}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Delivered Packages */}
          {deliveredPackages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>✅ Delivered ({deliveredPackages.length})</Text>
              {deliveredPackages.map(pkg => (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageId}>{pkg.id}</Text>
                    <View style={[styles.statusBadge, getStatusColor('delivered')]}>
                      <Text style={styles.statusText}>Delivered</Text>
                    </View>
                  </View>
                  <Text style={styles.packageDesc}>{pkg.description}</Text>
                  <View style={styles.packageRoute}>
                    <Text style={styles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={styles.packageArrow}>→</Text>
                    <Text style={styles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={styles.packageFooter}>
                    {pkg.driverPhoto && (
                      <Image 
                        source={{ uri: pkg.driverPhoto }} 
                        style={styles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageDriver}>Driver: {pkg.driver}</Text>
                    </View>
                    <Text style={styles.packagePrice}>P {pkg.price}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bids Modal */}
      <Modal visible={showBidsModal} transparent animationType="slide" onRequestClose={() => setShowBidsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>
                Bids for {selectedPackage?.id}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBidsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Your offer: P {selectedPackage?.price}
            </Text>

            <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
              {selectedPackage?.bids.map(bid => (
                <View key={bid.id} style={styles.bidCard}>
                  <View style={styles.bidHeader}>
                    {bid.photo && (
                      <Image 
                        source={{ uri: bid.photo }} 
                        style={styles.bidDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bidDriverName}>{bid.driver}</Text>
                      <Text style={styles.bidDriverMeta}>
                        {bid.rating} ⭐ • {bid.trips} trips
                      </Text>
                    </View>
                    <Text style={styles.bidAmount}>P {bid.amount}</Text>
                  </View>
                  <View style={styles.bidFeeInfo}>
                    <Text style={styles.bidFeeText}>Platform fee (30%): P {(bid.amount * 0.3).toFixed(2)}</Text>
                    <Text style={styles.bidFeeText}>Driver receives: P {(bid.amount * 0.7).toFixed(2)}</Text>
                  </View>
                  <View style={styles.bidActions}>
                    <TouchableOpacity
                      style={[styles.bidButton, styles.bidRejectButton]}
                      onPress={() => handleRejectBid(bid)}
                    >
                      <Text style={styles.bidRejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bidButton, styles.bidAcceptButton]}
                      onPress={() => handleAcceptBid(bid)}
                    >
                      <Text style={styles.bidAcceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowBidsModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Available Drivers Screen (Customer)
function AvailableDriversScreen() {
  const { goBack, myPackages, upcomingTrips, activeDrivers } = useNavigation();
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const handleSuggestPackage = (trip) => {
    if (myPackages.length === 0) {
      Alert.alert('No Packages', 'You need to create a package first before suggesting it to drivers.');
      return;
    }
    setSelectedTrip(trip);
    setShowSuggestModal(true);
  };

  const handleCreatePackageForDriver = (driver) => {
    setSelectedDriver(driver);
    setShowCreatePackageModal(true);
  };

  const handleSubmitSuggestion = () => {
    if (!selectedPackageId) {
      Alert.alert('Error', 'Please select a package to suggest');
      return;
    }
    
    const pkg = myPackages.find(p => p.id === selectedPackageId);
    setShowSuggestModal(false);
    
    Alert.alert(
      'Suggestion Sent',
      `Your package "${pkg.description}" has been suggested to ${selectedTrip.driver}.\n\nThey will review and respond to your request.`
    );
    
    setSelectedTrip(null);
    setSelectedPackageId(null);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Drivers</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>🟢 Active Now</Text>
          <Text style={styles.sectionHint}>Tap any driver to create a package delivery request</Text>
          {activeDrivers.map(driver => (
            <TouchableOpacity 
              key={driver.id} 
              style={styles.driverCard}
              onPress={() => handleCreatePackageForDriver(driver)}
              activeOpacity={0.7}
            >
              <View style={styles.driverCardContent}>
                {driver.photo && (
                  <Image 
                    source={{ uri: driver.photo }} 
                    style={styles.driverPhoto}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.driverDetails}>
                  <View style={styles.driverHeader}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.driver}</Text>
                      <View style={styles.driverMeta}>
                        <Text style={styles.driverRating}>{driver.rating} ⭐</Text>
                        <Text style={styles.driverTrips}> • {driver.totalDeliveries} deliveries</Text>
                      </View>
                    </View>
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeText}>● Active</Text>
                    </View>
                  </View>
                  <Text style={styles.driverLocation}>📍 {driver.location}</Text>
                  <Text style={styles.driverVehicle}>🚗 {driver.vehicle}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>🚗 Upcoming Trips</Text>
          <Text style={styles.sectionHint}>Tap to create a package delivery request for this trip</Text>
          {upcomingTrips.map(trip => (
            <TouchableOpacity 
              key={trip.id} 
              style={styles.tripCard}
              onPress={() => handleCreatePackageForDriver(trip)}
              activeOpacity={0.7}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.driverName}>{trip.driver}</Text>
                <Text style={styles.driverRating}>{trip.rating} ⭐</Text>
              </View>
              <View style={styles.tripRoute}>
                <Text style={styles.tripLocation}>📍 {trip.from}</Text>
                <Text style={styles.packageArrow}>→</Text>
                <Text style={styles.tripLocation}>📍 {trip.to}</Text>
              </View>
              <View style={styles.tripFooter}>
                <Text style={styles.tripDate}>🕒 {trip.date}</Text>
                <Text style={styles.tripSpaces}>{trip.spacesLeft} spaces left</Text>
              </View>
              <View style={styles.tripPrice}>
                <Text style={styles.tripPriceText}>Starting from {trip.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Package Suggestion Modal - OLD, KEPT FOR REFERENCE */}
      <Modal visible={showSuggestModal} transparent animationType="slide" onRequestClose={() => {
        setShowSuggestModal(false);
        setSelectedTrip(null);
        setSelectedPackageId(null);
      }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Suggest Package</Text>
            <Text style={styles.modalSubtitle}>
              Select which package to suggest to {selectedTrip?.driver}
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {myPackages.map(pkg => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageSelectItem,
                    selectedPackageId === pkg.id && styles.packageSelectItemActive
                  ]}
                  onPress={() => setSelectedPackageId(pkg.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageSelectId}>{pkg.id}</Text>
                    <Text style={styles.packageSelectDesc}>{pkg.description}</Text>
                    <Text style={styles.packageSelectRoute}>
                      {pkg.pickup} → {pkg.delivery}
                    </Text>
                  </View>
                  {selectedPackageId === pkg.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowSuggestModal(false);
                  setSelectedTrip(null);
                  setSelectedPackageId(null);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSubmitSuggestion}
              >
                <Text style={styles.modalButtonTextSubmit}>Suggest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Package for Driver Modal */}
      <CreatePackageForDriverModal 
        visible={showCreatePackageModal}
        driver={selectedDriver}
        onClose={() => {
          setShowCreatePackageModal(false);
          setSelectedDriver(null);
        }}
      />
    </View>
  );
}

// Available Packages Screen (Driver)
function AvailablePackagesScreen() {
  const { goBack, availablePackages } = useNavigation();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const handleAccept = (pkg) => {
    const yourEarnings = (pkg.price * 0.7).toFixed(2);
    const platformFee = (pkg.price * 0.3).toFixed(2);
    
    Alert.alert(
      'Accept Package',
      `Accept ${pkg.id} for P ${pkg.price}?\n\nYou get: P ${yourEarnings}\nPlatform fee: P ${platformFee} (30%)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => Alert.alert('Success', `Package ${pkg.id} accepted! Customer will be notified.`)
        }
      ]
    );
  };

  const handleCounterBid = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidModal(true);
  };

  const handleBidSubmit = (amount) => {
    setShowBidModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const yourEarnings = (parseFloat(amount) * 0.7).toFixed(2);
      Alert.alert('Success', `Counter bid of P ${amount} placed!\n\nIf accepted, you'll receive P ${yourEarnings} (after 30% platform fee)`);
    } else {
      Alert.alert('Error', 'Please enter a valid bid amount');
    }
    setSelectedPackage(null);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Packages</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {availablePackages.map(pkg => (
            <View key={pkg.id} style={styles.packageCardWithPhoto}>
              {pkg.photo && (
                <Image 
                  source={{ uri: pkg.photo }} 
                  style={styles.packagePhoto}
                  resizeMode="cover"
                />
              )}
              <View style={styles.packageContent}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageId}>{pkg.id}</Text>
                  <Text style={styles.packagePrice}>P {pkg.price}</Text>
                </View>
                <Text style={styles.packageDesc}>{pkg.description}</Text>
                <Text style={styles.packageCustomer}>Customer: {pkg.customer}</Text>
                <View style={styles.packageRoute}>
                  <Text style={styles.packageLocation}>📍 {pkg.pickup}</Text>
                  <Text style={styles.packageArrow}>→</Text>
                  <Text style={styles.packageLocation}>📍 {pkg.delivery}</Text>
                </View>
                <Text style={styles.packageInfo}>{pkg.weight} • {pkg.distance}</Text>
                
                <View style={styles.packageActions}>
                  <TouchableOpacity 
                    style={[styles.packageActionButton, styles.acceptButton]}
                    onPress={() => handleAccept(pkg)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.packageActionButton, styles.counterButton]}
                    onPress={() => handleCounterBid(pkg)}
                  >
                    <Text style={styles.counterButtonText}>Counter Bid</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <InputModal
        visible={showBidModal}
        title={selectedPackage ? `Counter Bid for ${selectedPackage.id}` : 'Counter Bid'}
        placeholder="Enter your bid amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleBidSubmit}
        onCancel={() => {
          setShowBidModal(false);
          setSelectedPackage(null);
        }}
      />
    </View>
  );
}

// My Bids Screen removed

// My Trips Screen (Driver)
function MyTripsScreen() {
  const { goBack } = useNavigation();
  const [showCounterBidModal, setShowCounterBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const myTrips = [
    {
      id: 'TRIP-001',
      from: 'Gaborone',
      to: 'Francistown',
      date: 'Oct 26, 10:00 AM',
      spacesTotal: 3,
      spacesUsed: 1,
      packages: [
        { id: 'PKG-005', customer: 'Lesego Tau', photo: 'https://i.pravatar.cc/150?img=28', item: 'Documents', fee: 120, status: 'accepted' }
      ],
      suggestions: [
        { id: 'PKG-006', customer: 'Kgosi Molefe', photo: 'https://i.pravatar.cc/150?img=51', item: 'Electronics', suggestedFee: 150 },
      ]
    }
  ];

  const handleAcceptSuggestion = (trip, pkg) => {
    if (trip.spacesUsed >= trip.spacesTotal) {
      Alert.alert('Error', 'Trip is full. Maximum 3 packages per trip.');
      return;
    }
    Alert.alert(
      'Accept Package',
      `Accept ${pkg.customer}'s package for P ${pkg.suggestedFee}?\n\n• Platform fee (30%): P ${(pkg.suggestedFee * 0.3).toFixed(2)}\n• You receive: P ${(pkg.suggestedFee * 0.7).toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => Alert.alert('Success', 'Package accepted! Customer will be notified.')
        }
      ]
    );
  };

  const handleCounterBid = async (pkg) => {
    if (!userProfile.isVerified) {
      Alert.alert('Verification Required', 'Please wait for account verification to place bids');
      return;
    }
    
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      const response = await fetch(`${apiUrl}/api/bids/package/${pkg.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectedPackage(pkg);
        setShowCounterBidModal(true);
      } else {
        Alert.alert('Error', data.error.message);
      }
    } catch (error) {
      console.error('Get bids error:', error);
      Alert.alert('Error', 'Failed to load bids. Please try again.');
    }
  };

  const handleCounterBidSubmit = async (amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000';
      const response = await fetch(`${apiUrl}/api/bids/${selectedPackage.id}/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          message: `Counter offer: P${amount}`
        })
      });

      const data = await response.json();

      if (data.success) {
        const counterAmount = parseFloat(amount);
        const yourEarnings = (counterAmount * 0.7).toFixed(2);
        const platformFee = (counterAmount * 0.3).toFixed(2);
        
        setShowCounterBidModal(false);
        
        Alert.alert(
          'Counter Offer Sent',
          `Your counter offer of P ${counterAmount} has been sent to ${selectedPackage.customer}.\n\n• You'll receive: P ${yourEarnings}\n• Platform fee (30%): P ${platformFee}\n\nWaiting for customer to accept or reject your offer.`,
          [{ text: 'OK', onPress: () => setSelectedPackage(null) }]
        );
      } else {
        Alert.alert('Error', data.error.message);
      }
    } catch (error) {
      console.error('Counter bid error:', error);
      Alert.alert('Error', 'Failed to submit counter bid. Please try again.');
    }
  };

  const handleRejectSuggestion = (pkg) => {
    Alert.alert('Reject Package', `${pkg.customer}'s package suggestion rejected.`);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Trips</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {myTrips.length > 0 ? (
            myTrips.map(trip => (
              <View key={trip.id} style={styles.tripDetailCard}>
                <View style={styles.tripDetailHeader}>
                  <Text style={styles.tripDetailId}>{trip.id}</Text>
                  <View style={styles.spacesIndicator}>
                    <Text style={styles.spacesText}>
                      {trip.spacesUsed}/{trip.spacesTotal} packages
                    </Text>
                  </View>
                </View>

                <View style={styles.tripRoute}>
                  <Text style={styles.tripLocation}>📍 {trip.from}</Text>
                  <Text style={styles.packageArrow}>→</Text>
                  <Text style={styles.tripLocation}>📍 {trip.to}</Text>
                </View>

                <Text style={styles.tripDate}>🕒 {trip.date}</Text>

                {/* Accepted Packages */}
                {trip.packages.length > 0 && (
                  <View style={styles.tripPackagesSection}>
                    <Text style={styles.tripSectionTitle}>✅ Accepted Packages ({trip.packages.length})</Text>
                    {trip.packages.map(pkg => (
                      <View key={pkg.id} style={styles.tripPackageItem}>
                        {pkg.photo && (
                          <Image 
                            source={{ uri: pkg.photo }} 
                            style={styles.tripCustomerPhoto}
                            resizeMode="cover"
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tripPackageCustomer}>{pkg.customer}</Text>
                          <Text style={styles.tripPackageItem}>{pkg.item}</Text>
                        </View>
                        <Text style={styles.tripPackageFee}>P {pkg.fee}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Package Suggestions */}
                {trip.suggestions.length > 0 && trip.spacesUsed < trip.spacesTotal && (
                  <View style={styles.tripPackagesSection}>
                    <Text style={styles.tripSectionTitle}>💡 Suggestions ({trip.suggestions.length})</Text>
                    {trip.suggestions.map(pkg => (
                      <View key={pkg.id} style={styles.suggestionCard}>
                        <View style={styles.suggestionHeader}>
                          {pkg.photo && (
                            <Image 
                              source={{ uri: pkg.photo }} 
                              style={styles.tripCustomerPhoto}
                              resizeMode="cover"
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tripPackageCustomer}>{pkg.customer}</Text>
                            <Text style={styles.tripPackageItem}>{pkg.item}</Text>
                          </View>
                          <Text style={styles.suggestionFee}>P {pkg.suggestedFee}</Text>
                        </View>
                        <View style={styles.suggestionFeeBreakdown}>
                          <Text style={styles.suggestionFeeText}>
                            You get: P {(pkg.suggestedFee * 0.7).toFixed(2)} (after 30% platform fee)
                          </Text>
                        </View>
                        <View style={styles.suggestionActions}>
                          <TouchableOpacity
                            style={styles.suggestionRejectBtn}
                            onPress={() => handleRejectSuggestion(pkg)}
                          >
                            <Text style={styles.suggestionRejectText}>Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.suggestionCounterBtn}
                            onPress={() => handleCounterBid(pkg)}
                          >
                            <Text style={styles.suggestionCounterText}>Counter</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.suggestionAcceptBtn}
                            onPress={() => handleAcceptSuggestion(trip, pkg)}
                          >
                            <Text style={styles.suggestionAcceptText}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyTitle}>No Trips Yet</Text>
              <Text style={styles.emptyText}>Create a trip from your driver home screen to start receiving package suggestions</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Counter Bid Modal */}
      <InputModal
        visible={showCounterBidModal}
        title={`Counter Offer for ${selectedPackage?.customer || 'Customer'}`}
        placeholder="Enter your counter offer (P)"
        onSubmit={handleCounterBidSubmit}
        onCancel={() => {
          setShowCounterBidModal(false);
          setSelectedPackage(null);
        }}
        keyboardType="numeric"
      />
    </View>
  );
}

// Wallet Screen
// Old WalletScreen - replaced by new WalletScreen from src/screens
// Keeping for reference but not used
function WalletScreenOld() {
  const { goBack, userType, customerWallet, driverWallet, setCustomerWallet, setDriverWallet } = useNavigation();
  const isCustomer = userType === 'customer';
  const balance = isCustomer ? customerWallet : driverWallet;
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleDepositSubmit = (amount) => {
    setShowDepositModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const newBalance = balance + parseFloat(amount);
      if (isCustomer) {
        setCustomerWallet(newBalance);
      } else {
        setDriverWallet(newBalance);
      }
      Alert.alert('Success', `P ${amount} deposited successfully!`);
    } else {
      Alert.alert('Error', 'Please enter a valid amount');
    }
  };

  const handleWithdrawSubmit = (amount) => {
    setShowWithdrawModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      if (parseFloat(amount) > balance) {
        Alert.alert('Error', 'Insufficient balance');
        return;
      }
      const newBalance = balance - parseFloat(amount);
      setDriverWallet(newBalance);
      Alert.alert('Success', `P ${amount} withdrawn successfully!`);
    } else {
      Alert.alert('Error', 'Please enter a valid amount');
    }
  };

  const handleDeposit = () => {
    setShowDepositModal(true);
  };

  const handleWithdraw = () => {
    if (isCustomer) {
      Alert.alert('Info', 'Customers can only deposit funds');
      return;
    }
    setShowWithdrawModal(true);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.walletContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>P {balance.toFixed(2)}</Text>
          </View>

          <View style={styles.walletActions}>
            {isCustomer ? (
              <TouchableOpacity style={styles.walletButton} onPress={handleDeposit}>
                <Text style={styles.walletButtonIcon}>💳</Text>
                <Text style={styles.walletButtonText}>Deposit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.walletButton} onPress={handleWithdraw}>
                <Text style={styles.walletButtonIcon}>💸</Text>
                <Text style={styles.walletButtonText}>Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.transactionCard}>
              <View>
                <Text style={styles.transactionDesc}>Wallet Deposit</Text>
                <Text style={styles.transactionDate}>Jan 10, 2024</Text>
              </View>
              <Text style={styles.transactionAmount}>+P 150.00</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <InputModal
        visible={showDepositModal}
        title="Deposit Funds"
        placeholder="Enter amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleDepositSubmit}
        onCancel={() => setShowDepositModal(false)}
      />

      <InputModal
        visible={showWithdrawModal}
        title="Withdraw Funds"
        placeholder="Enter amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleWithdrawSubmit}
        onCancel={() => setShowWithdrawModal(false)}
      />
    </View>
  );
}

// Profile Screen
function ProfileScreen() {
  const { userProfile, setUserProfile, navigate } = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile.firstName);
  const [lastName, setLastName] = useState(userProfile.lastName);
  const [phone, setPhone] = useState(userProfile.phone);
  
  const handleVerification = () => {
    navigate('verification');
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera and photo library access is required to update profile picture');
        return false;
      }
    }
    return true;
  };

  const handleProfilePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled) {
              setUserProfile({ ...userProfile, profilePhoto: result.assets[0].uri });
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled) {
              setUserProfile({ ...userProfile, profilePhoto: result.assets[0].uri });
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = () => {
    setUserProfile({
      ...userProfile,
      firstName,
      lastName,
      email,
      phone,
    });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleProfilePhoto} style={styles.profilePhotoContainer}>
            {userProfile.profilePhoto ? (
              <Image source={{ uri: userProfile.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profilePhotoText}>
                  {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.editPhotoButton}>
              <Text style={styles.editPhotoIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>{userProfile.firstName} {userProfile.lastName}</Text>
          <Text style={styles.profileEmail}>{userProfile.phone}</Text>
        </View>

        <View style={styles.profileSection}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: colors.border }]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={[styles.editButtonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.editButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>First Name</Text>
                <Text style={styles.profileFieldValue}>{userProfile.firstName}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Last Name</Text>
                <Text style={styles.profileFieldValue}>{userProfile.lastName}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Phone</Text>
                <Text style={styles.profileFieldValue}>{userProfile.phone}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Verification Status</Text>
                <Text style={[styles.profileFieldValue, { color: userProfile.isVerified ? colors.success : colors.warning }]}>
                  {userProfile.isVerified ? '✓ Verified' : '⚠ Not Verified'}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.primaryButton, { marginBottom: 12 }]}
                onPress={handleVerification}
              >
                <Text style={styles.primaryButtonText}>
                  {userProfile.isVerified ? 'View Verification' : 'Complete Verification'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Settings Screen
function SettingsScreen() {
  const { logout, navigate } = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleNotifications = () => {
    navigate('notifications');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy', 'Privacy settings coming soon!');
  };

  const handleSupport = () => {
    Alert.alert('Help & Support', 'Support page coming soon!');
  };

  const handleTerms = () => {
    Alert.alert('Terms of Service', 'Please read our terms of service on our website.');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Please read our privacy policy on our website.');
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>Settings</Text>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.settingsItem} onPress={handleNotifications}>
              <Text style={styles.settingsItemText}>🔔 Notifications</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacy}>
              <Text style={styles.settingsItemText}>🔒 Privacy</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={handleSupport}>
              <Text style={styles.settingsItemText}>❓ Help & Support</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>About</Text>
            
            <TouchableOpacity style={styles.settingsItem} onPress={handleTerms}>
              <Text style={styles.settingsItemText}>📄 Terms of Service</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacyPolicy}>
              <Text style={styles.settingsItemText}>🔐 Privacy Policy</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>ℹ️ Version</Text>
              <Text style={styles.settingsItemValue}>1.0.0</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Notification Screen
function NotificationScreen() {
  const { notifications, setNotifications } = useNavigation();

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery': return '📦';
      case 'bid': return '💰';
      case 'payment': return '💳';
      case 'verification': return '✅';
      default: return '🔔';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationItemUnread
                ]}
                onPress={() => markAsRead(notification.id)}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationIconText}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[
                    styles.notificationItemTitle,
                    !notification.read && styles.notificationItemTitleUnread
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationItemMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationItemTime}>
                    {notification.time}
                  </Text>
                </View>
                {!notification.read && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Bottom Navigation
function BottomNav() {
  const { activeTab, setActiveTab, navigate } = useNavigation();

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    // Reset to home screen to ensure tab content is shown
    navigate('home', true);
  };

  return (
    <View style={styles.bottomNav}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomNavItem}
          onPress={() => handleTabPress(tab.id)}
        >
          <View style={[
            styles.bottomNavIcon,
            activeTab === tab.id && styles.bottomNavIconActive
          ]}>
            <Text style={styles.bottomNavIconText}>{tab.icon}</Text>
          </View>
          <Text style={[
            styles.bottomNavLabel,
            activeTab === tab.id && styles.bottomNavLabelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Main App Navigator
function AppNavigator() {
  const { currentScreen, isAuthenticated, userType, activeTab, goBack } = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return goBack();
    });

    return () => backHandler.remove();
  }, [goBack]);

  const renderScreen = () => {
    if (!isAuthenticated) {
      if (currentScreen === 'loading') return <LoadingScreen />;
      if (currentScreen === 'registerCustomer') return <RegisterCustomerScreen />;
      if (currentScreen === 'registerDriver') return <RegisterDriverScreen />;
      if (currentScreen === 'forgotPassword') return <ForgotPasswordScreen />;
      return <LoginScreen />;
    }

    // Customer screens (check before tabs)
    if (currentScreen === 'createPackage') return <CreatePackageScreen />;
    if (currentScreen === 'myPackages') return <MyPackagesScreen />;
    if (currentScreen === 'availableDrivers') return <AvailableDriversScreen />;
    if (currentScreen === 'wallet') return <NewWalletScreen navigation={{ navigate, goBack }} route={{}} />;
    if (currentScreen === 'notifications') return <NotificationScreen />;
    if (currentScreen === 'verification') return <VerificationScreen navigation={{ navigate, goBack }} route={{}} />;
    if (currentScreen === 'chat') {
      const chatRoute = { params: screenParams?.chat || screenParams?.currentScreen || {} };
      return <ChatScreen navigation={{ navigate, goBack }} route={chatRoute} />;
    }
    if (currentScreen === 'tracking') {
      const trackingRoute = { params: screenParams?.tracking || screenParams?.currentScreen || {} };
      return <TrackingScreen navigation={{ navigate, goBack }} route={trackingRoute} />;
    }

    // Driver screens (check before tabs)
    if (currentScreen === 'availablePackages') return <AvailablePackagesScreen />;
    if (currentScreen === 'myTrips') return <MyTripsScreen />;

    // Utility screens (available to both)
    if (currentScreen === 'profile') return <ProfileScreen />;
    if (currentScreen === 'settings') return <SettingsScreen />;

    // Main tab screens (checked after specific screens)
    if (activeTab === 'profile') return <ProfileScreen />;
    if (activeTab === 'settings') return <SettingsScreen />;
    if (activeTab === 'home') {
      return userType === 'customer' ? <CustomerHomeScreen /> : <DriverHomeScreen />;
    }

    return userType === 'customer' ? <CustomerHomeScreen /> : <DriverHomeScreen />;
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {isAuthenticated && <BottomNav />}
    </View>
  );
}

// Helper Functions - getStatusColor moved to src/utils/packageUtils.js

// Main App
export default function App() {
  return (
    <NavigationProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <AppNavigator />
      </SafeAreaView>
    </NavigationProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  // Loading Screen
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoBigContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.botswanaBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: colors.botswanaBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBigN: {
    fontSize: 84,
    fontWeight: '900',
    color: colors.botswanaWhite,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoTextBig: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.botswanaWhite,
    letterSpacing: 4,
    marginBottom: 10,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sloganBig: {
    fontSize: 16,
    color: colors.botswanaBlack,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 22,
  },
  cursor: {
    fontSize: 18,
    color: colors.botswanaBlack,
    fontWeight: '900',
    marginLeft: 4,
  },

  // Login Screen
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoN: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.cardBg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: colors.botswanaBlack,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textLight,
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTypeSelector: {
    marginBottom: 16,
  },
  userTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: colors.accent,
  },
  userTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  userTypeButtonTextActive: {
    color: colors.textLight,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  // Password input with inline eye icon
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 4,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44, // space for eye icon
  },
  passwordIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordIconText: {
    fontSize: 18,
    color: colors.primary,
  },
  showPasswordToggle: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Document Upload Styles
  documentsSection: {
    marginTop: 20,
    marginBottom: 30,
    padding: 16,
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  documentsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  documentButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  documentButtonText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  documentPreview: {
    width: 60,
    height: 40,
    borderRadius: 6,
  },
  documentNote: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  termsCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 18,
    color: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Modal Styles for Forgot Password
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roleChoiceButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  roleChoiceText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  roleModalSpacing: {
    height: 20,
  },
  countryCodeList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  countryCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  countryCodeFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryCodeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  countryCodeNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyButtonTextActive: {
    color: colors.textLight,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  modalCancelButton: {
    backgroundColor: colors.border,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSubmitButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  // Redesigned minimal header notification icon
  headerNotif: {
    position: 'relative',
    padding: 8,
  },
  headerNotifIcon: {
    fontSize: 32,
  },
  headerNotifBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerNotifBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textLight,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    opacity: 0.95,
    textAlign: 'center',
  },

  // Section
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconText: {
    fontSize: 30,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionTextDisabled: {
    color: colors.textTertiary,
  },

  // Package Card
  packageCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageCardWithPhoto: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    padding: 0,
  },
  packagePhoto: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  packageContent: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  packageDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  packageLocation: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  packageArrow: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageDriverPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  packageDriver: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packageInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  bidButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bidButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  bidButtonDisabled: {
    backgroundColor: colors.border,
  },
  bidButtonTextDisabled: {
    color: colors.textTertiary,
  },

  // Form Container
  formContainer: {
    flex: 1,
    padding: 20,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },

  // Center Content
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  trackingInfo: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    width: '100%',
  },
  trackingLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },

  // Wallet
  walletContainer: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textLight,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textLight,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  walletButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },

  // Profile
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.cardBg,
  },
  profilePhotoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textLight,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoIcon: {
    fontSize: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileSection: {
    padding: 20,
  },
  profileField: {
    marginBottom: 20,
  },
  profileFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },

  // Settings
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingsItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  settingsItemArrow: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  settingsItemValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },

  // Notification Screen Styles
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  notificationTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  markAllText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  notificationList: {
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: colors.cardBgLight,
    borderColor: colors.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationItemTitleUnread: {
    fontWeight: '700',
  },
  notificationItemMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationItemTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 4,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  bottomNavIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bottomNavIconActive: {
    backgroundColor: colors.primary,
  },
  bottomNavIconText: {
    fontSize: 20,
  },
  bottomNavLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  bottomNavLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Input Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },

  // Photo Upload Styles
  photoSection: {
    marginBottom: 24,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  addPhotoButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  photoPreview: {
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  changePhotoButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changePhotoText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },

  // Create Package Form Styles
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  locationSelectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationSelectedAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationArrow: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  routeInfo: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  routeInfoValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  routeInfoText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  locationItemSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  currentLocationIcon: {
    fontSize: 24,
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBgLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  // Available Drivers Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  driverCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  driverCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  driverPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.border,
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  driverTrips: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeIndicator: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  driverLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tripCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripLocation: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripSpaces: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  tripPrice: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tripPriceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },

  // Header Action Button
  headerAction: {
    padding: 8,
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },

  // My Packages - View Bids
  viewBidsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },

  // Tracking Box
  trackingBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  trackingText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },

  // Bid Modal Styles
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  bidCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bidDriverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  bidDriverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bidDriverMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  bidFeeInfo: {
    backgroundColor: colors.cardBg,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  bidFeeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bidActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bidButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bidRejectButton: {
    backgroundColor: colors.border,
  },
  bidRejectText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  bidAcceptButton: {
    backgroundColor: colors.primary,
  },
  bidAcceptText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },

  // My Trips Detail Styles
  tripDetailCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripDetailId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  spacesIndicator: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spacesText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  tripPackagesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  tripPackageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tripCustomerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tripPackageCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tripPackageFee: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Suggestion Card Styles
  suggestionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionFee: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestionFeeBreakdown: {
    backgroundColor: colors.success + '15',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  suggestionFeeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionRejectBtn: {
    flex: 1,
    backgroundColor: colors.border,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionRejectText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionCounterBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionCounterText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionAcceptBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionAcceptText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '700',
  },

  // Bid Status Card Styles
  bidStatusCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bidStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidStatusPackage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bidStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bidStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bidStatusDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bidStatusRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidStatusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bidStatusAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bidStatusEarnings: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },

  // Available Packages - Action Buttons
  packageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  packageActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
  counterButton: {
    backgroundColor: colors.secondary,
  },
  counterButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },

  // Section Hint
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // Package Select Item (for suggestion modal)
  packageSelectItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageSelectItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  packageSelectId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  packageSelectDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  packageSelectRoute: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // Info Box
  infoBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },

  // Active Status Toggle (Driver)
  activeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  activeStatusLeft: {
    flex: 1,
  },
  activeStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activeStatusSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  activeToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  activeToggleOn: {
    backgroundColor: colors.success,
  },
  activeToggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activeToggleCircleOn: {
    transform: [{ translateX: 24 }],
  },

  // Driver Vehicle
  driverVehicle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
