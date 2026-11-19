# Kolorowanki — architecture

Gentle colouring pages for children 2–6, drawn from the Pastelki picture library
(https://pastelki.club, MIT). Offline, no accounts, no ads, no data leaves the device.
Must pass the Pastelki manifest (https://pastelki.club/en/about#manifest).

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
- `src/coloring/ZoomCanvas.tsx`: the interactive picture — pinch-zoom, pan, double-tap to fit, tap, hold, crisp layer
  (`onTap`/`onHold` get page units + canvas points, `onSettle(scale)`, `active`, `zoomable`). Used by ColoringScreen and the
  tutorial, so the tutorial teaches the real gestures.
- `src/coloring/Toolbar.tsx`: the top bar (sizes per width, Back, Undo) — the same in ColoringScreen and the tutorial.
- `src/coloring/PageView.tsx`: `export function PageView({ page, fills, size }: { page: Page; fills: Fills; size: number })` —
  static, non-interactive render (width = size, height = size*4/3), for thumbnails.
- `src/coloring/store.ts`: `useFills(pageId): Fills` (live), `loadFills(pageId)`, `saveFills(pageId, fills)`,
  `useColoredIds(): Set<string>` (pages with at least one region coloured), `resetAll()`. Backed by `expo-sqlite/kv-store`.
- `src/i18n/index.ts`: `useT()` → `t(key)`, `useLang(): Lang`; UI strings for all 17 languages.
- Route: `src/app/page/[id].tsx` renders `<ColoringScreen pageId={id} />`.

## Tutorial: Edyta the sheep (interactive)
- `src/app/tutorial.tsx` (route, Skip) → `src/components/tutorial/game.tsx`: a real mini colouring page (l1-apple: PageShapes,
  PaletteTray, PaletteRing, hit map; the picture is the real ZoomCanvas, the top bar the real Toolbar). Steps: tray → tap →
  hold (→ holdPick) → bg → undo → zoom (spread two fingers; ≥ 1.3× counts, the picture stays zoomed; pinch/pan are on only
  from this step; taps colour nothing in it) → done. The tray stays under the picture (Edyta stands where the real tray
  is), so she says "under the picture"; Undo is in the top bar "next to the back button". Each step: Edyta says the
  instruction (voice + bubble), a soft hand points, she waits; the right touch ("close enough" counts) → praise + hop →
  next step after ~1 s; ~8 s idle or a wrong touch → one gentle hint. Finish or Skip → `markTutorialSeen()` + `goBack()`.
- `src/components/tutorial/edyta.tsx`: the Pastelki sheep (shared values: mouth, look, hop, tilt; idle breathing).
- Lines = i18n keys `edyta.<line>` (list in `src/audio/edyta-lines.ts`); bubble text and voice are the same words.
  Clips: `assets/voice/edyta/<lang>/<line>.m4a`, mapped (with a mouth envelope) in generated `src/audio/edyta-voice.ts`;
  made offline by `tools/voice/build.sh`. A missing clip = bubble only (the flow waits the reading time instead).
  Change a line → re-render that line (delete its raw take) and rerun the pipeline.
- `src/audio/voice.ts`: `speakEdyta(lang, line, text, onMouth, onDone)`, `stopEdyta()`; ducks the music via `duckMusic()`
  (src/audio/music.ts), shares its audio session (silent switch respected, nothing in the background). Grown-ups setting
  "Edyta's voice" (`isVoiceOn`/`setVoiceOn` in src/shell/prefs.ts, default on) — independent of the music toggle.
