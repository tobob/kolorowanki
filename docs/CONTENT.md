# Kolorowanki — content pipeline

The 48 colouring pages (4 levels × 12) are **generated** from Pastelki pictures by `tools/pages/`.
Never edit `src/coloring/pages/*.ts` by hand — edit `tools/pages/scenes.ts` and rebuild.

```bash
npm run build-pages               # scenes → src/coloring/pages/level{1..4}.ts + index.ts, contact sheets
npm run build-pages -- --refresh  # also re-fetch the Pastelki library and the newest approved SVGs
npm run check-pages               # validate every page against the contract (src/coloring/types.ts)
```

After a build, **look at** `assets/pages-contact-sheet-l{1..4}.png` (each page as outlines and in its
original colours, with id, region count and the 7-colour palette) and
`assets/pages-contact-sheet-l{1..4}-regions.png` (every region in its own random pastel — the segmentation).

## Pipeline

| step | file | what it does |
|---|---|---|
| fetch | `library.ts` | `GET https://pastelki.marchew.work/api/library`, SVGs cached in `tools/pages/cache/` (git-ignored). The SVGs actually used + their catalogue entries are written to `tools/pages/svgs/` (committed), so the build is reproducible offline; it prefers that copy unless `--refresh`. Every SVG is safety-checked: 100×100 viewBox, no `script`/`foreignObject`/`image`/`use`/`style`, no `on*` handlers, no external `href`/`url()`. |
| parse | `svg.ts` | walks the tree with inherited `fill`/`stroke`/`stroke-width`/`opacity`, bakes every `transform` (nested `g` too) into absolute path data; circle/ellipse/rect(rx)/line/polyline/polygon → paths; arcs → Béziers (`svgpath`). `clip-path` is applied at build time with `polygon-clipping` (MIT): the clipped fill — or the area a clipped stroke paints — is intersected with the clip shape. Masks/filters are dropped (reported). |
| classify | `convert.ts` | fill + dark stroke → **region** (original fill kept); dark fills (eyes, noses) → fixed `OUTLINE` details; white dots on dark details → eye highlights; any other no-stroke fill with opacity ≥ 0.9 and area ≥ 3 (inner ears, bellies, spots, windows, flesh, shine spots) → **region with a thin outline** (60 % of a normal line); dark shapes re-drawn with a light fill ("outline behind" trick) → one region, consecutive same-colour redraws unioned (the cloud with a face); dark stroke-only paths → line details; **tubes** (wide dark stroke + lighter stroke on the same path: tails, handles) and coloured structural strokes (stems, sun rays) → a dark line + a colourable **stroke region** (`paint: 'stroke'`); a coloured stroke darker than what it sits on (snail spiral, tabby stripes) → thin line detail. Dropped: opacity < 0.9 (blush), highlight strokes lighter than what's below, thin/white strokes. Painter's order is kept. |
| compose | `compose.ts` | **every page starts with a full-page background region** `M0 0L300 0 300 400 0 400Z` with `sw: 0` (no outline), so the paper is colourable like any region. Scenes give it their sky/water colour via `backdrop(colour)`; pages without one get the soft pastel (`PAPERS` in `bg.ts`: pale sky, cream, pale mint, pale rose, pale lilac) that differs most from the page's own colours. Items are placed on the 300×400 page (fit into a box, optional bottom anchor / rotate / mirror), background parts first. Stroke widths are normalised per level so lines are consistent on a page: a normal Pastelki outline (4) becomes 5 / 4.5 / 4 / 3.6 page units on levels 1–4. Tube widths scale with the item, their dark rim with the level. |
| free spaces | `segment.ts` | **every enclosed free space is its own region**: a 2× raster (region ids in painter's order, lines in a line colour, no antialiasing) is split into 4-connected pieces per region; the largest piece keeps the region, every other piece ≥ 6 page units² (hit when zoomed ~3×) becomes a new region — contour traced along pixel edges, grown under the neighbouring lines, simplified + lightly smoothed, inserted right after its parent as `{d, r, sw: 0}`, followed by the parent's outline again (`{d, sw}`) so the new edge stays hidden. This splits beach-ball stripes, bucket bands, gaps between legs, background pockets between overlapping items. (Max 250 regions per page; the minimum piece grows if a page would exceed it.) Afterwards only regions too small to ever hit (< 5 hit cells) become fixed white details; fully hidden ones are removed. |
| hit map | `hitmap.ts` | resvg renders each region in a flat id colour (no antialiasing), outlines + fixed details in a "line" colour; stroke regions are painted as strokes in their id colour; line cells (outlines, eyes, other fixed details) are handed to the nearest region (BFS), so no cell inside the page is 0; 300×400 grid, RLE + LEB128, base64. |
| palette | `palette.ts` | each region's original colour → nearest crayon in the curated Pastelki box (red, rose, orange, peach, sun, leaf, mint, sky, ice, plum, lilac, brown, sand, grey), weighted by visible area; the most-used fill the 7 slots, the rest are cheerful complements; colours stay ≥ 18 ΔE apart and ≥ 2:1 contrast against `OUTLINE`. White originals are skipped (paper is white). Every palette keeps at least one light colour for backgrounds (the light "pale" crayons: pale sky, cream, pale mint, pale rose, pale lilac) — normally the page's own background colour. |
| output | `build.ts` | sorts pages in a level by difficulty (regions, then shapes), writes `src/coloring/pages/level{n}.ts` and regenerates `index.ts` (`PAGES`, `pagesOfLevel`, `getPage`). |
| check | `check.ts` | 7 distinct readable palette colours, 1 ≤ regions ≤ 255, `original.length === regions`, every region owns ≥ 5 hit cells, `paint` only `'stroke'` on regions with a width, no hit cell is 0, the first shape is the full-page background region, the palette has a light colour, RLE decodes to exactly `w*h`, ids unique and `l{level}-{slug}`, all 17 titles non-empty, absolute paths only. |

## Adding or changing a page

Pages live in `tools/pages/scenes.ts`, one `PageSpec` per page:

```ts
{
  slug: 'pond',                         // id becomes "l3-pond" — never rename a published id (saved colourings use it)
  title: t('Nad stawem', 'By the pond', /* … all 17 languages in LANGS order: pl en de fr es it pt nl uk cs sk sv ro hu tr ja zh */),
  bg: [sky(), band(215, BG.grass), ellipse(165, 315, 150, 62, BG.water), ripples(110, 350, 40)],
  items: [
    at('cloud', 90, 80, 120),           // Pastelki slug, centre x, centre y, max width (h = width unless given)
    on('frog', 85, 265, 105, 90),       // standing on y = 265 (bottom anchor), max 105 × 90
    on('duck', 200, 335, 120, 120, { flip: true, rot: 5 }),
  ],
  fg: [],                               // optional parts drawn over the items
}
```

- The background region is added automatically; to choose its colour start `bg` with `backdrop(colour)`.
- **Level 1** – one item: just add its Pastelki slug to `L1_ITEMS` (title = the Pastelki names).
- **Level 2** – 2–3 items on a theme, optionally a simple ground (`ground(y)`) or pond.
- **Level 3** – a small scene: background from `bg.ts` (`backdrop`, `band`, `stripe`, `hill`, `ellipse`,
  `roundRect`, `stalk`, `star`, `ripples`, `line`) + 3–5 items.
- **Level 4** – a collage: `collage([...6–10 slugs])` uses the hand-tuned scatter layouts; background
  `PATTERN.frame / waves / hills`.
- Pick gentle items only (Pastelki manifest: nothing scary — no shark, spider, T-rex, angry faces).
  Items using `clip-path` work now (rocket, football, zebra, seahorse are in use); check a new item in the
  contact sheet and the regions sheet — the build prints a warning if anything was dropped.
- A new item not yet in `tools/pages/svgs/` is taken from the download cache; run once with `--refresh` if
  it isn't cached, then the build copies it into `svgs/`.
- Line-heavy items (snowflake, fireworks) turn into blobs when drawn small — keep them ≥ ~90 units wide.
- Rebuild, run `check-pages`, and look at the contact sheet. Generated size is ~0.7 MB for 48 pages.

New pictures are ordered in Pastelki (not drawn in the app); `--refresh` picks up newer approved versions.

## Licence

The pictures are from **Pastelki** (https://pastelki.marchew.work), MIT licence, © Pastelki. The copies in
`tools/pages/svgs/` and the shapes derived from them in `src/coloring/pages/` keep that licence and credit.
