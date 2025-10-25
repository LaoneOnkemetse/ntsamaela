import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, PermissionsAndroid, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// NTSAMAELA 2025 DESIGN SYSTEM - Botswana Pride
const colors = {
  // Botswana Flag Colors - Primary Palette
  botswanaBlue: '#75AADB',
  botswanaBlack: '#000000',
  botswanaWhite: '#FFFFFF',
  
  // Primary - Sky Blue (Botswana Blue)
  primary: '#75AADB',
  primaryDark: '#5A8FBF',
  primaryLight: '#A3C9E8',
  
  // Secondary - Deep Black
  secondary: '#1A1A1A',
  secondaryLight: '#333333',
  
  // Accent Colors (2025 Trends)
  accent: '#FFB800', // Warm Gold
  accentGreen: '#00C853', // Success Green
  accentOrange: '#FF6D00', // Energy Orange
  
  // Backgrounds
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  darkBg: '#0A0A0A',
  
  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#FFFFFF',
  textMuted: '#CCCCCC',
  
  // Status
  success: '#00C853',
  warning: '#FFB800',
  error: '#D32F2F',
  info: '#75AADB',
  
  // Borders & Shadows
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  shadow: 'rgba(117, 170, 219, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.08)',
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

// Ntsamaela Logo Component
function NtsamaelaLogo({ size = 'large', showSlogan = true }) {
  const logoSize = size === 'large' ? 48 : size === 'medium' ? 32 : 24;
  const sloganSize = size === 'large' ? 16 : size === 'medium' ? 14 : 12;
  
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: showSlogan ? 8 : 0,
      }}>
        <View style={{
          width: logoSize * 1.2,
          height: logoSize * 1.2,
          borderRadius: logoSize * 0.6,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Text style={{
            fontSize: logoSize * 0.6,
            color: colors.textLight,
            fontWeight: '900',
          }}>N</Text>
        </View>
        <Text style={{
          fontSize: logoSize,
          fontWeight: '800',
          color: colors.secondary,
          letterSpacing: 1,
        }}>
          NTSAMAELA
        </Text>
      </View>
      {showSlogan && (
        <Text style={{
          fontSize: sloganSize,
          color: colors.textSecondary,
          fontStyle: 'italic',
          letterSpacing: 0.5,
        }}>
          roma mongwe ka wena
        </Text>
      )}
    </View>
  );
}

// Modern Icon Component
function Icon({ name, size = 24, color = colors.textPrimary }) {
  const icons = {
    home: '⌂',
    search: '⌕',
    user: '●',
    settings: '⚙',
    package: '◫',
    wallet: '▬',
    truck: '▮',
    location: '◉',
    bell: '◔',
    star: '★',
    check: '✓',
    arrow: '→',
    send: '↗',
    menu: '☰',
  };
  
  return (
    <Text style={{ fontSize: size, color, fontWeight: '600' }}>
      {icons[name] || '●'}
    </Text>
  );
}

// New 2025 Login Screen - Clean & Minimal
function LoginScreen() {
  const { login } = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [devMode, setDevMode] = useState('customer');

  const handleAuth = () => {
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    login(devMode);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
      >
        <View style={{ marginBottom: 48, alignItems: 'center' }}>
          <NtsamaelaLogo size="large" showSlogan={true} />
        </View>

        <View style={{
          backgroundColor: colors.cardBg,
          borderRadius: 20,
          padding: 24,
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: isLogin ? colors.primary : 'transparent',
              }}
              onPress={() => setIsLogin(true)}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: '600',
                color: isLogin ? colors.textLight : colors.textSecondary,
              }}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: !isLogin ? colors.primary : 'transparent',
              }}
              onPress={() => setIsLogin(false)}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: '600',
                color: !isLogin ? colors.textLight : colors.textSecondary,
              }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
                placeholder="First Name"
                placeholderTextColor={colors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
                placeholder="Last Name"
                placeholderTextColor={colors.textTertiary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          )}

          <TextInput
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              fontSize: 16,
              color: colors.textPrimary,
            }}
            placeholder="Email Address"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              fontSize: 16,
              color: colors.textPrimary,
            }}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                fontSize: 16,
                color: colors.textPrimary,
              }}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}

          {/* Login Button */}
          <TouchableOpacity 
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 18,
              alignItems: 'center',
              marginTop: 8,
            }}
            onPress={handleAuth}
          >
            <Text style={{
              color: colors.textLight,
              fontSize: 16,
              fontWeight: '700',
            }}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dev Mode Toggle */}
        <View style={{
          marginTop: 32,
          padding: 20,
          backgroundColor: colors.cardBg,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: colors.accent,
          borderStyle: 'dashed',
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            🔧 Development Mode
          </Text>
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 4,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: devMode === 'customer' ? colors.accent : 'transparent',
              }}
              onPress={() => setDevMode('customer')}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 14,
                color: devMode === 'customer' ? colors.textLight : colors.textSecondary,
              }}>
                Customer View
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: devMode === 'driver' ? colors.accent : 'transparent',
              }}
              onPress={() => setDevMode('driver')}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 14,
                color: devMode === 'driver' ? colors.textLight : colors.textSecondary,
              }}>
                Driver View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Modern Home Screen with Cards
