/** Page palettes: exactly 7 soft colours, covering the page's natural (original Pastelki) colours. */
import { OUTLINE } from '../../src/coloring/types';
import { hexRgb, luminance } from './convert';

/** Curated Pastelki-style crayon box, in the order the ring shows them (warm → cool → neutral). */
export const CRAYONS: { id: string; hex: string }[] = [
  { id: 'red', hex: '#E5534B' },
  { id: 'rose', hex: '#F29BB8' },
  { id: 'orange', hex: '#F28C38' },
  { id: 'peach', hex: '#F9C69C' },
  { id: 'sun', hex: '#F6C945' },
  { id: 'leaf', hex: '#5BB36A' },
  { id: 'mint', hex: '#A8DDB5' },
  { id: 'sky', hex: '#4A90D9' },
  { id: 'ice', hex: '#9BC2EA' },
  { id: 'plum', hex: '#9B6BC9' },
  { id: 'lilac', hex: '#C9B3E6' },
  { id: 'brown', hex: '#9A6B4A' },
  { id: 'sand', hex: '#D9B48F' },
  { id: 'grey', hex: '#A3A7AE' },
  // light "background" crayons
  { id: 'pale-sky', hex: '#D4E6F7' },
  { id: 'cream', hex: '#FFF0C2' },
  { id: 'pale-mint', hex: '#D3EFDC' },
  { id: 'pale-rose', hex: '#FBDDE6' },
  { id: 'pale-lilac', hex: '#E6DDF5' },
];
/** When a page needs fewer natural colours, the rest come from here (cheerful basics first). */
const COMPLEMENTS = ['red', 'sun', 'leaf', 'sky', 'rose', 'orange', 'plum', 'brown', 'ice', 'mint', 'lilac', 'peach', 'grey', 'sand'];

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
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export function nearestCrayon(hex: string): string {
  let best = CRAYONS[0];
  for (const c of CRAYONS) if (labDist(hex, c.hex) < labDist(hex, best.hex)) best = c;
  return best.id;
}

const MIN_DIST = 18;

/** originals[r] with weight[r] (visible area) → 7 crayon hexes in ring order. */
export function choosePalette(originals: string[], weight: number[]): string[] {
  const score = new Map<string, number>();
  originals.forEach((o, r) => {
    if (luminance(o) > 0.9) return; // white things: the paper already is white
    const id = nearestCrayon(o);
    score.set(id, (score.get(id) ?? 0) + Math.max(1, weight[r]));
  });
  const chosen: string[] = [];
  const hex = (id: string) => CRAYONS.find((c) => c.id === id)!.hex;
  const ok = (id: string) => !chosen.includes(id) && chosen.every((c) => labDist(hex(c), hex(id)) >= MIN_DIST);
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  for (const id of ranked) if (chosen.length < 7 && ok(id)) chosen.push(id);
  // always keep one light colour for backgrounds (the page's own background crayon when it has one)
  const light = (id: string) => luminance(hex(id)) > 0.6;
  if (!chosen.some(light)) {
    const want = ranked.find(light) ?? 'pale-sky';
    if (chosen.length === 7) chosen.pop();
    chosen.push(want);
  }
  for (const id of COMPLEMENTS) if (chosen.length < 7 && ok(id)) chosen.push(id);
  if (chosen.length !== 7) throw new Error('palette: could not pick 7 distinct colours');
  const order = CRAYONS.map((c) => c.id);
  return chosen.sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(hex);
}

export const readable = (hex: string) => contrast(hex, OUTLINE) >= 2;
