import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION, SHADOW, TONE } from '@/constants/ui';

type Props = {
  onPress?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  /** Height (and width, unless `width` is given). */
  size?: number;
  width?: number;
  color?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean };
};

/** Soft, round button. Pressing gently sinks it (no flashing highlight, no sound). */
export function SoftButton({
  onPress,
  onLongPress,
  children,
  size = 56,
  width,
  color = TONE.card,
  radius,
  style,
  disabled,
  accessibilityLabel,
  accessibilityState,
}: Props) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.04 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPressIn={() => pressed.set(withTiming(1, { duration: 120, easing: MOTION.easing }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: MOTION.fast, easing: MOTION.easing }))}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.base,
          { width: width ?? size, height: size, borderRadius: radius ?? size / 2, backgroundColor: color },
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

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW.soft, flexDirection: 'row', gap: 10 },
  disabled: { opacity: 0.45 },
});
