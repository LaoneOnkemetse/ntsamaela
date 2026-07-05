import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import apiService from "../services/apiService";
import socketService from "../services/socketService";
import { API_CONFIG } from "../constants/config";

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState("loading");
  const [screenHistory, setScreenHistory] = useState(["loading"]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [authToken, setAuthToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [screenParams, setScreenParams] = useState({});

  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    profilePhoto: null,
    rating: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
    isVerified: false,
    phoneVerified: false,
    email: "",
    userId: null,
  });

  const [customerWallet, setCustomerWallet] = useState(0);
  const [driverWallet, setDriverWallet] = useState(0);
  const [myPackages, setMyPackages] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [upcomingTrips, setUpcomingTrips] = useState([]); // TODO: replace with API-driven trips for customer browsing
  const [isActiveDriver, setIsActiveDriver] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);

  const refreshSession = async (token) => {
    if (!token) return;
    try {
      apiService.setToken(token);
      const [fullProfile, walletBalance] = await Promise.all([
        fetchUserProfile(token),
        fetchWalletBalance(token),
      ]);

      if (fullProfile) {
        setUserProfile((prev) => ({
          ...prev,
          firstName: fullProfile.firstName ?? prev.firstName,
          lastName: fullProfile.lastName ?? prev.lastName,
          phone: fullProfile.phone ?? prev.phone,
          profilePhoto: fullProfile.profilePictureUrl ?? prev.profilePhoto,
          email: fullProfile.email ?? prev.email,
          userId: fullProfile.id ?? prev.userId,
          isVerified: Boolean(fullProfile.identityVerified),
        }));
      }

      if (typeof walletBalance === "number") {
        if ((userType || "").toLowerCase() === "customer") {
          setCustomerWallet(walletBalance);
        } else if ((userType || "").toLowerCase() === "driver") {
          setDriverWallet(walletBalance);
        }
      }

      if ((userType || "").toLowerCase() === "driver") {
        try {
          const driverResp = await apiService.getDriverProfile();
          const driver = driverResp?.data ?? driverResp;
          if (driver && typeof driver.active === "boolean") {
            setIsActiveDriver(driver.active);
          }
        } catch (driverErr) {
          console.warn(
            "Failed to refresh driver profile:",
            driverErr?.message || driverErr,
          );
        }
      }
    } catch (e) {
      // Soft-fail: we don't log out on transient refresh issues.
      console.warn("Session refresh failed:", e?.message || e);
    }
  };

  const refreshAvailablePackages = async (token) => {
    if (!token) return;
    try {
      apiService.setToken(token);
      const resp = await apiService.getPackages({
        status: "PENDING",
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      // Unwrap nested response: resp.data may contain { data: { packages } } or be an array
      const raw = resp?.data ?? resp;
      let items = [];
      if (Array.isArray(raw)) {
        items = raw;
      } else if (Array.isArray(raw?.packages)) {
        items = raw.packages;
      } else if (Array.isArray(raw?.data?.packages)) {
        items = raw.data.packages;
      } else if (Array.isArray(raw?.data)) {
        items = raw.data;
      }
      const mapped = items.map((p) => ({
        id: p.id,
        description: p.description,
        price: p.priceOffered,
        customer: p.customer
          ? `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim()
          : "Customer",
        pickup: p.pickupAddress,
        delivery: p.deliveryAddress,
        weight: p.weight ? `${p.weight} kg` : "—",
        distance: "—",
        photo: p.imageUrl || null,
        raw: p,
      }));
      setAvailablePackages(mapped);
    } catch (e) {
      console.warn("Failed to refresh available packages:", e?.message || e);
      setAvailablePackages([]);
    }
  };

  const refreshMyPackages = async (token) => {
    if (!token) return;
    try {
      apiService.setToken(token);
      const customerId = userProfile?.userId;
      const resp = await apiService.getPackages(
        customerId
          ? { customerId, limit: 100, sortBy: "createdAt", sortOrder: "desc" }
          : { limit: 100 },
      );
      // Unwrap nested response
      const raw = resp?.data ?? resp;
      let items = [];
      if (Array.isArray(raw)) {
        items = raw;
      } else if (Array.isArray(raw?.packages)) {
        items = raw.packages;
      } else if (Array.isArray(raw?.data?.packages)) {
        items = raw.data.packages;
      } else if (Array.isArray(raw?.data)) {
        items = raw.data;
      }
      setMyPackages(items);
    } catch (e) {
      console.warn("Failed to refresh packages:", e?.message || e);
    }
  };

  const formatNotificationForUi = (n) => ({
    id: n.id,
    type:
      n.type === "BID_RECEIVED" ||
      n.type === "BID_ACCEPTED" ||
      n.type === "BID_REJECTED"
        ? "bid"
        : n.type === "PACKAGE_STATUS"
          ? "delivery"
          : "default",
    title: n.title,
    message: n.message || n.body,
    time: n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now",
    read: Boolean(n.isRead ?? n.read),
  });

  const refreshNotifications = async (token) => {
    if (!token) return;
    try {
      apiService.setToken(token);
      const resp = await apiService.getNotifications({ limit: 50 });
      const raw = resp?.data ?? resp;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.notifications)
          ? raw.notifications
          : [];
      setNotifications(items.map(formatNotificationForUi));
    } catch (e) {
      console.warn("Failed to refresh notifications:", e?.message || e);
    }
  };

  const addNotificationToState = (notification) => {
    if (!notification) return;
    const formatted = formatNotificationForUi(notification);
    setNotifications((prev) => {
      if (prev.some((n) => n.id === formatted.id)) return prev;
      return [formatted, ...prev];
    });
  };

  // Real-time socket listeners for bids, packages, and notifications
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    refreshNotifications(authToken);

    const onNotification = ({ notification }) => {
      addNotificationToState(notification);
    };

    const onBidReceived = () => {
      refreshMyPackages(authToken);
    };

    const onBidAccepted = () => {
      if ((userType || "").toLowerCase() === "driver") {
        refreshAvailablePackages(authToken);
      }
    };

    const onPackageNew = () => {
      if ((userType || "").toLowerCase() === "driver") {
        refreshAvailablePackages(authToken);
      }
    };

    const onPackageRequest = () => {
      if ((userType || "").toLowerCase() === "driver") {
        refreshAvailablePackages(authToken);
      }
    };

    socketService.on("notification:new", onNotification);
    socketService.on("bid:received", onBidReceived);
    socketService.on("bid:accepted", onBidAccepted);
    socketService.on("bid:rejected", onBidAccepted);
    socketService.on("package:new", onPackageNew);
    socketService.on("package:request", onPackageRequest);

    return () => {
      socketService.off("notification:new", onNotification);
      socketService.off("bid:received", onBidReceived);
      socketService.off("bid:accepted", onBidAccepted);
      socketService.off("bid:rejected", onBidAccepted);
      socketService.off("package:new", onPackageNew);
      socketService.off("package:request", onPackageRequest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authToken, userType]);

  // Keep verification / identityVerified in sync automatically.
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    // When not verified, poll slightly faster for status unlock; avoid rate limiting.
    const fastPoll = !userProfile?.isVerified;
    const intervalMs = fastPoll ? 30000 : 120000;

    // Kick once immediately.
    refreshSession(authToken);
    refreshMyPackages(authToken);
    if ((userType || "").toLowerCase() === "driver") {
      refreshAvailablePackages(authToken);
    }

    const interval = setInterval(() => {
      refreshSession(authToken);
      refreshMyPackages(authToken);
      if ((userType || "").toLowerCase() === "driver") {
        refreshAvailablePackages(authToken);
      }
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    authToken,
    userProfile?.isVerified,
    userType,
    userProfile?.userId,
  ]);

  // Location tracking — send device position to API periodically (drivers and customers)
  const locationWatcher = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    const isDriver = (userType || "").toLowerCase() === "driver";

    let cancelled = false;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        // Send location immediately (only drivers send to server)
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled && isDriver) {
          apiService.setToken(authToken);
          apiService
            .updateDriverLocation(loc.coords.latitude, loc.coords.longitude)
            .catch(() => {});
        }

        // Watch for changes (fires on significant movement)
        locationWatcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          (position) => {
            if (cancelled) return;
            if (isDriver) {
              apiService.setToken(authToken);
              apiService
                .updateDriverLocation(
                  position.coords.latitude,
                  position.coords.longitude,
                )
                .catch(() => {});
            }
          },
        );
      } catch (e) {
        console.warn("Location tracking failed:", e?.message);
      }
    };

    startLocationTracking();

    return () => {
      cancelled = true;
      if (locationWatcher.current) {
        locationWatcher.current.remove();
        locationWatcher.current = null;
      }
    };
  }, [isAuthenticated, authToken, userType]);

  const toggleActiveDriverStatus = async (status) => {
    const previous = isActiveDriver;
    setIsActiveDriver(status);
    if (!authToken) return { success: true };
    try {
      apiService.setToken(authToken);
      const resp = await apiService.updateDriverActiveStatus(status);
      if (resp?.success === false) {
        setIsActiveDriver(previous);
        return {
          success: false,
          message: resp?.error?.message || "Failed to update active status",
        };
      }
      return { success: true };
    } catch (e) {
      setIsActiveDriver(previous);
      return {
        success: false,
        message: e?.message || "Failed to update active status",
      };
    }
  };

  const navigate = (screenName, replace = false, params = {}) => {
    if (replace) {
      setScreenHistory([screenName]);
    } else {
      setScreenHistory((prev) => [...prev, screenName]);
    }
    setCurrentScreen(screenName);
    if (Object.keys(params).length > 0) {
      setScreenParams((prev) => ({ ...prev, [screenName]: params }));
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const apiUrl = API_CONFIG.BASE_URL;
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  };

  const fetchWalletBalance = async (token) => {
    try {
      const apiUrl = API_CONFIG.BASE_URL;
      const response = await fetch(`${apiUrl}/api/wallet/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data.availableBalance || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      return 0;
    }
  };

  const login = async (phone, password) => {
    try {
      if (!phone || !phone.trim()) {
        Alert.alert("Validation Error", "Phone number is required");
        return;
      }
      if (!password || !password.trim()) {
        Alert.alert("Validation Error", "Password is required");
        return;
      }

      const apiUrl = API_CONFIG.BASE_URL;
      let normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith("+")) {
        normalizedPhone = "+" + normalizedPhone;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      try {
        response = await fetch(`${apiUrl}/api/auth/login-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, password }),
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeoutId);
        Alert.alert(
          "Connection Error",
          "Unable to connect to the server. Please check your internet connection and try again.",
        );
        return;
      }

      clearTimeout(timeoutId);

      if (!response) {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the server. Please try again.",
        );
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        Alert.alert("Sign in Failed", "Unable to sign in. Please try again.");
        return;
      }

      if (
        !response.ok ||
        response.status === 401 ||
        response.status === 403 ||
        data.success !== true
      ) {
        const errorCode = data.error?.code || "UNKNOWN_ERROR";
        if (errorCode === "USER_NOT_FOUND") {
          Alert.alert(
            "Phone Number Not Registered",
            "This phone number is not registered. Would you like to sign up?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Up",
                onPress: () => navigate("registerCustomer", true),
              },
            ],
          );
        } else if (errorCode === "INVALID_PASSWORD") {
          Alert.alert(
            "Incorrect Password",
            "The password you entered is incorrect. Please try again.",
          );
        } else {
          Alert.alert(
            "Sign in Failed",
            "Unable to sign in. Please check your credentials and try again.",
          );
        }
        return;
      }

      if (
        !data.data ||
        !data.data.token ||
        !data.data.user ||
        !data.data.user.id
      ) {
        Alert.alert("Sign in Failed", "Unable to sign in. Please try again.");
        return;
      }

      const token = data.data.token;
      const userData = data.data.user;

      setAuthToken(token);
      setUserProfile({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || normalizedPhone,
        profilePhoto: userData.profilePictureUrl || null,
        rating: 0,
        totalDeliveries: 0,
        totalEarnings: 0,
        isVerified: userData.identityVerified || false,
        phoneVerified: userData.phoneVerified || false,
        email: userData.email || "",
        userId: userData.id,
      });

      const actualUserType = userData.userType?.toLowerCase() || "customer";
      setUserType(actualUserType);

      const fullProfile = await fetchUserProfile(token);
      if (fullProfile) {
        setUserProfile((prev) => ({
          ...prev,
          firstName: fullProfile.firstName || prev.firstName,
          lastName: fullProfile.lastName || prev.lastName,
          phone: fullProfile.phone || prev.phone,
          profilePhoto: fullProfile.profilePictureUrl || prev.profilePhoto,
          isVerified: fullProfile.identityVerified || prev.isVerified,
          phoneVerified: fullProfile.phoneVerified || prev.phoneVerified,
          email: fullProfile.email || prev.email,
          userId: fullProfile.id || prev.userId,
        }));
      }

      const walletBalance = await fetchWalletBalance(token);
      if (actualUserType === "customer") {
        setCustomerWallet(walletBalance);
      } else if (actualUserType === "driver") {
        setDriverWallet(walletBalance);
      }

      setIsAuthenticated(true);
      apiService.setToken(token);
      try {
        socketService.connect(
          token,
          fullProfile?.id || userData.id,
          actualUserType,
        );
      } catch (socketError) {
        console.warn("Socket.IO connection failed:", socketError);
      }

      refreshNotifications(token);

      navigate("home", true);
    } catch (error) {
      console.error("Login error:", error);
      if (error.name === "AbortError") {
        Alert.alert(
          "Connection Timeout",
          "The request took too long. Please check your internet connection and try again.",
        );
      } else {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the server. Please check your internet connection and try again.",
        );
      }
      setIsAuthenticated(false);
      setAuthToken(null);
      setUserType(null);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setActiveTab("home");
    apiService.setToken(null);
    socketService.disconnect();
    navigate("login", true);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1);
      setScreenHistory(newHistory);
      setCurrentScreen(newHistory[newHistory.length - 1]);
      return true;
    }
    return false;
  };

  return (
    <NavigationContext.Provider
      value={{
        currentScreen,
        navigate,
        goBack,
        isAuthenticated,
        userType,
        login,
        logout,
        activeTab,
        setActiveTab,
        userProfile,
        setUserProfile,
        customerWallet,
        setCustomerWallet,
        driverWallet,
        setDriverWallet,
        myPackages,
        setMyPackages,
        refreshMyPackages,
        availablePackages,
        setAvailablePackages,
        refreshAvailablePackages,
        myBids,
        setMyBids,
        notifications,
        setNotifications,
        refreshNotifications,
        upcomingTrips,
        setUpcomingTrips,
        isActiveDriver,
        toggleActiveDriverStatus,
        activeDrivers,
        setActiveDrivers,
        authToken,
        screenParams,
        setScreenParams,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};
