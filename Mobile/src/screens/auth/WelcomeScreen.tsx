import React, { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, CheckCircle2, GraduationCap, Layers3, ShieldCheck, Users } from 'lucide-react-native';

import { lightColors } from '../../theme/colors';
import { fontWeight } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation';

/** Shared with the Splash screen (LandingScreen) - decides "first install" vs "next launches". */
export const ONBOARDING_KEY = '@zuna_cms_onboarding_complete_v1';

/**
 * Onboarding screen (route: "Onboarding").
 * Shown ONLY on the first install, ALWAYS in light mode (it uses the light palette directly,
 * so it never changes with the theme). Finishing / skipping goes to Login.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type OnboardingPage = {
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
};

const PAGES: OnboardingPage[] = [
  {
    icon: Layers3,
    title: 'Architect Your Future',
    subtitle: 'The most powerful and securely connected digital environment for your college - now in your pocket.',
  },
  {
    icon: GraduationCap,
    title: 'Every module, one app',
    subtitle: 'Admissions, academics, staff, attendance, fees and more stay in sync with your Zuna CMS.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for every role',
    subtitle: 'Admins, teachers, students and parents get a focused experience from the same secure platform.',
  },
];

const c = lightColors;

export default function WelcomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const pageTranslate = useRef(new Animated.Value(0)).current;

  const orbSize = Math.round(Math.min(Math.max(width * 0.52, 170), 230));
  const logoCard = Math.round(orbSize * 0.62);
  const logoSize = Math.round(logoCard * 0.68);

  const animatePageChange = (next: number) => {
    const forward = next > page;
    Animated.parallel([
      Animated.timing(pageOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(pageTranslate, { toValue: forward ? -18 : 18, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setPage(next);
      pageTranslate.setValue(forward ? 18 : -18);
      Animated.parallel([
        Animated.timing(pageOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(pageTranslate, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Navigation must still continue when storage is unavailable.
    }
    navigation.replace('Login');
  };

  const current = PAGES[page];
  const Icon = current.icon;
  const isLast = page === PAGES.length - 1;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      {/* Top bar: brand (left) + Skip (right) share one baseline */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.smallLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.smallLogo} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brand}>ZUNA</Text>
            <Text style={styles.brandSub}>NEXT-GEN CAMPUS OS</Text>
          </View>
        </View>
        {!isLast ? (
          <Pressable onPress={finishOnboarding} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Page content - vertically centred between top bar and bottom controls */}
      <Animated.View style={[styles.pageArea, { opacity: pageOpacity, transform: [{ translateX: pageTranslate }] }]}>
        <View style={[styles.orb, { width: orbSize, height: orbSize, borderRadius: orbSize / 2 }]}>
          <View
            style={[
              styles.logoCard,
              { width: logoCard, height: logoCard, borderRadius: logoCard * 0.28 },
            ]}>
            <Image source={require('../../assets/logo.png')} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
          </View>
          <View style={styles.iconBadge}>
            <Icon size={20} color={c.onPrimary} />
          </View>
        </View>

        <Text style={styles.pageTitle}>{current.title}</Text>
        <Text style={styles.pageSubtitle}>{current.subtitle}</Text>

        <View style={styles.featureStrip}>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={c.primary} />
            <Text style={styles.featureText}>Live CMS data</Text>
          </View>
          <View style={styles.featureItem}>
            <Users size={16} color={c.primary} />
            <Text style={styles.featureText}>Role based</Text>
          </View>
          <View style={styles.featureItem}>
            <ShieldCheck size={16} color={c.primary} />
            <Text style={styles.featureText}>Secure</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom controls - inside the bottom safe area */}
      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {PAGES.map((item, index) => (
            <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          onPress={() => (isLast ? finishOnboarding() : animatePageChange(page + 1))}
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextPressed]}>
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <ArrowRight size={20} color={c.onPrimary} />
        </Pressable>

        {page > 0 ? (
          <Pressable onPress={() => animatePageChange(page - 1)} hitSlop={10} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12, overflow: 'hidden' },
  glowTop: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -130, left: -110, backgroundColor: c.primary, opacity: 0.07 },
  glowBottom: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: -120, right: -110, backgroundColor: c.primary, opacity: 0.06 },

  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  smallLogoWrap: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 11,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallLogo: { width: 26, height: 26 },
  brand: { color: c.text, fontSize: 15, fontWeight: fontWeight.extrabold, letterSpacing: 2.2 },
  brandSub: { color: c.textMuted, fontSize: 8, fontWeight: fontWeight.bold, letterSpacing: 1.2, marginTop: 2 },
  skipBtn: { minWidth: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { color: c.textMuted, fontSize: 13, fontWeight: fontWeight.bold },

  pageArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: c.primarySoft,
    borderWidth: 1,
    borderColor: c.successBorder,
  },
  logoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 8,
  },
  iconBadge: {
    position: 'absolute',
    right: '14%',
    bottom: '14%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.primary,
    borderWidth: 3,
    borderColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { color: c.text, fontSize: 27, lineHeight: 34, fontWeight: fontWeight.extrabold, textAlign: 'center', letterSpacing: -0.4, marginBottom: 12 },
  pageSubtitle: { color: c.textMuted, fontSize: 14, lineHeight: 22, fontWeight: fontWeight.medium, textAlign: 'center', maxWidth: 340 },
  featureStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 26, gap: 10 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  featureText: { color: c.text, fontSize: 11, fontWeight: fontWeight.bold, marginLeft: 6 },

  bottomArea: { alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.border },
  dotActive: { width: 22, backgroundColor: c.primary },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  nextPressed: { opacity: 0.88 },
  nextText: { color: c.onPrimary, fontSize: 15, fontWeight: fontWeight.bold },
  backButton: { height: 34, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  backText: { color: c.textMuted, fontSize: 12, fontWeight: fontWeight.bold },
});