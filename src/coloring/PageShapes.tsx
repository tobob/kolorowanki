/**
 * The shapes of a page in painter's order (contract: types.ts → Shape). Shared by the static PageView
 * and the interactive ColoringScreen (which adds a fade-in of a fresh fill and a hold highlight —
 * both drawn in painter's order right after their region, so later shapes still cover them).
 */
import { memo, type ReactNode } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { G, Path } from 'react-native-svg';

import { OUTLINE, PAPER, type Fills, type Page, type Shape } from './types';

/**
 * Hold highlight: a warm wash over the region (visible on white paper, softens a colour) plus, for outlined
 * regions, a soft golden rim. Borderless regions (the full-page background, sw 0) get only the wash — later
 * shapes cover it, so the background reads as a gentle glow behind the picture, never a frame round the page.
 */
export const HIGHLIGHT = { fill: '#FCE3A0', fillOpacity: 0.5, stroke: '#F6C945', strokeOpacity: 0.6 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type Fade = { r: number; from: string; progress: SharedValue<number> };
export type Highlight = { r: number; progress: SharedValue<number> };

type Props = { page: Page; fills: Fills; fade?: Fade | null; highlight?: Highlight | null };

/** Contract: OUTLINE stroke only when sw > 0 (regions and details alike). */
function strokeOf(s: Shape): number {
  return s.sw && s.sw > 0 ? s.sw : 0;
}

/**
 * How a shape is painted with colour `color`: normally as fill (+ OUTLINE stroke when sw > 0);
 * a `paint: 'stroke'` region is a thick line in its colour (fill none).
 */
function paintProps(d: string, color: string, sw: number, strokePaint: boolean) {
  return strokePaint
    ? { d, fill: 'none', stroke: color, strokeWidth: sw > 0 ? sw : undefined }
    : { d, fill: color, stroke: sw > 0 ? OUTLINE : 'none', strokeWidth: sw > 0 ? sw : undefined };
}

/** Memoized on primitives, so colouring one region re-renders only that region's shapes. */
const PlainShape = memo(function PlainShape({ d, color, sw, strokePaint }: { d: string; color: string; sw: number; strokePaint: boolean }) {
  return <Path {...paintProps(d, color, sw, strokePaint)} strokeLinecap="round" strokeLinejoin="round" />;
});

function FadingFill({ s, to, progress }: { s: Shape; to: string; progress: SharedValue<number> }) {
  const strokePaint = s.paint === 'stroke';
  const props = useAnimatedProps(() => {
    const p = progress.get();
    return { fillOpacity: strokePaint ? 1 : p, strokeOpacity: strokePaint ? p : 1 };
  });
  return (
    <AnimatedPath {...paintProps(s.d, to, strokeOf(s), strokePaint)} animatedProps={props} strokeLinecap="round" strokeLinejoin="round" />
  );
}

function HighlightOverlay({ s, progress }: { s: Shape; progress: SharedValue<number> }) {
  const sw = strokeOf(s);
  const props = useAnimatedProps(() => ({ opacity: progress.get() }));
  if (s.paint === 'stroke') {
    // A stroke-painted region: wash its line.
    return (
      <AnimatedPath
        d={s.d}
        animatedProps={props}
        fill="none"
        stroke={HIGHLIGHT.fill}
        strokeOpacity={HIGHLIGHT.fillOpacity + 0.1}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  return (
    <AnimatedPath
      d={s.d}
      animatedProps={props}
      fill={HIGHLIGHT.fill}
      fillOpacity={HIGHLIGHT.fillOpacity}
      stroke={sw > 0 ? HIGHLIGHT.stroke : 'none'}
      strokeOpacity={HIGHLIGHT.strokeOpacity}
      strokeWidth={sw > 0 ? sw + 3 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export const PageShapes = memo(function PageShapes({ page, fills, fade, highlight }: Props) {
  const out: ReactNode[] = [];
  page.shapes.forEach((s, i) => {
    const sw = strokeOf(s);
    if (s.r === undefined) {
      out.push(<PlainShape key={i} d={s.d} color={s.fill ?? 'none'} sw={sw} strokePaint={false} />);
      return;
    }
    const strokePaint = s.paint === 'stroke';
    const color = fills[s.r] ?? PAPER;
    if (fade && fade.r === s.r) {
      out.push(<PlainShape key={i} d={s.d} color={fade.from} sw={sw} strokePaint={strokePaint} />);
      out.push(<FadingFill key={`${i}f`} s={s} to={color} progress={fade.progress} />);
    } else {
      out.push(<PlainShape key={i} d={s.d} color={color} sw={sw} strokePaint={strokePaint} />);
    }
    if (highlight && highlight.r === s.r) {
      out.push(<HighlightOverlay key={`${i}h`} s={s} progress={highlight.progress} />);
    }
  });
  return <G>{out}</G>;
});
