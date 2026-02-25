import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

// Import all screens and services
import {
  LoadingScreen,
  LoginScreen,
  RegisterCustomerScreen,
  RegisterDriverScreen,
  ForgotPasswordScreen,
  VerificationScreen,
  WalletScreen as NewWalletScreen,
  ChatScreen,
  TrackingScreen,
  CreatePackageScreen,
  MyPackagesScreen,
  AvailablePackagesScreen,
  MyTripsScreen,
  CustomerHomeScreen,
  DriverHomeScreen,
  ProfileScreen,
  SettingsScreen,
  NotificationScreen,
  AvailableDriversScreen,
} from "./src/screens";
import { API_CONFIG as _API_CONFIG } from "./src/constants/config";
import _apiService from "./src/services/apiService";
import _socketService from "./src/services/socketService";
import {
  NavigationProvider,
  useNavigation,
} from "./src/navigation/NavigationContext";

const { width } = Dimensions.get("window");

// Botswana Flag Colors Only - Light Professional Palette
const colors = {
  // Botswana Flag Colors
  botswanaBlue: "#75AADB", // Light Blue from flag
  botswanaBlack: "#000000", // Black from flag
  botswanaWhite: "#FFFFFF", // White from flag

  // Primary colors using Botswana flag
  primary: "#75AADB", // Botswana Blue
  primaryDark: "#5A8FBF", // Darker Blue
  primaryLight: "#A3C9E8", // Lighter Blue
  secondary: "#000000", // Botswana Black
  secondaryLight: "#333333", // Light Gray (lighter than before)

  // System colors using flag colors
  success: "#10B981", // Green for success
  error: "#000000", // Black for error (with white text)
  warning: "#75AADB", // Blue for warning

  // Background colors (use darker button blue as main background)
  background: "#5A8FBF", // Darker blue
  backgroundSecondary: "#75AADB", // Main light blue
  cardBg: "#E6F3FF", // Light blue card background
  cardBgLight: "#F0F8FF", // Very light blue card background

  // Text colors
  textPrimary: "#000000", // Black text
  textSecondary: "#333333", // Dark gray text
  textTertiary: "#666666", // Medium gray text
  textLight: "#FFFFFF", // White text
  textDark: "#000000", // Black text

  // Border colors
  border: "#E0E0E0", // Light gray border
  borderLight: "#F0F0F0", // Very light border
  borderDark: "#000000", // Black border

  // Shadow and effects
  shadow: "rgba(0, 0, 0, 0.1)",
  shadowBlue: "rgba(117, 170, 219, 0.2)",
  glass: "rgba(255, 255, 255, 0.8)",
  glassDark: "rgba(0, 0, 0, 0.1)",
  gradient: ["#75AADB", "#A3C9E8"], // Light blue gradient
};

// Helper button used by registration screens (screens use their own; kept for reference)
const _RegistrationPhotoButton = ({ label, onPress, preview }) => (
  <View style={styles.documentRow}>
    <Text style={styles.documentLabel}>{label}</Text>
    <TouchableOpacity style={styles.documentButton} onPress={onPress}>
      {preview ? (
        <Image source={{ uri: preview.uri }} style={styles.documentPreview} />
      ) : (
        <Text style={styles.documentButtonText}>Add</Text>
      )}
    </TouchableOpacity>
  </View>
);

// Camera and media helpers (top-level for reuse)
const requestCameraPermissionGlobal = async () => {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  }
  return true;
};

const requestMediaLibraryPermissionGlobal = async () => {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }
  return true;
};

const takePhotoGlobal = async (setter) => {
  const hasPermission = await requestCameraPermissionGlobal();
  if (!hasPermission) {
    Alert.alert(
      "Permission Required",
      "Camera permission is required to take photos",
    );
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setter(result.assets[0]);
  }
};

const selectFromGalleryGlobal = async (setter) => {
  const hasPermission = await requestMediaLibraryPermissionGlobal();
  if (!hasPermission) {
    Alert.alert(
      "Permission Required",
      "Media library permission is required to select photos",
    );
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setter(result.assets[0]);
  }
};

const _showPhotoActionSheetGlobal = (setter) => {
  Alert.alert(
    "Select Document Photo",
    "Choose how you want to add the document photo",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: () => takePhotoGlobal(setter) },
      {
        text: "Choose from Gallery",
        onPress: () => selectFromGalleryGlobal(setter),
      },
    ],
  );
};

