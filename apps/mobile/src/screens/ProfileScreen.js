import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { useNavigation } from "../navigation/NavigationContext";
import {
  takePhoto,
  selectFromGallery,
  showPhotoActionSheet,
} from "../utils/imageUtils";
import apiService from "../services/apiService";

export const ProfileScreen = () => {
  const { userProfile, setUserProfile, navigate, userType, authToken } =
    useNavigation();
  const isDriver = (userType || "").toLowerCase() === "driver";
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [firstName, setFirstName] = useState(userProfile.firstName);
  const [lastName, setLastName] = useState(userProfile.lastName);
  const [phone, setPhone] = useState(userProfile.phone);
  const [carRegistration, setCarRegistration] = useState(
    userProfile.licensePlate || "",
  );
  const [carDescription, setCarDescription] = useState(
    userProfile.carDescription || "",
  );
  const [carPhotoUri, setCarPhotoUri] = useState(
    userProfile.carPhotoUrl || null,
  );
  const [carPhotoFile, setCarPhotoFile] = useState(null);

  useEffect(() => {
    setFirstName(userProfile.firstName || "");
    setLastName(userProfile.lastName || "");
    setPhone(userProfile.phone || "");
    setCarRegistration(userProfile.licensePlate || "");
    setCarDescription(userProfile.carDescription || "");
    if (!carPhotoFile) {
      setCarPhotoUri(userProfile.carPhotoUrl || null);
    }
  }, [
    userProfile.firstName,
    userProfile.lastName,
    userProfile.phone,
    userProfile.licensePlate,
    userProfile.carDescription,
    userProfile.carPhotoUrl,
  ]);

  useEffect(() => {
    if (!isDriver || !authToken) return;
    let cancelled = false;
    (async () => {
      try {
        apiService.setToken(authToken);
        const resp = await apiService.getDriverProfile();
        const driver = resp?.data ?? resp;
        if (cancelled || !driver) return;
        setUserProfile((prev) => ({
          ...prev,
          licensePlate: driver.licensePlate ?? prev.licensePlate,
          carDescription: driver.carDescription ?? prev.carDescription,
          carPhotoUrl: driver.carPhotoUrl ?? prev.carPhotoUrl,
          vehicleType: driver.vehicleType ?? prev.vehicleType,
        }));
      } catch (e) {
        console.warn("Failed to load driver vehicle profile:", e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDriver, authToken]);

  const handleVerification = () => {
    navigate("verification");
  };

  const uploadAndSetProfilePhoto = async (image) => {
    if (!image?.uri) return;
    if (!authToken) {
      Alert.alert(
        "Sign in required",
        "Please sign in again to save your photo.",
      );
      return;
    }
    setUploadingPhoto(true);
    setUserProfile((prev) => ({ ...prev, profilePhoto: image.uri }));
    try {
      apiService.setToken(authToken);
      const resp = await apiService.uploadProfilePicture(image.uri);
      if (resp?.success === false) {
        throw new Error(resp?.error?.message || "Upload failed");
      }
      const url =
        resp?.data?.profilePictureUrl ||
        resp?.data?.user?.profilePictureUrl ||
        resp?.profilePictureUrl ||
        image.uri;
      setUserProfile((prev) => ({ ...prev, profilePhoto: url }));
      Alert.alert("Saved", "Profile photo updated.");
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e?.message || "Could not save profile photo. Try again.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleProfilePhoto = async () => {
    await showPhotoActionSheet(
      async () => {
        const image = await takePhoto();
        if (image) await uploadAndSetProfilePhoto(image);
      },
      async () => {
        const image = await selectFromGallery();
        if (image) await uploadAndSetProfilePhoto(image);
      },
    );
  };

  const handleCarPhoto = async () => {
    await showPhotoActionSheet(
      async () => {
        const image = await takePhoto();
        if (image) {
          setCarPhotoFile(image);
          setCarPhotoUri(image.uri);
        }
      },
      async () => {
        const image = await selectFromGallery();
        if (image) {
          setCarPhotoFile(image);
          setCarPhotoUri(image.uri);
        }
      },
    );
  };

  const handleSave = async () => {
    if (isDriver) {
      if (!carRegistration.trim() || !carDescription.trim()) {
        Alert.alert(
          "Vehicle required",
          "Car registration and description are required for drivers.",
        );
        return;
      }
    }

    setSaving(true);
    try {
      setUserProfile((prev) => ({
        ...prev,
        firstName,
        lastName,
        phone,
        ...(isDriver
          ? {
              licensePlate: carRegistration.trim(),
              carDescription: carDescription.trim(),
              carPhotoUrl: carPhotoUri,
            }
          : {}),
      }));

      if (isDriver) {
        apiService.setToken(authToken);
        const resp = await apiService.updateDriverVehicleDetails({
          carRegistration: carRegistration.trim(),
          carDescription: carDescription.trim(),
        });
        if (resp?.success === false) {
          throw new Error(
            resp?.error?.message ||
              (Array.isArray(resp?.error?.details)
                ? resp.error.details.map((d) => d.msg || d).join("\n")
                : `Could not save vehicle details${resp?.statusCode ? ` (${resp.statusCode})` : ""}`),
          );
        }

        let updated = resp?.data ?? resp;

        if (carPhotoFile?.uri) {
          const formData = new FormData();
          formData.append("carRegistration", carRegistration.trim());
          formData.append("carDescription", carDescription.trim());
          formData.append("carPhoto", {
            uri: carPhotoFile.uri,
            name: carPhotoFile.fileName || `car-${Date.now()}.jpg`,
            type: carPhotoFile.type || "image/jpeg",
          });
          const photoResp = await apiService.updateDriverProfile(formData);
          if (photoResp?.success === false) {
            Alert.alert(
              "Photo warning",
              photoResp?.error?.message ||
                "Registration saved, but car photo upload failed. Try the photo again.",
            );
          } else {
            updated = photoResp?.data ?? photoResp ?? updated;
          }
        }

        if (updated) {
          setUserProfile((prev) => ({
            ...prev,
            licensePlate: updated.licensePlate ?? carRegistration.trim(),
            carDescription: updated.carDescription ?? carDescription.trim(),
            carPhotoUrl: updated.carPhotoUrl ?? carPhotoUri,
          }));
        }
        setCarPhotoFile(null);
      }

      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e) {
      Alert.alert(
        "Update failed",
        e?.message || "Could not save profile. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setCarRegistration(userProfile.licensePlate || "");
    setCarDescription(userProfile.carDescription || "");
    setCarPhotoUri(userProfile.carPhotoUrl || null);
    setCarPhotoFile(null);
    setIsEditing(true);
  };

  const needsProfilePhoto = !userProfile.profilePhoto;

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={handleProfilePhoto}
            style={styles.profilePhotoContainer}
            disabled={uploadingPhoto}
          >
            {userProfile.profilePhoto ? (
              <Image
                source={{ uri: userProfile.profilePhoto }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profilePhotoText}>
                  {userProfile.firstName?.charAt(0) || ""}
                  {userProfile.lastName?.charAt(0) || ""}
                </Text>
              </View>
            )}
            <View style={styles.editPhotoButton}>
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.textLight} size="small" />
              ) : (
                <Text style={styles.editPhotoIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>

          {needsProfilePhoto ? (
            <Text style={styles.photoRequired}>
              Profile photo is required — tap the camera to add one
            </Text>
          ) : null}

          <Text style={styles.profileName}>
            {userProfile.firstName} {userProfile.lastName}
          </Text>
          <Text style={styles.profileEmail}>{userProfile.phone}</Text>
        </View>

        <View style={styles.profileSection}>
          {isEditing ? (
            <>
              <TextInput
                style={sharedStyles.input}
                placeholder="First Name"
                placeholderTextColor={colors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={sharedStyles.input}
                placeholder="Last Name"
                placeholderTextColor={colors.textTertiary}
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={sharedStyles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              {isDriver ? (
                <>
                  <Text style={styles.sectionLabel}>Vehicle details</Text>
                  <TextInput
                    style={sharedStyles.input}
                    placeholder="Car registration number *"
                    placeholderTextColor={colors.textTertiary}
                    value={carRegistration}
                    onChangeText={setCarRegistration}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    style={[sharedStyles.input, styles.multiline]}
                    placeholder="Car description (make, colour, model) *"
                    placeholderTextColor={colors.textTertiary}
                    value={carDescription}
                    onChangeText={setCarDescription}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.carPhotoButton}
                    onPress={handleCarPhoto}
                  >
                    {carPhotoUri ? (
                      <Image
                        source={{ uri: carPhotoUri }}
                        style={styles.carPhotoPreview}
                      />
                    ) : (
                      <Text style={styles.carPhotoButtonText}>
                        📷 Add car photo
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: colors.border },
                  ]}
                  onPress={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.editButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.editButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>First Name</Text>
                <Text style={styles.profileFieldValue}>
                  {userProfile.firstName}
                </Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Last Name</Text>
                <Text style={styles.profileFieldValue}>
                  {userProfile.lastName}
                </Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Phone</Text>
                <Text style={styles.profileFieldValue}>
                  {userProfile.phone}
                </Text>
              </View>
              {isDriver ? (
                <>
                  <View style={styles.profileField}>
                    <Text style={styles.profileFieldLabel}>
                      Car registration
                    </Text>
                    <Text style={styles.profileFieldValue}>
                      {userProfile.licensePlate || "Not provided"}
                    </Text>
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.profileFieldLabel}>
                      Car description
                    </Text>
                    <Text style={styles.profileFieldValue}>
                      {userProfile.carDescription || "Not provided"}
                    </Text>
                  </View>
                  <View style={styles.profileField}>
                    <Text style={styles.profileFieldLabel}>Car photo</Text>
                    {userProfile.carPhotoUrl ? (
                      <Image
                        source={{ uri: userProfile.carPhotoUrl }}
                        style={styles.carPhotoDisplay}
                      />
                    ) : (
                      <Text style={styles.profileFieldValue}>
                        Not provided — add one when editing
                      </Text>
                    )}
                  </View>
                </>
              ) : null}
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>
                  Verification Status
                </Text>
                <Text
                  style={[
                    styles.profileFieldValue,
                    {
                      color: userProfile.isVerified
                        ? colors.success
                        : colors.warning || "#FFA500",
                    },
                  ]}
                >
                  {userProfile.isVerified ? "✓ Verified" : "⚠ Not Verified"}
                </Text>
              </View>
              {!userProfile.isVerified && (
                <TouchableOpacity
                  style={[sharedStyles.primaryButton, { marginBottom: 12 }]}
                  onPress={handleVerification}
                >
                  <Text style={sharedStyles.primaryButtonText}>
                    Complete Verification
                  </Text>
                </TouchableOpacity>
              )}
              {needsProfilePhoto ? (
                <TouchableOpacity
                  style={[sharedStyles.primaryButton, { marginBottom: 12 }]}
                  onPress={handleProfilePhoto}
                >
                  <Text style={sharedStyles.primaryButtonText}>
                    Add Profile Photo
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={sharedStyles.primaryButton}
                onPress={startEditing}
              >
                <Text style={sharedStyles.primaryButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = {
  profileHeader: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.cardBg,
  },
  profilePhotoContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  profilePhotoText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textLight,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent || "#FFA500",
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoIcon: {
    fontSize: 20,
  },
  photoRequired: {
    color: colors.warning || "#FFA500",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileSection: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  profileField: {
    marginBottom: 20,
  },
  profileFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  carPhotoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 10,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: colors.cardBg,
  },
  carPhotoButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  carPhotoPreview: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  carPhotoDisplay: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: colors.border,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
};
