import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bus,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Layers3,
  Lock,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react-native';

import { lightColors } from '../../theme/colors';
import { fontWeight } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation';

/** Shared with the Splash screen (LandingScreen) - decides "first install" vs "next launches". */
export const ONBOARDING_KEY = '@zuna_cms_onboarding_complete_v1';

/**
 * Onboarding screen (route: "Onboarding").
 * Shown ONLY on the first install, ALWAYS in light mode (it uses the light palette directly,
 * so it never changes with the theme). Finishing / skipping goes to Login.
 * Every slide has its own hero animation and its own feature chips.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const c = lightColors;

/* ------------------------------------------------------------------ animation helpers */

/** 0 -> 1 value that loops forever (native driver). `alternate` makes it ping-pong 0 -> 1 -> 0. */
const useLoop = (duration: number, opts: { delay?: number; alternate?: boolean } = {}) => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = opts.alternate ? Easing.inOut(Easing.sin) : Easing.linear;
    const run = opts.alternate
      ? Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: ease, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: ease, useNativeDriver: true }),
        ])
      : Animated.timing(value, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    const loop = Animated.loop(run);
    const timer = setTimeout(() => loop.start(), opts.delay ?? 0);
    return () => {
      clearTimeout(timer);
      loop.stop();
      value.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
};

/** Fade + slide up when it mounts (re-mount with a new `key` to replay). */
function FadeUp({ delay = 0, distance = 16, children }: { delay?: number; distance?: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** Springs in (scale + fade) when it mounts. */
function PopIn({ delay = 0, from = 0.5, children }: { delay?: number; from?: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true })]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ slide 1: brand (ripples + floating logo) */

function HeroBrand({ size }: { size: number }) {
  const orb = Math.round(size * 0.72);
  const card = Math.round(orb * 0.62);
  const logo = Math.round(card * 0.68);
  const ring1 = useLoop(2800);
  const ring2 = useLoop(2800, { delay: 1400 });
  const float = useLoop(2300, { alternate: true });

  const ring = (v: Animated.Value) => ({
    position: 'absolute' as const,
    width: orb,
    height: orb,
    borderRadius: orb / 2,
    borderWidth: 1.5,
    borderColor: c.primary,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] }) }],
  });

  return (
    <View style={[styles.hero, { width: size, height: size }]}>
      <Animated.View style={ring(ring1)} />
      <Animated.View style={ring(ring2)} />
      <View style={[styles.orb, { width: orb, height: orb, borderRadius: orb / 2 }]} />
      <PopIn from={0.7}>
        <Animated.View
          style={[
            styles.logoCard,
            { width: card, height: card, borderRadius: card * 0.28, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] }) }] },
          ]}>
          <Image source={require('../../assets/logo.png')} style={{ width: logo, height: logo }} resizeMode="contain" />
        </Animated.View>
      </PopIn>
      <View style={{ position: 'absolute', right: size * 0.17, bottom: size * 0.17 }}>
        <PopIn delay={450}>
          <View style={styles.iconBadge}>
            <Layers3 size={20} color={c.onPrimary} />
          </View>
        </PopIn>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ slide 2: modules orbiting around the logo */

const ORBIT_ICONS = [GraduationCap, ClipboardList, Wallet, BookOpen, Bus, Bell];

