import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { useNavigation } from '../navigation/NavigationContext';

export const LoadingScreen = () => {
  const { navigate } = useNavigation();
  const [displayedText, setDisplayedText] = useState('');
  const [displayedSlogan, setDisplayedSlogan] = useState('');
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;

  const appName = 'NTSAMAELA';
  const slogan = 'Peer to Peer Package Delivery';

  useEffect(() => {
    // Show logo immediately (no animation)
    logoScale.setValue(1);
    logoOpacity.setValue(1);
    textOpacity.setValue(1);
    sloganOpacity.setValue(1);
    setDisplayedText(appName);
    setDisplayedSlogan(slogan);

    // Navigate to login after delay
    setTimeout(() => {
      navigate('login', true);
    }, 3000);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <StatusBar style="light" />
      
      {/* Animated Logo */}
      <Animated.View 
        style={[
          styles.logoBigContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }
        ]}
      >
        <Text style={styles.logoBigN}>N</Text>
      </Animated.View>

      {/* App Name - Stationary */}
      <Text style={styles.logoTextBig}>{displayedText}</Text>

      {/* Slogan */}
      <Animated.View style={{ opacity: sloganOpacity }}>
        <Text style={styles.sloganBig}>{displayedSlogan}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoBigContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.botswanaBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: colors.botswanaBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBigN: {
    fontSize: 84,
    fontWeight: '900',
    color: colors.botswanaWhite,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoTextBig: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.botswanaWhite,
    letterSpacing: 4,
    marginBottom: 10,
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sloganBig: {
    fontSize: 16,
    color: colors.botswanaWhite,
    textAlign: 'center',
    textShadowColor: colors.botswanaBlack,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