// Dedicated Registration Screens (RegisterCustomerScreen, RegisterDriverScreen imported from ./src/screens)

// ForgotPasswordScreen is imported from ./src/screens
// useNavigation is imported from ./src/navigation/NavigationContext

// Custom Input Modal Component (Android-compatible)
function InputModal({
  visible,
  title,
  placeholder,
  onSubmit,
  onCancel,
  keyboardType = "default",
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    onSubmit(value);
    setValue("");
  };

  const handleCancel = () => {
    setValue("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={setValue}
              keyboardType={keyboardType}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancel}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSubmit}
              >
                <Text style={styles.modalButtonTextSubmit}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Customer Home Screen - moved to src/screens/CustomerHomeScreen.js

// Create Trip Modal (used by driver flow; kept for future use)
function _CreateTripModal({ visible, onClose }) {
  const { addTrip } = useNavigation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  const handleCreate = () => {
    if (!from || !to || !date || !time) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    addTrip({ from, to, date, time });

    Alert.alert(
      "Trip Created",
      `Your trip from ${from.name} to ${to.name} on ${date} at ${time} has been created!\n\nCustomers can now suggest packages for this route.`,
      [
        {
          text: "OK",
          onPress: () => {
            setFrom(null);
            setTo(null);
            setDate("");
            setTime("");
            onClose();
          },
        },
      ],
    );
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: "85%" }]}>
              <Text style={styles.modalTitle}>Create Trip</Text>
              <Text style={styles.modalSubtitleBid}>
                Create a trip so customers can suggest packages
              </Text>

              <ScrollView
                style={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.fieldLabel}>From *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowFromModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {from ? (
                      <>
                        <Text style={styles.locationSelectedName}>
                          {from.name}
                        </Text>
                        <Text style={styles.locationSelectedAddress}>
                          {from.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>
                        Select departure location...
                      </Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>To *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowToModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {to ? (
                      <>
                        <Text style={styles.locationSelectedName}>
                          {to.name}
                        </Text>
                        <Text style={styles.locationSelectedAddress}>
                          {to.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>
                        Select destination...
                      </Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Oct 28, 2025"
                  placeholderTextColor={colors.textTertiary}
                  value={date}
                  onChangeText={setDate}
                />

                <Text style={styles.fieldLabel}>Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor={colors.textTertiary}
                  value={time}
                  onChangeText={setTime}
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Maximum 3 packages per trip. Customers will suggest
                    packages for your route and you can accept, counter, or
                    reject.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setFrom(null);
                    setTo(null);
                    setDate("");
                    setTime("");
                    onClose();
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleCreate}
                >
                  <Text style={styles.modalButtonTextSubmit}>Create Trip</Text>
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
}

// Helper function to decode polyline
const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return poly;
};

// Location Search Modal with Map
function LocationSearchModal({
  visible,
  title,
  onSelect,
  onCancel,
  showRoute = false,
  routeStart = null,
  routeEnd = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -24.6282, // Gaborone default
    longitude: 25.9231,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const mapRef = useRef(null);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature.",
        );
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Update map region
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(newRegion);

      // Reverse geocode to get address
      await reverseGeocode(latitude, longitude);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert("Error", "Failed to get your current location.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setSelectedLocation({
          name: "Selected Location",
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = {
          name: result.formatted_address.split(",")[0],
          address: result.formatted_address,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      } else {
        const location = {
          name: "Selected Location",
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      const location = {
        name: "Selected Location",
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      };
      setSelectedLocation(location);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for addresses
  const searchAddresses = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      // Use Places API (New) - Autocomplete
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ["bw"],
            languageCode: "en",
          }),
        },
      );
      const data = await response.json();

      if (data.suggestions) {
        const results = await Promise.all(
          data.suggestions.slice(0, 5).map(async (suggestion) => {
            if (suggestion.placePrediction?.placeId) {
              // Get place details using Places API (New)
              const detailsResponse = await fetch(
                `https://places.googleapis.com/v1/places/${suggestion.placePrediction.placeId}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask":
                      "id,displayName,formattedAddress,location",
                  },
                },
              );
              const detailsData = await detailsResponse.json();

              if (detailsData.location) {
                return {
                  id: detailsData.id || suggestion.placePrediction.placeId,
                  name:
                    detailsData.displayName?.text ||
                    suggestion.placePrediction.text?.text ||
                    "Unknown",
                  address:
                    detailsData.formattedAddress ||
                    suggestion.placePrediction.text?.text ||
                    "",
                  lat: detailsData.location.latitude || 0,
                  lng: detailsData.location.longitude || 0,
                };
              }
            }
            return null;
          }),
        );
        setSearchResults(results.filter((r) => r !== null));
      }
    } catch (error) {
      console.error("Error searching addresses:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle map region change (when user drags map)
  const handleRegionChangeComplete = (region) => {
    setMapRegion(region);
    reverseGeocode(region.latitude, region.longitude);
  };

  // Load route if showRoute is true
  useEffect(() => {
    if (showRoute && routeStart && routeEnd && visible) {
      const loadRoute = async () => {
        try {
          const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) return;

          const origin = `${routeStart.lat},${routeStart.lng}`;
          const destination = `${routeEnd.lat},${routeEnd.lng}`;

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`,
          );
          const data = await response.json();

          if (data.status === "OK" && data.routes[0]) {
            const polyline = decodePolyline(
              data.routes[0].overview_polyline.points,
            );
            setRoutePolyline(polyline);

            // Fit map to show entire route
            if (polyline.length > 0 && mapRef.current) {
              const coordinates = polyline;
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              });
            }
          }
        } catch (error) {
          console.error("Error loading route:", error);
        }
      };
      loadRoute();
    } else {
      setRoutePolyline(null);
    }
  }, [showRoute, routeStart, routeEnd, visible]);

  // Handle search query change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAddresses(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
  const handleSearchResultSelect = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.address);
    setSearchResults([]);

    const newRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(newRegion);

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleSelect = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      setSearchQuery("");
      setSelectedLocation(null);
      setSearchResults([]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        onCancel();
        setSearchQuery("");
        setSelectedLocation(null);
        setSearchResults([]);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: "90%" }]}>
            <Text style={styles.modalTitle}>{title}</Text>

            {/* Search Input */}
            <View style={{ position: "relative", marginBottom: 12 }}>
              <TextInput
                style={styles.modalInput}
                placeholder="Search location or drag map..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isLoading && (
                <View style={{ position: "absolute", right: 12, top: 12 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <ScrollView
                style={{
                  maxHeight: 150,
                  marginBottom: 12,
                  backgroundColor: colors.cardBg,
                  borderRadius: 8,
                }}
              >
                {searchResults.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.locationItem}
                    onPress={() => handleSearchResultSelect(location)}
                  >
                    <Text style={styles.locationIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Text style={styles.locationAddress}>
                        {location.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Map View */}
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                region={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={false}
                mapType="standard"
              >
                {/* Route polyline */}
                {routePolyline && routePolyline.length > 0 && (
                  <Polyline
                    coordinates={routePolyline}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                  />
                )}

                {/* Route start marker */}
                {showRoute && routeStart && (
                  <Marker
                    coordinate={{
                      latitude: routeStart.lat,
                      longitude: routeStart.lng,
                    }}
                    title="Start"
                    pinColor={colors.success}
                  />
                )}

                {/* Route end marker */}
                {showRoute && routeEnd && (
                  <Marker
                    coordinate={{
                      latitude: routeEnd.lat,
                      longitude: routeEnd.lng,
                    }}
                    title="End"
                    pinColor={colors.error}
                  />
                )}

                {/* Selected location marker */}
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      reverseGeocode(latitude, longitude);
                    }}
                  />
                )}
              </MapView>

              {/* Current Location Button */}
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.currentLocationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Selected Location Info */}
            {selectedLocation && (
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>
                    {selectedLocation.name}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {selectedLocation.address}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  onCancel();
                  setSearchQuery("");
                  setSelectedLocation(null);
                  setSearchResults([]);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSubmit,
                  (!selectedLocation || isLoading) && { opacity: 0.5 },
                ]}
                onPress={handleSelect}
                disabled={!selectedLocation || isLoading}
              >
                <Text style={styles.modalButtonTextSubmit}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Create Package for Driver Modal
