/** Validate every generated page against the contract (npm run check-pages). Exit code 1 on any problem. */
import { LANGS, OUTLINE, type Page } from '../../src/coloring/types';
import { PAGES } from '../../src/coloring/pages';
import { decodeRle } from './hitmap';
import { luminance } from './convert';
import { contrast } from './palette';

const MIN_REACHABLE = 5; // hit-map cells a region must own to be tappable at all (when zoomed in)
const problems: string[] = [];
const bad = (p: Page, msg: string) => problems.push(`${p.id}: ${msg}`);
const HEX = /^#[0-9A-F]{6}$/i;

const ids = new Set<string>();
for (const p of PAGES) {
  if (ids.has(p.id)) bad(p, 'duplicate id');
  ids.add(p.id);
  if (!/^l[1-4]-[a-z0-9-]+$/.test(p.id) || !p.id.startsWith(`l${p.level}-`)) bad(p, 'id must be l{level}-{slug}');
  for (const l of LANGS) if (!p.title[l]?.trim()) bad(p, `title ${l} empty`);
  if (p.palette.length !== 7) bad(p, `palette has ${p.palette.length} colours`);
  if (new Set(p.palette.map((c) => c.toUpperCase())).size !== p.palette.length) bad(p, 'palette colours not distinct');
  for (const c of p.palette) {
    if (!HEX.test(c)) bad(p, `palette colour ${c} not #RRGGBB`);
    else if (contrast(c, OUTLINE) < 2) bad(p, `palette colour ${c} too dark against the outline`);
  }
  if (p.regions < 1 || p.regions > 255) bad(p, `regions = ${p.regions}`);
  if (p.original.length !== p.regions) bad(p, `original.length ${p.original.length} ≠ regions ${p.regions}`);
  for (const c of p.original) if (!HEX.test(c)) bad(p, `original colour ${c} not #RRGGBB`);
  const seen = new Set<number>();
  for (const s of p.shapes) {
    if (!/^M[-\d.]/.test(s.d)) bad(p, `shape path does not start with an absolute M`);
    if (/[a-z]/.test(s.d)) bad(p, `shape path has relative/arc commands`);
    if (s.r !== undefined) {
      if (!Number.isInteger(s.r) || s.r < 0 || s.r >= p.regions) bad(p, `shape region ${s.r} out of range`);
      seen.add(s.r);
      if (s.paint !== undefined && s.paint !== 'stroke') bad(p, `unknown paint ${s.paint}`);
      if (s.paint === 'stroke' && !(s.sw && s.sw > 0)) bad(p, 'stroke region without a width');
    } else {
      if (s.paint) bad(p, 'paint on a fixed shape');
      if (!s.fill && !s.sw) bad(p, 'fixed shape draws nothing');
    }
  }
  if (seen.size !== p.regions) bad(p, `${p.regions - seen.size} regions have no shape`);
  const { w, h, rle } = p.hit;
  let grid: Uint8Array;
  try {
    grid = decodeRle(rle);
  } catch (e) {
    bad(p, `hit map does not decode: ${(e as Error).message}`);
    continue;
  }
  if (grid.length !== w * h) bad(p, `hit map decodes to ${grid.length} cells, expected ${w * h}`);
  const count = new Array(p.regions + 1).fill(0);
  for (const v of grid) {
    if (v > p.regions) {
      bad(p, `hit map value ${v} > regions`);
      break;
    }
    count[v]++;
  }
  if (count[0] > 0) bad(p, `${count[0]} hit-map cells hit nothing (the background must be colourable)`);
  const first = p.shapes[0];
  if (!first || first.r === undefined || first.d !== 'M0 0L300 0 300 400 0 400Z') bad(p, 'first shape must be the full-page background region');
  if (!p.palette.some((c) => luminance(c) > 0.6)) bad(p, 'palette has no light (background) colour');
  for (let r = 0; r < p.regions; r++) if (count[r + 1] < MIN_REACHABLE) bad(p, `region ${r} only ${count[r + 1]} cells in the hit map`);
}

for (const level of [1, 2, 3, 4]) {
  const n = PAGES.filter((p) => p.level === level).length;
  if (n < 1) problems.push(`level ${level} has no pages`);
}

if (problems.length) {
  console.error(`check-pages: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-pages: ${PAGES.length} pages OK (${[1, 2, 3, 4].map((l) => PAGES.filter((p) => p.level === l).length).join('/')} per level)`);
