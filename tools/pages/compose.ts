/** Compose a page from a scene spec: background parts + placed Pastelki items → contract Page. */
import { LANGS, PAGE_H, PAGE_W, PAPER, type Level, type Localized, type Page, type Shape } from '../../src/coloring/types';
import { backdrop, isBackdrop, PAPERS } from './bg';
import { convertItem, labDist, luminance, type Part } from './convert';
import { mapPath, mul, pathToString, type Box, type Mat } from './geom';
import { encodeRle, hitGrid } from './hitmap';
import type { Library } from './library';
import { choosePalette } from './palette';
import { splitRegions, type Draft } from './segment';

/**
 * An item on the page. (x, y) is the centre of the item's drawn content (or its bottom centre with
 * `anchor: 'bottom'`); the content is scaled to fit inside w × h page units (h defaults to w).
 */
export type ItemSpec = { slug: string; x: number; y: number; w: number; h?: number; anchor?: 'center' | 'bottom'; flip?: boolean; rot?: number };

export type PageSpec = {
  slug: string;
  /** defaults to the Pastelki names of the first item */
  title?: Localized;
  /** background parts in page units (stroke widths in Pastelki units: 4 = a normal outline) */
  bg?: Part[];
  items: ItemSpec[];
  /** parts drawn on top of the items (e.g. a foreground bush) */
  fg?: Part[];
};

/** Page-unit width of a normal (4-unit) Pastelki outline, per level — constant within a page. */
export const LINE_W: Record<Level, number> = { 1: 5, 2: 4.5, 3: 4, 4: 3.6 };
/** A region showing fewer hit-map cells than this can never be hit: it becomes a fixed white detail. */
export const MIN_CELLS = 5;
/** Smallest enclosed free space (page units²) that becomes its own region (hit when zoomed ~3×). */
export const MIN_PIECE = 6;

export type Built = { page: Page; warnings: string[] };

const r1 = (n: number) => Math.round(n * 10) / 10;

