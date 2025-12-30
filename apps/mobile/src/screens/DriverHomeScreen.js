import React, { useState } from 'react';
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
import { CreateTripModal } from '../components/CreateTripModal';

export const DriverHomeScreen = () => {
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

        {/* Driver Stats */}
        <View style={homeStyles.statsRow}>
          <View style={[homeStyles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={homeStyles.statValue}>{userProfile.totalDeliveries || 0}</Text>
            <Text style={homeStyles.statLabel}>Deliveries</Text>
          </View>
          <View style={[homeStyles.statCard, { backgroundColor: colors.success }]}>
            <Text style={homeStyles.statValue}>P {driverWallet}</Text>
            <Text style={homeStyles.statLabel}>Balance</Text>
          </View>
          <View style={[homeStyles.statCard, { backgroundColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={homeStyles.statValue}>{userProfile.rating || 0}</Text>
              <Text style={[homeStyles.statValue, { marginLeft: 6 }]}>⭐</Text>
            </View>
            <Text style={homeStyles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Active Status Toggle */}
        <View style={homeStyles.activeStatusContainer}>
          <View style={homeStyles.activeStatusLeft}>
            <Text style={homeStyles.activeStatusTitle}>Active Status</Text>
            <Text style={homeStyles.activeStatusSubtitle}>
              {isActiveDriver ? 'Visible to customers' : 'Hidden from customers'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[homeStyles.activeToggle, isActiveDriver && homeStyles.activeToggleOn]}
            onPress={handleToggleActiveStatus}
            activeOpacity={0.8}
          >
            <View style={[homeStyles.activeToggleCircle, isActiveDriver && homeStyles.activeToggleCircleOn]} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={homeStyles.section}>
          <View style={homeStyles.actionsGrid}>
            <TouchableOpacity 
              style={[homeStyles.actionCard, !userProfile.isVerified && homeStyles.actionCardDisabled]}
              onPress={() => userProfile.isVerified ? setShowCreateTripModal(true) : Alert.alert('Verification Required', 'Please wait for account verification to create trips')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: userProfile.isVerified ? '#00C853' : colors.border }]}>
                <Text style={homeStyles.actionIconText}>➕</Text>
              </View>
              <Text style={[homeStyles.actionText, !userProfile.isVerified && homeStyles.actionTextDisabled]}>Create Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[homeStyles.actionCard, !userProfile.isVerified && homeStyles.actionCardDisabled]}
              onPress={() => userProfile.isVerified ? navigate('availablePackages') : Alert.alert('Verification Required', 'Please wait for account verification to browse packages')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: userProfile.isVerified ? colors.primary : colors.border }]}>
                <Text style={homeStyles.actionIconText}>📦</Text>
              </View>
              <Text style={[homeStyles.actionText, !userProfile.isVerified && homeStyles.actionTextDisabled]}>Browse Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={homeStyles.actionCard}
              onPress={() => navigate('myTrips')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: colors.success }]}>
                <Text style={homeStyles.actionIconText}>🚗</Text>
              </View>
              <Text style={homeStyles.actionText}>My Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={homeStyles.actionCard}
              onPress={() => navigate('wallet')}
            >
              <View style={[homeStyles.actionIcon, { backgroundColor: '#FF6D00' }]}>
                <Text style={homeStyles.actionIconText}>💰</Text>
              </View>
              <Text style={homeStyles.actionText}>Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CreateTripModal 
        visible={showCreateTripModal}
        onClose={() => setShowCreateTripModal(false)}
      />
    </View>
  );
};

