# Kolorowanki — karta aplikacji

Plik studia: czytaj go zanim zaczniesz pracę nad aplikacją, a po każdej istotnej zmianie dopisz linijkę do **Historii**.

| | |
|---|---|
| Slug / folder | `kolorowanki` · `studio/apps/kolorowanki` |
| iOS bundle ID | `com.tobob.kolorowanki` |
| Android package | `com.tobob.kolorowanki` |
| EAS | konto `tobobu`, projectId w `app.json` → `extra.eas.projectId` (`studio link kolorowanki`) |
| Repo | [github.com/tobob/kolorowanki](https://github.com/tobob/kolorowanki) (publiczne, MIT) · strona: tobob/kolorowanki-site |
| Utworzona | 2026-11-18 |

## Co robi

Łagodne kolorowanki dla dzieci 2–6 lat z obrazków Pastelek: 48 stron na 4 poziomach (jeden obrazek → dwa, trzy → scenka → kolaż). Przytrzymanie palca = pierścień 7 kolorów, stuknięcie = ostatni kolor, tacka kolorów na dole, zoom/przesuwanie, cofanie, zapis do Zdjęć jednym stuknięciem (udostępnianie za bramką rodzica). Samouczek przy pierwszym uruchomieniu, muzyka z Pastelki Muzyka, 17 języków. Całość offline, zero zbieranych danych.

## Architektura i pułapki

- Kontrakt: `src/coloring/types.ts`; podział: `docs/ARCHITECTURE.md`; treści: `docs/CONTENT.md`.
- Strony generuje `tools/pages` (`npm run build-pages`, `check-pages`) z SVG Pastelek; każda zamknięta przestrzeń = pole, tło = pole 0, mapa trafień RLE. Ozdobniki `pk-shine-*`/`pk-shade-*` oznacza się W PASTELKACH (źródło prawdy), nie tu. `npm run sync-art` / `studio sync-art` + akcja GitHub co godzinę.
- Ekran: `src/coloring/ColoringScreen.tsx` (RNGH v3 + reanimated, ostre linie przy zoomie przez drugi SVG), zapis `SavePicture.tsx` (expo-media-library tylko dodawanie, Android bez uprawnień do odczytu; Android ≤ 9 → Udostępnij).
- Powłoka: `src/app` (home, level, page, tutorial, grown-ups), `src/i18n` (17 języków), `src/audio/music.ts` (expo-audio, bez mikrofonu i tła, szanuje wyciszenie).
- Grafika: `npm run brand` (`tools/brand/brand.mjs`); sklep: `store.config.json` z `tools/store/listings.py`.
- Samouczek = interaktywna gra z owcą Edytą (`src/components/tutorial/game.tsx`): dziecko samo stuka kolor, jabłuszko, przytrzymuje listek, tło, strzałkę; Edyta mówi, wskazuje, chwali. Teksty = klucze `edyta.<linia>` (`src/audio/edyta-lines.ts`), nagrania `assets/voice/edyta/<lang>/<linia>.m4a` + generowany `src/audio/edyta-voice.ts` z `tools/voice/build.sh` (Chatterbox/Piper → sheepify → m4a). Zmiana tekstu = ponowne nagranie tej linii. Brak nagrania = sam dymek. Obrazek w samouczku to prawdziwy `src/coloring/ZoomCanvas.tsx` (ten sam zoom/przesuwanie co na stronie, krok „rozsuń dwa palce”), górny pasek to `src/coloring/Toolbar.tsx` (Wstecz/Cofnij w tym samym miejscu). Nagrania najszybciej na Jacku: `~/pastelki-voice` (venv z Chatterbox/Whisper/Piper, `edyta-run.sh`, plik `GPU_BUSY` gdy GPU zajęte, max 31 % VRAM obok treningów). Głos ścisza muzykę (`duckMusic`), przełącznik „Głos owcy Edyty” u dorosłych.
- `ios/` jest generowane — po zmianie pluginów `npx expo prebuild --platform ios` przed `expo run:ios`.

## Sklepy

- **iOS:** nie wydana
- **Android:** nie wydana

## Historia
- 2026-11-18 15:01 — sync-art: Pastelki: 74 newer picture(s): acorn v1→v3, apple v1→v3, astronauta-mis v1→v3, autobus v1→v3, ball v1→v3, balloon v1→v3, banana v1→v3, bee v2→v4, bread v1→v3, cake v1→v3, cherry v1→v3, cloud v1→v3, cow v2→v4, cymbalki v1→v3, duck v2→v4, duckling v2→v4, elephant v2→v4, fish v2→v4, frog v2→v4, gasienica v3→v5, giraffe v2→v4, gitara v1→v3, grapes v1→v3, gwiazda-spadajaca v1→v3, heart-toy v1→v3, hedgehog v2→v4, hen v2→v4, honey v1→v3, horse v2→v4, kitten v2→v4, kometa v1→v3, konik-morski v2→v4, ladybug v3→v5, lemon v1→v3, lion v2→v4, lopata-do-sniegu v1→v3, maly-kosmita v1→v3, marakasy v1→v3, meduza v2→v4, monkey v2→v4, moon v1→v3, mushroom v1→v3, narwal v1→v3, octopus v3→v5, orange v1→v3, pear v1→v3, pig v2→v4, pilka-plazowa v2→v4, pillow v1→v3, pingwinek-na-lodzie v4→v6, planeta-z-pierscieniem v1→v3, plum v1→v3, puppy v2→v4, rabbit v2→v4, raindrop v1→v3, rozgwiazda v2→v4, sandwich v5→v7, satelita v1→v3, shovel v1→v3, skrzypce v1→v3, snail v2→v4, snowman v2→v4, soap v1→v3, strawberry v1→v3, sun v1→v3, teddy v1→v3, tiger v2→v4, tomato v1→v3, trabka v1→v3, tree v1→v3, ufo v1→v3, umbrella v1→v3, whale v2→v4, zolw-morski v3→v5 (następny build sklepowy dostarczy zmiany)
- 2026-11-18 — Samouczek: interaktywna gra z owcą Edytą jako mówiącą przewodniczką (dymek + głos w 17 językach, syntetyczny, opisany w „O aplikacji” i README), przełącznik głosu u dorosłych, `duckMusic()` w music.ts.
- 2026-11-18 21:36 — wersja 1.0.0 → 1.0.1 (każdy upload do sklepu = nowa wersja): New: Edyta the sheep shows your child how to color. In a short, gentle tutorial your child taps, holds and colors along while Edyta talks in their language and cheers them on. Her voice can be turned off in “For grown-ups”.
- 2026-11-18 22:00 — strona https://tobob.github.io/kolorowanki-site/ (repo tobob/kolorowanki-site, GitHub Pages main /): pomoc, prywatność i warunki w 17 językach (`npm run site -- ../../sites/kolorowanki-site`, `tools/site/gen-site.ts`); store.config.json: supportUrl/privacyPolicyUrl per język (`/<lang>/`), marketingUrl = repo; w aplikacji PRIVACY_URL → strona; review notes: jedyne uprawnienie to dodawanie do Zdjęć. URL-e do ASC wpisuje Bob.
- 2026-11-18 22:06 — nowa ikona: kotek z Pastelek w połowie pokolorowany, kredka, biały krążek jak w Pasujkach, miękka plama koloru (`npm run brand`, kandydaci: `npm run brand -- --candidates` → `tools/brand/out/candidates/`); iOS: warianty jasny/ciemny/tinted (`ios.icon`), Android: adaptive + monochrome; splash: ten sam znak na kremowym #FFF8EE (= TONE.bg), imageWidth 220, bez ciemnego wariantu (aplikacja jest tylko jasna, ciemny splash dawałby skok do kremowego ekranu).
- 2026-11-19 — głos Edyty od nowa (17 języków, 20 linii): czyste końcówki (koniec mowy z energii + słowa Whispera, +80 ms, wyciszenie do zera, cisza cyfrowa; automatyczny test ogonów w `trim_check.py --verify`), ~20 % wolniej (WSOLA przed sheepify; cs ~8 %, bo najwolniejszy głos), najlepsze z 3–6 nagrań na linię, bez „Beee”; teksty: kolory „pod obrazkiem”, strzałka „na górze, obok przycisku powrotu”, nowy krok samouczka „rozsuń dwa palce” (prawdziwy zoom, `ZoomCanvas` wspólny ze stroną), Wstecz/Cofnij w samouczku w tym samym pasku co na stronie (`Toolbar`). Nagrania na Jacku (`~/pastelki-voice`).
- 2026-11-19 02:10 — wersja 1.0.1 → 1.0.2 (każdy upload do sklepu = nowa wersja): Edyta the sheep now speaks more slowly and shows your child how to make a picture bigger with two fingers. Calmer music, a new icon, and the tutorial buttons now sit exactly where they are on every page.
- 2026-11-19 02:10 — build ios (production) wysłany na EAS
- 2026-11-19 02:40 — 1.0.2 (4) w ASC: wersja 1.0.2, build dołączony, 20 zrzutów (en-US + pl, iPhone 6.9" i iPad 13") wgrane przez iris API; czeka na „Add for Review” (Bob).
