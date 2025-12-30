import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../constants/colors';
import { sharedStyles } from '../styles/sharedStyles';
import { decodePolyline } from '../utils/packageUtils';

export const LocationSearchModal = ({ 
  visible, 
  title, 
  onSelect, 
  onCancel, 
  showRoute = false, 
  routeStart = null, 
  routeEnd = null 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -24.6282, // Gaborone default
    longitude: 25.9231,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const mapRef = useRef(null);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Update map region
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(newRegion);
      
      // Reverse geocode to get address
      await reverseGeocode(latitude, longitude);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        // Fallback to sample location if API key not configured
        const sampleLocation = {
          name: 'Selected Location',
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(sampleLocation);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = {
          name: result.formatted_address.split(',')[0],
          address: result.formatted_address,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      } else {
        const location = {
          name: 'Selected Location',
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        };
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const location = {
        name: 'Selected Location',
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      };
      setSelectedLocation(location);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for addresses
  const searchAddresses = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        // Fallback to sample locations if API key not configured
        const sampleLocations = [
          { id: 1, name: 'Gaborone Main Mall', address: 'The Mall, Gaborone', lat: -24.6282, lng: 25.9231 },
          { id: 2, name: 'Sir Seretse Khama Airport', address: 'Airport Road, Gaborone', lat: -24.5552, lng: 25.9182 },
          { id: 3, name: 'Francistown Bus Rank', address: 'Blue Jacket St, Francistown', lat: -21.1700, lng: 27.5083 },
        ];
        const filtered = sampleLocations.filter(loc =>
          loc.name.toLowerCase().includes(query.toLowerCase()) ||
          loc.address.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
        setIsLoading(false);
        return;
      }

      // Use Places API (New) - Autocomplete
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ['bw'],
            languageCode: 'en'
          })
        }
      );
      const data = await response.json();
      
      if (data.suggestions) {
        const results = await Promise.all(
          data.suggestions.slice(0, 5).map(async (suggestion) => {
            if (suggestion.placePrediction?.placeId) {
              // Get place details using Places API (New)
              const detailsResponse = await fetch(
                `https://places.googleapis.com/v1/places/${suggestion.placePrediction.placeId}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
                  }
                }
              );
              const detailsData = await detailsResponse.json();
              
              if (detailsData.location) {
                return {
                  id: detailsData.id || suggestion.placePrediction.placeId,
                  name: detailsData.displayName?.text || suggestion.placePrediction.text?.text || 'Unknown',
                  address: detailsData.formattedAddress || suggestion.placePrediction.text?.text || '',
                  lat: detailsData.location.latitude || 0,
                  lng: detailsData.location.longitude || 0,
                };
              }
            }
            return null;
          })
        );
        setSearchResults(results.filter(r => r !== null));
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle map region change (when user drags map)
  const handleRegionChangeComplete = (region) => {
    setMapRegion(region);
    reverseGeocode(region.latitude, region.longitude);
  };

  // Load route if showRoute is true
  useEffect(() => {
    if (showRoute && routeStart && routeEnd && visible) {
      const loadRoute = async () => {
        try {
          const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) return;

          const origin = `${routeStart.lat},${routeStart.lng}`;
          const destination = `${routeEnd.lat},${routeEnd.lng}`;
          
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`
          );
          const data = await response.json();

          if (data.status === 'OK' && data.routes[0]) {
            const polyline = decodePolyline(data.routes[0].overview_polyline.points);
            setRoutePolyline(polyline);
            
            // Fit map to show entire route
            if (polyline.length > 0 && mapRef.current) {
              const coordinates = polyline;
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              });
            }
          }
        } catch (error) {
          console.error('Error loading route:', error);
        }
      };
      loadRoute();
    } else {
      setRoutePolyline(null);
    }
  }, [showRoute, routeStart, routeEnd, visible]);

  // Handle search query change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAddresses(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
  const handleSearchResultSelect = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.address);
    setSearchResults([]);
    
    const newRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(newRegion);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleSelect = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      setSearchQuery('');
      setSelectedLocation(null);
      setSearchResults([]);
    }
  };

  const handleCancel = () => {
    onCancel();
    setSearchQuery('');
    setSelectedLocation(null);
    setSearchResults([]);
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={sharedStyles.modalOverlay}>
          <View style={[sharedStyles.modalContent, { height: '90%' }]}>
            <Text style={sharedStyles.modalTitle}>{title}</Text>
            
            {/* Search Input */}
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <TextInput
                style={sharedStyles.modalInput}
                placeholder="Search location or drag map..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isLoading && (
                <View style={{ position: 'absolute', right: 12, top: 12 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 12, backgroundColor: colors.cardBg, borderRadius: 8 }}>
                {searchResults.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.locationItem}
                    onPress={() => handleSearchResultSelect(location)}
                  >
                    <Text style={styles.locationIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Text style={styles.locationAddress}>{location.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Map View */}
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                region={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={false}
                mapType="standard"
              >
                {/* Route polyline */}
                {routePolyline && routePolyline.length > 0 && (
                  <Polyline
                    coordinates={routePolyline}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                  />
                )}
                
                {/* Route start marker */}
                {showRoute && routeStart && (
                  <Marker
                    coordinate={{
                      latitude: routeStart.lat,
                      longitude: routeStart.lng,
                    }}
                    title="Start"
                    pinColor={colors.success}
                  />
                )}
                
                {/* Route end marker */}
                {showRoute && routeEnd && (
                  <Marker
                    coordinate={{
                      latitude: routeEnd.lat,
                      longitude: routeEnd.lng,
                    }}
                    title="End"
                    pinColor={colors.error}
                  />
                )}
                
                {/* Selected location marker */}
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      reverseGeocode(latitude, longitude);
                    }}
                  />
                )}
              </MapView>
              
              {/* Current Location Button */}
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.currentLocationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Selected Location Info */}
            {selectedLocation && (
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{selectedLocation.name}</Text>
                  <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={sharedStyles.modalButtons}>
              <TouchableOpacity
                style={[sharedStyles.modalButton, sharedStyles.modalCancelButton]}
                onPress={handleCancel}
              >
                <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  sharedStyles.modalButton,
                  sharedStyles.modalButtonSubmit,
                  (!selectedLocation || isLoading) && { opacity: 0.5 }
                ]}
                onPress={handleSelect}
                disabled={!selectedLocation || isLoading}
              >
                <Text style={sharedStyles.modalButtonTextSubmit}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationIcon: {
    fontSize: 24,
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBgLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});

