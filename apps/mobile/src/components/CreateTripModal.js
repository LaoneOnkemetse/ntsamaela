import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { LocationSearchModal } from "./LocationSearchModal";
import DateTimePicker from "@react-native-community/datetimepicker";
import apiService from "../services/apiService";

export const CreateTripModal = ({ visible, onClose }) => {
  const { authToken, navigate } = useNavigation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [departureDateTime, setDepartureDateTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [capacity, setCapacity] = useState("MEDIUM");
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const formatDateTime = (dt) => {
    if (!dt) return "";
    try {
      return dt.toLocaleString();
    } catch {
      return "";
    }
  };

  const handleCreate = async () => {
    if (!from || !to || !departureDateTime) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!authToken) {
      Alert.alert("Error", "Please log in again to create a trip.");
      return;
    }

    try {
      apiService.setToken(authToken);

      const payload = {
        startAddress: from.address || from.name,
        startLat: from.lat,
        startLng: from.lng,
        endAddress: to.address || to.name,
        endLat: to.lat,
        endLng: to.lng,
        departureTime: departureDateTime.toISOString(),
        availableCapacity: capacity,
      };

      const resp = await apiService.createTrip(payload);
      if (resp?.success) {
        Alert.alert(
          "Trip Created",
          `Your trip from ${from.name} to ${to.name} on ${formatDateTime(departureDateTime)} has been created.`,
          [
            {
              text: "OK",
              onPress: () => {
                setFrom(null);
                setTo(null);
                setDepartureDateTime(null);
                setCapacity("MEDIUM");
                onClose();
                navigate("myTrips");
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", resp?.error?.message || "Failed to create trip");
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to create trip");
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={sharedStyles.modalOverlay}>
            <View style={[sharedStyles.modalContent, { maxHeight: "85%" }]}>
              <Text style={sharedStyles.modalTitle}>Create Trip</Text>
              <Text style={sharedStyles.modalSubtitle}>
                Create a trip so customers can suggest packages
              </Text>

              <ScrollView
                style={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={packageStyles.fieldLabel}>From *</Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowFromModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {from ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>
                          {from.name}
                        </Text>
                        <Text style={packageStyles.locationSelectedAddress}>
                          {from.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>
                        Select departure location...
                      </Text>
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
                        <Text style={packageStyles.locationSelectedName}>
                          {to.name}
                        </Text>
                        <Text style={packageStyles.locationSelectedAddress}>
                          {to.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>
                        Select destination...
                      </Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Date *</Text>
                <TouchableOpacity
                  style={sharedStyles.input}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: departureDateTime
                        ? colors.textPrimary
                        : colors.textTertiary,
                    }}
                  >
                    {departureDateTime
                      ? departureDateTime.toLocaleDateString()
                      : "Select date..."}
                  </Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Time *</Text>
                <TouchableOpacity
                  style={sharedStyles.input}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: departureDateTime
                        ? colors.textPrimary
                        : colors.textTertiary,
                    }}
                  >
                    {departureDateTime
                      ? departureDateTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Select time..."}
                  </Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>Capacity *</Text>
                <View style={styles.capacityRow}>
                  {["SMALL", "MEDIUM", "LARGE"].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.capacityChip,
                        capacity === c && styles.capacityChipActive,
                      ]}
                      onPress={() => setCapacity(c)}
                    >
                      <Text
                        style={[
                          styles.capacityChipText,
                          capacity === c && styles.capacityChipTextActive,
                        ]}
                      >
                        {c.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Pick a departure date/time using the calendar and clock.
                    Departure time must be in the future.
                  </Text>
                </View>
              </ScrollView>

              <View style={sharedStyles.modalButtons}>
                <TouchableOpacity
                  style={[
                    sharedStyles.modalButton,
                    sharedStyles.modalCancelButton,
                  ]}
                  onPress={() => {
                    setFrom(null);
                    setTo(null);
                    setDepartureDateTime(null);
                    setCapacity("MEDIUM");
                    onClose();
                  }}
                >
                  <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    sharedStyles.modalButton,
                    sharedStyles.modalButtonSubmit,
                  ]}
                  onPress={handleCreate}
                >
                  <Text style={sharedStyles.modalButtonTextSubmit}>
                    Create Trip
                  </Text>
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

      {showDatePicker && (
        <DateTimePicker
          value={departureDateTime || new Date(Date.now() + 60 * 60 * 1000)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, selected) => {
            setShowDatePicker(false);
            if (!selected) return;
            const current = departureDateTime || new Date();
            const next = new Date(current);
            next.setFullYear(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate(),
            );
            setDepartureDateTime(next);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={departureDateTime || new Date(Date.now() + 60 * 60 * 1000)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, selected) => {
            setShowTimePicker(false);
            if (!selected) return;
            const current = departureDateTime || new Date();
            const next = new Date(current);
            next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            setDepartureDateTime(next);
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  capacityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  capacityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  capacityChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "15",
  },
  capacityChipText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  capacityChipTextActive: {
    color: colors.primary,
  },
});
