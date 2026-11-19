/**
 * The interactive picture: pinch-zoom (up to 5×) and two-finger pan, double-tap back to fit, tap and hold —
 * the colouring screen's own gesture code (RNGH v3 + reanimated), shared with the tutorial
 * (src/components/tutorial/game.tsx) so Edyta teaches exactly what the child will use.
 *
 *   onTap(px, py, x, y)   a quick tap: page units (px, py) and points inside the canvas (x, y)
 *   onHold(px, py, x, y)  press and hold
 *   onSettle(scale)       a pinch/pan/reset has ended at this zoom (1 = fit)
 *   active                false: no gestures (e.g. while the colour ring is open)
 *   zoomable              false: taps and holds only (the tutorial before its zoom step)
 *   margin, radius        space around the fitted page, corner radius of the paper card
 *
 * Touch points are converted to page units by inverting the zoom/pan transform ourselves (toPage). While
 * zoomed, a second, screen-sized SVG of exactly the visible part (CrispLayer) fades in when the transform
 * settles, so lines stay sharp at any zoom. Double-tap is enabled only while zoomed, so at 1× a single tap
 * fills without waiting. Needs a GestureHandlerRootView above it (src/app/_layout.tsx provides one).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { PageShapes, type Fade, type Highlight } from './PageShapes';
import { PAGE_H, PAGE_W, PAPER, type Fills, type Page } from './types';
import { MOTION } from './ui';

export const MAX_ZOOM = 5;

type Geo = { aw: number; ah: number; pw: number; ph: number; ox: number; oy: number };
type View3 = { s: number; tx: number; ty: number };

function fitGeo(aw: number, ah: number, margin: number): Geo {
  const pw = Math.max(1, Math.min(aw - 2 * margin, ((ah - 2 * margin) * PAGE_W) / PAGE_H));
  const ph = (pw * PAGE_H) / PAGE_W;
  return { aw, ah, pw, ph, ox: (aw - pw) / 2, oy: (ah - ph) / 2 };
}

/** Clamp a translation so the page never leaves the area (centred while smaller than the area). */
function clampT(t: number, s: number, size: number, area: number, origin: number) {
  'worklet';
  const scaled = size * s;
  if (scaled <= area) return (area - scaled) / 2 - origin;
  return Math.min(-origin, Math.max(area - scaled - origin, t));
}