function HomeScreen() {
  const { userType, navigate, userProfile } = useNavigation();
  
  const customerActions = [
    { id: 'createPackage', title: 'Send Package', icon: 'package', color: colors.primary },
    { id: 'myPackages', title: 'My Packages', icon: 'menu', color: colors.accentGreen },
    { id: 'wallet', title: 'Wallet', icon: 'wallet', color: colors.accent },
    { id: 'tracking', title: 'Track', icon: 'location', color: colors.accentOrange },
  ];

  const driverActions = [
    { id: 'explore', title: 'Find Packages', icon: 'search', color: colors.primary },
    { id: 'myBids', title: 'My Bids', icon: 'star', color: colors.accentGreen },
    { id: 'wallet', title: 'Earnings', icon: 'wallet', color: colors.accent },
    { id: 'myTrips', title: 'Active Trips', icon: 'truck', color: colors.accentOrange },
  ];

  const actions = userType === 'customer' ? customerActions : driverActions;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Ntsamaela Logo */}
        <View style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          backgroundColor: colors.cardBg,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <NtsamaelaLogo size="small" showSlogan={false} />
            <TouchableOpacity 
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => navigate('notifications')}
            >
              <Icon name="bell" size={20} color={colors.textPrimary} />
              <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.error,
              }} />
            </TouchableOpacity>
          </View>
          
          <View>
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 4 }}>Welcome back</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary }}>
              {userProfile.firstName} {userProfile.lastName}
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <View style={{
              flex: 1,
              backgroundColor: colors.primary + '15',
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>
                {userProfile.totalDeliveries}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                Deliveries
              </Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: colors.accentGreen + '15',
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.accentGreen, marginBottom: 4 }}>
                BWP {userProfile.totalEarnings}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                Earnings
              </Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: colors.accent + '15',
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.accent, marginBottom: 4 }}>
                {userProfile.rating}★
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                Rating
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={{
                  width: (width - 52) / 2,
                  backgroundColor: colors.cardBg,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  shadowColor: colors.shadowDark,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                onPress={() => navigate(action.id)}
              >
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: action.color + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Icon name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' }}>
                  {action.title}
                </Text>
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
            <Text style={styles.activityAmount}>+BWP 250</Text>
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
            <Text style={styles.activityAmount}>+BWP 180</Text>
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
            <Text style={styles.profileStatValue}>BWP {userProfile.totalEarnings}</Text>
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
          <Text style={styles.walletBalance}>BWP {balance.toFixed(2)}</Text>
          
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
                {tx.type === 'fund' ? '+' : '-'}BWP {tx.amount.toFixed(2)}
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
                <Text style={styles.packagePrice}>BWP {pkg.price}</Text>
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
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 20,
      paddingTop: 12,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => navigate(tab.id)}
        >
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: currentScreen === tab.id ? colors.primary + '15' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 4,
          }}>
            <Icon 
              name={tab.icon} 
              size={22} 
              color={currentScreen === tab.id ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text style={{
            fontSize: 11,
            fontWeight: currentScreen === tab.id ? '600' : '400',
            color: currentScreen === tab.id ? colors.primary : colors.textSecondary,
          }}>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.borderLight,
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
    color: colors.textSecondary,
  },
  authTabTextActive: {
    color: colors.textPrimary,
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
    backgroundColor: colors.borderLight,
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
    color: colors.textSecondary,
  },
  userTypeTextActive: {
    color: '#6366F1',
  },

  modernInput: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.textPrimary,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.borderLight,
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
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.borderLight,
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
    color: colors.textSecondary,
  },

  actionsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.borderLight,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textTertiary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: colors.border,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileActionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  profileActionArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },

  // SETTINGS SCREEN
  settingsHeader: {
    padding: 20,
    paddingTop: 16,
  },
  settingsTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingsSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  settingsSection: {
    padding: 20,
    paddingTop: 8,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
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
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
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
    color: colors.textTertiary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  walletStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  exploreSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: -4,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  packageInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  packageInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
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
    borderTopColor: colors.borderLight,
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
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: '#6366F1',
  },
});
