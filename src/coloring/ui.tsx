/** Calm UI tokens and small building blocks of the coloring screen (Pasujki visual language). */
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { OUTLINE } from './types';

export const TONE = {
  bg: '#FFF8EC', // warm cream
  card: '#FFFFFF',
  text: OUTLINE,
  muted: '#9C94A3',
  dot: '#E4DDE8',
  veil: 'rgba(255, 248, 236, 0.2)',
} as const;

export const SHADOW = {
  soft: '0px 4px 14px rgba(75, 68, 83, 0.10)',
  lifted: '0px 10px 24px rgba(75, 68, 83, 0.16)',
} as const;

export const FONT = Platform.select({ ios: 'ui-rounded', default: undefined });

/** Calm motion (Pasujki CALM_DESIGN_RESEARCH R1–R3): 150–600 ms, ease-in-out, no bouncy springs. */
export const MOTION = {
  touch: 120,
  fast: 250,
  base: 400,
  easing: Easing.inOut(Easing.quad),
  easeOut: Easing.out(Easing.quad),
  reduce: ReduceMotion.System,
} as const;

type ButtonProps = {
  onPress?: () => void;
  children: ReactNode;
  size?: number;
  color?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Big, soft, round button; pressing gently sinks it (no flashing highlight). */
export function RoundButton({ onPress, children, size = 64, color = TONE.card, disabled, accessibilityLabel, style }: ButtonProps) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.06 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPressIn={() => pressed.set(withTiming(1, { duration: MOTION.touch, easing: MOTION.easeOut }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: MOTION.fast, easing: MOTION.easing }))}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          disabled && styles.disabled,
          anim,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function BackIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14.5 5 L7.5 12 L14.5 19" stroke={OUTLINE} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function UndoIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.5 5.5 L4 10 L8.5 14.5 M4 10 H14 A5.5 5.5 0 0 1 14 21 H10"
        stroke={OUTLINE}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW.soft },
  disabled: { opacity: 0.4 },
});

export function CloseIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" stroke={OUTLINE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function NextIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9.5 5 L16.5 12 L9.5 19" stroke={OUTLINE} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** A little picture with a down arrow: "save picture". */
export function SaveIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 9.5 H6.5 A2 2 0 0 0 4.5 11.5 V18.5 A2 2 0 0 0 6.5 20.5 H17.5 A2 2 0 0 0 19.5 18.5 V11.5 A2 2 0 0 0 17.5 9.5 H16 M12 3.5 V14 M8.5 10.5 L12 14 L15.5 10.5"
        stroke={OUTLINE}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
