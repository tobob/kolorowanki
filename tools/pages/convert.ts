/**
 * Pastelki SVG → colouring-page parts (still in the 100×100 item space). Painter's order is kept.
 *
 * Rules (see docs/CONTENT.md):
 *  1. fill + dark stroke, fill not dark          → colourable region (original = fill)
 *  2. dark shape later re-drawn (same geometry) with a light fill ("outline behind" trick, e.g. a star drawn
 *     as a wide dark stroke + yellow fill)    → one region with a normal outline
 *  3. dark fill (eyes, nostrils, mouths)         → fixed detail, fill OUTLINE
 *  4. white no-stroke shape on a dark detail     → fixed eye highlight (white)
 *  5. any other no-stroke fill (opacity ≥ 0.9, not tiny: inner ears, bellies, spots, windows, flesh)
 *                                                → region with a thin outline (60 % of a normal line)
 *  6. dark stroke, no fill                       → line detail
 *  7. dark wide stroke + lighter stroke, same d  → "tube" (tail, handle): dark line + colourable stroke region
 *  8. coloured stroke ≥ 3 wide over paper or a clearly different colour (cherry stems, sun rays) → tube
 *  8b. a coloured stroke DARKER than what it sits on (snail spiral, tabby stripes) → thin line detail
 *  9. everything else — blush (opacity < 0.9), highlight/shading strokes in a tint of the colour below,
 *     thin or white strokes — is dropped.
 */
import { OUTLINE } from '../../src/coloring/types';
import { area, contains, emptyBox, growBox, midPoint, pathBox, type Box, type Path } from './geom';
import { multiToPath, pathToMulti, unionAll } from './poly';
import { readSvg, type Prim } from './svg';

export type Part =
  | { kind: 'region'; path: Path; original: string; sw: number }
  /** colourable stroke: a dark line `inner·scale + 2·band·lineScale` wide, the child's colour `inner·scale` wide on top */
  | { kind: 'tube'; path: Path; original: string; inner: number; band: number }
  | { kind: 'fixed'; path: Path; fill: string; sw: number }
  | { kind: 'line'; path: Path; sw: number };

