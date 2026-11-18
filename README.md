<p align="center">
  <img src="docs/images/icon.png" width="96" height="96" alt="Kolorowanki app icon" />
</p>

<h1 align="center">Kolorowanki</h1>

<p align="center">
  Gentle colouring pages for children aged 2–6. Offline, no ads, no purchases, no data collected.<br/>
  <a href="docs/PRIVACY.md">Privacy</a> ·
  <a href="https://pastelki.marchew.work">Pictures from Pastelki</a>
</p>

<!-- Screenshots: add docs/images/screen-*.png (home, a level, colouring, finished page) -->
<p align="center"><em>Screenshots coming soon.</em></p>

## What it is

A calm colouring book. A short, animated "how to play" opens on the first launch (and from the "?" button). The child opens a picture, holds a finger on it, and a ring of seven soft colours appears around the finger. Tapping a colour fills the part under the finger. A quick tap afterwards reuses the last colour. Pinch to zoom, drag to move, undo, and everything saves by itself.

- **Four kinds of pages,** from easy to busy: one big picture, a few friends together, a little scene with a background, and a full collage. The home screen shows a small 1–4 dot cue for each.
- **Calm by design** (the [Pastelki manifest](https://pastelki.marchew.work/en/about#manifest)):
  - Pastel colours, slow eased motion, nothing flashing and no loud sounds.
  - No timers, no streaks, no scores and no rewards for playing longer.
  - Nothing can be coloured "wrong".
  - Quiet music: the theme plays once on the home screen, the colouring tune a few times and then rests. A big note button turns it off.
- **Made for kids:**
  - Fully offline, with no network requests, no analytics and no accounts. Colourings stay on the device.
  - Settings, the about page, the privacy policy and saving a picture to Photos sit behind a parental gate: hold for 3 seconds, then answer a multiplication written in words. The app only ever adds pictures to Photos; it never reads the photo library.
- **17 languages:** Polish, English, German, French, Spanish, Italian, Portuguese, Dutch, Ukrainian, Czech, Slovak, Swedish, Romanian, Hungarian, Turkish, Japanese and Chinese. It follows the device language; grown-ups can override it in the app.
- **Pictures from [Pastelki](https://pastelki.marchew.work),** a free (MIT) library of gentle SVG illustrations for small children, turned into colouring pages by a script.

## Tech stack

- [Expo](https://expo.dev) SDK 58, React Native 0.88, React 19 and TypeScript.
- [Expo Router](https://docs.expo.dev/router/introduction/) for the screens.
- [`react-native-svg`](https://github.com/software-mansion/react-native-svg) to draw the pages.
- [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) and [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) for zoom, pan and the colour ring.
- [`expo-audio`](https://docs.expo.dev/versions/latest/sdk/audio/) for the soft theme and the music-box tune (made with [Pastelki Music](https://pastelki.marchew.work/studio/music)); it respects the silent switch and never plays in the background.
- [`expo-sqlite/kv-store`](https://docs.expo.dev/versions/latest/sdk/sqlite/) for saved colourings and settings.
- [`expo-localization`](https://docs.expo.dev/versions/latest/sdk/localization/) to pick the device language.
- [EAS Build and Submit](https://docs.expo.dev/eas/) for store releases.

## Run it locally

### Requirements

- Node.js 20+ and npm.
- For iOS: macOS with Xcode 26+, an iOS simulator runtime and CocoaPods.
- For Android: Android Studio with an emulator.

The app uses native modules that Expo Go doesn't include, so it runs as a [development build](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
git clone https://github.com/tobob/kolorowanki.git
cd kolorowanki
npm install
npx expo run:ios       # or: npx expo run:android
```

This generates the native `ios/` or `android/` folder, builds the app and starts Metro. The native folders are not committed; see [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/). After the first build, `npx expo start` is enough.

To try another language in the iOS simulator, change the simulator's language in Settings, use the language picker in the grown-ups' area, or launch the app like this:

```bash
xcrun simctl launch booted com.tobob.kolorowanki -AppleLanguages "(de)"
```

### Checks

```bash
npm run check       # all of the checks below
npm run lint        # expo lint
npm run typecheck   # tsc --noEmit
npm run check-pages # every page is valid: regions, palette, hit map
```

## Project structure

```
src/
├── app/                  # Expo Router screens
│   ├── index.tsx         # home: title + coloured pictures, "keep colouring", four level cards
│   ├── tutorial.tsx      # animated "how to play" (first launch, "?" button, grown-ups area)
│   ├── level/[level].tsx # pages of one level
│   ├── page/[id].tsx     # the colouring screen
│   └── grown-ups.tsx     # parental gate → language, start again, about, privacy
├── coloring/             # colouring screen, page renderer, hit testing, saved colourings
│   ├── types.ts          # shared contract (pages, levels, languages)
│   └── pages/            # generated page catalogue (do not edit by hand)
├── components/           # parental gate, soft buttons, level dots, thumbnails, tutorial demo, …
├── audio/                # music engine: useMusic(), fades, never endless
├── shell/                # app-shell prefs (tutorial seen, last page) in the local key-value store
├── constants/            # calm UI tokens, public contact details
└── i18n/                 # UI strings for 17 languages
locales/                  # localized app name (home screen) per language
tools/
├── pages/                # Pastelki → colouring pages pipeline
└── brand/                # app icon, splash and favicon generator
docs/                     # architecture, store compliance, store listings, privacy policy
store.config.json         # App Store listing (EAS Metadata)
```

## Regenerating assets

**Colouring pages** are generated from the Pastelki library by `tools/pages` (see `docs/ARCHITECTURE.md`).

**The app icon, adaptive icon, splash mark and favicon** are composed from two Pastelki pictures (a half-coloured butterfly and a crayon) and rendered with [resvg](https://github.com/yisibl/resvg-js):

```bash
npm run brand              # render from the pinned SVGs in tools/brand/art/
npm run brand -- --fetch   # refresh those SVGs from the Pastelki API first
```

ImageMagick (`magick`) is used, when present, to flatten the iOS icon to an opaque PNG.

## Contributing

Bug reports and ideas are welcome as [issues](https://github.com/tobob/kolorowanki/issues). Before you send a change, run `npm run check`, try it in the simulator, and keep the [Pastelki manifest](https://pastelki.marchew.work/en/about#manifest) in mind: gentle, private, no tricks.

## License

[MIT](LICENSE). The pictures come from [Pastelki](https://pastelki.marchew.work), also MIT.
