/**
 * Minimal SVG reader for Pastelki drawings: walks the element tree (nested <g> with transforms and inherited
 * presentation attributes) and returns every drawable element as an absolute path in the 100×100 item space,
 * in painter's order. `clip-path` is applied at build time: the clipped fill (and stroke, turned into a filled
 * area) is intersected with the clip shape, so the result is plain geometry.
 */
import type { MultiPolygon } from 'polygon-clipping';

import { IDENT, mul, parseTransform, toSegs, type Mat, type Path } from './geom';
import { intersect, multiArea, multiToPath, pathToMulti, strokeToMulti, unionAll } from './poly';

export type Prim = {
  path: Path;
  fill: string | null; // null = none
  stroke: string | null;
  sw: number;
  opacity: number;
  /** id of the original element or nearest group (debug) */
  id?: string;
  /** the source d (pre-transform) — used to pair "tube" strokes */
  key: string;
  matKey: string;
  /** produced by clipping (geometry is already the visible area) */
  clipped?: boolean;
  /** source position of the element (offset of its `<tag`), its tag name and its own id attribute */
  at: number;
  tag: string;
  ownId?: string;
};

type Node = { tag: string; attrs: Record<string, string>; kids: Node[]; at: number };

/** Pastelki source convention: decorative elements (only for the colour picture) carry these id prefixes. */
export const DECOR_ID = /^pk-(shine|shade)/;

function parse(svg: string): Node {
  const root: Node = { tag: '#root', attrs: {}, kids: [], at: 0 };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z:-]+\s*=\s*"[^"]*")*)\s*(\/?)>|<!--[\s\S]*?-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    if (!m[2]) continue; // comment
    if (m[1]) {
      const top = stack.pop();
      if (!top || top.tag !== m[2]) throw new Error(`bad nesting at </${m[2]}>`);
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[3].matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2];
    // style="a:b; c:d" → attributes
    if (attrs.style) for (const kv of attrs.style.split(';')) {
      const [k, v] = kv.split(':').map((s) => s.trim());
      if (k && v) attrs[k] = v;
    }
    const node: Node = { tag: m[2], attrs, kids: [], at: m.index };
    stack[stack.length - 1].kids.push(node);
    if (!m[4]) stack.push(node);
  }
  const svgNode = root.kids.find((k) => k.tag === 'svg');
  if (!svgNode) throw new Error('no <svg>');
  return svgNode;
}

const num = (v: string | undefined, d = 0) => (v === undefined || v === '' ? d : parseFloat(v));

