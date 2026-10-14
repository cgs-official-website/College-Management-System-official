import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export interface MarqueeTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** scroll speed in px / second (lower = slower). */
  speed?: number;
  /** gap between the end of the text and its repeat (px). */
  gap?: number;
}

/**
 * News-ticker text: scrolls continuously, forever, right-to-left, seamless loop
 * (even when the text is short it keeps running, like a news channel ticker).
 */
export function MarqueeText({ children, style, containerStyle, speed = 30, gap = 40 }: MarqueeTextProps) {
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const text = String(children ?? '');

  const distance = textW + gap;
  const ready = boxW > 0 && textW > 0;
  const copies = ready ? Math.ceil(boxW / distance) + 1 : 1;

  useEffect(() => {
    x.stopAnimation();
    x.setValue(0);
    if (!ready) return undefined;
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -distance, duration: (distance / speed) * 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, distance, speed, x, text]);

  const onBoxLayout = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);

  return (
    <View style={[styles.box, containerStyle]} onLayout={onBoxLayout}>
      {/* invisible, very wide copy: guarantees one line so we can read the natural text width */}
      <Text
        style={[style, styles.measure]}
        onTextLayout={(e) => {
          const w = Math.ceil(Math.max(0, ...e.nativeEvent.lines.map((l) => l.width)));
          if (w > 0 && w !== textW) setTextW(w);
        }}
      >
        {text}
      </Text>
      {ready ? (
        <Animated.View style={[styles.row, { width: copies * distance, transform: [{ translateX: x }] }]}>
          {Array.from({ length: copies }).map((_, i) => (
            // explicit width = natural text width, so the text is never truncated ("...") by the parent
            <Text key={i} style={[style, { width: textW + 2, marginRight: gap - 2 }]} numberOfLines={1} ellipsizeMode="clip">{text}</Text>
          ))}
        </Animated.View>
      ) : (
        <Text style={[style, styles.placeholder]} numberOfLines={1}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', flexShrink: 1 },
  measure: { position: 'absolute', opacity: 0, width: 4000, left: 0, top: 0 },
  placeholder: { opacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});

export default MarqueeText;