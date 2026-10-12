import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/** Pulsing placeholder block. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: colors.skeleton, borderRadius: 12, opacity }, style]} />;
}

/** Shown while the stored session is being verified at app start. */
export function FullPageSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Skeleton style={styles.line1} />
      <Skeleton style={styles.line2} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, marginBottom: 28 },
  line1: { width: 180, height: 14 },
  line2: { width: 120, height: 14, marginTop: 10 },
});
