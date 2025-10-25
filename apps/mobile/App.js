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
  secondary: '#1A1A1A',    // Deep Black
  accent: '#FFB800',       // Gold
  success: '#00C853',      // Green
  error: '#D32F2F',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#FFFFFF',
  border: '#E0E0E0',
  shadow: 'rgba(117, 170, 219, 0.15)',
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
    },
  ]);

  const [myBids, setMyBids] = useState([]);
  
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

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
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
              onPress={() => navigate('trackPackage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Text style={styles.actionIconText}>📍</Text>
              </View>
              <Text style={styles.actionText}>Track Package</Text>
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
                <Text style={styles.packageDriver}>Driver: {pkg.driver}</Text>
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
  const { navigate, availablePackages, driverWallet, userProfile } = useNavigation();

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
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

// Create Package Screen (Customer)
function CreatePackageScreen() {
  const { navigate, goBack } = useNavigation();
  const [description, setDescription] = useState('');
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');

  const handleCreate = () => {
    if (!description || !pickup || !delivery || !weight || !price) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert('Success', 'Package created successfully!', [
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

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.input}
            placeholder="Package Description"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Pickup Location"
            placeholderTextColor={colors.textTertiary}
            value={pickup}
            onChangeText={setPickup}
          />
          <TextInput
            style={styles.input}
            placeholder="Delivery Location"
            placeholderTextColor={colors.textTertiary}
            value={delivery}
            onChangeText={setDelivery}
          />
          <TextInput
            style={styles.input}
            placeholder="Weight (kg)"
            placeholderTextColor={colors.textTertiary}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Offering Price (P)"
            placeholderTextColor={colors.textTertiary}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>Create Package</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// My Packages Screen (Customer)
function MyPackagesScreen() {
  const { goBack, myPackages } = useNavigation();

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
          {myPackages.map(pkg => (
            <View key={pkg.id} style={styles.packageCard}>
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
                <Text style={styles.packageDriver}>Driver: {pkg.driver}</Text>
                <Text style={styles.packagePrice}>P {pkg.price}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Track Package Screen (Customer)
function TrackPackageScreen() {
  const { goBack } = useNavigation();

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Package</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Real-time Tracking</Text>
          <Text style={styles.emptyText}>Track your package location in real-time</Text>
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingLabel}>Package: PKG-001</Text>
            <Text style={styles.trackingLabel}>Status: In Transit</Text>
            <Text style={styles.trackingLabel}>ETA: 25 minutes</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Available Packages Screen (Driver)
function AvailablePackagesScreen() {
  const { goBack, availablePackages } = useNavigation();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const handlePlaceBid = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidModal(true);
  };

  const handleBidSubmit = (amount) => {
    setShowBidModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      Alert.alert('Success', `Bid of P ${amount} placed for ${selectedPackage.id}!`);
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
            <View key={pkg.id} style={styles.packageCard}>
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
              <View style={styles.packageFooter}>
                <Text style={styles.packageInfo}>{pkg.weight} • {pkg.distance}</Text>
                <TouchableOpacity 
                  style={styles.bidButton}
                  onPress={() => handlePlaceBid(pkg)}
                >
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <InputModal
        visible={showBidModal}
        title={selectedPackage ? `Place Bid for ${selectedPackage.id}` : 'Place Bid'}
        placeholder="Enter bid amount (P)"
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

        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Active Bids</Text>
          <Text style={styles.emptyText}>Your bids will appear here</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// My Trips Screen (Driver)
function MyTripsScreen() {
  const { goBack } = useNavigation();

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

        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No Active Trips</Text>
          <Text style={styles.emptyText}>Your trips will appear here</Text>
        </View>
      </SafeAreaView>
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
            <TouchableOpacity style={styles.walletButton} onPress={handleDeposit}>
              <Text style={styles.walletButtonIcon}>💳</Text>
              <Text style={styles.walletButtonText}>Deposit</Text>
            </TouchableOpacity>

            {!isCustomer && (
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

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>Settings</Text>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>🔔 Notifications</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>🔒 Privacy</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>❓ Help & Support</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>About</Text>
            
            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>📄 Terms of Service</Text>
              <Text style={styles.settingsItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
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
  const { activeTab, setActiveTab } = useNavigation();

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomNavItem}
          onPress={() => setActiveTab(tab.id)}
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
    if (currentScreen === 'trackPackage') return <TrackPackageScreen />;
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textLight,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    opacity: 0.9,
  },

  // Section
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconText: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Package Card
  packageCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomNavIconActive: {
    backgroundColor: colors.primary,
  },
  bottomNavIconText: {
    fontSize: 24,
  },
  bottomNavLabel: {
    fontSize: 12,
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
});
