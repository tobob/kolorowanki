/**
 * Hit map lookup (contract: src/coloring/types.ts → Page.hit).
 * The RLE stream is decoded once per page into a flat Uint8Array grid and cached by page id.
 */
import { PAGE_H, PAGE_W, type Page } from './types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  // URL-safe variants, just in case.
  t['-'.charCodeAt(0)] = 62;
  t['_'.charCodeAt(0)] = 63;
  return t;
})();

/** Plain base64 → bytes (no dependency on atob/Buffer, works in Hermes and Node). */
export function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/\-_]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = B64_LOOKUP[clean.charCodeAt(i)];
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return o === out.length ? out : out.subarray(0, o);
}

/** RLE ([value u8][length LEB128])* → grid of exactly `total` cells. Throws on malformed data. */
export function decodeRle(bytes: Uint8Array, total: number): Uint8Array {
  const grid = new Uint8Array(total);
  let i = 0;
  let pos = 0;
  while (i < bytes.length && pos < total) {
    const value = bytes[i++];
    let len = 0;
    let shift = 0;
    for (;;) {
      if (i >= bytes.length) throw new Error('hit map: truncated varint');
      const b = bytes[i++];
      len += (b & 0x7f) * 2 ** shift; // multiplication: safe beyond 31 bits
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    if (pos + len > total) throw new Error('hit map: runs exceed w*h');
    if (value !== 0) grid.fill(value, pos, pos + len);
    pos += len;
  }
  if (pos !== total) throw new Error(`hit map: runs cover ${pos} of ${total} cells`);
  return grid;
}

type Decoded = { w: number; h: number; grid: Uint8Array; rle: string };
const cache = new Map<string, Decoded>();

export function hitGrid(page: Page): Decoded {
  const hit = cached(page);
  return hit;
}

function cached(page: Page): Decoded {
  const c = cache.get(page.id);
  if (c && c.rle === page.hit.rle && c.w === page.hit.w && c.h === page.hit.h) return c;
  const { w, h, rle } = page.hit;
  const d: Decoded = { w, h, rle, grid: decodeRle(base64ToBytes(rle), w * h) };
  cache.set(page.id, d);
  return d;
}

/** Region index under page point (x, y) in page units (0..PAGE_W, 0..PAGE_H), or null for nothing/outside. */
export function regionAt(page: Page, x: number, y: number): number | null {
  if (!(x >= 0 && y >= 0 && x < PAGE_W && y < PAGE_H)) return null;
  const { w, h, grid } = cached(page);
  const col = Math.floor((x / PAGE_W) * w);
  const row = Math.floor((y / PAGE_H) * h);
  const v = grid[row * w + col];
  if (!v) return null;
  const r = v - 1;
  return r < page.regions ? r : null;
}

/** Decode eagerly (e.g. when the screen mounts) so the first touch is instant. */
export function warmHitMap(page: Page): void {
  cached(page);
}
