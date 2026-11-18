/**
 * Edyta the sheep's voice in the interactive "how to play" tutorial (expo-audio).
 *
 *   speakEdyta(lang, line, text, onMouth, onDone?) — says one line (src/audio/edyta-lines.ts).
 *        `onMouth(0..1)` follows how open her mouth should be (a loudness envelope baked in by
 *        tools/voice, 12.5 per second) and gets 0 when she stops. `onDone` runs when she has finished —
 *        also when there is no clip for that line or her voice is switched off: then after the time it
 *        takes to read the bubble (`text`), so the tutorial flows the same with or without sound.
 *   stopEdyta() — silence at once (skip, close, a new line); `onDone` is NOT called.
 *
 * Calm and safe: one line at a time, a calm volume, the music dips while she speaks (duckMusic), the
 * shared audio session respects the silent switch (initAudio), nothing plays in the background (she
 * stops the moment the app is left). Off when the grown-ups switched "Edyta's voice" off — independent
 * of the music toggle. Audio errors are silence, never a crash.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import type { Lang } from '@/coloring/types';
import { isVoiceOn } from '@/shell/prefs';

import type { EdytaLine } from './edyta-lines';
import { EDYTA_VOICE } from './edyta-voice';
import { duckMusic, initAudio } from './music';

const VOLUME = 0.85;
const FRAME_S = 0.08; // one envelope character per 80 ms (tools/voice/finish.py)

type Speaking = {
  player?: AudioPlayer;
  onMouth: (v: number) => void;
  onDone?: () => void;
  done: boolean;
  guard?: ReturnType<typeof setTimeout>;
};
let now: Speaking | null = null;

/** Dev builds only: one line per voice event in the Metro / device log (the simulator is hard to hear). */
const log = (...a: unknown[]) => {
  if (__DEV__) console.log('[voice]', ...a);
};
let listening = false;

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // The voice must never break the tutorial.
  }
}

/** End a line; `completed` = she really finished (call onDone), not stopped. */
function finish(s: Speaking, completed: boolean) {
  if (s.done) return;
  s.done = true;
  if (now === s) now = null;
  if (s.guard) clearTimeout(s.guard);
  s.onMouth(0);
  const p = s.player;
  if (p) {
    duckMusic(false);
    safe(() => {
      p.pause();
      p.remove();
    });
  }
  log(completed ? 'end' : 'stop');
  if (completed) s.onDone?.();
}

export function stopEdyta() {
  if (now) finish(now, false);
}

/** Roughly how long a grown-up needs to read the bubble aloud (used when there is no sound). */
export function readingMs(text: string) {
  return Math.max(1400, Math.min(6000, text.length * 55));
}

export function hasEdytaClip(lang: Lang, line: EdytaLine) {
  return !!EDYTA_VOICE[lang]?.[line];
}

export function speakEdyta(lang: Lang, line: EdytaLine, text: string, onMouth: (open: number) => void, onDone?: () => void) {
  stopEdyta();
  const s: Speaking = { onMouth, onDone, done: false };
  now = s;
  if (!listening) {
    listening = true;
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopEdyta();
    });
  }
  const clip = EDYTA_VOICE[lang]?.[line];
  if (!clip || !isVoiceOn()) log(line, lang, !clip ? 'no clip — bubble only' : 'voice off — bubble only');
  if (clip && isVoiceOn() && AppState.currentState === 'active') {
    initAudio();
    safe(() => {
      const player = createAudioPlayer(clip.src, { updateInterval: 80 });
      s.player = player;
      player.loop = false;
      player.volume = VOLUME;
      player.addListener('playbackStatusUpdate', (st) => {
        if (s.done) return;
        if (st.didJustFinish) {
          finish(s, true);
          return;
        }
        if (st.playing) {
          const i = Math.floor(st.currentTime / FRAME_S);
          const c = clip.mouth.charCodeAt(Math.min(i, clip.mouth.length - 1)) - 48;
          s.onMouth(c > 0 ? c / 9 : 0);
        }
      });
      duckMusic(true);
      // If the player never reports the end (e.g. it failed to load), still close her mouth, bring the
      // music back and let the tutorial go on.
      s.guard = setTimeout(() => finish(s, true), clip.ms + 1500);
      player.play();
      log('play', lang, line, `${clip.ms} ms`);
    });
  }
  if (!s.player && !s.done) s.guard = setTimeout(() => finish(s, true), readingMs(text));
}