function _CreatePackageForDriverModal({ visible, driver, onClose }) {
  const [description, setDescription] = useState("");
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const driverName = driver?.driver || "this driver";

  const handleSubmit = () => {
    if (!description || !pickup || !delivery || !recipientPhone || !price) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!/^[267]\d{7}$/.test(recipientPhone)) {
      Alert.alert(
        "Error",
        "Please enter a valid Botswana phone number (e.g., 71234567)",
      );
      return;
    }

    const platformFee = (parseFloat(price) * 0.3).toFixed(2);
    const driverEarnings = (parseFloat(price) * 0.7).toFixed(2);

    Alert.alert(
      "Request Sent",
      `Package delivery request sent to ${driverName}!\n\nPackage: ${description}\nFrom: ${pickup.name}\nTo: ${delivery.name}\nOffering: P ${price}\n\n${driverName} will receive P ${driverEarnings} (after P ${platformFee} platform fee).\n\nThey can accept, reject, or counter your offer.`,
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
            onClose();
          },
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDescription("");
          setPickup(null);
          setDelivery(null);
          setRecipientPhone("");
          setWeight("");
          setPrice("");
          onClose();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: "90%" }]}>
              <Text style={styles.modalTitle}>
                Create Package for {driverName}
              </Text>
              <Text style={styles.modalSubtitleBid}>
                Send a delivery request directly to this driver
              </Text>

              <ScrollView
                style={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Electronics, Documents, Clothing"
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={styles.fieldLabel}>Pickup Location *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowPickupModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {pickup ? (
                      <>
                        <Text style={styles.locationSelectedName}>
                          {pickup.name}
                        </Text>
                        <Text style={styles.locationSelectedAddress}>
                          {pickup.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>
                        Select pickup location...
                      </Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Delivery Location *</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowDeliveryModal(true)}
                >
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    {delivery ? (
                      <>
                        <Text style={styles.locationSelectedName}>
                          {delivery.name}
                        </Text>
                        <Text style={styles.locationSelectedAddress}>
                          {delivery.address}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.locationPlaceholder}>
                        Select delivery location...
                      </Text>
                    )}
                  </View>
                  <Text style={styles.locationArrow}>›</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Recipient Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 71234567"
                  placeholderTextColor={colors.textTertiary}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  maxLength={8}
                />

                <Text style={styles.fieldLabel}>Weight (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2 kg"
                  placeholderTextColor={colors.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                />

                <Text style={styles.fieldLabel}>Offering Price (P) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 150"
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Platform charges 30% fee. Driver will receive 70% of your
                    offered price. They can accept, counter, or reject your
                    offer.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setDescription("");
                    setPickup(null);
                    setDelivery(null);
                    setRecipientPhone("");
                    setWeight("");
                    setPrice("");
                    onClose();
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.modalButtonTextSubmit}>Send Request</Text>
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
}

// My Bids Screen removed

// Wallet Screen
// Old WalletScreen - replaced by new WalletScreen from src/screens
// Keeping for reference but not used
function _WalletScreenOld() {
  const {
    goBack,
    userType,
    customerWallet,
    driverWallet,
    setCustomerWallet,
    setDriverWallet,
  } = useNavigation();
  const isCustomer = userType === "customer";
  const balance = isCustomer ? customerWallet : driverWallet;
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleDepositSubmit = (amount) => {
    setShowDepositModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const newBalance = balance + parseFloat(amount);
      if (isCustomer) {
        setCustomerWallet(newBalance);
      } else {
        setDriverWallet(newBalance);
      }
      Alert.alert("Success", `P ${amount} deposited successfully!`);
    } else {
      Alert.alert("Error", "Please enter a valid amount");
    }
  };

  const handleWithdrawSubmit = (amount) => {
    setShowWithdrawModal(false);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      if (parseFloat(amount) > balance) {
        Alert.alert("Error", "Insufficient balance");
        return;
      }
      const newBalance = balance - parseFloat(amount);
      setDriverWallet(newBalance);
      Alert.alert("Success", `P ${amount} withdrawn successfully!`);
    } else {
      Alert.alert("Error", "Please enter a valid amount");
    }
  };

  const handleDeposit = () => {
    setShowDepositModal(true);
  };

  const handleWithdraw = () => {
    if (isCustomer) {
      Alert.alert("Info", "Customers can only deposit funds");
      return;
    }
    setShowWithdrawModal(true);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.walletContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>P {balance.toFixed(2)}</Text>
          </View>

          <View style={styles.walletActions}>
            {isCustomer ? (
              <TouchableOpacity
                style={styles.walletButton}
                onPress={handleDeposit}
              >
                <Text style={styles.walletButtonIcon}>💳</Text>
                <Text style={styles.walletButtonText}>Deposit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.walletButton}
                onPress={handleWithdraw}
              >
                <Text style={styles.walletButtonIcon}>💸</Text>
                <Text style={styles.walletButtonText}>Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.transactionCard}>
              <View>
                <Text style={styles.transactionDesc}>Wallet Deposit</Text>
                <Text style={styles.transactionDate}>Jan 10, 2024</Text>
              </View>
              <Text style={styles.transactionAmount}>+P 150.00</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <InputModal
        visible={showDepositModal}
        title="Deposit Funds"
        placeholder="Enter amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleDepositSubmit}
        onCancel={() => setShowDepositModal(false)}
      />

      <InputModal
        visible={showWithdrawModal}
        title="Withdraw Funds"
        placeholder="Enter amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleWithdrawSubmit}
        onCancel={() => setShowWithdrawModal(false)}
      />
    </View>
  );
}

