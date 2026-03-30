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

export const RegisterCustomerScreen = () => {
  const { navigate } = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [passportFront, setPassportFront] = useState(null);
  const [passportBack, setPassportBack] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const takeSelfie = async () => {
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
    if (!idFront || !idBack) {
      if (!passportFront || !passportBack) {
        Alert.alert(
          "Document Required",
          "Upload ID front/back or Passport front/back",
        );
        return;
      }
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
        userType: "CUSTOMER",
      });

      if (response.success) {
        const token = response.data?.token;
        if (token && (idFront || passportFront) && selfie) {
          apiService.setToken(token);
          const formData = new FormData();
          const front = idFront || passportFront;
          const back = idBack || passportBack;
          const frontUri =
            typeof front === "string" ? front : (front?.uri ?? front);
          const backUri =
            back && (typeof back === "string" ? back : (back?.uri ?? back));
          const selfieUri =
            typeof selfie === "string" ? selfie : (selfie?.uri ?? selfie);
          formData.append("frontImage", {
            uri: frontUri,
            type: "image/jpeg",
            name: "front.jpg",
          });
          if (backUri) {
            formData.append("backImage", {
              uri: backUri,
              type: "image/jpeg",
              name: "back.jpg",
            });
          }
          formData.append("selfieImage", {
            uri: selfieUri,
            type: "image/jpeg",
            name: "selfie.jpg",
          });
          formData.append("documentType", idFront ? "NATIONAL_ID" : "PASSPORT");
          // Backend validation requires userType for verification submit
          formData.append("userType", "CUSTOMER");
          try {
            const verifyResponse =
              await apiService.submitVerification(formData);
            if (!verifyResponse.success) {
              Alert.alert(
                "Verification upload failed",
                verifyResponse.error?.message ||
                  "Documents could not be uploaded. You can submit them later from Profile.",
              );
            }
          } catch (e) {
            console.warn("Verification submit after register:", e);
            Alert.alert(
              "Verification upload failed",
              e?.message ||
                "Documents could not be uploaded. You can submit them later from Profile.",
            );
          }
        }
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
        error?.message ||
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
          <Text style={sharedStyles.headerTitle}>Customer Registration</Text>
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
              Selfie required; ID or Passport
            </Text>
            <RegistrationPhotoButton
              label="Selfie *"
              onPress={takeSelfie}
              preview={selfie}
            />
            <RegistrationPhotoButton
              label="ID Front *"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setIdFront(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setIdFront(img);
                  },
                )
              }
              preview={idFront}
            />
            <RegistrationPhotoButton
              label="ID Back *"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setIdBack(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setIdBack(img);
                  },
                )
              }
              preview={idBack}
            />
            <Text style={sharedStyles.documentNote}>
              Or use Passport instead:
            </Text>
            <RegistrationPhotoButton
              label="Passport Front"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setPassportFront(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setPassportFront(img);
                  },
                )
              }
              preview={passportFront}
            />
            <RegistrationPhotoButton
              label="Passport Back"
              onPress={() =>
                showPhotoActionSheet(
                  async () => {
                    const img = await takePhoto("back");
                    if (img) setPassportBack(img);
                  },
                  async () => {
                    const img = await selectFromGallery();
                    if (img) setPassportBack(img);
                  },
                )
              }
              preview={passportBack}
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
