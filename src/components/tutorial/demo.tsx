/**
 * Animated "how to play" demo on a real page (PageView + a pipeline page): a soft fingertip shows
 * each gesture in a slow loop. Fills change by passing new `fills` to PageView, exactly like the app.
 * The page's real colour tray (PaletteTray) sits under the picture, like on the colouring screen.
 * Steps: 0 tap a colour in the tray → tap the picture → it fills
 *        1 the quick way: press and hold → ring of colours → tap one → it fills (a quick tap reuses it)
 *        2 the background too + pinch to zoom · 3 undo.
 * Calm: 300–700 ms eased moves, long pauses, nothing flashes; respects Reduce Motion (ReduceMotion.System).
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { hitGrid } from '@/coloring/hit';
import { getPage, pagesOfLevel } from '@/coloring/pages';
import { PageView } from '@/coloring/PageView';
import { PaletteTray, traySwatchSize } from '@/coloring/PaletteTray';
import { OUTLINE, PAGE_H, PAGE_W, type Fills, type Page } from '@/coloring/types';
import { RADIUS, SHADOW, TONE } from '@/constants/ui';

const EASE = { easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System };
const tween = (sv: SharedValue<number>, to: number, duration = 450) => sv.set(withTiming(to, { duration, ...EASE }));

/** The sample page: the apple if the catalogue has it, else the first level-1 page. */
export function demoPage(): Page | undefined {
  return getPage('l1-apple') ?? pagesOfLevel(1)[0];
}

type Pt = { x: number; y: number };

/** Biggest non-background region and a point well inside it; plus a background point. */
function anchors(page: Page) {
  const { w, h, grid } = hitGrid(page);
  const bg = grid[0] - 1; // top-left corner is always background paper
  const count = new Map<number, { n: number; sx: number; sy: number }>();
  for (let row = 0; row < h; row++)
    for (let col = 0; col < w; col++) {
      const r = grid[row * w + col] - 1;
      if (r < 0 || r === bg) continue;
      const c = count.get(r) ?? { n: 0, sx: 0, sy: 0 };
      c.n++;
      c.sx += col;
      c.sy += row;
      count.set(r, c);
    }
  const sorted = [...count.entries()].sort((a, b) => b[1].n - a[1].n);
  const toPage = (col: number, row: number): Pt => ({ x: ((col + 0.5) / w) * PAGE_W, y: ((row + 0.5) / h) * PAGE_H });
  // Nearest cell of region r to its centroid (centroids of odd shapes can fall outside).
  const inside = (r: number, c: { n: number; sx: number; sy: number }): Pt => {
    const cx = c.sx / c.n;
    const cy = c.sy / c.n;
    let best = { d: Infinity, col: 0, row: 0 };
    for (let row = 0; row < h; row++)
      for (let col = 0; col < w; col++)
        if (grid[row * w + col] - 1 === r) {
          const d = (col - cx) ** 2 + (row - cy) ** 2;
          if (d < best.d) best = { d, col, row };
        }
    return toPage(best.col, best.row);
  };
  const main = sorted[0] ? { r: sorted[0][0], p: inside(sorted[0][0], sorted[0][1]) } : { r: 0, p: { x: 150, y: 200 } };
  const second = sorted[1] ? { r: sorted[1][0], p: inside(sorted[1][0], sorted[1][1]) } : null;
  return { main, second, bg: { r: bg, p: { x: PAGE_W * 0.14, y: PAGE_H * 0.88 } } };
}

const RING = 0.27; // ring radius, × size
const SWATCH = 0.14; // swatch diameter, × size

export function TutorialDemo({ step, size }: { step: number; size: number }) {
  const page = useMemo(() => demoPage(), []);
  if (!page) return <View style={[styles.frame, { width: size, height: (size * 4) / 3 }]} />;
  return <Demo key={step} page={page} step={step} size={size} />;
}

