import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, PermissionsAndroid, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

// Custom Navigation System
const NavigationContext = React.createContext();

function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenHistory, setScreenHistory] = useState(['login']);
  const [showBottomTabs, setShowBottomTabs] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'customer' or 'driver'
  const [screenParams, setScreenParams] = useState({});
  const [permissionsGranted, setPermissionsGranted] = useState(true); // Default to true for existing users
  const [hasActivePackage, setHasActivePackage] = useState(false);
  const [showPermissionsOnStartup, setShowPermissionsOnStartup] = useState(false);

  // Check if this is first time installation
  useEffect(() => {
    // In a real app, you would check AsyncStorage or similar
    // For now, we'll simulate checking if permissions were previously granted
    const checkFirstInstall = () => {
      // Simulate checking if this is first install
      // In real app: const isFirstInstall = await AsyncStorage.getItem('firstInstall') === null;
      const isFirstInstall = false; // Set to true for first-time users
      
      if (isFirstInstall) {
        setShowPermissionsOnStartup(true);
        setCurrentScreen('permissions');
        setScreenHistory(['permissions']);
      }
    };

    checkFirstInstall();
  }, []);

  // Simple in-memory wallet simulation
  const [customerWalletBalance, setCustomerWalletBalance] = useState(250.00);
  const [customerReservedBalance, setCustomerReservedBalance] = useState(0.00);
  const [driverWalletBalance, setDriverWalletBalance] = useState(0.00);
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'fund', amount: 150.00, description: 'Wallet funded', date: '2024-01-10', status: 'completed' },
  ]);

  // User profile data
  const [userProfile, setUserProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    profilePhoto: null, // Will be null for now, can be updated later
    rating: 4.8,
    totalDeliveries: 12,
    totalEarnings: 1250
  });

  // Driver active status and upcoming trips (in-memory)
  const [driverActive, setDriverActive] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([
    {
      id: 'TR-1001',
      driver: { name: 'John Driver', rating: 4.8, vehicle: 'Toyota Camry', licensePlate: 'ABC-123' },
      from: 'Downtown City Center',
      to: 'Airport Terminal',
      departure: 'Today 14:30',
      capacity: { available: 2, total: 4 },
      distance: '25 km',
      eta: '45 min'
    },
    {
      id: 'TR-1002',
      driver: { name: 'Sarah Wilson', rating: 4.7, vehicle: 'Honda CR-V', licensePlate: 'XYZ-987' },
      from: 'Business District',
      to: 'Suburban Area',
      departure: 'Today 16:00',
      capacity: { available: 3, total: 5 },
      distance: '18 km',
      eta: '35 min'
    }
  ]);

  // Enhanced bidding system
  const [availablePackages, setAvailablePackages] = useState([
    {
      id: 'PKG-001',
      customerId: 'CUST-001',
      customerName: 'John Customer',
      description: 'Electronics package',
      pickupAddress: '123 Main St, Downtown',
      deliveryAddress: '456 Airport Blvd, Terminal 2',
      priceOffered: 25,
      urgency: 'normal',
      packageType: 'electronics',
      weight: '2.5 kg',
      specialInstructions: 'Handle with care',
      status: 'PENDING',
      createdAt: '2024-01-15 10:30',
      bids: []
    },
    {
      id: 'PKG-002',
      customerId: 'CUST-002',
      customerName: 'Sarah Customer',
      description: 'Important documents',
      pickupAddress: '789 Business Ave, CBD',
      deliveryAddress: '321 Suburb Lane, Residential',
      priceOffered: 18,
      urgency: 'urgent',
      packageType: 'documents',
      weight: '0.5 kg',
      specialInstructions: 'Urgent delivery needed',
      status: 'PENDING',
      createdAt: '2024-01-15 09:15',
      bids: []
    }
  ]);

  const [packageBids, setPackageBids] = useState([
    {
      id: 'BID-001',
      packageId: 'PKG-001',
      driverId: 'DRV-001',
      driverName: 'John Driver',
      driverRating: 4.8,
      completedTrips: 245,
      vehicle: 'Toyota Camry',
      licensePlate: 'ABC-123',
      bidAmount: 22,
      message: 'I can deliver this safely and on time',
      submittedAt: '2024-01-15 10:45',
      status: 'PENDING'
    },
    {
      id: 'BID-002',
      packageId: 'PKG-001',
      driverId: 'DRV-002',
      driverName: 'Sarah Wilson',
      driverRating: 4.7,
      completedTrips: 198,
      vehicle: 'Honda CR-V',
      licensePlate: 'XYZ-987',
      bidAmount: 20,
      message: 'Experienced with electronics delivery',
      submittedAt: '2024-01-15 11:00',
      status: 'PENDING'
    }
  ]);

  const placeBid = (packageId, driverId, driverName, driverRating, completedTrips, vehicle, licensePlate, bidAmount, message) => {
    const newBid = {
      id: `BID-${Date.now()}`,
      packageId,
      driverId,
      driverName,
      driverRating,
      completedTrips,
      vehicle,
      licensePlate,
      bidAmount,
      message,
      submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'PENDING'
    };
    setPackageBids(prev => [...prev, newBid]);
    return newBid;
  };

  const acceptBid = (bidId) => {
    setPackageBids(prev => prev.map(bid => 
      bid.id === bidId ? { ...bid, status: 'ACCEPTED' } : 
      bid.packageId === prev.find(b => b.id === bidId)?.packageId ? { ...bid, status: 'REJECTED' } : bid
    ));
  };

  const addTransaction = (tx) => {
    setTransactions(prev => [{ id: Date.now(), date: new Date().toISOString().slice(0,10), status: 'completed', ...tx }, ...prev]);
  };

  const fundCustomer = (amount) => {
    setCustomerWalletBalance(prev => prev + amount);
    addTransaction({ type: 'fund', amount, description: 'Wallet funded' });
  };

  const reserveFromCustomer = (amount) => {
    if (customerWalletBalance < amount) {
      Alert.alert('Insufficient Funds', 'Customer wallet does not have enough balance to reserve.');
      return false;
    }
    setCustomerWalletBalance(prev => prev - amount);
    setCustomerReservedBalance(prev => prev + amount);
    addTransaction({ type: 'reserve', amount: -amount, description: 'Amount reserved for pickup' });
    return true;
  };

  const releaseToDriver = (amount, commissionRate = 0.30) => {
    // amount must be in reserved
    const commission = Number((amount * commissionRate).toFixed(2));
    const payout = Number((amount - commission).toFixed(2));
    setCustomerReservedBalance(prev => Math.max(0, prev - amount));
    setDriverWalletBalance(prev => prev + payout);
    addTransaction({ type: 'commission', amount: -commission, description: `Commission (${Math.round(commissionRate*100)}%) deducted on payout` });
    addTransaction({ type: 'payout', amount: -payout, description: 'Payout released to driver' });
  };

  const cancelWithPenalty = (amount, penaltyRate = 0.10) => {
    const penalty = Number((amount * penaltyRate).toFixed(2));
    const refund = Number((amount - penalty).toFixed(2));
    // Release reservation back to wallet minus penalty
    setCustomerReservedBalance(prev => Math.max(0, prev - amount));
    setCustomerWalletBalance(prev => prev + refund);
    addTransaction({ type: 'penalty', amount: -penalty, description: `Cancellation penalty (${Math.round(penaltyRate*100)}%)` });
    addTransaction({ type: 'refund', amount: refund, description: 'Reservation refunded after cancellation' });
  };

  const navigate = (screenName, params = {}) => {
    console.log('Navigating to:', screenName, params);
    setCurrentScreen(screenName);
    setScreenHistory(prev => [...prev, screenName]);
    setScreenParams(params);
    
    // Show bottom tabs only for authenticated main screens
    const mainScreens = ['home', 'share', 'profile', 'settings'];
    setShowBottomTabs(isAuthenticated && mainScreens.includes(screenName));
  };

  const login = (userType) => {
    console.log('User logged in as:', userType);
    setIsAuthenticated(true);
    setUserType(userType);
    setCurrentScreen('home');
    setScreenHistory(['home']);
    setShowBottomTabs(true);
  };

  const logout = () => {
    console.log('User logged out');
    setIsAuthenticated(false);
    setUserType(null);
    setCurrentScreen('login');
    setScreenHistory(['login']);
    setShowBottomTabs(false);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1);
      setScreenHistory(newHistory);
      const previousScreen = newHistory[newHistory.length - 1];
      setCurrentScreen(previousScreen);
      
      // Show bottom tabs for main screens
      const mainScreens = ['home', 'share', 'profile', 'settings'];
      setShowBottomTabs(mainScreens.includes(previousScreen));
    }
  };

  const getScreenTitle = (screenName) => {
    const titles = {
      login: 'Welcome to Ntsamaela',
      register: 'Create Account',
      home: 'Ntsamaela',
      share: 'Share App',
      profile: 'Profile',
      settings: 'Settings',
      about: 'About',
      contact: 'Contact',
      createPackage: 'Create Package',
      myPackages: 'My Packages',
      myBids: 'My Bids',
      verification: 'Driver Verification',
      wallet: 'Wallet',
      tracking: 'Package Tracking',
      rating: 'Rate Delivery',
      reviews: 'My Reviews',
      chat: 'Messages',
      notifications: 'Notifications',
      availableDrivers: 'Available Drivers',
      createTrip: 'Create Trip'
    };
    return titles[screenName] || 'Ntsamaela';
  };

  return (
    <NavigationContext.Provider value={{ 
      currentScreen, 
      navigate, 
      goBack, 
      canGoBack: screenHistory.length > 1,
      screenTitle: getScreenTitle(currentScreen),
      showBottomTabs,
      isAuthenticated,
      userType,
      login,
      logout,
      screenParams,
      // wallet context
      customerWalletBalance,
      customerReservedBalance,
      driverWalletBalance,
      transactions,
      fundCustomer,
      reserveFromCustomer,
      releaseToDriver,
      cancelWithPenalty,
      // Enhanced bidding system
      availablePackages,
      packageBids,
      placeBid,
      acceptBid,
      // Permissions
      permissionsGranted,
      setPermissionsGranted,
      // Location restriction
      hasActivePackage,
      setHasActivePackage,
      // Permissions startup
      showPermissionsOnStartup,
      setShowPermissionsOnStartup,
      // Driver status
      driverActive,
      setDriverActive,
      // User profile
      userProfile,
      setUserProfile
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

function useNavigation() {
  return React.useContext(NavigationContext);
}

// Helper function to apply theme styles to any component
function applyModernStyles(component) {
  const modernStyles = getModernStyles();
  return { component, modernStyles };
}

// Modern Design System - Clean, Professional UI
const modernColors = {
  // Professional Primary Colors
  primary: '#2563EB', // Professional Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#059669', // Professional Green
  accent: '#DC2626', // Professional Red
  warning: '#D97706', // Professional Orange
  
  // Professional Background System
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  
  // Professional Text Hierarchy
  text: '#0F172A', // Deep Professional Black
  textSecondary: '#64748B', // Professional Gray
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Professional Border System
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  
  // Professional Status Colors
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0EA5E9',
  
  // Professional Shadow System
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.16)',
  shadowLight: 'rgba(15, 23, 42, 0.04)',
  
  // Professional Glass Effects
  glass: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(15, 23, 42, 0.1)',
  
  // Professional Gradients
  gradient: ['#2563EB', '#1D4ED8'],
  gradientSecondary: ['#059669', '#047857'],
  gradientAccent: ['#DC2626', '#B91C1C'],
};

const modernTypography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  captionMedium: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

// Modern theme styles - clean, professional design
function getModernStyles() {
  return {
    container: {
      flex: 1,
      backgroundColor: modernColors.background,
    },
    header: {
      backgroundColor: modernColors.primary,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: modernColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    headerTitle: {
      ...modernTypography.h4,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backButtonText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
    },
    // Modern text styles
    title: {
      ...modernTypography.h3,
      color: modernColors.text,
      fontWeight: '700',
    },
    subtitle: {
      ...modernTypography.body,
      color: modernColors.textSecondary,
    },
    text: {
      ...modernTypography.body,
      color: modernColors.text,
    },
    // Modern card design
    card: {
      backgroundColor: modernColors.surface,
      borderRadius: 16,
      padding: 24,
      marginVertical: 12,
      shadowColor: modernColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: modernColors.borderLight,
    },
    // Modern button styles
    button: {
      backgroundColor: modernColors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: modernColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonText: {
      color: '#FFFFFF',
      ...modernTypography.bodyMedium,
      fontWeight: '600',
      textAlign: 'center',
    },
    // Modern input styles
    input: {
      backgroundColor: modernColors.surface,
      borderColor: modernColors.border,
      borderWidth: 1,
      color: modernColors.text,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    // Modern setting items
    settingItem: {
      backgroundColor: modernColors.surface,
      padding: 20,
      marginVertical: 8,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: modernColors.borderLight,
      shadowColor: modernColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    settingLabel: {
      ...modernTypography.bodyMedium,
      color: modernColors.text,
      fontWeight: '500',
    },
    // Modern toggle styles
    toggle: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      minWidth: 60,
      alignItems: 'center',
    },
    toggleOn: {
      backgroundColor: modernColors.success,
    },
    toggleOff: {
      backgroundColor: modernColors.border,
    },
    toggleText: {
      color: '#FFFFFF',
      ...modernTypography.captionMedium,
      fontWeight: '600',
    },
  };
}

// Navigation Header Component
function NavigationHeader() {
  const { screenTitle, canGoBack, goBack } = useNavigation();
  const modernStyles = getModernStyles();
  
  const handleGoBack = () => {
    console.log('Back button clicked');
    goBack();
  };
  
  return (
    <View style={[styles.header, modernStyles.header]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, modernStyles.headerTitle]}>{screenTitle}</Text>
      </View>
    </View>
  );
}

// Bottom Tab Navigation Component
function BottomTabNavigation() {
  const { currentScreen, navigate } = useNavigation();
  const modernStyles = getModernStyles();
  
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'share', label: 'Share', icon: '📤' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];
  
  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            currentScreen === tab.id && styles.activeTab
          ]}
          onPress={() => navigate(tab.id)}
        >
          <Text style={[
            styles.tabIcon,
            currentScreen === tab.id && styles.activeTabIcon
          ]}>
            {tab.icon}
          </Text>
          <Text style={[
            styles.tabLabel,
            currentScreen === tab.id && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Permissions Screen - App permissions on first launch
function PermissionsScreen() {
  const { navigate, permissionsGranted, setPermissionsGranted, showPermissionsOnStartup } = useNavigation();

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.ACCESS_NOTIFICATION_POLICY,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          setPermissionsGranted(true);
          // Navigate back to previous screen or login
          if (showPermissionsOnStartup) {
            navigate('login');
          } else {
            navigate('settings');
          }
        } else {
          Alert.alert(
            'Permissions Required',
            'Some permissions are required for the app to function properly. Please grant all permissions.',
            [{ text: 'Try Again', onPress: requestPermissions }]
          );
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        Alert.alert('Error', 'Failed to request permissions. Please try again.');
      }
    } else {
      // For iOS, permissions are handled automatically
      setPermissionsGranted(true);
      // Navigate back to previous screen or login
      if (showPermissionsOnStartup) {
        navigate('login');
      } else {
        navigate('settings');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={() => navigate('settings')}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            {showPermissionsOnStartup 
              ? 'Ntsamaela needs these permissions to work properly' 
              : 'Manage your app permissions'
            }
          </Text>
        </View>
      </View>

      <View style={styles.permissionsCard}>
        <Text style={styles.permissionsTitle}>📱 Required Permissions</Text>
        
        <View style={styles.permissionItem}>
          <Text style={styles.permissionIcon}>📍</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Location Access</Text>
            <Text style={styles.permissionDescription}>
              Required for package tracking and delivery navigation
            </Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <Text style={styles.permissionIcon}>📷</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Camera Access</Text>
            <Text style={styles.permissionDescription}>
              Required for package verification and photo documentation
            </Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <Text style={styles.permissionIcon}>📁</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Storage Access</Text>
            <Text style={styles.permissionDescription}>
              Required for saving package photos and documents
            </Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <Text style={styles.permissionIcon}>📞</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Phone Access</Text>
            <Text style={styles.permissionDescription}>
              Required for contacting drivers and customers
            </Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <Text style={styles.permissionIcon}>🔔</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Notification Access</Text>
            <Text style={styles.permissionDescription}>
              Required for delivery updates and important alerts
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.permissionsNote}>
        <Text style={styles.noteTitle}>⚠️ Important Note</Text>
        <Text style={styles.noteText}>
          Location services must remain enabled while you have active packages. 
          This ensures accurate tracking and delivery completion.
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.permissionButton}
        onPress={requestPermissions}
      >
        <Text style={styles.permissionButtonText}>
          {showPermissionsOnStartup ? 'Grant Permissions & Continue' : 'Update Permissions'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Authentication Screens
function LoginScreen() {
  const { navigate, login } = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const modernStyles = getModernStyles();

  const handleLogin = () => {
    // Authentication suspended for testing - accept any input
    console.log('Login attempt:', { email, password });
    // TEMP: Let user choose role after login for editing purposes
    Alert.alert(
      'Choose Role',
      'Select which view to open after login',
      [
        { text: 'Customer', onPress: () => login('customer') },
        { text: 'Driver', onPress: () => login('driver') },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.authContainer, modernStyles.container]}>
      <View style={styles.authHeader}>
        <Text style={[styles.authTitle, modernStyles.title]}>Welcome to Ntsamaela</Text>
        <Text style={[styles.authSubtitle, modernStyles.subtitle]}>Peer-to-peer package delivery</Text>
      </View>

      <View style={styles.authForm}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, modernStyles.text]}>Email</Text>
          <TextInput
            style={[styles.textInput, modernStyles.input]}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, modernStyles.text]}>Password</Text>
          <TextInput
            style={[styles.textInput, modernStyles.input]}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.authButton, styles.primaryButton]}
          onPress={handleLogin}
        >
          <Text style={styles.authButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigate('register')}
        >
          <Text style={styles.linkText}>Don't have an account? Create one</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RegisterScreen() {
  const { navigate, login } = useNavigation();
  const modernStyles = getModernStyles();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'customer'
  });

  const handleRegister = () => {
    // Registration suspended for testing - accept any input
    console.log('Registration attempt:', formData);
    // Auto login with selected user type regardless of input
    login(formData.userType);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={[styles.authContainer, modernStyles.container]}>
      <View style={styles.authHeader}>
        <Text style={[styles.authTitle, modernStyles.title]}>Create Account</Text>
        <Text style={[styles.authSubtitle, modernStyles.subtitle]}>Join the Ntsamaela community</Text>
      </View>

      <View style={styles.authForm}>
        <View style={styles.userTypeSelector}>
          <TouchableOpacity 
            style={[
              styles.userTypeButton, 
              formData.userType === 'customer' && styles.selectedUserType
            ]}
            onPress={() => updateFormData('userType', 'customer')}
          >
            <Text style={[
              styles.userTypeText,
              formData.userType === 'customer' && styles.selectedUserTypeText
            ]}>🚚 Customer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.userTypeButton, 
              formData.userType === 'driver' && styles.selectedUserType
            ]}
            onPress={() => updateFormData('userType', 'driver')}
          >
            <Text style={[
              styles.userTypeText,
              formData.userType === 'driver' && styles.selectedUserTypeText
            ]}>🚗 Driver</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="First name"
              value={formData.firstName}
              onChangeText={(value) => updateFormData('firstName', value)}
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Last name"
              value={formData.lastName}
              onChangeText={(value) => updateFormData('lastName', value)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Create password"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.authButton, styles.primaryButton]}
          onPress={handleRegister}
        >
          <Text style={styles.authButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigate('login')}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Screen Components
// Modern Home Screen with Card-Based Layout
function HomeScreen() {
  const { navigate, userType, logout, userProfile } = useNavigation();
  const modernStyles = getModernStyles();
  
  const handleNavigation = (screenName) => {
    console.log('Button clicked for:', screenName);
    navigate(screenName);
  };

  // Modern action cards data
  const customerActions = [
    {
      id: 'createPackage',
      title: 'Send Package',
      subtitle: 'Create a new delivery request',
      icon: '📦',
      color: '#007AFF',
      primary: true
    },
    {
      id: 'myPackages',
      title: 'My Packages',
      subtitle: 'Track your active deliveries',
      icon: '📋',
      color: '#34C759',
      primary: false
    },
    {
      id: 'packageHistory',
      title: 'Package History',
      subtitle: 'View past deliveries',
      icon: '📊',
      color: '#FF9500',
      primary: false
    },
    {
      id: 'earnings',
      title: 'Wallet',
      subtitle: 'Manage your payments',
      icon: '💳',
      color: '#5856D6',
      primary: false
    }
  ];

  const driverActions = [
    {
      id: 'availablePackages',
      title: 'Find Packages',
      subtitle: 'Browse available deliveries',
      icon: '🚚',
      color: '#007AFF',
      primary: true
    },
    {
      id: 'myBids',
      title: 'My Bids',
      subtitle: 'Manage your bids',
      icon: '💰',
      color: '#34C759',
      primary: false
    },
    {
      id: 'myTrips',
      title: 'My Trips',
      subtitle: 'Track active deliveries',
      icon: '🚗',
      color: '#FF9500',
      primary: false
    },
    {
      id: 'earnings',
      title: 'Wallet',
      subtitle: 'View earnings & withdraw',
      icon: '💳',
      color: '#5856D6',
      primary: false
    }
  ];

  const actions = userType === 'customer' ? customerActions : driverActions;
  
  return (
    <ScrollView style={[styles.container, modernStyles.container]} showsVerticalScrollIndicator={false}>
      {/* Modern Header Section */}
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <View style={styles.userInfoContainer}>
            <View style={styles.profilePhotoContainer}>
              {userProfile.profilePhoto ? (
                <Image source={{ uri: userProfile.profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoText}>
                    {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.greetingText}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</Text>
              <Text style={styles.userNameText}>
                {userProfile.firstName} {userProfile.lastName}
              </Text>
              <Text style={styles.userRoleText}>
                {userType === 'customer' ? 'Customer' : 'Driver'} • {userProfile.rating}⭐
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigate('notifications')}>
            <Text style={styles.notificationButtonText}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userProfile.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>P{userProfile.totalEarnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userProfile.rating}⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Modern Action Cards */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.modernActionCard,
                action.primary && styles.primaryActionCard,
                { backgroundColor: action.primary ? action.color : '#FFFFFF' }
              ]}
              onPress={() => handleNavigation(action.id)}
            >
              <View style={styles.actionCardContent}>
                <View style={[
                  styles.actionIcon,
                  { backgroundColor: action.primary ? 'rgba(255,255,255,0.2)' : `${action.color}20` }
                ]}>
                  <Text style={[
                    styles.actionIconText,
                    { color: action.primary ? '#FFFFFF' : action.color }
                  ]}>
                    {action.icon}
                  </Text>
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[
                    styles.actionTitle,
                    { color: action.primary ? '#FFFFFF' : '#1C1C1E' }
                  ]}>
                    {action.title}
                  </Text>
                  <Text style={[
                    styles.actionSubtitle,
                    { color: action.primary ? 'rgba(255,255,255,0.8)' : '#8E8E93' }
                  ]}>
                    {action.subtitle}
                  </Text>
                </View>
                <View style={styles.actionArrow}>
                  <Text style={[
                    styles.actionArrowText,
                    { color: action.primary ? '#FFFFFF' : '#8E8E93' }
                  ]}>
                    →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Modern Recent Activity Section */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigate('packageHistory')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>📦</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Package Delivered</Text>
              <Text style={styles.activitySubtitle}>Gaborone to Francistown</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
            <View style={styles.activityStatus}>
              <Text style={styles.activityStatusText}>P150</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>🚚</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Bid Accepted</Text>
              <Text style={styles.activitySubtitle}>Office supplies delivery</Text>
              <Text style={styles.activityTime}>5 hours ago</Text>
            </View>
            <View style={styles.activityStatus}>
              <Text style={styles.activityStatusText}>P200</Text>
            </View>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

function ProfileScreen() {
  const { goBack, navigate, userType, driverActive, setDriverActive, userProfile, setUserProfile } = useNavigation();
  const modernStyles = getModernStyles();

  // Photo handling functions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserProfile(prev => ({ ...prev, profilePhoto: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserProfile(prev => ({ ...prev, profilePhoto: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const showPhotoActionSheet = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  return (
    <ScrollView style={[styles.container, modernStyles.container]} showsVerticalScrollIndicator={false}>
      {/* Modern Profile Header */}
      <View style={styles.modernProfileHeader}>
        <View style={styles.profileHeaderTop}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              Alert.alert(
                'Edit Profile',
                'What would you like to edit?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Personal Info', onPress: () => {
                    Alert.alert('Edit Personal Info', 'Personal information editing will be available soon.');
                  }},
                  { text: 'Profile Photo', onPress: showPhotoActionSheet },
                  { text: 'Contact Details', onPress: () => {
                    Alert.alert('Edit Contact Details', 'Contact details editing will be available soon.');
                  }}
                ]
              );
            }}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfoContainer}>
          <View style={styles.profilePhotoLargeContainer}>
            {userProfile.profilePhoto ? (
              <Image source={{ uri: userProfile.profilePhoto }} style={styles.profilePhotoLarge} />
            ) : (
              <View style={styles.profilePhotoLargePlaceholder}>
                <Text style={styles.profilePhotoLargeText}>
                  {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={showPhotoActionSheet}>
              <Text style={styles.cameraButtonText}>📷</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileNameText}>
            {userProfile.firstName} {userProfile.lastName}
          </Text>
          <Text style={styles.profileEmailText}>{userProfile.email}</Text>
          <Text style={styles.profileRoleText}>
            {userType === 'customer' ? 'Customer' : 'Driver'} • {userProfile.rating}⭐
          </Text>
        </View>
        
        {/* Profile Stats */}
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userProfile.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>P{userProfile.totalEarnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userProfile.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>
      
      
      <View style={styles.profileActions}>
        {userType === 'driver' && (
          <View style={styles.activeCard}>
            <Text style={styles.infoTitle}>Driver Availability</Text>
            <View style={styles.driverStatusToggle}>
              <Text style={[styles.toggleLabel, modernStyles.text]}>
                {driverActive ? '🟢 Active' : '⚪ Active'}
              </Text>
              <TouchableOpacity 
                style={[styles.toggleSlider, driverActive ? styles.toggleSliderActive : styles.toggleSliderInactive]}
                onPress={() => {
                  // Toggle driver status directly
                  setDriverActive(!driverActive);
                  console.log('Driver status toggled:', !driverActive);
                  Alert.alert(
                    'Status Updated', 
                    `You are now ${!driverActive ? 'active' : 'inactive'}`
                  );
                }}
              >
                <View style={[styles.toggleThumb, driverActive ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigate('reviews')}
        >
          <Text style={styles.buttonText}>⭐ My Reviews</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigate('notifications')}
        >
          <Text style={styles.buttonText}>🔔 Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigate('verification')}
        >
          <Text style={styles.buttonText}>✅ Verification Status</Text>
        </TouchableOpacity>
        
      </View>
      
    </ScrollView>
  );
}

function SettingsScreen() {
  const { goBack, logout, userType, navigate } = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const modernStyles = getModernStyles();

  return (
    <View style={[styles.container, modernStyles.container]}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, modernStyles.title]}>Settings</Text>
        </View>
      </View>
      <Text style={[styles.subtitle, modernStyles.subtitle]}>Customize your experience</Text>
      
      <View style={[styles.settingItem, modernStyles.settingItem]}>
        <Text style={[styles.settingLabel, modernStyles.settingLabel]}>🔔 Push Notifications</Text>
        <TouchableOpacity 
          style={[styles.toggle, modernStyles.toggle, notificationsEnabled ? modernStyles.toggleOn : modernStyles.toggleOff]}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          <Text style={[styles.toggleText, modernStyles.toggleText]}>{notificationsEnabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.settingItem, modernStyles.settingItem]}>
        <Text style={[styles.settingLabel, modernStyles.settingLabel]}>📍 Location Services</Text>
        <TouchableOpacity 
          style={[styles.toggle, modernStyles.toggle, locationEnabled ? modernStyles.toggleOn : modernStyles.toggleOff]}
          onPress={() => setLocationEnabled(!locationEnabled)}
        >
          <Text style={[styles.toggleText, modernStyles.toggleText]}>{locationEnabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
      

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => navigate('permissions')}
      >
        <Text style={styles.settingButtonText}>🔐 App Permissions</Text>
        <Text style={styles.settingButtonSubtext}>Manage app permissions</Text>
      </TouchableOpacity>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>👤 User Type</Text>
        <Text style={styles.settingValue}>{userType === 'customer' ? 'Customer' : 'Driver'}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]}
        onPress={logout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
      
    </View>
  );
}

