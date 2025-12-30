import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { packageStyles } from '../styles/packageStyles';
import { LocationSearchModal } from './LocationSearchModal';

export const CreatePackageForDriverModal = ({ visible, driver, onClose }) => {
  const [description, setDescription] = useState('');
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const driverName = driver?.driver || driver?.name || 'this driver';

  const handleSubmit = () => {
    if (!description || !pickup || !delivery || !recipientPhone || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert('Error', 'Please enter a valid Botswana phone number (e.g., 71234567)');
      return;
    }

    const platformFee = (parseFloat(price) * 0.3).toFixed(2);
    const driverEarnings = (parseFloat(price) * 0.7).toFixed(2);

    Alert.alert(
      'Request Sent',
      `Package delivery request sent to ${driverName}!\n\nPackage: ${description}\nFrom: ${pickup.name}\nTo: ${delivery.name}\nOffering: P ${price}\n\n${driverName} will receive P ${driverEarnings} (after P ${platformFee} platform fee).\n\nThey can accept, reject, or counter your offer.`,
      [
        { text: 'OK', onPress: () => {
          setDescription('');
          setPickup(null);
          setDelivery(null);
          setRecipientPhone('');
          setWeight('');
          setPrice('');
          onClose();
        }}
      ]
    );
  };

  const handleCancel = () => {
    setDescription('');
    setPickup(null);
    setDelivery(null);
    setRecipientPhone('');
    setWeight('');
    setPrice('');
    onClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={sharedStyles.modalOverlay}>
            <View style={[sharedStyles.modalContent, { maxHeight: '90%' }]}>
              <Text style={sharedStyles.modalTitle}>Create Package for {driverName}</Text>
              <Text style={sharedStyles.modalSubtitle}>
                Send a delivery request directly to this driver
              </Text>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                <Text style={packageStyles.fieldLabel}>Description *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., Electronics, Documents, Clothing"
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={packageStyles.fieldLabel}>Pickup Location *</Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowPickupModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {pickup ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>{pickup.name}</Text>
                        <Text style={packageStyles.locationSelectedAddress}>{pickup.address}</Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>Select pickup location...</Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Delivery Location *</Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowDeliveryModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {delivery ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>{delivery.name}</Text>
                        <Text style={packageStyles.locationSelectedAddress}>{delivery.address}</Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>Select delivery location...</Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Recipient Phone Number *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., 71234567"
                  placeholderTextColor={colors.textTertiary}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  maxLength={8}
                />

                <Text style={packageStyles.fieldLabel}>Weight (optional)</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., 2 kg"
                  placeholderTextColor={colors.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                />

                <Text style={packageStyles.fieldLabel}>Offering Price (P) *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., 150"
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Platform charges 30% fee. Driver will receive 70% of your offered price. They can accept, counter, or reject your offer.
                  </Text>
                </View>
              </ScrollView>

              <View style={sharedStyles.modalButtons}>
                <TouchableOpacity
                  style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.modalButton, sharedStyles.modalButtonSubmit]}
                  onPress={handleSubmit}
                >
                  <Text style={sharedStyles.modalButtonTextSubmit}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LocationSearchModal
        visible={showPickupModal}
        title="Select Pickup Location"
        onSelect={(location) => {
          setPickup(location);
          setShowPickupModal(false);
        }}
        onCancel={() => setShowPickupModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />

      <LocationSearchModal
        visible={showDeliveryModal}
        title="Select Delivery Location"
        onSelect={(location) => {
          setDelivery(location);
          setShowDeliveryModal(false);
        }}
        onCancel={() => setShowDeliveryModal(false)}
        showRoute={pickup && delivery}
        routeStart={pickup}
        routeEnd={delivery}
      />
    </>
  );
};

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

