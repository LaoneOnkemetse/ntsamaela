import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { useNavigation } from '../navigation/NavigationContext';

export const SettingsScreen = () => {
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
    <View style={sharedStyles.screenContainer}>
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
};

const styles = {
  settingsContainer: {
    padding: 20,
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingsItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  settingsItemArrow: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  settingsItemValue: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
};

