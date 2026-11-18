# Kolorowanki — karta aplikacji

Plik studia: czytaj go zanim zaczniesz pracę nad aplikacją, a po każdej istotnej zmianie dopisz linijkę do **Historii**.

| | |
|---|---|
| Slug / folder | `kolorowanki` · `studio/apps/kolorowanki` |
| iOS bundle ID | `com.tobob.kolorowanki` |
| Android package | `com.tobob.kolorowanki` |
| EAS | konto `tobobu`, projectId w `app.json` → `extra.eas.projectId` (`studio link kolorowanki`) |
| Repo | [github.com/tobob/kolorowanki](https://github.com/tobob/kolorowanki) (publiczne, MIT) |
| Utworzona | 2026-11-18 |

## Co robi

Łagodne kolorowanki dla dzieci 2–6 lat z obrazków Pastelek: 48 stron na 4 poziomach (jeden obrazek → dwa, trzy → scenka → kolaż). Przytrzymanie palca = pierścień 7 kolorów, stuknięcie = ostatni kolor, tacka kolorów na dole, zoom/przesuwanie, cofanie, zapis do Zdjęć za bramką rodzica. Samouczek przy pierwszym uruchomieniu, muzyka z Pastelki Muzyka, 17 języków. Całość offline, zero zbieranych danych.

## Architektura i pułapki

- Kontrakt: `src/coloring/types.ts`; podział: `docs/ARCHITECTURE.md`; treści: `docs/CONTENT.md`.
- Strony generuje `tools/pages` (`npm run build-pages`, `check-pages`) z SVG Pastelek; każda zamknięta przestrzeń = pole, tło = pole 0, mapa trafień RLE. Ozdobniki `pk-shine-*`/`pk-shade-*` oznacza się W PASTELKACH (źródło prawdy), nie tu. `npm run sync-art` / `studio sync-art` + akcja GitHub co godzinę.
- Ekran: `src/coloring/ColoringScreen.tsx` (RNGH v3 + reanimated, ostre linie przy zoomie przez drugi SVG), zapis `SavePicture.tsx` (expo-media-library tylko dodawanie, Android bez uprawnień do odczytu; Android ≤ 9 → Udostępnij).
- Powłoka: `src/app` (home, level, page, tutorial, grown-ups), `src/i18n` (17 języków), `src/audio/music.ts` (expo-audio, bez mikrofonu i tła, szanuje wyciszenie).
- Grafika: `npm run brand` (`tools/brand/brand.mjs`); sklep: `store.config.json` z `tools/store/listings.py`.
- `ios/` jest generowane — po zmianie pluginów `npx expo prebuild --platform ios` przed `expo run:ios`.

## Sklepy

- **iOS:** nie wydana
- **Android:** nie wydana

## Historia
- 2026-11-18 15:01 — sync-art: Pastelki: 74 newer picture(s): acorn v1→v3, apple v1→v3, astronauta-mis v1→v3, autobus v1→v3, ball v1→v3, balloon v1→v3, banana v1→v3, bee v2→v4, bread v1→v3, cake v1→v3, cherry v1→v3, cloud v1→v3, cow v2→v4, cymbalki v1→v3, duck v2→v4, duckling v2→v4, elephant v2→v4, fish v2→v4, frog v2→v4, gasienica v3→v5, giraffe v2→v4, gitara v1→v3, grapes v1→v3, gwiazda-spadajaca v1→v3, heart-toy v1→v3, hedgehog v2→v4, hen v2→v4, honey v1→v3, horse v2→v4, kitten v2→v4, kometa v1→v3, konik-morski v2→v4, ladybug v3→v5, lemon v1→v3, lion v2→v4, lopata-do-sniegu v1→v3, maly-kosmita v1→v3, marakasy v1→v3, meduza v2→v4, monkey v2→v4, moon v1→v3, mushroom v1→v3, narwal v1→v3, octopus v3→v5, orange v1→v3, pear v1→v3, pig v2→v4, pilka-plazowa v2→v4, pillow v1→v3, pingwinek-na-lodzie v4→v6, planeta-z-pierscieniem v1→v3, plum v1→v3, puppy v2→v4, rabbit v2→v4, raindrop v1→v3, rozgwiazda v2→v4, sandwich v5→v7, satelita v1→v3, shovel v1→v3, skrzypce v1→v3, snail v2→v4, snowman v2→v4, soap v1→v3, strawberry v1→v3, sun v1→v3, teddy v1→v3, tiger v2→v4, tomato v1→v3, trabka v1→v3, tree v1→v3, ufo v1→v3, umbrella v1→v3, whale v2→v4, zolw-morski v3→v5 (następny build sklepowy dostarczy zmiany)
