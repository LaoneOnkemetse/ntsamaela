import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { RegistrationPhotoButton } from "../components/RegistrationPhotoButton";
import {
  takePhoto,
  selectFromGallery,
  showPhotoActionSheet,
} from "../utils/imageUtils";
import apiService from "../services/apiService";

export const VerificationScreen = () => {
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [documentType, setDocumentType] = useState("DRIVERS_LICENSE");
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const response = await apiService.getVerificationStatus();
      if (response.success && response.data) {
        setVerificationStatus(response.data);
        if (
          response.data.status === "APPROVED" ||
          response.data.status === "REJECTED"
        ) {
          // Already verified, show status
          setFrontImage({ uri: response.data.frontImageUrl });
          if (response.data.backImageUrl) {
            setBackImage({ uri: response.data.backImageUrl });
          }
          setSelfieImage({ uri: response.data.selfieImageUrl });
          setDocumentType(response.data.documentType);
        }
      }
    } catch (error) {
      console.error("Failed to load verification status:", error);
    }
  };

  const handleTakeFrontPhoto = async () => {
    const image = await takePhoto();
    if (image) setFrontImage(image);
  };

  const handleSelectFrontPhoto = async () => {
    const image = await selectFromGallery();
    if (image) setFrontImage(image);
  };

  const handleFrontPhotoAction = () => {
    showPhotoActionSheet(handleTakeFrontPhoto, handleSelectFrontPhoto);
  };

  const handleTakeBackPhoto = async () => {
    const image = await takePhoto();
    if (image) setBackImage(image);
  };

  const handleSelectBackPhoto = async () => {
    const image = await selectFromGallery();
    if (image) setBackImage(image);
  };

  const handleBackPhotoAction = () => {
    showPhotoActionSheet(handleTakeBackPhoto, handleSelectBackPhoto);
  };

  const handleTakeSelfie = async () => {
    const image = await takePhoto();
    if (image) setSelfieImage(image);
  };

  const handleSelectSelfie = async () => {
    const image = await selectFromGallery();
    if (image) setSelfieImage(image);
  };

  const handleSelfieAction = () => {
    showPhotoActionSheet(handleTakeSelfie, handleSelectSelfie);
  };

  const handleSubmit = async () => {
    if (!frontImage || !selfieImage) {
      Alert.alert(
        "Missing Information",
        "Please provide front document image and selfie",
      );
      return;
    }

    if (documentType !== "PASSPORT" && !backImage) {
      Alert.alert("Missing Information", "Please provide back document image");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // Add images
      formData.append("frontImage", {
        uri: frontImage.uri,
        type: "image/jpeg",
        name: "front.jpg",
      });

      if (backImage) {
        formData.append("backImage", {
          uri: backImage.uri,
          type: "image/jpeg",
          name: "back.jpg",
        });
      }

      formData.append("selfieImage", {
        uri: selfieImage.uri,
        type: "image/jpeg",
        name: "selfie.jpg",
      });

      formData.append("documentType", documentType);
      // Backend validation requires userType for verification submit
      formData.append("userType", "CUSTOMER");

      const response = await apiService.submitVerification(formData);

      if (response.success) {
        Alert.alert(
          "Success",
          "Verification submitted successfully. Your documents are under review.",
          [{ text: "OK", onPress: () => loadVerificationStatus() }],
        );
      } else {
        Alert.alert(
          "Error",
          response.error?.message || "Failed to submit verification",
        );
      }
    } catch (error) {
      console.error("Verification submission error:", error);
      Alert.alert("Error", error.message || "Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return colors.success;
      case "REJECTED":
        return colors.error;
      case "PENDING":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case "APPROVED":
        return "Your verification has been approved!";
      case "REJECTED":
        return (
          verificationStatus?.rejectionReason ||
          "Your verification was rejected. Please review and resubmit."
        );
      case "PENDING":
        return "Your verification is under review. Please wait for admin approval.";
      default:
        return "Please submit your verification documents.";
    }
  };

  const canEdit =
    !verificationStatus || verificationStatus.status === "REJECTED";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Identity Verification</Text>

        {verificationStatus && (
          <View
            style={[
              styles.statusCard,
              { borderColor: getStatusColor(verificationStatus.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(verificationStatus.status) },
              ]}
            >
              Status: {verificationStatus.status}
            </Text>
            <Text style={styles.statusMessage}>
              {getStatusMessage(verificationStatus.status)}
            </Text>
            {verificationStatus.riskScore && (
              <Text style={styles.scoreText}>
                Risk Score: {verificationStatus.riskScore.toFixed(2)}
              </Text>
            )}
          </View>
        )}

        {canEdit && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Document Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    documentType === "DRIVERS_LICENSE" &&
                      styles.radioButtonActive,
                  ]}
                  onPress={() => setDocumentType("DRIVERS_LICENSE")}
                >
                  <Text
                    style={[
                      styles.radioText,
                      documentType === "DRIVERS_LICENSE" &&
                        styles.radioTextActive,
                    ]}
                  >
                    Driver's License
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    documentType === "PASSPORT" && styles.radioButtonActive,
                  ]}
                  onPress={() => setDocumentType("PASSPORT")}
                >
                  <Text
                    style={[
                      styles.radioText,
                      documentType === "PASSPORT" && styles.radioTextActive,
                    ]}
                  >
                    Passport
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    documentType === "NATIONAL_ID" && styles.radioButtonActive,
                  ]}
                  onPress={() => setDocumentType("NATIONAL_ID")}
                >
                  <Text
                    style={[
                      styles.radioText,
                      documentType === "NATIONAL_ID" && styles.radioTextActive,
                    ]}
                  >
                    National ID
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <RegistrationPhotoButton
                label="Front of Document"
                onPress={handleFrontPhotoAction}
                preview={frontImage}
              />
            </View>

            {documentType !== "PASSPORT" && (
              <View style={styles.section}>
                <RegistrationPhotoButton
                  label="Back of Document"
                  onPress={handleBackPhotoAction}
                  preview={backImage}
                />
              </View>
            )}

            <View style={styles.section}>
              <RegistrationPhotoButton
                label="Selfie Photo"
                onPress={handleSelfieAction}
                preview={selfieImage}
              />
              <Text style={styles.helpText}>
                Take a clear selfie to verify your identity matches your
                document
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Verification</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: colors.cardBg,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBgLight,
  },
  radioButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  radioTextActive: {
    color: colors.textLight,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
});
