import React, { useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { LocationSearchModal } from "./LocationSearchModal";
import { useNavigation } from "../navigation/NavigationContext";
import apiService from "../services/apiService";

export const CreatePackageForDriverModal = ({ visible, driver, onClose }) => {
  const { authToken, refreshMyPackages } = useNavigation();
  const [description, setDescription] = useState("");
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const driverName = driver?.driver || driver?.name || "this driver";

  const handleSubmit = async () => {
    const missing = [];
    if (!description) missing.push("Description");
    if (!pickup) missing.push("Pickup location");
    if (!delivery) missing.push("Delivery location");
    if (!recipientPhone) missing.push("Recipient phone");
    if (!price) missing.push("Price");
    if (!deliveryDate) missing.push("Delivery date");
    if (missing.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please fill in:\n\n• ${missing.join("\n• ")}`,
      );
      return;
    }

    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert(
        "Invalid Phone",
        "Please enter a valid Botswana phone number (8 digits starting with 2, 6, or 7).",
      );
      return;
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert(
        "Invalid Price",
        "Please enter a valid price greater than 0.",
      );
      return;
    }

    setSubmitting(true);
    try {
      apiService.setToken(authToken);
      const response = await apiService.createPackage({
        description,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        deliveryAddress: delivery.address,
        deliveryLat: delivery.lat,
        deliveryLng: delivery.lng,
        priceOffered: parseFloat(price),
        weight: weight ? parseFloat(weight) : null,
        deliveryDate: new Date(deliveryDate).toISOString(),
        urgency: "NORMAL",
        recipientPhone,
      });

      if (response.success) {
        if (refreshMyPackages) refreshMyPackages(authToken);
        Alert.alert(
          "Package Created",
          `Package request sent to ${driverName}!\n\nFrom: ${pickup.name}\nTo: ${delivery.name}\nOffering: P ${price}\n\nThe driver can now bid on your package.`,
          [
            {
              text: "OK",
              onPress: () => {
                setDescription("");
                setPickup(null);
                setDelivery(null);
                setRecipientPhone("");
                setWeight("");
                setPrice("");
                setDeliveryDate("");
                onClose();
              },
            },
          ],
        );
      } else {
        const errMsg = response.error?.message || "Failed to create package";
        const details = response.error?.details;
        const fullMsg = details
          ? `${errMsg}\n\n${Array.isArray(details) ? details.map((d) => `• ${d}`).join("\n") : details}`
          : errMsg;
        Alert.alert("Package Creation Failed", fullMsg);
      }
    } catch (error) {
      const msg = error?.message || "Unknown error";
      Alert.alert("Package Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDescription("");
    setPickup(null);
    setDelivery(null);
    setRecipientPhone("");
    setWeight("");
    setPrice("");
    setDeliveryDate("");
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={sharedStyles.modalOverlay}>
            <View style={[sharedStyles.modalContent, { maxHeight: "90%" }]}>
              <Text style={sharedStyles.modalTitle}>
                Create Package for {driverName}
              </Text>
              <Text style={sharedStyles.modalSubtitle}>
                Send a delivery request directly to this driver
              </Text>

              <ScrollView
                style={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
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
                        <Text style={packageStyles.locationSelectedName}>
                          {pickup.name}
                        </Text>
                        <Text style={packageStyles.locationSelectedAddress}>
                          {pickup.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>
                        Select pickup location...
                      </Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>
                  Delivery Location *
                </Text>
                <TouchableOpacity
                  style={packageStyles.locationButton}
                  onPress={() => setShowDeliveryModal(true)}
                >
                  <Text style={packageStyles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {delivery ? (
                      <>
                        <Text style={packageStyles.locationSelectedName}>
                          {delivery.name}
                        </Text>
                        <Text style={packageStyles.locationSelectedAddress}>
                          {delivery.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={packageStyles.locationPlaceholder}>
                        Select delivery location...
                      </Text>
                    )}
                  </View>
                  <Text style={packageStyles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={packageStyles.fieldLabel}>
                  Recipient Phone Number *
                </Text>
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

                <Text style={packageStyles.fieldLabel}>
                  Offering Price (P) *
                </Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="e.g., 150"
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                <Text style={packageStyles.fieldLabel}>Delivery Date *</Text>
                <TouchableOpacity
                  style={sharedStyles.input}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: deliveryDate
                        ? colors.textPrimary
                        : colors.textTertiary,
                    }}
                  >
                    {deliveryDate || "Tap to select date..."}
                  </Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Platform charges 30% fee. Driver will receive 70% of your
                    offered price. They can accept, counter, or reject your
                    offer.
                  </Text>
                </View>
              </ScrollView>

              <View style={sharedStyles.modalButtons}>
                <TouchableOpacity
                  style={[
                    sharedStyles.modalButton,
                    sharedStyles.modalCancelButton,
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    sharedStyles.modalButton,
                    sharedStyles.modalButtonSubmit,
                    submitting && { opacity: 0.5 },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={sharedStyles.modalButtonTextSubmit}>
                    {submitting ? "Sending..." : "Send Request"}
                  </Text>
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

      {showDatePicker && (
        <DateTimePicker
          value={
            deliveryDate
              ? new Date(deliveryDate)
              : new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
          onChange={(_event, selected) => {
            setShowDatePicker(false);
            if (selected) {
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, "0");
              const d = String(selected.getDate()).padStart(2, "0");
              setDeliveryDate(`${y}-${m}-${d}`);
            }
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
});
