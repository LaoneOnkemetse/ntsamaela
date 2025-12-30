import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { useNavigation } from '../navigation/NavigationContext';

export const ForgotPasswordScreen = () => {
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
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={() => navigate('login', true)} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={sharedStyles.formContainer}>
          {step === 'phone' && (
            <View style={sharedStyles.formCard}>
              <Text style={sharedStyles.modalSubtitle}>Enter your phone number to receive a 6-digit OTP</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.textTertiary}
                value={forgotPhone}
                onChangeText={setForgotPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={sharedStyles.primaryButton} onPress={sendOTP}>
                <Text style={sharedStyles.primaryButtonText}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={sharedStyles.formCard}>
              <Text style={sharedStyles.modalSubtitle}>Enter the 6-digit OTP sent to {forgotPhone}</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="6-digit OTP"
                placeholderTextColor={colors.textTertiary}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={sharedStyles.primaryButton} onPress={verifyOTP}>
                <Text style={sharedStyles.primaryButtonText}>Verify OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'new' && (
            <View style={sharedStyles.formCard}>
              <Text style={sharedStyles.modalSubtitle}>Create a new password</Text>
              <View style={sharedStyles.passwordInputWrapper}>
                <TextInput
                  style={[sharedStyles.input, sharedStyles.passwordInput]}
                  placeholder="New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(p => !p)} style={sharedStyles.passwordIcon}>
                  <Text style={sharedStyles.passwordIconText}>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <View style={sharedStyles.passwordInputWrapper}>
                <TextInput
                  style={[sharedStyles.input, sharedStyles.passwordInput]}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirmNew}
                />
                <TouchableOpacity onPress={() => setShowConfirmNew(p => !p)} style={sharedStyles.passwordIcon}>
                  <Text style={sharedStyles.passwordIconText}>{showConfirmNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={sharedStyles.primaryButton} onPress={resetPassword}>
                <Text style={sharedStyles.primaryButtonText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

