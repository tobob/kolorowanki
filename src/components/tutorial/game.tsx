/**
 * The interactive "how to play": a real little colouring page (the apple) where the child does every
 * step, guided by Edyta the sheep, who speaks (voice + speech bubble), points the way (a soft hand),
 * waits, and praises with a happy hop.
 *
 *   tray → tap a colour in the tray          · "Super! Masz kolor!"
 *   tap  → tap the apple, it fills            · "Brawo! Jabłuszko jest kolorowe!"
 *   hold → press and hold (the leaf) → ring  → holdPick: tap a colour in the ring · "Ale pięknie!"
 *   bg   → tap the background, it fills       · "Cudownie!"
 *   undo → tap the undo arrow                 · "Widzisz? Nic się nie stało!"
 *   done → "Umiesz już kolorować! …" + the big "Let's colour!" button
 *
 * The top bar is the colouring screen's own (src/coloring/Toolbar.tsx): Back and, from the undo step, Undo
 * sit exactly where they will be on every page; Skip for grown-ups on the right. The tray stays under the
 * picture (at the bottom of the screen Edyta would cover it), so Edyta says "under the picture".
 *
 * Kind to a two-year-old: anything close enough counts (a tap anywhere on the picture colours the apple,
 * any tap in the background step colours the background); after ~8 s of nothing, or a touch somewhere
 * else, Edyta gives one gentle hint (never scolding) and the hand keeps pulsing slowly. Skip is always
 * there for grown-ups. Calm: eased 250–600 ms moves, nothing flashes, Reduce Motion respected.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  makeMutable,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { EdytaLine } from '@/audio/edyta-lines';
import { hasEdytaClip, speakEdyta, stopEdyta } from '@/audio/voice';
import { AppText } from '@/components/app-text';
import { SpeakerIcon } from '@/components/icons';
import { SoftButton } from '@/components/soft-button';
import { hitGrid, regionAt, warmHitMap } from '@/coloring/hit';
import { PageShapes, type Fade, type Highlight } from '@/coloring/PageShapes';
import { getPage, pagesOfLevel } from '@/coloring/pages';
import { PaletteRing } from '@/coloring/PaletteRing';
import { PaletteTray, traySwatchSize } from '@/coloring/PaletteTray';
import { PAGE_H, PAGE_W, PAPER, type Fills, type Page } from '@/coloring/types';
import { BackButton, Toolbar, toolbarHeight, toolbarSizes, undoCenter, UndoButton } from '@/coloring/Toolbar';
import { HandIcon } from '@/coloring/ui';
import { RADIUS, SHADOW, TONE } from '@/constants/ui';
import { useLang, useT } from '@/i18n';
import { usePrefs } from '@/shell/prefs';

import { Edyta } from './edyta';

type Phase = 'tray' | 'tap' | 'hold' | 'holdPick' | 'bg' | 'undo' | 'done';
const ORDER: Phase[] = ['tray', 'tap', 'hold', 'bg', 'undo', 'done'];
const PRAISE: Partial<Record<Phase, EdytaLine>> = { tray: 'trayOk', tap: 'tapOk', holdPick: 'holdOk', bg: 'bgOk', undo: 'undoOk' };
const HINT: Partial<Record<Phase, EdytaLine>> = { tray: 'trayHint', tap: 'tapHint', hold: 'holdHint', holdPick: 'holdHint', bg: 'bgHint', undo: 'undoHint' };
const NEXT: Partial<Record<Phase, Phase>> = { tray: 'tap', tap: 'hold', holdPick: 'bg', bg: 'undo', undo: 'done' };
/** After the instruction: this long without the right touch → one gentle hint. */
const HINT_AFTER_MS = 8000;
/** After the praise: a short breath before the next step. */
const NEXT_AFTER_MS = 1000;
const TAIL = 18;
const PAD = 16;
const NO_INSET = { top: 0, left: 0, right: 0 };

const EASE = { easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System };
/** The bubble appears with a gentle pop: fade + a small scale, eased, no overshoot. */
const POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.quad) },
}).duration(320);

