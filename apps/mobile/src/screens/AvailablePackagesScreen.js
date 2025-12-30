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

export const AvailablePackagesScreen = () => {
  const { goBack, availablePackages } = useNavigation();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const handleAccept = (pkg) => {
    const yourEarnings = (pkg.price * 0.7).toFixed(2);
    const platformFee = (pkg.price * 0.3).toFixed(2);
    
    Alert.alert(
      'Accept Package',
      `Accept ${pkg.id} for P ${pkg.price}?\n\nYou get: P ${yourEarnings}\nPlatform fee: P ${platformFee} (30%)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => Alert.alert('Success', `Package ${pkg.id} accepted! Customer will be notified.`)
        }
      ]
    );
  };

  const handleCounterBid = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidModal(true);
  };

  const handleBidSubmit = (amount) => {
    setShowBidModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const yourEarnings = (parseFloat(amount) * 0.7).toFixed(2);
      Alert.alert('Success', `Counter bid of P ${amount} placed!\n\nIf accepted, you'll receive P ${yourEarnings} (after 30% platform fee)`);
    } else {
      Alert.alert('Error', 'Please enter a valid bid amount');
    }
    setSelectedPackage(null);
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Available Packages</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={packageStyles.listContainer} showsVerticalScrollIndicator={false}>
          {availablePackages.map(pkg => (
            <View key={pkg.id} style={packageStyles.packageCardWithPhoto}>
              {pkg.photo && (
                <Image 
                  source={{ uri: pkg.photo }} 
                  style={packageStyles.packagePhoto}
                  resizeMode="cover"
                />
              )}
              <View style={packageStyles.packageContent}>
                <View style={packageStyles.packageHeader}>
                  <Text style={packageStyles.packageId}>{pkg.id}</Text>
                  <Text style={packageStyles.packagePrice}>P {pkg.price}</Text>
                </View>
                <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
                <Text style={packageStyles.packageCustomer}>Customer: {pkg.customer}</Text>
                <View style={packageStyles.packageRoute}>
                  <Text style={packageStyles.packageLocation}>📍 {pkg.pickup}</Text>
                  <Text style={packageStyles.packageArrow}>→</Text>
                  <Text style={packageStyles.packageLocation}>📍 {pkg.delivery}</Text>
                </View>
                <Text style={packageStyles.packageInfo}>{pkg.weight} • {pkg.distance}</Text>
                
                <View style={packageStyles.packageActions}>
                  <TouchableOpacity 
                    style={[packageStyles.packageActionButton, packageStyles.acceptButton]}
                    onPress={() => handleAccept(pkg)}
                  >
                    <Text style={packageStyles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[packageStyles.packageActionButton, packageStyles.counterButton]}
                    onPress={() => handleCounterBid(pkg)}
                  >
                    <Text style={packageStyles.counterButtonText}>Counter Bid</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <InputModal
        visible={showBidModal}
        title={selectedPackage ? `Counter Bid for ${selectedPackage.id}` : 'Counter Bid'}
        placeholder="Enter your bid amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleBidSubmit}
        onCancel={() => {
          setShowBidModal(false);
          setSelectedPackage(null);
        }}
      />
    </View>
  );
};

