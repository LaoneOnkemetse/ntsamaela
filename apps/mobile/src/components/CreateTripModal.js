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
  StyleSheet,
} from 'react-native';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { packageStyles } from '../styles/packageStyles';
import { useNavigation } from '../navigation/NavigationContext';
import { LocationSearchModal } from './LocationSearchModal';

export const CreateTripModal = ({ visible, onClose }) => {
  const { addTrip } = useNavigation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const handleCreate = () => {
    if (!from || !to || !date || !time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    addTrip({ from, to, date, time });

    Alert.alert(
      'Trip Created',
      `Your trip from ${from.name} to ${to.name} on ${date} at ${time} has been created!\n\nCustomers can now suggest packages for this route.`,
      [
        { text: 'OK', onPress: () => {
          setFrom(null);
          setTo(null);
          setDate('');
          setTime('');
          onClose();
        }}
      ]
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={sharedStyles.modalOverlay}>
            <View style={[sharedStyles.modalContent, { maxHeight: '85%' }]}>
              <Text style={sharedStyles.modalTitle}>Create Trip</Text>
              <Text style={sharedStyles.modalSubtitle}>
                Create a trip so customers can suggest packages
              </Text>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                <Text style={packageStyles.fieldLabel}>From *</Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowFromModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {from ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>{from.name}</Text>
                        <Text style={packageStyles.locationSelectedAddress}>{from.address}</Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>Select departure location...</Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>To *</Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowToModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {to ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>{to.name}</Text>
                        <Text style={packageStyles.locationSelectedAddress}>{to.address}</Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>Select destination...</Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Date *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., Oct 28, 2025"
                  placeholderTextColor={colors.textTertiary}
                  value={date}
                  onChangeText={setDate}
                />

                <Text style={packageStyles.fieldLabel}>Time *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor={colors.textTertiary}
                  value={time}
                  onChangeText={setTime}
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Maximum 3 packages per trip. Customers will suggest packages for your route and you can accept, counter, or reject.
                  </Text>
                </View>
              </ScrollView>

              <View style={sharedStyles.modalButtons}>
                <TouchableOpacity
                  style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]}
                  onPress={() => {
                    setFrom(null);
                    setTo(null);
                    setDate('');
                    setTime('');
                    onClose();
                  }}
                >
                  <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.modalButton, sharedStyles.modalButtonSubmit]}
                  onPress={handleCreate}
                >
                  <Text style={sharedStyles.modalButtonTextSubmit}>Create Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LocationSearchModal
        visible={showFromModal}
        title="Select Departure Location"
        onSelect={(location) => {
          setFrom(location);
          setShowFromModal(false);
        }}
        onCancel={() => setShowFromModal(false)}
      />

      <LocationSearchModal
        visible={showToModal}
        title="Select Destination"
        onSelect={(location) => {
          setTo(location);
          setShowToModal(false);
        }}
        onCancel={() => setShowToModal(false)}
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

