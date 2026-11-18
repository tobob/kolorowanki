/**
 * "Every enclosed free space is its own region." After a page is composed, render a 2× segmentation raster
 * (each region a flat id colour in painter's order, every line / fixed detail in a line colour, no
 * antialiasing). A region whose visible area falls apart into several pieces (beach-ball stripes, the gap
 * between a kitten's legs, background pockets enclosed by overlapping items) keeps its largest piece; every
 * other piece big enough to hit becomes a NEW region: its contour is traced, grown under the surrounding
 * lines, and inserted right after the parent (no outline), followed by the parent's outline again so the
 * new piece's edge stays hidden.
 */
import { PAGE_H, PAGE_W } from '../../src/coloring/types';
import type { Pt } from './geom';
import { simplifyRing } from './poly';
import { renderRaw } from './render';

export type Draft =
  | { kind: 'region'; d: string; original: string; sw: number }
  | { kind: 'stroke'; d: string; original: string; sw: number }
  | { kind: 'fixed'; d: string; fill: string; sw: number }
  | { kind: 'line'; d: string; sw: number };

const S = 2; // raster scale
const W = PAGE_W * S;
const H = PAGE_H * S;
const LINE = 'rgb(0,0,255)';

const line = (sw: number) => (sw ? ` stroke="${LINE}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : '');

/** Label raster: 0 = nothing, -1 = line, n = draft index + 1 of the region painted there. */
function raster(drafts: Draft[]): Int32Array {
  const body = drafts
    .map((dr, i) => {
      const id = `rgb(${(i + 1) & 255},${(i + 1) >> 8},0)`;
      switch (dr.kind) {
        case 'region':
          return `<path d="${dr.d}" fill="${id}"${line(dr.sw)}/>`;
        case 'stroke':
          return `<path d="${dr.d}" fill="none" stroke="${id}" stroke-width="${dr.sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
        case 'fixed':
          return `<path d="${dr.d}" fill="${LINE}"${line(dr.sw)}/>`;
        default:
          return `<path d="${dr.d}" fill="none"${line(dr.sw)}/>`;
      }
    })
    .join('');
  const { px } = renderRaw(
    `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${W}" height="${H}">${body}</svg>`,
  );
  const lab = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (px[i * 4 + 3] < 128) continue;
    lab[i] = px[i * 4 + 2] > 128 ? -1 : px[i * 4] + px[i * 4 + 1] * 256;
  }
  return lab;
}

/** Outer contour of a pixel mask (crack following along pixel edges), in raster pixel corners. */
function outerContour(mask: Uint8Array, pixels: number[]): Pt[] {
  const next = new Map<number, number[]>();
  const key = (x: number, y: number) => y * (W + 1) + x;
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const k = key(x0, y0);
    const l = next.get(k);
    if (l) l.push(key(x1, y1));
    else next.set(k, [key(x1, y1)]);
  };
  for (const i of pixels) {
    const x = i % W;
    const y = (i - x) / W;
    if (y === 0 || !mask[i - W]) add(x, y, x + 1, y);
    if (x === W - 1 || !mask[i + 1]) add(x + 1, y, x + 1, y + 1);
    if (y === H - 1 || !mask[i + W]) add(x + 1, y + 1, x, y + 1);
    if (x === 0 || !mask[i - 1]) add(x, y + 1, x, y);
  }
  let best: Pt[] = [];
  let bestA = 0;
  for (const start of [...next.keys()]) {
    while (next.get(start)?.length) {
      const ring: Pt[] = [];
      let v = start;
      for (let guard = 0; guard < 1e7; guard++) {
        ring.push([v % (W + 1), Math.floor(v / (W + 1))]);
        const l = next.get(v);
        if (!l?.length) break;
        const n = l.pop()!;
        v = n;
        if (v === start) break;
      }
      let a = 0;
      for (let k = 0; k < ring.length; k++) {
        const p = ring[k];
        const q = ring[(k + 1) % ring.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      if (Math.abs(a) > bestA) [bestA, best] = [Math.abs(a), ring];
    }
  }
  return best;
}

/** One round of Chaikin corner cutting on a closed ring, cutting at most `cap` px from each corner. */
function chaikin(r: Pt[], cap = 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < r.length; i++) {
    const p = r[i];
    const q = r[(i + 1) % r.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const t = Math.min(0.25, cap / len);
    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], [q[0] - (q[0] - p[0]) * t, q[1] - (q[1] - p[1]) * t]);
  }
  return out;
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

