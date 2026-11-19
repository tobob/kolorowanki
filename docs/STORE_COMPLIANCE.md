# Kolorowanki — store compliance (App Store + Google Play)

Adapted 2026-11-18 from Pasujki's research (`apps/pasujki/docs/STORE_COMPLIANCE.md`, sources read 2026-11-16: Apple Review Guidelines, Kids apps, age ratings, App Privacy, Expo SDK 58 app config, Play Families / Data safety / target audience / IARC). Same developer, same "collect nothing" design, so the conclusions carry over. What differs for Kolorowanki is called out. Nothing here is legal advice.

---

## 0. Verdict

| | Choice | Why |
|---|---|---|
| **Apple, age rating** | "None" / "No" everywhere → **4+** | No mature content, no web access, no UGC, no ads, no chat, no gambling. |
| **Apple, Kids Category** | **Made for Kids → "5 and under"** | Audience 2–6; Apple bands are 5 and under / 6–8 / 9–11, and most players are under 6. **Permanent** once approved. Being in Kids lets the listing say "for kids / toddlers" (2.3.8). |
| **Apple, categories** | Primary **Education**, secondary **Entertainment** | Kids placement comes from Made for Kids, not the category. In `store.config.json`. |
| **Google Play, target audience** | **Ages 5 and under** only | Families Policy applies in full; we comply (no ads, no data, no SDKs). |
| **Google Play, category** | **Apps › Education** (alternative: Art & Design) | A colouring book is not a game; Kids tab placement comes from target audience + Teacher Approved. |
| **Privacy labels** | Apple "Data Not Collected"; Play "No data collected / shared" | The app sends nothing; no third-party SDKs. The pastelki.club feedback form is a website opened in the browser (covered by the site's own privacy policy), not data collected by the app. |
| **Release** | Automatic after approval | `apple.release.automaticRelease: true`; Play without Managed publishing, 100 % rollout. |

---

## 1. Code / app behaviour (state on 2026-11-18)

| # | Requirement | Status in Kolorowanki |
|---|---|---|
| C-1 | No template leftovers, no links out of the child area (1.3, 2.1) | Template tabs/explore/web badge/external link removed; `expo-web-browser` and `expo-device` uninstalled. `grep -rn "http\|openURL\|WebBrowser" src` must only hit plain text in i18n (Pastelki/repo addresses shown as text, never tappable) and `src/shell/feedback*.ts`: the two grown-ups links of C-7 (App Store / Google Play review page, pastelki.club feedback form), reachable only behind the gate. |
| C-2 | No microphone, camera, location, background modes; Photos add-only | No audio, camera or location module is installed. `expo-media-library` (coloring screen) is used **only** to add a finished picture to Photos when "Save picture" is tapped (no gate: the picture stays on the device, so the child may save it; Share is gated, see C-3); iOS asks once for add-only access (`NSPhotoLibraryAddUsageDescription`, localized in `locales/*.json`), never read access. Check the generated Info.plist has no `NSPhotoLibraryUsageDescription`, and on Android no `READ_MEDIA_*` permission. Android `blockedPermissions` includes RECORD_AUDIO, CAMERA, locations, storage, SYSTEM_ALERT_WINDOW, FOREGROUND_SERVICE*, AD_ID. |
| C-3 | Parental gate before anything for adults (1.3, Kids) | `src/components/parental-gate.tsx`: hold 3 s, then a random multiplication written **in words** in the UI language, 4 numeric answers. Wrong answer → back home, no hint. Guards settings, about, credits, the privacy policy and Share (the system share sheet leads out of the app; when saving to Photos fails, the gate opens and then the share sheet). "Save picture" itself is not gated. |
| C-4 | Privacy policy reachable in the app (5.1.1(i); Play User Data) | Full short policy in all 17 languages in the grown-ups' area, plus the public URL as text. Long form: `docs/PRIVACY.md`. |
| C-5 | Zero network requests from the app | The feedback form is a web page opened in the external browser (`Linking.openURL`, no WebView, no `fetch`); the rating prompt is Apple's. Pages and art are bundled (generated from Pastelki at build time). No remote images/fonts, no `expo-updates`, no analytics or crash SDK. Verify with airplane mode + a proxy before submission. |
| C-6 | No third-party analytics/ads SDKs | Dependencies are Expo + React Native + Software Mansion libraries only. |
| C-7 | No purchases, cross-promotion, social links; rating/feedback only for grown-ups | Since 2026-11-19 (after 1.0.6): grown-ups area, bottom: "Rate Kolorowanki on the App Store" (write-review link) and "Send us feedback" (`https://pastelki.club/<lang>/feedback?app=kolorowanki&version&build&platform[&liked]&utm_*`). 3rd gate pass: in-page card "Do you like Kolorowanki?" (at most 2×, 180 days apart, any answer ends it; state in kv-store). Yes → `StoreReview.requestReview()` on iOS (fallback write-review link); Not really → feedback link + "Rate on the App Store" side by side + Not now. Android never calls the in-app review API after the question (Play rule) and shows the Play link instead. See §8. |
| C-2b | Music without mic/background | `expo-audio` plugin: `microphonePermission: false`, `recordAudioAndroid: false`, `enableBackgroundPlayback: false`, `enableBackgroundRecording: false`. Audio mode `playsInSilentMode: false` (silent switch respected), `mixWithOthers`; paused at once on background. Android `RECORD_AUDIO`/`FOREGROUND_SERVICE*` stay blocked. Music never loops endlessly (theme 1×, colouring tune 3×). |
| C-7b | First-run tutorial | `src/app/tutorial.tsx`: 4 calm animated steps on a real page, skippable, shown once (flag in kv-store), re-openable. No rewards, no pressure. |
| C-8 | No engagement tricks (Pastelki manifest) | No timers, streaks, scores, rewards for playing longer, notifications or badges. |
| C-9 | Complete, lasting experience (4.2) | Four levels of pages from the content pipeline; target ≥ 10 pages per level for v1.0 (UNVERIFIED threshold, Apple publishes none). Mention the variety in review notes. |
| C-10 | No crashes on iPad / small iPhones | `supportsTablet: true`, `requireFullScreen: true` (portrait-only on iPad needs it). Home and level layouts scale by width/height; test iPhone SE, iPhone 17, iPad 13". |
| C-11 | Android large screens (targetSdk 36 ignores `portrait` on ≥ sw600dp) | Layouts are width-driven and work in landscape on tablets; test an Android tablet in landscape. |
| C-12 | Calm, accessible | Motion 250–600 ms ease-in-out, nothing flashing, big targets, a11y labels on every button. |

## 2. app.json (Expo SDK 58)

- `ios.privacyManifests`: union of the manifests in `node_modules` on 2026-11-18 — UserDefaults `CA92.1` (RN, expo-constants, expo-localization, expo-system-ui), FileTimestamp `C617.1` (RN) + `0A2A.1`, `3B52.1` (expo-file-system), DiskSpace `E174.1`, `85F4.1` (expo-file-system), SystemBootTime `35F9.1` (RN timing/boost). `NSPrivacyTracking: false`, no collected data types. Re-sync after any dependency change: `find node_modules -name PrivacyInfo.xcprivacy -not -path "*/node_modules/*/node_modules/*"`.
- `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`; `CFBundleAllowMixedLocalizations: true`.
- `locales`: localized home-screen name for all 17 languages (`locales/<lang>.json`), and `expo-localization` `supportedLocales` for the per-app language setting in iOS/Android Settings.
- `userInterfaceStyle: "light"`, cream `backgroundColor` and splash `#FFF8EE`.
- `android.permissions: [VIBRATE]` (expo-haptics) + `blockedPermissions` as above. `INTERNET` stays (Expo adds it; nothing uses it).
- No `expo-updates`, no `extra.eas.projectId` yet → run `studio link kolorowanki` before the first EAS build.

## 3. Store listing rules (both stores)

- Apple name ≤ 30, subtitle ≤ 30, keywords ≤ 100 bytes, promo ≤ 170; Play title ≤ 30, short ≤ 80, full ≤ 4000. `tools/store/listings.py` checks them.
- No competitor/trademark names, no "free", "best", "#1", no prices, no emojis, no unverifiable educational claims. "Pastelki" is our own sister project (MIT) and may be named.
- Screenshots: real pages, iPhone 6.9" + 6.3", iPad 13" (because `supportsTablet`), Play phone + 7"/10" tablet; no alpha, no device frames from other platforms.
- Privacy policy URL: `https://tobob.github.io/kolorowanki-site/privacy/` (English, full text of `docs/PRIVACY.md`; `/<lang>/privacy/` for the other 16 languages). Support URL: `https://tobob.github.io/kolorowanki-site/` (`/<lang>/`). Marketing URL: the repo. Site repo `tobob/kolorowanki-site`, generated by `npm run site -- ../kolorowanki-site`; `store.config.json` uses the per-language pages.
- **No personal contact data in the repo** (`store.config.json` review contact is filled in App Store Connect; `eas metadata:lint` reports the missing `firstName/lastName/email/phone` on purpose, as in Pasujki).

## 4. Questionnaires

- **Apple age rating:** every content item **None**, every capability **No** (incl. Shared Location and Dating, required since 16 Nov 2026), Made for Kids → **5 and under**. Expected 4+.
- **Apple App Privacy:** "No, we do not collect data from this app".
- **Play Data safety:** no data collected, none shared. **Ads:** No. **Advertising ID:** No. **App access:** all functionality available without special access. **Target audience:** 5 and under. **IARC:** No to everything (expected PEGI 3 / ESRB Everyone).
- **EU DSA:** non-trader status per app (App Information → App Store Regulations & Permits) — otherwise "Cannot Sell" in the EU.

## 5. Law

Same position as Pasujki: no personal data is processed, so COPPA consent duties, GDPR Art. 8 and the UK Children's Code are not engaged; the app follows their spirit (privacy by default, no profiling, no nudges). One analytics or crash SDK would change that — don't add one.

## 6. Review notes

In `store.config.json` → `apple.review.notes` (generated by `tools/store/listings.py`): how to colour (hold → ring → tap), where the grown-ups button is, how the gate works, what's inside, offline/privacy. Add a link to a screen recording from a physical iPhone (Sunset lesson, `studio/docs/STORE_REVIEW_LESSONS.md`): fresh install in airplane mode → home → level → colour a page (hold, pick, quick tap, zoom, undo) → back, thumbnail shows the colouring → failed gate → passed gate → language → start again → privacy policy.

## 7. Pre-submission checklist

- [ ] `npm run check` green; app run on iPhone and iPad simulators and an Android emulator/tablet
- [ ] Airplane mode end-to-end; proxy shows no traffic
- [ ] Fresh install: no permission prompts; empty colourings; language follows device
- [ ] `studio link kolorowanki` (EAS projectId), first TestFlight build early to catch ITMS-91053 privacy-manifest emails
- [ ] Repo public (history scanned) so the privacy and support URLs resolve
- [ ] ASC: name chosen by Bob, Made for Kids 5 and under, App Privacy "not collected", screenshots, review contact, recording link, DSA non-trader
- [ ] Play: closed test ≥ 12 testers × 14 days (new personal account), Data safety, target audience, ads No, AD_ID No, IARC, listing from `docs/store/GOOGLE_PLAY.md`

## 8. Rating and feedback (researched 2026-11-19)

Sources read: App Review Guidelines 1.3, 5.1.4, 5.6.1; App Privacy details (developer.apple.com/app-store/app-privacy-details); Expo SDK 58 `expo-store-review`; Google Play In-App Review guidelines.

- **1.3 Kids Category:** "must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate." Both links and the ask card live only in the grown-ups area behind the gate, so they are allowed. No PII or device info goes to third parties: the link carries only app, version, build, platform, UI language and liked.
- **5.6.1:** "Use the provided API to prompt users to review your app … we will disallow custom review prompts." We never draw our own stars or rating UI; the only in-app prompt is `SKStoreReviewController` (via `expo-store-review`), and the button at the bottom is a plain App Store write-review link (Apple's documented `action=write-review`). The "Do you like Kolorowanki?" card is a question, not a rating prompt, and both answers keep a rating path visible (Not really shows "Rate on the App Store" next to the feedback link), so it is not review gating. Residual risk: Apple's HIG and Expo docs discourage asking before the prompt; if a reviewer objects, drop the question and call `requestReview()` on the 3rd visit directly.
- **Google Play:** "Your app shouldn't ask the user any questions before or while presenting the rating button or card, including … 'Do you like the app?'", and no button should trigger the API. So on Android, Yes shows a "Rate on Google Play" link (a store link, not the API) and the in-app review card is never used.
- **Quota:** iOS shows the system prompt at most 3× a year and may show nothing; the thank-you state keeps a small write-review link so a grown-up is never left with a dead button.
- **App Privacy / Data safety:** unchanged, "Data Not Collected": the app transmits nothing ("collect" = transmitting data off the device). If the app ever POSTs feedback itself, the label must change to User Content → Other User Content (not linked, no tracking), because Apple's optional-disclosure exception requires the user's name in the form.

