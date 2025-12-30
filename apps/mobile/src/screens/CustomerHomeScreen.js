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
import { homeStyles } from '../styles/homeStyles';
import { useNavigation } from '../navigation/NavigationContext';

export const CustomerHomeScreen = () => {
  const { navigate, myPackages, customerWallet, userProfile, notifications } = useNavigation();

  const handleNotifications = () => {
    navigate('notifications');
  };
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={homeStyles.header}>
          <View>
            <Text style={homeStyles.userName}>{userProfile.firstName} {userProfile.lastName}</Text>
          </View>
          <TouchableOpacity style={homeStyles.headerNotif} onPress={handleNotifications}>
            <Text style={homeStyles.headerNotifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={homeStyles.headerNotifBadge}>
                <Text style={homeStyles.headerNotifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={homeStyles.statsRow}>
          <View style={[homeStyles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={homeStyles.statValue}>{myPackages.length}</Text>
            <Text style={homeStyles.statLabel}>Active Packages</Text>
          </View>
          <View style={[homeStyles.statCard, { backgroundColor: colors.success }]}>
            <Text style={homeStyles.statValue}>P {customerWallet}</Text>
            <Text style={homeStyles.statLabel}>Wallet Balance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={homeStyles.section}>
          <View style={homeStyles.actionsGrid}>
            <TouchableOpacity 
              style={[homeStyles.actionCard, !userProfile.isVerified && homeStyles.actionCardDisabled]}
              onPress={() => userProfile.isVerified ? navigate('createPackage') : Alert.alert('Verification Required', 'Please wait for account verification to create packages')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: userProfile.isVerified ? colors.primary : colors.border }]}>
                <Text style={homeStyles.actionIconText}>📦</Text>
              </View>
              <Text style={[homeStyles.actionText, !userProfile.isVerified && homeStyles.actionTextDisabled]}>Create Package</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={homeStyles.actionCard}
              onPress={() => navigate('myPackages')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: colors.success }]}>
                <Text style={homeStyles.actionIconText}>📋</Text>
              </View>
              <Text style={homeStyles.actionText}>My Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={homeStyles.actionCard}
              onPress={() => navigate('availableDrivers')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: colors.accent || '#FFA500' }]}>
                <Text style={homeStyles.actionIconText}>🚗</Text>
              </View>
              <Text style={homeStyles.actionText}>Find Drivers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={homeStyles.actionCard}
              onPress={() => navigate('wallet')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: '#FF6D00' }]}>
                <Text style={homeStyles.actionIconText}>💰</Text>
              </View>
              <Text style={homeStyles.actionText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

