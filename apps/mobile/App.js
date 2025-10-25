import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, PermissionsAndroid, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// MODERN TRENDY DESIGN SYSTEM - 2025 Style
const trendyColors = {
  // Vibrant Gradient Primaries
  gradientStart: '#6366F1', // Vibrant Indigo
  gradientEnd: '#8B5CF6', // Purple
  
  // Accent Gradients
  accentStart: '#EC4899', // Pink
  accentEnd: '#EF4444', // Red
  
  // Success/Action Gradients
  successStart: '#10B981', // Emerald
  successEnd: '#14B8A6', // Teal
  
  // Modern Neutrals
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.7)',
  darkGlass: 'rgba(0, 0, 0, 0.05)',
  
  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textLight: '#FFFFFF',
  
  // Borders & Shadows
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  shadow: 'rgba(99, 102, 241, 0.2)',
  shadowDark: 'rgba(0, 0, 0, 0.1)',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// Custom Navigation System
const NavigationContext = React.createContext();

function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenHistory, setScreenHistory] = useState(['login']);
  const [showBottomTabs, setShowBottomTabs] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [screenParams, setScreenParams] = useState({});
  const [permissionsGranted, setPermissionsGranted] = useState(true);
  const [hasActivePackage, setHasActivePackage] = useState(false);
  const [showPermissionsOnStartup, setShowPermissionsOnStartup] = useState(false);

  const [customerWalletBalance, setCustomerWalletBalance] = useState(250.00);
  const [customerReservedBalance, setCustomerReservedBalance] = useState(0.00);
  const [driverWalletBalance, setDriverWalletBalance] = useState(850.00);
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'fund', amount: 150.00, description: 'Wallet funded', date: '2024-01-10', status: 'completed' },
  ]);

  const [userProfile, setUserProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    profilePhoto: null,
    rating: 4.8,
    totalDeliveries: 42,
    totalEarnings: 2850
  });

  const [driverActive, setDriverActive] = useState(true);
  const [availablePackages, setAvailablePackages] = useState([
    {
      id: 'PKG-001',
      customerName: 'Sarah M.',
      description: 'Electronics package',
      pickup: 'Gaborone CBD',
      delivery: 'Airport Junction',
      price: 250,
      weight: '2.5 kg',
      urgent: true,
      distance: '12 km',
      bids: 3
    },
    {
      id: 'PKG-002',
      customerName: 'Mike K.',
      description: 'Important documents',
      pickup: 'Broadhurst',
      delivery: 'Main Mall',
      price: 180,
      weight: '0.5 kg',
      urgent: false,
      distance: '8 km',
      bids: 5
    }
  ]);

  const [packageBids, setPackageBids] = useState([]);

  const navigate = (screenName, params = {}) => {
    setCurrentScreen(screenName);
    setScreenHistory(prev => [...prev, screenName]);
    setScreenParams(params);
    
    const mainScreens = ['home', 'explore', 'profile', 'settings'];
    setShowBottomTabs(isAuthenticated && mainScreens.includes(screenName));
  };

  const login = (userType) => {
    setIsAuthenticated(true);
    setUserType(userType);
    setCurrentScreen('home');
    setScreenHistory(['home']);
    setShowBottomTabs(true);
  };

  const logout = () => {
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
      
      const mainScreens = ['home', 'explore', 'profile', 'settings'];
      setShowBottomTabs(mainScreens.includes(previousScreen));
    }
  };

  return (
    <NavigationContext.Provider value={{ 
      currentScreen, 
      navigate, 
      goBack, 
      canGoBack: screenHistory.length > 1,
      showBottomTabs,
      isAuthenticated,
      userType,
      login,
      logout,
      screenParams,
      customerWalletBalance,
      driverWalletBalance,
      transactions,
      availablePackages,
      packageBids,
      permissionsGranted,
      setPermissionsGranted,
      hasActivePackage,
      setHasActivePackage,
      driverActive,
      setDriverActive,
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

// Modern Gradient Effect using overlapping views
function GradientView({ colors, style, children }) {
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors[0],
      }} />
      <View style={{
        position: 'absolute',
        top: 0,
        left: '20%',
        right: 0,
        bottom: 0,
        backgroundColor: colors[1],
        opacity: 0.6,
      }} />
      <View style={{
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors[1],
        opacity: 0.3,
      }} />
      {children}
    </View>
  );
}

