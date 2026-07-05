import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { decodePolyline } from "../utils/packageUtils";

export const LocationSearchModal = ({
  visible,
  title,
  onSelect,
  onCancel,
  showRoute = false,
  routeStart = null,
  routeEnd = null,
}) => {
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

      // Try Google Geocoding first
      if (apiKey) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
          );
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            setSelectedLocation({
              name: result.formatted_address.split(",")[0],
              address: result.formatted_address,
              lat: latitude,
              lng: longitude,
            });
            return;
          }
        } catch {
          // fall through to expo-location
        }
      }

      // Fallback: use expo-location reverse geocode
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (place) {
          const name =
            place.name ||
            place.street ||
            place.city ||
            place.district ||
            "Selected Location";
          const parts = [
            place.street,
            place.city,
            place.region,
            place.country,
          ].filter(Boolean);
          setSelectedLocation({
            name,
            address: parts.length > 0 ? parts.join(", ") : name,
            lat: latitude,
            lng: longitude,
          });
          return;
        }
      } catch {
        // fall through to last resort
      }

      // Last resort — still show a descriptive name
      setSelectedLocation({
        name: "Dropped Pin",
        address: `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      });
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      setSelectedLocation({
        name: "Dropped Pin",
        address: `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search for addresses using legacy Places API (broader compatibility)
  const searchAddresses = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);

      const legacyResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:bw`,
      );
      const legacyData = await legacyResponse.json();

      if (
        legacyData.status === "OK" &&
        Array.isArray(legacyData.predictions) &&
        legacyData.predictions.length > 0
      ) {
        const results = await Promise.all(
          legacyData.predictions.slice(0, 6).map(async (prediction) => {
            try {
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,name&key=${apiKey}`,
              );
              const detailsData = await detailsResponse.json();
              const loc = detailsData.result?.geometry?.location;
              if (loc) {
                return {
                  id: prediction.place_id,
                  name:
                    prediction.structured_formatting?.main_text ||
                    detailsData.result?.name ||
                    prediction.description.split(",")[0],
                  address: prediction.description,
                  lat: loc.lat,
                  lng: loc.lng,
                };
              }
            } catch {
              // skip failed detail lookup
            }
            return null;
          }),
        );
        setSearchResults(results.filter((r) => r !== null));
        return;
      }

      // Fallback: Places API (New)
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
          }),
        },
      );
      const data = await response.json();

      if (data.suggestions) {
        const results = await Promise.all(
          data.suggestions.slice(0, 6).map(async (suggestion) => {
            if (suggestion.placePrediction?.placeId) {
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
      } else {
        setSearchResults([]);
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

  const handleCancel = () => {
    onCancel();
    setSearchQuery("");
    setSelectedLocation(null);
    setSearchResults([]);
  };

  return (
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
          <View style={[sharedStyles.modalContent, { height: "90%" }]}>
            <Text style={sharedStyles.modalTitle}>{title}</Text>

            {/* Search Input */}
            <View style={{ position: "relative", marginBottom: 8, zIndex: 20 }}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, keyword, or plot number..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isLoading && (
                <View style={{ position: "absolute", right: 12, top: 12 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>

            {/* Use Current Location Button */}
            <TouchableOpacity
              style={styles.useCurrentLocationBtn}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.useCurrentLocationText}>
                  📍 Set to my current location
                </Text>
              )}
            </TouchableOpacity>

            {/* Search Results dropdown overlays map */}
            {/* Map View */}
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 12,
                position: "relative",
              }}
            >
              {searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
                    {searchResults.map((location) => (
                      <TouchableOpacity
                        key={location.id}
                        style={styles.locationItem}
                        onPress={() => handleSearchResultSelect(location)}
                      >
                        <Text style={styles.locationIcon}>📍</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownName}>
                            {location.name}
                          </Text>
                          <Text style={styles.dropdownAddress}>
                            {location.address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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
                  (!selectedLocation || isLoading) && { opacity: 0.5 },
                ]}
                onPress={handleSelect}
                disabled={!selectedLocation || isLoading}
              >
                <Text style={sharedStyles.modalButtonTextSubmit}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchDropdown: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  dropdownAddress: {
    fontSize: 13,
    color: "#555",
  },
  useCurrentLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  useCurrentLocationText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  currentLocationButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationIcon: {
    fontSize: 24,
  },
  selectedLocationInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBgLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});
