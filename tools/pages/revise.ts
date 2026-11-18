/**
 * Propose Pastelki source revisions: tag decorative elements with the `pk-shine-<n>` / `pk-shade-<n>` id
 * convention (Pastelki engine/STYLE.md) so derived line art can drop them without guessing.
 *
 *   npx tsx tools/pages/revise.ts            # scan every library SVG (download cache / committed copy)
 *   npx tsx tools/pages/revise.ts --refresh  # scan the current published versions
 *
 * Only id attributes are inserted — every other byte stays the same, and the colour render is checked to be
 * pixel-identical. Output: tools/pages/revise/<slug>.svg + tools/pages/revise/index.json, for submission to
 * Pastelki. After approval the normal sync brings the tagged versions back.
 *
 * Detection is deliberately conservative (real parts — inner ears, bellies, spots, windows, tabby stripes,
 * spirals — must never be tagged):
 *  - shine: a no-stroke circle/ellipse/curved blob, clearly lighter than the shape it sits on, small (< 8 %
 *    of that shape), in its upper or left half (light comes from the top left), at most 2 such spots per shape (more = a pattern of real spots);
 *    or a short (< 35 units) lighter stroke on a coloured shape that is one smooth arc (highlight).
 *  - shade: a darker tint (ΔE < 20) of the shape below that hugs its outline (≥ 80 % of the stroke / ≥ 70 %
 *    of the shape within 6 units of the edge), is one piece (several subpaths = a pattern), long enough to be
 *    a shadow, not a stripe (≥ 12 units), a shape covering ≤ 30 % of what it sits on, and its colour is not
 *    also used for untagged lines on the same shape (then it is a detail-line colour: shell ridges).
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isDark, labDist, luminance } from './convert';
import { area, contains, flatten, midPoint, pathBox, type Path, type Pt } from './geom';
import { Library } from './library';
import { readSvg, type Prim } from './svg';

const OUT = join(__dirname, 'revise');

function boundary(p: Path): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (const { pts } of flatten(p, 16)) for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  return segs;
}
function distToSegs(q: Pt, segs: [Pt, Pt][]): number {
  let best = Infinity;
  for (const [a, b] of segs) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2));
    best = Math.min(best, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy));
  }
  return best;
}
const samples = (p: Path) => flatten(p, 12).flatMap((s) => s.pts);
const length = (p: Path) =>
  flatten(p, 12).reduce((s, { pts }) => s + pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0), 0);
const nearShare = (pts: Pt[], segs: [Pt, Pt][], d: number) => pts.filter((q) => distToSegs(q, segs) <= d).length / Math.max(1, pts.length);

type Found = { prim: Prim; kind: 'shine' | 'shade'; below: number; why: string };

export function findDecor(svg: string): { found: Found[]; skipped: string[] } {
  const { prims } = readSvg(svg);
  const found: Found[] = [];
  const skipped: string[] = [];
  /** the topmost earlier filled shape under a point */
  const under = (i: number, x: number, y: number): number => {
    for (let j = i - 1; j >= 0; j--) {
      const q = prims[j];
      if (q.fill && q.opacity >= 0.9 && area(q.path) >= 1 && contains(q.path, x, y)) return j;
    }
    return -1;
  };
  prims.forEach((p, i) => {
    if (p.clipped || p.opacity < 0.9) return;
    const strokeOnly = !p.fill && !!p.stroke && p.sw > 0;
    const fillOnly = !!p.fill && area(p.path) >= 1 && (!p.stroke || p.sw === 0);
    if (!strokeOnly && !fillOnly) return;
    const colour = (strokeOnly ? p.stroke : p.fill)!;
    if (isDark(colour)) return;
    const b = pathBox(p.path);
    const [cx, cy] = strokeOnly ? midPoint(p.path) : [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const j = under(i, cx, cy);
    if (j < 0) return;
    const base = prims[j];
    const bf = base.fill!;
    if (isDark(bf)) return; // eye catch-lights etc. stay
    const lighter = luminance(colour) > luminance(bf) + 0.05;
    const darkerTint = luminance(colour) < luminance(bf) - 0.01 && labDist(colour, bf) < 20;
    const bb = pathBox(base.path);
    const edge = boundary(base.path);
    if (fillOnly && lighter) {
      const curved = p.tag === 'circle' || p.tag === 'ellipse' || (p.tag === 'path' && !/[LHVlhv]/.test(svgD(svg, p)));
      const ratio = area(p.path) / Math.max(1, area(base.path));
      const upper = cy < (bb.y0 + bb.y1) / 2;
      const left = cx < (bb.x0 + bb.x1) / 2 && p.tag !== 'path'; // a lower crescent path is a belly, not a shine
      if (curved && ratio < 0.08 && (upper || left)) found.push({ prim: p, kind: 'shine', below: j, why: `lighter spot ${(ratio * 100).toFixed(1)} % of ${bf}` });
    } else if (strokeOnly && lighter) {
      const len = length(p.path);
      // one smooth arc (laces = several pieces, a zig-zag knit pattern = straight segments: real details)
      const smooth = flatten(p.path).length === 1 && (!/[LHVlhv]/.test(svgD(svg, p)) || len < 12) && p.tag === 'path';
      if (smooth && len < 35 && p.sw <= 6) found.push({ prim: p, kind: 'shine', below: j, why: `highlight stroke ${len.toFixed(0)} long on ${bf}` });
    } else if (darkerTint) {
      const pts = samples(p.path);
      const len = strokeOnly ? length(p.path) : Math.max(b.x1 - b.x0, b.y1 - b.y0);
      const share = nearShare(pts, edge, 6);
      const single = flatten(p.path).length === 1; // several subpaths = a pattern (hive rings, corn grid)
      const small = strokeOnly || area(p.path) / Math.max(1, area(base.path)) <= 0.3;
      if (single && small && len >= 12 && share >= (strokeOnly ? 0.8 : 0.7)) found.push({ prim: p, kind: 'shade', below: j, why: `darker tint of ${bf} along its edge (${(share * 100).toFixed(0)} %)` });
    }
  });
  // a shade colour also used for untagged lines on the same shape is a detail-line colour (shell ridges,
  // tabby stripes): tag none of them
  const shadeKey = (f: Found) => `${f.below}|${f.prim.stroke ?? f.prim.fill}`;
  const lineUse = new Map<string, number>();
  prims.forEach((p, i) => {
    if (p.fill || !p.stroke) return;
    const [mx, my] = midPoint(p.path);
    lineUse.set(`${under(i, mx, my)}|${p.stroke}`, (lineUse.get(`${under(i, mx, my)}|${p.stroke}`) ?? 0) + 1);
  });
  const shadeCount = new Map<string, number>();
  for (const f of found) if (f.kind === 'shade') shadeCount.set(shadeKey(f), (shadeCount.get(shadeKey(f)) ?? 0) + 1);
  for (let k = found.length - 1; k >= 0; k--) {
    const f = found[k];
    if (f.kind === 'shade' && !f.prim.fill && (lineUse.get(shadeKey(f)) ?? 0) > (shadeCount.get(shadeKey(f)) ?? 0)) found.splice(k, 1);
  }
  // three or more light "spots" on one shape are a pattern of real spots, not a shine
  const perBase = new Map<number, number>();
  for (const f of found) if (f.kind === 'shine' && f.prim.tag !== 'path') perBase.set(f.below, (perBase.get(f.below) ?? 0) + 1);
  const keep = found.filter((f) => !(f.kind === 'shine' && f.prim.tag !== 'path' && (perBase.get(f.below) ?? 0) >= 3));
  const out: Found[] = [];
  for (const f of keep) {
    if (f.prim.ownId) skipped.push(`<${f.prim.tag} id="${f.prim.ownId}"> looks like ${f.kind} but already has an id`);
    else out.push(f);
  }
  return { found: out, skipped };
}

