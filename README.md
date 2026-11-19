<p align="center">
  <img src="docs/images/icon.png" width="96" height="96" alt="Kolorowanki app icon" />
</p>

<h1 align="center">Kolorowanki</h1>

<p align="center">
  Gentle colouring pages for children aged 2–6. Offline, no ads, no purchases, no data collected.<br/>
  <a href="https://tobob.github.io/kolorowanki-site/">Website</a> ·
  <a href="https://tobob.github.io/kolorowanki-site/privacy/">Privacy</a> ·
  <a href="https://tobob.github.io/kolorowanki-site/terms/">Terms</a> ·
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
│   ├── tutorial.tsx      # interactive "how to play" with Edyta the sheep (first launch, "?" button, grown-ups area)
│   ├── level/[level].tsx # pages of one level
│   ├── page/[id].tsx     # the colouring screen
│   └── grown-ups.tsx     # parental gate → language, start again, about, privacy
├── coloring/             # colouring screen, page renderer, hit testing, saved colourings
│   ├── types.ts          # shared contract (pages, levels, languages)
│   └── pages/            # generated page catalogue (do not edit by hand)
├── components/           # parental gate, soft buttons, level dots, thumbnails, tutorial demo, …
├── audio/                # music engine: useMusic(), fades, never endless; Edyta's voice (voice.ts)
├── shell/                # app-shell prefs (tutorial seen, last page) in the local key-value store
├── constants/            # calm UI tokens, public contact details
└── i18n/                 # UI strings for 17 languages
locales/                  # localized app name (home screen) per language
tools/
├── pages/                # Pastelki → colouring pages pipeline
├── brand/                # app icon, splash and favicon generator
└── site/                 # website: support, privacy and terms in 17 languages
docs/                     # architecture, store compliance, store listings, privacy policy
store.config.json         # App Store listing (EAS Metadata)
```

## Regenerating assets

**Colouring pages** are generated from the Pastelki library by `tools/pages` (see `docs/ARCHITECTURE.md`).

**The app icon** (light, dark and tinted on iOS), **adaptive icon, splash mark and favicon** are composed from Pastelki pictures, never redrawn: the kitten colouring page from `tools/pages/svgs`, half coloured, with the Pastelki crayon, on a white disc and a soft paint splash. They are rendered with [resvg](https://github.com/yisibl/resvg-js) and [ImageMagick](https://imagemagick.org) (`magick`):

```bash
npm run brand                    # render the chosen design into assets/images/
npm run brand -- --candidates    # also render the other designs to tools/brand/out/candidates/
npm run brand -- --fetch         # refresh the pinned crayon (tools/brand/art/) from the Pastelki API first
```

**The website** ([tobob.github.io/kolorowanki-site](https://tobob.github.io/kolorowanki-site/)) is generated from the same texts as the app, so the privacy policy on the web and in the app always match. Pass the path to a checkout of `tobob/kolorowanki-site`:

```bash
npm run site -- ../kolorowanki-site
```

## Contributing

Bug reports and ideas are welcome as [issues](https://github.com/tobob/kolorowanki/issues). Before you send a change, run `npm run check`, try it in the simulator, and keep the [Pastelki manifest](https://pastelki.marchew.work/en/about#manifest) in mind: gentle, private, no tricks.

## Third-party notices

**Edyta's voice** (the sheep who explains "How to play") is synthetic — computer-generated, not a recorded
person. It was made offline with `tools/voice/build.sh`; the app only ships the finished clips
(`assets/voice/edyta/`):

| Used for | Project | Licence |
|---|---|---|
| speech in pl, en, de, fr, es, it, pt, nl, sv, tr, ja, zh | [Chatterbox Multilingual](https://github.com/resemble-ai/chatterbox) by Resemble AI ([model](https://huggingface.co/ResembleAI/chatterbox)) | MIT, Copyright (c) 2025 Resemble AI |
| AI watermark in every Chatterbox clip (imperceptible; marks the audio as AI-generated — we keep it) | [Perth](https://github.com/resemble-ai/Perth) by Resemble AI | MIT |
| speech in uk, cs, sk, ro, hu | [Piper](https://github.com/OHF-Voice/piper1-gpl) (piper-tts, run offline on the Pastelki server or a build machine; only its output is used) with the voices uk_UA ukrainian_tts (tetiana), cs_CZ jirka, sk_SK lili, ro_RO mihai, hu_HU anna from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) | Piper: GPL-3.0-or-later; voices: CC0 |
| base model of cs_CZ jirka, sk_SK lili, hu_HU anna | speaker 92 of the Hi-Fi Multi-Speaker English TTS Dataset, [OpenSLR 109](https://www.openslr.org/109/) — Bakhturina, E., Lavrukhin, V., Ginsburg, B., Zhang, Y. (2021), *Hi-Fi Multi-Speaker English TTS Dataset*, arXiv:2104.01497 | CC BY 4.0 |
| trimming and checking the lines | [Whisper](https://github.com/openai/whisper) by OpenAI | MIT, Copyright (c) 2022 OpenAI |
| a slower, child-friendly pace (WSOLA time-stretch) | [audiotsm](https://github.com/Muges/audiotsm) by Muges | MIT |
| "sheep" voice effect (`sheepify.py` from Pastelki) | [pyworld](https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder) with the [WORLD](https://github.com/mmorise/World) vocoder by Masanori Morise | MIT; WORLD: modified BSD |

Edyta herself, the pictures and the music come from [Pastelki](https://pastelki.marchew.work) (MIT); see its
[licence and credits](https://pastelki.marchew.work/en/license). The app's own open-source dependencies
(Expo, React Native and friends) are listed in `package.json` with their licences in `node_modules/*/LICENSE`.

## License

[MIT](LICENSE). The pictures come from [Pastelki](https://pastelki.marchew.work), also MIT.
