/**
 * Background parts for scenes, drawn in the Pastelki style (closed shapes, normal outline), in page units.
 * Shapes reach past the page edge (−20…+20) so the page border never shows an outline.
 */
import { PAGE_H, PAGE_W } from '../../src/coloring/types';
import type { Part } from './convert';
import { strokeOutline, toSegs, type Pt } from './geom';

export const BG = {
  sky: '#9BC2EA',
  skyPale: '#C9DDF2',
  grass: '#5BB36A',
  grassLight: '#A8DDB5',
  soil: '#9A6B4A',
  sand: '#F2D6A2',
  sea: '#4A90D9',
  water: '#9BC2EA',
  snow: '#FAF7F0',
  night: '#9B6BC9',
  dusk: '#C9B3E6',
  road: '#A3A7AE',
  sun: '#F6C945',
  rose: '#F29BB8',
  red: '#E5534B',
  orange: '#F28C38',
};

const L = -20;
const R = PAGE_W + 20;
const B = PAGE_H + 20;
const T = -20;

const region = (d: string, original: string, sw = 4): Part => ({ kind: 'region', path: toSegs(d), original, sw });
const line = (d: string, sw = 4): Part => ({ kind: 'line', path: toSegs(d), sw });

/** Smooth curve through points (Catmull-Rom → cubic Béziers), as path data without the initial M. */
function smooth(pts: Pt[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** A wavy top edge from left to right: y + amp·sin. */
function wave(y: number, amp: number, waves: number, phase = 0): Pt[] {
  const n = Math.max(4, Math.round(waves * 4));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = L + ((R - L) * i) / n;
    return [x, y + amp * Math.sin(phase + (i / n) * waves * Math.PI * 2)] as Pt;
  });
}

/**
 * Full-page background region (0,0)–(300,400), no outline (sw 0). Every page starts with one, so the
 * "paper" is colourable too; pages without an explicit backdrop get a soft pastel picked automatically.
 */
const BACKDROPS = new WeakSet<Part>();
export const backdrop = (original: string): Part => {
  const p = region(`M0 0H${PAGE_W}V${PAGE_H}H0Z`, original, 0);
  BACKDROPS.add(p);
  return p;
};
export const isBackdrop = (p: Part | undefined) => !!p && BACKDROPS.has(p);

/** Soft background pastels (auto-picked for pages without a scene background). */
export const PAPERS = ['#D4E6F7', '#FFF0C2', '#D3EFDC', '#FBDDE6', '#E6DDF5'];

/** Band from a wavy top edge down past the page bottom. */
export function band(y: number, original: string, amp = 6, waves = 1.5, phase = 0): Part {
  const pts = wave(y, amp, waves, phase);
  return region(`M${L} ${B}L${pts[0][0]} ${pts[0][1]}${smooth(pts)}L${R} ${B}Z`, original);
}

/** Band between two wavy edges (a stripe across the page). */
export function stripe(y0: number, y1: number, original: string, amp = 8, waves = 1.5, phase = 0): Part {
  const top = wave(y0, amp, waves, phase);
  const bot = wave(y1, amp, waves, phase).reverse();
  return region(`M${top[0][0]} ${top[0][1]}${smooth(top)}L${bot[0][0]} ${bot[0][1]}${smooth(bot)}Z`, original);
}

/** A rolling hill: half-ellipse bump with its base below the page bottom. */
export function hill(cx: number, top: number, halfW: number, original: string): Part {
  const base = B + 40;
  const ry = base - top;
  return region(`M${cx - halfW} ${base}A${halfW} ${ry} 0 0 1 ${cx + halfW} ${base}Z`, original);
}

export const ellipse = (cx: number, cy: number, rx: number, ry: number, original: string, sw = 4): Part =>
  region(`M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`, original, sw);

/** Smooth closed curve through points (closed Catmull-Rom). */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d + 'Z';
}

/** A soft rounded blob (for patterned collage backgrounds and bushes): a circle with a gentle wobble. */
export function blob(cx: number, cy: number, r: number, original: string, bumps = 5, wobble = 0.08, phase = 0): Part {
  const n = 24;
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wobble * Math.sin(a * bumps + phase * 3));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as Pt;
  });
  return region(smoothClosed(pts), original);
}

/** Rounded rectangle, optionally rotated (deg) around its centre. */
export function roundRect(cx: number, cy: number, w: number, h: number, r: number, original: string, rot = 0): Part {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const d =
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const p = region(d, original);
  if (rot) p.path = toSegs(d, rotAbout(rot, cx, cy));
  return p;
}

const rotAbout = (deg: number, cx: number, cy: number): [number, number, number, number, number, number] => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
};

/** A thick wavy stalk (seaweed, grass blade, reed) as a closed region. */
export function stalk(x: number, yBottom: number, height: number, width: number, original: string, sway = 10): Part {
  const pts: Pt[] = Array.from({ length: 5 }, (_, i) => [x + sway * Math.sin(i * 1.4), yBottom - (height * i) / 4] as Pt);
  const d = `M${pts[0][0]} ${pts[0][1]}${smooth(pts)}`;
  return { kind: 'region', path: strokeOutline(toSegs(d), width / 2), original, sw: 4 };
}

/** A small round-topped bush/tuft: a few overlapping circles merged in one outline (drawn as one blob). */
export const bush = (cx: number, cy: number, r: number, original: string) => blob(cx, cy, r, original, 5, 0.16, 0.6);

/** Simple 5-point star (sky decoration). */
export function star(cx: number, cy: number, r: number, original: string, rot = 0): Part {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot - 90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.48 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return { kind: 'region', path: toSegs(`M${pts.map((p) => p.join(' ')).join('L')}Z`), original, sw: 4 };
}

/** Rays around a point (line details). */
export function rays(cx: number, cy: number, r0: number, r1: number, n = 8, phase = 0): Part[] {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return line(`M${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0}L${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1}`);
  });
}

/** Little wave marks on water (line details). */
export function ripples(cx: number, cy: number, w: number): Part {
  const h = w / 4;
  return line(`M${cx - w / 2} ${cy}Q${cx - w / 4} ${cy - h} ${cx} ${cy}Q${cx + w / 4} ${cy + h} ${cx + w / 2} ${cy}`, 3);
}

export { line, region };