// Modern Icon Component with Unicode symbols (no emojis)
function ModernIcon({ name, size = 24, color = '#FFFFFF', bgColor }) {
  const icons = {
    home: '⌂',        // House symbol
    search: '⌕',      // Search symbol
    user: '⚪',        // Circle for user
    settings: '⚙',    // Gear symbol
    package: '◫',     // Box symbol
    wallet: '▬',      // Card symbol
    truck: '▮',       // Truck/vehicle symbol
    location: '◉',    // Location pin
    bell: '◔',        // Bell/notification
    star: '★',        // Star symbol
    check: '✓',       // Checkmark
    arrow: '→',       // Arrow
    camera: '◉',      // Camera
    email: '✉',       // Mail symbol
    phone: '☎',       // Phone symbol
    logout: '⎋',      // Logout symbol
    info: 'ⓘ',        // Info symbol
    money: '$',       // Dollar sign
    chart: '◢',       // Chart/stats
    menu: '☰',        // Menu bars
    plus: '+',        // Plus sign
  };
  
  return (
    <View style={bgColor ? {
      backgroundColor: bgColor,
      width: size * 1.8,
      height: size * 1.8,
      borderRadius: size * 0.9,
      justifyContent: 'center',
      alignItems: 'center',
    } : null}>
      <Text style={{ fontSize: size, color, fontWeight: '700' }}>
        {icons[name] || '◉'}
      </Text>
    </View>
  );
}

