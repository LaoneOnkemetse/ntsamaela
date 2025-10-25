// React Native Mock
import React from 'react';

// Mock React Native components
export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const TouchableHighlight = 'TouchableHighlight';
export const TextInput = 'TextInput';
export const FlatList = 'FlatList';
export const SectionList = 'SectionList';
export const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
};

// Mock React Native modules
export const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios || obj.default,
};

export const Dimensions = {
  get: () => ({ width: 375, height: 667 }),
  addEventListener: () => {},
  removeEventListener: () => {},
};

export const Alert = {
  alert: jest.fn(),
};

export const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
};

export const AsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
};

export const NetInfo = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
};

export const PermissionsAndroid = {
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve(true)),
  PERMISSIONS: {
    CAMERA: 'android.permission.CAMERA',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
};

export const ImagePicker = {
  launchImageLibrary: jest.fn(() => Promise.resolve({ assets: [] })),
  launchCamera: jest.fn(() => Promise.resolve({ assets: [] })),
};

export const DeviceInfo = {
  getModel: jest.fn(() => Promise.resolve('iPhone')),
  getVersion: jest.fn(() => Promise.resolve('1.0.0')),
  getBuildNumber: jest.fn(() => Promise.resolve('1')),
};

export default {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  TextInput,
  FlatList,
  SectionList,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  Linking,
  AsyncStorage,
  NetInfo,
  PermissionsAndroid,
  ImagePicker,
  DeviceInfo,
};
