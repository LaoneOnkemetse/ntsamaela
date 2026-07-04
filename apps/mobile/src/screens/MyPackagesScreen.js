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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { getStatusColor } from "../utils/packageUtils";
import apiService from "../services/apiService";

export const MyPackagesScreen = () => {
  const { goBack, myPackages, authToken, refreshMyPackages } = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [packageBids, setPackageBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState(null);

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
        const bids = resp?.data ?? [];
        setPackageBids(Array.isArray(bids) ? bids : []);
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
            Alert.alert("Success", "Bid accepted. Package is now assigned.");
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
          {/* Pending Packages */}
          {pendingPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                ⏳ Pending ({pendingPackages.length})
              </Text>
              {pendingPackages.map((pkg) => (
                <View key={pkg.id} style={packageStyles.packageCard}>
                  <TouchableOpacity onPress={() => handleViewBids(pkg)}>
                    <View style={packageStyles.packageHeader}>
                      <Text style={packageStyles.packageId}>{pkg.id}</Text>
                      <View
                        style={[
                          packageStyles.statusBadge,
                          { backgroundColor: "#FFA500" },
                        ]}
                      >
                        <Text style={packageStyles.statusText}>Pending</Text>
                      </View>
                    </View>
                    <Text style={packageStyles.packageDesc}>
                      {pkg.description}
                    </Text>
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
                      <Text style={packageStyles.viewBidsText}>
                        Tap to view bids →
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      marginTop: 10,
                      backgroundColor: "#FF4444" + "20",
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#FF4444",
                    }}
                    onPress={() => handleDeletePackage(pkg)}
                  >
                    <Text
                      style={{
                        color: "#FF4444",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Delete Package
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* In Transit Packages */}
          {inTransitPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                🚚 In Transit ({inTransitPackages.length})
              </Text>
              {inTransitPackages.map((pkg) => (
                <View key={pkg.id} style={packageStyles.packageCard}>
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <View
                      style={[
                        packageStyles.statusBadge,
                        getStatusColor("in-transit"),
                      ]}
                    >
                      <Text style={packageStyles.statusText}>In Transit</Text>
                    </View>
                  </View>
                  <Text style={packageStyles.packageDesc}>
                    {pkg.description}
                  </Text>
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
                    {pkg.driverPhoto && (
                      <Image
                        source={{ uri: pkg.driverPhoto }}
                        style={packageStyles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={packageStyles.packageDriver}>
                        Driver: {pkg.driver}
                      </Text>
                    </View>
                    <Text style={packageStyles.packagePrice}>
                      P {pkg.priceOffered}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Delivered Packages */}
          {deliveredPackages.length > 0 && (
            <>
              <Text style={packageStyles.sectionTitle}>
                ✅ Delivered ({deliveredPackages.length})
              </Text>
              {deliveredPackages.map((pkg) => (
                <View key={pkg.id} style={packageStyles.packageCard}>
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <View
                      style={[
                        packageStyles.statusBadge,
                        getStatusColor("delivered"),
                      ]}
                    >
                      <Text style={packageStyles.statusText}>Delivered</Text>
                    </View>
                  </View>
                  <Text style={packageStyles.packageDesc}>
                    {pkg.description}
                  </Text>
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
                    {pkg.driverPhoto && (
                      <Image
                        source={{ uri: pkg.driverPhoto }}
                        style={packageStyles.packageDriverPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={packageStyles.packageDriver}>
                        Driver: {pkg.driver}
                      </Text>
                    </View>
                    <Text style={packageStyles.packagePrice}>
                      P {pkg.priceOffered}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bids Modal */}
      <Modal
        visible={showBidsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBidsModal(false)}
      >
        <View style={sharedStyles.modalOverlay}>
          <View style={[sharedStyles.modalContent, { maxHeight: "80%" }]}>
            <View style={packageStyles.modalTitleRow}>
              <Text style={sharedStyles.modalTitle}>
                Package {selectedPackage?.id}
              </Text>
              <TouchableOpacity
                style={packageStyles.modalCloseButton}
                onPress={() => setShowBidsModal(false)}
              >
                <Text style={packageStyles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={sharedStyles.modalSubtitle}>
              Status: {(selectedPackage?.status || "PENDING").toString()}
            </Text>
            <Text style={sharedStyles.modalSubtitle}>
              Offer: P {selectedPackage?.priceOffered}
            </Text>

            {bidsLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : packageBids.length === 0 ? (
              <Text style={sharedStyles.modalSubtitle}>
                No bids yet. Drivers can bid from Available Packages.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 280, marginTop: 12 }}>
                {packageBids.map((bid) => {
                  const driverName = bid.driver?.user
                    ? `${bid.driver.user.firstName || ""} ${bid.driver.user.lastName || ""}`.trim()
                    : "Driver";
                  const status = (bid.status || "PENDING").toString();
                  return (
                    <View
                      key={bid.id}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#333",
                      }}
                    >
                      <Text style={sharedStyles.modalSubtitle}>
                        {driverName} • P {bid.amount} • {status}
                      </Text>
                      {status === "PENDING" && (
                        <TouchableOpacity
                          style={[sharedStyles.modalButton, { marginTop: 8 }]}
                          disabled={acceptingBidId === bid.id}
                          onPress={() => handleAcceptBid(bid)}
                        >
                          <Text style={sharedStyles.modalButtonText}>
                            {acceptingBidId === bid.id
                              ? "Accepting..."
                              : "Accept bid"}
                          </Text>
                        </TouchableOpacity>
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
    </View>
  );
};
