import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { colors } from "../constants/colors";
import apiService from "../services/apiService";
import socketService from "../services/socketService";
import * as Location from "expo-location";

const { height } = Dimensions.get("window");

export const TrackingScreen = ({ navigation, route }) => {
  const routeParams = route?.params || {};
  const packageId =
    routeParams.packageId || routeParams.tracking?.packageId || routeParams.id;
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [packageInfo, setPackageInfo] = useState(null);
  const [_currentLocation, setCurrentLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const mapRef = useRef(null);

  const applyDriverCoords = (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setDriverLocation({ latitude: lat, longitude: lng });
    updateMapRegion(lat, lng);
  };

  const extractDriverLocation = (trackingPayload, pkg) => {
    const raw = trackingPayload;
    const updates = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.updates)
        ? raw.updates
        : [];

    const fromApi = !Array.isArray(raw) ? raw?.driverLocation : null;
    if (fromApi?.latitude != null && fromApi?.longitude != null) {
      return {
        latitude: Number(fromApi.latitude),
        longitude: Number(fromApi.longitude),
      };
    }

    const withCoords = updates.find(
      (u) => u?.latitude != null && u?.longitude != null,
    );
    if (withCoords) {
      return {
        latitude: Number(withCoords.latitude),
        longitude: Number(withCoords.longitude),
      };
    }

    const accepted =
      pkg?.bids?.find?.((b) => (b.status || "").toUpperCase() === "ACCEPTED") ||
      pkg?.bids?.[0];
    const driver = accepted?.driver;
    if (driver?.lastLatitude != null && driver?.lastLongitude != null) {
      return {
        latitude: Number(driver.lastLatitude),
        longitude: Number(driver.lastLongitude),
      };
    }
    return null;
  };

  useEffect(() => {
    if (!packageId) return;

    loadTrackingData();
    setupSocketListeners();
    requestLocationPermission();

    const poll = setInterval(() => {
      loadTrackingData(true);
    }, 15000);

    return () => {
      clearInterval(poll);
      socketService.off("location_update");
      socketService.off("package:location:update");
      socketService.off("package:location:updated");
      socketService.off("package_status_update");
      socketService.off("package:status:update");
      socketService.off("delivery:status:updated");
    };
  }, [packageId]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Location permission error:", error);
    }
  };

  const loadTrackingData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [trackingRes, packageRes] = await Promise.all([
        apiService.getPackageTracking(packageId),
        apiService.getPackageById(packageId),
      ]);

      const pkg = packageRes?.success
        ? packageRes.data?.data || packageRes.data
        : null;
      if (pkg) setPackageInfo(pkg);

      if (trackingRes?.success) {
        const payload = trackingRes.data;
        const updates = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.updates)
            ? payload.updates
            : [];
        setTrackingData({ updates, driverLocation: payload?.driverLocation });
        const coords = extractDriverLocation(payload, pkg);
        if (coords) {
          setDriverLocation(coords);
        }
      } else if (pkg) {
        const coords = extractDriverLocation(null, pkg);
        if (coords) setDriverLocation(coords);
      }
    } catch (error) {
      console.error("Failed to load tracking data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.emit("package:track", { packageId });

    const onLocation = (data) => {
      if (!data || data.packageId !== packageId) return;
      applyDriverCoords(data.latitude, data.longitude);
    };

    socketService.on("location_update", onLocation);
    socketService.on("package:location:update", onLocation);
    socketService.on("package:location:updated", onLocation);

    socketService.on("package_status_update", (data) => {
      if (data?.packageId === packageId) loadTrackingData(true);
    });
    socketService.on("package:status:update", (data) => {
      if (data?.packageId === packageId) loadTrackingData(true);
    });
    socketService.on("delivery:status:updated", (data) => {
      if (data?.packageId === packageId) loadTrackingData(true);
    });
  };

  const updateMapRegion = (latitude, longitude) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000,
      );
    }
  };

  const handleCancelPackage = () => {
    const status = (packageInfo?.status || "").toUpperCase();
    if (!["ACCEPTED", "IN_TRANSIT", "IN_PROGRESS"].includes(status)) {
      Alert.alert("Cannot cancel", "This package cannot be cancelled now.");
      return;
    }
    const base = packageInfo?.priceOffered || 0;
    const fee = (Number(base) * 0.1).toFixed(2);
    Alert.alert(
      "Cancel package",
      `A 10% cancellation fee (about P ${fee}) will be charged to your wallet.\n\nContinue?`,
      [
        { text: "Keep package", style: "cancel" },
        {
          text: "Cancel & pay fee",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const resp = await apiService.cancelPackage(packageId);
              if (resp?.success === false) {
                Alert.alert(
                  "Cancel failed",
                  resp?.error?.message || "Could not cancel package",
                );
                return;
              }
              Alert.alert(
                "Cancelled",
                resp?.message ||
                  `Package cancelled. Fee: P ${resp?.data?.fee ?? fee}`,
              );
              setPackageInfo((prev) =>
                prev ? { ...prev, status: "CANCELLED" } : prev,
              );
              if (navigation?.goBack) navigation.goBack();
            } catch (e) {
              Alert.alert("Cancel failed", e?.message || "Could not cancel");
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return colors.warning;
      case "ACCEPTED":
        return colors.primary;
      case "IN_TRANSIT":
        return colors.primary;
      case "DELIVERED":
        return colors.success;
      case "CANCELLED":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitialRegion = () => {
    if (driverLocation) {
      return {
        ...driverLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (packageInfo?.pickupLat && packageInfo?.pickupLng) {
      return {
        latitude: packageInfo.pickupLat,
        longitude: packageInfo.pickupLng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    // Default to Gaborone, Botswana
    return {
      latitude: -24.6282,
      longitude: 25.9231,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && !trackingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Map View */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={getInitialRegion()}
              showsUserLocation
              showsMyLocationButton
            >
              {/* Pickup Location */}
              {packageInfo?.pickupLat && packageInfo?.pickupLng && (
                <Marker
                  coordinate={{
                    latitude: packageInfo.pickupLat,
                    longitude: packageInfo.pickupLng,
                  }}
                  title="Pickup Location"
                  description={packageInfo.pickupAddress}
                  pinColor={colors.success}
                />
              )}

              {/* Delivery Location */}
              {packageInfo?.deliveryLat && packageInfo?.deliveryLng && (
                <Marker
                  coordinate={{
                    latitude: packageInfo.deliveryLat,
                    longitude: packageInfo.deliveryLng,
                  }}
                  title="Delivery Location"
                  description={packageInfo.deliveryAddress}
                  pinColor={colors.error}
                />
              )}

              {/* Driver Location */}
              {driverLocation && (
                <Marker
                  coordinate={driverLocation}
                  title="Driver Location"
                  description="Current driver position"
                  pinColor={colors.primary}
                />
              )}

              {/* Route Line */}
              {packageInfo?.pickupLat &&
                packageInfo?.pickupLng &&
                packageInfo?.deliveryLat &&
                packageInfo?.deliveryLng && (
                  <Polyline
                    coordinates={[
                      {
                        latitude: packageInfo.pickupLat,
                        longitude: packageInfo.pickupLng,
                      },
                      {
                        latitude: packageInfo.deliveryLat,
                        longitude: packageInfo.deliveryLng,
                      },
                    ]}
                    strokeColor={colors.primary}
                    strokeWidth={3}
                  />
                )}
            </MapView>
          </View>

          {/* Tracking Info */}
          <ScrollView
            style={styles.infoContainer}
            contentContainerStyle={styles.infoContent}
          >
            {packageInfo && (
              <View style={styles.packageCard}>
                <Text style={styles.cardTitle}>Package Details</Text>
                <Text style={styles.packageDescription}>
                  {packageInfo.description}
                </Text>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(packageInfo.status) },
                    ]}
                  />
                  <Text style={styles.statusText}>{packageInfo.status}</Text>
                </View>
                {["ACCEPTED", "IN_TRANSIT", "IN_PROGRESS"].includes(
                  (packageInfo.status || "").toUpperCase(),
                ) ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelPackage}
                    disabled={cancelling}
                  >
                    <Text style={styles.cancelButtonText}>
                      {cancelling
                        ? "Cancelling..."
                        : "Cancel package (10% fee)"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {trackingData &&
              trackingData.updates &&
              trackingData.updates.length > 0 && (
                <View style={styles.timelineCard}>
                  <Text style={styles.cardTitle}>Tracking Timeline</Text>
                  {trackingData.updates.map((update, index) => (
                    <View key={update.id || index} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStatus}>
                          {update.status}
                        </Text>
                        {update.location && (
                          <Text style={styles.timelineLocation}>
                            {update.location}
                          </Text>
                        )}
                        <Text style={styles.timelineTime}>
                          {formatDate(update.timestamp)}
                        </Text>
                        {update.notes && (
                          <Text style={styles.timelineNotes}>
                            {update.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

            {packageInfo && (
              <View style={styles.addressCard}>
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>From:</Text>
                  <Text style={styles.addressText}>
                    {packageInfo.pickupAddress}
                  </Text>
                </View>
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>To:</Text>
                  <Text style={styles.addressText}>
                    {packageInfo.deliveryAddress}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    height: height * 0.5,
    width: "100%",
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    flex: 1,
  },
  infoContent: {
    padding: 16,
  },
  packageCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  packageDescription: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBgLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cancelButton: {
    marginTop: 14,
    backgroundColor: "#FF444420",
    borderWidth: 1,
    borderColor: "#FF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FF4444",
    fontWeight: "700",
    fontSize: 14,
  },
  timelineCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  timelineLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  timelineNotes: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  addressCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
  },
  addressRow: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