function HeroModules({ size }: { size: number }) {
  const spin = useLoop(22000);
  const pulse = useLoop(1800, { alternate: true });
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radius = size * 0.4;
  const item = 46;
  const centerCard = Math.round(size * 0.34);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <Animated.View
      style={[
        styles.hero,
        { width: size, height: size, opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
      ]}>
      <View style={[styles.orbitRing, { width: radius * 2, height: radius * 2, borderRadius: radius }]} />
      <View style={[styles.orbitGlow, { width: radius * 1.35, height: radius * 1.35, borderRadius: radius * 0.68 }]} />

      <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}>
        {ORBIT_ICONS.map((Icon, i) => {
          const angle = (i / ORBIT_ICONS.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <Animated.View
              key={i}
              style={[
                styles.orbitItem,
                {
                  width: item,
                  height: item,
                  left: size / 2 + radius * Math.cos(angle) - item / 2,
                  top: size / 2 + radius * Math.sin(angle) - item / 2,
                  transform: [{ rotate: counter }],
                },
              ]}>
              <Icon size={21} color={c.primary} />
            </Animated.View>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.logoCard,
          { width: centerCard, height: centerCard, borderRadius: centerCard * 0.28, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] },
        ]}>
        <Image source={require('../../assets/logo.png')} style={{ width: centerCard * 0.68, height: centerCard * 0.68 }} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ slide 3: role cards floating around a shield */

const ROLE_NODE = 62; // diameter of each circular role badge

const ROLES = [
  // angle = starting position on the dashed circle (degrees, 0 = right, -90 = top); 120 deg apart
  { label: 'Admin', icon: Settings, fg: c.primary, bg: c.primarySoft, angle: -90 },
  { label: 'Teacher', icon: ClipboardList, fg: c.info, bg: c.infoSoft, angle: 150 },
  { label: 'Student', icon: GraduationCap, fg: c.warning, bg: c.warningSoft, angle: 30 },
];

/** Flies out from the centre (shield) onto the dashed circle, then travels around it - always upright. */
function RoleTile({
  role,
  index,
  size,
  radius,
  rotate,
  counter,
}: {
  role: (typeof ROLES)[number];
  index: number;
  size: number;
  radius: number;
  rotate: Animated.AnimatedInterpolation<string>;
  counter: Animated.AnimatedInterpolation<string>;
}) {
  const tileW = ROLE_NODE; // circular node; label hangs below so the circle centre sits on the ring
  const tileH = ROLE_NODE;
  const rad = (role.angle * Math.PI) / 180;
  const dx = radius * Math.cos(rad);
  const dy = radius * Math.sin(rad);
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(200 + index * 170),
      Animated.spring(enter, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Icon = role.icon;

  return (
    // Rotating layer: carries the tile around the circle centre
    <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}>
      {/* Counter-rotation keeps the card upright while it orbits */}
      <Animated.View
        style={{
          position: 'absolute',
          left: size / 2 + dx - tileW / 2,
          top: size / 2 + dy - tileH / 2,
          transform: [{ rotate: counter }],
        }}>
        <Animated.View
          style={[
            styles.roleTile,
            {
              width: tileW,
              opacity: enter.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-dx, 0] }) },
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-dy, 0] }) },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              ],
            },
          ]}>
          <View style={[styles.roleIcon, { backgroundColor: role.bg }]}>
            <Icon size={24} color={role.fg} />
          </View>
          <View style={styles.roleLabelWrap} pointerEvents="none">
            <Text style={styles.roleLabel}>{role.label}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function HeroRoles({ size }: { size: number }) {
  const pulse = useLoop(1600, { alternate: true });
  const ripple = useLoop(2600);
  const spin = useLoop(18000); // one full lap of the dashed circle
  const radius = size * 0.37; // tiles sit exactly on this circle
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={[styles.hero, { width: size, height: size }]}>
      <View style={[styles.orbitRing, { width: radius * 2, height: radius * 2, borderRadius: radius }]} />
      <Animated.View
        style={{
          position: 'absolute',
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: c.primary,
          opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
      {ROLES.map((role, i) => (
        <RoleTile key={role.label} role={role} index={i} size={size} radius={radius} rotate={rotate} counter={counter} />
      ))}
      <Animated.View style={[styles.shield, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
        <ShieldCheck size={24} color={c.onPrimary} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ pages */

type Chip = { icon: React.ComponentType<any>; label: string };
type OnboardingPage = { title: string; subtitle: string; chips: Chip[]; Hero: React.ComponentType<{ size: number }> };

const PAGES: OnboardingPage[] = [
  {
    title: 'Architect Your Future',
    subtitle: 'The most powerful and securely connected digital environment for your college - now in your pocket.',
    chips: [
      { icon: CheckCircle2, label: 'Live CMS data' },
      { icon: Users, label: 'Role based' },
      { icon: ShieldCheck, label: 'Secure' },
    ],
    Hero: HeroBrand,
  },
  {
    title: 'Every module, one app',
    subtitle: 'Admissions, academics, staff, attendance, fees and more stay in sync with your Zuna CMS.',
    chips: [
      { icon: ClipboardList, label: 'Attendance' },
      { icon: Wallet, label: 'Fees & payroll' },
      { icon: BookOpen, label: 'Academics' },
    ],
    Hero: HeroModules,
  },
  {
    title: 'Built for every role',
    subtitle: 'Admins, teachers and students get a focused experience from the same secure platform.',
    chips: [
      { icon: Lock, label: 'Secure login' },
      { icon: Bell, label: 'Instant alerts' },
      { icon: RefreshCw, label: 'Always in sync' },
    ],
    Hero: HeroRoles,
  },
];

/** Page indicator: the active dot stretches and fills smoothly. */
function Dot({ active }: { active: boolean }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: v.interpolate({ inputRange: [0, 1], outputRange: [7, 24] }),
          backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.primary] }),
        },
      ]}
    />
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(0)).current; // background glows drift with the page
  const busy = useRef(false);
  const nudge = useLoop(850, { alternate: true });

  const heroSize = Math.round(Math.min(Math.max(width * 0.62, 210), 270));

  // New page is committed -> show it (its children start hidden and animate themselves in)
  useEffect(() => {
    pageOpacity.setValue(1);
    busy.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const animatePageChange = (next: number) => {
    if (busy.current) return;
    busy.current = true;
    Animated.spring(bg, { toValue: next, friction: 9, tension: 40, useNativeDriver: true }).start();
    Animated.timing(pageOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setPage(next));
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
  const Hero = current.Hero;
  const isLast = page === PAGES.length - 1;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowTop,
          {
            transform: [
              { translateX: bg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 70, 150] }) },
              { translateY: bg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 50, 20] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowBottom,
          {
            transform: [
              { translateX: bg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -60, -130] }) },
              { translateY: bg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -50, -20] }) },
            ],
          },
        ]}
      />

      {/* Top bar: only Skip */}
      <View style={styles.topBar}>
        {!isLast ? (
          <Pressable onPress={finishOnboarding} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Page content - each slide has its own hero animation, title and chips */}
      <Animated.View style={[styles.pageArea, { opacity: pageOpacity }]}>
        <View key={`hero-${page}`} style={{ width: heroSize, height: heroSize, marginBottom: 24 }}>
          <Hero size={heroSize} />
        </View>

        <FadeUp key={`title-${page}`} delay={120}>
          <Text style={styles.pageTitle}>{current.title}</Text>
        </FadeUp>
        <FadeUp key={`sub-${page}`} delay={230}>
          <Text style={styles.pageSubtitle}>{current.subtitle}</Text>
        </FadeUp>

        <View style={styles.featureStrip}>
          {current.chips.map((chip, i) => {
            const ChipIcon = chip.icon;
            return (
              <FadeUp key={`${page}-${chip.label}`} delay={380 + i * 100} distance={12}>
                <View style={styles.featureItem}>
                  <ChipIcon size={16} color={c.primary} />
                  <Text style={styles.featureText}>{chip.label}</Text>
                </View>
              </FadeUp>
            );
          })}
        </View>
      </Animated.View>

      {/* Bottom controls - inside the bottom safe area */}
      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {PAGES.map((item, index) => (
            <Dot key={item.title} active={index === page} />
          ))}
        </View>

        <Pressable
          onPress={() => (isLast ? finishOnboarding() : animatePageChange(page + 1))}
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextPressed]}>
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Animated.View style={{ transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }}>
            <ArrowRight size={20} color={c.onPrimary} />
          </Animated.View>
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

  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  skipBtn: { minWidth: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { color: c.textMuted, fontSize: 13, fontWeight: fontWeight.bold },

  pageArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },

  hero: { alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.successBorder },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.primary,
    borderWidth: 3,
    borderColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orbitRing: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.successBorder },
  orbitGlow: { position: 'absolute', backgroundColor: c.primarySoft },
  orbitItem: {
    position: 'absolute',
    borderRadius: 15,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  roleTile: {
    height: ROLE_NODE,
    borderRadius: ROLE_NODE / 2,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  roleIcon: { width: ROLE_NODE - 16, height: ROLE_NODE - 16, borderRadius: (ROLE_NODE - 16) / 2, alignItems: 'center', justifyContent: 'center' },
  roleLabelWrap: { position: 'absolute', top: ROLE_NODE + 6, left: -20, right: -20, alignItems: 'center' },
  roleLabel: { color: c.text, fontSize: 12.5, fontWeight: fontWeight.bold, letterSpacing: 0.2 },
  shield: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.primary,
    borderWidth: 4,
    borderColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
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
  dot: { height: 7, borderRadius: 4 },
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