// Bottom Navigation
function BottomNav() {
  const { activeTab, setActiveTab, navigate } = useNavigation();

  const tabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    // Reset to home screen to ensure tab content is shown
    navigate("home", true);
  };

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomNavItem}
          onPress={() => handleTabPress(tab.id)}
        >
          <View
            style={[
              styles.bottomNavIcon,
              activeTab === tab.id && styles.bottomNavIconActive,
            ]}
          >
            <Text style={styles.bottomNavIconText}>{tab.icon}</Text>
          </View>
          <Text
            style={[
              styles.bottomNavLabel,
              activeTab === tab.id && styles.bottomNavLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Main App Navigator
function AppNavigator() {
  const {
    currentScreen,
    isAuthenticated,
    userType,
    activeTab,
    goBack,
    navigate,
    screenParams,
  } = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return goBack();
      },
    );

    return () => backHandler.remove();
  }, [goBack]);

  const renderScreen = () => {
    if (!isAuthenticated) {
      if (currentScreen === "loading") return <LoadingScreen />;
      if (currentScreen === "registerCustomer")
        return <RegisterCustomerScreen />;
      if (currentScreen === "registerDriver") return <RegisterDriverScreen />;
      if (currentScreen === "forgotPassword") return <ForgotPasswordScreen />;
      return <LoginScreen />;
    }

    // Customer screens (check before tabs)
    if (currentScreen === "createPackage") return <CreatePackageScreen />;
    if (currentScreen === "myPackages") return <MyPackagesScreen />;
    if (currentScreen === "availableDrivers") return <AvailableDriversScreen />;
    if (currentScreen === "wallet")
      return <NewWalletScreen navigation={{ navigate, goBack }} route={{}} />;
    if (currentScreen === "notifications") return <NotificationScreen />;
    if (currentScreen === "verification")
      return (
        <VerificationScreen navigation={{ navigate, goBack }} route={{}} />
      );
    if (currentScreen === "chat") {
      const chatRoute = {
        params: screenParams?.chat || screenParams?.currentScreen || {},
      };
      return <ChatScreen navigation={{ navigate, goBack }} route={chatRoute} />;
    }
    if (currentScreen === "tracking") {
      const trackingRoute = {
        params: screenParams?.tracking || screenParams?.currentScreen || {},
      };
      return (
        <TrackingScreen
          navigation={{ navigate, goBack }}
          route={trackingRoute}
        />
      );
    }

    // Driver screens (check before tabs)
    if (currentScreen === "availablePackages")
      return <AvailablePackagesScreen />;
    if (currentScreen === "myTrips") return <MyTripsScreen />;

    // Utility screens (available to both)
    if (currentScreen === "profile") return <ProfileScreen />;
    if (currentScreen === "settings") return <SettingsScreen />;

    // Main tab screens (checked after specific screens)
    if (activeTab === "profile") return <ProfileScreen />;
    if (activeTab === "settings") return <SettingsScreen />;
    if (activeTab === "home") {
      return userType === "customer" ? (
        <CustomerHomeScreen />
      ) : (
        <DriverHomeScreen />
      );
    }

    return userType === "customer" ? (
      <CustomerHomeScreen />
    ) : (
      <DriverHomeScreen />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {isAuthenticated && <BottomNav />}
    </View>
  );
}

