import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { getStatusColor } from "../utils/packageUtils";
import apiService from "../services/apiService";
import { InputModal } from "../components/InputModal";

export const MyPackagesScreen = () => {
  const { goBack, myPackages, authToken, refreshMyPackages, navigate } =
    useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [packageBids, setPackageBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterBidTarget, setCounterBidTarget] = useState(null);
  const [countering, setCountering] = useState(false);

  const handleDeletePackage = (pkg) => {
    const status = (pkg.status || "").toUpperCase();
    if (status === "IN_TRANSIT" || status === "IN_PROGRESS") {
      Alert.alert(
        "Cannot Delete",
        "You cannot delete a package that is currently in transit.",
      );
      return;
    }
    Alert.alert("Delete Package", `Delete package "${pkg.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            apiService.setToken(authToken);
            const resp = await apiService.deletePackage(pkg.id);
            if (resp?.success === false) {
              Alert.alert(
                "Failed",
                resp?.error?.message || "Could not delete package",
              );
            } else {
              if (refreshMyPackages) refreshMyPackages(authToken);
            }
          } catch (e) {
            Alert.alert("Failed", e?.message || "Could not delete package");
          }
        },
      },
    ]);
  };

  const normalized = Array.isArray(myPackages) ? myPackages : [];
  const pendingPackages = normalized.filter(
    (p) => (p.status || "").toString().toUpperCase() === "PENDING",
  );
  const acceptedPackages = normalized.filter(
    (p) => (p.status || "").toString().toUpperCase() === "ACCEPTED",
  );
  const inTransitPackages = normalized.filter((p) =>
    ["IN_TRANSIT", "IN_PROGRESS"].includes(
      (p.status || "").toString().toUpperCase(),
    ),
  );
  const deliveredPackages = normalized.filter(
    (p) => (p.status || "").toString().toUpperCase() === "DELIVERED",
  );

  const loadBidsForPackage = useCallback(
    async (packageId) => {
      if (!packageId || !authToken) return;
      setBidsLoading(true);
      try {
        apiService.setToken(authToken);
        const resp = await apiService.getBidsByPackage(packageId);
        const raw = resp?.data ?? [];
        const bids = Array.isArray(raw) ? raw : (raw?.bids ?? []);
        setPackageBids(bids);
      } catch (e) {
        setPackageBids([]);
        console.warn("Failed to load bids:", e?.message || e);
      } finally {
        setBidsLoading(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    if (showBidsModal && selectedPackage?.id) {
      loadBidsForPackage(selectedPackage.id);
    } else {
      setPackageBids([]);
    }
  }, [showBidsModal, selectedPackage?.id, loadBidsForPackage]);

  const handleViewBids = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidsModal(true);
  };

  const handleViewDriverProfile = (bid) => {
    const driverId = bid.driver?.id;
    if (!driverId) return;
    setShowBidsModal(false);
    navigate("driverProfile", false, {
      driverProfile: { driverId, driver: bid.driver },
    });
  };

  const handleCounterBid = (bid) => {
    setCounterBidTarget(bid);
    setShowCounterModal(true);
  };

  const submitCounterBid = async (amount) => {
    setShowCounterModal(false);
    if (!counterBidTarget || !amount) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid price.");
      return;
    }
    setCountering(true);
    try {
      apiService.setToken(authToken);
      const resp = await apiService.customerCounterBid(
        counterBidTarget.id,
        parsed,
      );
      if (resp?.success === false) {
        Alert.alert(
          "Failed",
          resp?.error?.message || "Could not send counter offer",
        );
        return;
      }
      Alert.alert(
        "Counter sent",
        `Your counter offer of P ${parsed} was sent to the driver.`,
      );
      if (selectedPackage?.id) {
        await loadBidsForPackage(selectedPackage.id);
      }
      if (authToken) await refreshMyPackages(authToken);
    } catch (e) {
      Alert.alert("Failed", e?.message || "Could not send counter offer");
    } finally {
      setCountering(false);
      setCounterBidTarget(null);
    }
  };

  const handleAcceptBid = (bid) => {
    Alert.alert("Accept bid", `Accept driver bid of P ${bid.amount}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          setAcceptingBidId(bid.id);
          try {
            apiService.setToken(authToken);
            const resp = await apiService.acceptBid(bid.id);
            if (resp?.success === false) {
              Alert.alert(
                "Failed",
                resp?.error?.message || "Could not accept bid",
              );
              return;
            }
            Alert.alert(
              "Success",
              "Bid accepted. Your package is now assigned.",
            );
            setShowBidsModal(false);
            if (authToken) {
              await refreshMyPackages(authToken);
            }
          } catch (e) {
            Alert.alert("Failed", e?.message || "Could not accept bid");
          } finally {
            setAcceptingBidId(null);
          }
        },
      },
    ]);
  };

  const renderPackageCard = (pkg, options = {}) => {
    const { showBids = false, statusLabel, statusColor } = options;
    return (
      <View key={pkg.id} style={packageStyles.packageCard}>
        {showBids ? (
          <TouchableOpacity onPress={() => handleViewBids(pkg)}>
            <View style={packageStyles.packageHeader}>
              <Text style={packageStyles.packageId}>{pkg.id}</Text>
              <View
                style={[
                  packageStyles.statusBadge,
                  { backgroundColor: statusColor || "#FFA500" },
                ]}
              >
                <Text style={packageStyles.statusText}>
                  {statusLabel || "Pending"}
                </Text>
              </View>
            </View>
            <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
            <View style={packageStyles.packageRoute}>
              <Text style={packageStyles.packageLocation}>
                📍 {pkg.pickupAddress}
              </Text>
              <Text style={packageStyles.packageArrow}>→</Text>
              <Text style={packageStyles.packageLocation}>
                📍 {pkg.deliveryAddress}
              </Text>
            </View>
            <View style={packageStyles.packageFooter}>
              <Text style={packageStyles.packageDriver}>
                Offer: P {pkg.priceOffered}
              </Text>
              <Text style={packageStyles.viewBidsText}>Tap to view bids →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <View style={packageStyles.packageHeader}>
              <Text style={packageStyles.packageId}>{pkg.id}</Text>
              <View
                style={[
                  packageStyles.statusBadge,
                  typeof statusColor === "string"
                    ? { backgroundColor: statusColor }
                    : statusColor || getStatusColor(statusLabel?.toLowerCase()),
                ]}
              >
                <Text style={packageStyles.statusText}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
            <View style={packageStyles.packageRoute}>
              <Text style={packageStyles.packageLocation}>
                📍 {pkg.pickupAddress}
              </Text>
              <Text style={packageStyles.packageArrow}>→</Text>
              <Text style={packageStyles.packageLocation}>
                📍 {pkg.deliveryAddress}
              </Text>
            </View>
            <View style={packageStyles.packageFooter}>
              <Text style={packageStyles.packagePrice}>
                P {pkg.priceOffered}
              </Text>
            </View>
          </>
        )}
        {showBids && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePackage(pkg)}
          >
            <Text style={styles.deleteButtonText}>Delete Package</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>My Packages</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={packageStyles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {normalized.length === 0 && (
            <Text style={packageStyles.sectionTitle}>No packages found.</Text>
          )}

          {pendingPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                ⏳ Pending ({pendingPackages.length})
              </Text>
              {pendingPackages.map((pkg) =>
                renderPackageCard(pkg, {
                  showBids: true,
                  statusLabel: "Pending",
                  statusColor: "#FFA500",
                }),
              )}
            </>
          )}

          {acceptedPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                ✅ Accepted ({acceptedPackages.length})
              </Text>
              {acceptedPackages.map((pkg) =>
                renderPackageCard(pkg, {
                  statusLabel: "Accepted",
                  statusColor: "#4CAF50",
                }),
              )}
            </>
          )}

          {inTransitPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                🚚 In Transit ({inTransitPackages.length})
              </Text>
              {inTransitPackages.map((pkg) =>
                renderPackageCard(pkg, {
                  statusLabel: "In Transit",
                  statusColor: getStatusColor("in-transit").backgroundColor,
                }),
              )}
            </>
          )}

          {deliveredPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                ✅ Delivered ({deliveredPackages.length})
              </Text>
              {deliveredPackages.map((pkg) =>
                renderPackageCard(pkg, {
                  statusLabel: "Delivered",
                  statusColor: getStatusColor("delivered").backgroundColor,
                }),
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showBidsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBidsModal(false)}
      >
        <View style={sharedStyles.modalOverlay}>
          <View style={[sharedStyles.modalContent, styles.bidsModal]}>
            <View style={packageStyles.modalTitleRow}>
              <Text style={sharedStyles.modalTitle}>Driver Bids</Text>
              <TouchableOpacity
                style={packageStyles.modalCloseButton}
                onPress={() => setShowBidsModal(false)}
              >
                <Text style={packageStyles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={sharedStyles.modalSubtitle}>
              {selectedPackage?.description}
            </Text>
            <Text style={sharedStyles.modalSubtitle}>
              Your offer: P {selectedPackage?.priceOffered}
            </Text>

            {bidsLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : packageBids.length === 0 ? (
              <Text style={sharedStyles.modalSubtitle}>
                No bids yet. Drivers can bid from Available Packages.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 400, marginTop: 8 }}>
                {packageBids.map((bid) => {
                  const driver = bid.driver;
                  const driverName = driver?.user
                    ? `${driver.user.firstName || ""} ${driver.user.lastName || ""}`.trim()
                    : "Driver";
                  const photo = driver?.user?.profilePictureUrl;
                  const status = (bid.status || "PENDING").toString();

                  return (
                    <View key={bid.id} style={styles.bidCard}>
                      <TouchableOpacity
                        style={styles.bidHeader}
                        onPress={() => handleViewDriverProfile(bid)}
                      >
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={styles.bidPhoto}
                          />
                        ) : (
                          <View
                            style={[
                              styles.bidPhoto,
                              styles.bidPhotoPlaceholder,
                            ]}
                          >
                            <Text style={styles.bidPhotoInitial}>
                              {(driverName[0] || "D").toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bidDriverName}>{driverName}</Text>
                          <Text style={styles.bidMeta}>
                            {driver?.rating || 0} ⭐ •{" "}
                            {driver?.totalDeliveries || 0} deliveries
                          </Text>
                          <Text style={styles.bidMeta}>
                            🚗 {driver?.vehicleType || "Vehicle"}
                          </Text>
                          {driver?.locationName ? (
                            <Text style={styles.bidMeta}>
                              📍 {driver.locationName}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.viewProfile}>View →</Text>
                      </TouchableOpacity>

                      <View style={styles.bidAmountRow}>
                        <Text style={styles.bidAmount}>P {bid.amount}</Text>
                        <Text style={styles.bidStatus}>{status}</Text>
                      </View>

                      {bid.message ? (
                        <Text style={styles.bidMessage}>{bid.message}</Text>
                      ) : null}

                      {status === "PENDING" &&
                        (selectedPackage?.status || "").toUpperCase() ===
                          "PENDING" && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              style={[styles.acceptButton, { flex: 1 }]}
                              disabled={acceptingBidId === bid.id}
                              onPress={() => handleAcceptBid(bid)}
                            >
                              <Text style={styles.acceptButtonText}>
                                {acceptingBidId === bid.id
                                  ? "Accepting..."
                                  : "Accept"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.counterButton, { flex: 1 }]}
                              disabled={countering}
                              onPress={() => handleCounterBid(bid)}
                            >
                              <Text style={styles.counterButtonText}>
                                Counter
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]}
              onPress={() => setShowBidsModal(false)}
            >
              <Text style={sharedStyles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InputModal
        visible={showCounterModal}
        title="Counter Offer"
        placeholder="Enter your counter amount (P)"
        keyboardType="decimal-pad"
        onSubmit={submitCounterBid}
        onCancel={() => {
          setShowCounterModal(false);
          setCounterBidTarget(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bidsModal: {
    maxHeight: "85%",
    width: "92%",
  },
  bidCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBgLight,
  },
  bidHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bidPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  bidPhotoPlaceholder: {
    backgroundColor: colors.primary + "25",
    justifyContent: "center",
    alignItems: "center",
  },
  bidPhotoInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  bidDriverName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  bidMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewProfile: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  bidAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  bidStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  bidMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  counterButton: {
    backgroundColor: colors.cardBg,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  counterButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#FF4444" + "20",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  deleteButtonText: {
    color: "#FF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