export async function buildPage(lib: Library, level: Level, spec: PageSpec): Promise<Built> {
  const warnings: string[] = [];
  const k = LINE_W[level] / 4;
  // placed parts with the geometry scale of their item (tubes are geometric, outlines are per-level)
  const placed: { part: Part; s: number }[] = (spec.bg ?? []).map((part) => ({ part, s: 1 }));
  for (const it of spec.items) {
    const { parts: ip, dropped, box } = convertItem(await lib.svg(it.slug));
    if (dropped.length) warnings.push(`${it.slug}: dropped ${dropped.length} unsupported elements (${dropped.join('; ')})`);
    const m = placement(box, it, k);
    const s = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    for (const p of ip) placed.push({ part: { ...p, path: mapPath(p.path, m) } as Part, s });
  }
  for (const part of spec.fg ?? []) placed.push({ part, s: 1 });
  if (!isBackdrop(placed[0]?.part)) placed.unshift({ part: backdrop(autoPaper(placed.map((p) => p.part))), s: 1 });

  let drafts: Draft[] = [];
  for (const { part: p, s } of placed) {
    const d = pathToString(p.path);
    switch (p.kind) {
      case 'region':
        drafts.push({ kind: 'region', d, original: p.original, sw: r1(p.sw * k) });
        break;
      case 'tube':
        drafts.push({ kind: 'line', d, sw: r1(p.inner * s + 2 * p.band * k) }, { kind: 'stroke', d, original: p.original, sw: r1(p.inner * s) });
        break;
      case 'fixed':
        drafts.push({ kind: 'fixed', d, fill: p.fill, sw: r1(p.sw * k) });
        break;
      default:
        drafts.push({ kind: 'line', d, sw: r1(p.sw * k) });
    }
  }

  // every enclosed free space becomes its own region (raise the minimum if a page would exceed 255)
  const base = drafts;
  for (let minArea = MIN_PIECE; ; minArea *= 1.5) {
    drafts = splitRegions(base, LINE_W[level], minArea).drafts;
    if (drafts.filter((d) => d.kind === 'region' || d.kind === 'stroke').length <= 250) break;
    warnings.push(`too many regions, minimum piece raised to ${(minArea * 1.5).toFixed(0)} units²`);
  }

  // regions nobody can ever hit: hidden → removed, tiny → fixed white (strokes → just the dark line)
  let page!: Page;
  for (let pass = 0; pass < 4; pass++) {
    const shapes: Shape[] = [];
    const original: string[] = [];
    const owner: number[] = [];
    drafts.forEach((dr, i) => {
      if (dr.kind === 'region' || dr.kind === 'stroke') {
        owner.push(i);
        const sh: Shape = { d: dr.d, r: original.length, sw: dr.sw };
        if (dr.kind === 'stroke') sh.paint = 'stroke';
        shapes.push(sh);
        original.push(dr.original);
      } else if (dr.kind === 'fixed') shapes.push(dr.sw ? { d: dr.d, fill: dr.fill, sw: dr.sw } : { d: dr.d, fill: dr.fill });
      else shapes.push({ d: dr.d, sw: dr.sw });
    });
    const { grid, visible } = hitGrid(shapes, original.length);
    const drop = new Set<number>();
    const whiten = new Set<number>();
    visible.forEach((v, r) => {
      const i = owner[r];
      if (v === 0 || (v < MIN_CELLS && drafts[i].kind === 'stroke')) drop.add(i);
      else if (v < MIN_CELLS) whiten.add(i);
    });
    if ((drop.size || whiten.size) && pass < 3) {
      drafts = drafts.flatMap((dr, i) => (drop.has(i) ? [] : whiten.has(i) ? [{ kind: 'fixed', d: dr.d, fill: PAPER, sw: dr.sw } as Draft] : [dr]));
      continue;
    }
    const title = spec.title ?? capitalized(lib.item(spec.items[0].slug).names);
    for (const l of LANGS) if (!title[l]?.trim()) throw new Error(`${spec.slug}: title missing ${l}`);
    page = {
      id: `l${level}-${spec.slug}`,
      level,
      title: Object.fromEntries(LANGS.map((l) => [l, title[l].trim()])) as Localized,
      shapes,
      regions: original.length,
      palette: choosePalette(original, visible),
      original,
      hit: { w: PAGE_W, h: PAGE_H, rle: encodeRle(grid) },
    };
    break;
  }
  return { page, warnings };
}

/** The soft pastel that stands out most from the page's own colours (bigger shapes count more). */
function autoPaper(parts: Part[]): string {
  const cols = parts.flatMap((p) => (p.kind === 'region' && luminance(p.original) < 0.82 ? [p.original] : []));
  if (!cols.length) return PAPERS[0];
  let best = PAPERS[0];
  let bestD = -1;
  for (const c of PAPERS) {
    const d = Math.min(...cols.map((o) => labDist(c, o)));
    if (d > bestD) [best, bestD] = [c, d];
  }
  return best;
}

/** Pastelki names are mixed case ("ball", "Starfish"); titles start with a capital letter. */
function capitalized(names: Localized): Localized {
  return Object.fromEntries(
    LANGS.map((l) => {
      const n = names[l].trim();
      return [l, n.charAt(0).toLocaleUpperCase(l === 'tr' ? 'tr' : l) + n.slice(1)];
    }),
  ) as Localized;
}

function placement(box: Box, it: ItemSpec, k: number): Mat {
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  // rotate / mirror around the content centre
  let m: Mat = [1, 0, 0, 1, -cx, -cy];
  if (it.flip) m = mul([-1, 0, 0, 1, 0, 0], m);
  let bw = box.x1 - box.x0;
  let bh = box.y1 - box.y0;
  if (it.rot) {
    const r = (it.rot * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    m = mul([c, s, -s, c, 0, 0], m);
    [bw, bh] = [Math.abs(bw * c) + Math.abs(bh * s), Math.abs(bw * s) + Math.abs(bh * c)];
  }
  // outlines are re-scaled to the page line width, so fit the box minus the original half-stroke padding
  const w = it.w;
  const h = it.h ?? it.w;
  const s = Math.min(w / bw, h / bh);
  void k;
  const ty = it.anchor === 'bottom' ? it.y - (bh * s) / 2 : it.y;
  return mul([s, 0, 0, s, it.x, ty], m);
}
