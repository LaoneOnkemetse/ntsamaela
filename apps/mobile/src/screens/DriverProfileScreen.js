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

export const DriverProfileScreen = () => {
  const { goBack, screenParams, authToken } = useNavigation();
  const params = screenParams?.driverProfile || {};
  const driverId = params.driverId || params.driver?.id;
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(!!driverId);

  useEffect(() => {
    if (!driverId) return;
    const load = async () => {
      setLoading(true);
      try {
        apiService.setToken(authToken);
        const resp = await apiService.getDriverById(driverId);
        if (resp?.success !== false && resp?.data) {
          setDriver(resp.data);
        } else if (params.driver) {
          setDriver(params.driver);
        }
      } catch (e) {
        console.warn("Failed to load driver profile:", e?.message);
        if (params.driver) setDriver(params.driver);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [driverId, authToken, params.driver]);

  const name = driver?.user
    ? `${driver.user.firstName || ""} ${driver.user.lastName || ""}`.trim()
    : "Driver";
  const photo = driver?.user?.profilePictureUrl;
  const registration = driver?.licensePlate;

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
              <Text style={styles.name}>{name}</Text>
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
                📍 {driver?.locationName || "Location unavailable"}
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
