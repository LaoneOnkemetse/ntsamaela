import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import apiService from "../services/apiService";

const shortPackageId = (id) =>
  id ? `PKG-${String(id).slice(-6).toUpperCase()}` : "—";

export const MyDeliveriesScreen = () => {
  const { goBack, authToken, navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState([]);

  const loadDeliveries = useCallback(
    async (silent = false) => {
      if (!authToken) return;
      if (!silent) setLoading(true);
      try {
        apiService.setToken(authToken);
        const resp = await apiService.getMyBids({ limit: 50, offset: 0 });
        const raw = resp?.data ?? [];
        const bids = Array.isArray(raw) ? raw : raw?.bids || [];
        const active = bids.filter((bid) => {
          const bidStatus = (bid.status || "").toUpperCase();
          const pkgStatus = (bid.package?.status || "").toUpperCase();
          if (bidStatus !== "ACCEPTED") return false;
          return [
            "ACCEPTED",
            "IN_TRANSIT",
            "IN_PROGRESS",
            "PICKED_UP",
          ].includes(pkgStatus);
        });
        setDeliveries(active);
      } catch (e) {
        console.warn("Failed to load deliveries:", e?.message || e);
        setDeliveries([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries(true);
    setRefreshing(false);
  };

  const canCancel = (bid) => {
    const pkgStatus = (bid.package?.status || "").toUpperCase();
    // Cancel only before collection / pickup
    return pkgStatus === "ACCEPTED";
  };

  const handleCancel = (bid) => {
    const pkg = bid.package;
    if (!pkg?.id) return;
    if (!canCancel(bid)) {
      Alert.alert(
        "Cannot cancel",
        "This package has already been collected. Cancellation is only available before pickup.",
      );
      return;
    }
    const base = bid.amount || pkg.priceOffered || 0;
    const fee = (Number(base) * 0.1).toFixed(2);
    Alert.alert(
      "Cancel delivery",
      `Cancelling before pickup charges a 10% fee (P ${fee}) from your wallet.\n\nContinue?`,
      [
        { text: "Keep delivery", style: "cancel" },
        {
          text: "Cancel & pay fee",
          style: "destructive",
          onPress: async () => {
            try {
              apiService.setToken(authToken);
              const resp = await apiService.cancelPackage(pkg.id);
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
                  `Delivery cancelled. Fee charged: P ${resp?.data?.fee ?? fee}`,
              );
              await loadDeliveries(true);
            } catch (e) {
              Alert.alert("Cancel failed", e?.message || "Could not cancel");
            }
          },
        },
      ],
    );
  };

  const handleTrack = (bid) => {
    if (!bid.package?.id) return;
    navigate("tracking", false, { packageId: bid.package.id });
  };

  const statusColor = (status) => {
    switch ((status || "").toUpperCase()) {
      case "ACCEPTED":
        return colors.primary;
      case "IN_TRANSIT":
      case "IN_PROGRESS":
      case "PICKED_UP":
        return colors.warning || "#F59E0B";
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <View style={sharedStyles.headerBar}>
        <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
          <Text style={sharedStyles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={sharedStyles.headerTitle}>My Deliveries</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.subtitle}>
            Packages you have accepted. Cancel before pickup for a 10% fee.
          </Text>

          {deliveries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No active deliveries</Text>
              <Text style={styles.emptyText}>
                Accepted packages will appear here.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigate("availablePackages")}
              >
                <Text style={styles.browseBtnText}>Browse Packages</Text>
              </TouchableOpacity>
            </View>
          ) : (
            deliveries.map((bid) => {
              const pkg = bid.package || {};
              const status = (pkg.status || "ACCEPTED").toUpperCase();
              const cancellable = canCancel(bid);
              return (
                <View key={bid.id} style={packageStyles.packageCard}>
                  <View style={packageStyles.packageHeader}>
                    <View>
                      <Text style={styles.packageIdLabel}>Package ID</Text>
                      <Text style={packageStyles.packageId}>
                        {shortPackageId(pkg.id)}
                      </Text>
                    </View>
                    <View
                      style={[
                        packageStyles.statusBadge,
                        { backgroundColor: statusColor(status) },
                      ]}
                    >
                      <Text style={packageStyles.statusText}>{status}</Text>
                    </View>
                  </View>

                  <Text style={packageStyles.packageDesc}>
                    {pkg.description || "Package"}
                  </Text>
                  <View style={packageStyles.packageRoute}>
                    <Text style={packageStyles.packageLocation}>
                      📍 {pkg.pickupAddress || "Pickup"}
                    </Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>
                      📍 {pkg.deliveryAddress || "Drop-off"}
                    </Text>
                  </View>

                  <View style={packageStyles.packageFooter}>
                    <Text style={packageStyles.packagePrice}>
                      P {bid.amount ?? pkg.priceOffered ?? "—"}
                    </Text>
                    {pkg.customer ? (
                      <Text style={styles.customerName}>
                        {[pkg.customer.firstName, pkg.customer.lastName]
                          .filter(Boolean)
                          .join(" ") || "Customer"}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() => handleTrack(bid)}
                    >
                      <Text style={styles.trackBtnText}>Track</Text>
                    </TouchableOpacity>
                    {cancellable ? (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancel(bid)}
                      >
                        <Text style={styles.cancelBtnText}>
                          Cancel (10% fee)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.collectedHint}>
                        Collected — cancel unavailable
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  packageIdLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  trackBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  trackBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: 15,
  },
  collectedHint: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
