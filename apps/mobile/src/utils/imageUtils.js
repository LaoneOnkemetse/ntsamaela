// Image utility functions
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export const requestCameraPermission = async () => {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  }
  return true;
};

export const requestMediaLibraryPermission = async () => {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }
  return true;
};

export const takePhoto = async () => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    Alert.alert(
      "Permission Required",
      "Camera permission is required to take photos",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
};

export const selectFromGallery = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    Alert.alert(
      "Permission Required",
      "Media library permission is required to select photos",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
};

export const showPhotoActionSheet = (onTakePhoto, onSelectFromGallery) => {
  Alert.alert("Select Photo", "Choose how you want to add the photo", [
    { text: "Cancel", style: "cancel" },
    { text: "Take Photo", onPress: onTakePhoto },
    { text: "Choose from Gallery", onPress: onSelectFromGallery },
  ]);
};

export const createFormData = (image, fieldName = "image") => {
  const formData = new FormData();

  if (image) {
    const fileExtension = image.uri.split(".").pop();
    formData.append(fieldName, {
      uri: image.uri,
      type: `image/${fileExtension}`,
      name: `${fieldName}_${Date.now()}.${fileExtension}`,
    });
  }

  return formData;
};
