/**
 * Hit map: render every region in a flat id colour (painter's order, outlines + fixed details in a "line"
 * colour, no antialiasing), then hand line pixels to the nearest region within a few cells, then RLE-encode.
 */
import { PAGE_H, PAGE_W, type Shape } from '../../src/coloring/types';
import { renderRaw } from './render';

const LINE = 'rgb(0,255,0)';
const NEAR = 10_000; // line pixels always go to the nearest region (every page has a background region)

/** Grid of cell values: 0 = nothing, n = region n-1. Also returns visible pixel counts per region (before line fill). */
export function hitGrid(shapes: Shape[], regions: number, w = PAGE_W, h = PAGE_H): { grid: Uint8Array; visible: number[] } {
  if (regions > 255) throw new Error(`too many regions (${regions})`);
  const body = shapes
    .map((s) => {
      if (s.r !== undefined && s.paint === 'stroke')
        return `<path d="${s.d}" fill="none" stroke="rgb(${s.r + 1},0,0)" stroke-width="${s.sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const fill = s.r !== undefined ? `rgb(${s.r + 1},0,0)` : s.fill && s.fill !== 'none' ? LINE : 'none';
      const st = s.sw ? ` stroke="${LINE}" stroke-width="${s.sw}" stroke-linecap="round" stroke-linejoin="round"` : '';
      return `<path d="${s.d}" fill="${fill}"${st}/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${w}" height="${h}">${body}</svg>`;
  const { px } = renderRaw(svg);
  const n = w * h;
  const grid = new Uint8Array(n);
  const isLine = new Uint8Array(n);
  const visible = new Array(regions).fill(0);
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    if (a < 128) continue;
    if (px[i * 4 + 1] > 128) isLine[i] = 1;
    else {
      const v = px[i * 4];
      if (v >= 1 && v <= regions) {
        grid[i] = v;
        visible[v - 1]++;
      }
    }
  }
  // multi-source BFS from region cells into line cells
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (grid[i]) frontier.push(i);
  for (let step = 0; step < NEAR && frontier.length; step++) {
    const next: number[] = [];
    const claimed: [number, number][] = [];
    for (const i of frontier) {
      const x = i % w;
      const y = (i - x) / w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) if (j >= 0 && isLine[j] && !grid[j]) claimed.push([j, grid[i]]);
    }
    for (const [j, v] of claimed)
      if (!grid[j]) {
        grid[j] = v;
        next.push(j);
      }
    frontier = next;
  }
  return { grid, visible };
}

export function encodeRle(grid: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < grid.length) {
    const v = grid[i];
    let j = i;
    while (j < grid.length && grid[j] === v) j++;
    let len = j - i;
    bytes.push(v);
    do {
      let b = len & 0x7f;
      len >>>= 7;
      if (len) b |= 0x80;
      bytes.push(b);
    } while (len);
    i = j;
  }
  return Buffer.from(bytes).toString('base64');
}

export function decodeRle(rle: string): Uint8Array {
  const b = Buffer.from(rle, 'base64');
  const out: number[] = [];
  let i = 0;
  while (i < b.length) {
    const v = b[i++];
    let len = 0;
    let shift = 0;
    for (;;) {
      const c = b[i++];
      len |= (c & 0x7f) << shift;
      shift += 7;
      if (!(c & 0x80)) break;
    }
    for (let k = 0; k < len; k++) out.push(v);
  }
  return Uint8Array.from(out);
}
