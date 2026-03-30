import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
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

export const ProfileScreen = () => {
  const { userProfile, setUserProfile, navigate } = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile.firstName);
  const [lastName, setLastName] = useState(userProfile.lastName);
  const [phone, setPhone] = useState(userProfile.phone);

  const handleVerification = () => {
    navigate("verification");
  };

  const handleProfilePhoto = async () => {
    await showPhotoActionSheet(
      async () => {
        const image = await takePhoto();
        if (image) {
          setUserProfile({ ...userProfile, profilePhoto: image.uri });
        }
      },
      async () => {
        const image = await selectFromGallery();
        if (image) {
          setUserProfile({ ...userProfile, profilePhoto: image.uri });
        }
      },
    );
  };

  const handleSave = () => {
    setUserProfile({
      ...userProfile,
      firstName,
      lastName,
      phone,
    });
    setIsEditing(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={handleProfilePhoto}
            style={styles.profilePhotoContainer}
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
              <Text style={styles.editPhotoIcon}>📷</Text>
            </View>
          </TouchableOpacity>

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
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: colors.border },
                  ]}
                  onPress={() => setIsEditing(false)}
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
                >
                  <Text style={styles.editButtonText}>Save</Text>
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
              <TouchableOpacity
                style={sharedStyles.primaryButton}
                onPress={() => setIsEditing(true)}
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
