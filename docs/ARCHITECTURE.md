# Kolorowanki — architecture

Gentle colouring pages for children 2–6, drawn from the Pastelki picture library
(https://pastelki.marchew.work, MIT). Offline, no accounts, no ads, no data leaves the device.
Must pass the Pastelki manifest (https://pastelki.marchew.work/en/about#manifest).

## How colouring works
Open a page → pinch to zoom, drag to move → **press and hold** a spot → a ring of the page's 7 colours
appears around the finger → tap a colour → the whole region under the finger fills with it.
A quick tap fills with the last colour used (after the first hold). Undo. Everything autosaves.

## Ownership (who edits what)
| area | files |
|---|---|
| contract | `src/coloring/types.ts` (do not change alone) |
| content pipeline | `tools/pages/**`, generated `src/coloring/pages/**`, `assets/pages-contact-sheet*.png` |
| coloring screen | `src/coloring/**` except `types.ts` and `pages/` |
| app shell | `src/app/**`, `src/i18n/**`, `src/components/**`, `src/constants/**`, `assets/images/**`, `app.json`, `store.config.json`, README, docs/PRIVACY.md |

## Interfaces between areas
- `src/coloring/pages/index.ts`: `PAGES`, `pagesOfLevel(level)`, `getPage(id)`.
- `src/coloring/ColoringScreen.tsx`: `export function ColoringScreen({ pageId }: { pageId: string })` — full-screen page with
  zoom/pan, hold-for-palette, undo, back button (`router.back()`), autosave.
- `src/coloring/PageView.tsx`: `export function PageView({ page, fills, size }: { page: Page; fills: Fills; size: number })` —
  static, non-interactive render (width = size, height = size*4/3), for thumbnails.
- `src/coloring/store.ts`: `useFills(pageId): Fills` (live), `loadFills(pageId)`, `saveFills(pageId, fills)`,
  `useColoredIds(): Set<string>` (pages with at least one region coloured), `resetAll()`. Backed by `expo-sqlite/kv-store`.
- `src/i18n/index.ts`: `useT()` → `t(key)`, `useLang(): Lang`; UI strings for all 17 languages.
- Route: `src/app/page/[id].tsx` renders `<ColoringScreen pageId={id} />`.
