/**
 * DEV-ONLY hand-made page ("sample"): a small house scene with overlapping parts and fixed details,
 * so the coloring screen can be developed before tools/pages generates the real catalogue.
 * The hit map is rasterised analytically below (topmost region in painter's order wins; fixed details
 * belong to the region underneath, like the pipeline does for line pixels). Like generated pages, region 0 is
 * the full-page background (sw 0), so no cell inside the page is 0.
 */
import { LANGS, PAGE_H, PAGE_W, type Localized, type Page, type Shape } from '../types';
import { encodeRle } from './encode';

type Inside = (x: number, y: number) => boolean;
type Part = Shape & { inside?: Inside };

const rect = (x: number, y: number, w: number, h: number): { d: string; inside: Inside } => ({
  d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`,
  inside: (px, py) => px >= x && px <= x + w && py >= y && py <= y + h,
});
const circle = (cx: number, cy: number, r: number): { d: string; inside: Inside } => ({
  d: `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`,
  inside: (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r,
});
const ellipse = (cx: number, cy: number, rx: number, ry: number): { d: string; inside: Inside } => ({
  d: `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`,
  inside: (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1,
});
/** Triangle (a, b, c). */
const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): { d: string; inside: Inside } => ({
  d: `M${ax} ${ay} L${bx} ${by} L${cx} ${cy} Z`,
  inside: (px, py) => {
    const s = (x1: number, y1: number, x2: number, y2: number) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d1 = s(ax, ay, bx, by);
    const d2 = s(bx, by, cx, cy);
    const d3 = s(cx, cy, ax, ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  },
});

const SW = 3;
const parts: Part[] = [
  { r: 0, sw: 0, ...rect(-20, -20, 340, 440) }, // background: full page, no border, bleeds past the edge
  { r: 1, sw: SW, ...rect(14, 14, 272, 290) }, // sky
  { r: 2, sw: SW, ...circle(226, 78, 38) }, // sun
  { r: 3, sw: SW, ...ellipse(186, 108, 46, 24) }, // cloud — covers part of the sun
  { r: 4, sw: SW, ...rect(14, 286, 272, 100) }, // grass — covers the bottom of the sky
  { r: 5, sw: SW, ...rect(62, 196, 136, 120) }, // house
  { r: 6, sw: SW, ...tri(46, 200, 130, 122, 214, 200) }, // roof
  { r: 7, sw: SW, ...rect(110, 248, 42, 68) }, // door
  { r: 8, sw: SW, ...rect(76, 214, 26, 26) }, // window
  { r: 9, sw: SW, ...circle(244, 300, 26) }, // ball on the grass
  // a stroke-painted region (contract paint: 'stroke'): dark outline line underneath, coloured core on top
  { d: 'M24 344 L104 344', sw: 11 },
  { r: 10, sw: 6, paint: 'stroke', d: 'M24 344 L104 344', inside: (x, y) => Math.abs(y - 344) <= 5.5 && x >= 19 && x <= 109 }, // fence rail
  // fixed details (no r)
  { d: circle(143, 284, 3.5).d, fill: '#4B4453', sw: 0 }, // door knob
  { d: 'M89 214 L89 240 M76 227 L102 227', sw: 2.5 }, // window cross
  { d: 'M222 284 C236 292 252 292 266 284 M222 316 C236 308 252 308 266 316', sw: 2.5 }, // ball stripes
];

const W = 120;
const H = 160;
function rasterise(): string {
  const grid = new Uint8Array(W * H);
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const x = ((col + 0.5) / W) * PAGE_W;
      const y = ((row + 0.5) / H) * PAGE_H;
      let v = 0;
      for (const p of parts) if (p.r !== undefined && p.inside?.(x, y)) v = p.r + 1;
      grid[row * W + col] = v;
    }
  }
  return encodeRle(grid);
}

const title = Object.fromEntries(LANGS.map((l) => [l, l === 'pl' ? 'Domek (próbka)' : 'Little house (sample)'])) as Localized;

let cached: Page | null = null;

/** Built lazily so production bundles never pay for the rasterisation. */
export function samplePage(): Page {
  return (cached ??= build());
}

const build = (): Page => ({
  id: 'sample',
  level: 3,
  title,
  shapes: parts.map(({ inside: _inside, ...s }) => s),
  regions: 11,
  palette: ['#F4A6A6', '#F7C88F', '#F6E39A', '#A8D8A0', '#9CCBE8', '#B9A8E0', '#D9B48F'],
  original: ['#FFF3D6', '#9CCBE8', '#F6E39A', '#FFFFFF', '#A8D8A0', '#F7C88F', '#F4A6A6', '#D9B48F', '#9CCBE8', '#B9A8E0', '#D9B48F'],
  hit: { w: W, h: H, rle: rasterise() },
});
