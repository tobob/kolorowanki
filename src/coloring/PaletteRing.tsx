/**
 * The ring of the page's 7 colours that opens around the finger after a press-and-hold.
 * Big round swatches (60 pt) that softly spread out from the finger (280 ms ease-out, no flashing),
 * always kept fully on screen. Tapping outside closes it.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { MOTION, SHADOW, TONE } from './ui';

export const SWATCH = 60;
export const RING_R = 84;
const EDGE = 10;

type Props = {
  /** finger position in the coordinates of the overlay (= screen) */
  x: number;
  y: number;
  colors: string[];
  current: string | null;
  /** area the ring must stay inside */
  bounds: { left: number; top: number; right: number; bottom: number };
  onPick: (color: string) => void;
  onClose: () => void;
  label: (n: number) => string;
  closeLabel: string;
};

export function ringCenter(x: number, y: number, b: Props['bounds']) {
  const half = RING_R + SWATCH / 2 + EDGE;
  const cx = Math.min(Math.max(x, b.left + half), b.right - half);
  const cy = Math.min(Math.max(y, b.top + half), b.bottom - half);
  return { cx, cy };
}

export function PaletteRing({ x, y, colors, current, bounds, onPick, onClose, label, closeLabel }: Props) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: 280, easing: MOTION.easeOut, reduceMotion: MOTION.reduce }));
  }, [progress]);

  const { cx, cy } = ringCenter(x, y, bounds);
  // The finger may sit off-centre when the ring had to be nudged on-screen; swatches start at the finger.
  const fx = x - cx;
  const fy = y - cy;
  const n = colors.length;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer]} entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: TONE.veil }]} onPress={onClose} accessibilityLabel={closeLabel} />
      <View pointerEvents="box-none" style={[styles.center, { left: cx, top: cy }]}>
        {colors.map((c, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          return (
            <Swatch
              key={i}
              color={c}
              selected={c === current}
              tx={Math.cos(a) * RING_R}
              ty={Math.sin(a) * RING_R}
              fx={fx}
              fy={fy}
              progress={progress}
              onPress={() => onPick(c)}
              label={label(i + 1)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function Swatch(props: {
  color: string;
  selected: boolean;
  tx: number;
  ty: number;
  fx: number;
  fy: number;
  progress: SharedValue<number>;
  onPress: () => void;
  label: string;
}) {
  const { color, selected, tx, ty, fx, fy, progress, onPress, label } = props;
  const anim = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: Math.min(1, p * 1.4),
      transform: [
        { translateX: fx + (tx - fx) * p },
        { translateY: fy + (ty - fy) * p },
        { scale: 0.55 + 0.45 * p },
      ],
    };
  });
  return (
    <Animated.View style={[styles.swatchWrap, anim]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.hit}>
        <View style={[styles.swatch, { backgroundColor: color }, selected && styles.selected]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 30, elevation: 30 },
  center: { position: 'absolute', width: 0, height: 0 },
  swatchWrap: { position: 'absolute', left: -SWATCH / 2, top: -SWATCH / 2, width: SWATCH, height: SWATCH },
  hit: { width: SWATCH, height: SWATCH },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 4,
    borderColor: TONE.card,
    boxShadow: SHADOW.lifted,
  },
  selected: { borderWidth: 6, outlineColor: TONE.text, outlineWidth: 2, outlineStyle: 'solid' },
});