export type SplitResult = { drafts: Draft[]; added: number };

/**
 * @param lineW page line width (outlines are this wide) — pieces grow under lines by about half of it
 * @param minArea smallest piece (page units²) that becomes its own region
 */
export function splitRegions(drafts: Draft[], lineW: number, minArea: number): SplitResult {
  const lab = raster(drafts);
  const seen = new Uint8Array(W * H);
  const comps = new Map<number, number[][]>(); // draft index → its pieces (pixel lists)
  const stack: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const id = lab[i];
    if (id <= 0 || seen[i] || drafts[id - 1].kind !== 'region') continue;
    const pix: number[] = [];
    seen[i] = 1;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      pix.push(j);
      const x = j % W;
      if (x > 0 && !seen[j - 1] && lab[j - 1] === id) (seen[j - 1] = 1), stack.push(j - 1);
      if (x < W - 1 && !seen[j + 1] && lab[j + 1] === id) (seen[j + 1] = 1), stack.push(j + 1);
      if (j >= W && !seen[j - W] && lab[j - W] === id) (seen[j - W] = 1), stack.push(j - W);
      if (j < W * (H - 1) && !seen[j + W] && lab[j + W] === id) (seen[j + W] = 1), stack.push(j + W);
    }
    const l = comps.get(id - 1);
    if (l) l.push(pix);
    else comps.set(id - 1, [pix]);
  }

  const minPx = minArea * S * S;
  const grow = Math.ceil((lineW * S) / 2) + 1;
  const subs = new Map<number, string[]>();
  const mask = new Uint8Array(W * H);
  for (const [di, pieces] of comps) {
    if (pieces.length < 2) continue;
    pieces.sort((a, b) => b.length - a.length);
    for (const piece of pieces.slice(1)) {
      if (piece.length < minPx) continue;
      // grow into neighbouring line pixels only, so the edge ends up under the lines drawn after it
      const px = piece.slice();
      for (const j of px) mask[j] = 1;
      let front = px.slice();
      for (let g = 0; g < grow && front.length; g++) {
        const nf: number[] = [];
        for (const j of front) {
          const x = j % W;
          for (const n of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W])
            if (n >= 0 && n < W * H && !mask[n] && lab[n] === -1) {
              mask[n] = 1;
              nf.push(n);
              px.push(n);
            }
        }
        front = nf;
      }
      let ring = outerContour(mask, px);
      for (const j of px) mask[j] = 0;
      // the page edge has no line to hide an edge under: push border vertices well outside the page
      ring = ring.map(([x, y]) => [x <= 0 ? -10 : x >= W ? W + 10 : x, y <= 0 ? -10 : y >= H ? H + 10 : y] as Pt);
      ring = simplifyRing(ring, 0.8);
      if (ring.length < 3) continue;
      ring = chaikin(chaikin(ring));
      ring = simplifyRing(ring, 0.25);
      const d = `M${ring.map(([x, y]) => `${r1(x / S)} ${r1(y / S)}`).join('L')}Z`;
      const l = subs.get(di);
      if (l) l.push(d);
      else subs.set(di, [d]);
    }
  }

  let added = 0;
  const out: Draft[] = [];
  drafts.forEach((dr, i) => {
    out.push(dr);
    const s = subs.get(i);
    if (!s || dr.kind !== 'region') return;
    for (const d of s) out.push({ kind: 'region', d, original: dr.original, sw: 0 });
    added += s.length;
    if (dr.sw > 0) out.push({ kind: 'line', d: dr.d, sw: dr.sw });
  });
  return { drafts: out, added };
}
