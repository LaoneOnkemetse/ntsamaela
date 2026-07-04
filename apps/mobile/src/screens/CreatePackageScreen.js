import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { LocationSearchModal } from "../components/LocationSearchModal";
import {
  takePhoto,
  selectFromGallery,
  showPhotoActionSheet,
} from "../utils/imageUtils";
import apiService from "../services/apiService";

export const CreatePackageScreen = () => {
  const { goBack, authToken, refreshMyPackages } = useNavigation();
  const [description, setDescription] = useState("");
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [packagePhoto, setPackagePhoto] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Calculate route distance and duration using Distance Matrix API
  const calculateRoute = async (pickupLoc, deliveryLoc) => {
    if (!pickupLoc || !deliveryLoc) {
      setRouteInfo(null);
      return;
    }

    try {
      setIsCalculatingRoute(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setRouteInfo(null);
        return;
      }

      const origin = `${pickupLoc.lat},${pickupLoc.lng}`;
      const destination = `${deliveryLoc.lat},${deliveryLoc.lng}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}&units=metric`,
      );
      const data = await response.json();

      if (data.status === "OK" && data.rows[0]?.elements[0]?.status === "OK") {
        const element = data.rows[0].elements[0];
        setRouteInfo({
          distance: element.distance.text,
          distanceValue: element.distance.value,
          duration: element.duration.text,
          durationValue: element.duration.value,
        });
      } else {
        setRouteInfo(null);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setRouteInfo(null);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Update route when pickup or delivery changes
  useEffect(() => {
    if (pickup && delivery) {
      calculateRoute(pickup, delivery);
    } else {
      setRouteInfo(null);
    }
  }, [pickup, delivery]);

  const handlePhotoSelection = async () => {
    await showPhotoActionSheet(
      async () => {
        const image = await takePhoto();
        if (image) setPackagePhoto(image.uri);
      },
      async () => {
        const image = await selectFromGallery();
        if (image) setPackagePhoto(image.uri);
      },
    );
  };

  const handleCreate = async () => {
    const missing = [];
    if (!description) missing.push("Description");
    if (!pickup) missing.push("Pickup location");
    if (!delivery) missing.push("Delivery location");
    if (!recipientPhone) missing.push("Recipient phone number");
    if (!price) missing.push("Offering price");
    if (!deliveryDate) missing.push("Delivery date");
    if (missing.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please fill in the following:\n\n• ${missing.join("\n• ")}`,
      );
      return;
    }

    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert(
        "Invalid Phone",
        "Recipient phone must be a valid Botswana number (8 digits starting with 2, 6, or 7).\n\nExample: 71234567",
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

    const parsedDate = new Date(deliveryDate);
    if (isNaN(parsedDate.getTime())) {
      Alert.alert(
        "Invalid Date",
        "Please enter a valid date in format YYYY-MM-DD.\n\nExample: 2026-07-10",
      );
      return;
    }
    if (parsedDate <= new Date()) {
      Alert.alert("Invalid Date", "Delivery date must be in the future.");
      return;
    }

    try {
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
        urgency: urgency.toUpperCase(),
        recipientPhone,
      });

      if (response.success) {
        if (refreshMyPackages) refreshMyPackages(authToken);
        Alert.alert(
          "Success",
          "Package created successfully!\n\nDrivers can now bid on your package.",
          [{ text: "OK", onPress: () => goBack() }],
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
      console.error("Create package error:", error);
      const msg = error?.message || "Unknown error";
      Alert.alert(
        "Package Creation Failed",
        msg.includes("network") || msg.includes("timeout")
          ? "Please check your internet connection and try again."
          : msg,
      );
    }
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={sharedStyles.headerBar}>
            <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
              <Text style={sharedStyles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={sharedStyles.headerTitle}>Create Package</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={sharedStyles.formContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Package Details Section */}
            <View style={packageStyles.formSection}>
              <Text style={packageStyles.sectionHeader}>
                📦 Package Details
              </Text>

              <Text style={packageStyles.fieldLabel}>Description *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="e.g., Electronics, Documents, Clothing"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={packageStyles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="e.g., 2.5 (optional)"
                placeholderTextColor={colors.textTertiary}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />

              <Text style={packageStyles.fieldLabel}>
                Your Offering Price (P) *
              </Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="e.g., 150"
                placeholderTextColor={colors.textTertiary}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />

              <Text style={packageStyles.fieldLabel}>
                Desired Delivery Date *
              </Text>
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

              <Text style={packageStyles.fieldLabel}>Urgency Level *</Text>
              <View style={packageStyles.urgencyContainer}>
                {["normal", "urgent", "same-day"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      packageStyles.urgencyButton,
                      urgency === level && packageStyles.urgencyButtonActive,
                    ]}
                    onPress={() => setUrgency(level)}
                  >
                    <Text
                      style={[
                        packageStyles.urgencyButtonText,
                        urgency === level &&
                          packageStyles.urgencyButtonTextActive,
                      ]}
                    >
                      {level === "normal"
                        ? "Normal"
                        : level === "urgent"
                          ? "Urgent"
                          : "Same Day"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Route Section */}
            <View style={packageStyles.formSection}>
              <Text style={packageStyles.sectionHeader}>🗺️ Delivery Route</Text>

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
                      Search on map...
                    </Text>
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
                      <Text style={packageStyles.locationSelectedName}>
                        {delivery.name}
                      </Text>
                      <Text style={packageStyles.locationSelectedAddress}>
                        {delivery.address}
                      </Text>
                    </>
                  ) : (
                    <Text style={packageStyles.locationPlaceholder}>
                      Search on map...
                    </Text>
                  )}
                </View>
                <Text style={packageStyles.locationArrow}>›</Text>
              </TouchableOpacity>

              {pickup && delivery && (
                <View style={packageStyles.routeInfo}>
                  {isCalculatingRoute ? (
                    <Text style={packageStyles.routeInfoText}>
                      Calculating route...
                    </Text>
                  ) : routeInfo ? (
                    <>
                      <View style={packageStyles.routeInfoRow}>
                        <Text style={packageStyles.routeInfoIcon}>📏</Text>
                        <Text style={packageStyles.routeInfoText}>
                          Distance:{" "}
                          <Text style={packageStyles.routeInfoValue}>
                            {routeInfo.distance}
                          </Text>
                        </Text>
                      </View>
                      <View style={packageStyles.routeInfoRow}>
                        <Text style={packageStyles.routeInfoIcon}>⏱️</Text>
                        <Text style={packageStyles.routeInfoText}>
                          Estimated Time:{" "}
                          <Text style={packageStyles.routeInfoValue}>
                            {routeInfo.duration}
                          </Text>
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={packageStyles.routeInfoText}>
                      ✓ Route will be calculated when driver accepts
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Recipient Section */}
            <View style={packageStyles.formSection}>
              <Text style={packageStyles.sectionHeader}>
                👤 Recipient Information
              </Text>

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
              <Text style={packageStyles.fieldHint}>
                Delivery confirmation code will be sent to this number
              </Text>
            </View>

            {/* Photo Section */}
            <View style={packageStyles.formSection}>
              <Text style={packageStyles.sectionHeader}>📷 Package Photo</Text>

              {packagePhoto ? (
                <View style={packageStyles.photoPreview}>
                  <Image
                    source={{ uri: packagePhoto }}
                    style={packageStyles.photoImage}
                  />
                  <TouchableOpacity
                    style={packageStyles.changePhotoButton}
                    onPress={handlePhotoSelection}
                  >
                    <Text style={packageStyles.changePhotoText}>
                      Change Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={packageStyles.addPhotoButton}
                  onPress={handlePhotoSelection}
                >
                  <Text style={packageStyles.addPhotoIcon}>📷</Text>
                  <Text style={packageStyles.addPhotoText}>
                    Add Package Photo (Optional)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={sharedStyles.primaryButton}
              onPress={handleCreate}
            >
              <Text style={sharedStyles.primaryButtonText}>Create Package</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
    </View>
  );
};
