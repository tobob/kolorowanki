/**
 * Static, non-interactive render of a page with the given fills (thumbnails, previews).
 * width = size, height = size * 4/3. Memoized: re-renders only when page, fills or size change
 * (the store hands out a new fills object only for the page that changed). Clipped to the page: background
 * shapes may bleed ~20 units past the edge.
 */
import { memo } from 'react';
import Svg from 'react-native-svg';

import { PageShapes } from './PageShapes';
import { PAGE_H, PAGE_W, PAPER, type Fills, type Page } from './types';

export const PageView = memo(function PageView({ page, fills, size }: { page: Page; fills: Fills; size: number }) {
  return (
    <Svg
      width={size}
      height={(size * PAGE_H) / PAGE_W}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      style={{ backgroundColor: PAPER, overflow: 'hidden' }}
      pointerEvents="none"
    >
      <PageShapes page={page} fills={fills} />
    </Svg>
  );
});
