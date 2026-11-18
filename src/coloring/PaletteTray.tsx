/**
 * The always-visible palette at the bottom: the page's 7 colours as big round crayon-like swatches in a soft
 * rounded tray. The selected colour sits raised and larger with a white ring and a small check.
 * Child flow: tap a colour here → tap the picture → it fills.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { MOTION, SHADOW, TONE } from './ui';

const GAP = 6;
const PAD = 10;
const SELECTED = 1.16;

/** Swatch size that lets 7 swatches (one enlarged) fit the given width, capped for tablets. */
export function traySwatchSize(width: number, count: number) {
  const inner = Math.min(width - 2 * 12, 720) - 2 * PAD;
  const cap = width >= 700 ? 72 : 60; // tablets get bigger crayons
  return Math.max(36, Math.min(cap, Math.floor((inner - (count - 1) * GAP) / (count - 1 + SELECTED))));
}

type Props = {
  colors: string[];
  selected: string | null;
  onSelect: (color: string) => void;
  width: number;
  bottomInset: number;
  label: (n: number) => string;
};

export function PaletteTray({ colors, selected, onSelect, width, bottomInset, label }: Props) {
  const size = traySwatchSize(width, colors.length);
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View style={[styles.tray, { paddingVertical: Math.round(size * 0.22) + 4 }]}>
        {colors.map((c, i) => (
          <TraySwatch key={`${i}-${c}`} color={c} size={size} selected={c === selected} onPress={() => onSelect(c)} label={label(i + 1)} />
        ))}
      </View>
    </View>
  );
}

function TraySwatch({ color, size, selected, onPress, label }: { color: string; size: number; selected: boolean; onPress: () => void; label: string }) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: 220, easing: MOTION.easing, reduceMotion: MOTION.reduce }));
  }, [selected, on]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: -on.get() * size * 0.14 }, { scale: 1 + on.get() * (SELECTED - 1) }],
  }));
  const check = useAnimatedStyle(() => ({ opacity: on.get() }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: GAP / 2, right: GAP / 2 }}
      style={{ marginHorizontal: GAP / 2 }}
    >
      <Animated.View
        style={[
          styles.swatch,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          selected ? styles.selected : styles.idle,
          anim,
        ]}
      >
        {/* crayon-like soft highlight */}
        <View pointerEvents="none" style={[styles.shine, { width: size * 0.34, height: size * 0.2, borderRadius: size, top: size * 0.16, left: size * 0.2 }]} />
        <Animated.View pointerEvents="none" style={[styles.check, { width: size * 0.4, height: size * 0.4, borderRadius: size }, check]}>
          <Svg width={size * 0.26} height={size * 0.26} viewBox="0 0 24 24">
            <Path d="M5 12.5 L10 17.5 L19 7" stroke={TONE.text} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 6 },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PAD - GAP / 2,
    borderRadius: 999,
    backgroundColor: '#F6EEDF',
    boxShadow: 'inset 0px 2px 6px rgba(75, 68, 83, 0.08)',
  },
  swatch: { alignItems: 'center', justifyContent: 'center' },
  idle: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)', boxShadow: SHADOW.soft },
  selected: { borderWidth: 5, borderColor: TONE.card, boxShadow: SHADOW.lifted },
  shine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-25deg' }] },
  check: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    backgroundColor: TONE.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOW.soft,
  },
});
