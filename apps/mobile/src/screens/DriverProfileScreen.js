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
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { useNavigation } from "../navigation/NavigationContext";
import apiService from "../services/apiService";

const unwrapDriverParams = (raw) => {
  if (!raw || typeof raw !== "object") return {};
  // Support both flat params and legacy nested { driverProfile: {...} }
  if (raw.driverId || raw.driver) return raw;
  if (raw.driverProfile && typeof raw.driverProfile === "object") {
    return raw.driverProfile;
  }
  return raw;
};

export const DriverProfileScreen = () => {
  const { goBack, screenParams, authToken } = useNavigation();
  const params = unwrapDriverParams(screenParams?.driverProfile);
  const driverId = params.driverId || params.driver?.id;
  const [driver, setDriver] = useState(params.driver || null);
  const [loading, setLoading] = useState(!!driverId && !params.driver);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (authToken) apiService.setToken(authToken);
        const resp = await apiService.getDriverById(driverId);
        const data = resp?.data?.data || resp?.data || null;
        if (!cancelled) {
          if (resp?.success !== false && data) {
            setDriver(data);
          } else if (params.driver) {
            setDriver(params.driver);
          }
        }
      } catch (e) {
        console.warn("Failed to load driver profile:", e?.message);
        if (!cancelled && params.driver) setDriver(params.driver);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [driverId, authToken]);

  const name = driver?.user
    ? `${driver.user.firstName || ""} ${driver.user.lastName || ""}`.trim()
    : "Driver";
  const photo = driver?.user?.profilePictureUrl;
  const registration = driver?.licensePlate;
  const locationLabel =
    driver?.locationName ||
    (driver?.lastLatitude != null && driver?.lastLongitude != null
      ? `${Number(driver.lastLatitude).toFixed(4)}, ${Number(driver.lastLongitude).toFixed(4)}`
      : null);

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Driver Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : !driver ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Driver details are not available.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={styles.profileHeader}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {(name[0] || "D").toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{name || "Driver"}</Text>
              <Text style={styles.rating}>
                {driver?.rating || 0} ⭐ • {driver?.totalDeliveries || 0}{" "}
                deliveries
              </Text>
              {driver?.user?.identityVerified && (
                <Text style={styles.verified}>✓ Verified driver</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle</Text>
              <Text style={styles.row}>🚗 {driver?.vehicleType || "—"}</Text>
              <Text style={styles.row}>
                🔖 Car registration: {registration || "Not provided"}
              </Text>
              {driver?.carDescription ? (
                <Text style={styles.row}>{driver.carDescription}</Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Car Photo</Text>
            {driver?.carPhotoUrl ? (
              <Image
                source={{ uri: driver.carPhotoUrl }}
                style={styles.carPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.carPhoto, styles.carPhotoPlaceholder]}>
                <Text style={styles.carPhotoPlaceholderText}>🚗</Text>
                <Text style={styles.carPhotoPlaceholderLabel}>
                  No car photo uploaded
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.row}>
                📍 {locationLabel || "Location unavailable"}
              </Text>
            </View>

            {driver?.user?.phone ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <Text style={styles.row}>📞 {driver.user.phone}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = {
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rating: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  verified: {
    marginTop: 8,
    color: colors.success,
    fontWeight: "600",
  },
  section: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  carPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.border,
  },
  carPhotoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carPhotoPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  carPhotoPlaceholderLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
};
