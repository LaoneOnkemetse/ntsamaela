import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { RegistrationPhotoButton } from "../components/RegistrationPhotoButton";
import {
  takePhoto,
  selectFromGallery,
  showPhotoActionSheet,
} from "../utils/imageUtils";
import apiService from "../services/apiService";

export const RegisterDriverScreen = () => {
  const { navigate } = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [driversLicenseFront, setDriversLicenseFront] = useState(null);
  const [driversLicenseBack, setDriversLicenseBack] = useState(null);
  const [carRegistration, setCarRegistration] = useState("");
  const [carDescription, setCarDescription] = useState("");
  const [carPhoto, setCarPhoto] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleTakeSelfie = async () => {
    const image = await takePhoto("front");
    if (image) setSelfie(image);
  };

  const submit = async () => {
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!acceptTerms) {
      Alert.alert("Error", "Please accept the terms and conditions");
      return;
    }
    if (!selfie) {
      Alert.alert("Selfie Required", "Please take a selfie for verification");
      return;
    }
    if (!driversLicenseFront || !driversLicenseBack) {
      Alert.alert(
        "Document Required",
        "Upload both front and back of Driver's License",
      );
      return;
    }
    if (!carRegistration || !carDescription) {
      Alert.alert(
        "Car Details Required",
        "Please enter car registration and description",
      );
      return;
    }

    setIsLoading(true);
    try {
      // Normalize phone number
      let normalizedPhone = phoneNumber.trim();
      if (!normalizedPhone.startsWith("+")) {
        if (normalizedPhone.startsWith("267")) {
          normalizedPhone = "+" + normalizedPhone;
        } else if (normalizedPhone.length === 8) {
          normalizedPhone = "+267" + normalizedPhone;
        } else {
          normalizedPhone = "+267" + normalizedPhone;
        }
      }

      const response = await apiService.register({
        email: `${normalizedPhone.replace("+", "")}@ntsamaela.local`,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: normalizedPhone,
        userType: "DRIVER",
      });

      if (response.success) {
        Alert.alert(
          "Success",
          "Account created successfully! Please check your phone for the verification code.",
          [{ text: "OK", onPress: () => navigate("login", true) }],
        );
      } else {
        const errorMessage =
          response.error?.message ||
          "Failed to create account. Please try again.";
        Alert.alert("Registration Failed", errorMessage);
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert(
        "Error",
        "Failed to create account. Please check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity
            onPress={() => navigate("login", true)}
            style={sharedStyles.backButton}
          >
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Driver Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={sharedStyles.formContainer}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={sharedStyles.nameRow}>
            <TextInput
              style={[sharedStyles.input, { flex: 1, marginRight: 8 }]}
              placeholder="First Name"
              placeholderTextColor={colors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[sharedStyles.input, { flex: 1, marginLeft: 8 }]}
              placeholder="Last Name"
              placeholderTextColor={colors.textTertiary}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
          <TextInput
            style={sharedStyles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.textTertiary}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <View style={sharedStyles.passwordInputWrapper}>
            <TextInput
              style={[sharedStyles.input, sharedStyles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={sharedStyles.passwordIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={sharedStyles.passwordIconText}>
                {showPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={sharedStyles.passwordInputWrapper}>
            <TextInput
              style={[sharedStyles.input, sharedStyles.passwordInput]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={sharedStyles.passwordIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={sharedStyles.passwordIconText}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={sharedStyles.documentsSection}>
            <Text style={sharedStyles.documentsTitle}>
              Identity Verification
            </Text>
            <Text style={sharedStyles.documentsSubtitle}>
              Selfie and Driver's License
            </Text>
            <RegistrationPhotoButton
              label="Selfie *"
              onPress={handleTakeSelfie}
              preview={selfie}
            />
            <RegistrationPhotoButton
              label="License Front *"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setDriversLicenseFront(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setDriversLicenseFront(img);
                  },
                )
              }
              preview={driversLicenseFront}
            />
            <RegistrationPhotoButton
              label="License Back *"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setDriversLicenseBack(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setDriversLicenseBack(img);
                  },
                )
              }
              preview={driversLicenseBack}
            />
          </View>

          <View style={sharedStyles.documentsSection}>
            <Text style={sharedStyles.documentsTitle}>Vehicle Information</Text>
            <Text style={sharedStyles.documentsSubtitle}>
              Car registration and description
            </Text>

            <Text style={sharedStyles.fieldLabel}>Car Registration *</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="e.g., B123 ABC"
              placeholderTextColor={colors.textTertiary}
              value={carRegistration}
              onChangeText={setCarRegistration}
            />

            <Text style={sharedStyles.fieldLabel}>Car Description *</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="e.g., White Toyota Corolla 2020"
              placeholderTextColor={colors.textTertiary}
              value={carDescription}
              onChangeText={setCarDescription}
            />

            <RegistrationPhotoButton
              label="Car Photo (Optional)"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto();
                    if (img) setCarPhoto(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setCarPhoto(img);
                  },
                )
              }
              preview={carPhoto}
            />
          </View>

          <View style={sharedStyles.termsContainer}>
            <TouchableOpacity
              style={sharedStyles.termsCheckbox}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <Text style={sharedStyles.checkboxText}>
                {acceptTerms ? "☑️" : "☐"}
              </Text>
            </TouchableOpacity>
            <Text style={sharedStyles.termsText}>
              I agree to the{" "}
              <Text style={sharedStyles.termsLink}>Terms and Conditions</Text>{" "}
              and <Text style={sharedStyles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[sharedStyles.primaryButton, isLoading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <Text style={sharedStyles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};
