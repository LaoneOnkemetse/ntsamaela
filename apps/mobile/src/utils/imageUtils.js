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

export const takePhoto = async (cameraType = "back") => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    Alert.alert(
      "Permission Required",
      "Camera permission is required to take photos",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    cameraType:
      cameraType === "front"
        ? ImagePicker.CameraType.front
        : ImagePicker.CameraType.back,
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
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

/** Normalize Expo ImagePicker asset into a multipart-friendly file part. */
export const resolveImageUploadPart = (image, fallbackName = "photo") => {
  if (!image?.uri) return null;

  let name =
    image.fileName ||
    image.uri.split("/").pop() ||
    `${fallbackName}-${Date.now()}.jpg`;
  let type = image.mimeType || image.type || "";

  const extFromName = (name.split(".").pop() || "").toLowerCase();
  const extFromUri = (image.uri.split(".").pop() || "").toLowerCase();
  let ext = extFromName || extFromUri || "jpg";

  if (!type || type === "image" || !String(type).includes("/")) {
    if (ext === "jpg" || ext === "jpeg") type = "image/jpeg";
    else if (ext === "png") type = "image/png";
    else if (ext === "webp") type = "image/webp";
    else type = "image/jpeg";
  }

  // API rejects HEIC/HEIF — rename so multer accepts as jpeg
  if (
    /heic|heif/i.test(type) ||
    /heic|heif/i.test(ext) ||
    /heic|heif/i.test(name)
  ) {
    type = "image/jpeg";
    ext = "jpg";
    name = name.replace(/\.(heic|heif)$/i, ".jpg");
    if (!/\.\w+$/.test(name)) name = `${name}.jpg`;
  }

  if (!/\.\w+$/.test(name)) {
    name = `${name}.${ext === "jpeg" ? "jpg" : ext}`;
  }

  return { uri: image.uri, name, type };
};

export const createFormData = (image, fieldName = "image") => {
  const formData = new FormData();
  const part = resolveImageUploadPart(image, fieldName);
  if (part) {
    formData.append(fieldName, part);
  }
  return formData;
};
