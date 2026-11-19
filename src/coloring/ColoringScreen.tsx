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
 * The picture with its gestures is src/coloring/ZoomCanvas.tsx (shared with the tutorial).
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
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, makeMutable, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MusicToggle } from '@/components/music-toggle';
import { useT } from '@/i18n';
import { goBack } from '@/shell/nav';

import { samplePage } from './__fixtures__/sample-page';
import { regionAt, warmHitMap } from './hit';
import { type Fade, type Highlight } from './PageShapes';
import { getPage, pagesOfLevel } from './pages';
import { PaletteRing } from './PaletteRing';
import { isHintDone, loadFills, loadLastColor, markHintDone, saveFills, saveLastColor } from './store';
import { PAPER, type Fills, type Page } from './types';
import { BackButton, Toolbar, toolbarSizes, UndoButton } from './Toolbar';
import { FONT, HandIcon, MOTION, NextIcon, RoundButton, SaveIcon, SHADOW, TONE } from './ui';
import { PaletteTray } from './PaletteTray';
import { DoneCard } from './DoneCard';
import { ZoomCanvas } from './ZoomCanvas';
import { useSavePicture } from './SavePicture';

/** Wall-clock ms (event handlers only). */
function nowMs() {
  return Date.now();
}

const RADIUS = 22;
const HISTORY_MAX = 200;

function resolvePage(pageId: string): Page | undefined {
  const p = getPage(pageId);
  if (p) return p;
  if (__DEV__ && pageId === 'sample') return samplePage();
  return undefined;
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bar = toolbarSizes(width);
  return <Toolbar sizes={bar} inset={insets} left={<BackButton size={bar.big} onPress={goBack} />} />;
}

type Ring = { r: number; x: number; y: number };

