/** Polygon helpers on top of polygon-clipping (MIT): paths ↔ multipolygons, clipping, union, simplification. */
import pc, { type MultiPolygon, type Ring } from 'polygon-clipping';

import { flatten, strokeOutline, type Path, type Pt, type Seg } from './geom';

/** Every subpath as its own polygon, unioned (Pastelki drawings don't rely on holes). */
export function pathToMulti(p: Path, steps = 24): MultiPolygon {
  const polys = flatten(p, steps)
    .map(({ pts }) => pts)
    .filter((pts) => pts.length >= 3)
    .map((pts) => [close(pts)] as Ring[]);
  if (!polys.length) return [];
  return pc.union(polys[0], ...polys.slice(1));
}

const close = (pts: Pt[]): Ring => {
  const r = pts.map((q) => [q[0], q[1]] as [number, number]);
  const a = r[0];
  const b = r[r.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]);
  return r;
};

/** The area a stroke paints (round caps), as a multipolygon. */
export function strokeToMulti(p: Path, width: number): MultiPolygon {
  return pathToMulti(strokeOutline(p, width / 2), 1);
}

export const intersect = (a: MultiPolygon, b: MultiPolygon): MultiPolygon => (a.length && b.length ? pc.intersection(a, b) : []);
export const unionAll = (ms: MultiPolygon[]): MultiPolygon => {
  const ne = ms.filter((m) => m.length);
  return ne.length ? pc.union(ne[0], ...ne.slice(1)) : [];
};

/** Ramer–Douglas–Peucker on an open polyline. */
export function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-9;
  let best = -1;
  let bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
    if (d > best) [best, bi] = [d, i];
  }
  if (best <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, bi + 1), eps).slice(0, -1), ...rdp(pts.slice(bi), eps)];
}

/** Simplify a closed ring (split at the farthest point so both halves keep their shape). */
export function simplifyRing(ring: Pt[], eps: number): Pt[] {
  const pts = ring.slice();
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  if (pts.length < 4) return pts;
  let far = 0;
  let fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) [fd, far] = [d, i];
  }
  const a = rdp(pts.slice(0, far + 1), eps);
  const b = rdp([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

export function multiToPath(m: MultiPolygon, eps = 0.05): Path {
  const out: Path = [];
  for (const poly of m)
    for (const ring of poly) {
      const r = simplifyRing(ring as Pt[], eps);
      if (r.length < 3) continue;
      out.push(['M', r[0][0], r[0][1]], ...r.slice(1).map((q) => ['L', q[0], q[1]] as Seg), ['Z']);
    }
  return out;
}

export const multiArea = (m: MultiPolygon) =>
  m.reduce(
    (s, poly) =>
      s +
      poly.reduce((t, ring, i) => {
        let a = 0;
        for (let k = 0; k < ring.length - 1; k++) a += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1];
        return t + (i === 0 ? 1 : -1) * Math.abs(a / 2);
      }, 0),
    0,
  );