function AboutScreen() {
  const { goBack } = useNavigation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Ntsamaela</Text>
      <Text style={styles.aboutText}>
        Ntsamaela is a revolutionary delivery marketplace that connects customers with local delivery services.
      </Text>
      <Text style={styles.aboutText}>
        Version: 1.0.0{'\n'}
        Built with React Native & Expo
      </Text>
      
    </View>
  );
}

function ContactScreen() {
  const { goBack } = useNavigation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactItem}>📧 Email: support@ntsamaela.com</Text>
        <Text style={styles.contactItem}>📱 Phone: +1 (555) 123-4567</Text>
        <Text style={styles.contactItem}>🌐 Website: www.ntsamaela.com</Text>
        <Text style={styles.contactItem}>📍 Address: 123 Delivery St, City, State</Text>
      </View>
      
    </View>
  );
}


// Additional Screens
function CreatePackageScreen() {
  const { goBack, navigate } = useNavigation();
  const [formData, setFormData] = useState({
    description: '',
    pickupAddress: '',
    deliveryAddress: '',
    priceOffered: '',
    packageType: 'standard',
    weight: '',
    dimensions: '',
    specialInstructions: '',
    urgency: 'normal'
  });
  const [packagePhotos, setPackagePhotos] = useState([]);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Photo handling functions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPackagePhotos(prev => [...prev, result.assets[0]]);
        setShowPhotoOptions(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        setPackagePhotos(prev => [...prev, ...result.assets]);
        setShowPhotoOptions(false);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    }
  };

  const removePhoto = (index) => {
    setPackagePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const showPhotoActionSheet = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSubmit = () => {
    console.log('Creating package:', { ...formData, photos: packagePhotos });
    // In a real app, this would submit to the API
    Alert.alert('Package', 'Package created successfully!');
    navigate('myPackages');
  };

  const packageTypes = [
    { value: 'standard', label: '📦 Standard Package' },
    { value: 'fragile', label: '🔴 Fragile Items' },
    { value: 'documents', label: '📄 Documents' },
    { value: 'electronics', label: '💻 Electronics' },
    { value: 'clothing', label: '👕 Clothing' }
  ];

  const urgencyLevels = [
    { value: 'low', label: '🐌 Low Priority (3-5 days)' },
    { value: 'normal', label: '⚡ Normal (1-2 days)' },
    { value: 'urgent', label: '🚨 Urgent (Same day)' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Create Package</Text>
          <Text style={styles.subtitle}>Send your package with trusted drivers</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Package Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe what you're sending"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Package Type *</Text>
          <View style={styles.optionGroup}>
            {packageTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionButton,
                  formData.packageType === type.value && styles.selectedOption
                ]}
                onPress={() => updateFormData('packageType', type.value)}
              >
                <Text style={[
                  styles.optionText,
                  formData.packageType === type.value && styles.selectedOptionText
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pickup Address *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter pickup location"
            value={formData.pickupAddress}
            onChangeText={(value) => updateFormData('pickupAddress', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter delivery location"
            value={formData.deliveryAddress}
            onChangeText={(value) => updateFormData('deliveryAddress', value)}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Price Offered ($) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="25.00"
              value={formData.priceOffered}
              onChangeText={(value) => updateFormData('priceOffered', value)}
              keyboardType="numeric"
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2.5"
              value={formData.weight}
              onChangeText={(value) => updateFormData('weight', value)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Urgency Level *</Text>
          <View style={styles.optionGroup}>
            {urgencyLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionButton,
                  formData.urgency === level.value && styles.selectedOption
                ]}
                onPress={() => updateFormData('urgency', level.value)}
              >
                <Text style={[
                  styles.optionText,
                  formData.urgency === level.value && styles.selectedOptionText
                ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Special Instructions</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Any special handling requirements?"
            value={formData.specialInstructions}
            onChangeText={(value) => updateFormData('specialInstructions', value)}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Photo Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Package Photos (Optional)</Text>
          <Text style={styles.photoSubtext}>Add photos to help drivers identify your package</Text>
          
          {/* Photo Grid */}
          <View style={styles.photoGrid}>
            {packagePhotos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Add Photo Button */}
            {packagePhotos.length < 5 && (
              <TouchableOpacity 
                style={styles.addPhotoButton}
                onPress={showPhotoActionSheet}
              >
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {packagePhotos.length > 0 && (
            <Text style={styles.photoCountText}>
              {packagePhotos.length}/5 photos added
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>Create Package</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      
    </View>
  );
}

function MyPackagesScreen() {
  const { goBack, navigate } = useNavigation();
  const [myPackages, setMyPackages] = useState([
    {
      id: 1,
      description: 'Electronics package',
      pickupAddress: '123 Main St, Downtown',
      deliveryAddress: '456 Airport Blvd',
      priceOffered: 25,
      status: 'ACTIVE',
      bids: 3,
      createdAt: '2024-01-15',
      urgency: 'normal',
      photos: []
    },
    {
      id: 2,
      description: 'Important documents',
      pickupAddress: '789 Business Ave',
      deliveryAddress: '321 Suburb Lane',
      priceOffered: 18,
      status: 'IN_PROGRESS',
      bids: 1,
      createdAt: '2024-01-14',
      urgency: 'urgent',
      photos: []
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'IN_PROGRESS': return '#ffa500';
      case 'COMPLETED': return '#007AFF';
      case 'CANCELLED': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return '🟢';
      case 'IN_PROGRESS': return '🚚';
      case 'COMPLETED': return '✅';
      case 'CANCELLED': return '❌';
      default: return '📦';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Packages</Text>
          <Text style={styles.subtitle}>Track your delivery requests</Text>
        </View>
      </View>
      
      <View style={styles.packageList}>
        {myPackages.map((pkg) => (
          <View key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageDescription}>{pkg.description}</Text>
              <View style={[styles.packageStatus, { backgroundColor: getStatusColor(pkg.status) }]}>
                <Text style={styles.statusText}>{getStatusIcon(pkg.status)} {pkg.status.replace('_', ' ')}</Text>
              </View>
            </View>
            
            {/* Package Photos */}
            {pkg.photos && pkg.photos.length > 0 && (
              <View style={styles.packagePhotosContainer}>
                <Text style={styles.packagePhotosTitle}>📸 Package Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagePhotosScroll}>
                  {pkg.photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo.uri }} style={styles.packagePhoto} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{pkg.pickupAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <Text style={styles.detailText}>{pkg.deliveryAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <Text style={styles.detailText}>${pkg.priceOffered}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👥</Text>
                <Text style={styles.detailText}>{pkg.bids} bids received</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <Text style={styles.detailText}>Created: {pkg.createdAt}</Text>
              </View>
            </View>
            
            {pkg.status === 'ACTIVE' && (
              <View style={styles.packageActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigate('reviewBids', { packageId: pkg.id })}
                >
                  <Text style={styles.actionButtonText}>View Bids</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Package',
                      'Are you sure you want to cancel this package?',
                      [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes', onPress: () => {
                          // Update package status to cancelled
                          setMyPackages(prev => prev.map(p => 
                            p.id === pkg.id ? { ...p, status: 'CANCELLED' } : p
                          ));
                          Alert.alert('Package Cancelled', 'Your package has been cancelled.');
                        }}
                      ]
                    );
                  }}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
      
    </ScrollView>
  );
}

function AvailablePackagesScreen() {
  const { goBack, navigate } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedPackageType, setSelectedPackageType] = useState('all');
  const [showCounterBidModal, setShowCounterBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [counterBidAmount, setCounterBidAmount] = useState('');
  const [availablePackages, setAvailablePackages] = useState([
    {
      id: 1,
      description: 'Electronics package',
      pickupAddress: '123 Main St, Downtown',
      deliveryAddress: '456 Airport Blvd',
      priceOffered: 25,
      distance: '5.2 km',
      urgency: 'normal',
      packageType: 'electronics',
      weight: '2.5 kg',
      createdAt: '2024-01-15 10:30 AM'
    },
    {
      id: 2,
      description: 'Important documents',
      pickupAddress: '789 Business Ave',
      deliveryAddress: '321 Suburb Lane',
      priceOffered: 18,
      distance: '3.8 km',
      urgency: 'urgent',
      packageType: 'documents',
      weight: '0.5 kg',
      createdAt: '2024-01-15 11:15 AM'
    },
    {
      id: 3,
      description: 'Clothing items',
      pickupAddress: '555 Shopping Mall',
      deliveryAddress: '777 Residential Area',
      priceOffered: 15,
      distance: '7.1 km',
      urgency: 'low',
      packageType: 'clothing',
      weight: '1.2 kg',
      createdAt: '2024-01-15 09:45 AM'
    }
  ]);

  const placeBid = (packageId) => {
    console.log('Placing bid for package:', packageId);
    Alert.alert('Bid Placed', 'Your bid has been submitted successfully!');
  };

  const filteredPackages = availablePackages.filter(pkg => {
    const matchesSearch = pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = selectedUrgency === 'all' || pkg.urgency === selectedUrgency;
    const matchesType = selectedPackageType === 'all' || pkg.packageType === selectedPackageType;
    
    return matchesSearch && matchesUrgency && matchesType;
  });

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#ff4444';
      case 'normal': return '#ffa500';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'urgent': return '🚨';
      case 'normal': return '⚡';
      case 'low': return '🐌';
      default: return '📦';
    }
  };

  const handleCounterBid = (pkg) => {
    setSelectedPackage(pkg);
    setCounterBidAmount('');
    setShowCounterBidModal(true);
  };

  const handleSubmitCounterBid = () => {
    if (!counterBidAmount || isNaN(parseFloat(counterBidAmount)) || parseFloat(counterBidAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
      return;
    }

    const amount = parseFloat(counterBidAmount);
    Alert.alert(
      'Counter Bid Submitted',
      `Your counter bid of P${amount.toFixed(2)} has been submitted for "${selectedPackage.description}". The customer will be notified.`,
      [
        { text: 'OK', onPress: () => {
          setShowCounterBidModal(false);
          setSelectedPackage(null);
          setCounterBidAmount('');
        }}
      ]
    );
  };

  const handleCloseCounterBidModal = () => {
    setShowCounterBidModal(false);
    setSelectedPackage(null);
    setCounterBidAmount('');
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Available Packages</Text>
          <Text style={styles.subtitle}>Find packages to deliver</Text>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Search Packages</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search by description, pickup, or delivery address"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.optionGroup}>
              {[
                { value: 'all', label: 'All' },
                { value: 'urgent', label: '🚨 Urgent' },
                { value: 'normal', label: '⚡ Normal' },
                { value: 'low', label: '🐌 Low' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selectedUrgency === option.value && styles.selectedOption
                  ]}
                  onPress={() => setSelectedUrgency(option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedUrgency === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Package Type</Text>
            <View style={styles.optionGroup}>
              {[
                { value: 'all', label: 'All' },
                { value: 'electronics', label: '💻 Electronics' },
                { value: 'documents', label: '📄 Documents' },
                { value: 'clothing', label: '👕 Clothing' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selectedPackageType === option.value && styles.selectedOption
                  ]}
                  onPress={() => setSelectedPackageType(option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedPackageType === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available Packages ({filteredPackages.length})</Text>
      
      <View style={styles.packageList}>
        {filteredPackages.map((pkg) => (
          <View key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageDescription}>{pkg.description}</Text>
              <View style={[styles.packageStatus, { backgroundColor: getUrgencyColor(pkg.urgency) }]}>
                <Text style={styles.statusText}>{getUrgencyIcon(pkg.urgency)} {pkg.urgency.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{pkg.pickupAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <Text style={styles.detailText}>{pkg.deliveryAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <Text style={styles.detailText}>${pkg.priceOffered}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📏</Text>
                <Text style={styles.detailText}>{pkg.distance}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⚖️</Text>
                <Text style={styles.detailText}>{pkg.weight}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <Text style={styles.detailText}>Posted: {pkg.createdAt}</Text>
              </View>
            </View>
            
            <View style={styles.packageActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#059669' }]}
                onPress={() => {
                  Alert.alert(
                    'Accept Package',
                    `Accept this package for P${pkg.priceOffered}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Accept', onPress: () => {
                        Alert.alert('Package Accepted', 'You have accepted this package. The customer will be notified.');
                      }}
                    ]
                  );
                }}
              >
                <Text style={styles.actionButtonText}>✅ Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#2563EB' }]}
                onPress={() => handleCounterBid(pkg)}
              >
                <Text style={styles.actionButtonText}>💰 Counter Bid</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      
      {/* Counter Bid Modal */}
      <Modal
        visible={showCounterBidModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseCounterBidModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Counter Bid</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={handleCloseCounterBidModal}
                >
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {selectedPackage && (
                <View style={styles.modalPackageInfo}>
                  <Text style={styles.modalPackageTitle}>{selectedPackage.description}</Text>
                  <Text style={styles.modalPackageDetails}>
                    Customer offered: P{selectedPackage.priceOffered}
                  </Text>
                </View>
              )}
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Your Counter Bid Amount (P)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter your bid amount"
                  value={counterBidAmount}
                  onChangeText={setCounterBidAmount}
                  keyboardType="numeric"
                  autoFocus={true}
                />
                <Text style={styles.modalInputHint}>
                  Enter a competitive bid amount
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCloseCounterBidModal}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalSubmitButton]}
                  onPress={handleSubmitCounterBid}
                >
                  <Text style={styles.modalSubmitButtonText}>Submit Bid</Text>
                </TouchableOpacity>
              </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
    </ScrollView>
  );
}

// Earnings Dashboard Screen
function EarningsDashboardScreen() {
  const { goBack } = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [earningsData] = useState({
    week: {
      totalEarnings: 245.50,
      completedDeliveries: 12,
      averagePerDelivery: 20.46,
      commission: 73.65,
      netEarnings: 171.85
    },
    month: {
      totalEarnings: 1250.00,
      completedDeliveries: 58,
      averagePerDelivery: 21.55,
      commission: 375.00,
      netEarnings: 875.00
    },
    year: {
      totalEarnings: 15250.00,
      completedDeliveries: 720,
      averagePerDelivery: 21.18,
      commission: 4575.00,
      netEarnings: 10675.00
    }
  });

  const [recentEarnings] = useState([
    { id: 1, date: '2024-01-15', amount: 25.00, package: 'Electronics delivery', status: 'completed' },
    { id: 2, date: '2024-01-15', amount: 18.50, package: 'Document delivery', status: 'completed' },
    { id: 3, date: '2024-01-14', amount: 32.00, package: 'Furniture delivery', status: 'completed' },
    { id: 4, date: '2024-01-14', amount: 15.00, package: 'Clothing delivery', status: 'completed' },
    { id: 5, date: '2024-01-13', amount: 28.50, package: 'Grocery delivery', status: 'completed' }
  ]);

  const currentData = earningsData[selectedPeriod];
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Week';
    }
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || isNaN(parseFloat(withdrawAmount)) || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > currentData.netEarnings) {
      Alert.alert('Insufficient Funds', 'You cannot withdraw more than your available earnings.');
      return;
    }

    Alert.alert(
      'Withdrawal Request',
      `Withdraw P${amount.toFixed(2)} to your bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            Alert.alert('Withdrawal Submitted', 'Your withdrawal request has been submitted. Funds will be transferred within 2-3 business days.');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Earnings Dashboard</Text>
          <Text style={styles.subtitle}>Track your delivery earnings</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['week', 'month', 'year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.selectedPeriod
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.selectedPeriodText
            ]}>
              {getPeriodLabel(period)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings Summary */}
      <View style={styles.earningsSummary}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>${currentData.totalEarnings.toFixed(2)}</Text>
        </View>
        
        <View style={styles.earningsGrid}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsItemLabel}>Completed Deliveries</Text>
            <Text style={styles.earningsItemValue}>{currentData.completedDeliveries}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={styles.earningsItemLabel}>Average per Delivery</Text>
            <Text style={styles.earningsItemValue}>${currentData.averagePerDelivery.toFixed(2)}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={styles.earningsItemLabel}>Platform Commission</Text>
            <Text style={[styles.earningsItemValue, { color: '#ff4444' }]}>-${currentData.commission.toFixed(2)}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={styles.earningsItemLabel}>Net Earnings</Text>
            <Text style={[styles.earningsItemValue, { color: '#4CAF50' }]}>${currentData.netEarnings.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Account Management */}
      <View style={styles.accountManagement}>
        <TouchableOpacity 
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
        >
          <Text style={styles.withdrawButtonText}>💰 Withdraw Funds</Text>
        </TouchableOpacity>
        
      </View>

      {/* Recent Earnings */}
      <Text style={styles.sectionTitle}>Recent Earnings</Text>
      
      <View style={styles.recentEarningsList}>
        {recentEarnings.map((earning) => (
          <View key={earning.id} style={styles.earningCard}>
            <View style={styles.earningHeader}>
              <Text style={styles.earningPackage}>{earning.package}</Text>
              <Text style={styles.earningAmount}>+${earning.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.earningFooter}>
              <Text style={styles.earningDate}>{earning.date}</Text>
              <View style={[styles.earningStatus, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.earningStatusText}>✓ {earning.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Performance Insights */}
      <View style={styles.performanceInsights}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>🎯 This Week's Goal</Text>
          <Text style={styles.insightText}>
            You've completed {currentData.completedDeliveries} deliveries this week. 
            Keep up the great work!
          </Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>📈 Top Performing Day</Text>
          <Text style={styles.insightText}>
            Tuesday was your best day with 5 completed deliveries and $125 in earnings.
          </Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>💡 Earning Tips</Text>
          <Text style={styles.insightText}>
            • Focus on urgent deliveries for higher pay{'\n'}
            • Complete deliveries during peak hours{'\n'}
            • Maintain a high rating for better opportunities
          </Text>
        </View>
      </View>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <Text style={styles.modalSubtitle}>
              Available Balance: P{currentData.netEarnings.toFixed(2)}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Withdrawal Amount (P):</Text>
              <TextInput
                style={styles.amountInput}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleWithdraw}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Package History Screen
function PackageHistoryScreen() {
  const { goBack } = useNavigation();
  const [selectedTab, setSelectedTab] = useState('history'); // history, favorites
  const [packageHistory] = useState([
    {
      id: 1,
      description: 'Electronics package',
      pickupAddress: '123 Main St, Downtown',
      deliveryAddress: '456 Airport Blvd',
      pricePaid: 25,
      status: 'completed',
      driverName: 'John Driver',
      rating: 5,
      deliveryDate: '2024-01-15',
      isFavorite: true
    },
    {
      id: 2,
      description: 'Important documents',
      pickupAddress: '789 Business Ave',
      deliveryAddress: '321 Suburb Lane',
      pricePaid: 18,
      status: 'completed',
      driverName: 'Sarah Wilson',
      rating: 4,
      deliveryDate: '2024-01-14',
      isFavorite: false
    },
    {
      id: 3,
      description: 'Clothing items',
      pickupAddress: '555 Shopping Mall',
      deliveryAddress: '777 Residential Area',
      pricePaid: 15,
      status: 'completed',
      driverName: 'Mike Johnson',
      rating: 5,
      deliveryDate: '2024-01-13',
      isFavorite: true
    },
    {
      id: 4,
      description: 'Furniture delivery',
      pickupAddress: '999 Furniture Store',
      deliveryAddress: '111 Home Address',
      pricePaid: 45,
      status: 'completed',
      driverName: 'Lisa Driver',
      rating: 4,
      deliveryDate: '2024-01-12',
      isFavorite: false
    }
  ]);

  const [favoriteDrivers] = useState([
    {
      id: 1,
      name: 'John Driver',
      rating: 4.9,
      completedDeliveries: 245,
      vehicle: 'Toyota Camry',
      lastDelivery: '2024-01-15',
      isOnline: true
    },
    {
      id: 2,
      name: 'Mike Johnson',
      rating: 4.8,
      completedDeliveries: 189,
      vehicle: 'Honda Civic',
      lastDelivery: '2024-01-13',
      isOnline: false
    }
  ]);

  const toggleFavorite = (packageId) => {
    console.log('Toggling favorite for package:', packageId);
    // In a real app, this would update the backend
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#ffa500';
      case 'cancelled': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🚚';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const filteredPackages = selectedTab === 'favorites' 
    ? packageHistory.filter(pkg => pkg.isFavorite)
    : packageHistory;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Package History</Text>
          <Text style={styles.subtitle}>Your delivery history and favorites</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'history' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'history' && styles.selectedTabText
          ]}>
            📋 History ({packageHistory.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'favorites' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('favorites')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'favorites' && styles.selectedTabText
          ]}>
            ⭐ Favorites ({packageHistory.filter(pkg => pkg.isFavorite).length})
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'history' ? (
        <>
          <Text style={styles.sectionTitle}>Recent Deliveries</Text>
          
          <View style={styles.packageList}>
            {filteredPackages.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                  <View style={styles.packageHeaderRight}>
                    <TouchableOpacity 
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(pkg.id)}
                    >
                      <Text style={styles.favoriteIcon}>
                        {pkg.isFavorite ? '❤️' : '🤍'}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.packageStatus, { backgroundColor: getStatusColor(pkg.status) }]}>
                      <Text style={styles.statusText}>{getStatusIcon(pkg.status)} {pkg.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.packageDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{pkg.pickupAddress}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🎯</Text>
                    <Text style={styles.detailText}>{pkg.deliveryAddress}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>💰</Text>
                    <Text style={styles.detailText}>Paid: ${pkg.pricePaid}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>👤</Text>
                    <Text style={styles.detailText}>Driver: {pkg.driverName}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⭐</Text>
                    <Text style={styles.detailText}>Rating: {getRatingStars(pkg.rating)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>Delivered: {pkg.deliveryDate}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Favorite Drivers</Text>
          
          <View style={styles.driversList}>
            {favoriteDrivers.map((driver) => (
              <View key={driver.id} style={styles.driverCard}>
                <View style={styles.driverHeader}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
                  </View>
                  <View style={styles.driverStatus}>
                    <Text style={styles.onlineStatus}>
                      {driver.isOnline ? '🟢 Online' : '🔴 Offline'}
                    </Text>
                    <Text style={styles.driverRating}>⭐ {driver.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.driverDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🚗</Text>
                    <Text style={styles.detailText}>{driver.completedDeliveries} deliveries completed</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>Last delivery: {driver.lastDelivery}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.selectDriverButton}
                  onPress={() => console.log('Selecting favorite driver:', driver.name)}
                >
                  <Text style={styles.selectDriverButtonText}>Request Delivery</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Live Tracking Screen - Real-time package tracking
function LiveTrackingScreen() {
  const { goBack } = useNavigation();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: -26.2041,
    longitude: 28.0473,
    address: 'Johannesburg, South Africa'
  });
  const [trackingData, setTrackingData] = useState({
    packageId: 'PKG-2024-001',
    status: 'IN_TRANSIT',
    driver: {
      name: 'John Driver',
      phone: '+27 82 123 4567',
      rating: 4.8,
      vehicle: 'Toyota Camry',
      licensePlate: 'CA 123 GP'
    },
    route: {
      pickup: '123 Main St, Downtown',
      delivery: '456 Airport Blvd, Airport',
      estimatedArrival: '2:30 PM',
      distance: '15.2 km',
      duration: '25 min'
    },
    timeline: [
      { status: 'Package Picked Up', time: '1:45 PM', completed: true, location: 'Downtown' },
      { status: 'In Transit', time: '1:50 PM', completed: true, location: 'Highway N1' },
      { status: 'Approaching Delivery', time: '2:15 PM', completed: false, location: 'Airport Area' },
      { status: 'Delivered', time: 'Pending', completed: false, location: 'Airport Blvd' }
    ]
  });

  const [locationUpdates, setLocationUpdates] = useState([
    { time: '2:15 PM', location: 'Highway N1, 5km from destination', speed: '65 km/h' },
    { time: '2:10 PM', location: 'Main Road, 8km from destination', speed: '45 km/h' },
    { time: '2:05 PM', location: 'City Center, 12km from destination', speed: '30 km/h' }
  ]);

  const startTracking = () => {
    setIsTracking(true);
    console.log('Starting live tracking for package:', trackingData.packageId);
    // In a real app, this would start WebSocket connection for live updates
  };

  const stopTracking = () => {
    setIsTracking(false);
    console.log('Stopping live tracking');
  };

  const callDriver = () => {
    console.log('Calling driver:', trackingData.driver.phone);
    Alert.alert('Call Driver', `Calling ${trackingData.driver.name} at ${trackingData.driver.phone}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN_TRANSIT': return '#007AFF';
      case 'APPROACHING': return '#ffa500';
      case 'DELIVERED': return '#4CAF50';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'IN_TRANSIT': return '🚚';
      case 'APPROACHING': return '📍';
      case 'DELIVERED': return '✅';
      default: return '📦';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Live Tracking</Text>
          <Text style={styles.subtitle}>Real-time package location</Text>
        </View>
      </View>

      {/* Package Info Card */}
      <View style={styles.trackingCard}>
        <View style={styles.trackingHeader}>
          <Text style={styles.trackingId}>Package: {trackingData.packageId}</Text>
          <View style={[styles.trackingStatus, { backgroundColor: getStatusColor(trackingData.status) }]}>
            <Text style={styles.trackingStatusText}>
              {getStatusIcon(trackingData.status)} {trackingData.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>📍 Pickup</Text>
            <Text style={styles.routeText}>{trackingData.route.pickup}</Text>
          </View>
          
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>🎯 Delivery</Text>
            <Text style={styles.routeText}>{trackingData.route.delivery}</Text>
          </View>
          
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>Distance</Text>
              <Text style={styles.routeStatValue}>{trackingData.route.distance}</Text>
            </View>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>ETA</Text>
              <Text style={styles.routeStatValue}>{trackingData.route.estimatedArrival}</Text>
            </View>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>Duration</Text>
              <Text style={styles.routeStatValue}>{trackingData.route.duration}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Driver Info Card */}
      <View style={styles.driverCard}>
        <Text style={styles.sectionTitle}>Your Driver</Text>
        <View style={styles.driverInfo}>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{trackingData.driver.name}</Text>
            <Text style={styles.driverVehicle}>{trackingData.driver.vehicle} • {trackingData.driver.licensePlate}</Text>
            <Text style={styles.driverRating}>⭐ {trackingData.driver.rating} Rating</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={callDriver}>
            <Text style={styles.callButtonText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Location Updates */}
      <Text style={styles.sectionTitle}>Live Location Updates</Text>
      
      <View style={styles.locationUpdates}>
        {locationUpdates.map((update, index) => (
          <View key={index} style={styles.locationUpdate}>
            <View style={styles.updateHeader}>
              <Text style={styles.updateTime}>{update.time}</Text>
              <Text style={styles.updateSpeed}>{update.speed}</Text>
            </View>
            <Text style={styles.updateLocation}>{update.location}</Text>
            {index === 0 && (
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>🔴 LIVE</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Tracking Controls */}
      <View style={styles.trackingControls}>
        {!isTracking ? (
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={startTracking}
          >
            <Text style={styles.buttonText}>🚀 Start Live Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]}
            onPress={stopTracking}
          >
            <Text style={styles.buttonText}>⏹️ Stop Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delivery Timeline */}
      <Text style={styles.sectionTitle}>Delivery Progress</Text>
      
      <View style={styles.timeline}>
        {trackingData.timeline.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <View style={[
                styles.timelineDot,
                item.completed && styles.timelineDotCompleted,
                index === 2 && !item.completed && styles.timelineDotCurrent
              ]} />
              {index < trackingData.timeline.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  item.completed && styles.timelineLineCompleted
                ]} />
              )}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[
                styles.timelineStatus,
                item.completed && styles.timelineStatusCompleted
              ]}>
                {item.status}
              </Text>
              <Text style={styles.timelineTime}>{item.time}</Text>
              <Text style={styles.timelineLocation}>{item.location}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>🗺️ Interactive Map</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Real-time driver location and route visualization
        </Text>
        <Text style={styles.mapPlaceholderNote}>
          * Map integration would show live driver position, route, and traffic conditions
        </Text>
      </View>
    </ScrollView>
  );
}

// Delivery Confirmation Screen - Driver enters recipient code to release funds
function DeliveryConfirmationScreen() {
  const { goBack, releaseToDriver } = useNavigation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const confirmDelivery = () => {
    if (code.length < 4) {
      setError('Enter the 4-digit code');
      return;
    }
    setError('');
    releaseToDriver(50, 0.30);
    Alert.alert('Delivery Confirmed', 'Funds released to driver (after commission).', [
      { text: 'OK', onPress: goBack }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Delivery Confirmation</Text>
          <Text style={styles.subtitle}>Enter recipient code to release funds</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Recipient Code (SMS)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 1234"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={{ color: '#ff4444', marginTop: 6 }}>{error}</Text> : null}
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={confirmDelivery}
      >
        <Text style={styles.buttonText}>✅ Confirm Delivery</Text>
      </TouchableOpacity>

      <View style={styles.commissionInfo}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          • Customer funds are reserved at pickup{'\n'}
          • Driver enters the delivery code from the recipient{'\n'}
          • On success, funds are released minus 30% commission
        </Text>
      </View>
    </ScrollView>
  );
}


// Review Bids Screen - Customer reviews and accepts bids
function ReviewBidsScreen() {
  const { goBack, packageBids, acceptBid } = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState('PKG-001');
  const [showCounterBidModal, setShowCounterBidModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [counterBidAmount, setCounterBidAmount] = useState('');
  
  const packageBidsList = packageBids.filter(bid => bid.packageId === selectedPackage);
  
  const handleAcceptBid = (bidId) => {
    Alert.alert(
      'Accept Bid',
      'Are you sure you want to accept this bid? This will reject all other bids for this package.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => {
          acceptBid(bidId);
          Alert.alert('Bid Accepted', 'The driver has been notified and will contact you soon.');
        }}
      ]
    );
  };

  const handleCounterBid = (bidId, currentAmount) => {
    const bid = packageBidsList.find(b => b.id === bidId);
    setSelectedBid(bid);
    setCounterBidAmount(currentAmount.toString());
    setShowCounterBidModal(true);
  };

  const handleSubmitCounterBid = () => {
    if (!counterBidAmount || isNaN(parseFloat(counterBidAmount)) || parseFloat(counterBidAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid counter bid amount.');
      return;
    }

    const amount = parseFloat(counterBidAmount);
    Alert.alert(
      'Counter Bid Submitted',
      `Your counter bid of $${amount.toFixed(2)} has been sent to the driver.`,
      [{ text: 'OK' }]
    );
    console.log('Counter bid submitted:', { bidId: selectedBid.id, counterAmount: amount });
    
    // Close modal and reset state
    setShowCounterBidModal(false);
    setSelectedBid(null);
    setCounterBidAmount('');
  };

  const handleCloseCounterBidModal = () => {
    setShowCounterBidModal(false);
    setSelectedBid(null);
    setCounterBidAmount('');
  };

  const getRatingStars = (rating) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Review Bids</Text>
          <Text style={styles.subtitle}>Choose the best driver for your package</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Bids for Package {selectedPackage} ({packageBidsList.length})</Text>
      
      <View style={styles.bidsList}>
        {packageBidsList.map((bid) => (
          <View key={bid.id} style={styles.bidCard}>
            <View style={styles.bidHeader}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{bid.driverName}</Text>
                <Text style={styles.driverVehicle}>{bid.vehicle} • {bid.licensePlate}</Text>
              </View>
              <View style={styles.bidAmount}>
                <Text style={styles.bidAmountLabel}>Bid Amount</Text>
                <Text style={styles.bidAmountValue}>${bid.bidAmount}</Text>
              </View>
            </View>
            
            <View style={styles.driverStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>{getRatingStars(bid.driverRating)} {bid.driverRating}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Completed Trips</Text>
                <Text style={styles.statValue}>{bid.completedTrips}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Submitted</Text>
                <Text style={styles.statValue}>{bid.submittedAt}</Text>
              </View>
            </View>
            
            <View style={styles.bidMessage}>
              <Text style={styles.messageLabel}>Message:</Text>
              <Text style={styles.messageText}>"{bid.message}"</Text>
            </View>
            
            <View style={styles.bidActions}>
              <TouchableOpacity 
                style={styles.bidButton}
                onPress={() => handleAcceptBid(bid.id)}
              >
                <Text style={styles.bidButtonText}>Accept Bid</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.bidButton}
                onPress={() => handleCounterBid(bid.id, bid.bidAmount)}
              >
                <Text style={styles.bidButtonText}>Counter Bid</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      
      {packageBidsList.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No bids received yet</Text>
          <Text style={styles.emptyStateSubtext}>Drivers will be able to place bids on your package</Text>
        </View>
      )}

      {/* Counter Bid Modal */}
      {showCounterBidModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Counter Bid</Text>
            <Text style={styles.modalSubtitle}>
              Driver: {selectedBid?.driverName}
            </Text>
            <Text style={styles.modalSubtitle}>
              Current bid: ${selectedBid?.bidAmount}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your counter bid amount:</Text>
              <TextInput
                style={styles.amountInput}
                value={counterBidAmount}
                onChangeText={setCounterBidAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseCounterBidModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitCounterBid}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Submit Counter Bid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// My Bids Screen - Driver bidding management
function MyBidsScreen() {
  const { goBack } = useNavigation();
  const [selectedTab, setSelectedTab] = useState('active'); // active, won, lost
  const [myBids] = useState([
    {
      id: 1,
      packageId: 'PKG-2024-001',
      packageDescription: 'Electronics package',
      pickupAddress: '123 Main St, Downtown',
      deliveryAddress: '456 Airport Blvd',
      bidAmount: 25,
      status: 'PENDING',
      submittedAt: '2024-01-15 10:30 AM',
      customerName: 'John Customer',
      urgency: 'normal',
      estimatedTime: '2 hours',
      distance: '15.2 km'
    },
    {
      id: 2,
      packageId: 'PKG-2024-002',
      packageDescription: 'Important documents',
      pickupAddress: '789 Business Ave',
      deliveryAddress: '321 Suburb Lane',
      bidAmount: 18,
      status: 'ACCEPTED',
      submittedAt: '2024-01-15 09:15 AM',
      customerName: 'Sarah Customer',
      urgency: 'urgent',
      estimatedTime: '1.5 hours',
      distance: '8.5 km'
    },
    {
      id: 3,
      packageId: 'PKG-2024-003',
      packageDescription: 'Clothing items',
      pickupAddress: '555 Shopping Mall',
      deliveryAddress: '777 Residential Area',
      bidAmount: 15,
      status: 'REJECTED',
      submittedAt: '2024-01-14 16:45 PM',
      customerName: 'Mike Customer',
      urgency: 'low',
      estimatedTime: '3 hours',
      distance: '22.1 km'
    },
    {
      id: 4,
      packageId: 'PKG-2024-004',
      packageDescription: 'Furniture delivery',
      pickupAddress: '999 Furniture Store',
      deliveryAddress: '111 New Home',
      bidAmount: 45,
      status: 'PENDING',
      submittedAt: '2024-01-15 11:20 AM',
      customerName: 'Lisa Customer',
      urgency: 'normal',
      estimatedTime: '4 hours',
      distance: '18.7 km'
    }
  ]);

  const [bidStats] = useState({
    totalBids: 24,
    acceptedBids: 18,
    pendingBids: 4,
    rejectedBids: 2,
    successRate: '75%',
    averageBidAmount: 'P28.50',
    totalEarnings: 'P1,250.00'
  });

  const withdrawBid = (bidId) => {
    console.log('Withdrawing bid:', bidId);
    Alert.alert('Withdraw Bid', 'Are you sure you want to withdraw this bid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => {
        Alert.alert('Bid Withdrawn', 'Your bid has been successfully withdrawn.');
      }}
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED': return '#4CAF50';
      case 'PENDING': return '#ffa500';
      case 'REJECTED': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACCEPTED': return '✅';
      case 'PENDING': return '⏳';
      case 'REJECTED': return '❌';
      default: return '📦';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#ff4444';
      case 'normal': return '#ffa500';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'urgent': return '🚨';
      case 'normal': return '⚡';
      case 'low': return '🐌';
      default: return '📦';
    }
  };

  const filteredBids = myBids.filter(bid => {
    switch (selectedTab) {
      case 'active': return bid.status === 'PENDING';
      case 'won': return bid.status === 'ACCEPTED';
      case 'lost': return bid.status === 'REJECTED';
      default: return true;
    }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Bids</Text>
          <Text style={styles.subtitle}>Manage your delivery bids</Text>
        </View>
      </View>

      {/* Bid Statistics */}
      <View style={styles.bidStatsCard}>
        <Text style={styles.bidStatsTitle}>📊 Bidding Performance</Text>
        <View style={styles.bidStatsGrid}>
          <View style={styles.bidStatItem}>
            <Text style={styles.bidStatNumber}>{bidStats.totalBids}</Text>
            <Text style={styles.bidStatLabel}>Total Bids</Text>
          </View>
          <View style={styles.bidStatItem}>
            <Text style={styles.bidStatNumber}>{bidStats.acceptedBids}</Text>
            <Text style={styles.bidStatLabel}>Accepted</Text>
          </View>
          <View style={styles.bidStatItem}>
            <Text style={styles.bidStatNumber}>{bidStats.successRate}</Text>
            <Text style={styles.bidStatLabel}>Success Rate</Text>
          </View>
          <View style={styles.bidStatItem}>
            <Text style={styles.bidStatNumber}>{bidStats.averageBidAmount}</Text>
            <Text style={styles.bidStatLabel}>Avg Bid</Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'active' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'active' && styles.selectedTabText
          ]}>
            ⏳ Active ({myBids.filter(bid => bid.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'won' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('won')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'won' && styles.selectedTabText
          ]}>
            ✅ Won ({myBids.filter(bid => bid.status === 'ACCEPTED').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'lost' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('lost')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'lost' && styles.selectedTabText
          ]}>
            ❌ Lost ({myBids.filter(bid => bid.status === 'REJECTED').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bids List */}
      <View style={styles.bidsList}>
        {filteredBids.map((bid) => (
          <View key={bid.id} style={styles.bidCard}>
            <View style={styles.bidHeader}>
              <Text style={styles.bidPackageId}>{bid.packageId}</Text>
              <View style={[styles.bidStatus, { backgroundColor: getStatusColor(bid.status) }]}>
                <Text style={styles.bidStatusText}>{getStatusIcon(bid.status)} {bid.status}</Text>
              </View>
            </View>
            
            <Text style={styles.bidDescription}>{bid.packageDescription}</Text>
            
            <View style={styles.bidDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{bid.pickupAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <Text style={styles.detailText}>{bid.deliveryAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👤</Text>
                <Text style={styles.detailText}>Customer: {bid.customerName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <Text style={styles.detailText}>Submitted: {bid.submittedAt}</Text>
              </View>
            </View>
            
            <View style={styles.bidInfo}>
              <View style={styles.bidAmount}>
                <Text style={styles.bidAmountLabel}>Your Bid</Text>
                <Text style={styles.bidAmountValue}>${bid.bidAmount}</Text>
              </View>
              
              <View style={styles.bidMetrics}>
                <View style={styles.bidMetric}>
                  <Text style={styles.bidMetricLabel}>⏱️</Text>
                  <Text style={styles.bidMetricValue}>{bid.estimatedTime}</Text>
                </View>
                <View style={styles.bidMetric}>
                  <Text style={styles.bidMetricLabel}>📏</Text>
                  <Text style={styles.bidMetricValue}>{bid.distance}</Text>
                </View>
                <View style={styles.bidMetric}>
                  <Text style={[styles.bidMetricLabel, { color: getUrgencyColor(bid.urgency) }]}>
                    {getUrgencyIcon(bid.urgency)}
                  </Text>
                  <Text style={styles.bidMetricValue}>{bid.urgency}</Text>
                </View>
              </View>
            </View>
            
            {bid.status === 'PENDING' && (
              <View style={styles.bidActions}>
                <TouchableOpacity 
                  style={[styles.bidActionButton, styles.withdrawButton]}
                  onPress={() => withdrawBid(bid.id)}
                >
                  <Text style={styles.bidActionButtonText}>Withdraw Bid</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.bidActionButton, styles.editButton]}
                  onPress={() => console.log('Edit bid:', bid.id)}
                >
                  <Text style={styles.bidActionButtonText}>Edit Bid</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {bid.status === 'ACCEPTED' && (
              <View style={styles.bidActions}>
                <TouchableOpacity 
                  style={[styles.bidActionButton, styles.primaryButton]}
                  onPress={() => console.log('Start delivery:', bid.id)}
                >
                  <Text style={styles.bidActionButtonText}>Start Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.bidActionButton, styles.secondaryButton]}
                  onPress={() => console.log('Contact customer:', bid.id)}
                >
                  <Text style={styles.bidActionButtonText}>Contact Customer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
      
      {filteredBids.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {selectedTab === 'active' ? 'No active bids' :
             selectedTab === 'won' ? 'No accepted bids' : 'No rejected bids'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedTab === 'active' ? 'Browse available packages to place new bids' :
             selectedTab === 'won' ? 'Your accepted bids will appear here' : 'Your rejected bids will appear here'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// My Trips Screen - Driver trip management
function MyTripsScreen() {
  const { goBack, navigate, reserveFromCustomer, releaseToDriver, cancelWithPenalty } = useNavigation();
  const [selectedTab, setSelectedTab] = useState('active'); // active, completed, planned
  const [myTrips] = useState([
    {
      id: 1,
      tripId: 'TRIP-2024-001',
      from: 'Downtown City Center',
      to: 'Airport Terminal',
      departureDate: '2024-01-15',
      departureTime: '14:30',
      status: 'ACTIVE',
      packages: 2,
      totalEarnings: 45,
      distance: '25.5 km',
      estimatedDuration: '45 min',
      vehicleType: 'Sedan',
      availableCapacity: '2 packages',
      route: [
        { location: 'Downtown City Center', time: '14:30', action: 'Departure' },
        { location: 'Package Pickup - 123 Main St', time: '14:45', action: 'Pickup' },
        { location: 'Package Pickup - 456 Oak Ave', time: '15:00', action: 'Pickup' },
        { location: 'Airport Terminal', time: '15:15', action: 'Arrival' }
      ]
    },
    {
      id: 2,
      tripId: 'TRIP-2024-002',
      from: 'Business District',
      to: 'Suburban Area',
      departureDate: '2024-01-16',
      departureTime: '09:00',
      status: 'PLANNED',
      packages: 0,
      totalEarnings: 0,
      distance: '18.2 km',
      estimatedDuration: '35 min',
      vehicleType: 'SUV',
      availableCapacity: '4 packages',
      route: [
        { location: 'Business District', time: '09:00', action: 'Departure' },
        { location: 'Suburban Area', time: '09:35', action: 'Arrival' }
      ]
    },
    {
      id: 3,
      tripId: 'TRIP-2024-003',
      from: 'Shopping Mall',
      to: 'Residential Complex',
      departureDate: '2024-01-14',
      departureTime: '16:00',
      status: 'COMPLETED',
      packages: 3,
      totalEarnings: 75,
      distance: '12.8 km',
      estimatedDuration: '25 min',
      vehicleType: 'Van',
      availableCapacity: '0 packages',
      route: [
        { location: 'Shopping Mall', time: '16:00', action: 'Departure' },
        { location: 'Package Pickup - 789 Mall St', time: '16:10', action: 'Pickup' },
        { location: 'Package Pickup - 321 Store Ave', time: '16:15', action: 'Pickup' },
        { location: 'Package Pickup - 555 Shop Blvd', time: '16:20', action: 'Pickup' },
        { location: 'Residential Complex', time: '16:25', action: 'Arrival' }
      ]
    }
  ]);

  const [tripStats] = useState({
    totalTrips: 15,
    activeTrips: 1,
    completedTrips: 12,
    plannedTrips: 2,
    totalEarnings: '$1,850.00',
    averageEarnings: '$123.33',
    totalDistance: '425.6 km',
    successRate: '96%'
  });

  const startTrip = (tripId) => {
    console.log('Starting trip:', tripId);
    Alert.alert('Start Trip', 'Are you ready to start this trip?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Trip', onPress: () => {
        // Reserve funds at pickup (simulate $50 for demo)
        const reserved = reserveFromCustomer(50);
        if (reserved) {
          Alert.alert('Trip Started', 'Funds reserved from customer. Safe travels!');
        }
      }}
    ]);
  };

  const cancelTrip = (tripId) => {
    console.log('Canceling trip:', tripId);
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
      { text: 'Keep Trip', style: 'cancel' },
      { text: 'Cancel Trip', style: 'destructive', onPress: () => {
        // Apply 10% penalty on reserved amount example ($50)
        cancelWithPenalty(50, 0.10);
        Alert.alert('Trip Cancelled', 'A 10% penalty has been applied.');
      }}
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'PLANNED': return '#ffa500';
      case 'COMPLETED': return '#007AFF';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return '🚗';
      case 'PLANNED': return '📅';
      case 'COMPLETED': return '✅';
      default: return '🗺️';
    }
  };

  const filteredTrips = myTrips.filter(trip => {
    switch (selectedTab) {
      case 'active': return trip.status === 'ACTIVE';
      case 'completed': return trip.status === 'COMPLETED';
      case 'planned': return trip.status === 'PLANNED';
      default: return true;
    }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Trips</Text>
          <Text style={styles.subtitle}>Manage your delivery trips</Text>
        </View>
      </View>

      {/* Trip Statistics */}
      <View style={styles.tripStatsCard}>
        <Text style={styles.tripStatsTitle}>📊 Trip Performance</Text>
        <View style={styles.tripStatsGrid}>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatNumber}>{tripStats.totalTrips}</Text>
            <Text style={styles.tripStatLabel}>Total Trips</Text>
          </View>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatNumber}>{tripStats.completedTrips}</Text>
            <Text style={styles.tripStatLabel}>Completed</Text>
          </View>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatNumber}>{tripStats.totalEarnings}</Text>
            <Text style={styles.tripStatLabel}>Total Earnings</Text>
          </View>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatNumber}>{tripStats.successRate}</Text>
            <Text style={styles.tripStatLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'active' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'active' && styles.selectedTabText
          ]}>
            🚗 Active ({myTrips.filter(trip => trip.status === 'ACTIVE').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'planned' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('planned')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'planned' && styles.selectedTabText
          ]}>
            📅 Planned ({myTrips.filter(trip => trip.status === 'PLANNED').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'completed' && styles.selectedTab
          ]}
          onPress={() => setSelectedTab('completed')}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === 'completed' && styles.selectedTabText
          ]}>
            ✅ Completed ({myTrips.filter(trip => trip.status === 'COMPLETED').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trips List */}
      <View style={styles.tripsList}>
        {filteredTrips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripId}>{trip.tripId}</Text>
              <View style={[styles.tripStatus, { backgroundColor: getStatusColor(trip.status) }]}>
                <Text style={styles.tripStatusText}>{getStatusIcon(trip.status)} {trip.status}</Text>
              </View>
            </View>
            
            <View style={styles.tripRoute}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot} />
                <Text style={styles.routeLocation}>{trip.from}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotDestination]} />
                <Text style={styles.routeLocation}>{trip.to}</Text>
              </View>
            </View>
            
            <View style={styles.tripDetails}>
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>📅</Text>
                <Text style={styles.tripDetailText}>{trip.departureDate} at {trip.departureTime}</Text>
              </View>
              
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>🚗</Text>
                <Text style={styles.tripDetailText}>{trip.vehicleType} • {trip.availableCapacity}</Text>
              </View>
              
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>📦</Text>
                <Text style={styles.tripDetailText}>{trip.packages} packages • ${trip.totalEarnings} earnings</Text>
              </View>
              
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>📏</Text>
                <Text style={styles.tripDetailText}>{trip.distance} • {trip.estimatedDuration}</Text>
              </View>
            </View>
            
            {/* Route Steps */}
            <View style={styles.routeSteps}>
              <Text style={styles.routeStepsTitle}>Route Details</Text>
              {trip.route.map((step, index) => (
                <View key={index} style={styles.routeStep}>
                  <View style={styles.routeStepNumber}>
                    <Text style={styles.routeStepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeStepContent}>
                    <Text style={styles.routeStepAction}>{step.action}</Text>
                    <Text style={styles.routeStepLocation}>{step.location}</Text>
                    <Text style={styles.routeStepTime}>{step.time}</Text>
                  </View>
                </View>
              ))}
            </View>
            
            {/* Trip Actions */}
            {trip.status === 'PLANNED' && (
              <View style={styles.tripActions}>
                <TouchableOpacity 
                  style={styles.tripActionButton}
                  onPress={() => startTrip(trip.id)}
                >
                  <Text style={styles.tripActionButtonText}>Start Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tripActionButton}
                  onPress={() => console.log('Edit trip:', trip.id)}
                >
                  <Text style={styles.tripActionButtonText}>Edit Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tripActionButton}
                  onPress={() => cancelTrip(trip.id)}
                >
                  <Text style={styles.tripActionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {trip.status === 'ACTIVE' && (
              <View style={styles.tripActions}>
                <TouchableOpacity 
                  style={styles.tripActionButton}
                  onPress={() => navigate('deliveryConfirm')}
                >
                  <Text style={styles.tripActionButtonText}>Confirm Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tripActionButton}
                  onPress={() => console.log('Complete trip:', trip.id)}
                >
                  <Text style={styles.tripActionButtonText}>Complete Trip</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
      
      {filteredTrips.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {selectedTab === 'active' ? 'No active trips' :
             selectedTab === 'planned' ? 'No planned trips' : 'No completed trips'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedTab === 'active' ? 'Your active trips will appear here' :
             selectedTab === 'planned' ? 'Create a new trip to get started' : 'Your completed trips will appear here'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Route Optimizer Screen - AI-powered route optimization
function RouteOptimizerScreen() {
  const { goBack } = useNavigation();
  const [optimizationMode, setOptimizationMode] = useState('time'); // time, distance, fuel
  const [currentLocation, setCurrentLocation] = useState('123 Main St, Downtown');
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [availablePackages] = useState([
    {
      id: 1,
      description: 'Electronics package',
      pickupAddress: '456 Tech Street, Tech District',
      deliveryAddress: '789 Business Park, Industrial Area',
      price: 25,
      urgency: 'normal',
      estimatedTime: '15 min',
      distance: '8.5 km'
    },
    {
      id: 2,
      description: 'Documents',
      pickupAddress: '321 Office Building, CBD',
      deliveryAddress: '654 Residential Complex, Suburbs',
      price: 18,
      urgency: 'urgent',
      estimatedTime: '12 min',
      distance: '6.2 km'
    },
    {
      id: 3,
      description: 'Clothing items',
      pickupAddress: '987 Shopping Mall, Retail District',
      deliveryAddress: '147 Home Address, Residential',
      price: 15,
      urgency: 'low',
      estimatedTime: '20 min',
      distance: '10.8 km'
    },
    {
      id: 4,
      description: 'Furniture delivery',
      pickupAddress: '753 Furniture Store, Warehouse District',
      deliveryAddress: '369 New Home, Suburban Area',
      price: 45,
      urgency: 'normal',
      estimatedTime: '25 min',
      distance: '12.3 km'
    }
  ]);

  const [optimizationResults] = useState({
    time: {
      totalTime: '1h 15m',
      totalDistance: '28.5 km',
      fuelCost: '$8.50',
      earnings: '$103.00',
      efficiency: '92%'
    },
    distance: {
      totalTime: '1h 25m',
      totalDistance: '24.8 km',
      fuelCost: '$7.20',
      earnings: '$103.00',
      efficiency: '88%'
    },
    fuel: {
      totalTime: '1h 20m',
      totalDistance: '26.1 km',
      fuelCost: '$6.80',
      earnings: '$103.00',
      efficiency: '90%'
    }
  });

  const togglePackageSelection = (packageId) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const optimizeRoute = () => {
    if (selectedPackages.length === 0) {
      Alert.alert('No Packages Selected', 'Please select at least one package to optimize the route.');
      return;
    }
    
    setIsOptimizing(true);
    console.log('Optimizing route for packages:', selectedPackages);
    
    // Simulate optimization process
    setTimeout(() => {
      setOptimizedRoute({
        mode: optimizationMode,
        packages: selectedPackages,
        route: [
          { step: 1, action: 'Start from current location', location: currentLocation, time: '0 min' },
          { step: 2, action: 'Pickup', location: '456 Tech Street', time: '15 min' },
          { step: 3, action: 'Pickup', location: '321 Office Building', time: '27 min' },
          { step: 4, action: 'Delivery', location: '789 Business Park', time: '42 min' },
          { step: 5, action: 'Delivery', location: '654 Residential Complex', time: '58 min' },
          { step: 6, action: 'Return to base', location: currentLocation, time: '1h 15m' }
        ]
      });
      setIsOptimizing(false);
    }, 2000);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return '#ff4444';
      case 'normal': return '#ffa500';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'urgent': return '🚨';
      case 'normal': return '⚡';
      case 'low': return '🐌';
      default: return '📦';
    }
  };

  const currentResults = optimizationResults[optimizationMode];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Route Optimizer</Text>
          <Text style={styles.subtitle}>AI-powered delivery optimization</Text>
        </View>
      </View>

      {/* Current Location */}
      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>📍 Current Location</Text>
        <Text style={styles.locationText}>{currentLocation}</Text>
      </View>

      {/* Optimization Mode Selector */}
      <View style={styles.optimizationModeSelector}>
        <Text style={styles.sectionTitle}>Optimization Mode</Text>
        <View style={styles.modeButtons}>
          {[
            { value: 'time', label: '⏱️ Time', description: 'Fastest delivery' },
            { value: 'distance', label: '📏 Distance', description: 'Shortest route' },
            { value: 'fuel', label: '⛽ Fuel', description: 'Most efficient' }
          ].map((mode) => (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.modeButton,
                optimizationMode === mode.value && styles.selectedMode
              ]}
              onPress={() => setOptimizationMode(mode.value)}
            >
              <Text style={[
                styles.modeButtonText,
                optimizationMode === mode.value && styles.selectedModeText
              ]}>
                {mode.label}
              </Text>
              <Text style={[
                styles.modeDescription,
                optimizationMode === mode.value && styles.selectedModeDescription
              ]}>
                {mode.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Available Packages */}
      <Text style={styles.sectionTitle}>Select Packages ({selectedPackages.length} selected)</Text>
      
      <View style={styles.packageList}>
        {availablePackages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              selectedPackages.includes(pkg.id) && styles.selectedPackageCard
            ]}
            onPress={() => togglePackageSelection(pkg.id)}
          >
            <View style={styles.packageHeader}>
              <Text style={styles.packageDescription}>{pkg.description}</Text>
              <View style={styles.packageHeaderRight}>
                <View style={[styles.packageStatus, { backgroundColor: getUrgencyColor(pkg.urgency) }]}>
                  <Text style={styles.statusText}>{getUrgencyIcon(pkg.urgency)} {pkg.urgency.toUpperCase()}</Text>
                </View>
                {selectedPackages.includes(pkg.id) && (
                  <Text style={styles.selectedIcon}>✓</Text>
                )}
              </View>
            </View>
            
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{pkg.pickupAddress}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <Text style={styles.detailText}>{pkg.deliveryAddress}</Text>
              </View>
              
              <View style={styles.packageStats}>
                <View style={styles.packageStat}>
                  <Text style={styles.packageStatLabel}>💰</Text>
                  <Text style={styles.packageStatValue}>${pkg.price}</Text>
                </View>
                <View style={styles.packageStat}>
                  <Text style={styles.packageStatLabel}>⏱️</Text>
                  <Text style={styles.packageStatValue}>{pkg.estimatedTime}</Text>
                </View>
                <View style={styles.packageStat}>
                  <Text style={styles.packageStatLabel}>📏</Text>
                  <Text style={styles.packageStatValue}>{pkg.distance}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Optimization Results */}
      {optimizedRoute && (
        <View style={styles.optimizationResults}>
          <Text style={styles.sectionTitle}>Optimized Route Results</Text>
          
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {optimizationMode === 'time' ? '⏱️ Time Optimized' : 
                 optimizationMode === 'distance' ? '📏 Distance Optimized' : '⛽ Fuel Optimized'}
              </Text>
              <Text style={styles.efficiencyBadge}>{currentResults.efficiency} Efficient</Text>
            </View>
            
            <View style={styles.resultsGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total Time</Text>
                <Text style={styles.resultValue}>{currentResults.totalTime}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total Distance</Text>
                <Text style={styles.resultValue}>{currentResults.totalDistance}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Fuel Cost</Text>
                <Text style={styles.resultValue}>{currentResults.fuelCost}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total Earnings</Text>
                <Text style={[styles.resultValue, { color: '#4CAF50' }]}>{currentResults.earnings}</Text>
              </View>
            </View>
          </View>

          {/* Route Steps */}
          <Text style={styles.sectionTitle}>Optimized Route Steps</Text>
          <View style={styles.routeSteps}>
            {optimizedRoute.route.map((step, index) => (
              <View key={index} style={styles.routeStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepAction}>{step.action}</Text>
                  <Text style={styles.stepLocation}>{step.location}</Text>
                  <Text style={styles.stepTime}>{step.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Optimize Button */}
      <View style={styles.optimizeButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.primaryButton,
            isOptimizing && styles.disabledButton
          ]}
          onPress={optimizeRoute}
          disabled={isOptimizing}
        >
          <Text style={styles.buttonText}>
            {isOptimizing ? '🔄 Optimizing...' : '🚀 Optimize Route'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Verification Screen - Hybrid Verification System
function VerificationScreen() {
  const { goBack, userType } = useNavigation();
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, rejected
  const [documents, setDocuments] = useState({
    idFront: null,
    idBack: null,
    selfie: null,
    driverLicense: null
  });

  // Photo handling functions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePhoto = async (docType) => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setDocuments(prev => ({ ...prev, [docType]: result.assets[0] }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async (docType) => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setDocuments(prev => ({ ...prev, [docType]: result.assets[0] }));
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const showPhotoActionSheet = (docType) => {
    Alert.alert(
      'Add Document Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: () => takePhoto(docType) },
        { text: 'Gallery', onPress: () => selectFromGallery(docType) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDocumentUpload = (docType) => {
    showPhotoActionSheet(docType);
  };

  const submitVerification = () => {
    console.log('Submitting verification');
    Alert.alert('Verification', 'Verification submitted! Our AI system will process your documents within 24 hours.');
    setVerificationStatus('pending');
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'verified': return '#4CAF50';
      case 'rejected': return '#ff4444';
      case 'pending': return '#ffa500';
      default: return '#666';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '📄';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {userType === 'customer' ? 'Customer Verification' : 'Driver Verification'}
          </Text>
          <Text style={styles.subtitle}>
            {userType === 'customer' 
              ? 'Complete your profile to start sending packages' 
              : 'Complete your profile to start earning'
            }
          </Text>
        </View>
      </View>

      <View style={[styles.verificationStatus, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.verificationStatusText}>
          {getStatusIcon()} Status: {verificationStatus.toUpperCase()}
        </Text>
      </View>

      <View style={styles.verificationInfo}>
        <Text style={styles.infoTitle}>📋 Required Documents</Text>
        <Text style={styles.infoText}>
          {userType === 'customer' 
            ? `• National ID (Front & Back)
          • Selfie Photo`
            : `• National ID (Front & Back)
          • Selfie Photo
          • Driver's License
          • Vehicle Registration (Optional)`
          }
        </Text>
      </View>

      <View style={styles.documentGrid}>
        <TouchableOpacity 
          style={styles.documentButton}
          onPress={() => handleDocumentUpload('idFront')}
        >
          {documents.idFront ? (
            <Image source={{ uri: documents.idFront.uri }} style={styles.documentPreview} />
          ) : (
            <Text style={styles.documentIcon}>🪪</Text>
          )}
          <Text style={styles.documentLabel}>ID Front</Text>
          <Text style={styles.documentStatus}>{documents.idFront ? '✓' : '+'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.documentButton}
          onPress={() => handleDocumentUpload('idBack')}
        >
          {documents.idBack ? (
            <Image source={{ uri: documents.idBack.uri }} style={styles.documentPreview} />
          ) : (
            <Text style={styles.documentIcon}>🪪</Text>
          )}
          <Text style={styles.documentLabel}>ID Back</Text>
          <Text style={styles.documentStatus}>{documents.idBack ? '✓' : '+'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.documentButton}
          onPress={() => handleDocumentUpload('selfie')}
        >
          {documents.selfie ? (
            <Image source={{ uri: documents.selfie.uri }} style={styles.documentPreview} />
          ) : (
            <Text style={styles.documentIcon}>🤳</Text>
          )}
          <Text style={styles.documentLabel}>Selfie</Text>
          <Text style={styles.documentStatus}>{documents.selfie ? '✓' : '+'}</Text>
        </TouchableOpacity>

        {userType === 'driver' && (
          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => handleDocumentUpload('driverLicense')}
          >
            {documents.driverLicense ? (
              <Image source={{ uri: documents.driverLicense.uri }} style={styles.documentPreview} />
            ) : (
              <Text style={styles.documentIcon}>🚗</Text>
            )}
            <Text style={styles.documentLabel}>License</Text>
            <Text style={styles.documentStatus}>{documents.driverLicense ? '✓' : '+'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.verificationInfo}>
        <Text style={styles.infoTitle}>🤖 AI-Powered Verification</Text>
        <Text style={styles.infoText}>
          Our hybrid verification system uses AI to:
          {'\n'}• Validate document authenticity
          {'\n'}• Verify facial recognition
          {'\n'}• Extract and verify information
          {'\n'}• Calculate risk scores
          {'\n\n'}
          95% of applications are approved automatically within 2 hours!
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={submitVerification}
      >
        <Text style={styles.buttonText}>Submit for Verification</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// Wallet Screen - Commission Management
function WalletScreen() {
  const { goBack, userType, customerWalletBalance, customerReservedBalance, driverWalletBalance, transactions, fundCustomer, userProfile } = useNavigation();
  const modernStyles = getModernStyles();
  const isCustomer = userType === 'customer';
  const available = isCustomer ? customerWalletBalance : driverWalletBalance;
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  const handleFundWallet = () => {
    if (!fundAmount || isNaN(parseFloat(fundAmount)) || parseFloat(fundAmount) < 50) {
      Alert.alert('Invalid Amount', 'Minimum funding amount is P50. Please enter a valid amount.');
      return;
    }

    const amount = parseFloat(fundAmount);
    Alert.alert(
      'Visa Card Payment',
      `Fund wallet with P${amount.toFixed(2)} using your Visa card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay with Visa', 
          onPress: () => {
            Alert.alert('Payment Successful', `P${amount.toFixed(2)} has been added to your wallet using Visa card.`);
            fundCustomer(amount);
            setShowFundModal(false);
            setFundAmount('');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, modernStyles.container]} showsVerticalScrollIndicator={false}>
      {/* Modern Wallet Header */}
      <View style={styles.modernWalletHeader}>
        <View style={styles.walletHeaderTop}>
        </View>
        
        <View style={styles.walletInfoContainer}>
          <Text style={styles.walletTitleText}>Wallet</Text>
          <Text style={styles.walletSubtitleText}>
            {isCustomer ? 'Manage your payments' : 'Track your earnings'}
          </Text>
        </View>
      </View>

      {/* Account Balance Section */}
      <View style={[styles.accountBalanceSection, modernStyles.card]}>
        <Text style={[styles.accountBalanceTitle, modernStyles.text]}>💰 Account Balance</Text>
        <Text style={[styles.accountBalanceAmount, modernStyles.text]}>P{available.toFixed(2)}</Text>
        {isCustomer && (
          <Text style={[styles.accountReservedAmount, modernStyles.subtitle]}>
            Reserved: P{customerReservedBalance.toFixed(2)}
          </Text>
        )}
        <View style={styles.accountBalanceActions}>
          {!isCustomer && (
            <TouchableOpacity 
              style={[styles.accountWithdrawButton, modernStyles.button]}
              onPress={() => console.log('Withdraw funds')}
            >
              <Text style={[styles.accountWithdrawButtonText, modernStyles.buttonText]}>💳 Withdraw</Text>
            </TouchableOpacity>
          )}
          {isCustomer && (
            <TouchableOpacity 
              style={[styles.accountFundButton, modernStyles.button]}
              onPress={() => setShowFundModal(true)}
            >
              <Text style={[styles.accountFundButtonText, modernStyles.buttonText]}>💳 Fund Wallet</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Earnings Statistics */}
      <View style={[styles.earningsStatistics, modernStyles.card]}>
        <Text style={[styles.earningsTitle, modernStyles.text]}>📊 Earnings Statistics</Text>
        
        <View style={styles.earningsGrid}>
          <View style={styles.earningsItem}>
            <Text style={[styles.earningsLabel, modernStyles.subtitle]}>Total Earnings</Text>
            <Text style={[styles.earningsValue, modernStyles.text]}>P{available.toFixed(2)}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={[styles.earningsLabel, modernStyles.subtitle]}>This Month</Text>
            <Text style={[styles.earningsValue, modernStyles.text]}>P{(available * 0.8).toFixed(2)}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={[styles.earningsLabel, modernStyles.subtitle]}>Completed Trips</Text>
            <Text style={[styles.earningsValue, modernStyles.text]}>{Math.floor(available / 25)}</Text>
          </View>
          
          <View style={styles.earningsItem}>
            <Text style={[styles.earningsLabel, modernStyles.subtitle]}>Average per Trip</Text>
            <Text style={[styles.earningsValue, modernStyles.text]}>P25.00</Text>
          </View>
        </View>
      </View>

      <View style={styles.commissionInfo}>
        <Text style={styles.infoTitle}>📊 Commission Structure</Text>
        <Text style={styles.infoText}>
          • Payer: Customer wallet funds deliveries{'\n'}
          • Reservation: At pickup, agreed amount is reserved{'\n'}
          • Payout: On code confirmation, amount minus 30% goes to driver{'\n'}
          • Cancellation: 10% penalty deducted from reservation
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <View style={styles.transactionList}>
        {transactions.map((txn) => (
          <View key={txn.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionIcon}>
                {txn.type === 'fund' ? '💵' : txn.type === 'reserve' ? '🔒' : txn.type === 'payout' ? '📤' : txn.type === 'refund' ? '↩️' : '💳'}
              </Text>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{txn.description}</Text>
                <Text style={styles.transactionDate}>{txn.date}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: txn.amount >= 0 ? '#4CAF50' : '#ff4444' }]}>
                {txn.amount >= 0 ? '+' : ''}{Math.abs(txn.amount).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Funding Modal */}
      {showFundModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fund Wallet with Visa</Text>
            <Text style={styles.modalSubtitle}>
              Minimum amount: P50.00
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount (P):</Text>
              <TextInput
                style={styles.amountInput}
                value={fundAmount}
                onChangeText={setFundAmount}
                placeholder="Enter amount (minimum P50)"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFundModal(false);
                  setFundAmount('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleFundWallet}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Pay with Visa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Tracking Screen - Real-time Package Tracking
function TrackingScreen() {
  const { goBack, hasActivePackage, setHasActivePackage } = useNavigation();
  const [trackingData, setTrackingData] = useState({
    packageId: 'PKG-2024-001',
    status: 'IN_TRANSIT',
    currentLocation: 'En route to delivery',
    estimatedArrival: '2:30 PM',
    driver: {
      name: 'John Driver',
      rating: 4.8,
      phone: '+1 (555) 123-4567'
    },
    timeline: [
      { status: 'Package Created', time: '10:00 AM', completed: true },
      { status: 'Bid Accepted', time: '10:30 AM', completed: true },
      { status: 'Package Picked Up', time: '11:00 AM', completed: true },
      { status: 'In Transit', time: '11:15 AM', completed: true, current: true },
      { status: 'Out for Delivery', time: 'Pending', completed: false },
      { status: 'Delivered', time: 'Pending', completed: false }
    ]
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Track Package</Text>
          <Text style={styles.subtitle}>Real-time delivery updates</Text>
        </View>
      </View>

      {/* Location Restriction Warning */}
      <View style={styles.locationWarning}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Location Services Required</Text>
          <Text style={styles.warningText}>
            Location services must remain enabled while this package is active. 
            Turning off location will affect delivery tracking.
          </Text>
        </View>
      </View>

      <View style={styles.trackingCard}>
        <Text style={styles.trackingId}>Package: {trackingData.packageId}</Text>
        <View style={styles.trackingStatus}>
          <Text style={styles.trackingStatusIcon}>🚚</Text>
          <Text style={styles.trackingStatusText}>{trackingData.currentLocation}</Text>
        </View>
        <Text style={styles.trackingEta}>
          Estimated Arrival: {trackingData.estimatedArrival}
        </Text>
      </View>

      <View style={styles.driverCard}>
        <Text style={styles.sectionTitle}>Your Driver</Text>
        <View style={styles.driverInfo}>
          <Text style={styles.driverIcon}>👤</Text>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{trackingData.driver.name}</Text>
            <Text style={styles.driverRating}>⭐ {trackingData.driver.rating} Rating</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Delivery Timeline</Text>
      
      <View style={styles.timeline}>
        {trackingData.timeline.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <View style={[
                styles.timelineDot,
                item.completed && styles.timelineDotCompleted,
                item.current && styles.timelineDotCurrent
              ]} />
              {index < trackingData.timeline.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  item.completed && styles.timelineLineCompleted
                ]} />
              )}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[
                styles.timelineStatus,
                item.completed && styles.timelineStatusCompleted
              ]}>
                {item.status}
              </Text>
              <Text style={styles.timelineTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

// Rating Screen - Rate Delivery Experience
function RatingScreen() {
  const { goBack } = useNavigation();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [deliveryData] = useState({
    packageId: 'PKG-2024-001',
    driverName: 'John Driver',
    deliveryDate: '2024-01-15',
    deliveryTime: '2:30 PM'
  });

  const handleSubmitRating = () => {
    console.log('Submitting rating:', { rating, review, deliveryData });
    Alert.alert('Rating Submitted', 'Thank you for your feedback!');
    goBack();
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => setRating(star)}
        style={styles.starButton}
      >
        <Text style={[styles.star, star <= rating ? styles.starFilled : styles.starEmpty]}>
          ⭐
        </Text>
      </TouchableOpacity>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Rate Your Delivery</Text>
          <Text style={styles.subtitle}>Help us improve our service</Text>
        </View>
      </View>

      <View style={styles.ratingCard}>
        <Text style={styles.ratingTitle}>Delivery Details</Text>
        <View style={styles.ratingDetails}>
          <Text style={styles.ratingDetail}>📦 Package: {deliveryData.packageId}</Text>
          <Text style={styles.ratingDetail}>👤 Driver: {deliveryData.driverName}</Text>
          <Text style={styles.ratingDetail}>📅 Date: {deliveryData.deliveryDate}</Text>
          <Text style={styles.ratingDetail}>⏰ Time: {deliveryData.deliveryTime}</Text>
        </View>
      </View>

      <View style={styles.ratingSection}>
        <Text style={styles.ratingLabel}>How was your delivery experience?</Text>
        <View style={styles.starsContainer}>
          {renderStars()}
        </View>
        <Text style={styles.ratingText}>
          {rating === 0 ? 'Tap a star to rate' : 
           rating === 1 ? 'Poor' :
           rating === 2 ? 'Fair' :
           rating === 3 ? 'Good' :
           rating === 4 ? 'Very Good' : 'Excellent'}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.inputLabel}>Write a Review (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.reviewInput]}
          placeholder="Tell us about your experience..."
          value={review}
          onChangeText={setReview}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]}
        onPress={handleSubmitRating}
        disabled={rating === 0}
      >
        <Text style={styles.buttonText}>Submit Rating</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// Reviews Screen - View User Reviews
function ReviewsScreen() {
  const { goBack, userType } = useNavigation();
  const [reviews, setReviews] = useState([
    {
      id: 1,
      packageId: 'PKG-2024-001',
      driverName: 'John Driver',
      customerName: 'Sarah Customer',
      rating: 5,
      review: 'Excellent service! Package arrived on time and in perfect condition.',
      date: '2024-01-15',
      type: userType === 'customer' ? 'given' : 'received'
    },
    {
      id: 2,
      packageId: 'PKG-2024-002',
      driverName: 'Mike Driver',
      customerName: 'Alex Customer',
      rating: 4,
      review: 'Good delivery, driver was friendly and professional.',
      date: '2024-01-14',
      type: userType === 'customer' ? 'given' : 'received'
    },
    {
      id: 3,
      packageId: 'PKG-2024-003',
      driverName: 'Lisa Driver',
      customerName: 'Tom Customer',
      rating: 5,
      review: 'Amazing experience! Will definitely use again.',
      date: '2024-01-13',
      type: userType === 'customer' ? 'given' : 'received'
    }
  ]);

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getReviewTypeText = () => {
    return userType === 'customer' ? 'Reviews Given' : 'Reviews Received';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{getReviewTypeText()}</Text>
          <Text style={styles.subtitle}>Your delivery feedback history</Text>
        </View>
      </View>

      <View style={styles.reviewsList}>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewPackageId}>📦 {review.packageId}</Text>
              <Text style={styles.reviewDate}>{review.date}</Text>
            </View>
            
            <View style={styles.reviewRating}>
              <Text style={styles.reviewStars}>{getRatingStars(review.rating)}</Text>
              <Text style={styles.reviewRatingText}>{review.rating}/5</Text>
            </View>
            
            <Text style={styles.reviewText}>{review.review}</Text>
            
            <View style={styles.reviewFooter}>
              <Text style={styles.reviewUser}>
                {userType === 'customer' ? 
                  `Driver: ${review.driverName}` : 
                  `Customer: ${review.customerName}`}
              </Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

// Chat Screen - In-App Messaging
function ChatScreen() {
  const { goBack } = useNavigation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Driver',
      message: 'Hi! I\'m on my way to pick up your package. ETA 10 minutes.',
      timestamp: '2:15 PM',
      isFromUser: false
    },
    {
      id: 2,
      sender: 'You',
      message: 'Great! I\'ll be waiting at the main entrance.',
      timestamp: '2:16 PM',
      isFromUser: true
    },
    {
      id: 3,
      sender: 'John Driver',
      message: 'Perfect! I\'ve picked up the package. Heading to delivery location now.',
      timestamp: '2:25 PM',
      isFromUser: false
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: 'You',
        message: newMessage,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        isFromUser: true
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Chat with your delivery partner</Text>
        </View>
      </View>

      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatPartnerName}>John Driver</Text>
          <Text style={styles.chatStatus}>🟢 Online</Text>
        </View>

        <ScrollView style={styles.messagesList}>
          {messages.map((msg) => (
            <View key={msg.id} style={[
              styles.messageBubble,
              msg.isFromUser ? styles.messageFromUser : styles.messageFromOther
            ]}>
              <Text style={[
                styles.messageText,
                msg.isFromUser ? styles.messageTextFromUser : styles.messageTextFromOther
              ]}>
                {msg.message}
              </Text>
              <Text style={[
                styles.messageTime,
                msg.isFromUser ? styles.messageTimeFromUser : styles.messageTimeFromOther
              ]}>
                {msg.timestamp}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.messageInput}>
          <TextInput
            style={styles.messageTextInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={sendMessage}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

// Notifications Screen - Push Notifications
function NotificationsScreen() {
  const { goBack } = useNavigation();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Package Delivered',
      message: 'Your package PKG-2024-001 has been successfully delivered.',
      timestamp: '2:30 PM',
      type: 'delivery',
      read: false
    },
    {
      id: 2,
      title: 'New Bid Received',
      message: 'John Driver placed a bid of $25 on your package.',
      timestamp: '1:45 PM',
      type: 'bid',
      read: false
    },
    {
      id: 3,
      title: 'Payment Processed',
      message: 'Payment of $18.50 has been processed for delivery PKG-2024-002.',
      timestamp: '12:20 PM',
      type: 'payment',
      read: true
    },
    {
      id: 4,
      title: 'Driver Verification',
      message: 'Your driver verification has been approved!',
      timestamp: '11:15 AM',
      type: 'verification',
      read: true
    }
  ]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery': return '📦';
      case 'bid': return '💰';
      case 'payment': return '💳';
      case 'verification': return '✅';
      default: return '🔔';
    }
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notifications</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Stay updated with your deliveries</Text>

      <View style={styles.notificationsList}>
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadNotification
            ]}
            onPress={() => markAsRead(notification.id)}
          >
            <View style={styles.notificationIcon}>
              <Text style={styles.notificationEmoji}>
                {getNotificationIcon(notification.type)}
              </Text>
            </View>
            
            <View style={styles.notificationContent}>
              <Text style={[
                styles.notificationTitle,
                !notification.read && styles.unreadText
              ]}>
                {notification.title}
              </Text>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {notification.timestamp}
              </Text>
            </View>
            
            {!notification.read && (
              <View style={styles.unreadDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

// Available Drivers Screen - Search and select drivers
function AvailableDriversScreen() {
  const { goBack, upcomingTrips } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [drivers, setDrivers] = useState([
    {
      id: 1,
      name: 'John Driver',
      rating: 4.8,
      completedTrips: 245,
      vehicle: 'Toyota Camry',
      licensePlate: 'ABC-123',
      distance: '2.5 km away',
      estimatedTime: '5 min',
      pricePerKm: '$1.50',
      isOnline: true
    },
    {
      id: 2,
      name: 'Sarah Wilson',
      rating: 4.7,
      completedTrips: 198,
      vehicle: 'Honda CR-V',
      licensePlate: 'XYZ-987',
      distance: '4.1 km away',
      estimatedTime: '9 min',
      pricePerKm: '$1.60',
      isOnline: true
    },
    {
      id: 3,
      name: 'Alex Johnson',
      rating: 4.6,
      completedTrips: 310,
      vehicle: 'Ford Ranger',
      licensePlate: 'GHJ-456',
      distance: '6.8 km away',
      estimatedTime: '15 min',
      pricePerKm: '$1.80',
      isOnline: false
    }
  ]);

  const filteredDrivers = drivers.filter(driver => 
    driver.isOnline && 
    (driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTrips = (upcomingTrips || []).filter(t => {
    const depOk = departure ? t.from.toLowerCase().includes(departure.toLowerCase()) : true;
    const destOk = destination ? t.to.toLowerCase().includes(destination.toLowerCase()) : true;
    const queryOk = searchQuery ? (
      t.driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true;
    return depOk && destOk && queryOk;
  });

  const selectDriver = (driver) => {
    console.log('Selected driver:', driver);
    Alert.alert('Driver Selected', `You have selected ${driver.name}. Chat will be available once package is created.`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Available Drivers</Text>
          <Text style={styles.subtitle}>Find drivers for your route</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Departure Location</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter departure location"
            value={departure}
            onChangeText={setDeparture}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Destination</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter destination"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Search</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search by driver or vehicle"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available Drivers ({filteredDrivers.length})</Text>
      
      <View style={styles.driversList}>
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverVehicle}>{driver.vehicle} • {driver.licensePlate}</Text>
              </View>
              <View style={styles.driverStatus}>
                <Text style={styles.onlineStatus}>🟢 Online</Text>
                <Text style={styles.driverRating}>⭐ {driver.rating}</Text>
              </View>
            </View>
            
            <View style={styles.driverDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{driver.distance}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⏱️</Text>
                <Text style={styles.detailText}>ETA: {driver.estimatedTime}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <Text style={styles.detailText}>{driver.pricePerKm}/km</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🚗</Text>
                <Text style={styles.detailText}>{driver.completedTrips} trips completed</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.selectDriverButton}
              onPress={() => selectDriver(driver)}
            >
              <Text style={styles.selectDriverButtonText}>Select Driver</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Upcoming Trips ({filteredTrips.length})</Text>
      
      <View style={styles.tripsList}>
        {filteredTrips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.tripDriverInfo}>
                <Text style={styles.tripDriverName}>{trip.driver.name}</Text>
                <Text style={styles.tripVehicle}>{trip.driver.vehicle} • {trip.driver.licensePlate}</Text>
              </View>
              <View style={styles.tripStatus}>
                <Text style={styles.tripTime}>{trip.departure}</Text>
                <Text style={styles.tripCapacity}>{trip.capacity.available}/{trip.capacity.total} space</Text>
              </View>
            </View>
            
            <View style={styles.tripRoute}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot} />
                <Text style={styles.routeLocation}>{trip.from}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotDestination]} />
                <Text style={styles.routeLocation}>{trip.to}</Text>
              </View>
            </View>
            
            <View style={styles.tripDetails}>
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>📏</Text>
                <Text style={styles.tripDetailText}>{trip.distance} • {trip.eta}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>📦</Text>
                <Text style={styles.tripDetailText}>Available capacity for {trip.capacity.available} packages</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={() => selectDriver(trip.driver)}
            >
              <Text style={styles.buttonText}>Request to Join</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

// Create Trip Screen - For drivers to create available trips
function CreateTripScreen() {
  const { goBack } = useNavigation();
  const [tripData, setTripData] = useState({
    departure: '',
    destination: '',
    departureTime: '',
    availableSeats: '1',
    pricePerKm: '',
    vehicle: '',
    notes: ''
  });

  const updateTripData = (field, value) => {
    setTripData(prev => ({ ...prev, [field]: value }));
  };

  const createTrip = () => {
    console.log('Creating trip:', tripData);
    Alert.alert('Trip Created', 'Your trip has been created and is now visible to customers!');
    goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.smallBackButton} onPress={goBack}>
          <Text style={styles.smallBackButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Create Trip</Text>
          <Text style={styles.subtitle}>Make your vehicle available for deliveries</Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Departure Location *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Where are you starting from?"
            value={tripData.departure}
            onChangeText={(value) => updateTripData('departure', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Destination *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Where are you going?"
            value={tripData.destination}
            onChangeText={(value) => updateTripData('destination', value)}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Departure Time *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2:30 PM"
              value={tripData.departureTime}
              onChangeText={(value) => updateTripData('departureTime', value)}
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Available Seats</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1"
              value={tripData.availableSeats}
              onChangeText={(value) => updateTripData('availableSeats', value)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Price per km *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="$1.50"
              value={tripData.pricePerKm}
              onChangeText={(value) => updateTripData('pricePerKm', value)}
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Vehicle *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Toyota Camry"
              value={tripData.vehicle}
              onChangeText={(value) => updateTripData('vehicle', value)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Any special instructions or vehicle details?"
            value={tripData.notes}
            onChangeText={(value) => updateTripData('notes', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={createTrip}
        >
          <Text style={styles.buttonText}>Create Trip</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Main App Component
// Share Screen - For sharing app download link
function ShareScreen() {
  const { goBack } = useNavigation();
  
  const shareApp = () => {
    const shareMessage = "Check out Ntsamaela - the peer-to-peer package delivery app! Download it here: https://ntsamaela.app/download";
    console.log('Sharing app:', shareMessage);
    Alert.alert('Share App', 'App link copied to clipboard! Share this with your friends: ' + shareMessage);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Share Ntsamaela</Text>
          <Text style={styles.subtitle}>Invite friends to join the community</Text>
        </View>
      </View>
      
      <View style={styles.shareContainer}>
        <View style={styles.shareCard}>
          <Text style={styles.shareIcon}>📱</Text>
          <Text style={styles.shareTitle}>Share the App</Text>
          <Text style={styles.shareDescription}>
            Help grow the Ntsamaela community by sharing the app with your friends and family.
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={shareApp}
          >
            <Text style={styles.buttonText}>📤 Share App Link</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.shareCard}>
          <Text style={styles.shareIcon}>🎁</Text>
          <Text style={styles.shareTitle}>Referral Program</Text>
          <Text style={styles.shareDescription}>
            Earn rewards when your friends join and complete their first delivery!
          </Text>
          
          <View style={styles.referralStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Friends Referred</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>$0</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.shareCard}>
          <Text style={styles.shareIcon}>📱</Text>
          <Text style={styles.shareTitle}>Download Links</Text>
          <Text style={styles.shareDescription}>
            Share these links to help others download the app:
          </Text>
          
          <View style={styles.downloadLinks}>
            <TouchableOpacity style={styles.downloadButton}>
              <Text style={styles.downloadButtonText}>🍎 App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadButton}>
              <Text style={styles.downloadButtonText}>🤖 Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function AppContent() {
  const { currentScreen, showBottomTabs, goBack } = useNavigation();
  const modernStyles = getModernStyles();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'login' || currentScreen === 'register') {
        // Exit app on login/register screens
        BackHandler.exitApp();
        return true;
      } else {
        // Navigate back on other screens
        goBack();
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen, goBack]);

  const renderScreen = () => {
    console.log('Rendering screen:', currentScreen);
    switch (currentScreen) {
      case 'permissions':
        return <PermissionsScreen />;
      case 'login':
        return <LoginScreen />;
      case 'register':
        return <RegisterScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'about':
        return <AboutScreen />;
      case 'contact':
        return <ContactScreen />;
      case 'createPackage':
        return <CreatePackageScreen />;
      case 'myPackages':
        return <MyPackagesScreen />;
      case 'availablePackages':
        return <AvailablePackagesScreen />;
      case 'reviewBids':
        return <ReviewBidsScreen />;
      case 'earnings':
        return <WalletScreen />;
      case 'packageHistory':
        return <PackageHistoryScreen />;
      case 'liveTracking':
        return <LiveTrackingScreen />;
      case 'routeOptimizer':
        return <RouteOptimizerScreen />;
      case 'myBids':
        return <MyBidsScreen />;
      case 'myTrips':
        return <MyTripsScreen />;
      case 'deliveryConfirm':
        return <DeliveryConfirmationScreen />;
      case 'verification':
        return <VerificationScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'tracking':
        return <TrackingScreen />;
      case 'rating':
        return <RatingScreen />;
      case 'reviews':
        return <ReviewsScreen />;
      case 'chat':
        return <ChatScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'availableDrivers':
        return <AvailableDriversScreen />;
      case 'createTrip':
        return <CreateTripScreen />;
      case 'share':
        return <ShareScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={[styles.appContainer, modernStyles.container]}>
      <StatusBar style="auto" />
      <View style={[styles.screenContainer, modernStyles.container]}>
        {renderScreen()}
    </View>
      {showBottomTabs && <BottomTabNavigation />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonGrid: {
    width: '100%',
    maxWidth: 300,
  },
  homeContent: {
    width: '100%',
    maxWidth: 350,
  },
  quickActions: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smallButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
    minWidth: 100,
    flex: 1,
    marginHorizontal: 5,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bidButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 120,
  },
  bidButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileInfo: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    width: '100%',
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#4CAF50',
  },
  toggleOff: {
    backgroundColor: '#ccc',
  },
  toggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  aboutText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  contactInfo: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  contactItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  serviceList: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  serviceName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  servicePrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
    paddingTop: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  activeTabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  // Authentication Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  authForm: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  userTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedUserType: {
    backgroundColor: '#007AFF',
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  selectedUserTypeText: {
    color: '#fff',
  },
  authButton: {
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  customerButton: {
    backgroundColor: '#FF6B35',
  },
  driverButton: {
    backgroundColor: '#4CAF50',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  // Home Screen Styles
  homeHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    marginBottom: 15,
  },
  // Marketplace Styles
  packageList: {
    width: '100%',
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageDescription: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  packageStatus: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  // Form Styles
  formContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  comingSoon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Form Styles
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    minWidth: '48%',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: 'white',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  inputContainer: {
    marginVertical: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  accountManagement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  withdrawButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  accountButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  accountButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Permissions Screen Styles
  permissionsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  permissionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  permissionsNote: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Location Warning Styles
  locationWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  // Settings Button Styles
  settingButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  settingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  settingButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  // Wallet Balance Section Styles
  walletBalanceSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  reservedAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  withdrawButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  withdrawButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fundButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  fundButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Account Balance Section Styles
  accountBalanceSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountBalanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  accountBalanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  accountReservedAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  accountBalanceActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  accountWithdrawButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  accountWithdrawButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  accountFundButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  accountFundButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Driver Status Toggle Styles
  driverStatusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleSlider: {
    width: 60,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggleSliderActive: {
    backgroundColor: '#4CAF50',
  },
  toggleSliderInactive: {
    backgroundColor: '#cccccc',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
  // Modern Home Screen Styles
  modernHeader: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePhotoContainer: {
    marginRight: 16,
  },
  profilePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhotoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  userRoleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 12,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  modernActionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  primaryActionCard: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  actionArrow: {
    marginLeft: 12,
  },
  actionArrowText: {
    fontSize: 18,
    fontWeight: '600',
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  activityStatus: {
    alignItems: 'flex-end',
  },
  activityStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  modernLogoutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modernLogoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modern Profile Screen Styles
  modernProfileHeader: {
    backgroundColor: '#2563EB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: 'rgba(15, 23, 42, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileInfoContainer: {
    alignItems: 'center',
  },
  profilePhotoLargeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePhotoLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhotoLargePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhotoLargeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '700',
  },
  profileNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileEmailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  profileRoleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '600',
  },
  // Modern Wallet Screen Styles
  modernWalletHeader: {
    backgroundColor: '#2563EB',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: 'rgba(15, 23, 42, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  walletHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletMenuButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  walletInfoContainer: {
    alignItems: 'center',
  },
  walletTitleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  walletSubtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Photo Section Styles
  photoSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  photoCountText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Document Preview Styles
  documentPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  // Package Photos Styles
  packagePhotosContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  packagePhotosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  packagePhotosScroll: {
    flexDirection: 'row',
  },
  packagePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  // 2024 Trending Glass Morphism Styles
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Earnings Statistics Styles
  earningsStatistics: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  earningsItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  // Package Actions
  packageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginHorizontal: 2,
    minHeight: 40,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Page Header Styles
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 5,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
    position: 'relative',
  },
  smallBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 5,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallBackButtonText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  shareContainer: {
    padding: 20,
  },
  shareCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  shareDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  referralStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  downloadLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 50, // Add padding to account for back button
  },
  // Back Button Styles (legacy)
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  // Verification Styles
  verificationStatus: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  verificationStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verificationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  documentButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  documentIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  documentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  documentStatus: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  // Wallet Styles
  walletCard: {
    backgroundColor: '#007AFF',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  walletLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  walletBalance: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  walletButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  walletButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commissionInfo: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  transactionList: {
    marginBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Tracking Styles
  trackingCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  trackingId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackingStatusIcon: {
    fontSize: 30,
    marginRight: 10,
  },
  trackingStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  trackingEta: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  driverCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverRating: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeline: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 15,
    width: 30,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineDotCurrent: {
    backgroundColor: '#007AFF',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#ccc',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 5,
  },
  timelineStatus: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 3,
  },
  timelineStatusCompleted: {
    color: '#333',
    fontWeight: 'bold',
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  // Rating Styles
  ratingCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  ratingDetails: {
    gap: 8,
  },
  ratingDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 40,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ddd',
  },
  ratingText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  reviewSection: {
    marginBottom: 30,
  },
  reviewInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Reviews Styles
  reviewsList: {
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewPackageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewStars: {
    fontSize: 16,
    marginRight: 10,
  },
  reviewRatingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  reviewUser: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#007AFF',
  },
  chatPartnerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatStatus: {
    color: 'white',
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
    padding: 15,
    maxHeight: 300,
  },
  messageBubble: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  messageFromUser: {
    alignSelf: 'flex-end',
  },
  messageFromOther: {
    alignSelf: 'flex-start',
  },
  messageText: {
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 18,
  },
  messageTextFromUser: {
    backgroundColor: '#007AFF',
    color: 'white',
  },
  messageTextFromOther: {
    backgroundColor: 'white',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    paddingHorizontal: 5,
  },
  messageTimeFromUser: {
    textAlign: 'right',
    color: '#666',
  },
  messageTimeFromOther: {
    textAlign: 'left',
    color: '#666',
  },
  messageInput: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Notification Styles
  notificationsList: {
    marginBottom: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unreadNotification: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  notificationIcon: {
    marginRight: 15,
    justifyContent: 'center',
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
    alignSelf: 'center',
  },
  // Driver Balance Card
  driverBalanceCard: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  balanceSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  // Profile Actions
  profileActions: {
    marginTop: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  // Available Drivers Styles
  searchContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  driversList: {
    marginBottom: 20,
  },
  driverCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666',
  },
  driverStatus: {
    alignItems: 'flex-end',
  },
  onlineStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  driverRating: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  selectDriverButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  selectDriverButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Trip Cards Styles
  tripsList: {
    marginBottom: 20,
  },
  tripCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripDriverInfo: {
    flex: 1,
  },
  tripDriverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  tripVehicle: {
    fontSize: 14,
    color: '#666',
  },
  tripStatus: {
    alignItems: 'flex-end',
  },
  tripTime: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  tripSeats: {
    fontSize: 12,
    color: '#4CAF50',
  },
  tripRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripLocationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tripLocationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tripPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  joinTripButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinTripButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Filter Row Styles
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  // Earnings Dashboard Styles
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPeriod: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedPeriodText: {
    color: '#fff',
  },
  earningsSummary: {
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: '#007AFF',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  earningsLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  earningsAmount: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  earningsItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  earningsItemLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  earningsItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  recentEarningsList: {
    marginBottom: 20,
  },
  earningCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningPackage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningDate: {
    fontSize: 12,
    color: '#666',
  },
  earningStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  earningStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  performanceInsights: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Package History Styles
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedTab: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedTabText: {
    color: '#fff',
  },
  packageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 5,
    marginRight: 10,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  // Live Tracking Styles
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  routeInfo: {
    marginTop: 10,
  },
  routeItem: {
    marginBottom: 10,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  routeText: {
    fontSize: 14,
    color: '#666',
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  routeStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationUpdates: {
    marginBottom: 20,
  },
  locationUpdate: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  updateTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  updateSpeed: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  updateLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  liveIndicator: {
    alignSelf: 'flex-start',
  },
  liveText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: 'bold',
  },
  trackingControls: {
    marginBottom: 20,
  },
  timelineLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  mapPlaceholder: {
    backgroundColor: '#f8f9fa',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapPlaceholderNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Route Optimizer Styles
  locationCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
  },
  optimizationModeSelector: {
    marginBottom: 20,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMode: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  selectedModeText: {
    color: '#007AFF',
  },
  modeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedModeDescription: {
    color: '#007AFF',
  },
  selectedPackageCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  selectedIcon: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  packageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  packageStat: {
    alignItems: 'center',
  },
  packageStatLabel: {
    fontSize: 16,
    marginBottom: 3,
  },
  packageStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  optimizationResults: {
    marginBottom: 20,
  },
  resultsCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  efficiencyBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeSteps: {
    marginBottom: 20,
  },
  routeStep: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  stepLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  stepTime: {
    fontSize: 12,
    color: '#999',
  },
  optimizeButtonContainer: {
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  // Bidding System Styles
  bidStatsCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  bidStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  bidStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bidStatItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  bidStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  bidStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bidsList: {
    marginBottom: 20,
  },
  bidCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bidPackageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bidStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bidStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bidDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  bidDetails: {
    marginBottom: 15,
  },
  bidInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bidAmount: {
    alignItems: 'center',
  },
  bidAmountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  bidAmountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bidMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidMetric: {
    alignItems: 'center',
    marginLeft: 15,
  },
  bidMetricLabel: {
    fontSize: 16,
    marginBottom: 3,
  },
  bidMetricValue: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  bidActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  bidActionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  withdrawButton: {
    backgroundColor: '#ff4444',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Trip Management Styles
  tripStatsCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  tripStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  tripStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tripStatItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  tripStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  tripStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tripsList: {
    marginBottom: 20,
  },
  tripCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tripId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tripStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tripStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripRoute: {
    marginBottom: 15,
    paddingVertical: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginRight: 10,
  },
  routeDotDestination: {
    backgroundColor: '#4CAF50',
  },
  routeLocation: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginBottom: 5,
  },
  tripDetails: {
    marginBottom: 15,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDetailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  routeSteps: {
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  routeStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  tripActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    marginBottom: 5,
    minWidth: 100,
    backgroundColor: '#007AFF',
  },
  tripActionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  // Enhanced Bidding System Styles
  bidForm: {
    marginBottom: 20,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  packageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  driverStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  bidMessage: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Additional Modal Styles for Counter Bid
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalPackageInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalPackageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalPackageDetails: {
    fontSize: 14,
    color: '#666',
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalInputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#2563EB',
  },
  modalCancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
