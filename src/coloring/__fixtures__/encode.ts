/** Tiny hit-map encoder for dev fixtures and checks (the real pages come from tools/pages). */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    s += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    s += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return s;
}

/** grid (row-major cell values) → contract RLE base64: [value u8][length LEB128]… */
export function encodeRle(grid: ArrayLike<number>): string {
  const out: number[] = [];
  let i = 0;
  while (i < grid.length) {
    const v = grid[i];
    let len = 1;
    while (i + len < grid.length && grid[i + len] === v) len++;
    out.push(v & 0xff);
    let n = len;
    do {
      let b = n & 0x7f;
      n = Math.floor(n / 128);
      if (n > 0) b |= 0x80;
      out.push(b);
    } while (n > 0);
    i += len;
  }
  return bytesToBase64(out);
}
