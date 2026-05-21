import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

// Dynamically load expo-local-authentication if available
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  // Not installed or not available in the environment
}

const { width, height } = Dimensions.get('window');

export interface SecureGateProps {
  isActive: boolean;
  onSuccess: () => void;
  onFailure?: (error: string) => void;
  fallbackPin?: string; // e.g. "1234". If set, passcode mode is enabled
  pinLength?: number; // Default 4
  title?: string;
  subtitle?: string;
  theme?: 'dark' | 'light' | 'glass';
  logo?: React.ReactNode;
  promptText?: string;
  autoAuthenticate?: boolean;
  onHapticTrigger?: (type: 'success' | 'error' | 'selection') => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export const SecureGate: React.FC<SecureGateProps> = ({
  isActive,
  onSuccess,
  onFailure,
  fallbackPin,
  pinLength = 4,
  title = 'App Locked',
  subtitle = 'Authenticate to access your workspace',
  theme = 'dark',
  logo,
  promptText = 'Unlock with Biometrics',
  autoAuthenticate = true,
  onHapticTrigger,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const [isPasscodeMode, setIsPasscodeMode] = useState(false);
  const [pin, setPin] = useState<string>('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnrolled, setBiometricsEnrolled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (isActive) {
      // Reset state
      setPin('');
      setErrorMessage(null);
      setIsPasscodeMode(!fallbackPin ? false : false); // default to biometrics first if available
      
      // Animate entry
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 30,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        checkBiometricsAndAuthenticate();
      });
    } else {
      // Animate exit
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const checkBiometricsAndAuthenticate = async () => {
    if (!LocalAuthentication) {
      setBiometricsAvailable(false);
      if (fallbackPin) {
        setIsPasscodeMode(true);
      }
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      setBiometricsAvailable(hasHardware);
      setBiometricsEnrolled(isEnrolled);

      if (hasHardware && isEnrolled) {
        if (autoAuthenticate) {
          triggerBiometricAuth();
        }
      } else if (fallbackPin) {
        setIsPasscodeMode(true);
      }
    } catch (err) {
      setBiometricsAvailable(false);
      if (fallbackPin) {
        setIsPasscodeMode(true);
      }
    }
  };

  const triggerBiometricAuth = async () => {
    if (!LocalAuthentication || isAuthenticating) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptText,
        fallbackLabel: fallbackPin ? 'Use Passcode' : '',
        disableDeviceFallback: false,
      });

      setIsAuthenticating(false);