function tutorialPage(): Page | undefined {
  return getPage('l1-apple') ?? pagesOfLevel(1)[0];
}

/** Region roles on the sample page: the background (top-left corner), the biggest part, the smallest part. */
function roles(page: Page) {
  const { w, h, grid } = hitGrid(page);
  const bg = grid[0] - 1;
  const stat = new Map<number, { n: number; sx: number; sy: number }>();
  for (let row = 0; row < h; row++)
    for (let col = 0; col < w; col++) {
      const r = grid[row * w + col] - 1;
      if (r < 0 || r === bg) continue;
      const c = stat.get(r) ?? { n: 0, sx: 0, sy: 0 };
      c.n++;
      c.sx += col;
      c.sy += row;
      stat.set(r, c);
    }
  const sorted = [...stat.entries()].sort((a, b) => b[1].n - a[1].n);
  const at = (r: number) => {
    // the cell of region r nearest to its centroid (centroids of odd shapes can fall outside)
    const c = stat.get(r)!;
    const cx = c.sx / c.n;
    const cy = c.sy / c.n;
    let best = { d: Infinity, col: 0, row: 0 };
    for (let row = 0; row < h; row++)
      for (let col = 0; col < w; col++)
        if (grid[row * w + col] - 1 === r) {
          const d = (col - cx) ** 2 + (row - cy) ** 2;
          if (d < best.d) best = { d, col, row };
        }
    return { x: ((best.col + 0.5) / w) * PAGE_W, y: ((best.row + 0.5) / h) * PAGE_H };
  };
  const main = sorted[0]?.[0] ?? 0;
  const small = sorted[sorted.length - 1]?.[0] ?? main;
  return { bg, main, small, mainAt: at(main), smallAt: at(small), bgAt: { x: PAGE_W * 0.16, y: PAGE_H * 0.86 } };
}

export function TutorialGame({ onFinish }: { onFinish: () => void }) {
  const page = useMemo(() => tutorialPage(), []);
  if (!page) return null;
  return <Game page={page} onFinish={onFinish} />;
}

