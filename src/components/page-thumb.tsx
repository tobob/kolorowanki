import { StyleSheet, View } from 'react-native';

import { PageView } from '@/coloring/PageView';
import { useFills } from '@/coloring/store';
import type { Page } from '@/coloring/types';
import { RADIUS } from '@/constants/ui';

/** A page as a small sheet of paper, coloured with the child's saved fills. Width = size, height = size·4/3. */
export function PageThumb({ page, size }: { page: Page; size: number }) {
  const fills = useFills(page.id);
  return (
    <View style={[styles.paper, { width: size, height: (size * 4) / 3 }]}>
      <PageView page={page} fills={fills} size={size} />
    </View>
  );
}

/** Same footprint as a thumbnail, for when there is no page yet. */
export function EmptyThumb({ size, tint }: { size: number; tint: string }) {
  return <View style={[styles.paper, styles.empty, { width: size, height: (size * 4) / 3, backgroundColor: tint }]} />;
}

const styles = StyleSheet.create({
  paper: { borderRadius: RADIUS.tile - 6, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  empty: { opacity: 0.6 },
});
