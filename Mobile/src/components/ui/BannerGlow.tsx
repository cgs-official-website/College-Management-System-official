import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Dark hero-banner look used on every role's dashboard / All Modules / module pages (same as Infrastructure & Facilities). */
export const BANNER_BG = '#0F172A';
export const bannerDark = { backgroundColor: BANNER_BG, overflow: 'hidden' as const };

/** The big translucent green circle in the bottom-right corner. Put it as the FIRST child of the banner View. */
export function BannerGlow() {
  return <View pointerEvents="none" style={styles.glow} />;
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', right: -50, bottom: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(5,150,105,0.35)' },
});

export default BannerGlow;
