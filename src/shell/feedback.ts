/**
 * Grown-ups' rating and feedback (behind the parental gate only). The app makes no network requests here:
 * - Visit count and the card's state live only on the device (expo-sqlite/kv-store), like the other prefs.
 * - `openFeedbackPage` opens the feedback form on pastelki.club in the external browser (not a WebView).
 * - `openStoreReviewPage` opens the store's write-a-review page; `askForRating` shows the system rating prompt
 *   on iOS (the system decides whether it appears).
 */
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { FEEDBACK_DEFAULTS, feedbackUrl, onVisit, type Answer, type FeedbackState } from './feedback-logic';

export const APP_STORE_ID = '6836427478';
const ANDROID_PACKAGE = 'com.tobob.kolorowanki';
const KEY = 'kolorowanki.feedback.v1';

function read(): FeedbackState {
  try {
    const raw = Storage.getItemSync(KEY);
    return raw ? { ...FEEDBACK_DEFAULTS, ...(JSON.parse(raw) as Partial<FeedbackState>) } : FEEDBACK_DEFAULTS;
  } catch {
    return FEEDBACK_DEFAULTS;
  }
}

function write(s: FeedbackState) {
  try {
    Storage.setItemSync(KEY, JSON.stringify(s));
  } catch {
    // Never break the grown-ups area over storage.
  }
}

/** Count one grown-ups visit; true when the "Do you like Kolorowanki?" card should show this time. */
export function countGrownUpsVisit(now = Date.now()): boolean {
  const { next, ask } = onVisit(read(), now);
  write(next);
  return ask;
}

export function saveAnswer(answer: Answer) {
  write({ ...read(), answer });
}

async function openFirst(urls: string[]) {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try the next one
    }
  }
}

/** Opens the store page where a grown-up can write a review (App Store write-review / Play reviews). */
export function openStoreReviewPage() {
  return openFirst(
    Platform.OS === 'android'
      ? [`market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`, `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&showAllReviews=true`]
      : [`itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`, `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`],
  );
}

/** Opens the pastelki.club feedback form in the browser, in the UI language. `liked` = the card's answer, if any. */
export function openFeedbackPage(lang: string, liked: boolean | null) {
  return openFirst([
    feedbackUrl({
      lang,
      liked,
      version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '',
      build: Application.nativeBuildVersion ?? '',
      platform: Platform.OS,
    }),
  ]);
}

/**
 * After a grown-up said they like the app. iOS: the system rating prompt (it may decide not to show it, e.g. in
 * TestFlight or past the yearly limit), falling back to the write-review page when it isn't available.
 * Android: Google Play forbids asking "Do you like the app?" before its in-app review card, so there we never
 * call it after the question; the card offers the Google Play link instead (components/feedback.tsx).
 */
export async function askForRating() {
  if (Platform.OS !== 'ios') return;
  try {
    if ((await StoreReview.isAvailableAsync()) && (await StoreReview.hasAction())) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // fall through to the link
  }
  await openStoreReviewPage();
}
