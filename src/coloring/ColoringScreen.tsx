/**
 * The colouring screen (docs/ARCHITECTURE.md): zoom/pan, press-and-hold for the palette ring,
 * quick tap with the last colour, multi-step undo, autosave.
 * Toolbar: Back · Save picture (behind the parental gate) · current colour · Undo · Next page (explicit only —
 * the page area itself never navigates). When every region is coloured a calm, dismissable "All done!" card
 * offers Next / Save / Keep colouring; nothing happens by itself.
 *
 * Rendering — two layers:
 *  1. base: the whole page as an SVG at "fit" size inside an Animated.View that is scaled/translated on the
 *     UI thread (smooth 60 fps pinch/pan, but a scaled bitmap — soft when zoomed);
 *  2. crisp: when the gesture settles at zoom > 1, a screen-sized SVG whose viewBox is exactly the visible part
 *     of the page is drawn on top (fades in over 160 ms). Lines are then vector-sharp at any zoom, and the
 *     bitmap stays screen-sized (rendering the whole page at 5× would be ~180 MB on a 3× phone).
 *     It hides instantly when a new gesture begins.
 *
 * Gestures (react-native-gesture-handler v3 hooks, worklets on the UI thread):
 *   Competing( Simultaneous(pinch, pan), longPress, Exclusive(doubleTap, tap) )
 * The first one to activate cancels the rest, so moving a finger (pan ≥ 10 pt) or pinching can never fill,
 * a hold (380 ms, ≤ 10 pt movement) opens the ring, and a quick tap (≤ 320 ms, ≤ 12 pt) fills.
 * Double-tap (reset zoom) is enabled only while zoomed, so at 1× a single tap fills without waiting.
 * Needs a GestureHandlerRootView above it (src/app/_layout.tsx provides one).
 * Touch points are converted to page units by inverting the zoom/pan transform ourselves (toPage).
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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
import Animated, { FadeIn, FadeOut, makeMutable, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { ClipPath, Defs, G, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '@/i18n';

import { samplePage } from './__fixtures__/sample-page';
import { regionAt, warmHitMap } from './hit';
import { PageShapes, type Fade, type Highlight } from './PageShapes';
import { getPage, pagesOfLevel } from './pages';
import { PaletteRing } from './PaletteRing';
import { isHintDone, loadFills, loadLastColor, markHintDone, saveFills, saveLastColor } from './store';
import { PAGE_H, PAGE_W, PAPER, type Fills, type Page } from './types';
import { BackIcon, FONT, MOTION, NextIcon, RoundButton, SaveIcon, SHADOW, TONE, UndoIcon } from './ui';
import { DoneCard } from './DoneCard';
import { useSavePicture } from './SavePicture';

const MAX_ZOOM = 5;
const MARGIN = 14;
const RADIUS = 22;
const HISTORY_MAX = 200;

function resolvePage(pageId: string): Page | undefined {
  const p = getPage(pageId);
  if (p) return p;
  if (__DEV__ && pageId === 'sample') return samplePage();
  return undefined;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** The next page of the same level, or null on the last one (and for the dev sample). */
function nextPageOf(page: Page): Page | null {
  const list = pagesOfLevel(page.level);
  const i = list.findIndex((p) => p.id === page.id);
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
}

const isComplete = (page: Page, fills: Fills) => {
  for (let r = 0; r < page.regions; r++) if (!fills[r]) return false;
  return true;
};

export function ColoringScreen({ pageId }: { pageId: string }) {
  const page = resolvePage(pageId);
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {page ? <Coloring key={page.id} page={page} /> : <Missing />}
    </View>
  );
}

function Missing() {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
      <RoundButton accessibilityLabel={t('coloring.back')} onPress={goBack}>
        <BackIcon />
      </RoundButton>
    </View>
  );
}

/** Clamp a translation so the page never leaves the area (centred while smaller than the area). */
function clampT(t: number, s: number, size: number, area: number, origin: number) {
  'worklet';
  const scaled = size * s;
  if (scaled <= area) return (area - scaled) / 2 - origin;
  return Math.min(-origin, Math.max(area - scaled - origin, t));
}

type Geo = { aw: number; ah: number; pw: number; ph: number; ox: number; oy: number };
type View3 = { s: number; tx: number; ty: number };
type Ring = { r: number; x: number; y: number };

function fitGeo(aw: number, ah: number): Geo {
  const pw = Math.max(1, Math.min(aw - 2 * MARGIN, ((ah - 2 * MARGIN) * PAGE_W) / PAGE_H));
  const ph = (pw * PAGE_H) / PAGE_W;
  return { aw, ah, pw, ph, ox: (aw - pw) / 2, oy: (ah - ph) / 2 };
}

