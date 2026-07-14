import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { CreatePackageForDriverModal } from "../components/CreatePackageForDriverModal";
import apiService from "../services/apiService";

const formatCapacity = (capacity) => {
  const raw = (capacity || "").toString().toUpperCase();
  if (raw === "SMALL") return "Small space available";
  if (raw === "MEDIUM") return "Medium space available";
  if (raw === "LARGE") return "Large space available";
  if (raw === "EXTRA_LARGE") return "Extra-large space available";
  if (capacity && !Number.isNaN(Number(capacity))) {
    return `${capacity} spaces available`;
  }
  return "Space available";
};

export const AvailableDriversScreen = () => {
  const { goBack, authToken } = useNavigation();
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [upcomingTrips, setUpcomingTrips] = useState([]);

  const handleCreatePackageForDriver = (driver) => {
    setSelectedDriver(driver);
    setShowCreatePackageModal(true);
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const loadDriversAndTrips = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      apiService.setToken(authToken);

      // Get customer's position quickly for distance sorting
      let customerLat = null;
      let customerLng = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          // Use last known position for instant results, fall back to current
          let pos = await Location.getLastKnownPositionAsync();
          if (!pos) {
            pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
          }
          if (pos) {
            customerLat = pos.coords.latitude;
            customerLng = pos.coords.longitude;
          }
        }
      } catch {
        // location unavailable — distance sorting will be skipped
      }

      const [driversResp, tripsResp] = await Promise.allSettled([
        apiService.getAllDrivers({ limit: 50, offset: 0, verified: true }),
        apiService.getAvailableTrips({ limit: 50, offset: 0 }),
      ]);

      const driversVal =
        driversResp.status === "fulfilled" ? driversResp.value : null;
      const tripsVal =
        tripsResp.status === "fulfilled" ? tripsResp.value : null;

      const driversList = Array.isArray(driversVal?.data)
        ? driversVal.data
        : (driversVal?.data?.drivers ?? []);

      const driversArr = Array.isArray(driversList) ? driversList : [];

      // Map drivers without geocoding for instant load
      const mappedDrivers = driversArr.map((d) => {
        const dist = getDistanceKm(
          customerLat,
          customerLng,
          d.lastLatitude,
          d.lastLongitude,
        );

        return {
          id: d.id,
          userId: d.userId,
          driver:
            `${d.user?.firstName || ""} ${d.user?.lastName || ""}`.trim() ||
            "Driver",
          rating: d.rating || 0,
          totalDeliveries: d.totalDeliveries || 0,
          vehicle: d.vehicleType || "Vehicle",
          location:
            d.locationName ||
            (d.lastLatitude ? "Available" : "Location unavailable"),
          distance: dist,
          distanceText:
            dist !== Infinity
              ? dist < 1
                ? `${Math.round(dist * 1000)}m away`
                : `${Math.round(dist)}km away`
              : null,
          latitude: d.lastLatitude,
          longitude: d.lastLongitude,
          photo: d.user?.profilePictureUrl || null,
        };
      });

      // Sort by nearest first
      mappedDrivers.sort((a, b) => a.distance - b.distance);
      setActiveDrivers(mappedDrivers);

      const tripsList = Array.isArray(tripsVal?.data)
        ? tripsVal.data
        : (tripsVal?.data?.trips ?? []);
      const mappedTrips = Array.isArray(tripsList)
        ? tripsList.map((t) => ({
            id: t.id,
            driverId: t.driver?.id,
            userId: t.driver?.userId,
            driver:
              `${t.driver?.user?.firstName || ""} ${t.driver?.user?.lastName || ""}`.trim() ||
              "Driver",
            rating: t.driver?.rating || 0,
            totalDeliveries: t.driver?.totalDeliveries || 0,
            vehicle: t.driver?.vehicleType || "Vehicle",
            photo:
              t.driver?.user?.profilePictureUrl ||
              t.driver?.profilePictureUrl ||
              null,
            from: t.startAddress,
            to: t.endAddress,
            date: new Date(t.departureTime).toLocaleString(),
            spacesLeft: formatCapacity(t.availableCapacity),
            price: "—",
          }))
        : [];
      setUpcomingTrips(mappedTrips);
    } catch (e) {
      console.error("Failed to load drivers/trips:", e);
      setActiveDrivers([]);
      setUpcomingTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriversAndTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Available Drivers</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={packageStyles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={packageStyles.sectionTitle}>🟢 Active Now</Text>
          <Text style={styles.sectionHint}>
            Tap any driver to create a package delivery request
          </Text>
          {loading && activeDrivers.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : null}
          {activeDrivers.map((driver) => (
            <TouchableOpacity
              key={driver.id}
              style={styles.driverCard}
              onPress={() => handleCreatePackageForDriver(driver)}
              activeOpacity={0.7}
            >
              <View style={styles.driverCardContent}>
                {driver.photo ? (
                  <Image
                    source={{ uri: driver.photo }}
                    style={styles.driverPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.driverPhoto, styles.driverPhotoPlaceholder]}
                  >
                    <Text style={styles.driverPhotoInitial}>
                      {(driver.driver?.[0] || "D").toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.driverDetails}>
                  <View style={styles.driverHeader}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.driver}</Text>
                      <View style={styles.driverMeta}>
                        <Text style={styles.driverRating}>
                          {driver.rating || 0} ⭐
                        </Text>
                        <Text style={styles.driverTrips}>
                          {" "}
                          • {driver.totalDeliveries || 0} deliveries
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeText}>● Active</Text>
                    </View>
                  </View>
                  <Text style={styles.driverLocation}>
                    📍 {driver.location || "Location unavailable"}
                  </Text>
                  {driver.distanceText && (
                    <Text style={styles.driverDistance}>
                      🧭 {driver.distanceText}
                    </Text>
                  )}
                  <Text style={styles.driverVehicle}>
                    🚗 {driver.vehicle || "My Vehicle"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={packageStyles.sectionTitle}>🚗 Upcoming Trips</Text>
          <Text style={styles.sectionHint}>
            Tap to create a package delivery request for this trip
          </Text>
          {upcomingTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.driverCard}
              onPress={() => handleCreatePackageForDriver(trip)}
              activeOpacity={0.7}
            >
              <View style={styles.driverCardContent}>
                {trip.photo ? (
                  <Image
                    source={{ uri: trip.photo }}
                    style={styles.driverPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.driverPhoto, styles.driverPhotoPlaceholder]}
                  >
                    <Text style={styles.driverPhotoInitial}>
                      {(trip.driver?.[0] || "D").toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.driverDetails}>
                  <View style={styles.driverHeader}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{trip.driver}</Text>
                      <View style={styles.driverMeta}>
                        <Text style={styles.driverRating}>
                          {trip.rating || 0} ⭐
                        </Text>
                        <Text style={styles.driverTrips}>
                          {" "}
                          • {trip.totalDeliveries || 0} deliveries
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.driverVehicle}>
                    🚗 {trip.vehicle || "Vehicle"}
                  </Text>
                  <View style={[packageStyles.packageRoute, { marginTop: 8 }]}>
                    <Text style={packageStyles.packageLocation}>
                      📍 {trip.from}
                    </Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>
                      📍 {trip.to}
                    </Text>
                  </View>
                  <View style={styles.tripFooter}>
                    <Text style={styles.tripDate}>🕒 {trip.date}</Text>
                    <Text style={styles.tripSpaces}>📦 {trip.spacesLeft}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <CreatePackageForDriverModal
        visible={showCreatePackageModal}
        driver={selectedDriver}
        onClose={() => {
          setShowCreatePackageModal(false);
          setSelectedDriver(null);
        }}
      />
    </View>
  );
};

const styles = {
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
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
  driverPhotoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary + "25",
  },
  driverPhotoInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  driverDetails: {
    flex: 1,
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
  driverDistance: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  driverVehicle: {
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
  tripFooter: {
    marginTop: 8,
    gap: 4,
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
};
