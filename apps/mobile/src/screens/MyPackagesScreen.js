import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { getStatusColor } from "../utils/packageUtils";

export const MyPackagesScreen = () => {
  const { goBack, myPackages } = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);

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

  const handleViewBids = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidsModal(true);
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
                <TouchableOpacity
                  key={pkg.id}
                  style={packageStyles.packageCard}
                  onPress={() => handleViewBids(pkg)}
                >
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
                      Tap to view →
                    </Text>
                  </View>
                </TouchableOpacity>
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