export function ZoomCanvas({
  page,
  fills,
  fade,
  highlight,
  onTap,
  onHold,
  onSettle,
  active = true,
  zoomable = true,
  margin = 14,
  radius = 22,
  shadow,
  style,
  children,
}: {
  page: Page;
  fills: Fills;
  fade: Fade | null;
  highlight: Highlight | null;
  onTap: (px: number, py: number, x: number, y: number) => void;
  onHold: (px: number, py: number, x: number, y: number) => void;
  onSettle?: (scale: number) => void;
  active?: boolean;
  zoomable?: boolean;
  margin?: number;
  radius?: number;
  shadow?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [crisp, setCrisp] = useState<View3 | null>(null);
  const [geoState, setGeoState] = useState<Geo | null>(null);

  // ----- transform (UI thread) -----
  const s = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const geo = useSharedValue<Geo>(fitGeo(1, 1, margin));
  const pinchOn = useSharedValue(0);
  const panOn = useSharedValue(0);
  const crispOpacity = useSharedValue(0);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const g = fitGeo(width, height, margin);
    geo.set(g);
    s.set(1);
    tx.set(0);
    ty.set(0);
    crispOpacity.set(0);
    setCrisp(null);
    setGeoState(g);
  };

  /** JS: the transform settled — draw the crisp layer for it (or drop it at 1×). */
  const commitView = (cs: number, ctx: number, cty: number) => {
    setCrisp(cs > 1.01 ? { s: cs, tx: ctx, ty: cty } : null);
    onSettle?.(cs);
  };

  useEffect(() => {
    if (!crisp) return;
    // Reveal only if nothing moved since the commit (a new gesture would have hidden it).
    const same = !pinchOn.get() && !panOn.get() && Math.abs(s.get() - crisp.s) < 1e-4 && Math.abs(tx.get() - crisp.tx) < 0.01 && Math.abs(ty.get() - crisp.ty) < 0.01;
    if (same) crispOpacity.set(withTiming(1, { duration: 160, easing: MOTION.easing }));
  }, [crisp, crispOpacity, pinchOn, panOn, s, tx, ty]);

  const beginTransform = () => {
    'worklet';
    crispOpacity.set(0);
  };
  const endTransform = () => {
    'worklet';
    if (pinchOn.get() || panOn.get()) return;
    scheduleOnRN(commitView, s.get(), tx.get(), ty.get());
  };
  const toPage = (x: number, y: number) => {
    'worklet';
    const g = geo.get();
    const k = (s.get() * g.pw) / PAGE_W; // screen points per page unit
    return { px: (x - g.ox - tx.get()) / k, py: (y - g.oy - ty.get()) / k };
  };

  // ----- gestures -----
  const zoomed = crisp !== null;

  const pinch = usePinchGesture({
    enabled: active && zoomable,
    onActivate: () => {
      pinchOn.set(1);
      beginTransform();
    },
    onUpdate: (e) => {
      const g = geo.get();
      const cur = s.get();
      const ns = Math.min(MAX_ZOOM, Math.max(1, cur * e.scaleChange));
      const k = ns / cur;
      const fx = e.focalX - g.ox;
      const fy = e.focalY - g.oy;
      s.set(ns);
      tx.set(clampT(fx - (fx - tx.get()) * k, ns, g.pw, g.aw, g.ox));
      ty.set(clampT(fy - (fy - ty.get()) * k, ns, g.ph, g.ah, g.oy));
    },
    onFinalize: () => {
      if (!pinchOn.get()) return;
      pinchOn.set(0);
      endTransform();
    },
  });

  const pan = usePanGesture({
    enabled: active && zoomable,
    minDistance: 10,
    maxPointers: 2,
    onActivate: () => {
      panOn.set(1);
      beginTransform();
    },
    onUpdate: (e) => {
      const g = geo.get();
      const cs = s.get();
      tx.set(clampT(tx.get() + e.changeX, cs, g.pw, g.aw, g.ox));
      ty.set(clampT(ty.get() + e.changeY, cs, g.ph, g.ah, g.oy));
    },
    onFinalize: () => {
      if (!panOn.get()) return;
      panOn.set(0);
      endTransform();
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    enabled: zoomed && active && zoomable,
    maxDelay: 260,
    maxDistance: 24,
    onActivate: () => {
      crispOpacity.set(0);
      const cfg = { duration: 420, easing: MOTION.easing, reduceMotion: MOTION.reduce };
      s.set(withTiming(1, cfg));
      tx.set(withTiming(0, cfg));
      ty.set(
        withTiming(0, cfg, (finished) => {
          if (finished) scheduleOnRN(commitView, 1, 0, 0);
        }),
      );
    },
  });

  const tap = useTapGesture({
    enabled: active,
    maxDuration: 320,
    maxDistance: 12,
    onActivate: (e) => {
      const { px, py } = toPage(e.x, e.y);
      scheduleOnRN(onTap, px, py, e.x, e.y);
    },
  });

  const hold = useLongPressGesture({
    enabled: active,
    minDuration: 380,
    maxDistance: 10,
    onActivate: (e) => {
      const { px, py } = toPage(e.x, e.y);
      scheduleOnRN(onHold, px, py, e.x, e.y);
    },
  });

  const transform = useSimultaneousGestures(pinch, pan);
  const taps = useExclusiveGestures(doubleTap, tap);
  const gesture = useCompetingGestures(transform, hold, taps);

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: s.get() }],
  }));
  const crispStyle = useAnimatedStyle(() => ({ opacity: crispOpacity.get() }));

  const g = geoState;
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.area, style]} onLayout={onAreaLayout} collapsable={false}>
        {g && (
          <>
            <Animated.View
              style={[styles.page, { left: g.ox, top: g.oy, width: g.pw, height: g.ph, borderRadius: radius }, shadow ? { boxShadow: shadow } : null, pageStyle]}
            >
              <Svg width={g.pw} height={g.ph} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
                <PageShapes page={page} fills={fills} fade={fade} highlight={highlight} />
              </Svg>
            </Animated.View>
            {crisp && (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, crispStyle]}>
                <CrispLayer page={page} fills={fills} fade={fade} highlight={highlight} geo={g} view={crisp} radius={radius} />
              </Animated.View>
            )}
          </>
        )}
        {children}
      </View>
    </GestureDetector>
  );
}

/** Screen-sized SVG showing exactly the visible part of the page (vector-sharp at any zoom). */
function CrispLayer({
  page,
  fills,
  fade,
  highlight,
  geo,
  view,
  radius,
}: {
  page: Page;
  fills: Fills;
  fade: Fade | null;
  highlight: Highlight | null;
  geo: Geo;
  view: View3;
  radius: number;
}) {
  const k = (view.s * geo.pw) / PAGE_W; // screen points per page unit
  const vx = -(geo.ox + view.tx) / k;
  const vy = -(geo.oy + view.ty) / k;
  const rx = (radius * PAGE_W) / geo.pw; // the card's corner radius, in page units
  return (
    <Svg width={geo.aw} height={geo.ah} viewBox={`${vx} ${vy} ${geo.aw / k} ${geo.ah / k}`} preserveAspectRatio="none">
      <Defs>
        <ClipPath id="paper">
          <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} rx={rx} ry={rx} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#paper)">
        <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={PAPER} />
        <PageShapes page={page} fills={fills} fade={fade} highlight={highlight} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  area: { overflow: 'hidden' },
  page: {
    position: 'absolute',
    backgroundColor: PAPER,
    overflow: 'hidden',
    transformOrigin: 'top left',
  },
});