function Coloring({ page }: { page: Page }) {
  const t = useT();
  const insets = useSafeAreaInsets();

  // ----- state -----
  const [fills, setFills] = useState<Fills>(() => loadFills(page.id));
  const [history, setHistory] = useState<Fills[]>([]);
  // The tray always has a selection: the last colour used on this page, else the first palette colour, so the
  // very first tap on the picture already does something visible.
  const [lastColor, setLastColor] = useState<string>(() => loadLastColor(page.id) ?? page.palette[0]);
  const [showHint, setShowHint] = useState(() => !isHintDone());
  const [fade, setFade] = useState<Fade | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [ring, setRing] = useState<Ring | null>(null);
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
    if (showHint) {
      markHintDone();
      setShowHint(false);
    }
    progress.set(withTiming(1, { duration: 380, easing: MOTION.easing, reduceMotion: MOTION.reduce }));
    return true;
  };

  /**
   * Touches on the ring overlay (a swatch, or the veil to close it) are also seen by the page's gesture
   * recognisers underneath, so page taps/holds are ignored while the ring is open and briefly after it closes.
   */
  const suppressUntil = useRef(0);
  const suppressed = () => ring !== null || nowMs() < suppressUntil.current;

  const onTap = (px: number, py: number) => {
    if (suppressed()) return;
    const r = regionAt(page, px, py);
    if (r === null) return;
    if (fill(r, lastColor)) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  };

  const onHold = (px: number, py: number, x: number, y: number) => {
    if (suppressed()) return;
    const r = regionAt(page, px, py);
    if (r === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const progress = makeMutable(0);
    setHighlight({ r, progress });
    progress.set(withTiming(1, { duration: 220, easing: MOTION.easeOut }));
    setRing({ r, x, y: y + areaTop });
  };

  const closeRing = () => {
    suppressUntil.current = nowMs() + 450;
    highlight?.progress.set(withTiming(0, { duration: 200, easing: MOTION.easing }));
    setRing(null);
  };

  const pick = (color: string) => {
    if (!ring) return;
    suppressUntil.current = nowMs() + 450;
    fill(ring.r, color);
    choose(color);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    highlight?.progress.set(withTiming(0, { duration: 300, easing: MOTION.easing }));
    setRing(null);
  };

  /** Select a colour (tray or ring). */
  const choose = (color: string) => {
    setLastColor(color);
    saveLastColor(page.id, color);
  };

  const selectFromTray = (color: string) => {
    if (color === lastColor) return;
    choose(color);
    Haptics.selectionAsync().catch(() => {});
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

  // While the ring is open only the ring reacts (its veil closes it).
  const pageActive = ring === null;
  const w = screen.w || 390;
  const bar = toolbarSizes(w);
  return (
    <View style={styles.root} onLayout={(e) => setScreen({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Toolbar
        sizes={bar}
        inset={insets}
        onLayout={(e) => setAreaTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        left={
          <>
            <BackButton size={bar.big} onPress={goBack} />
            <UndoButton size={bar.big} onPress={undo} disabled={history.length === 0} />
          </>
        }
        right={
          <>
            <MusicToggle size={bar.music} />
            {/* grown-ups action: smaller and quieter, opens the parental gate */}
            <RoundButton accessibilityLabel={t('coloring.save')} onPress={saver.ask} size={bar.save} color="#F3EEFF">
              <SaveIcon size={bar.save * 0.5} />
            </RoundButton>
            {page.id !== 'sample' && (
              <RoundButton accessibilityLabel={t('coloring.next')} onPress={goNext} size={bar.big}>
                <NextIcon size={bar.big * 0.5} />
              </RoundButton>
            )}
          </>
        }
      />

      <ZoomCanvas page={page} fills={fills} fade={fade} highlight={highlight} onTap={onTap} onHold={onHold} active={pageActive} radius={RADIUS} shadow={SHADOW.soft} style={styles.area}>
        {showHint && <FirstHint text={t('coloring.hint')} />}
      </ZoomCanvas>

      {/* When the picture is finished the "All done!" card takes the tray's place (never covering the picture). */}
      {done && !ring ? (
        <DoneCard
          page={page}
          fills={fills}
          bottomInset={insets.bottom}
          hasNext={next !== null}
          onNext={goNext}
          onSave={saver.ask}
          onKeep={() => setDone(false)}
        />
      ) : (
        <PaletteTray
          colors={page.palette}
          selected={lastColor}
          onSelect={selectFromTray}
          width={w - insets.left - insets.right}
          bottomInset={insets.bottom}
          label={(n) => t('coloring.color', { n })}
        />
      )}

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
          scale={w >= 600 ? 1.25 : 1}
        />
      )}

      {saver.element}
    </View>
  );
}

/**
 * First-use hint, picture-first: a small hand glides up from the colour tray towards the picture twice
 * (slow, soft, then it rests), above one short line of text. Disappears after the first fill.
 */
function FirstHint({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const leg = { duration: 1300, easing: MOTION.easing, reduceMotion: MOTION.reduce };
    p.set(withDelay(500, withRepeat(withSequence(withTiming(1, leg), withTiming(0, { ...leg, duration: 700 })), 2, false)));
  }, [p]);
  const hand = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, (p.get() - 0.7) / 0.3) * 0.7,
    transform: [{ translateY: 18 - p.get() * 46 }, { rotate: `${-8 + p.get() * 8}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={styles.hintWrap} entering={FadeIn.duration(500)} exiting={FadeOut.duration(400)}>
      <View style={styles.hintRow}>
        <Animated.View style={hand}>
          <HandIcon size={40} />
        </Animated.View>
        <Text style={styles.hint} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TONE.bg },
  area: { flex: 1, overflow: 'hidden' },
  hintWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 8,
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 4,
    boxShadow: SHADOW.soft,
  },
  hint: {
    fontFamily: FONT,
    fontSize: 17,
    lineHeight: 22,
    color: TONE.text,
    flexShrink: 1,
  },
});
