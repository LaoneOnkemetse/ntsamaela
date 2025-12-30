import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { useNavigation } from '../navigation/NavigationContext';

export const LoginScreen = () => {
  const { login, navigate } = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('267'); // Default to Botswana
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
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

  const handleForgotPassword = () => {
    navigate('forgotPassword', true);
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
      } catch (error) {
        console.error('❌ Login error in handleAuth catch block:', error);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        Alert.alert('Login Error', 'An error occurred during login. Please try again.');
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
        <SafeAreaView style={sharedStyles.loginContainer}>
          {/* Professional Logo Section */}
          <View style={sharedStyles.logoSection}>
            <View style={sharedStyles.logoCircle}>
              <Text style={sharedStyles.logoN}>N</Text>
            </View>
            <Text style={sharedStyles.logoText}>NTSAMAELA</Text>
            <Text style={sharedStyles.slogan}>Re go tsamaela bosigo le motshegare</Text>
          </View>

          {/* Login/Signup Toggle */}
          <View style={sharedStyles.toggleContainer}>
            <TouchableOpacity
              style={[sharedStyles.toggleButton, isLogin && sharedStyles.toggleButtonActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[sharedStyles.toggleText, isLogin && sharedStyles.toggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sharedStyles.toggleButton, !isLogin && sharedStyles.toggleButtonActive]}
              onPress={() => { setIsLogin(false); setShowRoleModal(true); }}
            >
              <Text style={[sharedStyles.toggleText, !isLogin && sharedStyles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card (only for Sign In). Sign Up uses dedicated screens */}
          {isLogin && (
          <View style={sharedStyles.formCard}>
            {/* Phone Number with Country Code */}
            <View style={sharedStyles.phoneInputContainer}>
                <TouchableOpacity
                style={sharedStyles.countryCodeContainer}
                onPress={() => setShowCountryCodeModal(true)}
                >
                <Text style={sharedStyles.countryCodeText}>+{countryCode}</Text>
                <Text style={sharedStyles.countryCodeArrow}>▼</Text>
                </TouchableOpacity>
            <TextInput
                style={[sharedStyles.input, sharedStyles.phoneInput]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textTertiary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            </View>

            <View style={sharedStyles.passwordInputWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showLoginPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowLoginPassword(p => !p)} 
                style={sharedStyles.passwordIcon} 
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={sharedStyles.passwordIconText}>{showLoginPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword} style={sharedStyles.forgotButton}>
                <Text style={sharedStyles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[sharedStyles.primaryButton, isLoading && sharedStyles.primaryButtonDisabled]} 
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={sharedStyles.primaryButtonText}>
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
        <View style={sharedStyles.modalOverlay}>
          <View style={sharedStyles.modalContent}>
            <Text style={sharedStyles.modalTitle}>Select Country Code</Text>
            <ScrollView style={sharedStyles.countryCodeList}>
              {countryCodes.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    sharedStyles.countryCodeItem,
                    countryCode === item.code && sharedStyles.countryCodeItemActive
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryCodeModal(false);
                  }}
                >
                  <Text style={sharedStyles.countryCodeFlag}>{item.flag}</Text>
                  <Text style={sharedStyles.countryCodeName}>{item.country}</Text>
                  <Text style={sharedStyles.countryCodeNumber}>+{item.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]} 
              onPress={() => setShowCountryCodeModal(false)}
            >
              <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={sharedStyles.modalOverlay}>
          <View style={sharedStyles.modalContent}>
            <Text style={sharedStyles.modalTitle}>Choose Account Type</Text>
            <Text style={sharedStyles.modalSubtitle}>Select how you want to register</Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={[sharedStyles.roleChoiceButton, { flex: 1, marginRight: 8 }]}
                onPress={() => { setShowRoleModal(false); navigate('registerCustomer'); }}
              >
                <Text style={sharedStyles.roleChoiceText}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sharedStyles.roleChoiceButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => { setShowRoleModal(false); navigate('registerDriver'); }}
              >
                <Text style={sharedStyles.roleChoiceText}>Driver</Text>
              </TouchableOpacity>
            </View>
            <View style={sharedStyles.roleModalSpacing} />
            <View style={sharedStyles.modalButtons}>
              <TouchableOpacity 
                style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]} 
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={sharedStyles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