function Demo({ page, step, size }: { page: Page; step: number; size: number }) {
  const k = size / PAGE_W;
  const height = (size * 4) / 3;
  const a = useMemo(() => anchors(page), [page]);
  // Demo with the picture's own colour when it is on the page palette (a red apple), else the 3rd swatch.
  const own = page.palette.findIndex((c) => c.toLowerCase() === page.original[a.main.r]?.toLowerCase());
  const pickIndex = own >= 0 ? own : 2;
  const pick = page.palette[pickIndex] ?? page.palette[0];
  const bgColor = page.palette[page.palette.length - 1] ?? '#DCEAF7';
  const [fills, setFills] = useState<Fills>({});
  const [ringAt, setRingAt] = useState<Pt>(a.main.p);
  const colors = page.palette.slice(0, 7);
  const [sel, setSel] = useState<string>(colors[0]);
  // Tray geometry (mirrors PaletteTray's layout) so the fingertip lands on a real swatch.
  const [trayY, setTrayY] = useState(height + 8);
  const ts = traySwatchSize(size, colors.length);
  const rowW = colors.length * (ts + 6) + 2 * 7;
  const trayCentreY = trayY + 6 + Math.round(ts * 0.22) + 4 + ts / 2;
  const trayPos = (i: number): Pt => ({ x: (size - rowW) / 2 + 7 + i * (ts + 6) + 3 + ts / 2, y: trayCentreY });

  const fx = useSharedValue(a.main.p.x * k);
  const fy = useSharedValue(a.main.p.y * k);
  const finger = useSharedValue(0); // fingertip visible
  const press = useSharedValue(0); // fingertip pressed (sinks a little)
  const hold = useSharedValue(0); // hold progress halo
  const ring = useSharedValue(0); // ring of colours
  const zoom = useSharedValue(1);
  const pinch = useSharedValue(0); // two-finger spread, 0..1
  const undo = useSharedValue(0); // undo button pressed

  const swatchPos = (i: number, at: Pt) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
    const c = ringCenter(at, k, size, height);
    return { x: c.x + Math.cos(ang) * RING * size, y: c.y + Math.sin(ang) * RING * size };
  };

  useEffect(() => {
    let alive = true;
    const wait = (ms: number) =>
      new Promise<void>((res, rej) => setTimeout(() => (alive ? res() : rej(new Error('stop'))), ms));
    const moveTo = async (p: Pt, ms = 650) => {
      tween(fx, p.x, ms);
      tween(fy, p.y, ms);
      await wait(ms);
    };
    const tap = async () => {
      tween(press, 1, 150);
      await wait(200);
      tween(press, 0, 250);
      await wait(250);
    };
    const holdAt = async (p: Pt) => {
      setRingAt(p);
      await moveTo({ x: p.x * k, y: p.y * k });
      tween(press, 1, 200);
      tween(hold, 1, 800);
      await wait(850);
      tween(ring, 1, 450);
      tween(press, 0, 250);
      tween(hold, 0, 300);
      await wait(600);
    };
    const pickSwatch = async (i: number, at: Pt) => {
      await moveTo(swatchPos(i, at), 600);
      await tap();
    };

    const loops: Record<number, () => Promise<void>> = {
      // 0: tap a colour in the tray, then tap the picture → it fills.
      0: async () => {
        setFills({});
        setSel(colors[pickIndex === 0 ? 1 : 0]);
        fx.set(size * 0.5);
        fy.set(trayCentreY - 40);
        tween(finger, 1, 400);
        await wait(500);
        await moveTo(trayPos(pickIndex), 700);
        await tap();
        setSel(pick);
        await wait(700);
        await moveTo({ x: a.main.p.x * k, y: a.main.p.y * k }, 900);
        await tap();
        setFills({ [a.main.r]: pick });
        await wait(1800);
        tween(finger, 0, 400);
        await wait(900);
      },
      // 1: the quick way: hold → ring → tap a colour → the part fills; a quick tap elsewhere reuses it.
      1: async () => {
        setFills({});
        setSel(colors[pickIndex === 0 ? 1 : 0]);
        tween(finger, 1, 400);
        await holdAt(a.main.p);
        await pickSwatch(pickIndex, a.main.p);
        tween(ring, 0, 300);
        setSel(pick);
        setFills({ [a.main.r]: pick });
        await wait(900);
        if (a.second) {
          await moveTo({ x: a.second.p.x * k, y: a.second.p.y * k }, 700);
          await tap();
          setFills({ [a.main.r]: pick, [a.second.r]: pick });
        }
        await wait(1400);
        tween(finger, 0, 400);
        await wait(900);
      },
      // 2: hold on the empty paper → colour the background; then pinch to zoom.
      2: async () => {
        setFills({ [a.main.r]: pick });
        setSel(pick);
        tween(finger, 1, 400);
        await holdAt(a.bg.p);
        await pickSwatch(6, a.bg.p);
        tween(ring, 0, 300);
        setSel(bgColor);
        setFills({ [a.main.r]: pick, [a.bg.r]: bgColor });
        await wait(900);
        tween(finger, 0, 300);
        await wait(400);
        tween(pinch, 1, 300);
        await wait(300);
        tween(zoom, 1.45, 1100);
        tween(pinch, 2, 1100);
        await wait(1700);
        tween(zoom, 1, 900);
        tween(pinch, 1, 900);
        await wait(900);
        tween(pinch, 0, 300);
        await wait(900);
      },
      // 3: undo takes the last colour back.
      3: async () => {
        setFills({ [a.main.r]: pick, [a.bg.r]: bgColor });
        setSel(bgColor);
        fx.set(size * 0.6);
        fy.set(height * 0.6);
        tween(finger, 1, 400);
        await wait(600);
        await moveTo({ x: size - 36, y: height - 36 }, 800);
        tween(press, 1, 150);
        tween(undo, 1, 150);
        await wait(220);
        tween(press, 0, 250);
        tween(undo, 0, 250);
        setFills({ [a.main.r]: pick });
        await wait(1600);
        tween(finger, 0, 400);
        await wait(900);
      },
    };

    (async () => {
      try {
        await wait(400);
        while (alive) await loops[step]();
      } catch {
        // stopped
      }
    })();
    return () => {
      alive = false;
    };
    // The loop owns its shared values; restart only when the step changes (Demo is keyed by step).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: finger.value * (1 - Math.min(pinch.value, 1)),
    transform: [{ translateX: fx.value - 22 }, { translateY: fy.value - 22 }, { scale: 1 - press.value * 0.18 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: hold.value * 0.9,
    transform: [{ translateX: fx.value - 40 }, { translateY: fy.value - 40 }, { scale: 0.6 + hold.value * 0.4 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value, transform: [{ scale: 0.7 + ring.value * 0.3 }] }));
  const pinchA = useAnimatedStyle(() => {
    const d = 18 + Math.max(0, pinch.value - 1) * size * 0.16;
    return {
      opacity: Math.min(pinch.value, 1),
      transform: [{ translateX: size / 2 - 22 - d * 0.7 }, { translateY: height / 2 - 22 + d * 0.7 }],
    };
  });
  const pinchB = useAnimatedStyle(() => {
    const d = 18 + Math.max(0, pinch.value - 1) * size * 0.16;
    return {
      opacity: Math.min(pinch.value, 1),
      transform: [{ translateX: size / 2 - 22 + d * 0.7 }, { translateY: height / 2 - 22 - d * 0.7 }],
    };
  });
  const undoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - undo.value * 0.08 }] }));

  const center = ringCenter(ringAt, k, size, height);
  const sw = SWATCH * size;

  return (
    <View style={{ width: size }}>
    <View style={[styles.frame, { width: size, height }]}>
      <Animated.View style={pageStyle}>
        <PageView page={page} fills={fills} size={size} />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height }, ringStyle]}>
        {page.palette.slice(0, 7).map((c, i) => {
          const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
          return (
            <View
              key={i}
              style={[
                styles.swatch,
                {
                  width: sw,
                  height: sw,
                  borderRadius: sw / 2,
                  backgroundColor: c,
                  left: center.x + Math.cos(ang) * RING * size - sw / 2,
                  top: center.y + Math.sin(ang) * RING * size - sw / 2,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {step === 3 ? (
        <Animated.View style={[styles.undo, undoStyle]}>
          <UndoGlyph />
        </Animated.View>
      ) : null}
    </View>

      <View pointerEvents="none" style={styles.trayBox} onLayout={(e) => setTrayY(e.nativeEvent.layout.y)}>
        <PaletteTray colors={colors} selected={sel} onSelect={() => {}} width={size} bottomInset={0} label={(n) => String(n)} />
      </View>

      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Animated.View pointerEvents="none" style={[styles.finger, fingerStyle]} />
      <Animated.View pointerEvents="none" style={[styles.finger, pinchA]} />
      <Animated.View pointerEvents="none" style={[styles.finger, pinchB]} />
    </View>
  );
}

/** Height the demo needs under the picture for its tray (for layout in the tutorial screen). */
export function demoTrayHeight(size: number) {
  const ts = traySwatchSize(size, 7);
  return 8 + 6 + 2 * (Math.round(ts * 0.22) + 4) + ts + 10;
}

/** Keep the ring inside the frame (same idea as the real PaletteRing). */
function ringCenter(p: Pt, k: number, w: number, h: number): Pt {
  const m = RING * w + (SWATCH * w) / 2 + 4;
  return { x: Math.min(Math.max(p.x * k, m), w - m), y: Math.min(Math.max(p.y * k, m), h - m) };
}

function UndoGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M8.5 5.5 L4 10 L8.5 14.5 M4 10 H14 A5.5 5.5 0 0 1 14 21 H10"
        stroke={OUTLINE}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: RADIUS.tile, overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: SHADOW.lifted },
  ring: { position: 'absolute', left: 0, top: 0 },
  trayBox: { marginTop: 8, marginHorizontal: -12 },
  swatch: { position: 'absolute', borderWidth: 3, borderColor: '#FFFFFF', boxShadow: SHADOW.soft },
  undo: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TONE.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOW.soft,
  },
  halo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#F6C945',
    backgroundColor: 'rgba(252, 227, 160, 0.35)',
  },
  finger: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 3,
    borderColor: 'rgba(75, 68, 83, 0.55)',
    boxShadow: SHADOW.lifted,
  },
});