      if (result.success) {
        if (onHapticTrigger) onHapticTrigger('success');
        onSuccess();
      } else {
        if (result.error !== 'userCancel' && result.error !== 'systemCancel') {
          setErrorMessage('Biometrics verification failed');
          triggerShake();
          if (onHapticTrigger) onHapticTrigger('error');
          if (onFailure) onFailure(result.error);
        }
        if (fallbackPin) {
          setIsPasscodeMode(true);
        }
      }
    } catch (err) {
      setIsAuthenticating(false);
      setErrorMessage('Verification error occurred');
      triggerShake();
      if (fallbackPin) {
        setIsPasscodeMode(true);
      }
    }
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (val: string) => {
    if (onHapticTrigger) onHapticTrigger('selection');
    setErrorMessage(null);

    if (val === 'back') {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    if (pin.length < pinLength) {
      const nextPin = pin + val;
      setPin(nextPin);

      if (nextPin.length === pinLength) {
        // Validate PIN
        if (fallbackPin && nextPin === fallbackPin) {
          if (onHapticTrigger) onHapticTrigger('success');
          onSuccess();
        } else {
          // Failure
          setTimeout(() => {
            triggerShake();
            setPin('');
            setErrorMessage('Invalid Passcode');
            if (onHapticTrigger) onHapticTrigger('error');
            if (onFailure) onFailure('Invalid PIN passcode entered');
          }, 150);
        }
      }
    }
  };

  if (!isActive) return null;

  // Backdrop styling based on theme
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return {
          bg: '#F8FAFC',
          text: '#0F172A',
          subText: '#475569',
          cardBg: '#FFFFFF',
          keypadText: '#0F172A',
          keypadBg: '#E2E8F0',
        };
      case 'glass':
        return {
          bg: 'rgba(15, 23, 42, 0.75)',
          text: '#FFFFFF',
          subText: '#94A3B8',
          cardBg: 'rgba(255, 255, 255, 0.1)',
          keypadText: '#FFFFFF',
          keypadBg: 'rgba(255, 255, 255, 0.15)',
        };
      case 'dark':
      default:
        return {
          bg: '#0F172A',
          text: '#FFFFFF',
          subText: '#94A3B8',
          cardBg: '#1E293B',
          keypadText: '#FFFFFF',
          keypadBg: '#334155',
        };
    }
  };

  const colors = getThemeStyles();
  const AnimatedView = Animated.View as any;

  // Render Custom Shield/Lock vector icon
  const renderDefaultLogo = () => {
    return (
      <View style={[styles.shieldContainer, { borderColor: colors.text }]}>
        <View style={[styles.shieldBase, { borderColor: colors.text }]}>
          <View style={[styles.lockShackle, { borderColor: colors.text }]} />
          <View style={[styles.lockBody, { backgroundColor: colors.text }]} />
        </View>
      </View>
    );
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < pinLength; i++) {
      const active = i < pin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: active ? '#6366F1' : 'transparent',
              borderColor: active ? '#6366F1' : colors.text,
              borderWidth: 1,
            },
          ]}
        />
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['bio', '0', 'back'],
    ];

    return (
      <View style={styles.keypadGrid}>
        {keys.map((row, rIndex) => (
          <View key={rIndex} style={styles.keypadRow}>
            {row.map((key, kIndex) => {
              if (key === 'bio') {
                if (!biometricsAvailable || !biometricsEnrolled) {
                  return <View key={kIndex} style={styles.keypadSpacer} />;
                }
                return (
                  <TouchableOpacity
                    key={kIndex}
                    activeOpacity={0.7}
                    onPress={triggerBiometricAuth}
                    style={[styles.keypadBtn, { backgroundColor: 'transparent' }]}
                  >
                    <Text style={[styles.keypadBtnText, { color: '#6366F1', fontSize: 13 }]}>
                      BIO
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key={kIndex}
                    activeOpacity={0.7}
                    onPress={() => handleKeyPress('back')}
                    style={[styles.keypadBtn, { backgroundColor: 'transparent' }]}
                  >
                    <Text style={[styles.keypadBtnText, { color: colors.text, fontSize: 13 }]}>
                      ⌫
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={kIndex}
                  activeOpacity={0.7}
                  onPress={() => handleKeyPress(key)}
                  style={[styles.keypadBtn, { backgroundColor: colors.keypadBg }]}
                >
                  <Text style={[styles.keypadBtnText, { color: colors.keypadText }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <AnimatedView
      style={[
        styles.overlay,
        {
          backgroundColor: colors.bg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <AnimatedView
        style={[
          styles.container,
          {
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        {/* Top Header */}
        <View style={styles.header}>
          {logo || renderDefaultLogo()}
          <Text style={[styles.title, { color: colors.text }, titleStyle]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }, subtitleStyle]}>
            {subtitle}
          </Text>
        </View>

        {/* Dynamic Display Area */}
        <View style={styles.displayArea}>
          {errorMessage && (
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          )}

          {isPasscodeMode ? (
            <View style={styles.passcodeSection}>
              {renderDots()}
              {renderKeypad()}
              {biometricsAvailable && biometricsEnrolled && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsPasscodeMode(false)}
                  style={styles.switchBtn}
                >
                  <Text style={styles.switchBtnText}>
                    Use Biometric Unlock
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.biometricSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={triggerBiometricAuth}
                style={[styles.biometricCircle, { borderColor: '#6366F1' }]}
              >
                <View style={styles.fingerprintGlyph}>
                  <View style={[styles.glyphLine, { width: 14, height: 2, backgroundColor: '#6366F1' }]} />
                  <View style={[styles.glyphLine, { width: 24, height: 2, backgroundColor: '#6366F1', marginTop: 4 }]} />
                  <View style={[styles.glyphLine, { width: 28, height: 2, backgroundColor: '#6366F1', marginTop: 4 }]} />
                  <View style={[styles.glyphLine, { width: 20, height: 2, backgroundColor: '#6366F1', marginTop: 4 }]} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.biometricPrompt, { color: colors.text }]}>
                {isAuthenticating ? 'Scanning...' : promptText}
              </Text>
              
              {fallbackPin && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsPasscodeMode(true)}
                  style={styles.switchBtn}
                >
                  <Text style={styles.switchBtnText}>
                    Enter Fallback PIN
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </AnimatedView>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  shieldContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  shieldBase: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockShackle: {
    width: 22,
    height: 22,
    borderWidth: 3.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    position: 'absolute',
    top: 0,
  },
  lockBody: {
    width: 32,
    height: 24,
    borderRadius: 4,
    position: 'absolute',
    bottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  displayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 30,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  biometricSection: {
    alignItems: 'center',
  },
  biometricCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fingerprintGlyph: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLine: {
    borderRadius: 1,
  },
  biometricPrompt: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 32,
  },
  passcodeSection: {
    alignItems: 'center',
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  keypadGrid: {
    width: 270,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  keypadBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnText: {
    fontSize: 24,
    fontWeight: '600',
  },
  keypadSpacer: {
    width: 64,
    height: 64,
  },
  switchBtn: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  switchBtnText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
});