function ellipseD(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}
function rectD(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}` +
    `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
    `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
  );
}

function elementD(n: Node): string | null {
  const a = n.attrs;
  switch (n.tag) {
    case 'path':
      return a.d ?? null;
    case 'circle':
      return ellipseD(num(a.cx), num(a.cy), num(a.r), num(a.r));
    case 'ellipse':
      return ellipseD(num(a.cx), num(a.cy), num(a.rx), num(a.ry));
    case 'rect': {
      const rx = a.rx !== undefined ? num(a.rx) : num(a.ry);
      const ry = a.ry !== undefined ? num(a.ry) : rx;
      return rectD(num(a.x), num(a.y), num(a.width), num(a.height), rx, ry);
    }
    case 'line':
      return `M${num(a.x1)} ${num(a.y1)}L${num(a.x2)} ${num(a.y2)}`;
    case 'polyline':
    case 'polygon': {
      const p = (a.points ?? '').trim().split(/[\s,]+/).map(Number);
      let d = '';
      for (let i = 0; i + 1 < p.length; i += 2) d += `${i ? 'L' : 'M'}${p[i]} ${p[i + 1]}`;
      return n.tag === 'polygon' ? d + 'Z' : d;
    }
    default:
      return null;
  }
}

type Style = { fill: string | null; stroke: string | null; sw: number; opacity: number };
const colour = (v: string | undefined, inherited: string | null): string | null => {
  if (v === undefined || v === 'inherit') return inherited;
  if (v === 'none' || v === 'transparent') return null;
  let c = v.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(c)) c = '#' + [...c.slice(1)].map((h) => h + h).join('');
  if (c === 'WHITE') c = '#FFFFFF';
  if (c === 'BLACK') c = '#000000';
  if (!/^#[0-9A-F]{6}$/.test(c)) throw new Error(`unsupported colour ${v}`);
  return c;
};

export function readSvg(svg: string): { prims: Prim[]; dropped: string[] } {
  const root = parse(svg);
  const prims: Prim[] = [];
  const dropped: string[] = [];
  const clipDefs = new Map<string, Node>();
  const findClips = (n: Node) => {
    if (n.tag === 'clipPath' && n.attrs.id) clipDefs.set(n.attrs.id, n);
    n.kids.forEach(findClips);
  };
  findClips(root);
  /** clip shape in item space; the clip content lives in the referencing element's user space */
  const clipShape = (id: string, m: Mat): MultiPolygon | null => {
    const c = clipDefs.get(id);
    if (!c) return null;
    const parts: MultiPolygon[] = [];
    const add = (k: Node, mk: Mat) => {
      const mm = mul(mk, parseTransform(k.attrs.transform));
      if (k.tag === 'g') return k.kids.forEach((q) => add(q, mm));
      const d = elementD(k);
      if (d) parts.push(pathToMulti(toSegs(d, mm)));
    };
    c.kids.forEach((k) => add(k, m));
    return unionAll(parts);
  };
  const walk = (n: Node, m: Mat, st: Style, gid?: string, clip?: MultiPolygon) => {
    const a = n.attrs;
    if (n.tag === 'defs' || n.tag === 'clipPath' || n.tag === 'mask' || n.tag === 'title' || n.tag === 'desc') return;
    // tagged decoration (shine / shading) belongs to the colour picture only — never to line art
    if (a.id && DECOR_ID.test(a.id)) return;
    if (a.mask || a.filter) {
      dropped.push(`${n.tag}#${a.id ?? gid ?? '?'} (mask/filter)`);
      return;
    }
    if (a.display === 'none' || a.visibility === 'hidden') return;
    const mm = n.tag === 'svg' ? m : mul(m, parseTransform(a.transform));
    if (a['clip-path']) {
      const id = a['clip-path'].match(/url\(#([^)]+)\)/)?.[1];
      const cs = id ? clipShape(id, mm) : null;
      if (!cs) {
        dropped.push(`${n.tag}#${a.id ?? gid ?? '?'} (unknown clip)`);
        return;
      }
      clip = clip ? intersect(clip, cs) : cs;
    }
    const s: Style = {
      fill: colour(a.fill, st.fill),
      stroke: colour(a.stroke, st.stroke),
      sw: a['stroke-width'] !== undefined ? num(a['stroke-width']) : st.sw,
      opacity: st.opacity * num(a.opacity, 1) * (a['fill-opacity'] !== undefined && a.stroke === undefined ? num(a['fill-opacity'], 1) : 1),
    };
    const id = a.id ?? gid;
    if (n.tag === 'g' || n.tag === 'svg') {
      for (const k of n.kids) walk(k, mm, s, id, clip);
      return;
    }
    const d = elementD(n);
    if (!d) {
      dropped.push(`<${n.tag}> unsupported`);
      return;
    }
    const isLine = n.tag === 'line' || n.tag === 'polyline';
    if (clip) {
      // fill ∩ clip keeps its stroke (the clip edge lies under the parent's outline anyway);
      // a stroke-only element becomes the filled area its stroke paints ∩ clip
      const path = toSegs(d, mm);
      const base = { opacity: s.opacity, id, key: `clip:${prims.length}`, matKey: '', clipped: true, at: n.at, tag: n.tag, ownId: a.id };
      try {
        if (s.fill && !isLine) {
          const g = intersect(pathToMulti(path), clip);
          if (multiArea(g) > 0.5) prims.push({ ...base, path: multiToPath(g), fill: s.fill, stroke: s.stroke, sw: s.stroke ? s.sw : 0 });
        } else if (s.stroke && s.sw > 0) {
          const sc = Math.sqrt(Math.abs(mm[0] * mm[3] - mm[1] * mm[2]));
          const g = intersect(strokeToMulti(path, s.sw * sc), clip);
          if (multiArea(g) > 0.5) prims.push({ ...base, path: multiToPath(g), fill: s.stroke, stroke: null, sw: 0 });
        }
      } catch (e) {
        dropped.push(`${n.tag}#${id ?? '?'} (clip failed: ${(e as Error).message})`);
      }
      return;
    }
    prims.push({
      path: toSegs(d, mm),
      fill: isLine ? null : s.fill,
      stroke: s.stroke,
      sw: s.stroke ? s.sw : 0,
      opacity: s.opacity,
      id,
      key: d.replace(/\s+/g, ' ').trim(),
      at: n.at,
      tag: n.tag,
      ownId: a.id,
      matKey: mm.map((v) => v.toFixed(3)).join(','),
    });
  };
  walk(root, IDENT, { fill: '#000000', stroke: null, sw: 1, opacity: 1 });
  return { prims, dropped };
}
