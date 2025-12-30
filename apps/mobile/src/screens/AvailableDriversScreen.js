import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { packageStyles } from '../styles/packageStyles';
import { useNavigation } from '../navigation/NavigationContext';
import { CreatePackageForDriverModal } from '../components/CreatePackageForDriverModal';

export const AvailableDriversScreen = () => {
  const { goBack, myPackages, upcomingTrips, activeDrivers } = useNavigation();
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const handleCreatePackageForDriver = (driver) => {
    setSelectedDriver(driver);
    setShowCreatePackageModal(true);
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Available Drivers</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={packageStyles.listContainer} showsVerticalScrollIndicator={false}>
          <Text style={packageStyles.sectionTitle}>🟢 Active Now</Text>
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
                        <Text style={styles.driverRating}>{driver.rating || 0} ⭐</Text>
                        <Text style={styles.driverTrips}> • {driver.totalDeliveries || 0} deliveries</Text>
                      </View>
                    </View>
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeText}>● Active</Text>
                    </View>
                  </View>
                  <Text style={styles.driverLocation}>📍 {driver.location || 'Current Location'}</Text>
                  <Text style={styles.driverVehicle}>🚗 {driver.vehicle || 'My Vehicle'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={packageStyles.sectionTitle}>🚗 Upcoming Trips</Text>
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
                <Text style={styles.driverRating}>{trip.rating || 0} ⭐</Text>
              </View>
              <View style={packageStyles.packageRoute}>
                <Text style={packageStyles.packageLocation}>📍 {trip.from}</Text>
                <Text style={packageStyles.packageArrow}>→</Text>
                <Text style={packageStyles.packageLocation}>📍 {trip.to}</Text>
              </View>
              <View style={styles.tripFooter}>
                <Text style={styles.tripDate}>🕒 {trip.date}</Text>
                <Text style={styles.tripSpaces}>{trip.spacesLeft || 3} spaces left</Text>
              </View>
              <View style={styles.tripPrice}>
                <Text style={styles.tripPriceText}>Starting from {trip.price || 'P 100'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

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
};

const styles = {
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
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
  driverVehicle: {
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
};

