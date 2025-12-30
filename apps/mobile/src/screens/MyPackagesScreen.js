import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { packageStyles } from '../styles/packageStyles';
import { useNavigation } from '../navigation/NavigationContext';
import { getStatusColor } from '../utils/packageUtils';

export const MyPackagesScreen = () => {
  const { goBack, myPackages } = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);

  const pendingPackages = [
    { 
      id: 'PKG-004', 
      description: 'Laptop and accessories', 
      pickup: 'Gaborone', 
      delivery: 'Francistown',
      price: 250,
      status: 'pending',
      bids: [
        { id: 1, driver: 'Thabo Mokoena', photo: 'https://i.pravatar.cc/150?img=12', rating: 4.8, amount: 220, trips: 234 },
        { id: 2, driver: 'Neo Sedimo', photo: 'https://i.pravatar.cc/150?img=47', rating: 4.9, amount: 200, trips: 189 },
        { id: 3, driver: 'Mpho Kgosi', photo: 'https://i.pravatar.cc/150?img=33', rating: 4.7, amount: 240, trips: 156 },
      ]
    },
  ];

  const inTransitPackages = myPackages.filter(p => p.status === 'in-transit').map(p => ({
    ...p,
    currentLocation: 'Palapye',
    eta: '45 minutes',
    progress: 65
  }));

  const deliveredPackages = myPackages.filter(p => p.status === 'delivered');

  const handleViewBids = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidsModal(true);
  };

  const handleAcceptBid = (bid) => {
    Alert.alert(
      'Accept Bid',
      `Accept ${bid.driver}'s bid of P ${bid.amount}?\n\n• Platform fee (30%): P ${(bid.amount * 0.3).toFixed(2)}\n• You pay: P ${bid.amount}\n• Driver receives: P ${(bid.amount * 0.7).toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            setShowBidsModal(false);
            Alert.alert('Success', `Bid accepted! Driver ${bid.driver} will be notified.`);
          }
        }
      ]
    );
  };

  const handleRejectBid = (bid) => {
    Alert.alert('Bid Rejected', `${bid.driver}'s bid has been rejected.`);
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>My Packages</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={packageStyles.listContainer} showsVerticalScrollIndicator={false}>
          {/* Pending Packages */}
          {pendingPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>⏳ Pending ({pendingPackages.length})</Text>
              {pendingPackages.map(pkg => (
                <TouchableOpacity
                  key={pkg.id}
                  style={packageStyles.packageCard}
                  onPress={() => handleViewBids(pkg)}
                >
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <View style={[packageStyles.statusBadge, { backgroundColor: '#FFA500' }]}>
                      <Text style={packageStyles.statusText}>{pkg.bids.length} bids</Text>
                    </View>
                  </View>
                  <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
                  <View style={packageStyles.packageRoute}>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={packageStyles.packageFooter}>
                    <Text style={packageStyles.packageDriver}>Your offer: P {pkg.price}</Text>
                    <Text style={packageStyles.viewBidsText}>Tap to view bids →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* In Transit Packages */}
          {inTransitPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>🚚 In Transit ({inTransitPackages.length})</Text>
              {inTransitPackages.map(pkg => (
                <View key={pkg.id} style={packageStyles.packageCard}>
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <View style={[packageStyles.statusBadge, getStatusColor('in-transit')]}>
                      <Text style={packageStyles.statusText}>In Transit</Text>
                    </View>
                  </View>
                  <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
                  <View style={packageStyles.packageRoute}>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={packageStyles.trackingBox}>
                    <Text style={packageStyles.trackingText}>📍 Current: {pkg.currentLocation}</Text>
                    <Text style={packageStyles.trackingText}>🕒 ETA: {pkg.eta}</Text>
                    <View style={packageStyles.progressBar}>
                      <View style={[packageStyles.progressFill, { width: `${pkg.progress}%` }]} />
                    </View>
                    <Text style={packageStyles.progressText}>{pkg.progress}% complete</Text>
                  </View>
                  <View style={packageStyles.packageFooter}>
                    {pkg.driverPhoto && (
                      <Image 
                        source={{ uri: pkg.driverPhoto }} 
                        style={packageStyles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={packageStyles.packageDriver}>Driver: {pkg.driver}</Text>
                    </View>
                    <Text style={packageStyles.packagePrice}>P {pkg.price}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Delivered Packages */}
          {deliveredPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>✅ Delivered ({deliveredPackages.length})</Text>
              {deliveredPackages.map(pkg => (
                <View key={pkg.id} style={packageStyles.packageCard}>
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <View style={[packageStyles.statusBadge, getStatusColor('delivered')]}>
                      <Text style={packageStyles.statusText}>Delivered</Text>
                    </View>
                  </View>
                  <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
                  <View style={packageStyles.packageRoute}>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.pickup}</Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>📍 {pkg.delivery}</Text>
                  </View>
                  <View style={packageStyles.packageFooter}>
                    {pkg.driverPhoto && (
                      <Image 
                        source={{ uri: pkg.driverPhoto }} 
                        style={packageStyles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={packageStyles.packageDriver}>Driver: {pkg.driver}</Text>
                    </View>
                    <Text style={packageStyles.packagePrice}>P {pkg.price}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bids Modal */}
      <Modal visible={showBidsModal} transparent animationType="slide" onRequestClose={() => setShowBidsModal(false)}>
        <View style={sharedStyles.modalOverlay}>
          <View style={[sharedStyles.modalContent, { maxHeight: '80%' }]}>
            <View style={packageStyles.modalTitleRow}>
              <Text style={sharedStyles.modalTitle}>
                Bids for {selectedPackage?.id}
              </Text>
              <TouchableOpacity
                style={packageStyles.modalCloseButton}
                onPress={() => setShowBidsModal(false)}
              >
                <Text style={packageStyles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={sharedStyles.modalSubtitle}>
              Your offer: P {selectedPackage?.price}
            </Text>

            <ScrollView style={{ maxHeight: 400, marginBottom: 16 }}>
              {selectedPackage?.bids.map(bid => (
                <View key={bid.id} style={packageStyles.bidCard}>
                  <View style={packageStyles.bidHeader}>
                    {bid.photo && (
                      <Image 
                        source={{ uri: bid.photo }} 
                        style={packageStyles.bidDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={packageStyles.bidDriverName}>{bid.driver}</Text>
                      <Text style={packageStyles.bidDriverMeta}>
                        {bid.rating} ⭐ • {bid.trips} trips
                      </Text>
                    </View>
                    <Text style={packageStyles.bidAmount}>P {bid.amount}</Text>
                  </View>
                  <View style={packageStyles.bidFeeInfo}>
                    <Text style={packageStyles.bidFeeText}>Platform fee (30%): P {(bid.amount * 0.3).toFixed(2)}</Text>
                    <Text style={packageStyles.bidFeeText}>Driver receives: P {(bid.amount * 0.7).toFixed(2)}</Text>
                  </View>
                  <View style={packageStyles.bidActions}>
                    <TouchableOpacity
                      style={[packageStyles.bidButton, packageStyles.bidRejectButton]}
                      onPress={() => handleRejectBid(bid)}
                    >
                      <Text style={packageStyles.bidRejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[packageStyles.bidButton, packageStyles.bidAcceptButton]}
                      onPress={() => handleAcceptBid(bid)}
                    >
                      <Text style={packageStyles.bidAcceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]}
              onPress={() => setShowBidsModal(false)}
            >
              <Text style={sharedStyles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

