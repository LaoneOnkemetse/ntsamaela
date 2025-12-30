import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { packageStyles } from '../styles/packageStyles';
import { useNavigation } from '../navigation/NavigationContext';
import { InputModal } from '../components/InputModal';
import apiService from '../services/apiService';

export const MyTripsScreen = () => {
  const { goBack, userProfile, authToken } = useNavigation();
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

  const handleCounterBid = async (pkg) => {
    if (!userProfile.isVerified) {
      Alert.alert('Verification Required', 'Please wait for account verification to place bids');
      return;
    }
    
    try {
      const response = await apiService.getPackageBids(pkg.id);
      if (response.success) {
        setSelectedPackage(pkg);
        setShowCounterBidModal(true);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to load bids');
      }
    } catch (error) {
      console.error('Get bids error:', error);
      Alert.alert('Error', 'Failed to load bids. Please try again.');
    }
  };

  const handleCounterBidSubmit = async (amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const response = await apiService.submitCounterBid(selectedPackage.id, parseFloat(amount));
      if (response.success) {
        const counterAmount = parseFloat(amount);
        const yourEarnings = (counterAmount * 0.7).toFixed(2);
        const platformFee = (counterAmount * 0.3).toFixed(2);
        
        setShowCounterBidModal(false);
        Alert.alert(
          'Counter Offer Sent',
          `Your counter offer of P ${counterAmount} has been sent to ${selectedPackage.customer}.\n\n• You'll receive: P ${yourEarnings}\n• Platform fee (30%): P ${platformFee}\n\nWaiting for customer to accept or reject your offer.`,
          [{ text: 'OK', onPress: () => setSelectedPackage(null) }]
        );
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to submit counter bid');
      }
    } catch (error) {
      console.error('Counter bid error:', error);
      Alert.alert('Error', 'Failed to submit counter bid. Please try again.');
    }
  };

  const handleRejectSuggestion = (pkg) => {
    Alert.alert('Reject Package', `${pkg.customer}'s package suggestion rejected.`);
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>My Trips</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={packageStyles.listContainer} showsVerticalScrollIndicator={false}>
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

                <View style={packageStyles.packageRoute}>
                  <Text style={packageStyles.packageLocation}>📍 {trip.from}</Text>
                  <Text style={packageStyles.packageArrow}>→</Text>
                  <Text style={packageStyles.packageLocation}>📍 {trip.to}</Text>
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
                          <Text style={styles.tripPackageItemText}>{pkg.item}</Text>
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
                            <Text style={styles.tripPackageItemText}>{pkg.item}</Text>
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
};

const styles = {
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  spacesIndicator: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  spacesText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  tripDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
    alignItems: 'center',
    backgroundColor: colors.cardBgLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tripCustomerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tripPackageCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tripPackageItemText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripPackageFee: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestionCard: {
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionFee: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestionFeeBreakdown: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  suggestionFeeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionRejectBtn: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionRejectText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionCounterBtn: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionCounterText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionAcceptBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionAcceptText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
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
};

