/** Self-check for the grown-ups rating card rules and the feedback link. Run: npx tsx src/shell/__checks__/feedback.check.ts */
import assert from 'node:assert/strict';

import { FEEDBACK_DEFAULTS, feedbackUrl, MAX_ASKS, onVisit, SNOOZE_DAYS, type FeedbackState } from '../feedback-logic';

const DAY = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 10, 19);

// Visits 1 and 2: no card. Visit 3: card, once.
let s: FeedbackState = FEEDBACK_DEFAULTS;
const seen: boolean[] = [];
for (let i = 0; i < 6; i++) {
  const r = onVisit(s, t0 + i * 1000);
  s = r.next;
  seen.push(r.ask);
}
assert.deepEqual(seen, [false, false, true, false, false, false]);
assert.equal(s.visits, 6);
assert.equal(s.asks, 1);

// Not now / left without answering: quiet for SNOOZE_DAYS, then one more time, then never.
assert.equal(onVisit(s, t0 + (SNOOZE_DAYS - 1) * DAY).ask, false);
let r = onVisit(s, t0 + (SNOOZE_DAYS + 1) * DAY);
assert.equal(r.ask, true);
s = r.next;
assert.equal(s.asks, MAX_ASKS);
assert.equal(onVisit(s, t0 + 3 * SNOOZE_DAYS * DAY).ask, false);

// Any answer ends it for good.
const answered: FeedbackState = { ...FEEDBACK_DEFAULTS, visits: 2, answer: 'no' };
assert.equal(onVisit(answered, t0).ask, false);

// Feedback link: UI language if the site has it, else English; liked only when answered.
assert.equal(
  feedbackUrl({ lang: 'pl', version: '1.0.7', build: '9', platform: 'ios', liked: false }),
  'https://pastelki.club/pl/feedback?app=kolorowanki&version=1.0.7&build=9&platform=ios&liked=0&utm_source=kolorowanki&utm_medium=app',
);
assert.equal(
  feedbackUrl({ lang: 'xx', version: '1.0.7', build: '', platform: 'android', liked: null }),
  'https://pastelki.club/en/feedback?app=kolorowanki&version=1.0.7&platform=android&utm_source=kolorowanki&utm_medium=app',
);
assert.match(feedbackUrl({ lang: 'ja', version: '1', build: '2', platform: 'ios', liked: true }), /^https:\/\/pastelki\.club\/ja\/feedback\?.*&liked=1&/);

console.log('feedback checks ok');
