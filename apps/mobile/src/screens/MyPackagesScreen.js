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
        "Use Cancel Package for in-transit deliveries (a 10% fee applies).",
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

  const handleCancelPackage = (pkg) => {
    const accepted = getAcceptedBid(pkg);
    const base = accepted?.amount || pkg.priceOffered || 0;
    const fee = (Number(base) * 0.1).toFixed(2);
    Alert.alert(
      "Cancel package",
      `Cancelling an accepted or in-transit package charges a 10% fee (P ${fee}) from your wallet.\n\nContinue?`,
      [
        { text: "Keep package", style: "cancel" },
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
                  `Package cancelled. Fee charged: P ${resp?.data?.fee ?? fee}`,
              );
              if (refreshMyPackages) await refreshMyPackages(authToken);
            } catch (e) {
              Alert.alert("Cancel failed", e?.message || "Could not cancel");
            }
          },
        },
      ],
    );
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
      driverId,
      driver: bid.driver,
    });
  };

  const handleCounterBid = (bid) => {
    setCounterBidTarget(bid);
    setShowCounterModal(true);
  };

  const submitCounterBid = async (amount) => {
    if (!counterBidTarget) {
      setShowCounterModal(false);
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid counter price.");
      return;
    }
    setShowCounterModal(false);
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
          resp?.error?.message ||
            (Array.isArray(resp?.error?.details)
              ? resp.error.details
                  .map((d) => d.msg || d.message || d)
                  .join("\n")
              : "Could not send counter offer"),
        );
        return;
      }
      Alert.alert(
        "Counter sent",
        `Your counter of P ${parsed} replaced the previous offer. Status: pending — awaiting driver. You can update your counter anytime.`,
      );
      if (selectedPackage?.id) {
        await loadBidsForPackage(selectedPackage.id);
        setSelectedPackage((prev) =>
          prev ? { ...prev, priceOffered: parsed } : prev,
        );
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

  const shortPackageId = (id) =>
    id ? `PKG-${String(id).slice(-6).toUpperCase()}` : "—";

  const getAcceptedBid = (pkg) =>
    (pkg.bids || []).find(
      (b) => (b.status || "").toString().toUpperCase() === "ACCEPTED",
    );

  const handleTrackPackage = (pkg) => {
    navigate("tracking", false, { packageId: pkg.id });
  };

  const handleViewAssignedDriver = (pkg) => {
    const bid = getAcceptedBid(pkg);
    const driverId = bid?.driver?.id;
    if (!driverId) {
      Alert.alert("Driver", "Driver details are not available yet.");
      return;
    }
    navigate("driverProfile", false, {
      driverId,
      driver: bid.driver,
    });
  };

  const renderPackageCard = (pkg, options = {}) => {
    const {
      showBids = false,
      statusLabel,
      statusColor,
      showDriver = false,
    } = options;
    const acceptedBid = showDriver ? getAcceptedBid(pkg) : null;
    const driver = acceptedBid?.driver;
    const driverName = driver?.user
      ? `${driver.user.firstName || ""} ${driver.user.lastName || ""}`.trim()
      : null;
    const driverPhoto =
      driver?.user?.profilePictureUrl || driver?.carPhotoUrl || null;

    return (
      <View key={pkg.id} style={packageStyles.packageCard}>
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
              typeof statusColor === "string"
                ? { backgroundColor: statusColor }
                : statusColor || getStatusColor(statusLabel?.toLowerCase()),
            ]}
          >
            <Text style={packageStyles.statusText}>
              {statusLabel || "Pending"}
            </Text>
          </View>
        </View>

        {showBids ? (
          <TouchableOpacity onPress={() => handleViewBids(pkg)}>
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
                P {acceptedBid?.amount || pkg.priceOffered}
              </Text>
            </View>
          </>
        )}

        {showDriver && (
          <View style={styles.assignedDriverBox}>
            <TouchableOpacity
              style={styles.assignedDriverRow}
              onPress={() => handleViewAssignedDriver(pkg)}
            >
              {driverPhoto ? (
                <Image
                  source={{ uri: driverPhoto }}
                  style={styles.driverThumb}
                />
              ) : (
                <View
                  style={[styles.driverThumb, styles.driverThumbPlaceholder]}
                >
                  <Text style={styles.driverThumbInitial}>
                    {(driverName?.[0] || "D").toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.assignedLabel}>Assigned driver</Text>
                <Text style={styles.assignedName}>
                  {driverName || "Driver assigned"}
                </Text>
                {driver?.vehicleType ? (
                  <Text style={styles.assignedMeta}>
                    🚗 {driver.vehicleType}
                  </Text>
                ) : null}
                {driver?.licensePlate ? (
                  <Text style={styles.assignedMeta}>
                    🔖 {driver.licensePlate}
                  </Text>
                ) : null}
                {driver?.locationName ||
                (driver?.lastLatitude != null &&
                  driver?.lastLongitude != null) ? (
                  <Text style={styles.assignedMeta}>
                    📌{" "}
                    {driver.locationName ||
                      `${Number(driver.lastLatitude).toFixed(4)}, ${Number(driver.lastLongitude).toFixed(4)}`}
                  </Text>
                ) : null}
                {driver?.user?.phone ? (
                  <Text style={styles.assignedMeta}>
                    📞 {driver.user.phone}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.viewProfile}>Profile →</Text>
            </TouchableOpacity>
            {driver?.carPhotoUrl ? (
              <Image
                source={{ uri: driver.carPhotoUrl }}
                style={styles.assignedCarPhoto}
                resizeMode="cover"
              />
            ) : null}
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => handleTrackPackage(pkg)}
            >
              <Text style={styles.trackButtonText}>Track Package</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelAcceptedButton}
              onPress={() => handleCancelPackage(pkg)}
            >
              <Text style={styles.cancelAcceptedButtonText}>
                Cancel (10% fee)
              </Text>
            </TouchableOpacity>
          </View>
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
                  showDriver: true,
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
                  showDriver: true,
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
                  const photo =
                    driver?.carPhotoUrl || driver?.user?.profilePictureUrl;
                  const status = (bid.status || "PENDING")
                    .toString()
                    .toUpperCase();
                  const offerFrom = (bid.offerFrom || "DRIVER")
                    .toString()
                    .toUpperCase();
                  const isCustomerCounter =
                    status === "CUSTOMER_COUNTER" || offerFrom === "CUSTOMER";
                  const isDriverOffer =
                    !isCustomerCounter &&
                    (status === "PENDING" || status === "DRIVER_COUNTER");
                  const packagePending =
                    (selectedPackage?.status || "").toUpperCase() === "PENDING";
                  const locationLabel =
                    bid.bidLocationName ||
                    driver?.locationName ||
                    (bid.bidLatitude != null && bid.bidLongitude != null
                      ? `${Number(bid.bidLatitude).toFixed(4)}, ${Number(bid.bidLongitude).toFixed(4)}`
                      : driver?.lastLatitude != null &&
                          driver?.lastLongitude != null
                        ? `${Number(driver.lastLatitude).toFixed(4)}, ${Number(driver.lastLongitude).toFixed(4)}`
                        : null);

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
                            {driver?.licensePlate
                              ? ` • ${driver.licensePlate}`
                              : ""}
                          </Text>
                          {driver?.licensePlate ? (
                            <Text style={styles.bidMeta}>
                              🔖 Registration: {driver.licensePlate}
                            </Text>
                          ) : (
                            <Text style={styles.bidMeta}>
                              🔖 Registration not provided
                            </Text>
                          )}
                          {isCustomerCounter ? (
                            <Text
                              style={[
                                styles.bidMeta,
                                { color: colors.primary, fontWeight: "700" },
                              ]}
                            >
                              Pending — awaiting driver
                            </Text>
                          ) : status === "DRIVER_COUNTER" ? (
                            <Text
                              style={[
                                styles.bidMeta,
                                { color: colors.primary, fontWeight: "700" },
                              ]}
                            >
                              Driver counter — your turn
                            </Text>
                          ) : null}
                          {locationLabel ? (
                            <Text style={styles.bidMeta}>
                              📌 Location: {locationLabel}
                            </Text>
                          ) : (
                            <Text style={styles.bidMeta}>
                              📌 Location not available yet
                            </Text>
                          )}
                        </View>
                        <Text style={styles.viewProfile}>View →</Text>
                      </TouchableOpacity>
                      {driver?.carPhotoUrl ? (
                        <Image
                          source={{ uri: driver.carPhotoUrl }}
                          style={styles.bidCarPhoto}
                          resizeMode="cover"
                        />
                      ) : null}

                      <View style={styles.bidAmountRow}>
                        <Text style={styles.bidAmount}>P {bid.amount}</Text>
                        <Text style={styles.bidStatus}>
                          {isCustomerCounter
                            ? "AWAITING DRIVER"
                            : status === "DRIVER_COUNTER"
                              ? "DRIVER COUNTER"
                              : status}
                        </Text>
                      </View>

                      {bid.message ? (
                        <Text style={styles.bidMessage}>{bid.message}</Text>
                      ) : null}

                      {isDriverOffer && packagePending ? (
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
                      ) : null}

                      {isCustomerCounter && packagePending ? (
                        <TouchableOpacity
                          style={styles.counterButton}
                          disabled={countering}
                          onPress={() => handleCounterBid(bid)}
                        >
                          <Text style={styles.counterButtonText}>
                            Update bid
                          </Text>
                        </TouchableOpacity>
                      ) : null}
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
  bidCarPhoto: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: colors.border,
  },
  assignedCarPhoto: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: colors.border,
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
  packageIdLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  assignedDriverBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignedDriverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  driverThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverThumbPlaceholder: {
    backgroundColor: colors.primary + "25",
    justifyContent: "center",
    alignItems: "center",
  },
  driverThumbInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  assignedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  assignedName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  assignedMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  trackButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancelAcceptedButton: {
    marginTop: 8,
    backgroundColor: "#FF444420",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  cancelAcceptedButtonText: {
    color: "#FF4444",
    fontWeight: "700",
  },
});