function svgD(svg: string, p: Prim): string {
  const el = svg.slice(p.at, svg.indexOf('>', p.at) + 1);
  return el.match(/\sd="([^"]*)"/)?.[1] ?? '';
}

const render = (svg: string) => new Resvg(svg, { fitTo: { mode: 'width', value: 400 }, font: { loadSystemFonts: false } }).render().pixels;

async function main() {
  const lib = new Library(process.argv.includes('--refresh'));
  await lib.load();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const index: { slug: string; version: number; tagged: string[] }[] = [];
  const notes: string[] = [];
  let shine = 0;
  let shade = 0;
  for (const slug of [...lib.items.keys()].sort()) {
    const svg = await lib.svg(slug);
    const { found, skipped } = findDecor(svg);
    for (const s of skipped) notes.push(`${slug}: ${s}`);
    if (!found.length) continue;
    const n = { shine: 0, shade: 0 };
    const edits = found
      .map((f) => ({ f, id: `pk-${f.kind}-${++n[f.kind]}` }))
      .sort((a, b) => b.f.prim.at - a.f.prim.at); // insert from the end so offsets stay valid
    let tagged = svg;
    for (const { f, id } of edits) {
      const pos = f.prim.at + 1 + f.prim.tag.length;
      tagged = tagged.slice(0, pos) + ` id="${id}"` + tagged.slice(pos);
    }
    const a = render(svg);
    const b = render(tagged);
    if (a.length !== b.length || !a.equals(b)) throw new Error(`${slug}: tagged render differs from the original`);
    if (findDecor(tagged).found.length) throw new Error(`${slug}: tagging is not idempotent`);
    writeFileSync(join(OUT, `${slug}.svg`), tagged);
    shine += n.shine;
    shade += n.shade;
    index.push({
      slug,
      version: lib.item(slug).version,
      tagged: edits
        .sort((x, y) => x.f.prim.at - y.f.prim.at)
        .map(({ f, id }) => `${id}: ${svg.slice(f.prim.at, svg.indexOf('>', f.prim.at) + 1).slice(0, 110)} — ${f.why}`),
    });
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  console.log(`${index.length} of ${lib.items.size} pictures tagged: ${shine} pk-shine, ${shade} pk-shade (renders pixel-identical)`);
  if (notes.length) console.log(`not tagged (already have an id):\n  ${notes.join('\n  ')}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