function Game({ page, onFinish }: { page: Page; onFinish: () => void }) {
  const t = useT();
  const lang = useLang();
  const { voice } = usePrefs();
  const insets = useSafeAreaInsets();
  const { width: W, height: winH } = useWindowDimensions();
  const [rootH, setRootH] = useState(0);
  const H = rootH || winH - insets.top;
  const wide = W >= 600;
  const role = useMemo(() => roles(page), [page]);
  useEffect(() => warmHitMap(page), [page]);

  // ----- layout (all absolute, so the hand knows where everything is) -----
  const E = Math.round(Math.min(W * 0.44, H * 0.27)); // Edyta: the star of the bottom-left corner
  const bottomPad = Math.max(insets.bottom - 18, 6);
  const bottomRow = Math.round(E * 0.8) + bottomPad;
  const font = wide ? 24 : H < 700 ? 17 : 19;
  const lineH = Math.round(font * 1.3);
  const bubbleW = Math.min(W - 2 * PAD, wide ? 760 : 600);
  const [textH, setTextH] = useState<Record<string, number>>({});
  const measured = Object.values(textH);
  const bubbleH = (measured.length ? Math.max(...measured) : lineH * 3) + 2 * 16;
  const bubbleTop = H - bottomRow - TAIL - bubbleH;
  // inside the tutorial's SafeAreaView: the insets are already applied
  const bar = toolbarSizes(W);
  const topBar = toolbarHeight(bar, NO_INSET);
  const trayW = Math.min(W, 720);
  const ts = traySwatchSize(trayW, page.palette.length);
  const trayInner = Math.round(ts * 0.22) + 4;
  const trayH = 6 + 2 * trayInner + ts + 10;
  const areaH = bubbleTop - 10 - topBar;
  const size = Math.floor(Math.max(120, Math.min(W - 48, wide ? 600 : 460, ((areaH - trayH - 8) * 3) / 4)));
  const picH = (size * PAGE_H) / PAGE_W;
  const picTop = topBar + Math.max(0, (areaH - picH - 8 - trayH) / 2);
  const picLeft = (W - size) / 2;
  const trayTop = picTop + picH + 8;
  const trayLeft = (W - trayW) / 2;
  const rowW = page.palette.length * (ts + 6) + 2 * 7;
  const swatchAt = (i: number) => ({
    x: trayLeft + (trayW - rowW) / 2 + 7 + i * (ts + 6) + 3 + ts / 2,
    y: trayTop + 6 + trayInner + ts / 2,
  });
  const k = size / PAGE_W;
  const onPic = (p: { x: number; y: number }) => ({ x: picLeft + p.x * k, y: picTop + p.y * k });
  const eye = { x: 6 + E * 0.51, y: H - bottomPad - E * 0.46 };

  // ----- colouring state -----
  const [fills, setFills] = useState<Fills>({});
  const [history, setHistory] = useState<Fills[]>([]);
  const [fade, setFade] = useState<Fade | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [ring, setRing] = useState<{ r: number; x: number; y: number } | null>(null);

  const fill = (r: number, c: string) => {
    if (fills[r] === c) return;
    const progress = makeMutable(0);
    setHistory((h) => [...h, fills]);
    setFade({ r, from: fills[r] ?? PAPER, progress });
    setFills({ ...fills, [r]: c });
    progress.set(withTiming(1, { duration: 380, ...EASE }));
  };

  // ----- Edyta: speech, looks, hops -----
  const mouth = useSharedValue(0);
  const lookX = useSharedValue(0.6);
  const lookY = useSharedValue(-0.6);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const onMouth = (v: number) => mouth.set(withTiming(v, { duration: 70 }));
  const [line, setLine] = useState<EdytaLine>('tray');
  const [phase, setPhaseState] = useState<Phase>('tray');
  const phaseRef = useRef<Phase>('tray');
  const busy = useRef(false); // praising: inputs do not count until the next step starts
  const [praising, setPraising] = useState(false);
  const hinted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
  };
  const say = (l: EdytaLine, then?: () => void) => {
    setLine(l);
    speakEdyta(lang, l, t(`edyta.${l}`), onMouth, then);
  };
  const happyHop = (times = 1) => {
    const one = [withTiming(E * 0.07, { duration: 220, ...EASE }), withTiming(0, { duration: 260, ...EASE })];
    hop.set(withSequence(...Array.from({ length: times }, () => one).flat()));
  };
  const sway = (deg: number, times: number) => {
    const seq = Array.from({ length: times }, () => [withTiming(deg, { duration: 260, ...EASE }), withTiming(-deg, { duration: 260, ...EASE })]).flat();
    tilt.set(withSequence(...seq, withTiming(0, { duration: 260, ...EASE })));
  };
  const lookAt = (p: { x: number; y: number }) => {
    const dx = p.x - eye.x;
    const dy = p.y - eye.y;
    const len = Math.hypot(dx, dy) || 1;
    lookX.set(withTiming(dx / len, { duration: 400, ...EASE }));
    lookY.set(withTiming(dy / len, { duration: 400, ...EASE }));
  };

  const hint = () => {
    const h = HINT[phaseRef.current];
    if (!h || hinted.current || busy.current) return;
    hinted.current = true;
    clearTimer();
    sway(3, 1);
    say(h);
  };
  const start = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
    busy.current = false;
    setPraising(false);
    hinted.current = false;
    clearTimer();
    say(p, () => {
      if (phaseRef.current === p && p !== 'done') timer.current = setTimeout(hint, HINT_AFTER_MS);
    });
  };
  const praise = (p: Phase) => {
    if (busy.current || phaseRef.current !== p) return;
    busy.current = true;
    setPraising(true);
    clearTimer();
    happyHop();
    const ok = PRAISE[p];
    const next = NEXT[p];
    if (!ok || !next) return;
    say(ok, () => {
      timer.current = setTimeout(() => start(next), NEXT_AFTER_MS);
    });
  };

  useEffect(() => {
    // Hello: a little wave (a sway), then the first instruction.
    sway(5, 2);
    const first = setTimeout(() => start('tray'), 700);
    return () => {
      clearTimeout(first);
      clearTimer();
      stopEdyta();
    };
    // Runs once; the step machine lives in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new language (grown-ups changed it) or the voice switched on: say the current line again.
  const langRef = useRef(lang);
  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;
    start(phaseRef.current === 'holdPick' ? 'hold' : phaseRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Where the hand points (and Edyta looks) for each step.
  const target = (() => {
    switch (phase) {
      case 'tray':
        return swatchAt(Math.min(3, page.palette.length - 1));
      case 'tap':
        return onPic(role.mainAt);
      case 'hold':
        return onPic(role.smallAt);
      case 'bg':
        return onPic(role.bgAt);
      case 'undo':
        return undoCenter(bar, NO_INSET);
      default:
        return null;
    }
  })();
  useEffect(() => {
    if (target) lookAt(target);
    else {
      lookX.set(withTiming(0, { duration: 400, ...EASE }));
      lookY.set(withTiming(0, { duration: 400, ...EASE }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, target?.x, target?.y]);

  // ----- touches -----
  const pickTray = (c: string) => {
    setColor(c);
    if (phaseRef.current === 'tray') praise('tray');
  };
  const current = () => color ?? page.palette[0];
  const toPage = (e: GestureResponderEvent) => ({ px: e.nativeEvent.locationX / k, py: e.nativeEvent.locationY / k, x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

  const onPicTap = (e: GestureResponderEvent) => {
    const p = phaseRef.current;
    if (busy.current || ring) return;
    const { px, py } = toPage(e);
    const r = regionAt(page, px, py);
    if (p === 'tap') {
      // close enough: a tap on the paper still colours the apple
      fill(r === null || r === role.bg ? role.main : r, current());
      praise('tap');
    } else if (p === 'bg') {
      // a strong colour already used on the apple would swallow it: then the softest unused pastel
      const used = new Set(Object.values(fills));
      const soft = [...page.palette].reverse().find((c) => !used.has(c)) ?? page.palette[page.palette.length - 1];
      fill(role.bg, used.has(current()) ? soft : current());
      praise('bg');
    } else if (p === 'hold' && hinted.current) {
      // a second quick tap still opens the ring — never block a small child
      openRing(e);
    } else if (p !== 'done') {
      hint();
    }
  };
  const openRing = (e: GestureResponderEvent) => {
    const { px, py, x, y } = toPage(e);
    let r = regionAt(page, px, py);
    // close enough: near the leaf counts as the leaf; the paper too
    const near = Math.hypot(px - role.smallAt.x, py - role.smallAt.y) < 60;
    if (r === null || r === role.bg || near) r = role.small;
    const progress = makeMutable(0);
    setHighlight({ r, progress });
    progress.set(withTiming(1, { duration: 220, ...EASE }));
    setRing({ r, x: picLeft + x, y: picTop + y });
    clearTimer();
    phaseRef.current = 'holdPick';
    setPhaseState('holdPick');
    hinted.current = false;
    say('holdPick', () => {
      if (phaseRef.current === 'holdPick') timer.current = setTimeout(hint, HINT_AFTER_MS);
    });
  };
  const onPicHold = (e: GestureResponderEvent) => {
    if (busy.current || ring) return;
    const p = phaseRef.current;
    if (p === 'hold') openRing(e);
    else onPicTap(e);
  };
  const pickRing = (c: string) => {
    if (!ring) return;
    fill(ring.r, c);
    setColor(c);
    highlight?.progress.set(withTiming(0, { duration: 300, ...EASE }));
    setRing(null);
    praise('holdPick');
  };
  const closeRing = () => {
    highlight?.progress.set(withTiming(0, { duration: 200, ...EASE }));
    setRing(null);
    if (phaseRef.current === 'holdPick') {
      phaseRef.current = 'hold';
      setPhaseState('hold');
      hinted.current = true;
      hint();
    }
  };
  const onUndo = () => {
    if (phaseRef.current !== 'undo' || busy.current) return;
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(history.slice(0, -1));
      setFade(null);
      setFills(prev);
    }
    praise('undo');
  };
  const finish = () => {
    stopEdyta();
    happyHop(2);
    setTimeout(onFinish, 450);
  };

  // ----- the hand: slow, soft pulse over the target -----
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true));
  }, [pulse]);
  const handSize = wide ? 64 : 52;
  const handStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pulse.value * 8 }, { scale: 1 - pulse.value * 0.05 }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.25, transform: [{ scale: 0.9 + pulse.value * 0.15 }] }));

  const lineText = t(`edyta.${line}`);
  const stepIndex = Math.max(0, ORDER.indexOf(phase === 'holdPick' ? 'hold' : phase));
  const canReplay = voice && !praising && hasEdytaClip(lang, line);
  const tailX = Math.max(28, Math.min(E * 0.56 - PAD, bubbleW - 40));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
      {/* picture */}
      <View style={[styles.pic, { left: picLeft, top: picTop, width: size, height: picH }]}>
        <Pressable
          onPress={onPicTap}
          onLongPress={onPicHold}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel={page.title[lang]}
          style={StyleSheet.absoluteFill}
        >
          <Svg width={size} height={picH} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} style={{ backgroundColor: PAPER }}>
            <PageShapes page={page} fills={fills} fade={fade} highlight={highlight} />
          </Svg>
        </Pressable>
      </View>
      {/* the colouring screen's top bar: same Back and Undo, same place */}
      <Toolbar
        sizes={bar}
        inset={NO_INSET}
        left={
          <>
            <BackButton size={bar.big} onPress={onFinish} />
            {phase === 'undo' || phase === 'done' ? (
              <Animated.View entering={FadeIn.duration(400)}>
                <UndoButton size={bar.big} onPress={onUndo} />
              </Animated.View>
            ) : null}
          </>
        }
        right={
          <Pressable onPress={onFinish} accessibilityRole="button" hitSlop={12} style={styles.skip}>
            <AppText style={styles.skipText}>{t('tutorial.skip')}</AppText>
          </Pressable>
        }
      />

      {/* the real colour tray */}
      <View style={{ position: 'absolute', left: trayLeft, top: trayTop, width: trayW }}>
        <PaletteTray colors={page.palette} selected={color} onSelect={pickTray} width={trayW} bottomInset={0} label={(n) => t('coloring.color', { n })} />
      </View>

      {/* the pointing hand */}
      {target && !ring ? (
        <View pointerEvents="none" style={[styles.pointer, { left: target.x, top: target.y }]}>
          <Animated.View style={[styles.glow, { width: handSize * 1.3, height: handSize * 1.3, borderRadius: handSize, left: -handSize * 0.65, top: -handSize * 0.65 }, glowStyle]} />
          <Animated.View style={[{ position: 'absolute', left: -handSize * 0.44, top: -handSize * 0.08 }, handStyle]}>
            <HandIcon size={handSize} />
          </Animated.View>
        </View>
      ) : null}

      {/* Edyta, standing on the bottom edge */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('edyta.name')}
        style={{ position: 'absolute', left: 6, bottom: bottomPad }}
      >
        <Edyta size={E} mouth={mouth} look={{ x: lookX, y: lookY }} hop={hop} tilt={tilt} />
      </View>

      {/* her speech bubble, the tail pointing down at her */}
      <View style={[styles.bubble, { left: PAD, top: bubbleTop, width: bubbleW, height: bubbleH }]}>
        <Svg width={36} height={TAIL + 6} viewBox="0 0 36 24" style={[styles.tail, { left: tailX - 18 }]}>
          <Path d="M2 0 H34 L8 23 Q7 24 7.5 22 Z" fill={TONE.card} />
        </Svg>
        {/* invisible copies of every line: the tallest sets the bubble height, so nothing jumps */}
        <View style={styles.measure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {(['tray', 'trayOk', 'trayHint', 'tap', 'tapOk', 'tapHint', 'hold', 'holdPick', 'holdOk', 'holdHint', 'bg', 'bgOk', 'bgHint', 'undo', 'undoOk', 'undoHint', 'done'] as const).map((l) => (
            <AppText
              key={l}
              style={[styles.measureText, { fontSize: font, lineHeight: lineH, width: bubbleW - 2 * 18 - 30 }]}
              onLayout={(e) => {
                const h = Math.ceil(e.nativeEvent.layout.height);
                setTextH((prev) => (prev[l] === h ? prev : { ...prev, [l]: h }));
              }}
            >
              {t(`edyta.${l}`)}
            </AppText>
          ))}
        </View>
        <Animated.View key={`${line}-${lang}`} entering={POP} style={styles.bubbleInner}>
          <AppText style={[styles.lineText, { fontSize: font, lineHeight: lineH }]} accessibilityLiveRegion="polite">
            {lineText}
          </AppText>
        </Animated.View>
        {canReplay ? (
          <Pressable
            onPress={() => say(line)}
            accessibilityRole="button"
            accessibilityLabel={t('edyta.again')}
            hitSlop={10}
            style={({ pressed }) => [styles.again, pressed && styles.pressed]}
          >
            <SpeakerIcon size={wide ? 24 : 20} color="#4A6FA5" />
          </Pressable>
        ) : null}
      </View>

      {/* right of Edyta: progress dots, and at the end the big "Let's colour!" */}
      <View style={[styles.side, { left: E + 12, bottom: bottomPad, height: Math.round(E * 0.8) - 4 }]}>
        {phase === 'done' ? (
          <Animated.View entering={FadeIn.duration(500)}>
            <SoftButton size={wide ? 72 : 60} radius={RADIUS.pill} color={TONE.accent} style={styles.go} onPress={finish} accessibilityLabel={t('tutorial.start')}>
              <AppText style={[styles.goText, { fontSize: wide ? 26 : 21 }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('tutorial.start')}
              </AppText>
            </SoftButton>
          </Animated.View>
        ) : (
          <View style={styles.dots} accessibilityLabel={t('tutorial.a11y', { n: stepIndex + 1 })}>
            {ORDER.slice(0, -1).map((p, i) => (
              <View key={p} style={[styles.dot, i < stepIndex && styles.dotDone, i === stepIndex && styles.dotOn]} />
            ))}
          </View>
        )}
      </View>

      {ring ? (
        <PaletteRing
          x={ring.x}
          y={ring.y}
          colors={page.palette}
          current={color}
          bounds={{ left: 0, top: topBar, right: W, bottom: bubbleTop }}
          onPick={pickRing}
          onClose={closeRing}
          label={(n) => t('coloring.color', { n })}
          closeLabel={t('coloring.back')}
          scale={wide ? 1.2 : 1}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pic: { position: 'absolute', borderRadius: RADIUS.tile, overflow: 'hidden', backgroundColor: PAPER, boxShadow: SHADOW.lifted },
  pointer: { position: 'absolute', width: 0, height: 0, zIndex: 2 },
  glow: { position: 'absolute', backgroundColor: '#FCE3A0', borderWidth: 3, borderColor: '#F6C945' },
  bubble: { position: 'absolute', borderRadius: 28, backgroundColor: TONE.card, boxShadow: SHADOW.lifted },
  bubbleInner: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, paddingRight: 18 + 30 },
  lineText: { fontWeight: '600' },
  tail: { position: 'absolute', bottom: -TAIL - 4 },
  measure: { position: 'absolute', left: 18, top: 0, opacity: 0 },
  measureText: { position: 'absolute', left: 0, top: 0, fontWeight: '600' },
  again: {
    position: 'absolute',
    top: -12,
    right: -6,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF7',
    boxShadow: SHADOW.soft,
  },
  pressed: { opacity: 0.8 },
  side: { position: 'absolute', right: PAD, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: TONE.dotEmpty },
  dotDone: { backgroundColor: '#BFE3C1' },
  dotOn: { backgroundColor: TONE.accent, width: 28 },
  go: { paddingHorizontal: 28, width: 'auto', minWidth: 160 },
  goText: { fontWeight: '700' },
  skip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.7)' },
  skipText: { fontSize: 17, color: TONE.muted, fontWeight: '600' },
});
