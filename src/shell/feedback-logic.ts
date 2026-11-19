/**
 * Pure rules for the grown-ups' "Do you like Kolorowanki?" card and the feedback link (no React, no storage:
 * checked by `npx tsx src/shell/__checks__/feedback.check.ts`).
 *
 * - Every pass through the parental gate into the grown-ups area counts one visit (on this device only).
 * - The card shows on the 3rd visit. Showing it counts as asking: a grown-up who leaves, taps "Not now" or
 *   answers is not asked again for SNOOZE_DAYS, and never more than MAX_ASKS times in total. Any answer
 *   (Yes / Not really) ends it for good.
 * - The app itself sends nothing: feedback is a web form on pastelki.club opened in the browser.
 * - Children never see any of this: it all lives behind the parental gate.
 */

export const ASK_ON_VISIT = 3;
export const SNOOZE_DAYS = 180;
export const MAX_ASKS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Answer = 'yes' | 'no';
export type FeedbackState = {
  /** Passes through the parental gate into the grown-ups area. */
  visits: number;
  /** How many times the card was shown. */
  asks: number;
  /** Not asked again before this time (ms since epoch). */
  quietUntil: number;
  /** The grown-up's answer; once set the card never comes back. */
  answer: Answer | null;
};

export const FEEDBACK_DEFAULTS: FeedbackState = { visits: 0, asks: 0, quietUntil: 0, answer: null };

/** A new visit: returns the next state and whether the card should show during this visit. */
export function onVisit(prev: FeedbackState, now: number): { next: FeedbackState; ask: boolean } {
  const visits = prev.visits + 1;
  const ask = prev.answer === null && prev.asks < MAX_ASKS && visits >= ASK_ON_VISIT && now >= prev.quietUntil;
  const next: FeedbackState = ask
    ? { ...prev, visits, asks: prev.asks + 1, quietUntil: now + SNOOZE_DAYS * DAY_MS }
    : { ...prev, visits };
  return { next, ask };
}

/** Languages of the pastelki.club site (the same 17 as the app). */
export const SITE_LANGS = ['pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'uk', 'cs', 'sk', 'sv', 'ro', 'hu', 'tr', 'ja', 'zh'] as const;

/**
 * The web feedback form on pastelki.club, opened in the external browser:
 * https://pastelki.club/{lang}/feedback?app=kolorowanki&version=…&build=…&platform=…[&liked=1|0]&utm_source=kolorowanki&utm_medium=app
 */
export function feedbackUrl(p: { lang: string; version: string; build: string; platform: string; liked: boolean | null }): string {
  const lang = (SITE_LANGS as readonly string[]).includes(p.lang) ? p.lang : 'en';
  const q: [string, string][] = [
    ['app', 'kolorowanki'],
    ['version', p.version],
    ['build', p.build],
    ['platform', p.platform === 'android' ? 'android' : 'ios'],
  ];
  if (p.liked !== null) q.push(['liked', p.liked ? '1' : '0']);
  q.push(['utm_source', 'kolorowanki'], ['utm_medium', 'app']);
  const query = q
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `https://pastelki.club/${lang}/feedback?${query}`;
}
