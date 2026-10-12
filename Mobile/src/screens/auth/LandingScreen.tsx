import React, { useEffect, useRef, useState } from 'react';
import { Animated, Appearance, Easing, Image, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { THEME_STORAGE_KEY, useTheme } from '../../contexts/ThemeContext';
import { darkColors, lightColors } from '../../theme/colors';
import { fontWeight } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation';
import { ONBOARDING_KEY } from './WelcomeScreen';

/**
 * Splash screen (route: "Splash") - first screen of every cold start.
 *
 *  - FIRST INSTALL (onboarding not finished) -> always LIGHT  -> then Onboarding
 *  - Next launches                           -> saved theme (light by default, dark only if the
 *                                              user switched to dark) -> then Login
 *
 * It reads the saved theme itself, so the very first frame is already in the right mode.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SPLASH_MS = 2200;

export default function LandingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [launch, setLaunch] = useState<{ dark: boolean; onboardingDone: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let onboardingDone = false;
      let savedTheme: string | null = null;
      try {
        const [done, theme] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(THEME_STORAGE_KEY),
        ]);
        onboardingDone = done === 'true';
        savedTheme = theme;
      } catch {
        // storage unavailable -> behave like a first install
      }

      // First install is always light, whatever the phone/theme says.
      const dark =
        onboardingDone && (savedTheme === 'dark' || (savedTheme === 'system' && Appearance.getColorScheme() === 'dark'));

      if (alive) setLaunch({ dark, onboardingDone });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!launch) return;
    const timer = setTimeout(() => {
      navigation.replace(launch.onboardingDone ? 'Login' : 'Onboarding');
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [launch, navigation]);

  // Same background as the saved theme while the launch state is read -> no colour flash.
  if (!launch) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <SplashContent dark={launch.dark} />;
}

function SplashContent({ dark }: { dark: boolean }) {
  const c = dark ? darkColors : lightColors;
  const { width } = useWindowDimensions();

  const cardSize = Math.round(Math.min(Math.max(width * 0.3, 96), 132));
  const logoSize = Math.round(cardSize * 0.68);
  const ringSize = cardSize + 36;

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(14)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textShift, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: c.primary, opacity: dark ? 0.16 : 0.08 }]} />
      <View pointerEvents="none" style={[styles.glowBottom, { backgroundColor: c.primary, opacity: dark ? 0.12 : 0.06 }]} />

      {/* Centre block - the logo + brand are exactly centred in the safe area */}
      <View style={styles.center}>
        <View style={[styles.logoWrap, { width: ringSize * 1.5, height: ringSize * 1.5 }]}>
          <Animated.View
            style={[
              styles.ring,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: c.primary },
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.logoCard,
              {
                width: cardSize,
                height: cardSize,
                borderRadius: cardSize * 0.28,
                backgroundColor: '#FFFFFF',
                borderColor: dark ? 'transparent' : c.border,
                shadowColor: c.primary,
                shadowOpacity: dark ? 0.45 : 0.22,
              },
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}>
            <Image source={require('../../assets/logo.png')} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textShift }] }]}>
          <Text style={[styles.brand, { color: c.text }]}>ZUNA</Text>
          <Text style={[styles.tagline, { color: c.primary }]}>NEXT-GEN CAMPUS OS</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glowTop: { position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -120, right: -120 },
  glowBottom: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: -110, left: -100 },
  center: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
  logoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 10,
  },
  textBlock: { alignItems: 'center', marginTop: 4 },
  brand: { fontSize: 38, fontWeight: fontWeight.extrabold, letterSpacing: 6, paddingLeft: 6, textAlign: 'center' },
  tagline: { fontSize: 11, fontWeight: fontWeight.extrabold, letterSpacing: 3, paddingLeft: 3, marginTop: 8, textAlign: 'center' },
});