// Helper Functions - getStatusColor moved to src/utils/packageUtils.js

// Main App
export default function App() {
  return (
    <NavigationProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <AppNavigator />
      </SafeAreaView>
    </NavigationProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  // Loading Screen
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoBigContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.botswanaBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: colors.botswanaBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBigN: {
    fontSize: 84,
    fontWeight: "900",
    color: colors.botswanaWhite,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoTextBig: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.botswanaWhite,
    letterSpacing: 4,
    marginBottom: 10,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sloganBig: {
    fontSize: 16,
    color: colors.botswanaBlack,
    fontStyle: "italic",
    fontWeight: "400",
    letterSpacing: 0.5,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 22,
  },
  cursor: {
    fontSize: 18,
    color: colors.botswanaBlack,
    fontWeight: "900",
    marginLeft: 4,
  },

  // Login Screen
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoN: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.cardBg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: colors.botswanaBlack,
    fontStyle: "italic",
    fontWeight: "400",
    letterSpacing: 0.5,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textLight,
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  nameRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTypeSelector: {
    marginBottom: 16,
  },
  userTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userTypeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  userTypeButtonActive: {
    backgroundColor: colors.accent,
  },
  userTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  userTypeButtonTextActive: {
    color: colors.textLight,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
  // Password input with inline eye icon
  phoneInputContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  countryCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginRight: 4,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  passwordInputWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 44, // space for eye icon
  },
  passwordIcon: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordIconText: {
    fontSize: 18,
    color: colors.primary,
  },
  showPasswordToggle: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 8,
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  // Document Upload Styles
  documentsSection: {
    marginTop: 20,
    marginBottom: 30,
    padding: 16,
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  documentsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  documentButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  documentButtonText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
  documentPreview: {
    width: 60,
    height: 40,
    borderRadius: 6,
  },
  documentNote: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  termsCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 18,
    color: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Modal Styles for Forgot Password (LoginScreen uses its own styles)
  forgotPasswordModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  forgotPasswordModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  forgotPasswordModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  forgotPasswordModalInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forgotPasswordModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  roleChoiceButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  roleChoiceText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
  },
  roleModalSpacing: {
    height: 20,
  },
  countryCodeList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  countryCodeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  countryCodeFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryCodeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  countryCodeNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  urgencyContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  urgencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  urgencyButtonTextActive: {
    color: colors.textLight,
  },
  forgotPasswordModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  modalCancelButton: {
    backgroundColor: colors.border,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modalSubmitButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  // Redesigned minimal header notification icon
  headerNotif: {
    position: "relative",
    padding: 8,
  },
  headerNotifIcon: {
    fontSize: 32,
  },
  headerNotifBadge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerNotifBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  // Header Bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 28,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textLight,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textLight,
    opacity: 0.95,
    textAlign: "center",
  },

  // Section
  section: {
    padding: 20,
  },
  sectionTitleGeneral: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionHintGeneral: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconText: {
    fontSize: 30,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionTextDisabled: {
    color: colors.textTertiary,
  },

  // Package Card
  packageCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageCardWithPhoto: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
    padding: 0,
  },
  packagePhoto: {
    width: "100%",
    height: 180,
    backgroundColor: colors.border,
  },
  packageContent: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  packageId: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textLight,
  },
  packageDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageRoute: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  packageLocation: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  packageArrow: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  packageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageDriverPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  packageDriver: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packageInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  bidButtonPackage: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bidButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  bidButtonDisabled: {
    backgroundColor: colors.border,
  },
  bidButtonTextDisabled: {
    color: colors.textTertiary,
  },

  // Form Container
  formContainer: {
    flex: 1,
    padding: 20,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },

  // Center Content
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  trackingInfo: {
    marginTop: 24,
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    width: "100%",
  },
  trackingLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },

  // Wallet
  walletContainer: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textLight,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textLight,
  },
  walletActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  walletButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.success,
  },

  // Profile
  profileHeader: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.cardBg,
  },
  profilePhotoContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  profilePhotoText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textLight,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoIcon: {
    fontSize: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileSection: {
    padding: 20,
  },
  profileField: {
    marginBottom: 20,
  },
  profileFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },

  // Settings
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingsItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  settingsItemArrow: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  settingsItemValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  logoutButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },

  // Notification Screen Styles
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  notificationTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  markAllText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  notificationList: {
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: colors.cardBgLight,
    borderColor: colors.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationItemTitleUnread: {
    fontWeight: "700",
  },
  notificationItemMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationItemTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 4,
    paddingBottom: Platform.OS === "ios" ? 20 : 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  bottomNavIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  bottomNavIconActive: {
    backgroundColor: colors.primary,
  },
  bottomNavIconText: {
    fontSize: 20,
  },
  bottomNavLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  bottomNavLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },

  // Input Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSubmit: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },

  // Photo Upload Styles
  photoSection: {
    marginBottom: 24,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  addPhotoButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  photoPreview: {
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  changePhotoButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  changePhotoText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },

  // Create Package Form Styles
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: "italic",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  locationSelectedName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationSelectedAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationArrow: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  routeInfo: {
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  routeInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  routeInfoValue: {
    fontWeight: "700",
    color: colors.primary,
  },
  routeInfoText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  locationItemSelected: {
    backgroundColor: colors.primary + "20",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "700",
  },
  currentLocationButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  currentLocationIcon: {
    fontSize: 24,
  },
  selectedLocationInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBgLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  // Available Drivers Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
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
    overflow: "hidden",
  },
  driverCardContent: {
    flexDirection: "row",
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
  driverVehicleDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverRating: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  driverTrips: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeIndicator: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
  },
  driverLocation: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripRoute: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tripLocation: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripSpaces: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  tripPrice: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tripPriceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },

  // Header Action Button
  headerAction: {
    padding: 8,
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },

  // My Packages - View Bids
  viewBidsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },

  // Tracking Box
  trackingBox: {
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  trackingText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
  },

  // Bid Modal Styles
  modalSubtitleBid: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  bidCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bidDriverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  bidDriverName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bidDriverMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  bidFeeInfo: {
    backgroundColor: colors.cardBg,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  bidFeeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bidActions: {
    flexDirection: "row",
    gap: 8,
  },
  bidModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  bidRejectButton: {
    backgroundColor: colors.border,
  },
  bidRejectText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  bidAcceptButton: {
    backgroundColor: colors.primary,
  },
  bidAcceptText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },

  // My Trips Detail Styles
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripDetailId: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  spacesIndicator: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spacesText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  tripPackagesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  tripPackageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tripCustomerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tripPackageCustomer: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tripPackageFee: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },

  // Suggestion Card Styles
  suggestionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  suggestionFee: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  suggestionFeeBreakdown: {
    backgroundColor: colors.success + "15",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  suggestionFeeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
  },
  suggestionActions: {
    flexDirection: "row",
    gap: 8,
  },
  suggestionRejectBtn: {
    flex: 1,
    backgroundColor: colors.border,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionRejectText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionCounterBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionCounterText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionAcceptBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionAcceptText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: "700",
  },

  // Bid Status Card Styles
  bidStatusCard: {
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
  bidStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bidStatusPackage: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  bidStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bidStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bidStatusDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bidStatusRoute: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bidStatusFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bidStatusAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  bidStatusEarnings: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.success,
  },

  // Available Packages - Action Buttons
  packageActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  packageActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },
  counterButton: {
    backgroundColor: colors.secondary,
  },
  counterButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },

  // Section Hint (package/trip section)
  sectionHintPackage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: "italic",
  },

  // Package Select Item (for suggestion modal)
  packageSelectItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  packageSelectItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  packageSelectId: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  packageSelectDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  packageSelectRoute: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // Info Box
  infoBox: {
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },

  // Active Status Toggle (Driver)
  activeStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  activeStatusLeft: {
    flex: 1,
  },
  activeStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activeStatusSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  activeToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    padding: 2,
  },
  activeToggleOn: {
    backgroundColor: colors.success,
  },
  activeToggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activeToggleCircleOn: {
    transform: [{ translateX: 24 }],
  },

  // Driver Vehicle (card variant)
  driverVehicleCard: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