// Modern Login/Register Screen with Gradient
function LoginScreen() {
  const { login, navigate } = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState('customer');

  const handleAuth = () => {
    if (isLogin) {
      login(userType);
    } else {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      login(userType);
    }
  };

  return (
    <GradientView colors={['#6366F1', '#8B5CF6']} style={{ flex: 1 }}>
      <StatusBar style="light" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.loginScroll}
      >
        {/* Header */}
        <View style={styles.loginHeader}>
          <View style={styles.appIconContainer}>
            <Text style={styles.appIcon}>🚚</Text>
          </View>
          <Text style={styles.loginTitle}>Ntsamaela</Text>
          <Text style={styles.loginSubtitle}>Your trusted delivery partner</Text>
        </View>

        {/* Glass Card */}
        <View style={styles.glassCard}>
          {/* Tab Switcher */}
          <View style={styles.authTabs}>
            <TouchableOpacity
              style={[styles.authTab, isLogin && styles.authTabActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.authTabText, isLogin && styles.authTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authTab, !isLogin && styles.authTabActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.authTabText, !isLogin && styles.authTabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Type Selector */}
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[styles.userTypeButton, userType === 'customer' && styles.userTypeActive]}
              onPress={() => setUserType('customer')}
            >
              <ModernIcon name="user" size={18} color={userType === 'customer' ? '#6366F1' : trendyColors.textSecondary} />
              <Text style={[styles.userTypeText, userType === 'customer' && styles.userTypeTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userTypeButton, userType === 'driver' && styles.userTypeActive]}
              onPress={() => setUserType('driver')}
            >
              <ModernIcon name="truck" size={18} color={userType === 'driver' ? '#6366F1' : trendyColors.textSecondary} />
              <Text style={[styles.userTypeText, userType === 'driver' && styles.userTypeTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {!isLogin && (
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.modernInput, { flex: 1, marginRight: 8 }]}
                placeholder="First Name"
                placeholderTextColor={trendyColors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.modernInput, { flex: 1 }]}
                placeholder="Last Name"
                placeholderTextColor={trendyColors.textTertiary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          )}

          <TextInput
            style={styles.modernInput}
            placeholder="Email Address"
            placeholderTextColor={trendyColors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.modernInput}
            placeholder="Password"
            placeholderTextColor={trendyColors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={styles.modernInput}
              placeholder="Confirm Password"
              placeholderTextColor={trendyColors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity style={styles.gradientButton} onPress={handleAuth}>
            <View style={styles.gradientButtonInner} />
            <Text style={styles.gradientButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Social Login Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>🍎</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </GradientView>
  );
}

// Modern Home Screen with Cards
function HomeScreen() {
  const { userType, navigate, userProfile } = useNavigation();
  
  const customerActions = [
    { id: 'createPackage', title: 'Send Package', icon: '📦', color: '#6366F1', gradient: ['#6366F1', '#8B5CF6'] },
    { id: 'myPackages', title: 'My Packages', icon: '📋', color: '#10B981', gradient: ['#10B981', '#14B8A6'] },
    { id: 'wallet', title: 'Wallet', icon: '💳', color: '#F59E0B', gradient: ['#F59E0B', '#EF4444'] },
    { id: 'tracking', title: 'Track', icon: '📍', color: '#3B82F6', gradient: ['#3B82F6', '#8B5CF6'] },
  ];

  const driverActions = [
    { id: 'availablePackages', title: 'Find Packages', icon: '🔍', color: '#6366F1', gradient: ['#6366F1', '#8B5CF6'] },
    { id: 'myBids', title: 'My Bids', icon: '💰', color: '#10B981', gradient: ['#10B981', '#14B8A6'] },
    { id: 'wallet', title: 'Earnings', icon: '💵', color: '#F59E0B', gradient: ['#F59E0B', '#EF4444'] },
    { id: 'myTrips', title: 'Active Trips', icon: '🚗', color: '#EC4899', gradient: ['#EC4899', '#8B5CF6'] },
  ];

  const actions = userType === 'customer' ? customerActions : driverActions;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Modern Header with Profile */}
        <View style={styles.homeHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello 👋</Text>
              <Text style={styles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
            </View>
            <TouchableOpacity style={styles.notifButton} onPress={() => navigate('notifications')}>
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>{userProfile.totalDeliveries}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>P{userProfile.totalEarnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{userProfile.rating} ⭐</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => navigate(action.id)}
              >
                <View style={[styles.actionIconBg, { backgroundColor: `${action.color}15` }]}>
                  <Text style={styles.actionIconLarge}>{action.icon}</Text>
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>📦</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Package Delivered</Text>
              <Text style={styles.activitySubtitle}>Gaborone → Francistown</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
            <Text style={styles.activityAmount}>+P250</Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>💰</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Payment Received</Text>
              <Text style={styles.activitySubtitle}>Order #1234</Text>
              <Text style={styles.activityTime}>5 hours ago</Text>
            </View>
            <Text style={styles.activityAmount}>+P180</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Modern Profile Screen
function ProfileScreen() {
  const { navigate, userType, userProfile, setUserProfile, logout } = useNavigation();

  const showPhotoActionSheet = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => Alert.alert('Camera', 'Camera functionality') },
        { text: 'Choose from Library', onPress: () => Alert.alert('Gallery', 'Gallery functionality') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header with Gradient */}
        <GradientView colors={['#6366F1', '#8B5CF6']} style={styles.profileHeader}>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <View style={styles.profilePhotoSection}>
            {userProfile.profilePhoto ? (
              <Image source={{ uri: userProfile.profilePhoto }} style={styles.profilePhotoLarge} />
            ) : (
              <View style={styles.profilePhotoLarge}>
                <Text style={styles.profileInitials}>
                  {userProfile.firstName[0]}{userProfile.lastName[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={showPhotoActionSheet}>
              <Text style={styles.cameraButtonText}>📷</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{userProfile.firstName} {userProfile.lastName}</Text>
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>
              {userType === 'customer' ? '👤 Customer' : '🚗 Driver'}
            </Text>
          </View>
        </GradientView>

        {/* Profile Stats */}
        <View style={styles.profileStats}>
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>{userProfile.totalDeliveries}</Text>
            <Text style={styles.profileStatLabel}>Completed</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>{userProfile.rating}</Text>
            <Text style={styles.profileStatLabel}>Rating</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>P{userProfile.totalEarnings}</Text>
            <Text style={styles.profileStatLabel}>Earned</Text>
          </View>
        </View>

        {/* Profile Actions */}
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.profileActionItem} onPress={() => navigate('wallet')}>
            <View style={[styles.profileActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.profileActionIconText}>💳</Text>
            </View>
            <View style={styles.profileActionContent}>
              <Text style={styles.profileActionTitle}>Wallet</Text>
              <Text style={styles.profileActionSubtitle}>Manage payments</Text>
            </View>
            <Text style={styles.profileActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileActionItem} onPress={() => navigate('verification')}>
            <View style={[styles.profileActionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.profileActionIconText}>✓</Text>
            </View>
            <View style={styles.profileActionContent}>
              <Text style={styles.profileActionTitle}>Verification</Text>
              <Text style={styles.profileActionSubtitle}>ID verification status</Text>
            </View>
            <Text style={styles.profileActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileActionItem} onPress={() => navigate('reviews')}>
            <View style={[styles.profileActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.profileActionIconText}>⭐</Text>
            </View>
            <View style={styles.profileActionContent}>
              <Text style={styles.profileActionTitle}>Reviews</Text>
              <Text style={styles.profileActionSubtitle}>View your reviews</Text>
            </View>
            <Text style={styles.profileActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileActionItem} onPress={() => navigate('settings')}>
            <View style={[styles.profileActionIcon, { backgroundColor: '#F3F4F6' }]}>
              <Text style={styles.profileActionIconText}>⚙️</Text>
            </View>
            <View style={styles.profileActionContent}>
              <Text style={styles.profileActionTitle}>Settings</Text>
              <Text style={styles.profileActionSubtitle}>App preferences</Text>
            </View>
            <Text style={styles.profileActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.profileActionItem, { marginTop: 16 }]} onPress={logout}>
            <View style={[styles.profileActionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.profileActionIconText}>🚪</Text>
            </View>
            <View style={styles.profileActionContent}>
              <Text style={[styles.profileActionTitle, { color: '#EF4444' }]}>Logout</Text>
              <Text style={styles.profileActionSubtitle}>Sign out of your account</Text>
            </View>
            <Text style={styles.profileActionArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Settings Screen
function SettingsScreen() {
  const { navigate, logout } = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Text style={styles.settingsSubtitle}>Manage your preferences</Text>
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Text style={styles.settingIconText}>🔔</Text>
              </View>
              <View>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Push notifications</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggle, notifications && styles.toggleActive]}
              onPress={() => setNotifications(!notifications)}
            >
              <View style={[styles.toggleThumb, notifications && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.settingIconText}>📍</Text>
              </View>
              <View>
                <Text style={styles.settingTitle}>Location</Text>
                <Text style={styles.settingSubtitle}>GPS tracking</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggle, location && styles.toggleActive]}
              onPress={() => setLocation(!location)}
            >
              <View style={[styles.toggleThumb, location && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>More</Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => navigate('about')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.settingIconText}>ℹ️</Text>
              </View>
              <Text style={styles.settingTitle}>About</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton} onPress={() => navigate('contact')}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#E0E7FF' }]}>
                <Text style={styles.settingIconText}>📧</Text>
              </View>
              <Text style={styles.settingTitle}>Contact Support</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingButton, { marginTop: 16 }]} onPress={logout}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.settingIconText}>🚪</Text>
              </View>
              <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Logout</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Wallet Screen
function WalletScreen() {
  const { goBack, customerWalletBalance, driverWalletBalance, userType, transactions } = useNavigation();

  const balance = userType === 'customer' ? customerWalletBalance : driverWalletBalance;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Wallet Card with Gradient */}
        <GradientView colors={['#6366F1', '#8B5CF6']} style={styles.walletCard}>
          <Text style={styles.walletLabel}>Available Balance</Text>
          <Text style={styles.walletBalance}>P {balance.toFixed(2)}</Text>
          
          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.walletButton}>
              <Text style={styles.walletButtonIcon}>↓</Text>
              <Text style={styles.walletButtonText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletButton}>
              <Text style={styles.walletButtonIcon}>↑</Text>
              <Text style={styles.walletButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </GradientView>

        {/* Quick Stats */}
        <View style={styles.walletStats}>
          <View style={styles.walletStatItem}>
            <Text style={styles.walletStatValue}>P1,250</Text>
            <Text style={styles.walletStatLabel}>This Month</Text>
          </View>
          <View style={styles.walletStatItem}>
            <Text style={styles.walletStatValue}>P2,850</Text>
            <Text style={styles.walletStatLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={[styles.transactionIcon, {
                backgroundColor: tx.type === 'fund' ? '#ECFDF5' : '#FEE2E2'
              }]}>
                <Text style={styles.transactionIconText}>
                  {tx.type === 'fund' ? '↓' : '↑'}
                </Text>
              </View>
              <View style={styles.transactionContent}>
                <Text style={styles.transactionTitle}>{tx.description}</Text>
                <Text style={styles.transactionDate}>{tx.date}</Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: tx.type === 'fund' ? '#10B981' : '#EF4444' }
              ]}>
                {tx.type === 'fund' ? '+' : '-'}P{tx.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Explore/Available Packages Screen
function ExploreScreen() {
  const { availablePackages, navigate } = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.exploreHeader}>
          <Text style={styles.exploreTitle}>Available Packages</Text>
          <Text style={styles.exploreSubtitle}>Find delivery opportunities</Text>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Urgent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>High Value</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Package Cards */}
        <View style={styles.packagesGrid}>
          {availablePackages.map((pkg) => (
            <View key={pkg.id} style={styles.packageCard}>
              {pkg.urgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>🚨 Urgent</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <Text style={styles.packageTitle}>{pkg.description}</Text>
                <Text style={styles.packagePrice}>P{pkg.price}</Text>
              </View>

              <View style={styles.packageRoute}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={styles.routeText}>{pkg.pickup}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.routeText}>{pkg.delivery}</Text>
                </View>
              </View>

              <View style={styles.packageFooter}>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageInfoText}>📦 {pkg.weight}</Text>
                  <Text style={styles.packageInfoText}>📍 {pkg.distance}</Text>
                  <Text style={styles.packageInfoText}>💬 {pkg.bids} bids</Text>
                </View>
                <TouchableOpacity style={styles.bidButton}>
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Bottom Tab Navigation
function BottomTabNavigation() {
  const { currentScreen, navigate } = useNavigation();
  
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'explore', label: 'Explore', icon: 'search' },
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  
  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => navigate(tab.id)}
        >
          <View style={[
            styles.tabIconContainer,
            currentScreen === tab.id && styles.tabIconContainerActive
          ]}>
            <ModernIcon 
              name={tab.icon} 
              size={22} 
              color={currentScreen === tab.id ? '#6366F1' : trendyColors.textSecondary}
            />
          </View>
          <Text style={[
            styles.tabLabel,
            currentScreen === tab.id && styles.tabLabelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Main App Component
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationProvider>
        <AppNavigator />
      </NavigationProvider>
    </SafeAreaView>
  );
}

function AppNavigator() {
  const { currentScreen, showBottomTabs } = useNavigation();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen />;
      case 'home':
        return <HomeScreen />;
      case 'explore':
        return <ExploreScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'wallet':
        return <WalletScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {showBottomTabs && <BottomTabNavigation />}
    </View>
  );
}

// MODERN TRENDY STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: trendyColors.background,
  },

  // LOGIN SCREEN - Modern Gradient Design
  loginContainer: {
    flex: 1,
    backgroundColor: '#6366F1',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
  },
  loginScroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIcon: {
    fontSize: 40,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Glass Card Effect
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  
  authTabs: {
    flexDirection: 'row',
    backgroundColor: trendyColors.borderLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  authTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  authTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: trendyColors.textSecondary,
  },
  authTabTextActive: {
    color: trendyColors.textPrimary,
  },

  userTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: trendyColors.borderLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userTypeActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  userTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  userTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: trendyColors.textSecondary,
  },
  userTypeTextActive: {
    color: '#6366F1',
  },

  modernInput: {
    backgroundColor: trendyColors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: trendyColors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  nameRow: {
    flexDirection: 'row',
    gap: 8,
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },

  gradientButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: trendyColors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: trendyColors.textSecondary,
  },

  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: trendyColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 24,
  },

  // HOME SCREEN - Modern Card Design
  homeHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: trendyColors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: trendyColors.textPrimary,
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: trendyColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifIcon: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: trendyColors.textSecondary,
  },

  actionsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconLarge: {
    fontSize: 32,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: trendyColors.textPrimary,
    textAlign: 'center',
  },

  activitySection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: trendyColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: trendyColors.textPrimary,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: trendyColors.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: trendyColors.textTertiary,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },

  // PROFILE SCREEN
  profileHeader: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
  },
  editProfileButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profilePhotoSection: {
    marginBottom: 16,
    position: 'relative',
  },
  profilePhotoLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  cameraButtonText: {
    fontSize: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  profileBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  profileStats: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 20,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    color: trendyColors.textSecondary,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: trendyColors.border,
    marginHorizontal: 12,
  },

  profileActions: {
    padding: 20,
  },
  profileActionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileActionIconText: {
    fontSize: 20,
  },
  profileActionContent: {
    flex: 1,
  },
  profileActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: trendyColors.textPrimary,
    marginBottom: 2,
  },
  profileActionSubtitle: {
    fontSize: 13,
    color: trendyColors.textSecondary,
  },
  profileActionArrow: {
    fontSize: 24,
    color: trendyColors.textTertiary,
  },

  // SETTINGS SCREEN
  settingsHeader: {
    padding: 20,
    paddingTop: 16,
  },
  settingsTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 4,
  },
  settingsSubtitle: {
    fontSize: 16,
    color: trendyColors.textSecondary,
  },
  settingsSection: {
    padding: 20,
    paddingTop: 8,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: trendyColors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconText: {
    fontSize: 18,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: trendyColors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: trendyColors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: trendyColors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  settingButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingArrow: {
    fontSize: 24,
    color: trendyColors.textTertiary,
  },

  // WALLET SCREEN
  walletCard: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  walletGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: '#6366F1',
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  walletBalance: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  walletButtonIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  walletStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  walletStatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  walletStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 4,
  },
  walletStatLabel: {
    fontSize: 13,
    color: trendyColors.textSecondary,
  },

  transactionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: trendyColors.textPrimary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: trendyColors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },

  // EXPLORE SCREEN
  exploreHeader: {
    padding: 20,
    paddingTop: 16,
  },
  exploreTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 4,
  },
  exploreSubtitle: {
    fontSize: 16,
    color: trendyColors.textSecondary,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: trendyColors.border,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: trendyColors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  packagesGrid: {
    padding: 20,
    paddingTop: 8,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  urgentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  packageHeader: {
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: trendyColors.textPrimary,
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  packageRoute: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  routeText: {
    fontSize: 15,
    color: trendyColors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: trendyColors.border,
    marginLeft: 5,
    marginVertical: -4,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: trendyColors.borderLight,
  },
  packageInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  packageInfoText: {
    fontSize: 13,
    color: trendyColors.textSecondary,
  },
  bidButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // BOTTOM TAB NAVIGATION
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: trendyColors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabIconContainerActive: {
    backgroundColor: '#EEF2FF',
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: trendyColors.textSecondary,
  },
  tabLabelActive: {
    color: '#6366F1',
  },
});
