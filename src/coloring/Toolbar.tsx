/**
 * The colouring screen's top bar: left [Back][Undo] · right [Music][Save][Next] (ColoringScreen), shared with
 * the tutorial (src/components/tutorial/game.tsx) so its Back and Undo sit exactly where the child will
 * find them later — same place, look and size.
 *
 *   toolbarSizes(width) — button sizes and gaps for a screen width (two groups never meet: worst case
 *        iPhone SE 375 pt: 2×52 + 46 + 42 + 52 + 3 gaps ≈ 290 of 343 pt).
 *   <Toolbar> — the bar; `inset` = the safe-area insets still to apply (0 inside a SafeAreaView).
 *   toolbarHeight / undoCenter — where the bar ends and where the Undo button is, in the bar's coordinates.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useT } from '@/i18n';

import { BackIcon, RoundButton, TONE, UndoIcon } from './ui';

export type ToolbarSizes = { big: number; music: number; save: number; gap: number; side: number };
export type ToolbarInset = { top: number; left: number; right: number };

const PAD_TOP = 8;
const PAD_BOTTOM = 6;

export function toolbarSizes(width: number): ToolbarSizes {
  const roomy = width >= 600;
  return {
    big: roomy ? 68 : width < 400 ? 52 : 60,
    music: roomy ? 60 : width < 400 ? 46 : 52,
    save: roomy ? 52 : width < 400 ? 42 : 46,
    gap: roomy ? 18 : width < 400 ? 10 : 14,
    side: roomy ? 28 : 16,
  };
}

/** Bottom edge of the bar (its buttons are at most `big` tall). */
export function toolbarHeight(z: ToolbarSizes, inset: ToolbarInset) {
  return inset.top + PAD_TOP + z.big + PAD_BOTTOM;
}

/** Centre of the Undo button (the second button of the left group). */
export function undoCenter(z: ToolbarSizes, inset: ToolbarInset) {
  return { x: inset.left + z.side + z.big + z.gap + z.big / 2, y: inset.top + PAD_TOP + z.big / 2 };
}

export function Toolbar({
  sizes,
  inset,
  left,
  right,
  onLayout,
}: {
  sizes: ToolbarSizes;
  inset: ToolbarInset;
  left: ReactNode;
  right?: ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View
      style={[styles.toolbar, { paddingTop: inset.top + PAD_TOP, paddingLeft: inset.left + sizes.side, paddingRight: inset.right + sizes.side }]}
      onLayout={onLayout}
    >
      <View style={[styles.group, { gap: sizes.gap }]}>{left}</View>
      <View style={[styles.group, { gap: sizes.gap }]}>{right}</View>
    </View>
  );
}

export function BackButton({ size, onPress }: { size: number; onPress: () => void }) {
  const t = useT();
  return (
    <RoundButton accessibilityLabel={t('coloring.back')} onPress={onPress} size={size}>
      <BackIcon size={size * 0.5} />
    </RoundButton>
  );
}

export function UndoButton({ size, onPress, disabled }: { size: number; onPress: () => void; disabled?: boolean }) {
  const t = useT();
  return (
    <RoundButton accessibilityLabel={t('coloring.undo')} onPress={onPress} disabled={disabled} size={size}>
      <UndoIcon size={size * 0.5} />
    </RoundButton>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: PAD_BOTTOM,
    backgroundColor: TONE.bg,
    zIndex: 1,
  },
  group: { flexDirection: 'row', alignItems: 'center' },
});
