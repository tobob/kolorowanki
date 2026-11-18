/** Path geometry on absolute segments (M, L, C, Q, Z only), affine maps, flattening, areas, serialization. */
import svgpath from 'svgpath';

export type Seg = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Q', number, number, number, number] | ['Z'];
export type Path = Seg[];
/** affine [a b c d e f] like SVG matrix(): x' = a x + c y + e, y' = b x + d y + f */
export type Mat = [number, number, number, number, number, number];
export const IDENT: Mat = [1, 0, 0, 1, 0, 0];

export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/** Parse an SVG transform attribute into a matrix (translate, scale, rotate, matrix, skewX/Y). */
export function parseTransform(t: string | undefined): Mat {
  let m: Mat = IDENT;
  if (!t) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(t))) {
    const a = x[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n: Mat;
    switch (x[1]) {
      case 'matrix':
        n = a as Mat;
        break;
      case 'translate':
        n = [1, 0, 0, 1, a[0], a[1] ?? 0];
        break;
      case 'scale':
        n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
        break;
      case 'rotate': {
        const r = (a[0] * Math.PI) / 180;
        const c = Math.cos(r);
        const s = Math.sin(r);
        const rot: Mat = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], rot), [1, 0, 0, 1, -a[1], -a[2]]);
        else n = rot;
        break;
      }
      case 'skewX':
        n = [1, 0, Math.tan((a[0] * Math.PI) / 180), 1, 0, 0];
        break;
      default:
        n = [1, Math.tan((a[0] * Math.PI) / 180), 0, 1, 0, 0];
    }
    m = mul(m, n);
  }
  return m;
}

/** Any SVG path data + matrix → absolute M/L/C/Q/Z segments (arcs converted to curves, shorthands expanded). */
export function toSegs(d: string, m: Mat = IDENT): Path {
  const out: Path = [];
  const p = svgpath(d).abs().unshort().matrix(m).unarc().unshort().abs();
  let cx = 0;
  let cy = 0;
  p.iterate((s) => {
    const seg = s as unknown as (string | number)[];
    switch (seg[0]) {
      case 'M':
      case 'L':
      case 'C':
      case 'Q':
        out.push(seg as unknown as Seg);
        cx = seg[seg.length - 2] as number;
        cy = seg[seg.length - 1] as number;
        break;
      case 'H':
        cx = seg[1] as number;
        out.push(['L', cx, cy]);
        break;
      case 'V':
        cy = seg[1] as number;
        out.push(['L', cx, cy]);
        break;
      case 'Z':
      case 'z':
        out.push(['Z']);
        break;
      default:
        throw new Error(`unexpected segment ${seg[0]}`);
    }
  });
  return out;
}

export function mapPath(p: Path, m: Mat): Path {
  const f = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  return p.map((s) => {
    if (s[0] === 'Z') return s;
    const r: number[] = [];
    for (let i = 1; i < s.length; i += 2) r.push(...f(s[i] as number, s[i + 1] as number));
    return [s[0], ...r] as Seg;
  });
}

export type Pt = [number, number];

/** Flatten to polylines (one per subpath); `closed` tells whether the subpath ended with Z. */
export function flatten(p: Path, steps = 12): { pts: Pt[]; closed: boolean }[] {
  const subs: { pts: Pt[]; closed: boolean }[] = [];
  let cur: Pt[] | null = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  for (const s of p) {
    if (s[0] === 'M') {
      cur = [[s[1], s[2]]];
      subs.push({ pts: cur, closed: false });
      x = sx = s[1];
      y = sy = s[2];
    } else if (s[0] === 'Z') {
      if (subs.length) subs[subs.length - 1].closed = true;
      x = sx;
      y = sy;
      cur = null;
    } else {
      if (!cur) {
        cur = [[x, y]];
        subs.push({ pts: cur, closed: false });
      }
      if (s[0] === 'L') {
        cur.push([s[1], s[2]]);
        x = s[1];
        y = s[2];
      } else if (s[0] === 'C') {
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const u = 1 - t;
          cur.push([
            u * u * u * x + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5],
            u * u * u * y + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6],
          ]);
        }
        x = s[5];
        y = s[6];
      } else {
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const u = 1 - t;
          cur.push([u * u * x + 2 * u * t * s[1] + t * t * s[3], u * u * y + 2 * u * t * s[2] + t * t * s[4]]);
        }
        x = s[3];
        y = s[4];
      }
    }
  }
  return subs;
}

