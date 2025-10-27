import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// Botswana-Inspired Color Palette
const colors = {
  primary: '#75AADB',      // Botswana Blue
  primaryDark: '#5A8FBF',
  primaryLight: '#A3C9E8',
  secondary: '#000000',    // Pure Black (Botswana flag)
  secondaryLight: '#1A1A1A',
  accent: '#FFB800',       // Gold
  success: '#00C853',      // Green
  error: '#D32F2F',
  background: '#F8F9FA',
  cardBg: '#FFFFFF',       // Pure White (Botswana flag)
  textPrimary: '#000000',  // Pure Black for better contrast
  textSecondary: '#4A4A4A',
  textTertiary: '#999999',
  textLight: '#FFFFFF',
  border: '#E5E5E5',
  borderDark: '#000000',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowBlue: 'rgba(117, 170, 219, 0.12)',
};

// Navigation Context
const NavigationContext = React.createContext();

function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [screenHistory, setScreenHistory] = useState(['loading']);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  
  const [userProfile, setUserProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+267 71234567',
    profilePhoto: null,
    rating: 4.8,
    totalDeliveries: 42,
    totalEarnings: 2850,
  });

  const [customerWallet, setCustomerWallet] = useState(250);
  const [driverWallet, setDriverWallet] = useState(850);
  
  const [myPackages, setMyPackages] = useState([
    {
      id: 'PKG-001',
      description: 'Electronics',
      pickup: 'Gaborone CBD',
      delivery: 'Airport Junction',
      price: 250,
      status: 'in-transit',
      driver: 'Mike K.',
      driverPhoto: 'https://i.pravatar.cc/150?img=15',
    },
    {
      id: 'PKG-004',
      description: 'Groceries',
      pickup: 'Game City',
      delivery: 'Extension 10',
      price: 150,
      status: 'pending',
      driver: 'Not assigned',
    },
    {
      id: 'PKG-005',
      description: 'Clothing',
      pickup: 'Main Mall',
      delivery: 'Phakalane',
      price: 200,
      status: 'delivered',
      driver: 'Grace T.',
      driverPhoto: 'https://i.pravatar.cc/150?img=32',
    },
  ]);

  const [availablePackages, setAvailablePackages] = useState([
    {
      id: 'PKG-002',
      customer: 'Sarah M.',
      description: 'Documents',
      pickup: 'Broadhurst',
      delivery: 'Main Mall',
      price: 180,
      weight: '0.5 kg',
      distance: '8 km',
      photo: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400',
    },
    {
      id: 'PKG-003',
      customer: 'David L.',
      description: 'Small parcel',
      pickup: 'Game City',
      delivery: 'Mogoditshane',
      price: 120,
      weight: '1 kg',
      distance: '15 km',
      photo: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
    },
    {
      id: 'PKG-006',
      customer: 'Anna B.',
      description: 'Books',
      pickup: 'University',
      delivery: 'Block 8',
      price: 100,
      weight: '2 kg',
      distance: '12 km',
      photo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    },
    {
      id: 'PKG-007',
      customer: 'Peter M.',
      description: 'Electronics',
      pickup: 'Riverwalk',
      delivery: 'Mogoditshane',
      price: 220,
      weight: '3 kg',
      distance: '20 km',
      photo: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    },
    {
      id: 'PKG-008',
      customer: 'Lisa K.',
      description: 'Food delivery',
      pickup: 'Gaborone West',
      delivery: 'Broadhurst',
      price: 90,
      weight: '1.5 kg',
      distance: '6 km',
      photo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    },
  ]);

  const [myBids, setMyBids] = useState([
    {
      id: 'BID-001',
      packageId: 'PKG-002',
      amount: 150,
      status: 'pending',
      description: 'Documents',
      pickup: 'Broadhurst',
      delivery: 'Main Mall',
    },
    {
      id: 'BID-002',
      packageId: 'PKG-003',
      amount: 100,
      status: 'accepted',
      description: 'Small parcel',
      pickup: 'Game City',
      delivery: 'Mogoditshane',
    },
    {
      id: 'BID-003',
      packageId: 'PKG-006',
      amount: 85,
      status: 'rejected',
      description: 'Books',
      pickup: 'University',
      delivery: 'Block 8',
    },
  ]);

  const [upcomingTrips, setUpcomingTrips] = useState([
    { 
      id: 1, 
      driver: 'Lesego Tau', 
      rating: 4.6,
      from: 'Gaborone', 
      to: 'Francistown', 
      date: 'Oct 26, 10:00 AM',
      spacesLeft: 2,
      price: 'P 120'
    },
    { 
      id: 2, 
      driver: 'Neo Sedimo', 
      rating: 4.9,
      from: 'Maun', 
      to: 'Kasane', 
      date: 'Oct 27, 2:00 PM',
      spacesLeft: 1,
      price: 'P 200'
    },
  ]);

  // Active driver status
  const [isActiveDriver, setIsActiveDriver] = useState(false);
  
  // Active drivers list (for customer view)
  const [activeDrivers, setActiveDrivers] = useState([
    { 
      id: 101, 
      driver: 'Thato Moeti', 
      rating: 4.7,
      location: 'Gaborone CBD',
      vehicle: 'Toyota Corolla',
      totalDeliveries: 156,
      earnings: 'P 12,500',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    },
    { 
      id: 102, 
      driver: 'Keabetswe Mophane', 
      rating: 4.9,
      location: 'Main Mall',
      vehicle: 'VW Polo',
      totalDeliveries: 203,
      earnings: 'P 18,900',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
    },
  ]);

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
  
  const navigate = (screenName, replace = false) => {
    if (replace) {
      setScreenHistory([screenName]);
    } else {
      setScreenHistory(prev => [...prev, screenName]);
    }
    setCurrentScreen(screenName);
  };

  const login = (type) => {
    setIsAuthenticated(true);
    setUserType(type);
    navigate('home', true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setActiveTab('home');
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

function useNavigation() {
  return React.useContext(NavigationContext);
}

// Loading Screen with Big N Logo
function LoadingScreen() {
  const { navigate } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('login', true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <StatusBar style="light" />
      <View style={styles.logoBigContainer}>
        <Text style={styles.logoBigN}>N</Text>
      </View>
      <Text style={styles.logoTextBig}>NTSAMAELA</Text>
      <Text style={styles.sloganBig}>roma mongwe ka wena</Text>
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
  const { login } = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState('customer');

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Enter your email address to receive a password reset link.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Link',
          onPress: () => {
            if (email) {
              Alert.alert('Success', `Password reset link sent to ${email}`);
            } else {
              Alert.alert('Error', 'Please enter your email address first');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleAuth = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!isLogin) {
      if (!firstName || !lastName) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }
    
    login(userType);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style="dark" />
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
            <Text style={styles.slogan}>roma mongwe ka wena</Text>
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
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* User Type Selector - Always visible */}
            <View style={styles.userTypeSelector}>
              <Text style={styles.userTypeLabel}>
                {isLogin ? 'Sign in as' : 'Create account as'}
              </Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'customer' && styles.userTypeButtonActive
                  ]}
                  onPress={() => setUserType('customer')}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    userType === 'customer' && styles.userTypeButtonTextActive
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'driver' && styles.userTypeButtonActive
                  ]}
                  onPress={() => setUserType('driver')}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    userType === 'driver' && styles.userTypeButtonTextActive
                  ]}>
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="First Name"
                  placeholderTextColor={colors.textTertiary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  placeholder="Last Name"
                  placeholderTextColor={colors.textTertiary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            )}

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
              <Text style={styles.primaryButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Customer Home Screen
function CustomerHomeScreen() {
  const { navigate, myPackages, customerWallet, userProfile } = useNavigation();

  const handleNotifications = () => {
    Alert.alert('Notifications', 'You have no new notifications.');
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={handleNotifications}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statValue}>{myPackages.length}</Text>
            <Text style={styles.statLabel}>Active Packages</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success }]}>
            <Text style={styles.statValue}>P {customerWallet}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('createPackage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.actionIconText}>📦</Text>
              </View>
              <Text style={styles.actionText}>Create Package</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('myPackages')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
                <Text style={styles.actionIconText}>📋</Text>
              </View>
              <Text style={styles.actionText}>My Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('availableDrivers')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.actionIconText}>🚗</Text>
              </View>
              <Text style={styles.actionText}>Find Drivers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('wallet')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF6D00' }]}>
                <Text style={styles.actionIconText}>💰</Text>
              </View>
              <Text style={styles.actionText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Packages</Text>
          {myPackages.map(pkg => (
            <TouchableOpacity 
              key={pkg.id}
              style={styles.packageCard}
              onPress={() => navigate('packageDetails', pkg)}
            >
              <View style={styles.packageHeader}>
                <Text style={styles.packageId}>{pkg.id}</Text>
                <View style={[styles.statusBadge, getStatusColor(pkg.status)]}>
                  <Text style={styles.statusText}>{pkg.status}</Text>
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Driver Home Screen
function DriverHomeScreen() {
  const { navigate, availablePackages, driverWallet, userProfile, isActiveDriver, toggleActiveDriverStatus } = useNavigation();
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);

  const handleNotifications = () => {
    Alert.alert('Notifications', 'You have no new notifications.');
  };

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
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={handleNotifications}>
            <Text style={styles.notificationIcon}>🔔</Text>
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
          <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
            <Text style={styles.statValue}>{userProfile.rating} ⭐</Text>
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
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowCreateTripModal(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#00C853' }]}>
                <Text style={styles.actionIconText}>➕</Text>
              </View>
              <Text style={styles.actionText}>Create Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('availablePackages')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.actionIconText}>📦</Text>
              </View>
              <Text style={styles.actionText}>Browse Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigate('myBids')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.actionIconText}>💬</Text>
              </View>
              <Text style={styles.actionText}>My Bids</Text>
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

        {/* Available Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Packages</Text>
          {availablePackages.slice(0, 3).map(pkg => (
            <TouchableOpacity 
              key={pkg.id}
              style={styles.packageCard}
              onPress={() => navigate('packageDetails', pkg)}
            >
              <View style={styles.packageHeader}>
                <Text style={styles.packageId}>{pkg.id}</Text>
                <Text style={styles.packagePrice}>P {pkg.price}</Text>
              </View>
              <Text style={styles.packageDesc}>{pkg.description}</Text>
              <View style={styles.packageRoute}>
                <Text style={styles.packageLocation}>📍 {pkg.pickup}</Text>
                <Text style={styles.packageArrow}>→</Text>
                <Text style={styles.packageLocation}>📍 {pkg.delivery}</Text>
              </View>
              <View style={styles.packageFooter}>
                <Text style={styles.packageInfo}>{pkg.weight} • {pkg.distance}</Text>
                <TouchableOpacity 
                  style={styles.bidButton}
                  onPress={() => Alert.alert('Bid', `Place your bid for ${pkg.id}`)}
                >
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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

// Location Search Modal
function LocationSearchModal({ visible, title, onSelect, onCancel }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const sampleLocations = [
    { id: 1, name: 'Gaborone Main Mall', address: 'The Mall, Gaborone', lat: -24.6282, lng: 25.9231 },
    { id: 2, name: 'Sir Seretse Khama Airport', address: 'Airport Road, Gaborone', lat: -24.5552, lng: 25.9182 },
    { id: 3, name: 'Francistown Bus Rank', address: 'Blue Jacket St, Francistown', lat: -21.1700, lng: 27.5083 },
    { id: 4, name: 'Maun Airport', address: 'Maun, North-West District', lat: -19.9726, lng: 23.4311 },
    { id: 5, name: 'Palapye Station', address: 'Main Road, Palapye', lat: -22.5476, lng: 27.1247 },
    { id: 6, name: 'Kasane Bus Terminal', address: 'Kasane, Chobe District', lat: -17.8179, lng: 25.1644 },
    { id: 7, name: 'Serowe Shopping Center', address: 'Serowe, Central District', lat: -22.3850, lng: 26.7108 },
    { id: 8, name: 'Mogoditshane Square', address: 'Mogoditshane', lat: -24.6169, lng: 25.8653 },
  ];

  const filteredLocations = searchQuery.trim()
    ? sampleLocations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sampleLocations;

  const handleSelect = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      setSearchQuery('');
      setSelectedLocation(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {
      onCancel();
      setSearchQuery('');
      setSelectedLocation(null);
    }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>{title}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Search location..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

          <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
            {filteredLocations.map(location => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationItem,
                  selectedLocation?.id === location.id && styles.locationItemSelected
                ]}
                onPress={() => setSelectedLocation(location)}
              >
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                </View>
                {selectedLocation?.id === location.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                onCancel();
                setSearchQuery('');
                setSelectedLocation(null);
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonSubmit,
                !selectedLocation && { opacity: 0.5 }
              ]}
              onPress={handleSelect}
              disabled={!selectedLocation}
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
      />

      <LocationSearchModal
        visible={showDeliveryModal}
        title="Select Delivery Location"
        onSelect={(location) => {
          setDelivery(location);
          setShowDeliveryModal(false);
        }}
        onCancel={() => setShowDeliveryModal(false)}
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
  const [packagePhoto, setPackagePhoto] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

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

  const handleCreate = () => {
    if (!description || !pickup || !delivery || !recipientPhone || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert('Error', 'Please enter a valid Botswana phone number (e.g., 71234567)');
      return;
    }

    Alert.alert('Success', 'Package created successfully!\n\nDrivers can now bid on your package.', [
      { text: 'OK', onPress: () => goBack() }
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
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
                <Text style={styles.routeInfoText}>
                  ✓ Route will be created when driver accepts
                </Text>
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
      />

      <LocationSearchModal
        visible={showDeliveryModal}
        title="Select Delivery Location"
        onSelect={(location) => {
          setDelivery(location);
          setShowDeliveryModal(false);
        }}
        onCancel={() => setShowDeliveryModal(false)}
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
      <StatusBar style="dark" />
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
                        ⭐ {bid.rating} • {bid.trips} trips
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
      <StatusBar style="dark" />
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
                        <Text style={styles.driverRating}>⭐ {driver.rating}</Text>
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
                <Text style={styles.driverRating}>⭐ {trip.rating}</Text>
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
      <Modal visible={showSuggestModal} transparent animationType="slide">
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
      <StatusBar style="dark" />
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

// My Bids Screen (Driver)
function MyBidsScreen() {
  const { goBack, myBids } = useNavigation();

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bids</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {myBids.length > 0 ? (
            myBids.map(bid => (
              <View key={bid.id} style={styles.bidStatusCard}>
                <View style={styles.bidStatusHeader}>
                  <Text style={styles.bidStatusPackage}>{bid.packageId}</Text>
                  <View style={[
                    styles.bidStatusBadge,
                    bid.status === 'accepted' ? { backgroundColor: colors.success + '20' } :
                    bid.status === 'rejected' ? { backgroundColor: colors.error + '20' } :
                    { backgroundColor: '#FFA500' + '20' }
                  ]}>
                    <Text style={[
                      styles.bidStatusText,
                      bid.status === 'accepted' ? { color: colors.success } :
                      bid.status === 'rejected' ? { color: colors.error } :
                      { color: '#FFA500' }
                    ]}>
                      {bid.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bidStatusDesc}>{bid.description}</Text>
                <View style={styles.bidStatusRoute}>
                  <Text style={styles.packageLocation}>📍 {bid.pickup}</Text>
                  <Text style={styles.packageArrow}>→</Text>
                  <Text style={styles.packageLocation}>📍 {bid.delivery}</Text>
                </View>
                <View style={styles.bidStatusFooter}>
                  <Text style={styles.bidStatusAmount}>Your bid: P {bid.amount}</Text>
                  {bid.status === 'accepted' && (
                    <Text style={styles.bidStatusEarnings}>
                      You get: P {(bid.amount * 0.7).toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No Active Bids</Text>
              <Text style={styles.emptyText}>Place bids on available packages to see them here</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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

  const handleCounterBid = (pkg) => {
    setSelectedPackage(pkg);
    setShowCounterBidModal(true);
  };

  const handleCounterBidSubmit = (amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const counterAmount = parseFloat(amount);
    const yourEarnings = (counterAmount * 0.7).toFixed(2);
    const platformFee = (counterAmount * 0.3).toFixed(2);
    
    setShowCounterBidModal(false);
    
    Alert.alert(
      'Counter Offer Sent',
      `Your counter offer of P ${counterAmount} has been sent to ${selectedPackage.customer}.\n\n• You'll receive: P ${yourEarnings}\n• Platform fee (30%): P ${platformFee}\n\nWaiting for customer to accept or reject your offer.`,
      [{ text: 'OK', onPress: () => setSelectedPackage(null) }]
    );
  };

  const handleRejectSuggestion = (pkg) => {
    Alert.alert('Reject Package', `${pkg.customer}'s package suggestion rejected.`);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
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
function WalletScreen() {
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
      <StatusBar style="dark" />
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
  const { userProfile, setUserProfile } = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile.firstName);
  const [lastName, setLastName] = useState(userProfile.lastName);
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone);

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
      <StatusBar style="dark" />
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
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
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
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
                <Text style={styles.profileFieldLabel}>Email</Text>
                <Text style={styles.profileFieldValue}>{userProfile.email}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Phone</Text>
                <Text style={styles.profileFieldValue}>{userProfile.phone}</Text>
              </View>
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
  const { logout } = useNavigation();

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
    Alert.alert('Notifications', 'Notification settings coming soon!');
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
      <StatusBar style="dark" />
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
      return <LoginScreen />;
    }

    // Customer screens (check before tabs)
    if (currentScreen === 'createPackage') return <CreatePackageScreen />;
    if (currentScreen === 'myPackages') return <MyPackagesScreen />;
    if (currentScreen === 'availableDrivers') return <AvailableDriversScreen />;
    if (currentScreen === 'wallet') return <WalletScreen />;

    // Driver screens (check before tabs)
    if (currentScreen === 'availablePackages') return <AvailablePackagesScreen />;
    if (currentScreen === 'myBids') return <MyBidsScreen />;
    if (currentScreen === 'myTrips') return <MyTripsScreen />;

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

// Helper Functions
function getStatusColor(status) {
  const statusColors = {
    'pending': { backgroundColor: colors.accent },
    'in-transit': { backgroundColor: colors.primary },
    'delivered': { backgroundColor: colors.success },
    'cancelled': { backgroundColor: colors.error },
  };
  return statusColors[status] || { backgroundColor: colors.textTertiary };
}

// Main App
export default function App() {
  return (
    <NavigationProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBigContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBigN: {
    fontSize: 100,
    fontWeight: '900',
    color: colors.primary,
  },
  logoTextBig: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.cardBg,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sloganBig: {
    fontSize: 18,
    color: colors.cardBg,
    fontStyle: 'italic',
    opacity: 0.9,
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
    color: colors.textSecondary,
    fontStyle: 'italic',
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
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
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
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
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    fontSize: 20,
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
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    color: colors.secondary,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
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

  // Package Card
  packageCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
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