function Coloring({ page }: { page: Page }) {
  const t = useT();
  const insets = useSafeAreaInsets();

  // ----- state -----
  const [fills, setFills] = useState<Fills>(() => loadFills(page.id));
  const [history, setHistory] = useState<Fills[]>([]);
  const [lastColor, setLastColor] = useState<string | null>(() => loadLastColor(page.id));
  const [showHint, setShowHint] = useState(() => !isHintDone());
  const [fade, setFade] = useState<Fade | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [ring, setRing] = useState<Ring | null>(null);
  const [crisp, setCrisp] = useState<View3 | null>(null);
  const [area, setArea] = useState<{ geo: Geo } | null>(null);
  // Height of the toolbar = top of the drawing area in screen coordinates (the area's own onLayout is
  // relative to the GestureDetector's wrapper, so it can't be used for that).
  const [areaTop, setAreaTop] = useState(0);
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [done, setDone] = useState(false);
  const next = nextPageOf(page);
  const saver = useSavePicture(page, fills, insets.bottom);

  /** Explicit only (toolbar arrow / done card): next page of the level, or back to the level list after the last. */
  const goNext = () => {
    if (next) router.replace({ pathname: '/page/[id]', params: { id: next.id } });
    else goBack();
  };

  useEffect(() => warmHitMap(page), [page]);

  // ----- transform (UI thread) -----
  const s = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const geo = useSharedValue<Geo>(fitGeo(1, 1));
  const pinchOn = useSharedValue(0);
  const panOn = useSharedValue(0);
  const crispOpacity = useSharedValue(0);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const g = fitGeo(width, height);
    geo.set(g);
    s.set(1);
    tx.set(0);
    ty.set(0);
    crispOpacity.set(0);
    setCrisp(null);
    setArea({ geo: g });
  };

  /** JS: the transform settled — draw the crisp layer for it (or drop it at 1×). */
  const commitView = (cs: number, ctx: number, cty: number) => {
    setCrisp(cs > 1.01 ? { s: cs, tx: ctx, ty: cty } : null);
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

  // ----- JS handlers -----
  const fill = (r: number, color: string) => {
    if (fills[r] === color) return false;
    const next = { ...fills, [r]: color };
    const progress = makeMutable(0);
    setHistory((h) => (h.length >= HISTORY_MAX ? [...h.slice(1), fills] : [...h, fills]));
    setFade({ r, from: fills[r] ?? PAPER, progress });
    setFills(next);
    saveFills(page.id, next);
    if (isComplete(page, next) && !isComplete(page, fills)) setDone(true);
    progress.set(withTiming(1, { duration: 380, easing: MOTION.easing, reduceMotion: MOTION.reduce }));
    return true;
  };

  /**
   * Touches on the ring overlay (a swatch, or the veil to close it) are also seen by the page's gesture
   * recognisers underneath, so page taps/holds are ignored while the ring is open and briefly after it closes.
   */
  const suppressUntil = useRef(0);
  const suppressed = () => ring !== null || Date.now() < suppressUntil.current;

  const onTap = (px: number, py: number) => {
    if (suppressed() || !lastColor) return;
    const r = regionAt(page, px, py);
    if (r === null) return;
    if (fill(r, lastColor)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  };

  const onHold = (px: number, py: number, x: number, y: number) => {
    if (suppressed() || !area) return;
    const r = regionAt(page, px, py);
    if (r === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const progress = makeMutable(0);
    setHighlight({ r, progress });
    progress.set(withTiming(1, { duration: 220, easing: MOTION.easeOut }));
    setRing({ r, x, y: y + areaTop });
  };

  const closeRing = () => {
    suppressUntil.current = Date.now() + 450;
    highlight?.progress.set(withTiming(0, { duration: 200, easing: MOTION.easing }));
    setRing(null);
  };

  const pick = (color: string) => {
    if (!ring) return;
    suppressUntil.current = Date.now() + 450;
    fill(ring.r, color);
    setLastColor(color);
    saveLastColor(page.id, color);
    if (showHint) {
      markHintDone();
      setShowHint(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    highlight?.progress.set(withTiming(0, { duration: 300, easing: MOTION.easing }));
    setRing(null);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setFade(null);
    setFills(prev);
    saveFills(page.id, prev);
    if (!isComplete(page, prev)) setDone(false);
    Haptics.selectionAsync().catch(() => {});
  };

  // ----- gestures -----
  const zoomed = crisp !== null;
  // While the ring is open only the ring reacts (its veil closes it).
  const pageActive = ring === null;

  const pinch = usePinchGesture({
    enabled: pageActive,
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
    enabled: pageActive,
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
    enabled: zoomed && pageActive,
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
    enabled: pageActive,
    maxDuration: 320,
    maxDistance: 12,
    onActivate: (e) => {
      const { px, py } = toPage(e.x, e.y);
      scheduleOnRN(onTap, px, py);
    },
  });

  const hold = useLongPressGesture({
    enabled: pageActive,
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

  const g = area?.geo;
  return (
    <View style={styles.root} onLayout={(e) => setScreen({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <View
        style={[styles.toolbar, { paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}
        onLayout={(e) => setAreaTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      >
        <RoundButton accessibilityLabel={t('coloring.back')} onPress={goBack} size={60}>
          <BackIcon />
        </RoundButton>
        <View style={styles.toolbarRight}>
          <RoundButton accessibilityLabel={t('coloring.save')} onPress={saver.ask} size={52}>
            <SaveIcon size={26} />
          </RoundButton>
          <CurrentSwatch color={lastColor} label={t('coloring.palette')} />
          <RoundButton accessibilityLabel={t('coloring.undo')} onPress={undo} disabled={history.length === 0} size={60}>
            <UndoIcon />
          </RoundButton>
          {page.id !== 'sample' && (
            <RoundButton accessibilityLabel={t('coloring.next')} onPress={goNext} size={60}>
              <NextIcon />
            </RoundButton>
          )}
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View style={[styles.area, { marginBottom: insets.bottom }]} onLayout={onAreaLayout} collapsable={false}>
          {g && (
            <>
              <Animated.View style={[styles.page, { left: g.ox, top: g.oy, width: g.pw, height: g.ph }, pageStyle]}>
                <Svg width={g.pw} height={g.ph} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
                  <PageShapes page={page} fills={fills} fade={fade} highlight={highlight} />
                </Svg>
              </Animated.View>
              {crisp && (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, crispStyle]}>
                  <CrispLayer page={page} fills={fills} fade={fade} highlight={highlight} geo={g} view={crisp} />
                </Animated.View>
              )}
            </>
          )}
          {showHint && (
            <Animated.View pointerEvents="none" style={styles.hintWrap} entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)}>
              <Text style={styles.hint} numberOfLines={2}>
                {t('coloring.hint')}
              </Text>
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      {ring && (
        <PaletteRing
          x={ring.x}
          y={ring.y}
          colors={page.palette}
          current={lastColor}
          bounds={{ left: insets.left, top: insets.top, right: screen.w - insets.right, bottom: screen.h - insets.bottom }}
          onPick={pick}
          onClose={closeRing}
          label={(n) => t('coloring.color', { n })}
          closeLabel={t('coloring.back')}
        />
      )}

      {done && !ring && (
        <DoneCard
          page={page}
          fills={fills}
          bottom={insets.bottom}
          hasNext={next !== null}
          onNext={goNext}
          onSave={saver.ask}
          onKeep={() => setDone(false)}
        />
      )}
      {saver.element}
    </View>
  );
}

/** Screen-sized SVG showing exactly the visible part of the page (vector-sharp at any zoom). */
function CrispLayer({ page, fills, fade, highlight, geo, view }: { page: Page; fills: Fills; fade: Fade | null; highlight: Highlight | null; geo: Geo; view: View3 }) {
  const k = (view.s * geo.pw) / PAGE_W; // screen points per page unit
  const vx = -(geo.ox + view.tx) / k;
  const vy = -(geo.oy + view.ty) / k;
  const rx = (RADIUS * PAGE_W) / geo.pw; // the card's corner radius, in page units
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

function CurrentSwatch({ color, label }: { color: string | null; label: string }): ReactNode {
  return (
    <View accessible accessibilityLabel={label} style={[styles.current, color ? { backgroundColor: color } : styles.currentEmpty]} />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TONE.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: TONE.bg,
    zIndex: 1,
  },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  current: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: TONE.card,
    boxShadow: SHADOW.soft,
  },
  currentEmpty: { backgroundColor: TONE.card, borderColor: TONE.dot, borderStyle: 'dashed', borderWidth: 3, boxShadow: undefined },
  area: { flex: 1, overflow: 'hidden' },
  page: {
    position: 'absolute',
    backgroundColor: PAPER,
    borderRadius: RADIUS,
    overflow: 'hidden',
    transformOrigin: 'top left',
    boxShadow: SHADOW.soft,
  },
  hintWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 22,
    alignItems: 'center',
  },
  hint: {
    fontFamily: FONT,
    fontSize: 18,
    lineHeight: 24,
    color: TONE.text,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: 'hidden',
    boxShadow: SHADOW.soft,
  },
});