export type Box = { x0: number; y0: number; x1: number; y1: number };
export const emptyBox = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
export function growBox(b: Box, p: Path, pad = 0) {
  for (const s of flatten(p, 8))
    for (const [x, y] of s.pts) {
      b.x0 = Math.min(b.x0, x - pad);
      b.y0 = Math.min(b.y0, y - pad);
      b.x1 = Math.max(b.x1, x + pad);
      b.y1 = Math.max(b.y1, y + pad);
    }
  return b;
}
export const pathBox = (p: Path) => growBox(emptyBox(), p);

/** Absolute polygon area (sum over subpaths, treating each as closed). */
export function area(p: Path): number {
  let a = 0;
  for (const { pts } of flatten(p)) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      s += x0 * y1 - x1 * y0;
    }
    a += Math.abs(s / 2);
  }
  return a;
}

const r1 = (n: number) => {
  const v = Math.round(n * 10) / 10;
  return (Object.is(v, -0) ? 0 : v).toString();
};

/** Compact absolute path string, 1 decimal, repeated commands elided. */
export function pathToString(p: Path): string {
  let out = '';
  let last = '';
  for (const s of p) {
    const cmd = s[0];
    if (cmd !== last || cmd === 'M' || cmd === 'Z') out += cmd;
    else out += ' ';
    last = cmd;
    let first = true;
    for (let i = 1; i < s.length; i++) {
      const v = r1(s[i] as number);
      if (!first && !v.startsWith('-')) out += ' ';
      out += v;
      first = false;
    }
  }
  return out;
}

/** Polygon (closed) from a centre-line path and a half width: the outline of a round-capped stroke. */
export function strokeOutline(p: Path, half: number): Path {
  const out: Path = [];
  for (const { pts: raw, closed } of flatten(p, 16)) {
    const pts = raw.filter((q, i) => i === 0 || Math.hypot(q[0] - raw[i - 1][0], q[1] - raw[i - 1][1]) > 1e-6);
    if (pts.length < 2) continue;
    const normals = (arr: Pt[]) =>
      arr.map((_, i) => {
        const a = arr[Math.max(0, i - 1)];
        const b = arr[Math.min(arr.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        return [-dy / l, dx / l] as Pt;
      });
    const n = normals(pts);
    const left = pts.map((q, i) => [q[0] + n[i][0] * half, q[1] + n[i][1] * half] as Pt);
    const right = pts.map((q, i) => [q[0] - n[i][0] * half, q[1] - n[i][1] * half] as Pt);
    const poly: Pt[] = [...left];
    if (closed) {
      // ring: outer then inner as a second subpath (even-odd would be needed; keep as one band approx.)
      out.push(['M', ...left[0]], ...left.slice(1).map((q) => ['L', ...q] as Seg), ['Z']);
      out.push(['M', ...right[right.length - 1]], ...right.slice(0, -1).reverse().map((q) => ['L', ...q] as Seg), ['Z']);
      continue;
    }
    const cap = (c: Pt, from: Pt) => {
      const a0 = Math.atan2(from[1] - c[1], from[0] - c[0]);
      for (let k = 1; k < 8; k++) {
        const a = a0 - (Math.PI * k) / 8;
        poly.push([c[0] + Math.cos(a) * half, c[1] + Math.sin(a) * half]);
      }
    };
    cap(pts[pts.length - 1], left[left.length - 1]);
    poly.push(...right.reverse());
    cap(pts[0], right[right.length - 1]);
    out.push(['M', ...poly[0]], ...poly.slice(1).map((q) => ['L', ...q] as Seg), ['Z']);
  }
  return out;
}

/** Even-odd point-in-path test on the flattened path. */
export function contains(p: Path, x: number, y: number): boolean {
  let inside = false;
  for (const { pts } of flatten(p, 8)) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** A point roughly in the middle of a path's (first) drawn line. */
export function midPoint(p: Path): Pt {
  const f = flatten(p, 8)[0]?.pts ?? [[0, 0]];
  return f[Math.floor(f.length / 2)];
}