export const hexRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
export function luminance(h: string) {
  const [r, g, b] = hexRgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const isDark = (h: string | null) => !!h && luminance(h) < 0.12;
const isWhite = (h: string | null) => !!h && luminance(h) > 0.82;

function lab(hex: string): [number, number, number] {
  const [r, g, b] = hexRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export const labDist = (a: string, b: string) => {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
/** Below this a coloured stroke is a tint/shade of what it sits on (shading), above it is a real part. */
const DISTINCT = 38;

const inside = (b: Box, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
const same = (a: Prim, b: Prim) => a.key === b.key && a.matKey === b.matKey;
const scaleOf = (p: Prim) => {
  const m = p.matKey.split(',').map(Number);
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
};

export type Converted = { parts: Part[]; dropped: string[]; box: Box };

/** Outline width (Pastelki units) for parts that had no outline of their own: 60 % of a normal line. */
export const THIN = 2.4;
/** No-stroke fills smaller than this (item units²) stay decoration. */
const MIN_PART_AREA = 3;

export function convertItem(svg: string): Converted {
  const { prims, dropped } = readSvg(svg);
  const parts: Part[] = [];
  const darkBoxes: Box[] = [];
  const skip = new Set<number>();
  const redrawn = new Map<number, Path>(); // light half of rule 2 → geometry to use

  // rule 2: dark shape(s) whose geometry is later drawn again with a light fill. Consecutive redraws in the
  // same colour (a cloud built from circles) are unioned into ONE region with a normal outline.
  const pairs: number[] = [];
  prims.forEach((p, i) => {
    const dark = (isDark(p.fill) || !p.fill) && isDark(p.stroke) && p.sw > 0;
    if (!dark || p.clipped) return;
    const j = prims.findIndex((q, k) => k > i && same(p, q) && q.fill && !isDark(q.fill) && !isDark(q.stroke));
    if (j > 0 && (isDark(p.fill) || p.sw >= 6)) {
      skip.add(i);
      pairs.push(j);
    }
  });
  pairs.sort((a, b) => a - b);
  for (let g = 0; g < pairs.length; ) {
    let h = g;
    while (h + 1 < pairs.length && pairs[h + 1] === pairs[h] + 1 && prims[pairs[h + 1]].fill === prims[pairs[g]].fill) h++;
    const group = pairs.slice(g, h + 1);
    const geom = group.length > 1 ? multiToPath(unionAll(group.map((k) => pathToMulti(prims[k].path)))) : prims[group[0]].path;
    redrawn.set(group[0], geom);
    for (const k of group.slice(1)) skip.add(k);
    g = h + 1;
  }

  /** colour of the region under a point (last drawn wins), or null for paper */
  const under = (x: number, y: number): string | null => {
    for (let k = parts.length - 1; k >= 0; k--) {
      const pt = parts[k];
      if ((pt.kind === 'region' || pt.kind === 'fixed') && contains(pt.path, x, y)) return pt.kind === 'region' ? pt.original : pt.fill;
    }
    return null;
  };

  for (let i = 0; i < prims.length; i++) {
    if (skip.has(i)) continue;
    const p: Prim = prims[i];
    if (p.opacity < 0.9) continue;
    // an open line with the SVG default fill (black) paints nothing: treat it as unfilled
    if (p.fill && area(p.path) < 1) p.fill = null;
    const darkStroke = isDark(p.stroke) && p.sw > 0;
    const geom = redrawn.get(i);
    if (geom) {
      parts.push({ kind: 'region', path: geom, original: p.fill!, sw: 4 });
      continue;
    }
    if (p.fill) {
      if (isDark(p.fill)) {
        parts.push({ kind: 'fixed', path: p.path, fill: OUTLINE, sw: darkStroke ? p.sw : 0 });
        darkBoxes.push(pathBox(p.path));
      } else if (darkStroke) {
        parts.push({ kind: 'region', path: p.path, original: p.fill, sw: p.sw });
      } else {
        // rule 5: a part without its own outline (inner ear, belly, spot, window) → region with a thin outline
        const b = pathBox(p.path);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        if (isWhite(p.fill) && darkBoxes.some((d) => inside(d, cx, cy))) {
          parts.push({ kind: 'fixed', path: p.path, fill: '#FFFFFF', sw: 0 }); // eye highlight
          continue;
        }
        if (area(p.path) >= MIN_PART_AREA) parts.push({ kind: 'region', path: p.path, original: p.fill, sw: THIN });
      }
      continue;
    }
    if (!p.stroke || p.sw <= 0) continue;
    if (darkStroke) {
      const q = prims[i + 1];
      if (q && !q.fill && q.stroke && !isDark(q.stroke) && same(p, q) && q.sw < p.sw && q.opacity >= 0.9) {
        // rule 7: tube (tail, handle) → dark line + colourable inner stroke
        parts.push({ kind: 'tube', path: p.path, original: q.stroke, inner: q.sw * scaleOf(p), band: (p.sw - q.sw) / 2 });
        i++;
        continue;
      }
      parts.push({ kind: 'line', path: p.path, sw: p.sw });
      continue;
    }
    // rule 8: a coloured stroke that is a real part (stem, string, sun ray), not shading
    if (p.sw >= 3 && !isWhite(p.stroke)) {
      const [mx, my] = midPoint(p.path);
      const below = under(mx, my);
      // highlights are lighter than what they sit on; stems/strings are not
      if (!below || (!isDark(below) && labDist(below, p.stroke) >= DISTINCT && luminance(p.stroke) <= luminance(below) + 0.05))
        parts.push({ kind: 'tube', path: p.path, original: p.stroke, inner: p.sw * scaleOf(p), band: THIN });
      // rule 8b: a darker shade drawn as a line (snail spiral, tabby stripes, fin lines) → thin line detail
      else if (below && luminance(p.stroke) < luminance(below) - 0.03) parts.push({ kind: 'line', path: p.path, sw: THIN });
    }
  }
  const box = emptyBox();
  for (const pt of parts) growBox(box, pt.path, pt.kind === 'tube' ? pt.inner / 2 + pt.band : pt.sw / 2);
  return { parts, dropped, box };
}
