/**
 * CONTRACT shared by the content pipeline (tools/pages → src/coloring/pages), the coloring screen
 * (src/coloring/*) and the app shell (src/app, src/i18n). Change it only together with all three.
 */

/** The 17 Pastelki site languages. */
export const LANGS = ['pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'uk', 'cs', 'sk', 'sv', 'ro', 'hu', 'tr', 'ja', 'zh'] as const;
export type Lang = (typeof LANGS)[number];
export type Localized = Record<Lang, string>;

/** 1 = one big picture · 2 = two or three pictures · 3 = a small scene with background · 4 = a busy collage. */
export type Level = 1 | 2 | 3 | 4;

/** Every page uses the same portrait canvas (viewBox `0 0 PAGE_W PAGE_H`). */
export const PAGE_W = 300;
export const PAGE_H = 400;
/** Outline colour of every line (Pastelki "soft charcoal"). */
export const OUTLINE = '#4B4453';
/** Uncoloured regions. */
export const PAPER = '#FFFFFF';

/**
 * One shape, drawn in painter's order (later shapes cover earlier ones — this is what hides the
 * outlines of parts that sit behind other parts, so render them in order, never "all fills then all lines").
 * `d` is an absolute path in page coordinates (transforms, circles, ellipses, rects and arcs already baked in).
 * - `r` set   → a colourable region: fill = the child's colour for region r (or PAPER), stroke = OUTLINE.
 * - `r` unset → a fixed detail (eyes, nose, a line): fill = `fill` (or none), stroke = OUTLINE if `sw` > 0.
 * Lines use round caps and joins.
 */
export type Shape = { d: string; r?: number; fill?: string; sw?: number };

export type Page = {
  /** stable id, e.g. "l1-apple", "l3-farm-1" — saved colourings are keyed by it */
  id: string;
  level: Level;
  title: Localized;
  shapes: Shape[];
  /** number of colourable regions; regions are 0..regions-1 */
  regions: number;
  /** exactly 7 colours the child may choose from on this page (soft pastels, readable on white) */
  palette: string[];
  /** the original Pastelki colour of each region, by region index (used for a "finished" preview / hint) */
  original: string[];
  /**
   * Hit map: which region is under a point. Grid of `w`×`h` cells covering the page (row-major, top-left first);
   * cell value 0 = nothing, n = region n-1. Line pixels are already assigned to the nearest region, so a
   * finger on an outline still picks something sensible.
   * `rle` = base64 of a byte stream of runs: [value: uint8][length: unsigned LEB128 varint], repeated, total = w*h.
   * Lookup: col = floor(x / PAGE_W * w), row = floor(y / PAGE_H * h).
   */
  hit: { w: number; h: number; rle: string };
};

/** A child's colouring of one page: region index → hex colour. */
export type Fills = Record<number, string>;
